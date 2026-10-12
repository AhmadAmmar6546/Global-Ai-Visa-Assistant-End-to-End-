import { requireUser } from "@/lib/auth";
import { json, route } from "@/lib/http";
import { applicationTransaction, ownedApplication, syncChecklist } from "@/lib/applications";

type Context = { params: Promise<{ id: string }> };

export const GET = route(async (_request, context: Context) => {
  const user = await requireUser();
  const { id } = await context.params;
  const snapshot = await applicationTransaction(async (tx) => {
    const application = await ownedApplication(user.id, id, tx);
    return syncChecklist(tx, application);
  });
  const sources = [...new Map(snapshot.rules.map((rule) => [rule.source.id, rule.source])).values()];
  return json({
    verificationStatus: snapshot.verificationStatus,
    items: snapshot.items,
    sources,
    notice: snapshot.notice,
  });
});
