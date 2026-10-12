import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { db } from "@/lib/db";

export class AppError extends Error {
  constructor(public status: number, message: string) { super(message); }
}
export function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status, headers: { "Cache-Control": "no-store" } });
}
type Context<P extends Record<string, string>> = { params: Promise<P> };
export function route<P extends Record<string, string> = Record<string, string>>(handler: (request: Request, context: Context<P>) => Promise<Response>) {
  return async (request: Request, context: Context<P>) => {
    try {
      if (!["GET", "HEAD", "OPTIONS"].includes(request.method)) {
        const origin = request.headers.get("origin");
        const allowed = new Set([new URL(request.url).origin]);
        if (process.env.APP_URL) allowed.add(new URL(process.env.APP_URL).origin);
        if (origin ? !allowed.has(origin) : request.headers.get("x-requested-with") !== "visa-assistant") {
          throw new AppError(403, "Request origin is not allowed.");
        }
      }
      return await handler(request, context);
    } catch (error) {
      if (error instanceof AppError) return json({ error: error.message }, error.status);
      if (error instanceof z.ZodError) return json({ error: error.issues.map(i => `${i.path.join(".") || "Request"}: ${i.message}`).join("; ") }, 400);
      if (error instanceof SyntaxError) return json({ error: "Invalid JSON body." }, 400);
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return json({ error: "This record already exists." }, 409);
      console.error(JSON.stringify({ event: "api_error", kind: error instanceof Error ? error.name : "unknown" }));
      return json({ error: "The request could not be completed. Please try again." }, 500);
    }
  };
}
export async function body<T extends z.ZodType>(request: Request, schema: T): Promise<z.infer<T>> {
  const declared = Number(request.headers.get("content-length") || 0);
  if (declared > 65536) throw new AppError(413, "Request is too large.");
  const text = await request.text();
  if (Buffer.byteLength(text) > 65536) throw new AppError(413, "Request is too large.");
  return schema.parse(JSON.parse(text));
}
export async function audit(actorId: string | null, action: string, resourceId?: string, metadata: Prisma.InputJsonValue = {}) {
  await db.auditLog.create({ data: { actorId, action, resourceId, metadata } });
}
// Shared database counters work across processes. Serializable retries prevent races.
export async function rateLimit(key: string, limit: number, windowMs: number) {
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      await db.$transaction(async tx => {
        const now = new Date();
        const current = await tx.rateLimit.findUnique({ where: { key } });
        if (!current || current.resetsAt <= now) {
          await tx.rateLimit.upsert({ where: { key }, create: { key, count: 1, resetsAt: new Date(now.getTime() + windowMs) }, update: { count: 1, resetsAt: new Date(now.getTime() + windowMs) } });
        } else {
          if (current.count >= limit) throw new AppError(429, "Too many requests. Please try again later.");
          await tx.rateLimit.update({ where: { key }, data: { count: { increment: 1 } } });
        }
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
      return;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && ["P2034", "P2002"].includes(error.code) && attempt < 3) continue;
      throw error;
    }
  }
}
