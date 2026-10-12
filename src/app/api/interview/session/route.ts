import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { body, json, rateLimit, route } from "@/lib/http";
import { applicationTransaction, ownedApplication } from "@/lib/applications";

const schema = z.object({
  applicationId: z.string().uuid(),
  question: z.string().trim().min(5).max(1000).optional(),
  answer: z.string().trim().min(1).max(6000).optional(),
}).strict().refine((value) => Boolean(value.question) === Boolean(value.answer), {
  message: "Provide both the practice question and your answer.",
});

export const POST = route(async (request) => {
  const user = await requireUser();
  await rateLimit(`interview:${user.id}`, 40, 60_000);
  const input = await body(request, schema);
  const application = await ownedApplication(user.id, input.applicationId);
  const country = ({ IT: "Italy", DE: "Germany", GB: "the United Kingdom", CA: "Canada", AU: "Australia" } as Record<string, string>)[application.destination] ?? application.destination;
  const questions = [
    `Why did you choose your programme and institution in ${country}?`,
    "How does this programme connect to your education and career plans?",
    "How will you pay for your tuition and living expenses, and what evidence supports your funding plan?",
    "What do you know about your course structure and expected study schedule?",
    "What are your plans after your studies, consistent with your visa conditions?",
  ];
  if (!input.question || !input.answer) return json({ questions });
  const words = input.answer.split(/\s+/).length;
  const guidance = words < 20
    ? "Your answer is brief. Add specific, truthful details that directly address the question, then explain the evidence you can provide."
    : words > 250
      ? "Your answer is lengthy. Practise a shorter version with your main point, two concrete details and supporting evidence."
      : "Review whether your answer directly addresses the question, uses specific and truthful details, and agrees with your application and supporting evidence.";
  const feedback = `${guidance} This is local practice guidance, not an assessment by a visa officer or a prediction of approval. Never invent facts or memorise misleading answers.`;
  const question = input.question;
  const answer = input.answer;
  await applicationTransaction(async (tx) => {
    await ownedApplication(user.id, application.id, tx);
    const saved = await tx.interviewAnswer.create({
      data: { applicationId: application.id, question, answer, feedback },
    });
    await tx.auditLog.create({ data: { actorId: user.id, action: "INTERVIEW_PRACTICE_SAVED", resourceId: saved.id, metadata: { applicationId: application.id } } });
  });
  return json({ questions, feedback });
});
