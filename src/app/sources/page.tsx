"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ArrowUpRight,
  BookOpen,
  Search,
  ShieldCheck,
  Clock3,
} from "lucide-react";
import { AppShell, Brand } from "@/components/app-shell";
import {
  Badge,
  LoadingState,
  Notice,
  PageHeading,
  EmptyState,
} from "@/components/ui";
import {
  api,
  countries,
  countryName,
  dateLabel,
  useAuth,
  type Source,
} from "@/lib/client";

export default function SourcesPage() {
  const { user, loading: authLoading } = useAuth();
  const [sources, setSources] = useState<Source[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [destination, setDestination] = useState("all");
  const [search, setSearch] = useState("");
  useEffect(() => {
    api<{ sources: Source[] }>("/api/sources")
      .then((r) => setSources(r.sources))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);
  const filtered = sources.filter(
    (s) =>
      (destination === "all" || s.destination === destination) &&
      `${s.title} ${countryName(s.destination)}`
        .toLowerCase()
        .includes(search.toLowerCase()),
  );
  const content = (
    <>
      <PageHeading
        eyebrow="GROUND YOUR PLANS IN CONTEXT"
        title="The source library."
        description="Know where the information comes from. Read the original source, check its scope, and stay curious."
      />
      <div className="source-library-intro">
        <BookOpen size={28} />
        <div>
          <h2>Official sources. Transparent status.</h2>
          <p>
            These are source references, not a guarantee that every rule has
            been retrieved or reviewed. An official URL alone does not verify a
            checklist. Always confirm the current requirements with the
            responsible authority.
          </p>
        </div>
      </div>
      <div className="source-filters">
        <div className="filter-pills">
          <button
            className={destination === "all" ? "active" : ""}
            onClick={() => setDestination("all")}
          >
            All destinations
          </button>
          {countries.map((c) => (
            <button
              className={destination === c.code ? "active" : ""}
              onClick={() => setDestination(c.code)}
              key={c.code}
            >
              {c.flag} {c.name}
            </button>
          ))}
        </div>
        <label className="search-field">
          <Search size={16} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search sources"
            placeholder="Search the library"
          />
        </label>
      </div>
      {error && <Notice variant="error">{error}</Notice>}
      {loading ? (
        <LoadingState label="Opening the source library…" />
      ) : !filtered.length ? (
        <EmptyState
          title="No sources match"
          description="Try another destination or search term."
        />
      ) : (
        <div className="source-grid">
          {filtered.map((source) => (
            <article className="source-card" key={source.id}>
              <div className="source-card-top">
                <span className="source-country">
                  {countries.find((c) => c.code === source.destination)?.flag}{" "}
                  {countryName(source.destination)}
                </span>
                <Badge variant={source.official ? "verified" : "default"}>
                  {source.official ? "Official website" : "Reference"}
                </Badge>
              </div>
              <h2>{source.title}</h2>
              <p className="source-host">{new URL(source.url).hostname}</p>
              <p className="source-description">
                {source.excerpt
                  ? source.excerpt.slice(0, 190) +
                    (source.excerpt.length > 190 ? "…" : "")
                  : source.fetchedAt
                    ? "A reference to the responsible authority. A supporting snapshot has been recorded for internal review; open the original source for the latest guidance."
                    : "A reference to the responsible authority. Supporting text has not yet been recorded for review."}
              </p>
              <div className="source-recorded">
                <Clock3 size={14} />
                {source.fetchedAt
                  ? `Snapshot recorded ${dateLabel(source.fetchedAt)}`
                  : "No source snapshot recorded"}
              </div>
              <a
                className="source-open"
                href={source.url}
                target="_blank"
                rel="noopener noreferrer"
              >
                Read the original source <ArrowUpRight size={16} />
              </a>
            </article>
          ))}
        </div>
      )}
      <div className="source-legend">
        <ShieldCheck size={23} />
        <div>
          <h3>A status should tell you something.</h3>
          <p>
            <strong>VERIFIED</strong> means a matching, approved, non-demo rule
            supported by a current source. <strong>DEMO</strong> is an
            educational sample. <strong>UNKNOWN</strong> means this workspace
            does not have sufficient reviewed guidance for your profile.
          </p>
        </div>
      </div>
    </>
  );
  if (authLoading)
    return (
      <div className="public-source-page">
        <LoadingState />
      </div>
    );
  return user ? (
    <AppShell>{content}</AppShell>
  ) : (
    <div className="public-source-page">
      <header className="public-header">
        <Brand />
        <div>
          <Link href="/login">Log in</Link>
          <Link className="button button-primary" href="/register">
            Get started <ArrowUpRight size={15} />
          </Link>
        </div>
      </header>
      <main className="public-content">{content}</main>
      <footer className="public-footer">
        Visa Compass · Educational preparation, with sources in view.
      </footer>
    </div>
  );
}
