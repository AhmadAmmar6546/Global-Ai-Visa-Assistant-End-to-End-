import { AppError } from "@/lib/http";

export function appUrl() { return process.env.APP_URL || "http://localhost:3000"; }
export function emailConfigured() { return Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM); }
export async function deliverAuthEmail(email: string, url: string, kind: "verify" | "reset") {
  if (!emailConfigured()) {
    if (process.env.NODE_ENV === "production") throw new AppError(503, "Email delivery is not configured. Contact the administrator.");
    return false;
  }
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST", headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: process.env.EMAIL_FROM, to: [email], subject: kind === "verify" ? "Verify your Global AI Visa Assistant account" : "Reset your Global AI Visa Assistant password", text: `Use this link to ${kind === "verify" ? "verify your email" : "reset your password"}: ${url}\nIf you did not request this, ignore this email.` }),
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) throw new AppError(503, "Email could not be delivered. Please try again later.");
  return true;
}
