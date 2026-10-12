import { db } from "@/lib/db";
import { json, route } from "@/lib/http";

export const GET = route(async () => {
  const sources = await db.source.findMany({
    orderBy: { destination: "asc" },
    select: {
      id: true,
      destination: true,
      title: true,
      url: true,
      official: true,
      fetchedAt: true,
      checksum: true,
      _count: { select: { rules: true } },
    },
  });
  return json({ sources });
});
