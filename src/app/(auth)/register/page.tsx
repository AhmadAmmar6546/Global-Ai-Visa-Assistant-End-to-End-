"use client";

import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  LoaderCircle,
} from "lucide-react";
import { useState, type FormEvent } from "react";
import { api, type PublicUser } from "@/lib/client";
import { AuthFrame } from "../auth-frame";

export default function RegisterPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [created, setCreated] = useState(false);
  const [verificationUrl, setVerificationUrl] = useState<string>();
  const [verificationFailed, setVerificationFailed] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    try {
      const result = await api<{
        user: PublicUser;
        developmentVerificationUrl?: string;
        verificationDeliveryFailed?: boolean;
      }>("/api/auth/register", {
        method: "POST",
        body: JSON.stringify({ name, email, password }),
      });
      setVerificationUrl(result.developmentVerificationUrl);
      setVerificationFailed(result.verificationDeliveryFailed === true);
      setCreated(true);
      setPassword("");
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Unable to create your account. Please try again.",
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <AuthFrame>
      {created ? (
        <>
          <span className="auth-success-icon">
            <CheckCircle2 size={30} />
          </span>
          <span className="eyebrow">You’re all set</span>
          <h2>Your workspace is ready.</h2>
          <p className="muted">
            Welcome, {name || "traveler"}. Verify your email when you receive
            the verification link.
          </p>
          {verificationFailed && (
            <div className="notice notice-warning" role="alert">
              <strong>Your account was created.</strong>
              <p>
                The verification email could not be delivered. Open Settings to
                request another link.
              </p>
              <Link className="text-link" href="/settings">
                Open Settings <ArrowRight size={16} />
              </Link>
            </div>
          )}
          {verificationUrl && (
            <div className="notice">
              <strong>Development email preview</strong>
              <p>
                Email delivery is not configured here. Use the link below to
                verify your email in this development environment.
              </p>
              <Link className="text-link" href={verificationUrl}>
                Verify my email <ArrowRight size={16} />
              </Link>
            </div>
          )}
          <Link className="button button-primary auth-submit" href="/dashboard">
            Open my workspace <ArrowRight size={18} />
          </Link>
        </>
      ) : (
        <>
          <span className="eyebrow">Your journey starts here</span>
          <h2>
            A little clarity.
            <br />A lot of possibility.
          </h2>
          <p className="muted">Create your account and take the first step.</p>
          <form className="form-stack" onSubmit={submit}>
            {error && (
              <div className="notice notice-error" role="alert">
                {error}
              </div>
            )}
            <label className="field">
              <span>Name</span>
              <input
                autoComplete="name"
                placeholder="Your full name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                required
                minLength={2}
                maxLength={80}
              />
            </label>
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
              <span>Password</span>
              <span className="password-input">
                <input
                  aria-label="Password"
                  aria-describedby="register-password-help"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  placeholder="Create a strong password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                  minLength={12}
                  maxLength={128}
                  pattern="(?=.*[A-Za-z])(?=.*[0-9]).+"
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
              <small id="register-password-help">
                Use at least 12 characters, including letters and numbers.
              </small>
            </label>
            <p className="form-note">
              Your account starts with AI processing turned off. You can choose
              to enable it later in Settings.
            </p>
            <button
              className="button button-primary auth-submit"
              type="submit"
              disabled={pending}
            >
              {pending && <LoaderCircle className="spin" size={18} />}
              {pending ? "Creating your account…" : "Create account"}
              {!pending && <ArrowRight size={18} />}
            </button>
          </form>
          <p className="auth-switch">
            Already have an account? <Link href="/login">Sign in</Link>
          </p>
        </>
      )}
    </AuthFrame>
  );
}
