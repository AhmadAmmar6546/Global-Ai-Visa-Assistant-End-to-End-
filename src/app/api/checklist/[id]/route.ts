import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { AppError, audit, body, json, route } from "@/lib/http";
import { applicationTransaction, ownedApplication, syncChecklist, validResourceId } from "@/lib/applications";

const schema = z.object({
  status: z.enum(["NOT_STARTED", "HAVE_IT", "NEED_HELP", "NOT_APPLICABLE", "REVIEWED"]),
  notes: z.string().trim().max(3000).optional(),
  reason: z.string().trim().max(1000).optional(),
}).strict().refine((value) => value.status !== "NOT_APPLICABLE" || Boolean(value.reason), {
  message: "Explain why this requirement is not applicable.", path: ["reason"],
});

type Context = { params: Promise<{ id: string }> };

export const PATCH = route(async (request, context: Context) => {
  const user = await requireUser();
  const { id } = await context.params;
  validResourceId(id);
  const patch = await body(request, schema);
  const item = await applicationTransaction(async (tx) => {
    const current = await tx.checklistItem.findFirst({
      where: { id, application: { ownerId: user.id } },
    });
    if (!current) {
      await audit(user.id, "CHECKLIST_ACCESS_DENIED", id);
      throw new AppError(404, "Checklist item not found.");
    }
    const application = await ownedApplication(user.id, current.applicationId, tx);
    const snapshot = await syncChecklist(tx, application);
    if (!snapshot.items.some((entry) => entry.id === id)) {
      throw new AppError(409, "This requirement no longer applies to your current profile. Refresh the checklist.");
    }
    const result = await tx.checklistItem.update({
      where: { id, application: { ownerId: user.id } },
      data: { ...patch, reason: patch.reason ?? "" },
      include: { rule: { include: { source: true } } },
    });
    await tx.auditLog.create({ data: { actorId: user.id, action: "CHECKLIST_SELF_REPORT_UPDATED", resourceId: id, metadata: { status: patch.status } } });
    return result;
  });
  return json({ item });
});
