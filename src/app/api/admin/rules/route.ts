import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { AppError, audit, body, json, route } from "@/lib/http";

const ruleSchema = z.object({
  sourceId: z.string().min(1).max(100),
  destination: z.enum(["IT", "DE", "GB", "CA", "AU"]),
  nationality: z.string().regex(/^[A-Z]{2}$/).default("PK"),
  residence: z.string().regex(/^[A-Z]{2}$/).default("PK"),
  jurisdiction: z.string().trim().min(1).max(100),
  visaType: z.literal("study").default("study"),
  title: z.string().trim().min(3).max(200),
  description: z.string().trim().min(20).max(4000),
  sourceExcerpt: z.string().trim().min(40).max(10000),
}).strict();

export const GET = route(async () => {
  await requireAdmin();
  const rules = await db.rule.findMany({
    include: { source: true },
    orderBy: [{ destination: "asc" }, { title: "asc" }, { version: "desc" }],
    take: 500,
  });
  return json({ rules });
});

export const POST = route(async (request) => {
  const user = await requireAdmin();
  const input = await body(request, ruleSchema);
  const source = await db.source.findUnique({ where: { id: input.sourceId } });
  if (!source || source.destination !== input.destination) {
    throw new AppError(400, "Select an official source for the same destination.");
  }
  // A revision creates a new record. Existing published records remain immutable.
  const previous = await db.rule.aggregate({
    where: {
      destination: input.destination,
      nationality: input.nationality,
      residence: input.residence,
      jurisdiction: input.jurisdiction,
      visaType: input.visaType,
      title: input.title,
      isDemo: false,
    },
    _max: { version: true },
  });
  const rule = await db.rule.create({
    data: { ...input, version: (previous._max.version ?? 0) + 1, reviewStatus: "DRAFT", isDemo: false },
    include: { source: true },
  });
  await audit(user.id, "rule.draft_created", rule.id, { sourceId: source.id, version: rule.version });
  return json({ rule }, 201);
});
