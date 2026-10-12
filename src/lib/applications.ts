import { Prisma, type Application } from "@prisma/client";
import { z } from "zod";
import { db } from "@/lib/db";
import { AppError, audit } from "@/lib/http";

type Database = Prisma.TransactionClient;

// A date input may be an HTML date value or an ISO timestamp. Reject impossible
// calendar dates instead of letting JavaScript silently roll them into March.
export const dateInput = z.string().trim().refine((value) => {
  if (!/^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2}))?$/.test(value)) return false;
  const parsed = new Date(value);
  if (!Number.isFinite(parsed.getTime())) return false;
  if (value.includes("T")) {
    const [hour, minute, second] = value.slice(11, 19).split(":").map(Number);
    if (hour > 23 || minute > 59 || second > 59) return false;
  }
  const [year, month, day] = value.slice(0, 10).split("-").map(Number);
  if (year < 1900 || year > 2200 || month < 1 || month > 12 || day < 1) return false;
  return day <= new Date(Date.UTC(year, month, 0)).getUTCDate();
}, "Enter a valid date or ISO timestamp.").transform((value) => new Date(value));

const countryCode = z.string().trim().toUpperCase().regex(/^[A-Z]{2}$/, "Use a two-letter country code.");
const profileFields = {
  destination: z.enum(["IT", "DE", "GB", "CA", "AU"]),
  nationality: countryCode,
  residence: countryCode,
  jurisdiction: z.string().trim().min(2).max(100),
  visaType: z.literal("study"),
  purpose: z.string().trim().min(2).max(1000),
  intendedDate: dateInput.nullable().optional(),
};
export const applicationCreateSchema = z.object({
  ...profileFields,
  nationality: profileFields.nationality.default("PK"),
  residence: profileFields.residence.default("PK"),
  jurisdiction: profileFields.jurisdiction.default("Islamabad"),
  visaType: profileFields.visaType.default("study"),
}).strict();

// Keep creation defaults out of patch input. Zod applies nested defaults inside
// optional fields, which could otherwise silently reset an existing profile.
export const applicationPatchSchema = z.object(profileFields).partial().strict().refine(
  (value) => Object.keys(value).length > 0,
  "Provide at least one profile field.",
);

export function validResourceId(id: string) {
  if (!z.string().uuid().safeParse(id).success) throw new AppError(400, "Invalid resource ID.");
  return id;
}

export async function ownedApplication(userId: string, id: string, client: Database = db) {
  validResourceId(id);
  const application = await client.application.findFirst({ where: { id, ownerId: userId } });
  if (!application) {
    // Use the same response and audit path for missing and other users' IDs.
    await audit(userId, "APPLICATION_ACCESS_DENIED", id);
    throw new AppError(404, "Application not found.");
  }
  return application;
}

export function applicationProfile(application: Pick<Application, "destination" | "nationality" | "residence" | "jurisdiction" | "visaType" | "purpose" | "intendedDate">) {
  return {
    destination: application.destination,
    nationality: application.nationality,
    residence: application.residence,
    jurisdiction: application.jurisdiction,
    visaType: application.visaType,
    purpose: application.purpose,
    intendedDate: application.intendedDate?.toISOString() ?? null,
  };
}

type Scope = Pick<Application, "destination" | "nationality" | "residence" | "jurisdiction" | "visaType">;

export async function requirementSnapshot(client: Database, profile: Scope) {
  const now = new Date();
  const candidates = await client.rule.findMany({
    where: {
      destination: profile.destination,
      nationality: profile.nationality,
      residence: profile.residence,
      jurisdiction: profile.jurisdiction,
      visaType: profile.visaType,
      reviewStatus: { in: ["APPROVED", "REJECTED"] },
    },
    include: { source: true },
    orderBy: [{ title: "asc" }, { version: "desc" }, { createdAt: "desc" }, { id: "asc" }],
  });
  // A reviewed revision supersedes its older version even if it was rejected
  // or has since expired. Drafts do not displace the last reviewed version.
  const latestByTitle = new Map<string, (typeof candidates)[number]>();
  for (const rule of candidates) {
    const key = `${rule.isDemo}:${rule.title}`;
    if (!latestByTitle.has(key)) latestByTitle.set(key, rule);
  }
  const latestReviewed = [...latestByTitle.values()];
  const official = latestReviewed.filter((rule) =>
    rule.reviewStatus === "APPROVED" && !rule.isDemo && rule.source.official && rule.verifiedAt !== null &&
    rule.validUntil !== null && rule.validUntil.getTime() > now.getTime(),
  );
  if (official.length) {
    return {
      verificationStatus: "VERIFIED" as const,
      rules: official,
      notice: "These individual requirements were reviewed against the cited official sources for your exact profile. This checklist may be incomplete; confirm current requirements with the relevant authority before applying.",
    };
  }
  const demo = latestReviewed.filter((rule) => rule.reviewStatus === "APPROVED" && rule.isDemo &&
    (rule.validUntil === null || rule.validUntil.getTime() > now.getTime()),
  );
  if (demo.length) {
    return {
      verificationStatus: "DEMO" as const,
      rules: demo,
      notice: "Demonstration checklist only. These sample requirements have not been verified against official guidance and must not be used as visa advice. Consult the linked authorities.",
    };
  }
  return {
    verificationStatus: "UNKNOWN" as const,
    rules: [],
    notice: "No reviewed requirements match this exact destination, nationality, residence, jurisdiction and visa type. Do not assume another profile's checklist applies; consult the relevant official authority.",
  };
}

export async function syncChecklist(client: Database, application: Application) {
  const snapshot = await requirementSnapshot(client, application);
  const ruleIds = snapshot.rules.map((rule) => rule.id);
  await client.checklistItem.deleteMany({
    where: {
      applicationId: application.id,
      ...(ruleIds.length ? { ruleId: { notIn: ruleIds } } : {}),
    },
  });
  for (const ruleId of ruleIds) {
    await client.checklistItem.upsert({
      where: { applicationId_ruleId: { applicationId: application.id, ruleId } },
      create: { applicationId: application.id, ruleId },
      update: {},
    });
  }
  const items = await client.checklistItem.findMany({
    where: { applicationId: application.id },
    include: { rule: { include: { source: true } } },
    orderBy: [{ rule: { title: "asc" } }, { id: "asc" }],
  });
  return { ...snapshot, items };
}

// Concurrent profile edits must never overwrite version history or leave a
// checklist assembled from two different scopes.
export async function applicationTransaction<T>(operation: (tx: Database) => Promise<T>): Promise<T> {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      return await db.$transaction(operation, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && ["P2034", "P2002"].includes(error.code)) {
        if (attempt < 2) continue;
        throw new AppError(409, "This application changed during your request. Please retry.");
      }
      throw error;
    }
  }
  throw new AppError(409, "This application changed during your request. Please retry.");
}

export const applicationDetails = {
  checklist: { include: { rule: { include: { source: true } } }, orderBy: { rule: { title: "asc" as const } } },
  tasks: { orderBy: [{ completed: "asc" as const }, { dueAt: "asc" as const }, { createdAt: "asc" as const }] },
  messages: { orderBy: { createdAt: "asc" as const } },
  versions: { orderBy: { version: "asc" as const } },
} satisfies Prisma.ApplicationInclude;
