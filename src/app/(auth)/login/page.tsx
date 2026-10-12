"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Eye, EyeOff, LoaderCircle } from "lucide-react";
import { useState, type FormEvent } from "react";
import { api, type PublicUser } from "@/lib/client";
import { AuthFrame } from "../auth-frame";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    try {
      await api<{ user: PublicUser }>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      router.replace("/dashboard");
      router.refresh();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Unable to sign in. Please try again.",
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <AuthFrame>
      <span className="eyebrow">Welcome back</span>
      <h2>Pick up where you left off.</h2>
      <p className="muted">Sign in to your personal visa workspace.</p>
      <form className="form-stack" onSubmit={submit}>
        {error && (
          <div className="notice notice-error" role="alert">
            {error}
          </div>
        )}
        <label className="field">
          <span>Email</span>
          <input
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
            maxLength={254}
          />
        </label>
        <label className="field">
          <span className="field-label-row">
            Password <Link href="/forgot-password">Forgot password?</Link>
          </span>
          <span className="password-input">
            <input
              aria-label="Password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              placeholder="Enter your password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
            <button
              className="password-toggle"
              type="button"
              aria-label={showPassword ? "Hide password" : "Show password"}
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </span>
        </label>
        <button
          className="button button-primary auth-submit"
          type="submit"
          disabled={pending}
        >
          {pending ? <LoaderCircle className="spin" size={18} /> : null}
          {pending ? "Signing in…" : "Sign in"}
          {!pending && <ArrowRight size={18} />}
        </button>
      </form>
      <p className="auth-switch">
        New to Visa Compass? <Link href="/register">Create an account</Link>
      </p>
    </AuthFrame>
  );
}
