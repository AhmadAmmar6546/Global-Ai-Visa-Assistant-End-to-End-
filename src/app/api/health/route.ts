import { db } from "@/lib/db";
import { route, json } from "@/lib/http";
export const GET = route(async () => { await db.$queryRaw`SELECT 1`; return json({status: "ok", database: "connected"}); });
