"use client";

import Link from "next/link";
import { ArrowRight, CheckCircle2, LoaderCircle } from "lucide-react";
import { useState, type FormEvent } from "react";
import { api } from "@/lib/client";
import { AuthFrame } from "../auth-frame";

export function ResetPasswordForm({ token }: { token: string }) {
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [pending, setPending] = useState(false);
  const [complete, setComplete] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (password !== confirmation) {
      setError("Your passwords don’t match.");
      return;
    }
    setPending(true);
    setError("");
    try {
      await api("/api/auth/reset-password", {
        method: "POST",
        body: JSON.stringify({ token, password }),
      });
      setPassword("");
      setConfirmation("");
      setComplete(true);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Unable to reset your password. Please request a new link.",
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <AuthFrame>
      <span className="eyebrow">A fresh start</span>
      <h2>{complete ? "Password updated." : "Set a new password."}</h2>
      {complete ? (
        <>
          <div className="notice">
            <CheckCircle2 size={20} />
            <p>
              Your password has been changed. Sign in with your new password to
              continue.
            </p>
          </div>
          <Link className="button button-primary auth-submit" href="/login">
            Back to sign in <ArrowRight size={18} />
          </Link>
        </>
      ) : !token ? (
        <>
          <div className="notice notice-error" role="alert">
            This reset link is missing its token. Request a fresh reset link to
            continue.
          </div>
          <Link
            className="button button-primary auth-submit"
            href="/forgot-password"
          >
            Request a reset link <ArrowRight size={18} />
          </Link>
        </>
      ) : (
        <>
          <p className="muted">
            Use at least 12 characters, including letters and numbers.
          </p>
          <form className="form-stack" onSubmit={submit}>
            {error && (
              <div className="notice notice-error" role="alert">
                {error}
              </div>
            )}
            <label className="field">
              <span>New password</span>
              <input
                aria-label="New password"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Create a strong password"
                required
                minLength={12}
                maxLength={128}
                pattern="(?=.*[A-Za-z])(?=.*[0-9]).+"
              />
            </label>
            <label className="field">
              <span>Confirm password</span>
              <input
                aria-label="Confirm password"
                type="password"
                autoComplete="new-password"
                value={confirmation}
                onChange={(event) => setConfirmation(event.target.value)}
                placeholder="Enter it again"
                required
                minLength={12}
                maxLength={128}
                pattern="(?=.*[A-Za-z])(?=.*[0-9]).+"
              />
            </label>
            <button
              className="button button-primary auth-submit"
              type="submit"
              disabled={pending}
            >
              {pending && <LoaderCircle className="spin" size={18} />}
              {pending ? "Updating password…" : "Update password"}
              {!pending && <ArrowRight size={18} />}
            </button>
          </form>
          <p className="auth-switch">
            <Link href="/forgot-password">Need a new reset link?</Link>
          </p>
        </>
      )}
    </AuthFrame>
  );
}
