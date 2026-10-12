import { z } from "zod";
import { db } from "@/lib/db";
import { hashToken, hashPassword, passwordSchema } from "@/lib/auth";
import { route, body, json, AppError, audit } from "@/lib/http";
export const POST = route(async request => {
  const input = await body(request, z.object({token: z.string().min(20).max(128), password: passwordSchema}));
  const record = await db.authToken.findUnique({where: {tokenHash: hashToken(input.token)}});
  if (!record || record.kind !== "RESET_PASSWORD" || record.expiresAt <= new Date()) throw new AppError(400, "Reset link has expired or was already used.");
  const passwordHash = await hashPassword(input.password);
  await db.$transaction(async tx => {
    await tx.authToken.delete({where: {id: record.id}});
    await tx.user.update({where: {id: record.userId}, data: {passwordHash}});
    await tx.session.deleteMany({where: {userId: record.userId}});
  });
  await audit(record.userId, "account.password_reset", record.userId);
  return json({ok: true});
});
