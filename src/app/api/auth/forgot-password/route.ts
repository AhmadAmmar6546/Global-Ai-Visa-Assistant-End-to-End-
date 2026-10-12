import { z } from "zod";
import { db } from "@/lib/db";
import { emailSchema, hashToken, createAuthToken } from "@/lib/auth";
import { route, body, json, AppError, rateLimit } from "@/lib/http";
import { appUrl, emailConfigured, deliverAuthEmail } from "@/lib/email";
export const POST = route(async request => {
  const {email} = await body(request, z.object({email: emailSchema}));
  await rateLimit(`reset:${hashToken(email)}`, 5, 60 * 60 * 1000);
  if (process.env.NODE_ENV === "production" && !emailConfigured()) throw new AppError(503, "Password reset requires configured email delivery.");
  const user = await db.user.findUnique({where: {email}});
  let developmentResetUrl: string | undefined;
  if (user) {
    const token = await createAuthToken(user.id, "RESET_PASSWORD");
    const url = `${appUrl()}/reset-password?token=${token}`;
    const delivered = await deliverAuthEmail(email, url, "reset");
    if (!delivered && process.env.NODE_ENV !== "production") developmentResetUrl = url;
  }
  return json({ok: true, ...(developmentResetUrl ? {developmentResetUrl} : {})});
});
