import { randomBytes, scrypt as scryptCallback, timingSafeEqual, createHash } from "node:crypto";
import { promisify } from "node:util";
import { cookies } from "next/headers";
import type { User } from "@prisma/client";
import { z } from "zod";
import { db } from "@/lib/db";
import { AppError } from "@/lib/http";

const scrypt = promisify(scryptCallback);
const COOKIE = "visa_session";
export const passwordSchema = z.string().min(12).max(128).regex(/[a-zA-Z]/, "Include a letter").regex(/[0-9]/, "Include a number");
export const emailSchema = z.email().max(254).transform(value => value.toLowerCase().trim());
export function hashToken(token: string) { return createHash("sha256").update(token).digest("hex"); }
export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const key = await scrypt(password, salt, 64) as Buffer;
  return `${salt}:${key.toString("hex")}`;
}
export async function checkPassword(password: string, stored: string) {
  const [salt, digest] = stored.split(":");
  if (!salt || !digest) return false;
  const expected = Buffer.from(digest, "hex");
  const actual = await scrypt(password, salt, 64) as Buffer;
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}
export function publicUser(user: User) {
  return { id: user.id, name: user.name, email: user.email, role: user.role, emailVerifiedAt: user.emailVerifiedAt, aiConsent: user.aiConsent, notificationConsent: user.notificationConsent };
}
export async function createSession(userId: string) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  await db.session.create({ data: { userId, tokenHash: hashToken(token), expiresAt } });
  (await cookies()).set(COOKIE, token, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", expires: expiresAt });
}
export async function destroySession() {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (token) await db.session.deleteMany({ where: { tokenHash: hashToken(token) } });
  jar.delete(COOKIE);
}
export async function getUser(): Promise<User | null> {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  const session = await db.session.findUnique({ where: { tokenHash: hashToken(token) }, include: { user: true } });
  if (!session || session.expiresAt <= new Date()) return null;
  return session.user;
}
export async function requireUser(options: { allowUnverified?: boolean } = {}) {
  const user = await getUser();
  if (!user) throw new AppError(401, "Sign in to continue.");
  if (process.env.NODE_ENV === "production" && !user.emailVerifiedAt && !options.allowUnverified) throw new AppError(403, "Verify your email before continuing.");
  return user;
}
export async function requireAdmin() {
  const user = await requireUser();
  if (user.role !== "ADMIN") throw new AppError(403, "Administrator access is required.");
  return user;
}
export async function createAuthToken(userId: string, kind: "VERIFY_EMAIL" | "RESET_PASSWORD") {
  const token = randomBytes(32).toString("base64url");
  await db.$transaction([
    db.authToken.deleteMany({ where: { userId, kind } }),
    db.authToken.create({ data: { userId, kind, tokenHash: hashToken(token), expiresAt: new Date(Date.now() + (kind === "VERIFY_EMAIL" ? 24 : 1) * 60 * 60 * 1000) } }),
  ]);
  return token;
}
