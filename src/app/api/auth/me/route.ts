import { getUser, publicUser } from "@/lib/auth";
import { route, json } from "@/lib/http";
export const GET = route(async () => { const user = await getUser(); return json({user: user ? publicUser(user) : null}); });
