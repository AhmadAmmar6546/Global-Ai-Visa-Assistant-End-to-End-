import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { json, route } from "@/lib/http";

export const GET = route(async () => {
  await requireAdmin();
  const logs = await db.auditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
    include: { actor: { select: { id: true, name: true } } },
  });
  return json({ logs });
});
