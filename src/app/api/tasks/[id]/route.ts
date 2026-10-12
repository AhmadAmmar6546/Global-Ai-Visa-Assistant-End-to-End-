import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { AppError, audit, body, json, route } from "@/lib/http";
import { applicationTransaction, dateInput, validResourceId } from "@/lib/applications";

const schema = z.object({
  completed: z.boolean().optional(),
  title: z.string().trim().min(2).max(250).optional(),
  dueAt: dateInput.nullable().optional(),
}).strict().refine((value) => Object.keys(value).length > 0, "Provide at least one task field.");

type Context = { params: Promise<{ id: string }> };

export const PATCH = route(async (request, context: Context) => {
  const user = await requireUser();
  const { id } = await context.params;
  validResourceId(id);
  const patch = await body(request, schema);
  const task = await applicationTransaction(async (tx) => {
    const current = await tx.task.findFirst({ where: { id, application: { ownerId: user.id } } });
    if (!current) {
      await audit(user.id, "TASK_ACCESS_DENIED", id);
      throw new AppError(404, "Task not found.");
    }
    const result = await tx.task.update({ where: { id, application: { ownerId: user.id } }, data: patch });
    await tx.auditLog.create({ data: { actorId: user.id, action: "TASK_UPDATED", resourceId: id, metadata: { fields: Object.keys(patch) } } });
    return result;
  });
  return json({ task });
});

export const DELETE = route(async (_request, context: Context) => {
  const user = await requireUser();
  const { id } = await context.params;
  validResourceId(id);
  await applicationTransaction(async (tx) => {
    const current = await tx.task.findFirst({ where: { id, application: { ownerId: user.id } } });
    if (!current) {
      await audit(user.id, "TASK_ACCESS_DENIED", id);
      throw new AppError(404, "Task not found.");
    }
    await tx.task.deleteMany({ where: { id, application: { ownerId: user.id } } });
    await tx.auditLog.create({ data: { actorId: user.id, action: "TASK_DELETED", resourceId: id } });
  });
  return json({ ok: true });
});
