import { requireUser } from "@/lib/auth";
import { AppError, body, json, route } from "@/lib/http";
import { applicationDetails, applicationPatchSchema, applicationProfile, applicationTransaction, ownedApplication, syncChecklist } from "@/lib/applications";

type Context = { params: Promise<{ id: string }> };

export const GET = route(async (_request, context: Context) => {
  const user = await requireUser();
  const { id } = await context.params;
  const application = await applicationTransaction(async (tx) => {
    const current = await ownedApplication(user.id, id, tx);
    await syncChecklist(tx, current);
    return tx.application.findFirstOrThrow({
      where: { id, ownerId: user.id },
      include: applicationDetails,
    });
  });
  return json({ application });
});

export const PATCH = route(async (request, context: Context) => {
  const user = await requireUser();
  const { id } = await context.params;
  const patch = await body(request, applicationPatchSchema);
  const application = await applicationTransaction(async (tx) => {
    const current = await ownedApplication(user.id, id, tx);
    const changed = Object.entries(patch).some(([key, value]) => {
      const previous = current[key as keyof typeof current];
      if (value instanceof Date) return !(previous instanceof Date) || previous.getTime() !== value.getTime();
      return previous !== value;
    });
    if (changed) {
      const updated = await tx.application.update({
        where: { id, ownerId: user.id },
        data: { ...patch, profileVersion: { increment: 1 } },
      });
      await tx.profileVersion.create({
        data: { applicationId: id, version: updated.profileVersion, profile: applicationProfile(updated) },
      });
      await syncChecklist(tx, updated);
    } else {
      await syncChecklist(tx, current);
    }
    const result = await tx.application.findFirstOrThrow({ where: { id, ownerId: user.id }, include: applicationDetails });
    await tx.auditLog.create({
      data: { actorId: user.id, action: "APPLICATION_PROFILE_UPDATED", resourceId: id, metadata: { fields: Object.keys(patch), version: result.profileVersion } },
    });
    return result;
  });
  return json({ application });
});

export const DELETE = route(async (_request, context: Context) => {
  const user = await requireUser();
  const { id } = await context.params;
  await applicationTransaction(async (tx) => {
    await ownedApplication(user.id, id, tx);
    const result = await tx.application.deleteMany({ where: { id, ownerId: user.id } });
    if (!result.count) throw new AppError(404, "Application not found.");
    await tx.auditLog.create({ data: { actorId: user.id, action: "APPLICATION_DELETED", resourceId: id } });
  });
  return json({ ok: true });
});
