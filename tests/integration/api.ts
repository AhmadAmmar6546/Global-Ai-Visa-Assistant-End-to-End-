/** Real HTTP + PostgreSQL contract checks. Run only against a local test instance. */
import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import 'dotenv/config';
import { db } from '../../src/lib/db';
import type { Application, AuditLog, ChecklistItem, Rule, Source, Task, User } from '@prisma/client';

type PublicUser = Pick<User, 'id' | 'name' | 'email' | 'role' | 'aiConsent' | 'notificationConsent'>;
type DetailedItem = ChecklistItem & { rule: Rule & { source: Source } };

const base = process.env.TEST_BASE_URL ?? 'http://127.0.0.1:3000';
const origin = new URL(base);
if (!['localhost', '127.0.0.1', '::1', '[::1]'].includes(origin.hostname)) {
  throw new Error('Integration tests create and delete fixtures; TEST_BASE_URL must be a local server.');
}
if (!process.env.DATABASE_URL || !['localhost', '127.0.0.1', '::1', '[::1]'].includes(new URL(process.env.DATABASE_URL).hostname)) {
  throw new Error('Integration fixtures require DATABASE_URL to point to a local disposable PostgreSQL instance.');
}
const runId = randomUUID().slice(0, 8);
const password = 'Testing-only!Visa2026';
const users: string[] = [];
const sourceIds: string[] = [];
const ruleIds: string[] = [];
const anonymizedAuditIds: string[] = [];
const verificationLinks = new Map<string, string>();
let sourceSnapshot: { id: string; excerpt: string; checksum: string | null; fetchedAt: Date | null } | null = null;
const reviewExpiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
let passed = 0;

class Client {
  cookie = '';
  async call(path: string, method = 'GET', payload?: unknown, expected = 200) {
    const response = await fetch(`${base}${path}`, {
      method,
      headers: {
        'content-type': 'application/json',
        'x-requested-with': 'visa-assistant',
        ...(this.cookie ? { cookie: this.cookie } : {}),
      },
      ...(payload === undefined ? {} : { body: JSON.stringify(payload) }),
      redirect: 'manual',
    });
    const setCookie = response.headers.get('set-cookie');
    if (setCookie) this.cookie = setCookie.split(';', 1)[0];
    const result = await response.json();
    assert.equal(response.status, expected, `${method} ${path}: ${JSON.stringify(result)}`);
    return result;
  }
}

async function check(name: string, fn: () => Promise<void>) {
  await fn();
  passed += 1;
  console.log(`ok ${passed} - ${name}`);
}

async function register(client: Client, suffix: string, verify = true) {
  const email = `integration-${runId}-${suffix}@example.invalid`;
  const response = await client.call('/api/auth/register', 'POST', { name: `Integration ${suffix}`, email, password }, 201);
  users.push(response.user.id);
  assert.equal(response.user.email, email);
  assert.equal(response.user.role, 'APPLICANT');
  assert.equal(response.user.aiConsent, false);
  assert.equal(response.user.notificationConsent, false);
  assert.equal('passwordHash' in response.user, false);
  if (response.developmentVerificationUrl) verificationLinks.set(response.user.id, response.developmentVerificationUrl);
  if (verify && response.developmentVerificationUrl) {
    const verification = new URL(response.developmentVerificationUrl);
    await client.call(`/api/auth/verify-email${verification.search}`);
  } else if (verify) {
    // Production-mode local integration uses a test fixture instead of pretending email delivery worked.
    await db.user.update({ where: { id: response.user.id }, data: { emailVerifiedAt: new Date() } });
  }
  return response.user as PublicUser;
}

const profile = {
  destination: 'IT', nationality: 'PK', residence: 'PK', jurisdiction: 'Islamabad',
  visaType: 'study', purpose: 'Study at a university',
};

