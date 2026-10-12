import { z } from "zod";
import { Prisma } from "@prisma/client";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { AppError, body, json, route } from "@/lib/http";
import { isKnownOfficialSource, sourceChecksum } from "@/lib/sources";

const snapshotSchema = z.object({
  excerpt: z.string().trim().min(100).max(50000),
  confirmOfficialOrigin: z.literal(true),
}).strict();

async function recordSnapshot(userId: string, id: string, excerpt: string) {
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      return await db.$transaction(async (tx) => {
        const existing = await tx.source.findUnique({ where: { id } });
        if (!existing || !existing.official || !isKnownOfficialSource(existing.destination, existing.url)) {
          throw new AppError(400, "Only registered official sources can receive a review snapshot.");
        }
        const source = await tx.source.update({
          where: { id },
          data: { excerpt, checksum: sourceChecksum(excerpt), fetchedAt: new Date() },
        });
        // Keep the snapshot audit atomic and its previous-checksum chain
        // accurate when two reviewers replace a source concurrently.
        await tx.auditLog.create({
          data: {
            actorId: userId,
            action: "source.snapshot_recorded",
            resourceId: id,
            metadata: {
              checksum: source.checksum,
              previousChecksum: existing.checksum,
              provenance: "reviewer-provided text from registered official URL",
            },
          },
        });
        return source;
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034") {
        if (attempt < 3) continue;
        throw new AppError(409, "This source changed during recording. Please retry.");
      }
      throw error;
    }
  }
  throw new AppError(409, "This source changed during recording. Please retry.");
}

export const POST = route(async (request, context: { params: Promise<{ id: string }> }) => {
  const user = await requireAdmin();
  const { id } = await context.params;
  const input = await body(request, snapshotSchema);
  return json({ source: await recordSnapshot(user.id, id, input.excerpt) });
});
