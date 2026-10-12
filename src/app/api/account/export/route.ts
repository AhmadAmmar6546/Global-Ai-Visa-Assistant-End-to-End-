import { db } from "@/lib/db";
import { requireUser, publicUser } from "@/lib/auth";
import { route, json, audit } from "@/lib/http";
export const GET = route(async () => {
  const user = await requireUser({allowUnverified: true});
  const applications = await db.application.findMany({where: {ownerId: user.id}, include: {checklist: {include: {rule: {include: {source: true}}}}, tasks: true, messages: true, versions: true, interviews: true}});
  await audit(user.id, "account.exported", user.id);
  const result = json({exportedAt: new Date(), user: publicUser(user), applications});
  result.headers.set("Content-Disposition", 'attachment; filename="visa-assistant-export.json"');
  return result;
});
