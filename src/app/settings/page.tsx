"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Bell,
  CheckCircle2,
  Download,
  LoaderCircle,
  ShieldCheck,
  Sparkles,
  Trash2,
  UserRound,
} from "lucide-react";
import { useState, type FormEvent } from "react";
import { AppShell } from "@/components/app-shell";
import { LoadingState } from "@/components/ui";
import { api, dateLabel, useAuth, type PublicUser } from "@/lib/client";

export default function SettingsPage() {
  const router = useRouter();
  const { user, loading, error: authError, refresh } = useAuth();
  const [nameDraft, setName] = useState<string | null>(null);
  const [aiConsentDraft, setAiConsent] = useState<boolean | null>(null);
  const [notificationConsentDraft, setNotificationConsent] = useState<
    boolean | null
  >(null);
  const name = nameDraft ?? user?.name ?? "";
  const aiConsent = aiConsentDraft ?? user?.aiConsent ?? false;
  const notificationConsent =
    notificationConsentDraft ?? user?.notificationConsent ?? false;
  const [profilePending, setProfilePending] = useState(false);
  const [preferencesPending, setPreferencesPending] = useState(false);
  const [exportPending, setExportPending] = useState(false);
  const [deletePending, setDeletePending] = useState(false);
  const [profileMessage, setProfileMessage] = useState("");
  const [profileError, setProfileError] = useState("");
  const [preferencesMessage, setPreferencesMessage] = useState("");
  const [preferencesError, setPreferencesError] = useState("");
  const [dataMessage, setDataMessage] = useState("");
  const [dataError, setDataError] = useState("");
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [deleteConfirmed, setDeleteConfirmed] = useState(false);
  const [verificationPending, setVerificationPending] = useState(false);
  const [verificationMessage, setVerificationMessage] = useState("");
  const [verificationError, setVerificationError] = useState("");
  const [verificationUrl, setVerificationUrl] = useState<string>();

  async function resendVerification() {
    setVerificationPending(true);
    setVerificationMessage("");
    setVerificationError("");
    setVerificationUrl(undefined);
    try {
      const result = await api<{
        ok: boolean;
        developmentVerificationUrl?: string;
      }>("/api/auth/resend-verification", {
        method: "POST",
        body: JSON.stringify({}),
      });
      setVerificationUrl(result.developmentVerificationUrl);
      setVerificationMessage(
        result.developmentVerificationUrl
          ? "Your development verification link is ready."
          : "A verification link has been sent. Check your inbox.",
      );
    } catch (cause) {
      setVerificationError(
        cause instanceof Error
          ? cause.message
          : "Unable to send a verification link.",
      );
    } finally {
      setVerificationPending(false);
    }
  }

  async function updateProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setProfilePending(true);
    setProfileMessage("");
    setProfileError("");
    try {
      await api<{ user: PublicUser }>("/api/account", {
        method: "PATCH",
        body: JSON.stringify({ name }),
      });
      await refresh();
      setName(null);
      window.dispatchEvent(new Event("visa-auth-changed"));
      setProfileMessage("Your profile has been saved.");
    } catch (cause) {
      setProfileError(
        cause instanceof Error ? cause.message : "Unable to save your profile.",
      );
    } finally {
      setProfilePending(false);
    }
  }

  async function updatePreferences(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPreferencesPending(true);
    setPreferencesMessage("");
    setPreferencesError("");
    try {
      await api<{ user: PublicUser }>("/api/account", {
        method: "PATCH",
        body: JSON.stringify({ aiConsent, notificationConsent }),
      });
      await refresh();
      setAiConsent(null);
      setNotificationConsent(null);
      window.dispatchEvent(new Event("visa-auth-changed"));
      setPreferencesMessage("Your preferences have been saved.");
    } catch (cause) {
      setPreferencesError(
        cause instanceof Error
          ? cause.message
          : "Unable to save your preferences.",
      );
    } finally {
      setPreferencesPending(false);
    }
  }

  async function exportData() {
    setExportPending(true);
    setDataMessage("");
    setDataError("");
    try {
      const data = await api<unknown>("/api/account/export");
      const url = URL.createObjectURL(
        new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }),
      );
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `visa-compass-export-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
      setDataMessage(
        "Your data export has been downloaded. Keep it somewhere private.",
      );
    } catch (cause) {
      setDataError(
        cause instanceof Error ? cause.message : "Unable to export your data.",
      );
    } finally {
      setExportPending(false);
    }
  }

  async function deleteAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!deleteConfirmed) return;
    setDeletePending(true);
    setDataMessage("");
    setDataError("");
    try {
      await api("/api/account", {
        method: "DELETE",
        body: JSON.stringify({ password }),
      });
      setPassword("");
      router.replace("/login");
      router.refresh();
    } catch (cause) {
      setDataError(
        cause instanceof Error
          ? cause.message
          : "Unable to delete your account.",
      );
    } finally {
      setDeletePending(false);
    }
  }

  return (
    <AppShell>
      <div className="page-heading">
        <div>
          <span className="eyebrow">Make it yours</span>
          <h1>Account & preferences</h1>
          <p>Your details, your choices, your data.</p>
        </div>
      </div>
      {loading ? (
        <LoadingState label="Loading your account…" />
      ) : authError ? (
        <div className="notice notice-error" role="alert">
          {authError}
        </div>
      ) : (
        user && (
          <div className="settings-grid">
            <section className="card settings-card">
              <div className="settings-title">
                <span className="settings-icon">
                  <UserRound size={21} />
                </span>
                <div>
                  <h2>Your profile</h2>
                  <p className="muted">How you appear in your workspace.</p>
                </div>
              </div>
              <form className="form-stack" onSubmit={updateProfile}>
                {profileError && (
                  <div className="notice notice-error" role="alert">
                    {profileError}
                  </div>
                )}
                {profileMessage && (
                  <div className="notice notice-success" role="status">
                    <CheckCircle2 size={17} />
                    {profileMessage}
                  </div>
                )}
                <label className="field">
                  <span>Name</span>
                  <input
                    autoComplete="name"
                    value={name}
                    onChange={(event) => {
                      setName(event.target.value);
                      setProfileMessage("");
                    }}
                    required
                    minLength={2}
                    maxLength={80}
                  />
                </label>
                <label className="field">
                  <span>Email</span>
                  <input
                    type="email"
                    value={user.email}
                    readOnly
                    aria-describedby="email-status"
                  />
                </label>
                <p className="form-note" id="email-status">
                  {user.emailVerifiedAt ? (
                    <>
                      <ShieldCheck size={15} /> Verified on{" "}
                      {dateLabel(user.emailVerifiedAt)}
                    </>
                  ) : (
                    "Email verification is pending."
                  )}
                </p>
                {!user.emailVerifiedAt && (
                  <div className="verification-resend">
                    {verificationError && (
                      <div className="notice notice-error" role="alert">
                        {verificationError}
                      </div>
                    )}
                    {verificationMessage && (
                      <div className="notice notice-success" role="status">
                        {verificationMessage}
                      </div>
                    )}
                    {verificationUrl && (
                      <Link className="text-link" href={verificationUrl}>
                        Verify my email in development
                      </Link>
                    )}
                    <button
                      className="button button-secondary"
                      type="button"
                      disabled={verificationPending}
                      onClick={resendVerification}
                    >
                      {verificationPending && (
                        <LoaderCircle className="spin" size={16} />
                      )}{" "}
                      {verificationPending
                        ? "Sending…"
                        : "Resend verification email"}
                    </button>
                  </div>
                )}
                <div className="form-actions">
                  <button
                    className="button button-primary"
                    type="submit"
                    disabled={profilePending || name.trim() === user.name}
                  >
                    {profilePending && (
                      <LoaderCircle className="spin" size={17} />
                    )}
                    {profilePending ? "Saving…" : "Save profile"}
                  </button>
                </div>
              </form>
            </section>
            <section className="card settings-card">
              <div className="settings-title">
                <span className="settings-icon">
                  <ShieldCheck size={21} />
                </span>
                <div>
                  <h2>Privacy & reminders</h2>
                  <p className="muted">
                    Stay in control of how your workspace works.
                  </p>
                </div>
              </div>
              <form className="form-stack" onSubmit={updatePreferences}>
                {preferencesError && (
                  <div className="notice notice-error" role="alert">
                    {preferencesError}
                  </div>
                )}
                {preferencesMessage && (
                  <div className="notice notice-success" role="status">
                    <CheckCircle2 size={17} />
                    {preferencesMessage}
                  </div>
                )}
                <label className="preference-row">
                  <span className="preference-icon">
                    <Sparkles size={20} />
                  </span>
                  <span>
                    <strong>Allow AI provider processing</strong>
                    <small id="ai-consent-help">
                      Permit your messages and application context to be sent to
                      the configured AI provider. Local guidance stays available
                      with this turned off.
                    </small>
                  </span>
                  <input
                    type="checkbox"
                    aria-label="Allow AI provider processing"
                    aria-describedby="ai-consent-help"
                    checked={aiConsent}
                    onChange={(event) => {
                      setAiConsent(event.target.checked);
                      setPreferencesMessage("");
                    }}
                  />
                </label>
                <label className="preference-row">
                  <span className="preference-icon">
                    <Bell size={20} />
                  </span>
                  <span>
                    <strong>Show in-app reminders</strong>
                    <small id="notification-consent-help">
                      Display reminders for your saved tasks in your workspace.
                      This does not enable email or browser notifications.
                    </small>
                  </span>
                  <input
                    type="checkbox"
                    aria-label="Show in-app reminders"
                    aria-describedby="notification-consent-help"
                    checked={notificationConsent}
                    onChange={(event) => {
                      setNotificationConsent(event.target.checked);
                      setPreferencesMessage("");
                    }}
                  />
                </label>
                <div className="form-actions">
                  <button
                    className="button button-primary"
                    type="submit"
                    disabled={
                      preferencesPending ||
                      (aiConsent === user.aiConsent &&
                        notificationConsent === user.notificationConsent)
                    }
                  >
                    {preferencesPending && (
                      <LoaderCircle className="spin" size={17} />
                    )}
                    {preferencesPending ? "Saving…" : "Save preferences"}
                  </button>
                </div>
              </form>
            </section>
            <section className="card settings-card settings-data">
              <div className="settings-title">
                <span className="settings-icon">
                  <Download size={21} />
                </span>
                <div>
                  <h2>Your data</h2>
                  <p className="muted">
                    Take a copy of your workspace, or close your account.
                  </p>
                </div>
              </div>
              {dataError && (
                <div className="notice notice-error" role="alert">
                  {dataError}
                </div>
              )}
              {dataMessage && (
                <div className="notice notice-success" role="status">
                  {dataMessage}
                </div>
              )}
              <div className="data-action">
                <div>
                  <h3>Export your account</h3>
                  <p className="muted">
                    Download your profile, applications, checklists, tasks, and
                    conversations as a JSON file.
                  </p>
                </div>
                <button
                  className="button button-secondary"
                  onClick={exportData}
                  disabled={exportPending || deletePending}
                >
                  {exportPending ? (
                    <LoaderCircle className="spin" size={17} />
                  ) : (
                    <Download size={17} />
                  )}
                  {exportPending ? "Preparing…" : "Export my data"}
                </button>
              </div>
              <div className="data-action danger-action">
                <div>
                  <h3>Delete your account</h3>
                  <p className="muted">
                    Permanently remove your account and personal workspace data.
                    This cannot be undone.
                  </p>
                </div>
                {!deleteOpen && (
                  <button
                    className="button button-danger-outline"
                    onClick={() => {
                      setDeleteOpen(true);
                      setDataError("");
                      setDataMessage("");
                    }}
                  >
                    <Trash2 size={17} />
                    Delete account
                  </button>
                )}
              </div>
              {deleteOpen && (
                <form
                  className="delete-confirmation form-stack"
                  onSubmit={deleteAccount}
                >
                  <p>
                    <strong>Confirm permanent deletion</strong>
                    <br />
                    <span className="muted">
                      Export your data first if you want to keep a copy.
                    </span>
                  </p>
                  <label className="field">
                    <span>Current password</span>
                    <input
                      aria-label="Current password"
                      type="password"
                      autoComplete="current-password"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      required
                      maxLength={128}
                      placeholder="Enter your password to confirm"
                    />
                  </label>
                  <label className="checkbox-row">
                    <input
                      type="checkbox"
                      checked={deleteConfirmed}
                      onChange={(event) =>
                        setDeleteConfirmed(event.target.checked)
                      }
                      required
                    />
                    <span>
                      I understand that my account and personal data will be
                      permanently deleted.
                    </span>
                  </label>
                  <div className="form-actions">
                    <button
                      className="button button-danger"
                      type="submit"
                      disabled={!deleteConfirmed || !password || deletePending}
                    >
                      {deletePending ? (
                        <LoaderCircle className="spin" size={17} />
                      ) : (
                        <Trash2 size={17} />
                      )}
                      {deletePending
                        ? "Deleting…"
                        : "Permanently delete account"}
                    </button>
                    <button
                      className="button button-secondary"
                      type="button"
                      disabled={deletePending}
                      onClick={() => {
                        setDeleteOpen(false);
                        setPassword("");
                        setDeleteConfirmed(false);
                        setDataError("");
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}
            </section>
          </div>
        )
      )}
    </AppShell>
  );
}
