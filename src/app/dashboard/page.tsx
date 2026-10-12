"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  Plus,
  Compass,
  ClipboardList,
  CalendarDays,
  BookOpen,
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { CountryArt } from "@/components/country-art";
import {
  PageHeading,
  Notice,
  EmptyState,
  LoadingState,
  Badge,
} from "@/components/ui";
import {
  api,
  countryName,
  dateLabel,
  useAuth,
  type Application,
} from "@/lib/client";

export default function Dashboard() {
  const { user } = useAuth();
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    api<{ applications: Application[] }>("/api/applications")
      .then((r) => setApplications(r.applications))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);
  const remindersEnabled = user?.notificationConsent === true;
  const completed = applications
    .flatMap((a) => a.tasks || [])
    .filter((t) => t.completed).length;
  const upcoming = applications
    .flatMap((a) =>
      (a.tasks || [])
        .filter((t) => !t.completed && t.dueAt)
        .map((t) => ({ ...t, application: a })),
    )
    .sort(
      (a, b) => new Date(a.dueAt!).getTime() - new Date(b.dueAt!).getTime(),
    );
  return (
    <AppShell>
      <PageHeading
        eyebrow="YOUR NEXT CHAPTER"
        title={`A world of possibility${user ? `, ${user.name.split(" ")[0]}` : ""}.`}
        description="A little progress today. A clearer path tomorrow."
        action={
          <Link href="/applications/new" className="button button-primary">
            <Plus size={17} />
            New application
          </Link>
        }
      />
      <section className="dashboard-banner">
        <div>
          <span className="eyebrow">MAKE IT YOUR JOURNEY</span>
          <h2>
            Big dreams.
            <br />
            Small, confident steps.
          </h2>
          <p>
            Build a plan for studying abroad, with every source and next step in
            view.
          </p>
          <Link href="/applications/new" className="button button-light">
            Start a new chapter <ArrowRight size={16} />
          </Link>
        </div>
        <div className="banner-route">
          <Compass size={118} strokeWidth={0.65} />
          <span className="banner-dot one" />
          <span className="banner-dot two" />
          <span className="banner-dot three" />
          <span className="banner-route-label">YOUR PATH STARTS HERE</span>
        </div>
      </section>
      <div className="stats-grid">
        <div className="stat-card">
          <span className="stat-icon">
            <Compass size={20} />
          </span>
          <div>
            <span>Active applications</span>
            <strong>{loading ? "—" : applications.length}</strong>
          </div>
        </div>
        <div className="stat-card">
          <span className="stat-icon">
            <CalendarDays size={20} />
          </span>
          <div>
            <span>Upcoming reminders</span>
            <strong>
              {loading ? "—" : remindersEnabled ? upcoming.length : "Off"}
            </strong>
          </div>
        </div>
        <div className="stat-card">
          <span className="stat-icon">
            <ClipboardList size={20} />
          </span>
          <div>
            <span>Tasks completed</span>
            <strong>{loading ? "—" : completed}</strong>
          </div>
        </div>
      </div>
      {error && <Notice variant="error">{error}</Notice>}
      <div className="section-title-row">
        <div>
          <h2>Your applications</h2>
          <p>Each plan is a step toward somewhere new.</p>
        </div>
        <span className="subtle-label">
          {applications.length}{" "}
          {applications.length === 1 ? "APPLICATION" : "APPLICATIONS"}
        </span>
      </div>
      {loading ? (
        <LoadingState />
      ) : applications.length === 0 ? (
        <div className="panel">
          <EmptyState
            title="Your next chapter starts here"
            description="Create an application to organize your study plans, see the available requirements, and track your next steps."
            action={
              <Link className="button button-primary" href="/applications/new">
                <Plus size={16} />
                Create your first application
              </Link>
            }
          />
        </div>
      ) : (
        <div className="application-grid">
          {applications.map((app) => {
            const items = app.checklist || [];
            const done = items.filter((i) =>
              ["HAVE_IT", "REVIEWED"].includes(i.status),
            ).length;
            const status =
              app.verificationStatus ||
              (items.some((i) => i.rule?.isDemo) ? "DEMO" : "UNKNOWN");
            return (
              <Link
                className="application-card"
                href={`/applications/${app.id}`}
                key={app.id}
              >
                <div className="application-art">
                  <CountryArt code={app.destination} />
                  <Badge variant={status}>{status}</Badge>
                </div>
                <div className="application-card-body">
                  <div className="application-title">
                    <h3>{countryName(app.destination)}</h3>
                    <ArrowUpRight size={19} />
                  </div>
                  <p>
                    {app.visaType === "study" ? "Student visa" : app.visaType} ·{" "}
                    {app.jurisdiction}
                  </p>
                  <div className="progress-label">
                    <span>Your checklist</span>
                    <strong>
                      {done}/{items.length}
                    </strong>
                  </div>
                  <div className="progress-track">
                    <span
                      style={{
                        width: `${items.length ? (done / items.length) * 100 : 0}%`,
                      }}
                    />
                  </div>
                  <div className="application-card-footer">
                    <span>
                      <CalendarDays size={13} />
                      {app.intendedDate
                        ? dateLabel(app.intendedDate)
                        : "Arrival date not set"}
                    </span>
                    <span>
                      View plan <ArrowRight size={13} />
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
      <div className="dashboard-bottom">
        <div className="panel">
          <div className="section-title-row">
            <div>
              <h2>On your horizon</h2>
              <p>Reminders you’ve added to your plans.</p>
            </div>
            <CalendarDays size={21} />
          </div>
          {!remindersEnabled ? (
            <div className="quiet-empty">
              <CalendarDays size={25} />
              <p>In-app reminders are turned off.</p>
              <small>
                Enable them in Settings to see your dated tasks here.
              </small>
              <Link
                className="text-link"
                href="/settings"
                style={{ marginTop: 12 }}
              >
                Manage reminders <ArrowRight size={14} />
              </Link>
            </div>
          ) : upcoming.length ? (
            <div className="reminder-list">
              {upcoming.slice(0, 5).map((t) => (
                <Link
                  key={t.id}
                  href={`/applications/${t.application.id}`}
                  className="reminder-item"
                >
                  <span className="reminder-date">{dateLabel(t.dueAt)}</span>
                  <div>
                    <strong>{t.title}</strong>
                    <small>{countryName(t.application.destination)}</small>
                  </div>
                  <ArrowUpRight size={16} />
                </Link>
              ))}
            </div>
          ) : (
            <div className="quiet-empty">
              <CalendarDays size={25} />
              <p>No upcoming reminders yet.</p>
              <small>Add a task and due date inside an application.</small>
            </div>
          )}
        </div>
        <div className="source-promo">
          <span className="step-icon">
            <BookOpen size={24} />
          </span>
          <span className="eyebrow">CLARITY BEGINS WITH CONTEXT</span>
          <h2>
            Know where the
            <br />
            guidance comes from.
          </h2>
          <p>
            Read the source, understand the scope, and check the status before
            you act.
          </p>
          <Link href="/sources" className="text-link">
            Visit the source library <ArrowRight size={16} />
          </Link>
        </div>
      </div>
      <p className="self-report-note">
        Checklist progress is self-reported preparation, not official document
        verification or visa approval.
      </p>
    </AppShell>
  );
}
