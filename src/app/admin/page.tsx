"use client";

import { useEffect, useState, type FormEvent } from "react";
import {
  BookOpen,
  ShieldCheck,
  ExternalLink,
  Check,
  X,
  Plus,
  ClipboardList,
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import {
  Badge,
  EmptyState,
  LoadingState,
  Notice,
  PageHeading,
} from "@/components/ui";
import {
  api,
  countries,
  countryName,
  dateLabel,
  useAuth,
  type Rule,
  type Source,
} from "@/lib/client";

type AuditLog = {
  id: string;
  action: string;
  resourceId: string | null;
  createdAt: string;
  metadata: unknown;
};
export default function AdminPage() {
  const { user, loading: authLoading } = useAuth();
  const [rules, setRules] = useState<Rule[]>([]),
    [sources, setSources] = useState<Source[]>([]),
    [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [success, setSuccess] = useState(""),
    [busy, setBusy] = useState("");
  const [tab, setTab] = useState("review"),
    [sourceId, setSourceId] = useState(""),
    [excerpt, setExcerpt] = useState(""),
    [attest, setAttest] = useState(false);
  const [draft, setDraft] = useState({
    sourceId: "",
    destination: "IT",
    nationality: "PK",
    residence: "PK",
    jurisdiction: "Islamabad",
    visaType: "study",
    title: "",
    description: "",
    sourceExcerpt: "",
  });
  const [expiries, setExpiries] = useState<Record<string, string>>({});
  async function load() {
    setLoading(true);
    try {
      const [r, s, l] = await Promise.all([
        api<{ rules: Rule[] }>("/api/admin/rules"),
        api<{ sources: Source[] }>("/api/sources"),
        api<{ logs: AuditLog[] }>("/api/admin/audit"),
      ]);
      setRules(r.rules);
      setSources(s.sources);
      setLogs(l.logs);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Could not load review workspace.",
      );
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    if (user?.role !== "ADMIN") return;
    let active = true;
    void Promise.all([
      api<{ rules: Rule[] }>("/api/admin/rules"),
      api<{ sources: Source[] }>("/api/sources"),
      api<{ logs: AuditLog[] }>("/api/admin/audit"),
    ])
      .then(([r, s, l]) => {
        if (active) {
          setRules(r.rules);
          setSources(s.sources);
          setLogs(l.logs);
        }
      })
      .catch((e) => {
        if (active)
          setError(
            e instanceof Error ? e.message : "Could not load review workspace.",
          );
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [user?.role]);
  async function snapshot(event: FormEvent) {
    event.preventDefault();
    setBusy("snapshot");
    setError("");
    setSuccess("");
    try {
      await api(`/api/admin/sources/${sourceId}/snapshot`, {
        method: "POST",
        body: JSON.stringify({ excerpt, confirmOfficialOrigin: attest }),
      });
      setSuccess(
        "Source snapshot recorded. You can now draft a rule using an exact supporting excerpt.",
      );
      setExcerpt("");
      setAttest(false);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not record snapshot.");
    } finally {
      setBusy("");
    }
  }
  async function createRule(event: FormEvent) {
    event.preventDefault();
    setBusy("draft");
    setError("");
    setSuccess("");
    try {
      await api("/api/admin/rules", {
        method: "POST",
        body: JSON.stringify(draft),
      });
      setSuccess("Draft created and ready for review.");
      setDraft({ ...draft, title: "", description: "", sourceExcerpt: "" });
      await load();
      setTab("review");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not create draft.");
    } finally {
      setBusy("");
    }
  }
  async function review(rule: Rule, status: "APPROVED" | "REJECTED") {
    setBusy(rule.id);
    setError("");
    setSuccess("");
    try {
      await api(`/api/admin/rules/${rule.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          reviewStatus: status,
          ...(status === "APPROVED" ? { validUntil: expiries[rule.id] } : {}),
        }),
      });
      setSuccess(
        status === "APPROVED"
          ? "Rule approved for its exact scope until the selected expiry."
          : "Draft rejected.",
      );
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not review rule.");
    } finally {
      setBusy("");
    }
  }
  const selected = sources.find((s) => s.id === sourceId);
  return (
    <AppShell>
      <PageHeading
        eyebrow="REVIEW WORKSPACE"
        title="Make the evidence clear."
        description="Record source snapshots, draft scoped requirements, and review every claim before it becomes verified."
      />
      {!authLoading && user?.role !== "ADMIN" ? (
        <Notice variant="warning">
          This workspace is available to administrators. Your applicant account
          can explore the public source library.
        </Notice>
      ) : (
        <>
          {error && <Notice variant="error">{error}</Notice>}
          {success && <Notice variant="success">{success}</Notice>}
          <div className="tab-list" role="tablist" aria-label="Admin workspace">
            <button
              role="tab"
              aria-selected={tab === "review"}
              className={tab === "review" ? "active" : ""}
              onClick={() => setTab("review")}
            >
              <ShieldCheck size={16} />
              Review rules
            </button>
            <button
              role="tab"
              aria-selected={tab === "draft"}
              className={tab === "draft" ? "active" : ""}
              onClick={() => setTab("draft")}
            >
              <Plus size={16} />
              Create draft
            </button>
            <button
              role="tab"
              aria-selected={tab === "snapshot"}
              className={tab === "snapshot" ? "active" : ""}
              onClick={() => setTab("snapshot")}
            >
              <BookOpen size={16} />
              Source snapshots
            </button>
            <button
              role="tab"
              aria-selected={tab === "audit"}
              className={tab === "audit" ? "active" : ""}
              onClick={() => setTab("audit")}
            >
              <ClipboardList size={16} />
              Audit trail
            </button>
          </div>
          {loading ? (
            <LoadingState />
          ) : tab === "review" ? (
            <div className="admin-rule-list">
              {!rules.length ? (
                <EmptyState
                  title="No rules to review"
                  description="Record a source snapshot and create a scoped draft to begin."
                />
              ) : (
                rules.map((rule) => (
                  <article className="panel admin-rule-card" key={rule.id}>
                    <div className="admin-rule-heading">
                      <div>
                        <span className="eyebrow">
                          {countryName(rule.destination)} · {rule.visaType} ·{" "}
                          {rule.nationality}/{rule.residence} ·{" "}
                          {rule.jurisdiction}
                        </span>
                        <h2>{rule.title}</h2>
                      </div>
                      <Badge
                        variant={
                          rule.isDemo
                            ? "demo"
                            : rule.reviewStatus === "APPROVED"
                              ? "verified"
                              : "default"
                        }
                      >
                        {rule.isDemo ? "DEMO" : rule.reviewStatus}
                      </Badge>
                    </div>
                    <p>{rule.description}</p>
                    <blockquote>{rule.sourceExcerpt}</blockquote>
                    <a
                      className="text-link"
                      href={rule.source?.url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {rule.source?.title || "Source"}
                      <ExternalLink size={14} />
                    </a>
                    <div className="admin-review-footer">
                      <span className="muted">
                        Version {rule.version || 1} ·{" "}
                        {rule.validUntil
                          ? `Valid until ${dateLabel(rule.validUntil)}`
                          : "No validity period"}
                      </span>
                      {rule.reviewStatus === "DRAFT" && !rule.isDemo && (
                        <div className="admin-review-actions">
                          <label className="field">
                            <span>Valid until</span>
                            <input
                              aria-label={`Validity date for ${rule.title}`}
                              type="date"
                              required
                              value={expiries[rule.id] || ""}
                              onChange={(e) =>
                                setExpiries({
                                  ...expiries,
                                  [rule.id]: e.target.value,
                                })
                              }
                            />
                          </label>
                          <button
                            className="button button-secondary"
                            disabled={!!busy}
                            onClick={() => review(rule, "REJECTED")}
                          >
                            <X size={15} />
                            Reject
                          </button>
                          <button
                            className="button button-primary"
                            disabled={!!busy || !expiries[rule.id]}
                            onClick={() => review(rule, "APPROVED")}
                          >
                            <Check size={15} />
                            Approve
                          </button>
                        </div>
                      )}
                      {rule.isDemo && (
                        <small>
                          Demonstration rules cannot be approved as official.
                        </small>
                      )}
                    </div>
                  </article>
                ))
              )}
            </div>
          ) : tab === "snapshot" ? (
            <form className="panel admin-form form-stack" onSubmit={snapshot}>
              <h2>Record an official source snapshot</h2>
              <p className="muted">
                Open the registered source and copy the relevant text. Snapshots
                support rule review; this action does not automatically verify
                any requirement.
              </p>
              <label className="field">
                <span>Official source</span>
                <select
                  required
                  value={sourceId}
                  onChange={(e) => setSourceId(e.target.value)}
                >
                  <option value="">Select a source</option>
                  {sources
                    .filter((s) => s.official)
                    .map((s) => (
                      <option value={s.id} key={s.id}>
                        {countryName(s.destination)} — {s.title}
                      </option>
                    ))}
                </select>
              </label>
              {selected && (
                <a
                  href={selected.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-link"
                >
                  Open official website
                  <ExternalLink size={14} />
                </a>
              )}
              <label className="field">
                <span>Supporting source text</span>
                <textarea
                  rows={10}
                  aria-label="Supporting source text"
                  aria-describedby="source-snapshot-help"
                  value={excerpt}
                  onChange={(e) => setExcerpt(e.target.value)}
                  required
                  minLength={100}
                  maxLength={50000}
                  placeholder="Paste text copied from the registered official source…"
                />
                <small id="source-snapshot-help">
                  100–50,000 characters. Preserve the source wording.
                </small>
              </label>
              <label className="checkbox-row">
                <input
                  type="checkbox"
                  checked={attest}
                  onChange={(e) => setAttest(e.target.checked)}
                  required
                />
                <span>
                  I confirm this text was copied from the selected official
                  source.
                </span>
              </label>
              <button
                className="button button-primary"
                disabled={!!busy || !attest}
              >
                Record snapshot
              </button>
            </form>
          ) : tab === "draft" ? (
            <form className="panel admin-form form-stack" onSubmit={createRule}>
              <h2>Create a requirement draft</h2>
              <Notice variant="info">
                An exact supporting excerpt from a recorded official snapshot is
                required. Each rule applies only to its selected scope.
              </Notice>
              <label className="field">
                <span>Source</span>
                <select
                  required
                  value={draft.sourceId}
                  onChange={(e) => {
                    const source = sources.find((s) => s.id === e.target.value);
                    setDraft({
                      ...draft,
                      sourceId: e.target.value,
                      destination: source?.destination || draft.destination,
                    });
                  }}
                >
                  <option value="">Select a source</option>
                  {sources
                    .filter((s) => s.official)
                    .map((s) => (
                      <option key={s.id} value={s.id}>
                        {countryName(s.destination)} — {s.title}
                      </option>
                    ))}
                </select>
              </label>
              <div className="form-grid">
                <label className="field">
                  <span>Destination</span>
                  <select
                    value={draft.destination}
                    onChange={(e) =>
                      setDraft({ ...draft, destination: e.target.value })
                    }
                  >
                    {countries.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="field">
                  <span>Visa type</span>
                  <select
                    value={draft.visaType}
                    onChange={(e) =>
                      setDraft({ ...draft, visaType: e.target.value })
                    }
                  >
                    <option value="study">Study</option>
                  </select>
                </label>
                <label className="field">
                  <span>Nationality</span>
                  <input
                    required
                    minLength={2}
                    maxLength={2}
                    value={draft.nationality}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        nationality: e.target.value.toUpperCase(),
                      })
                    }
                  />
                </label>
                <label className="field">
                  <span>Residence</span>
                  <input
                    required
                    minLength={2}
                    maxLength={2}
                    value={draft.residence}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        residence: e.target.value.toUpperCase(),
                      })
                    }
                  />
                </label>
                <label className="field">
                  <span>Jurisdiction</span>
                  <input
                    required
                    value={draft.jurisdiction}
                    onChange={(e) =>
                      setDraft({ ...draft, jurisdiction: e.target.value })
                    }
                  />
                </label>
              </div>
              <label className="field">
                <span>Requirement title</span>
                <input
                  required
                  minLength={3}
                  maxLength={200}
                  value={draft.title}
                  onChange={(e) =>
                    setDraft({ ...draft, title: e.target.value })
                  }
                />
              </label>
              <label className="field">
                <span>Description</span>
                <textarea
                  required
                  minLength={20}
                  rows={3}
                  value={draft.description}
                  onChange={(e) =>
                    setDraft({ ...draft, description: e.target.value })
                  }
                />
              </label>
              <label className="field">
                <span>Exact supporting excerpt</span>
                <textarea
                  required
                  minLength={40}
                  rows={4}
                  aria-label="Exact supporting excerpt"
                  aria-describedby="rule-excerpt-help"
                  value={draft.sourceExcerpt}
                  onChange={(e) =>
                    setDraft({ ...draft, sourceExcerpt: e.target.value })
                  }
                />
                <small id="rule-excerpt-help">
                  Must match text in this source’s recorded snapshot.
                </small>
              </label>
              <button className="button button-primary" disabled={!!busy}>
                <Plus size={15} />
                Create draft
              </button>
            </form>
          ) : (
            <div className="panel">
              {!logs.length ? (
                <EmptyState
                  title="No audit events yet"
                  description="Administrative and account actions will appear here."
                />
              ) : (
                <div className="audit-list">
                  {logs.map((log) => (
                    <div className="audit-row" key={log.id}>
                      <span className="audit-icon">
                        <ShieldCheck size={17} />
                      </span>
                      <div>
                        <strong>{log.action}</strong>
                        <small>
                          {log.resourceId || "Account or system event"}
                        </small>
                      </div>
                      <time>{dateLabel(log.createdAt)}</time>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </AppShell>
  );
}
