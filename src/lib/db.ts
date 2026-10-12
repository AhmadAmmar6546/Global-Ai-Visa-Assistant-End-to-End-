import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
const globalDb = globalThis as unknown as { visaDb?: PrismaClient };
export const db = globalDb.visaDb ?? new PrismaClient({adapter: new PrismaPg({connectionString: process.env.DATABASE_URL})});
if (process.env.NODE_ENV !== "production") globalDb.visaDb = db;
