import { z } from "zod";
import { db } from "@/lib/db";
import { route, body, json, AppError, audit, rateLimit } from "@/lib/http";
import { emailSchema, checkPassword, hashPassword, hashToken, createSession, publicUser } from "@/lib/auth";

let dummyHash: Promise<string> | undefined;
export const POST = route(async request => {
  const input = await body(request, z.object({ email: emailSchema, password: z.string().min(1).max(128) }));
  await rateLimit("auth:login:global", 300, 15 * 60 * 1000);
  await rateLimit(`login:${hashToken(input.email)}`, 15, 15 * 60 * 1000);
  const user = await db.user.findUnique({ where: { email: input.email } });
  dummyHash ??= hashPassword("unavailableAccount912834");
  const valid = await checkPassword(input.password, user?.passwordHash || await dummyHash);
  if (!user || !valid) throw new AppError(401, "Email or password is incorrect.");
  await createSession(user.id);
  await audit(user.id, "account.login", user.id);
  return json({ user: publicUser(user) });
});