async function main() {
  const applicant = new Client();
  const stranger = new Client();
  const administrator = new Client();
  let owner!: PublicUser;
  let other!: PublicUser;
  let admin!: PublicUser;
  let application!: Application;
  let item!: DetailedItem;
  let task!: Task;
  let fixtureRule!: Rule;

  await check('health proves actual database connectivity', async () => {
    const health = await applicant.call('/api/health');
    assert.equal(health.status, 'ok');
    assert.equal(health.database, 'connected');
  });
  await check('anonymous clients cannot list applications', async () => {
    await applicant.call('/api/applications', 'GET', undefined, 401);
    assert.equal((await applicant.call('/api/auth/me')).user, null);
  });
  await check('registration creates three isolated users with safe defaults', async () => {
    owner = await register(applicant, 'owner');
    other = await register(stranger, 'other');
    admin = await register(administrator, 'admin', false);
    await db.user.update({ where: { id: admin.id }, data: { role: 'ADMIN' } });
  });
  await check('verification resend replaces the old link and tokens are single-use', async () => {
    const previous = new URL(verificationLinks.get(admin.id)!);
    const resent = await administrator.call('/api/auth/resend-verification', 'POST', {});
    assert.equal(resent.ok, true);
    assert.ok(resent.developmentVerificationUrl, 'Local test server must expose a development email preview; no real email delivery is assumed.');
    const replacement = new URL(resent.developmentVerificationUrl);
    assert.notEqual(replacement.search, previous.search);
    await administrator.call(`/api/auth/verify-email${previous.search}`, 'GET', undefined, 400);
    await administrator.call(`/api/auth/verify-email${replacement.search}`);
    await administrator.call(`/api/auth/verify-email${replacement.search}`, 'GET', undefined, 400);
    assert.ok((await administrator.call('/api/auth/me')).user.emailVerifiedAt);
  });
  await check('a study case is usable without document upload', async () => {
    application = (await applicant.call('/api/applications', 'POST', profile, 201)).application;
    assert.equal(application.ownerId, owner.id);
    assert.equal(application.destination, 'IT');
    assert.equal(application.profileVersion, 1);
  });
  await check('impossible dates and extra upload fields are rejected', async () => {
    await applicant.call('/api/applications', 'POST', { ...profile, intendedDate: '2030-02-30' }, 400);
    await applicant.call('/api/applications', 'POST', { ...profile, uploadedDocument: 'not-supported' }, 400);
  });
  await check('sample scope returns DEMO with cited checklist and a visible warning', async () => {
    const requirements = await applicant.call(`/api/applications/${application.id}/requirements`);
    assert.equal(requirements.verificationStatus, 'DEMO');
    assert.ok(requirements.items.length > 0);
    assert.ok(requirements.notice.toLowerCase().includes('demo') || requirements.notice.toLowerCase().includes('demonstration'));
    item = requirements.items[0];
    assert.ok(item.rule.source.url.startsWith('https://'));
    assert.ok(requirements.sources.length > 0);
  });
  await check('another user receives 404 for private case and requirements', async () => {
    await stranger.call(`/api/applications/${application.id}`, 'GET', undefined, 404);
    await stranger.call(`/api/applications/${application.id}/requirements`, 'GET', undefined, 404);
    assert.equal((await stranger.call('/api/applications')).applications.length, 0);
  });
  await check('cross-user checklist writes and plan reads are denied', async () => {
    await stranger.call(`/api/checklist/${item.id}`, 'PATCH', { status: 'HAVE_IT' }, 404);
    await stranger.call(`/api/applications/${application.id}/plan`, 'GET', undefined, 404);
  });
  await check('all manual checklist statuses persist without implying verification', async () => {
    for (const status of ['HAVE_IT', 'NEED_HELP', 'REVIEWED', 'NOT_STARTED']) {
      const result = await applicant.call(`/api/checklist/${item.id}`, 'PATCH', { status, notes: 'Self-reported integration note' });
      assert.equal(result.item.status, status);
    }
    const requirements = await applicant.call(`/api/applications/${application.id}/requirements`);
    assert.equal(requirements.verificationStatus, 'DEMO');
  });
  await check('not-applicable status requires a reason and rejects invalid statuses', async () => {
    await applicant.call(`/api/checklist/${item.id}`, 'PATCH', { status: 'NOT_APPLICABLE' }, 400);
    await applicant.call(`/api/checklist/${item.id}`, 'PATCH', { status: 'OFFICIALLY_VERIFIED' }, 400);
    const result = await applicant.call(`/api/checklist/${item.id}`, 'PATCH', { status: 'NOT_APPLICABLE', reason: 'An integration-only reason' });
    assert.equal(result.item.reason, 'An integration-only reason');
  });
  await check('logout revokes session and login retains checklist state', async () => {
    await applicant.call('/api/auth/logout', 'POST', {});
    assert.equal((await applicant.call('/api/auth/me')).user, null);
    await applicant.call(`/api/applications/${application.id}`, 'GET', undefined, 401);
    await applicant.call('/api/auth/login', 'POST', { email: owner.email, password });
    const result = await applicant.call(`/api/applications/${application.id}`);
    assert.equal(result.application.checklist.find((entry: ChecklistItem) => entry.id === item.id).status, 'NOT_APPLICABLE');
  });
  await check('mutations reject an unrelated browser origin', async () => {
    const response = await fetch(`${base}/api/account`, {
      method: 'PATCH', headers: { 'content-type': 'application/json', cookie: applicant.cookie, origin: 'https://unrelated.invalid' },
      body: JSON.stringify({ name: 'Should not change' }),
    });
    assert.equal(response.status, 403);
    assert.equal((await applicant.call('/api/auth/me')).user.name, owner.name);
  });
  await check('separate AI and notification consents can be granted and withdrawn', async () => {
    let result = await applicant.call('/api/account', 'PATCH', { aiConsent: true, notificationConsent: false });
    assert.equal(result.user.aiConsent, true);
    assert.equal(result.user.notificationConsent, false);
    result = await applicant.call('/api/account', 'PATCH', { aiConsent: false, notificationConsent: true });
    assert.equal(result.user.aiConsent, false);
    assert.equal(result.user.notificationConsent, true);
    await applicant.call('/api/account', 'PATCH', { notificationConsent: false });
  });
  await check('in-app reminders require explicit creation and persist completion', async () => {
    task = (await applicant.call('/api/tasks', 'POST', { applicationId: application.id, title: 'Check official consulate instructions', dueAt: '2030-01-01T09:00:00.000Z' }, 201)).task;
    assert.equal(task.completed, false);
    await stranger.call(`/api/tasks/${task.id}`, 'PATCH', { completed: true }, 404);
    assert.equal((await applicant.call(`/api/tasks/${task.id}`, 'PATCH', { completed: true })).task.completed, true);
  });
  await check('assistant is grounded and does not silently create reminders', async () => {
    const before = (await applicant.call(`/api/applications/${application.id}`)).application.tasks.length;
    const result = await applicant.call('/api/ai/chat', 'POST', { applicationId: application.id, message: 'What do I need to prepare?' });
    assert.equal(result.mode, 'local');
    assert.equal(result.message.role, 'assistant');
    assert.ok(result.message.content.length > 0);
    assert.ok(Array.isArray(result.message.citations));
    assert.ok(result.message.citations.every((citation: { verificationStatus: string }) => citation.verificationStatus === 'DEMO'));
    assert.ok(result.message.content.includes('An integration-only reason'));
    assert.equal((await applicant.call(`/api/applications/${application.id}`)).application.tasks.length, before);
    await stranger.call('/api/ai/chat', 'POST', { applicationId: application.id, message: 'Show private notes' }, 404);
  });
  await check('read-only plan omits items the user marked not applicable', async () => {
    const plan = await applicant.call(`/api/applications/${application.id}/plan`);
    assert.ok(Array.isArray(plan.tasks));
    assert.ok(!plan.tasks.some((suggestion: { title: string }) => suggestion.title.includes(item.rule.title)));
    assert.match(plan.notice, /self-reported|NOT_APPLICABLE|not verified|sample|DEMO/i);
  });
  await check('text interview practice returns questions and stores explicit answers', async () => {
    const session = await applicant.call('/api/interview/session', 'POST', { applicationId: application.id });
    assert.ok(session.questions.length > 0);
    const answered = await applicant.call('/api/interview/session', 'POST', {
      applicationId: application.id, question: session.questions[0], answer: 'I chose a degree aligned with my previous studies and have a clear academic plan.',
    });
    assert.ok(answered.feedback.length > 0);
    await stranger.call('/api/interview/session', 'POST', { applicationId: application.id }, 404);
  });
  await check('export contains only the requesting applicant and no authentication hashes', async () => {
    const exported = await applicant.call('/api/account/export');
    const serialized = JSON.stringify(exported);
    assert.ok(serialized.includes(owner.email));
    assert.ok(serialized.includes(application.id));
    assert.ok(!serialized.includes(other.email));
    assert.ok(!serialized.includes('passwordHash'));
    assert.ok(!serialized.includes('tokenHash'));
  });
  await check('public source directory identifies provenance', async () => {
    const result = await new Client().call('/api/sources');
    assert.ok(result.sources.length >= 5);
    assert.ok(result.sources.every((source: Source) => source.url.startsWith('https://')));
  });
  await check('applicants cannot use administrative review or audit endpoints', async () => {
    await applicant.call('/api/admin/rules', 'GET', undefined, 403);
    await applicant.call('/api/admin/audit', 'GET', undefined, 403);
    const current = await applicant.call('/api/account', 'PATCH', { name: owner.name, role: 'ADMIN' });
    assert.equal(current.user.role, 'APPLICANT');
  });
  await check('administrators see cross-user denial audit without leaked private content', async () => {
    const logs = (await administrator.call('/api/admin/audit')).logs;
    assert.ok(logs.some((log: AuditLog) => log.actorId === other.id && /deni|unauthor|forbidden|access/i.test(log.action)));
    assert.ok(!JSON.stringify(logs).includes(password));
  });
  await check('arbitrary publishers and demonstration rules cannot be made official', async () => {
    const source = await db.source.create({ data: {
      destination: 'GB', title: `Unregistered integration source ${runId}`, official: true,
      url: `https://source-${runId}.invalid/visa`,
    } });
    sourceIds.push(source.id);
    const invalidRule = (await administrator.call('/api/admin/rules', 'POST', {
      sourceId: source.id, destination: 'GB', nationality: 'ZZ', residence: 'ZZ', jurisdiction: `Integration ${runId}`,
      visaType: 'study', title: 'Unregistered integration rule', description: 'An intentionally unsupported integration rule.',
      sourceExcerpt: 'This integration excerpt is not a registered official source.',
    }, 201)).rule;
    ruleIds.push(invalidRule.id);
    await administrator.call(`/api/admin/rules/${invalidRule.id}`, 'PATCH', { reviewStatus: 'APPROVED', validUntil: reviewExpiry }, 400);
    await administrator.call(`/api/admin/rules/${item.rule.id}`, 'PATCH', { reviewStatus: 'APPROVED', validUntil: reviewExpiry }, 409);
  });
  await check('approval requires an exact supporting source excerpt', async () => {
    const source = await db.source.findUniqueOrThrow({ where: { url: 'https://www.gov.uk/student-visa' } });
    sourceSnapshot = { id: source.id, excerpt: source.excerpt, checksum: source.checksum, fetchedAt: source.fetchedAt };
    const excerpt = 'Integration fixture only. Provide a current passport or other valid travel documentation. This synthetic text is used solely to exercise exact excerpt matching and is not real immigration guidance.';
    await administrator.call(`/api/admin/sources/${source.id}/snapshot`, 'POST', { excerpt, confirmOfficialOrigin: false }, 400);
    await administrator.call(`/api/admin/sources/${source.id}/snapshot`, 'POST', { excerpt, confirmOfficialOrigin: true });
    fixtureRule = (await administrator.call('/api/admin/rules', 'POST', {
      sourceId: source.id, destination: 'GB', nationality: 'ZZ', residence: 'ZZ', jurisdiction: `Integration ${runId}`,
      visaType: 'study', title: 'Integration passport requirement', description: 'Provide current travel documentation.',
      sourceExcerpt: 'Unsupported integration claim absent from the recorded source text.',
    }, 201)).rule;
    ruleIds.push(fixtureRule.id);
    assert.equal(fixtureRule.reviewStatus, 'DRAFT');
    await administrator.call(`/api/admin/rules/${fixtureRule.id}`, 'PATCH', { reviewStatus: 'APPROVED', validUntil: reviewExpiry }, 400);
    await administrator.call(`/api/admin/rules/${fixtureRule.id}`, 'PATCH', { reviewStatus: 'REJECTED' });
    fixtureRule = (await administrator.call('/api/admin/rules', 'POST', {
      sourceId: source.id, destination: 'GB', nationality: 'ZZ', residence: 'ZZ', jurisdiction: `Integration ${runId}`,
      visaType: 'study', title: 'Integration passport requirement', description: 'Provide current travel documentation.',
      sourceExcerpt: excerpt,
    }, 201)).rule;
    ruleIds.push(fixtureRule.id);
    await administrator.call(`/api/admin/rules/${fixtureRule.id}`, 'PATCH', { reviewStatus: 'APPROVED', validUntil: '2030-01-01T00:00:00.000Z' }, 400);
    const approved = await administrator.call(`/api/admin/rules/${fixtureRule.id}`, 'PATCH', { reviewStatus: 'APPROVED', validUntil: reviewExpiry });
    assert.equal(approved.rule.reviewStatus, 'APPROVED');
    assert.equal(approved.rule.isDemo, false);
    assert.ok(approved.rule.verifiedAt);
    await administrator.call(`/api/admin/rules/${fixtureRule.id}`, 'PATCH', { reviewStatus: 'REJECTED' }, 409);
  });
  await check('a scoped approved rule produces VERIFIED only in its exact scope', async () => {
    const exact = (await applicant.call('/api/applications', 'POST', { ...profile, destination: 'GB', nationality: 'ZZ', residence: 'ZZ', jurisdiction: `Integration ${runId}` }, 201)).application;
    const requirements = await applicant.call(`/api/applications/${exact.id}/requirements`);
    assert.equal(requirements.verificationStatus, 'VERIFIED');
    assert.ok(requirements.items.some((entry: DetailedItem) => entry.rule.id === fixtureRule.id));
    const draft = (await administrator.call('/api/admin/rules', 'POST', {
      sourceId: fixtureRule.sourceId, destination: 'GB', nationality: 'ZZ', residence: 'ZZ', jurisdiction: `Integration ${runId}`,
      visaType: 'study', title: fixtureRule.title, description: fixtureRule.description, sourceExcerpt: fixtureRule.sourceExcerpt,
    }, 201)).rule;
    ruleIds.push(draft.id);
    assert.equal((await applicant.call(`/api/applications/${exact.id}/requirements`)).verificationStatus, 'VERIFIED');
    await administrator.call(`/api/admin/rules/${draft.id}`, 'PATCH', { reviewStatus: 'REJECTED' });
    const withdrawn = await applicant.call(`/api/applications/${exact.id}/requirements`);
    assert.equal(withdrawn.verificationStatus, 'UNKNOWN');
    assert.equal(withdrawn.items.length, 0);
    await applicant.call(`/api/applications/${exact.id}`, 'DELETE', undefined);
  });
  await check('concurrent snapshot replacement cannot falsify approval provenance', async () => {
    const draft = (await administrator.call('/api/admin/rules', 'POST', {
      sourceId: fixtureRule.sourceId, destination: 'GB', nationality: 'ZZ', residence: 'ZZ', jurisdiction: `Race ${runId}`,
      visaType: 'study', title: `Concurrency integration ${runId}`, description: 'A synthetic integration requirement for concurrent review checks.',
      sourceExcerpt: fixtureRule.sourceExcerpt,
    }, 201)).rule;
    ruleIds.push(draft.id);
    const replacement = 'Different integration snapshot only. This text replaces the former synthetic excerpt during a concurrent approval attempt. It is not legal information and contains no supporting excerpt from the previous source snapshot.';
    const [review] = await Promise.all([
      fetch(`${base}/api/admin/rules/${draft.id}`, {
        method: 'PATCH', headers: { 'content-type': 'application/json', 'x-requested-with': 'visa-assistant', cookie: administrator.cookie },
        body: JSON.stringify({ reviewStatus: 'APPROVED', validUntil: reviewExpiry }),
      }),
      administrator.call(`/api/admin/sources/${fixtureRule.sourceId}/snapshot`, 'POST', { excerpt: replacement, confirmOfficialOrigin: true }),
    ]);
    assert.ok([200, 400, 409].includes(review.status), `Concurrent review status ${review.status}`);
    if (review.status === 200) {
      const approved = (await review.json()).rule;
      assert.equal(approved.sourceExcerpt, fixtureRule.sourceExcerpt);
      const auditRecord = await db.auditLog.findFirstOrThrow({ where: { actorId: admin.id, resourceId: draft.id, action: 'rule.approved' } });
      const metadata = auditRecord.metadata as { sourceChecksum: string; supportingExcerptChecksum: string };
      const oldChecksum = createHash('sha256').update(fixtureRule.sourceExcerpt).digest('hex');
      assert.equal(metadata.sourceChecksum, oldChecksum);
      assert.equal(metadata.supportingExcerptChecksum, oldChecksum);
      await administrator.call(`/api/admin/sources/${fixtureRule.sourceId}/snapshot`, 'POST', { excerpt: `${replacement} A later replacement must not alter reviewed provenance.`, confirmOfficialOrigin: true });
      assert.equal((await db.rule.findUniqueOrThrow({ where: { id: draft.id } })).sourceExcerpt, fixtureRule.sourceExcerpt);
      assert.deepEqual((await db.auditLog.findUniqueOrThrow({ where: { id: auditRecord.id } })).metadata, auditRecord.metadata);
    }
    await administrator.call(`/api/admin/sources/${fixtureRule.sourceId}/snapshot`, 'POST', { excerpt: fixtureRule.sourceExcerpt, confirmOfficialOrigin: true });
  });
  await check('profile changes become UNKNOWN and cannot carry stale checklist statuses', async () => {
    const previousId = item.id;
    const changed = (await applicant.call(`/api/applications/${application.id}`, 'PATCH', { jurisdiction: `Unsupported ${runId}` })).application;
    assert.equal(changed.profileVersion, 2);
    const requirements = await applicant.call(`/api/applications/${application.id}/requirements`);
    assert.equal(requirements.verificationStatus, 'UNKNOWN');
    assert.equal(requirements.items.length, 0);
    await applicant.call(`/api/checklist/${previousId}`, 'PATCH', { status: 'HAVE_IT' }, 404);
    const versionCount = await db.profileVersion.count({ where: { applicationId: application.id } });
    assert.ok(versionCount >= 2);
  });
  await check('unknown-scope assistant avoids presenting missing rules as verified', async () => {
    const result = await applicant.call('/api/ai/chat', 'POST', { applicationId: application.id, message: 'Tell me my verified checklist' });
    assert.match(result.message.content, /unknown|unverified|not verified|no verified|cannot verify|not available/i);
  });
  await check('a partial purpose edit preserves all custom scope fields', async () => {
    const custom = (await applicant.call('/api/applications', 'POST', { ...profile, nationality: 'US', residence: 'US', jurisdiction: `New York ${runId}` }, 201)).application;
    const updated = (await applicant.call(`/api/applications/${custom.id}`, 'PATCH', { purpose: 'Changed study purpose only' })).application;
    assert.equal(updated.nationality, 'US');
    assert.equal(updated.residence, 'US');
    assert.equal(updated.jurisdiction, `New York ${runId}`);
    assert.equal((await applicant.call(`/api/applications/${custom.id}/requirements`)).verificationStatus, 'UNKNOWN');
    await applicant.call(`/api/applications/${custom.id}`, 'DELETE');
  });
  await check('case deletion removes private child data and denies all future access', async () => {
    await stranger.call(`/api/applications/${application.id}`, 'DELETE', undefined, 404);
    await applicant.call(`/api/applications/${application.id}`, 'DELETE', undefined);
    await applicant.call(`/api/applications/${application.id}`, 'GET', undefined, 404);
    assert.equal(await db.task.count({ where: { applicationId: application.id } }), 0);
    assert.equal(await db.message.count({ where: { applicationId: application.id } }), 0);
    assert.equal(await db.interviewAnswer.count({ where: { applicationId: application.id } }), 0);
  });
  await check('account deletion verifies password and revokes existing session', async () => {
    await applicant.call('/api/account', 'DELETE', { password: 'Incorrect!2026' }, 401);
    anonymizedAuditIds.push(...(await db.auditLog.findMany({ where: { actorId: owner.id }, select: { id: true } })).map((log) => log.id));
    await applicant.call('/api/account', 'DELETE', { password });
    assert.equal((await applicant.call('/api/auth/me')).user, null);
    assert.equal(await db.user.count({ where: { id: owner.id } }), 0);
    assert.equal(await db.session.count({ where: { userId: owner.id } }), 0);
  });
  await check('password reset is single-use and invalidates existing sessions', async () => {
    const reset = await stranger.call('/api/auth/forgot-password', 'POST', { email: other.email });
    assert.equal(reset.ok, true);
    assert.ok(reset.developmentResetUrl, 'Local preview is needed for this fixture; this does not verify delivered email.');
    const token = new URL(reset.developmentResetUrl).searchParams.get('token');
    const updatedPassword = 'Updated-only!Visa2026';
    await stranger.call('/api/auth/reset-password', 'POST', { token, password: updatedPassword });
    assert.equal((await stranger.call('/api/auth/me')).user, null);
    await stranger.call('/api/auth/reset-password', 'POST', { token, password: updatedPassword }, 400);
    await stranger.call('/api/auth/login', 'POST', { email: other.email, password }, 401);
    await stranger.call('/api/auth/login', 'POST', { email: other.email, password: updatedPassword });
    assert.equal((await stranger.call('/api/auth/me')).user.id, other.id);
  });
  await check('password-confirmed deletion blocks repeated guessing', async () => {
    for (let attempt = 0; attempt < 5; attempt++) {
      await stranger.call('/api/account', 'DELETE', { password: 'Incorrect!Password2026' }, 401);
    }
    await stranger.call('/api/account', 'DELETE', { password: 'Incorrect!Password2026' }, 429);
    assert.equal(await db.user.count({ where: { id: other.id } }), 1);
  });
  console.log(`1..${passed}\n${passed} integration checks passed.`);
}

main().catch((error) => {
  console.error(`not ok ${passed + 1} - ${error instanceof Error ? error.message : error}`);
  process.exitCode = 1;
}).finally(async () => {
  // Only resources tagged to this invocation are removed; seeded/user data stays intact.
  await db.auditLog.deleteMany({ where: { OR: [{ actorId: { in: users } }, { id: { in: anonymizedAuditIds } }] } });
  await db.user.deleteMany({ where: { id: { in: users } } });
  await db.rule.deleteMany({ where: { id: { in: ruleIds } } });
  if (sourceSnapshot) {
    const { id, ...data } = sourceSnapshot;
    await db.source.update({ where: { id }, data });
  }
  await db.rule.deleteMany({ where: { sourceId: { in: sourceIds } } });
  await db.source.deleteMany({ where: { id: { in: sourceIds } } });
  await db.$disconnect();
});
