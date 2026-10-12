"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  ArrowLeft,
  ArrowUpRight,
  CalendarDays,
  Check,
  ClipboardList,
  MessageSquare,
  Plus,
  Send,
  Sparkles,
  Trash2,
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { api, countryName, dateLabel, useAuth } from "@/lib/client";

type Verification = "VERIFIED" | "DEMO" | "UNKNOWN";
type ChecklistStatus =
  | "NOT_STARTED"
  | "HAVE_IT"
  | "NEED_HELP"
  | "NOT_APPLICABLE"
  | "REVIEWED";
type Source = {
  id: string;
  title: string;
  url: string;
  official: boolean;
  fetchedAt?: string | null;
};
type ChecklistItem = {
  id: string;
  status: ChecklistStatus;
  notes: string;
  reason: string;
  rule: {
    id: string;
    title: string;
    description: string;
    isDemo: boolean;
    verifiedAt?: string | null;
    validUntil?: string | null;
    source: Source;
  };
};
type Task = {
  id: string;
  title: string;
  dueAt: string | null;
  completed: boolean;
};
type Citation = {
  title: string;
  url: string;
  verificationStatus?: Verification;
  verifiedAt?: string | null;
  validUntil?: string | null;
};
type ChatMessage = {
  id: string;
  role: string;
  content: string;
  citations: Citation[];
};
type Application = {
  id: string;
  destination: string;
  nationality: string;
  residence: string;
  jurisdiction: string;
  visaType: string;
  purpose: string;
  intendedDate: string | null;
  status: string;
  profileVersion: number;
  tasks: Task[];
  messages: ChatMessage[];
  checklist: ChecklistItem[];
};
type Requirements = {
  verificationStatus: Verification;
  items: ChecklistItem[];
  sources: Source[];
  notice: string;
};
type Profile = {
  destination: string;
  nationality: string;
  residence: string;
  jurisdiction: string;
  purpose: string;
  intendedDate: string;
};
type PlanTask = {
  title: string;
  description: string;
  priority: string;
  sourceUrl?: string;
};
type Tab = "overview" | "checklist" | "assistant" | "interview";

const statuses: { value: ChecklistStatus; label: string }[] = [
  { value: "NOT_STARTED", label: "Not started" },
  { value: "HAVE_IT", label: "I have it" },
  { value: "NEED_HELP", label: "Need help" },
  { value: "NOT_APPLICABLE", label: "Not applicable" },
  { value: "REVIEWED", label: "I reviewed it" },
];

function errorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : "Something went wrong. Please try again.";
}

function safeLink(url: string) {
  try {
    const parsed = new URL(url);
    return ["https:", "http:"].includes(parsed.protocol)
      ? parsed.href
      : undefined;
  } catch {
    return undefined;
  }
}

function fetchApplicationData(applicationId: string) {
  return Promise.all([
    api<{ application: Application }>(`/api/applications/${applicationId}`),
    api<Requirements>(`/api/applications/${applicationId}/requirements`),
  ]);
}

function editableProfile(app: Application): Profile {
  return {
    destination: app.destination,
    nationality: app.nationality,
    residence: app.residence,
    jurisdiction: app.jurisdiction,
    purpose: app.purpose,
    intendedDate: app.intendedDate?.slice(0, 10) ?? "",
  };
}

function VerificationBadge({ status }: { status: Verification }) {
  return (
    <span
      className={`badge ${status === "VERIFIED" ? "badge-success" : "badge-warning"}`}
    >
      {status === "VERIFIED"
        ? "Reviewed sources"
        : status === "DEMO"
          ? "DEMO · sample rules"
          : "UNKNOWN · no matching rules"}
    </span>
  );
}

