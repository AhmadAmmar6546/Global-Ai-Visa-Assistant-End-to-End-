"use client";

import { useCallback, useEffect, useState } from "react";

export type PublicUser = {
  id: string;
  email: string;
  name: string;
  role: string;
  emailVerifiedAt: string | null;
  aiConsent: boolean;
  notificationConsent: boolean;
};
export type Source = {
  id: string;
  destination: string;
  title: string;
  url: string;
  official: boolean;
  fetchedAt: string | null;
  excerpt: string;
  checksum?: string | null;
};
export type Rule = {
  id: string;
  sourceId: string;
  destination: string;
  nationality: string;
  residence: string;
  jurisdiction: string;
  visaType: string;
  title: string;
  description: string;
  sourceExcerpt: string;
  reviewStatus: string;
  isDemo: boolean;
  version: number;
  verifiedAt: string | null;
  validUntil: string | null;
  source: Source;
};
export type ChecklistItem = {
  id: string;
  status: string;
  notes: string;
  reason: string;
  updatedAt: string;
  rule: Rule;
};
export type Task = {
  id: string;
  title: string;
  completed: boolean;
  dueAt: string | null;
};
export type Application = {
  id: string;
  destination: string;
  nationality: string;
  residence: string;
  jurisdiction: string;
  visaType: string;
  purpose: string;
  intendedDate: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
  checklist?: ChecklistItem[];
  tasks?: Task[];
  messages?: Array<{
    id: string;
    role: string;
    content: string;
    citations: unknown;
    createdAt: string;
  }>;
  verificationStatus?: string;
  _count?: { checklist: number; tasks: number };
};

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body && !(init.body instanceof FormData))
    headers.set("Content-Type", "application/json");
  headers.set("x-requested-with", "visa-assistant");
  const response = await fetch(path, {
    ...init,
    headers,
    credentials: "same-origin",
    cache: "no-store",
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok)
    throw new Error(result.error || `Request failed (${response.status}).`);
  return result as T;
}

export function useAuth() {
  const [user, setUser] = useState<PublicUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const refresh = useCallback(async () => {
    try {
      const result = await api<{ user: PublicUser | null }>("/api/auth/me");
      setUser(result.user);
      setError("");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not load your account.",
      );
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    let active = true;
    void api<{ user: PublicUser | null }>("/api/auth/me")
      .then((result) => {
        if (active) {
          setUser(result.user);
          setError("");
        }
      })
      .catch((err) => {
        if (active)
          setError(
            err instanceof Error ? err.message : "Could not load your account.",
          );
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    const changed = () => {
      void refresh();
    };
    window.addEventListener("visa-auth-changed", changed);
    return () => {
      active = false;
      window.removeEventListener("visa-auth-changed", changed);
    };
  }, [refresh]);
  return { user, loading, error, refresh };
}

export const countries = [
  {
    code: "IT",
    name: "Italy",
    flag: "🇮🇹",
    caption: "Find your next chapter",
    color: "#d5e8db",
  },
  {
    code: "DE",
    name: "Germany",
    flag: "🇩🇪",
    caption: "Ideas without borders",
    color: "#f0d6b4",
  },
  {
    code: "GB",
    name: "United Kingdom",
    flag: "🇬🇧",
    caption: "A world of opportunity",
    color: "#d8def2",
  },
  {
    code: "CA",
    name: "Canada",
    flag: "🇨🇦",
    caption: "Room to grow",
    color: "#f1d6cf",
  },
  {
    code: "AU",
    name: "Australia",
    flag: "🇦🇺",
    caption: "Explore new horizons",
    color: "#d9e7ef",
  },
];
export function countryName(code: string) {
  const profileCountries: Record<string, string> = {
    PK: "Pakistan",
    IN: "India",
    BD: "Bangladesh",
    US: "United States",
    AE: "United Arab Emirates",
    SA: "Saudi Arabia",
    FR: "France",
  };
  return (
    countries.find((c) => c.code === code)?.name ||
    profileCountries[code] ||
    code
  );
}
export function dateLabel(date: string | null | undefined) {
  return date
    ? new Intl.DateTimeFormat("en", {
        month: "short",
        day: "numeric",
        year: "numeric",
        // Calendar inputs are stored at UTC midnight; preserve the chosen day.
        ...(/^\d{4}-\d{2}-\d{2}(?:T00:00:00(?:\.000)?Z)?$/.test(date)
          ? { timeZone: "UTC" }
          : {}),
      }).format(new Date(date))
    : "Not set";
}
