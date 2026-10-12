import { z } from "zod";
import { db } from "@/lib/db";
import { requireUser, publicUser, checkPassword, destroySession } from "@/lib/auth";
import { route, body, json, AppError, audit, rateLimit } from "@/lib/http";
export const PATCH = route(async request => {
  const user = await requireUser({allowUnverified: true});
  const input = await body(request, z.object({name: z.string().trim().min(2).max(80).optional(), aiConsent: z.boolean().optional(), notificationConsent: z.boolean().optional()}).refine(v => Object.keys(v).length > 0, "Provide an account setting."));
  const updated = await db.user.update({where: {id: user.id}, data: input});
  await audit(user.id, "account.preferences_updated", user.id, {changedFields: Object.keys(input)});
  return json({user: publicUser(updated)});
});
export const DELETE = route(async request => {
  const user = await requireUser({allowUnverified: true});
  await rateLimit(`account:delete:${user.id}`, 5, 60 * 60 * 1000);
  const {password} = await body(request, z.object({password: z.string().min(1).max(128)}));
  if (!await checkPassword(password, user.passwordHash)) throw new AppError(401, "Password is incorrect.");
  await destroySession();
  await db.user.delete({where: {id: user.id}});
  return json({ok: true});
});
