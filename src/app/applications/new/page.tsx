"use client";

import Link from "next/link";
import { Suspense, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Compass,
  ShieldCheck,
  Check,
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { CountryArt } from "@/components/country-art";
import { PageHeading, Notice, Field } from "@/components/ui";
import { api, countries, type Application } from "@/lib/client";

function NewApplicationForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [destination, setDestination] = useState(() => {
    const code = searchParams.get("destination");
    return countries.some((c) => c.code === code) ? code! : "IT";
  });
  const [nationality, setNationality] = useState("PK");
  const [residence, setResidence] = useState("PK");
  const [jurisdiction, setJurisdiction] = useState("Islamabad");
  const [purpose, setPurpose] = useState("");
  const [intendedDate, setIntendedDate] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const { application } = await api<{ application: Application }>(
        "/api/applications",
        {
          method: "POST",
          body: JSON.stringify({
            destination,
            nationality: nationality.toUpperCase().trim(),
            residence: residence.toUpperCase().trim(),
            jurisdiction: jurisdiction.trim(),
            visaType: "study",
            purpose: purpose.trim(),
            ...(intendedDate ? { intendedDate } : {}),
          }),
        },
      );
      router.push(`/applications/${application.id}`);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not create your application.",
      );
      setBusy(false);
    }
  }
  const selected = countries.find((c) => c.code === destination)!;
  return (
    <AppShell>
      <Link href="/dashboard" className="back-link">
        <ArrowLeft size={15} />
        Back to overview
      </Link>
      <PageHeading
        eyebrow="A FRESH START"
        title="Where will your story go?"
        description="Tell us a little about your plans. We’ll help you bring the next steps into focus."
      />
      <div className="new-application-layout">
        <form className="panel new-application-form" onSubmit={submit}>
          <div className="form-section-title">
            <span className="section-number">01</span>
            <div>
              <h2>Your destination</h2>
              <p>Choose where you’re planning to study.</p>
            </div>
          </div>
          <Field label="Destination country">
            <select
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
            >
              {countries.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.flag} {c.name}
                </option>
              ))}
            </select>
          </Field>
          <div className="destination-picker" aria-hidden="true">
            {countries.map((c) => (
              <button
                type="button"
                tabIndex={-1}
                key={c.code}
                className={destination === c.code ? "selected" : ""}
                onClick={() => setDestination(c.code)}
              >
                <span>{c.flag}</span>
                {c.name}
                {destination === c.code && <Check size={12} />}
              </button>
            ))}
          </div>
          <div className="form-divider" />
          <div className="form-section-title">
            <span className="section-number">02</span>
            <div>
              <h2>Your profile</h2>
              <p>Requirements depend on your exact circumstances.</p>
            </div>
          </div>
          <div className="form-grid">
            <Field label="Nationality" hint="Two-letter country code, e.g. PK.">
              <input
                value={nationality}
                onChange={(e) => setNationality(e.target.value)}
                minLength={2}
                maxLength={2}
                pattern="[A-Za-z]{2}"
                required
                placeholder="PK"
                autoCapitalize="characters"
              />
            </Field>
            <Field
              label="Country of residence"
              hint="Where you legally reside, e.g. PK."
            >
              <input
                value={residence}
                onChange={(e) => setResidence(e.target.value)}
                minLength={2}
                maxLength={2}
                pattern="[A-Za-z]{2}"
                required
                placeholder="PK"
                autoCapitalize="characters"
              />
            </Field>
            <Field
              label="Consular jurisdiction"
              hint="The office or city responsible for your application."
            >
              <input
                value={jurisdiction}
                onChange={(e) => setJurisdiction(e.target.value)}
                required
                minLength={2}
                maxLength={100}
                placeholder="Islamabad"
              />
            </Field>
            <Field
              label="Visa type"
              hint="This workspace currently supports study plans."
            >
              <select value="study" disabled>
                <option value="study">Study visa</option>
              </select>
            </Field>
          </div>
          <div className="form-divider" />
          <div className="form-section-title">
            <span className="section-number">03</span>
            <div>
              <h2>Your study plans</h2>
              <p>A little context makes your plan more useful.</p>
            </div>
          </div>
          <div className="form-stack">
            <Field label="Purpose of travel">
              <textarea
                rows={3}
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                required
                minLength={3}
                maxLength={1000}
                placeholder="For example: I plan to study a master's in computer science."
              />
            </Field>
            <Field label="Intended arrival date" hint="Optional">
              <input
                type="date"
                value={intendedDate}
                onChange={(e) => setIntendedDate(e.target.value)}
              />
            </Field>
            {error && <Notice variant="error">{error}</Notice>}
            <div className="form-actions">
              <Link href="/dashboard" className="button button-secondary">
                Cancel
              </Link>
              <button
                disabled={busy}
                className="button button-primary"
                type="submit"
              >
                {busy ? "Creating your plan…" : "Create application"}
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        </form>
        <aside className="new-application-aside">
          <div className="preview-card">
            <CountryArt code={destination} />
            <span className="eyebrow">THE NEXT CHAPTER</span>
            <h2>{selected.name}</h2>
            <p>{selected.caption}.</p>
            <div className="preview-card-footer">
              <Compass size={20} />
              <span>
                Your journey.
                <br />
                <strong>Your pace.</strong>
              </span>
            </div>
          </div>
          <div className="scope-card">
            <ShieldCheck size={23} />
            <h3>Clear about what we know.</h3>
            <p>
              Current sample checklists cover Pakistani nationals living in
              Pakistan, applying through Islamabad for study.
            </p>
            <p>
              <strong>DEMO</strong> means an educational sample. Other profiles
              show <strong>UNKNOWN</strong> when no matching approved source
              exists.
            </p>
            <Link href="/sources">
              Explore the source library <ArrowRight size={14} />
            </Link>
          </div>
        </aside>
      </div>
    </AppShell>
  );
}

export default function NewApplication() {
  return (
    <Suspense
      fallback={<div className="loading-state">Preparing your workspace…</div>}
    >
      <NewApplicationForm />
    </Suspense>
  );
}
