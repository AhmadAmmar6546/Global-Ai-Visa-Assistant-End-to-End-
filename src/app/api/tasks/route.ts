import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { body, json, route } from "@/lib/http";
import { applicationTransaction, dateInput, ownedApplication } from "@/lib/applications";

const schema = z.object({
  applicationId: z.string().uuid(),
  title: z.string().trim().min(2).max(250),
  dueAt: dateInput.nullable().optional(),
}).strict();

export const POST = route(async (request) => {
  const user = await requireUser();
  const input = await body(request, schema);
  const task = await applicationTransaction(async (tx) => {
    await ownedApplication(user.id, input.applicationId, tx);
    const created = await tx.task.create({ data: input });
    await tx.auditLog.create({ data: { actorId: user.id, action: "TASK_CREATED", resourceId: created.id, metadata: { applicationId: created.applicationId } } });
    return created;
  });
  return json({ task }, 201);
});
