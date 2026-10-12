import { destroySession } from "@/lib/auth";
import { route, json } from "@/lib/http";
export const POST = route(async () => { await destroySession(); return json({ok: true}); });
