import { db } from "@/lib/db";
import { hashToken } from "@/lib/auth";
import { route, json, AppError, audit } from "@/lib/http";
export const GET = route(async request => {
  const token = new URL(request.url).searchParams.get("token");
  if (!token || token.length > 128) throw new AppError(400, "Verification link is invalid.");
  const record = await db.authToken.findUnique({where: {tokenHash: hashToken(token)}});
  if (!record || record.kind !== "VERIFY_EMAIL" || record.expiresAt <= new Date()) throw new AppError(400, "Verification link has expired or was already used.");
  await db.$transaction(async tx => {
    await tx.authToken.delete({where: {id: record.id}});
    await tx.user.update({where: {id: record.userId}, data: {emailVerifiedAt: new Date()}});
  });
  await audit(record.userId, "account.email_verified", record.userId);
  return json({ok: true});
});
