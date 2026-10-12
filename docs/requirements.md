# MVP requirements

This release implements the blueprint's first release: foundations, identity,
application profiles, source review, manual checklists and grounded guidance.
In-app reminders and text interview practice are also included. See
[the blueprint scope mapping](blueprint-scope.md) for deferred releases.

## Applicant workflow

- An applicant registers a private account, verifies their email, signs in and
  can recover their password. Development email previews are local testing
  aids; production onboarding requires configured email delivery.
- Each applicant can create multiple study-visa cases for Italy, Germany,
  the United Kingdom, Canada or Australia. Nationality, legal residence,
  consular jurisdiction and destination are separate profile fields.
- Case data, checklists, conversations, reminders and interview answers are
  restricted to their owner. Platform reviewers do not receive applicant data
  merely through their reviewer role.
- A case remains usable without document uploads. Manual statuses persist:
  Not started, Have it, Need help, Not applicable with a reason, and Reviewed.
  These are applicant self-reports, separate from official rule verification.
- Applicants can save dated tasks, explicitly update their completion, obtain
  read-only next-step suggestions and practice truthful interview responses.
- Separate cloud-AI and notification preferences default to off. Applicants
  can export their own data and delete their account with password confirmation.

## Evidence and guidance

- Requirements match destination, nationality, residence, jurisdiction and visa
  type exactly. Unsupported combinations return UNKNOWN with no borrowed rules.
- Seeded sample checklists are clearly marked DEMO and have no verified date.
  They cannot be approved as official requirements.
- A reviewer records an official-source snapshot and creates a scoped draft.
  Publication requires an exact supporting excerpt and a future review expiry.
  Approval and its evidence audit are atomic; published revisions are immutable.
- A later reviewed rejection or expiry supersedes an older reviewed rule. A
  draft alone does not replace published evidence.
- Checklist progress never implies eligibility, document authenticity or visa
  approval. Official links alone do not substantiate demonstration items.
- Chat and preparation plans use the applicant's saved checklist statuses.
  Chat cannot update records, submit forms or send external messages.
- Local guidance requires no provider credentials. Cloud guidance requires
  reviewed evidence, explicit consent, a server-side key and a bounded budget.
  Unknown/demo profiles and provider failures use the local path.
- Provider context excludes applicant identity, private notes, inapplicability
  reasons and conversation history. The applicant's current question is shared
  only when they have enabled the cloud feature.

## Engineering acceptance

The project must generate its Prisma client, deploy versioned migrations to
PostgreSQL, seed idempotently, typecheck, lint and build. Real API tests exercise
ownership, persistence, consent, authentication recovery, deletion and source
publication. Desktop and mobile browser tests exercise the no-upload journey,
saved checklist progress, source warnings and unsupported profile handling.

External email/provider delivery, official legal-source verification and hosted
deployment require their own configured services and validation. The local test
results do not establish that those external operations have succeeded.
