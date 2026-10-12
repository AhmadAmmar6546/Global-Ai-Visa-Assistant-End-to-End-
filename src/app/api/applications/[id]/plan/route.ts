import { checklistStatusNotice, evidenceNotice, suggestedPlan } from "@/lib/ai";
import { ownedApplication, requirementSnapshot } from "@/lib/applications";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { json, route } from "@/lib/http";

export const GET = route(async (_request, context: { params: Promise<{ id: string }> }) => {
  const user = await requireUser();
  const { id } = await context.params;
  const application = await ownedApplication(user.id, id);
  const snapshot = await requirementSnapshot(db, application);
  const checklist = await db.checklistItem.findMany({
    where: { applicationId: application.id, ruleId: { in: snapshot.rules.map((rule) => rule.id) } },
    select: { ruleId: true, status: true, reason: true },
  });
  const statusNotice = checklistStatusNotice(snapshot, checklist);
  return json({ tasks: suggestedPlan(snapshot, checklist), notice: `${evidenceNotice(snapshot.verificationStatus)}${statusNotice ? `\n\n${statusNotice}` : ""} These are suggestions only. No tasks or reminders have been created.` });
});
