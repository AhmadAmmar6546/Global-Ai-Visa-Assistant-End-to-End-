"use client";

import Link from "next/link";
import { ArrowRight, CheckCircle2, LoaderCircle } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/client";
import { AuthFrame } from "../auth-frame";

export function VerifyEmail({ token }: { token: string }) {
  const [status, setStatus] = useState<"loading" | "success" | "error">(token ? "loading" : "error");
  const [error, setError] = useState(token ? "" : "This verification link is missing its token.");
  const request = useRef<{ token: string; promise: Promise<unknown> } | null>(null);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    if (request.current?.token !== token) request.current = { token, promise: api(`/api/auth/verify-email?token=${encodeURIComponent(token)}`) };
    request.current.promise.then(() => { if (!cancelled) setStatus("success"); }).catch(cause => {
      if (!cancelled) { setStatus("error"); setError(cause instanceof Error ? cause.message : "Unable to verify your email."); }
    });
    return () => { cancelled = true; };
  }, [token]);

  return <AuthFrame>
    <span className="eyebrow">One last check</span>
    <h2>{status === "loading" ? "Verifying your email…" : status === "success" ? "Email verified." : "Let’s check that link."}</h2>
    {status === "loading" ? <div className="notice" role="status"><LoaderCircle className="spin" size={22} /><p>We’re checking your verification link.</p></div> : status === "success" ? <><div className="notice"><CheckCircle2 size={22} /><p>Your email address is confirmed. Your visa workspace is ready when you are.</p></div><Link className="button button-primary auth-submit" href="/dashboard">Go to my workspace <ArrowRight size={18} /></Link></> : <><div className="notice notice-error" role="alert">{error}</div><p className="muted">If you have already verified your email, you can sign in and continue.</p><Link className="button button-primary auth-submit" href="/login">Back to sign in <ArrowRight size={18} /></Link></>}
  </AuthFrame>;
}
