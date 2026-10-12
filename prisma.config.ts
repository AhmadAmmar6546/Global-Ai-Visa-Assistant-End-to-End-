import "dotenv/config";
import { defineConfig, env } from "prisma/config";
import { PrismaPg } from "@prisma/adapter-pg";

// The npm-distributed JS/WASM engines retain npm's integrity verification and
// avoid platform-specific native engine downloads in restricted cloud setups.
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations", seed: "tsx prisma/seed.ts" },
  experimental: { adapter: true },
  engine: "js",
  adapter: async () => new PrismaPg({ connectionString: env("DATABASE_URL") }),
});
