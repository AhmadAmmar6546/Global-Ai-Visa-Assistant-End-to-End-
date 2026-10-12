import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { body, json, route } from "@/lib/http";
import { applicationCreateSchema, applicationProfile, applicationTransaction, requirementSnapshot, syncChecklist } from "@/lib/applications";

export const GET = route(async () => {
  const user = await requireUser();
  const applications = await db.application.findMany({
    where: { ownerId: user.id },
    orderBy: { updatedAt: "desc" },
    include: {
      checklist: { include: { rule: { include: { source: true } } } },
      tasks: { orderBy: [{ completed: "asc" }, { dueAt: "asc" }] },
    },
  });
  const scoped = await Promise.all(applications.map(async (application) => {
    const snapshot = await requirementSnapshot(db, application);
    const activeRules = new Set(snapshot.rules.map((rule) => rule.id));
    return {
      ...application,
      checklist: application.checklist.filter((item) => activeRules.has(item.ruleId)),
      verificationStatus: snapshot.verificationStatus,
    };
  }));
  return json({ applications: scoped });
});

export const POST = route(async (request) => {
  const user = await requireUser();
  const profile = await body(request, applicationCreateSchema);
  const application = await applicationTransaction(async (tx) => {
    const created = await tx.application.create({ data: { ...profile, ownerId: user.id } });
    await tx.profileVersion.create({
      data: { applicationId: created.id, version: 1, profile: applicationProfile(created) },
    });
    await syncChecklist(tx, created);
    await tx.auditLog.create({ data: { actorId: user.id, action: "APPLICATION_CREATED", resourceId: created.id } });
    return created;
  });
  return json({ application }, 201);
});