function ChecklistCard({
  item,
  onSave,
}: {
  item: ChecklistItem;
  onSave: (
    item: ChecklistItem,
    values: { status: ChecklistStatus; notes: string; reason: string },
  ) => Promise<ChecklistItem>;
}) {
  const [status, setStatus] = useState(item.status);
  const [notes, setNotes] = useState(item.notes);
  const [reason, setReason] = useState(item.reason);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const changed =
    status !== item.status || notes !== item.notes || reason !== item.reason;
  async function save(event: FormEvent) {
    event.preventDefault();
    setError("");
    setSaved(false);
    if (status === "NOT_APPLICABLE" && !reason.trim()) {
      setError("Add a reason before marking this requirement not applicable.");
      return;
    }
    setSaving(true);
    try {
      const savedItem = await onSave(item, { status, notes, reason });
      setStatus(savedItem.status);
      setNotes(savedItem.notes);
      setReason(savedItem.reason);
      setSaved(true);
    } catch (failure) {
      setError(errorMessage(failure));
    } finally {
      setSaving(false);
    }
  }
  return (
    <article className="panel checklist-card">
      <div className="detail-card-heading">
        <div>
          <h3>{item.rule.title}</h3>
          <p className="muted">{item.rule.description}</p>
        </div>
        <span className="badge">
          {statuses.find((option) => option.value === item.status)?.label}
        </span>
      </div>
      <div className="detail-source-line">
        <VerificationBadge status={item.rule.isDemo ? "DEMO" : "VERIFIED"} />
        {safeLink(item.rule.source.url) && (
          <a
            href={safeLink(item.rule.source.url)}
            target="_blank"
            rel="noopener noreferrer"
          >
            {item.rule.source.title}
            <ArrowUpRight size={14} aria-hidden="true" />
          </a>
        )}
      </div>
      {!item.rule.isDemo && item.rule.verifiedAt && (
        <p className="muted small">
          Source reviewed {dateLabel(item.rule.verifiedAt)}
          {item.rule.validUntil
            ? ` · Review expires ${dateLabel(item.rule.validUntil)}`
            : ""}
        </p>
      )}
      <form onSubmit={save} className="form-stack" style={{ marginTop: 20 }}>
        <div className="detail-form-grid">
          <label className="field">
            <span>Your progress</span>
            <select
              aria-label={`Progress for ${item.rule.title}`}
              value={status}
              onChange={(event) => {
                setStatus(event.target.value as ChecklistStatus);
                setSaved(false);
              }}
            >
              {statuses.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Personal notes</span>
            <input
              aria-label={`Notes for ${item.rule.title}`}
              value={notes}
              maxLength={3000}
              onChange={(event) => {
                setNotes(event.target.value);
                setSaved(false);
              }}
              placeholder="For example, waiting for a certified copy"
            />
          </label>
        </div>
        {status === "NOT_APPLICABLE" && (
          <label className="field">
            <span>Why does this not apply?</span>
            <textarea
              required
              value={reason}
              maxLength={1000}
              onChange={(event) => {
                setReason(event.target.value);
                setSaved(false);
              }}
              placeholder="Explain your reason. This is your own assessment."
              rows={2}
            />
          </label>
        )}
        {error && (
          <p className="notice notice-error" role="alert">
            {error}
          </p>
        )}
        <div className="detail-actions">
          <button
            className="button button-secondary"
            type="submit"
            disabled={saving || !changed}
          >
            {saving ? "Saving…" : "Save progress"}
          </button>
          {saved && (
            <span className="muted small" role="status">
              Progress saved.
            </span>
          )}
        </div>
      </form>
    </article>
  );
}

export default function ApplicationPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { user, loading: authLoading, error: authError } = useAuth();
  const applicationId = params.id;
  const [application, setApplication] = useState<Application | null>(null);
  const [requirements, setRequirements] = useState<Requirements | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [tab, setTab] = useState<Tab>("overview");
  const [profileSaving, setProfileSaving] = useState(false);
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDue, setTaskDue] = useState("");
  const [taskBusy, setTaskBusy] = useState<string | null>(null);
  const [plan, setPlan] = useState<{
    tasks: PlanTask[];
    notice: string;
  } | null>(null);
  const [planLoading, setPlanLoading] = useState(false);
  const [addedPlanTasks, setAddedPlanTasks] = useState<number[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatSending, setChatSending] = useState(false);
  const [chatMode, setChatMode] = useState<"local" | "provider" | null>(null);
  const [questions, setQuestions] = useState<string[]>([]);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [feedback, setFeedback] = useState("");
  const [interviewBusy, setInterviewBusy] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const chatEnd = useRef<HTMLDivElement>(null);

  async function load() {
    try {
      const [appResult, requirementResult] =
        await fetchApplicationData(applicationId);
      const app = appResult.application;
      setApplication(app);
      setRequirements(requirementResult);
      setError("");
      setProfile(editableProfile(app));
      return true;
    } catch (failure) {
      setError(errorMessage(failure));
      return false;
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      if (!authError) router.replace("/login");
      return;
    }
    let active = true;
    void fetchApplicationData(applicationId)
      .then(([appResult, requirementResult]) => {
        if (!active) return;
        setApplication(appResult.application);
        setRequirements(requirementResult);
        setProfile(editableProfile(appResult.application));
        setError("");
      })
      .catch((failure: unknown) => {
        if (!active) return;
        setApplication(null);
        setError(errorMessage(failure));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [applicationId, user, authLoading, authError, router]);
  useEffect(() => {
    if (tab === "assistant")
      chatEnd.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [application?.messages.length, tab]);

  async function saveProfile(event: FormEvent) {
    event.preventDefault();
    if (!profile) return;
    setProfileSaving(true);
    setError("");
    setSuccess("");
    try {
      await api(`/api/applications/${applicationId}`, {
        method: "PATCH",
        body: JSON.stringify({
          ...profile,
          intendedDate: profile.intendedDate || null,
        }),
      });
      const reloaded = await load();
      setPlan(null);
      setAddedPlanTasks([]);
      if (reloaded)
        setSuccess(
          "Profile saved. Your checklist has been checked against the updated profile.",
        );
    } catch (failure) {
      setError(errorMessage(failure));
    } finally {
      setProfileSaving(false);
    }
  }

  async function saveChecklist(
    item: ChecklistItem,
    values: { status: ChecklistStatus; notes: string; reason: string },
  ) {
    const result = await api<{ item: ChecklistItem }>(
      `/api/checklist/${item.id}`,
      { method: "PATCH", body: JSON.stringify(values) },
    );
    setRequirements((current) =>
      current
        ? {
            ...current,
            items: current.items.map((existing) =>
              existing.id === item.id
                ? { ...existing, ...result.item, rule: existing.rule }
                : existing,
            ),
          }
        : current,
    );
    return result.item;
  }

  async function createTask(title: string, dueAt?: string, planIndex?: number) {
    setTaskBusy(planIndex === undefined ? "new" : `plan-${planIndex}`);
    setError("");
    setSuccess("");
    try {
      const result = await api<{ task: Task }>("/api/tasks", {
        method: "POST",
        body: JSON.stringify({
          applicationId,
          title,
          ...(dueAt ? { dueAt } : {}),
        }),
      });
      setApplication((current) =>
        current
          ? { ...current, tasks: [...current.tasks, result.task] }
          : current,
      );
      if (planIndex !== undefined)
        setAddedPlanTasks((current) => [...current, planIndex]);
      else {
        setTaskTitle("");
        setTaskDue("");
      }
      setSuccess("Task added to your plan.");
    } catch (failure) {
      setError(errorMessage(failure));
    } finally {
      setTaskBusy(null);
    }
  }

  async function changeTask(task: Task, remove = false) {
    setTaskBusy(task.id);
    setError("");
    setSuccess("");
    try {
      if (remove) {
        await api(`/api/tasks/${task.id}`, { method: "DELETE" });
        setApplication((current) =>
          current
            ? {
                ...current,
                tasks: current.tasks.filter(
                  (existing) => existing.id !== task.id,
                ),
              }
            : current,
        );
      } else {
        const result = await api<{ task: Task }>(`/api/tasks/${task.id}`, {
          method: "PATCH",
          body: JSON.stringify({ completed: !task.completed }),
        });
        setApplication((current) =>
          current
            ? {
                ...current,
                tasks: current.tasks.map((existing) =>
                  existing.id === task.id ? result.task : existing,
                ),
              }
            : current,
        );
      }
    } catch (failure) {
      setError(errorMessage(failure));
    } finally {
      setTaskBusy(null);
    }
  }

  async function getPlan() {
    setPlanLoading(true);
    setError("");
    try {
      setPlan(await api(`/api/applications/${applicationId}/plan`));
      setAddedPlanTasks([]);
    } catch (failure) {
      setError(errorMessage(failure));
    } finally {
      setPlanLoading(false);
    }
  }

  async function sendMessage(event: FormEvent) {
    event.preventDefault();
    if (!chatInput.trim()) return;
    const content = chatInput.trim();
    setChatSending(true);
    setError("");
    try {
      const result = await api<{
        message: ChatMessage;
        mode: "local" | "provider";
      }>("/api/ai/chat", {
        method: "POST",
        body: JSON.stringify({ applicationId, message: content }),
      });
      setApplication((current) =>
        current
          ? {
              ...current,
              messages: [
                ...current.messages,
                {
                  id: `sent-${Date.now()}`,
                  role: "user",
                  content,
                  citations: [],
                },
                result.message,
              ],
            }
          : current,
      );
      setChatInput("");
      setChatMode(result.mode);
    } catch (failure) {
      setError(errorMessage(failure));
    } finally {
      setChatSending(false);
    }
  }

  async function practice(submitAnswer = false) {
    setInterviewBusy(true);
    setError("");
    try {
      const result = await api<{ questions: string[]; feedback?: string }>(
        "/api/interview/session",
        {
          method: "POST",
          body: JSON.stringify({
            applicationId,
            ...(submitAnswer ? { question, answer } : {}),
          }),
        },
      );
      setQuestions(result.questions);
      if (submitAnswer)
        setFeedback(
          result.feedback ?? "No feedback was returned. Please try again.",
        );
      else {
        setQuestion(result.questions[0] ?? "");
        setAnswer("");
        setFeedback("");
      }
    } catch (failure) {
      setError(errorMessage(failure));
    } finally {
      setInterviewBusy(false);
    }
  }

  async function deleteApplication() {
    setDeleting(true);
    setError("");
    try {
      await api(`/api/applications/${applicationId}`, { method: "DELETE" });
      router.replace("/dashboard");
    } catch (failure) {
      setError(errorMessage(failure));
      setDeleting(false);
    }
  }

  const readyCount =
    requirements?.items.filter(
      (item) => item.status === "HAVE_IT" || item.status === "REVIEWED",
    ).length ?? 0;
  const requirementCount = requirements?.items.length ?? 0;
  const taskCount = application?.tasks.length ?? 0;
  const completedTasks =
    application?.tasks.filter((task) => task.completed).length ?? 0;

  return (
    <AppShell>
      <Link href="/dashboard" className="detail-back">
        <ArrowLeft size={16} aria-hidden="true" />
        All applications
      </Link>
      {authLoading ||
      loading ||
      Boolean(application && application.id !== applicationId) ? (
        <div className="panel" role="status" style={{ padding: 40 }}>
          Loading your application…
        </div>
      ) : !application || !profile ? (
        <div className="panel">
          <h1>Unable to open this application</h1>
          <p className="notice notice-error" role="alert">
            {error || "This application is unavailable."}
          </p>
          <button
            className="button button-secondary"
            onClick={() => {
              setLoading(true);
              void load();
            }}
          >
            Try again
          </button>
        </div>
      ) : (
        <>
          <div className="page-heading detail-heading">
            <div>
              <p className="eyebrow">YOUR STUDY VISA APPLICATION</p>
              <h1>{countryName(application.destination)}</h1>
              <p className="muted">
                A clear next step, from preparation to your interview.
              </p>
            </div>
            <VerificationBadge
              status={requirements?.verificationStatus ?? "UNKNOWN"}
            />
          </div>
          {error && (
            <div className="notice notice-error" role="alert">
              {error}
            </div>
          )}
          {success && (
            <div className="notice notice-success" role="status">
              {success}
            </div>
          )}
          {requirements && (
            <div
              className={`notice ${requirements.verificationStatus === "VERIFIED" ? "notice-info" : "notice-warning"}`}
              style={{ marginBottom: 24 }}
            >
              <strong>
                {requirements.verificationStatus === "DEMO"
                  ? "Sample checklist"
                  : requirements.verificationStatus === "UNKNOWN"
                    ? "Requirements are unknown for this profile"
                    : "Reviewed individual requirements"}
              </strong>
              <p>{requirements.notice}</p>
            </div>
          )}

          <nav className="detail-tabs" aria-label="Application sections">
            {(
              [
                { id: "overview", label: "Overview", icon: CalendarDays },
                { id: "checklist", label: "Checklist", icon: ClipboardList },
                { id: "assistant", label: "Assistant", icon: Sparkles },
                { id: "interview", label: "Interview", icon: MessageSquare },
              ] as const
            ).map((item) => (
              <button
                key={item.id}
                type="button"
                className={`detail-tab ${tab === item.id ? "active" : ""}`}
                aria-current={tab === item.id ? "page" : undefined}
                onClick={() => {
                  setTab(item.id);
                  setError("");
                  setSuccess("");
                }}
              >
                <item.icon size={17} aria-hidden="true" />
                {item.label}
                {item.id === "checklist" && (
                  <span className="detail-tab-count">{requirementCount}</span>
                )}
              </button>
            ))}
          </nav>

          {tab === "overview" && (
            <div className="detail-overview-grid">
              <div className="detail-main-column">
                <section className="panel">
                  <div className="detail-card-heading">
                    <div>
                      <h2>Your application profile</h2>
                      <p className="muted">
                        Requirements depend on this exact combination.
                      </p>
                    </div>
                    <span className="badge">
                      Profile v{application.profileVersion}
                    </span>
                  </div>
                  <form
                    className="form-stack"
                    onSubmit={saveProfile}
                    style={{ marginTop: 24 }}
                  >
                    <div className="detail-form-grid">
                      <label className="field">
                        <span>Destination</span>
                        <select
                          value={profile.destination}
                          onChange={(event) =>
                            setProfile({
                              ...profile,
                              destination: event.target.value,
                            })
                          }
                        >
                          {["IT", "DE", "GB", "CA", "AU"].map((country) => (
                            <option key={country} value={country}>
                              {countryName(country)}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="field">
                        <span>Visa type</span>
                        <input value="Study visa" readOnly />
                      </label>
                    </div>
                    <div className="detail-form-grid">
                      <label className="field">
                        <span>Nationality · country code</span>
                        <input
                          required
                          minLength={2}
                          maxLength={2}
                          pattern="[A-Za-z]{2}"
                          value={profile.nationality}
                          onChange={(event) =>
                            setProfile({
                              ...profile,
                              nationality: event.target.value.toUpperCase(),
                            })
                          }
                        />
                      </label>
                      <label className="field">
                        <span>Country of residence · country code</span>
                        <input
                          required
                          minLength={2}
                          maxLength={2}
                          pattern="[A-Za-z]{2}"
                          value={profile.residence}
                          onChange={(event) =>
                            setProfile({
                              ...profile,
                              residence: event.target.value.toUpperCase(),
                            })
                          }
                        />
                      </label>
                    </div>
                    <div className="detail-form-grid">
                      <label className="field">
                        <span>Consular jurisdiction</span>
                        <input
                          required
                          minLength={2}
                          maxLength={100}
                          value={profile.jurisdiction}
                          onChange={(event) =>
                            setProfile({
                              ...profile,
                              jurisdiction: event.target.value,
                            })
                          }
                        />
                      </label>
                      <label className="field">
                        <span>Intended travel date · optional</span>
                        <input
                          type="date"
                          value={profile.intendedDate}
                          onChange={(event) =>
                            setProfile({
                              ...profile,
                              intendedDate: event.target.value,
                            })
                          }
                        />
                      </label>
                    </div>
                    <label className="field">
                      <span>Purpose of study</span>
                      <textarea
                        required
                        minLength={2}
                        maxLength={1000}
                        rows={3}
                        value={profile.purpose}
                        onChange={(event) =>
                          setProfile({
                            ...profile,
                            purpose: event.target.value,
                          })
                        }
                      />
                    </label>
                    <p className="muted small">
                      Changing your profile refreshes the applicable checklist.
                      Progress on requirements outside the updated scope will be
                      removed.
                    </p>
                    <div>
                      <button
                        className="button button-primary"
                        disabled={profileSaving}
                        type="submit"
                      >
                        {profileSaving ? "Saving…" : "Save profile"}
                      </button>
                    </div>
                  </form>
                </section>
                <section className="panel">
                  <div className="detail-card-heading">
                    <div>
                      <h2>Your next steps</h2>
                      <p className="muted">
                        Personal tasks and in-app reminders, on your schedule.
                      </p>
                    </div>
                    <span className="badge">
                      {completedTasks}/{taskCount} done
                    </span>
                  </div>
                  {taskCount ? (
                    <ul className="detail-task-list">
                      {application.tasks.map((task) => (
                        <li key={task.id}>
                          <button
                            className={`detail-task-check ${task.completed ? "complete" : ""}`}
                            aria-label={`${task.completed ? "Mark incomplete" : "Complete"}: ${task.title}`}
                            aria-pressed={task.completed}
                            disabled={taskBusy !== null}
                            onClick={() => void changeTask(task)}
                          >
                            {task.completed && (
                              <Check size={14} aria-hidden="true" />
                            )}
                          </button>
                          <div className="detail-task-copy">
                            <span
                              style={{
                                textDecoration: task.completed
                                  ? "line-through"
                                  : undefined,
                              }}
                            >
                              {task.title}
                            </span>
                            {task.dueAt && (
                              <span className="muted small">
                                Due {dateLabel(task.dueAt)}
                              </span>
                            )}
                          </div>
                          <button
                            className="detail-icon-button"
                            aria-label={`Delete task: ${task.title}`}
                            title="Delete task"
                            disabled={taskBusy !== null}
                            onClick={() => void changeTask(task, true)}
                          >
                            <Trash2 size={16} aria-hidden="true" />
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="detail-empty">
                      <CalendarDays size={28} aria-hidden="true" />
                      <p>
                        No tasks yet. Add a next step or review suggested tasks.
                      </p>
                    </div>
                  )}
                  <form
                    className="detail-task-form"
                    onSubmit={(event) => {
                      event.preventDefault();
                      if (taskTitle.trim())
                        void createTask(taskTitle.trim(), taskDue);
                    }}
                  >
                    <label className="field">
                      <span>New task</span>
                      <input
                        required
                        minLength={2}
                        maxLength={250}
                        value={taskTitle}
                        onChange={(event) => setTaskTitle(event.target.value)}
                        placeholder="For example, request your transcript"
                      />
                    </label>
                    <label className="field">
                      <span>Due date · optional</span>
                      <input
                        type="date"
                        value={taskDue}
                        onChange={(event) => setTaskDue(event.target.value)}
                      />
                    </label>
                    <button
                      className="button button-secondary"
                      type="submit"
                      disabled={taskBusy !== null}
                    >
                      <Plus size={16} aria-hidden="true" />
                      Add task
                    </button>
                  </form>
                </section>
                <section className="panel">
                  <div className="detail-card-heading">
                    <div>
                      <h2>A plan to get started</h2>
                      <p className="muted">
                        Review suggestions before adding them to your tasks.
                      </p>
                    </div>
                    <button
                      className="button button-secondary"
                      disabled={planLoading}
                      onClick={() => void getPlan()}
                    >
                      <Sparkles size={16} aria-hidden="true" />
                      {planLoading
                        ? "Loading…"
                        : plan
                          ? "Refresh suggestions"
                          : "Suggest next steps"}
                    </button>
                  </div>
                  {plan && (
                    <div className="form-stack" style={{ marginTop: 20 }}>
                      <p className="notice notice-info">{plan.notice}</p>
                      {plan.tasks.length ? (
                        plan.tasks.map((task, index) => (
                          <div
                            className="detail-plan-card"
                            key={`${task.title}-${index}`}
                          >
                            <div>
                              <div className="detail-source-line">
                                <h3>{task.title}</h3>
                                <span className="badge">
                                  {task.priority} priority
                                </span>
                              </div>
                              <p className="muted">{task.description}</p>
                              {task.sourceUrl && safeLink(task.sourceUrl) && (
                                <a
                                  className="small"
                                  href={safeLink(task.sourceUrl)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                >
                                  View source{" "}
                                  <ArrowUpRight size={12} aria-hidden="true" />
                                </a>
                              )}
                            </div>
                            <button
                              className="button button-secondary"
                              disabled={
                                taskBusy !== null ||
                                addedPlanTasks.includes(index)
                              }
                              onClick={() =>
                                void createTask(task.title, undefined, index)
                              }
                            >
                              {addedPlanTasks.includes(index)
                                ? "Added"
                                : taskBusy === `plan-${index}`
                                  ? "Adding…"
                                  : "Add task"}
                            </button>
                          </div>
                        ))
                      ) : (
                        <p className="muted">
                          No suggestions are available for this profile.
                        </p>
                      )}
                    </div>
                  )}
                </section>
              </div>
              <aside className="detail-side-column">
                <section className="panel detail-progress">
                  <p className="eyebrow">YOUR CHECKLIST</p>
                  <div className="detail-progress-number">
                    {readyCount}
                    <span> / {requirementCount}</span>
                  </div>
                  <p>marked ready or reviewed</p>
                  <div
                    className="detail-progress-bar"
                    role="progressbar"
                    aria-label="Self-reported checklist progress"
                    aria-valuenow={readyCount}
                    aria-valuemin={0}
                    aria-valuemax={Math.max(requirementCount, 1)}
                  >
                    <span
                      style={{
                        width: `${requirementCount ? (readyCount / requirementCount) * 100 : 0}%`,
                      }}
                    />
                  </div>
                  <p className="muted small">
                    Your progress is self-reported. It does not mean documents
                    have been officially verified or a visa will be approved.
                  </p>
                  <button
                    className="button button-primary"
                    onClick={() => setTab("checklist")}
                  >
                    Open checklist
                  </button>
                </section>
                <section className="panel">
                  <h3>Application at a glance</h3>
                  <dl className="detail-definition-list">
                    <div>
                      <dt>Nationality</dt>
                      <dd>{countryName(application.nationality)}</dd>
                    </div>
                    <div>
                      <dt>Residence</dt>
                      <dd>{countryName(application.residence)}</dd>
                    </div>
                    <div>
                      <dt>Jurisdiction</dt>
                      <dd>{application.jurisdiction}</dd>
                    </div>
                    <div>
                      <dt>Travel date</dt>
                      <dd>
                        {application.intendedDate
                          ? dateLabel(application.intendedDate)
                          : "Not set"}
                      </dd>
                    </div>
                  </dl>
                </section>
                <section className="panel">
                  <h3>Official sources</h3>
                  <p className="muted small">
                    Use the current guidance from the relevant authority.
                  </p>
                  {requirements?.sources.length ? (
                    <ul className="detail-sources-list">
                      {requirements.sources.map((source) => (
                        <li key={source.id}>
                          {safeLink(source.url) ? (
                            <a
                              href={safeLink(source.url)}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              {source.title}
                              <ArrowUpRight size={14} aria-hidden="true" />
                            </a>
                          ) : (
                            <span>{source.title}</span>
                          )}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <Link href="/sources" className="button button-secondary">
                      Browse source registry
                    </Link>
                  )}
                </section>
                <section className="panel">
                  <h3>Manage application</h3>
                  {deleteConfirm ? (
                    <>
                      <p className="notice notice-warning">
                        Delete this application and its checklist, tasks,
                        messages and interview practice? This cannot be undone.
                      </p>
                      <div className="detail-actions">
                        <button
                          className="button button-danger"
                          disabled={deleting}
                          onClick={() => void deleteApplication()}
                        >
                          {deleting ? "Deleting…" : "Confirm delete"}
                        </button>
                        <button
                          className="button button-secondary"
                          disabled={deleting}
                          onClick={() => setDeleteConfirm(false)}
                        >
                          Cancel
                        </button>
                      </div>
                    </>
                  ) : (
                    <button
                      className="button button-secondary"
                      onClick={() => setDeleteConfirm(true)}
                    >
                      <Trash2 size={15} aria-hidden="true" />
                      Delete application
                    </button>
                  )}
                </section>
              </aside>
            </div>
          )}

          {tab === "checklist" && (
            <section>
              <div className="detail-card-heading" style={{ marginBottom: 20 }}>
                <div>
                  <h2>Your document checklist</h2>
                  <p className="muted">
                    Track preparation, add notes, and save each change when you
                    are ready.
                  </p>
                </div>
                <span className="badge">
                  {readyCount}/{requirementCount} self-reported ready
                </span>
              </div>
              <div className="notice notice-info" style={{ marginBottom: 20 }}>
                Statuses reflect your own assessment. “I reviewed it” does not
                mean an authority has verified your document.
              </div>
              {requirements?.items.length ? (
                <div className="form-stack">
                  {requirements.items.map((item) => (
                    <ChecklistCard
                      key={item.id}
                      item={item}
                      onSave={saveChecklist}
                    />
                  ))}
                </div>
              ) : (
                <div className="panel detail-empty">
                  <ClipboardList size={36} aria-hidden="true" />
                  <h3>No matching checklist is available</h3>
                  <p className="muted">
                    Requirements remain UNKNOWN for this exact profile. Consult
                    the official authority before preparing documents.
                  </p>
                  <Link className="button button-secondary" href="/sources">
                    Browse official source links
                  </Link>
                </div>
              )}
            </section>
          )}

          {tab === "assistant" && (
            <section className="panel detail-chat-panel">
              <div className="detail-card-heading">
                <div>
                  <h2>Your preparation assistant</h2>
                  <p className="muted">
                    Ask a question about your profile, checklist or next steps.
                  </p>
                </div>
                {chatMode && (
                  <span className="badge">
                    {chatMode === "local" ? "Local guidance" : "AI provider"}
                  </span>
                )}
              </div>
              <div className="notice notice-info" style={{ marginTop: 18 }}>
                Answers are preparation guidance and can be incomplete. Read the
                cited sources and their status.{" "}
                {user && !user.aiConsent && (
                  <>
                    Live AI is off until you opt in through{" "}
                    <Link href="/settings">account settings</Link>; local
                    guidance is available.
                  </>
                )}
              </div>
              <div className="detail-chat-messages" aria-live="polite">
                {application.messages.length ? (
                  application.messages.map((message) => (
                    <article
                      key={message.id}
                      className={`detail-message ${message.role === "user" ? "from-user" : "from-assistant"}`}
                    >
                      <span className="detail-message-role">
                        {message.role === "user" ? "You" : "Visa assistant"}
                      </span>
                      <p
                        style={{
                          whiteSpace: "pre-wrap",
                          overflowWrap: "anywhere",
                        }}
                      >
                        {message.content}
                      </p>
                      {message.citations?.length > 0 && (
                        <div className="detail-citations">
                          <p className="small muted">Sources for this answer</p>
                          {message.citations.map((citation, index) => (
                            <div
                              className="detail-citation"
                              key={`${citation.url}-${index}`}
                            >
                              <VerificationBadge
                                status={
                                  citation.verificationStatus ?? "UNKNOWN"
                                }
                              />
                              {safeLink(citation.url) ? (
                                <a
                                  href={safeLink(citation.url)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                >
                                  {citation.title}
                                  <ArrowUpRight size={13} aria-hidden="true" />
                                </a>
                              ) : (
                                <span>{citation.title}</span>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </article>
                  ))
                ) : (
                  <div className="detail-empty">
                    <Sparkles size={32} aria-hidden="true" />
                    <h3>Start with one useful question</h3>
                    <p className="muted">
                      Try “Which requirements should I check first?” or “Explain
                      my current checklist.”
                    </p>
                  </div>
                )}
                {chatSending && (
                  <p className="muted small" role="status">
                    Preparing an answer…
                  </p>
                )}
                <div ref={chatEnd} />
              </div>
              <form className="detail-chat-form" onSubmit={sendMessage}>
                <label className="field" style={{ flex: 1 }}>
                  <span>Message</span>
                  <textarea
                    rows={2}
                    required
                    maxLength={2000}
                    value={chatInput}
                    onChange={(event) => setChatInput(event.target.value)}
                    placeholder="Ask about your visa preparation…"
                  />
                </label>
                <button
                  className="button button-primary"
                  type="submit"
                  disabled={chatSending || !chatInput.trim()}
                >
                  <Send size={17} aria-hidden="true" />
                  {chatSending ? "Sending…" : "Send"}
                </button>
              </form>
              <p className="muted small" style={{ marginTop: 12 }}>
                Do not include passwords, bank details or other sensitive
                personal information.
              </p>
            </section>
          )}

          {tab === "interview" && (
            <section className="panel">
              <div className="detail-card-heading">
                <div>
                  <h2>Practice your interview</h2>
                  <p className="muted">
                    Build clear answers in your own words, one question at a
                    time.
                  </p>
                </div>
                <span className="badge">Text practice</span>
              </div>
              <div className="notice notice-info" style={{ marginTop: 20 }}>
                Practice feedback is general preparation guidance. Questions may
                differ from your real interview and feedback cannot predict a
                visa decision.
              </div>
              {!questions.length ? (
                <div className="detail-empty">
                  <MessageSquare size={36} aria-hidden="true" />
                  <h3>A little practice can help you feel prepared</h3>
                  <p className="muted">
                    Get study visa practice questions based on your application.
                  </p>
                  <button
                    className="button button-primary"
                    disabled={interviewBusy}
                    onClick={() => void practice()}
                  >
                    {interviewBusy ? "Loading questions…" : "Start practice"}
                  </button>
                </div>
              ) : (
                <div className="detail-interview-grid">
                  <aside>
                    <h3>Practice questions</h3>
                    <div className="form-stack">
                      {questions.map((item, index) => (
                        <button
                          type="button"
                          className={`detail-question ${question === item ? "selected" : ""}`}
                          key={`${index}-${item}`}
                          onClick={() => {
                            setQuestion(item);
                            setAnswer("");
                            setFeedback("");
                          }}
                          disabled={interviewBusy}
                        >
                          <span>{String(index + 1).padStart(2, "0")}</span>
                          {item}
                        </button>
                      ))}
                    </div>
                    <button
                      className="button button-secondary"
                      style={{ marginTop: 20 }}
                      disabled={interviewBusy}
                      onClick={() => void practice()}
                    >
                      Restart practice
                    </button>
                  </aside>
                  <div>
                    <form
                      className="form-stack"
                      onSubmit={(event) => {
                        event.preventDefault();
                        if (answer.trim()) void practice(true);
                      }}
                    >
                      <h3>{question}</h3>
                      <label className="field">
                        <span>Your answer</span>
                        <textarea
                          required
                          rows={8}
                          minLength={10}
                          maxLength={6000}
                          value={answer}
                          onChange={(event) => setAnswer(event.target.value)}
                          placeholder="Explain your plans honestly and specifically…"
                        />
                      </label>
                      <div>
                        <button
                          className="button button-primary"
                          type="submit"
                          disabled={interviewBusy || !answer.trim()}
                        >
                          {interviewBusy ? "Reviewing…" : "Get feedback"}
                        </button>
                      </div>
                    </form>
                    {feedback && (
                      <div className="detail-feedback" role="status">
                        <h3>Feedback on your answer</h3>
                        <p
                          style={{
                            whiteSpace: "pre-wrap",
                            overflowWrap: "anywhere",
                          }}
                        >
                          {feedback}
                        </p>
                        <p className="muted small">
                          This answer and feedback have been saved to this
                          application.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </section>
          )}
        </>
      )}
    </AppShell>
  );
}
