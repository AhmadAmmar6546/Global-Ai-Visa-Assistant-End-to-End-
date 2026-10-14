import { AppError } from "@/lib/http";
import { resolveAppUrl } from "@/lib/app-url";

export function appUrl() { return resolveAppUrl(); }
export function emailConfigured() { return Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM); }
export async function deliverAuthEmail(email: string, url: string, kind: "verify" | "reset") {
  if (!emailConfigured()) {
    if (process.env.NODE_ENV === "production") throw new AppError(503, "Email delivery is not configured. Contact the administrator.");
    return false;
  }
  let response: Response;
  try {
    response = await fetch("https://api.resend.com/emails", {
      method: "POST", headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: process.env.EMAIL_FROM, to: [email], subject: kind === "verify" ? "Verify your Global AI Visa Assistant account" : "Reset your Global AI Visa Assistant password", text: `Use this link to ${kind === "verify" ? "verify your email" : "reset your password"}: ${url}\nIf you did not request this, ignore this email.` }),
      signal: AbortSignal.timeout(10000),
    });
  } catch (error) {
    console.error(JSON.stringify({ event: "auth_email_failed", kind, reason: error instanceof Error && error.name === "TimeoutError" ? "timeout" : "network_error" }));
    throw new AppError(503, "Email could not be delivered. Please try again later.");
  }
  if (!response.ok) {
    let reason = "provider_error";
    // Log only recognised error names, never provider messages, recipients or links.
    try {
      const failure: unknown = await response.json();
      const name = typeof failure === "object" && failure !== null && "name" in failure ? failure.name : undefined;
      if (typeof name === "string" && ["validation_error", "restricted_api_key", "invalid_api_key", "missing_api_key", "rate_limit_exceeded"].includes(name)) reason = name;
    } catch { /* Non-JSON provider errors keep the same safe public response. */ }
    console.error(JSON.stringify({ event: "auth_email_failed", kind, providerStatus: response.status, reason }));
    throw new AppError(503, "Email could not be delivered. Please try again later.");
  }
  return true;
}
