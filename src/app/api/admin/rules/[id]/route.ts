import { z } from "zod";
import { Prisma } from "@prisma/client";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { AppError, body, json, route } from "@/lib/http";
import { exactSupportingExcerpt, isKnownOfficialSource, sourceChecksum } from "@/lib/sources";

const reviewSchema = z.object({
  reviewStatus: z.enum(["APPROVED", "REJECTED"]),
  validUntil: z.string().datetime().optional(),
}).strict();

async function reviewDraft(userId: string, id: string, input: z.infer<typeof reviewSchema>) {
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      return await db.$transaction(async (tx) => {
        // Source validation, publication and its evidence audit share one
        // consistent database snapshot. Later source updates cannot replace
        // the checksum of the evidence this review actually validated.
        const existing = await tx.rule.findUnique({ where: { id }, include: { source: true } });
        if (!existing) throw new AppError(404, "Rule not found.");
        if (existing.reviewStatus !== "DRAFT") {
          throw new AppError(409, "Reviewed rules are immutable. Create a new draft version to revise this requirement.");
        }
        let validUntil: Date | null = null;
        const reviewedAt = new Date();
        if (input.reviewStatus === "APPROVED") {
          if (existing.isDemo) throw new AppError(400, "Demonstration rules cannot be approved as official requirements.");
          if (!existing.source.official || !isKnownOfficialSource(existing.destination, existing.source.url)) {
            throw new AppError(400, "Approval requires a registered official source for this destination.");
          }
          if (!existing.source.fetchedAt || !existing.source.checksum || existing.source.checksum !== sourceChecksum(existing.source.excerpt)) {
            throw new AppError(400, "Record and review the official source text before approving its rules.");
          }
          if (!exactSupportingExcerpt(existing.source.excerpt, existing.sourceExcerpt)) {
            throw new AppError(400, "The supporting excerpt must occur verbatim in the recorded official source text.");
          }
          if (!input.validUntil) throw new AppError(400, "Approval requires a future review expiry date.");
          validUntil = new Date(input.validUntil);
          const maximum = reviewedAt.getTime() + 366 * 24 * 60 * 60 * 1000;
          if (validUntil.getTime() <= reviewedAt.getTime() || validUntil.getTime() > maximum) {
            throw new AppError(400, "Review expiry must be in the future and within one year.");
          }
        }
        // This condition additionally protects two reviewers racing on one draft.
        const update = await tx.rule.updateMany({
          where: { id, reviewStatus: "DRAFT" },
          data: {
            reviewStatus: input.reviewStatus,
            reviewedBy: userId,
            verifiedAt: input.reviewStatus === "APPROVED" ? reviewedAt : null,
            validUntil,
          },
        });
        if (update.count !== 1) throw new AppError(409, "This draft has already been reviewed. Create a new version for further changes.");
        await tx.auditLog.create({
          data: {
            actorId: userId,
            action: `rule.${input.reviewStatus.toLowerCase()}`,
            resourceId: id,
            metadata: {
              sourceId: existing.sourceId,
              sourceUrl: existing.source.url,
              version: existing.version,
              reviewedAt: reviewedAt.toISOString(),
              validUntil: validUntil?.toISOString() ?? null,
              sourceChecksum: existing.source.checksum,
              sourceFetchedAt: existing.source.fetchedAt?.toISOString() ?? null,
              supportingExcerptChecksum: sourceChecksum(existing.sourceExcerpt),
            },
          },
        });
        return tx.rule.findUniqueOrThrow({ where: { id }, include: { source: true } });
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034") {
        if (attempt < 3) continue;
        throw new AppError(409, "The source or draft changed during review. Please review the current evidence and retry.");
      }
      throw error;
    }
  }
  throw new AppError(409, "The source or draft changed during review. Please retry.");
}

export const PATCH = route(async (request, context: { params: Promise<{ id: string }> }) => {
  const user = await requireAdmin();
  const { id } = await context.params;
  const input = await body(request, reviewSchema);
  return json({ rule: await reviewDraft(user.id, id, input) });
});
