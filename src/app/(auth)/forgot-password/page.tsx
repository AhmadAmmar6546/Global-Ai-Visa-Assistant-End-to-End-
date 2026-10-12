"use client";

import Link from "next/link";
import { ArrowLeft, ArrowRight, LoaderCircle, Mail } from "lucide-react";
import { useState, type FormEvent } from "react";
import { api } from "@/lib/client";
import { AuthFrame } from "../auth-frame";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [pending, setPending] = useState(false);
  const [sent, setSent] = useState(false);
  const [resetUrl, setResetUrl] = useState<string>();
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    try {
      const result = await api<{ ok: boolean; developmentResetUrl?: string }>("/api/auth/forgot-password", { method: "POST", body: JSON.stringify({ email }) });
      setResetUrl(result.developmentResetUrl);
      setSent(true);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to request a reset. Please try again."); }
    finally { setPending(false); }
  }

  return <AuthFrame>
    <span className="eyebrow">Let’s get you back in</span>
    <h2>{sent ? "Check your inbox." : "Forgot your password?"}</h2>
    <p className="muted">{sent ? "If an account exists for that email, you’ll receive a password reset link when email delivery is configured." : "Enter your account email and we’ll help you reset it."}</p>
    {sent ? <>
      <div className="notice"><Mail size={20} /><p>Reset links expire after a short time. If your link expires, request a new one.</p></div>
      {resetUrl && <div className="notice"><strong>Development email preview</strong><p>Use this reset link in the current development environment.</p><Link className="text-link" href={resetUrl}>Reset my password <ArrowRight size={16} /></Link></div>}
      <button className="button button-secondary auth-submit" onClick={() => { setSent(false); setResetUrl(undefined); }}>Try another email</button>
    </> : <form className="form-stack" onSubmit={submit}>
      {error && <div className="notice notice-error" role="alert">{error}</div>}
      <label className="field"><span>Email</span><input type="email" autoComplete="email" placeholder="you@example.com" value={email} onChange={event => setEmail(event.target.value)} required maxLength={254} /></label>
      <button className="button button-primary auth-submit" type="submit" disabled={pending}>{pending && <LoaderCircle className="spin" size={18} />}{pending ? "Requesting reset…" : "Send reset link"}{!pending && <ArrowRight size={18} />}</button>
    </form>}
    <p className="auth-switch"><Link href="/login"><ArrowLeft size={15} /> Back to sign in</Link></p>
  </AuthFrame>;
}
