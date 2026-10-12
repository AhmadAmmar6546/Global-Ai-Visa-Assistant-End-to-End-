import "dotenv/config";
import { db } from "../src/lib/db";
const email = process.argv[2]?.toLowerCase();
if (!email || !email.includes("@")) throw new Error("Usage: npm run admin:grant -- reviewer@example.com");
async function main() {
 try {
  const user = await db.user.update({where: {email}, data: {role: "ADMIN"}});
  await db.auditLog.create({data: {actorId: user.id, action: "admin.role_granted_cli", resourceId: user.id}});
  console.log("Administrator role granted to the existing account.");
 } finally { await db.$disconnect(); }
}
main().catch(() => { console.error("Administrator promotion failed. Confirm the account and database configuration."); process.exitCode = 1; });
