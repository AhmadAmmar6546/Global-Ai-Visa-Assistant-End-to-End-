import { Prisma } from "@prisma/client";
import { z } from "zod";
import { answerGuidance, type Citation } from "@/lib/ai";
import { ownedApplication, requirementSnapshot } from "@/lib/applications";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { AppError, body, json, rateLimit, route } from "@/lib/http";

const chatSchema = z.object({
  applicationId: z.string().uuid(),
  message: z.string().trim().min(1).max(2000),
}).strict();

export const POST = route(async (request) => {
  const user = await requireUser();
  const input = await body(request, chatSchema);
  await rateLimit(`ai-chat:${user.id}`, 12, 60000);
  const application = await ownedApplication(user.id, input.applicationId);
  const snapshot = await requirementSnapshot(db, application);
  const checklist = await db.checklistItem.findMany({
    where: { applicationId: application.id, ruleId: { in: snapshot.rules.map((rule) => rule.id) } },
    select: { ruleId: true, status: true, reason: true },
  });
  const answer = await answerGuidance({ userId: user.id, consent: user.aiConsent, application, message: input.message, snapshot, checklist });
  if (!answer.citations.length && snapshot.verificationStatus === "UNKNOWN") {
    const sources = await db.source.findMany({ where: { destination: application.destination, official: true } });
    answer.citations = sources.map((source): Citation => ({ ruleId: null, sourceId: source.id, title: source.title, url: source.url, verificationStatus: "UNKNOWN", verifiedAt: null, validUntil: null }));
  }
  const message = await db.$transaction(async (tx) => {
    const current = await tx.application.findFirst({ where: { id: application.id, ownerId: user.id, profileVersion: application.profileVersion } });
    if (!current) throw new AppError(409, "Your application profile changed while generating guidance. Please ask again for the current profile.");
    await tx.message.create({ data: { applicationId: application.id, role: "user", content: input.message } });
    return tx.message.create({ data: { applicationId: application.id, role: "assistant", content: answer.content, citations: answer.citations as unknown as Prisma.InputJsonValue } });
  });
  return json({ message, mode: answer.mode });
});
