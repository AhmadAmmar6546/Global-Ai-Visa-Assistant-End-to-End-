import { requireUser, createAuthToken } from "@/lib/auth";
import { route, json, rateLimit, audit } from "@/lib/http";
import { appUrl, deliverAuthEmail } from "@/lib/email";
export const POST = route(async () => {
  const user = await requireUser({allowUnverified: true});
  if (user.emailVerifiedAt) return json({ok: true});
  await rateLimit(`auth:resend:${user.id}`, 3, 60 * 60 * 1000);
  const token = await createAuthToken(user.id, "VERIFY_EMAIL");
  const url = `${appUrl()}/verify-email?token=${token}`;
  const delivered = await deliverAuthEmail(user.email, url, "verify");
  await audit(user.id, "account.verification_resent", user.id);
  return json({ok: true, ...(!delivered && process.env.NODE_ENV !== "production" ? {developmentVerificationUrl: url} : {})});
});
