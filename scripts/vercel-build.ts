import "dotenv/config";
import { spawnSync } from "node:child_process";
import { resolveAppUrl } from "../src/lib/app-url";

const production = process.env.VERCEL_ENV === "production";
const required = production
  ? ["DATABASE_URL", "RESEND_API_KEY", "EMAIL_FROM"]
  : ["DATABASE_URL"];
const missing = required.filter(name => !process.env[name]?.trim());
if (missing.length) {
  console.error(`Missing deployment configuration: ${missing.join(", ")}. Set these securely in the Vercel project settings.`);
  process.exit(1);
}
if (production) {
  try { resolveAppUrl({ ...process.env, NODE_ENV: "production" }); }
  catch (error) {
    console.error(error instanceof Error ? error.message : "Invalid public application origin.");
    process.exit(1);
  }
}

function run(script: string, environment: NodeJS.ProcessEnv = process.env) {
  const result = spawnSync("npm", ["run", script], { stdio: "inherit", env: environment });
  if (result.error || result.status !== 0) process.exit(result.status || 1);
}

run("db:generate");
if (production) {
  // Use the same database's direct endpoint for session-based migration locks.
  // Never log or write the connection string into deployment artifacts.
  const migrationUrl = process.env.MIGRATION_DATABASE_URL || process.env.POSTGRES_URL_NON_POOLING || process.env.DATABASE_URL;
  const migrationEnvironment = { ...process.env, DATABASE_URL: migrationUrl };
  run("db:migrate", migrationEnvironment);
  run("db:seed", migrationEnvironment);
}
run("build");
