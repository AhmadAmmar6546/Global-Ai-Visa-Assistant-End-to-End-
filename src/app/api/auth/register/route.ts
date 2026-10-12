import { z } from "zod";
import { db } from "@/lib/db";
import { route, body, json, AppError, audit, rateLimit } from "@/lib/http";
import { emailSchema, passwordSchema, hashPassword, hashToken, createSession, publicUser, createAuthToken } from "@/lib/auth";
import { appUrl, emailConfigured, deliverAuthEmail } from "@/lib/email";

export const POST = route(async request => {
  const input = await body(request, z.object({ name: z.string().trim().min(2).max(80), email: emailSchema, password: passwordSchema }));
  await rateLimit("auth:registration:global", 100, 60 * 60 * 1000);
  await rateLimit(`register:${hashToken(input.email)}`, 5, 60 * 60 * 1000);
  if (process.env.NODE_ENV === "production" && !emailConfigured()) throw new AppError(503, "Registration requires configured email delivery.");
  const user = await db.user.create({ data: { name: input.name, email: input.email, passwordHash: await hashPassword(input.password) } });
  const token = await createAuthToken(user.id, "VERIFY_EMAIL");
  const url = `${appUrl()}/verify-email?token=${token}`;
  await createSession(user.id);
  let delivered = false;
  let verificationDeliveryFailed = false;
  try { delivered = await deliverAuthEmail(user.email, url, "verify"); }
  catch { verificationDeliveryFailed = true; }
  await audit(user.id, "account.registered", user.id);
  return json({ user: publicUser(user), verificationRequired: true, verificationDeliveryFailed, ...(!delivered && process.env.NODE_ENV !== "production" ? { developmentVerificationUrl: url } : {}) }, 201);
});
