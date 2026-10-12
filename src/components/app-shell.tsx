"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import {
  Compass,
  LayoutDashboard,
  BookOpen,
  Settings,
  ShieldCheck,
  LogOut,
  Plus,
  Menu,
  X,
  ArrowUpRight,
} from "lucide-react";
import { api, useAuth } from "@/lib/client";
import { LoadingState } from "@/components/ui";

export function Brand({ light = false }: { light?: boolean }) {
  return (
    <Link href="/" className={`brand ${light ? "brand-light" : ""}`}>
      <span className="brand-mark">
        <Compass size={23} strokeWidth={1.8} />
      </span>
      <span>
        visa<span className="brand-thin">compass</span>
        <small>YOUR NEXT CHAPTER</small>
      </span>
    </Link>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const { user, loading, error } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [logoutError, setLogoutError] = useState("");
  useEffect(() => {
    if (!loading && !user && !error) router.replace("/login");
  }, [loading, user, error, router]);
  if (loading)
    return (
      <div className="app-loading">
        <Brand />
        <LoadingState />
      </div>
    );
  if (error)
    return (
      <div className="app-loading">
        <Brand />
        <p role="alert">{error}</p>
        <button
          className="button button-secondary"
          onClick={() => window.location.reload()}
        >
          Try again
        </button>
      </div>
    );
  if (!user)
    return (
      <div className="app-loading">
        <LoadingState label="Taking you to sign in…" />
      </div>
    );
  const navigation = [
    { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
    { href: "/sources", label: "Source library", icon: BookOpen },
    { href: "/settings", label: "Settings", icon: Settings },
    ...(user.role === "ADMIN"
      ? [{ href: "/admin", label: "Rule review", icon: ShieldCheck }]
      : []),
  ];
  async function logout() {
    try {
      await api("/api/auth/logout", { method: "POST" });
      router.push("/");
      router.refresh();
    } catch (err) {
      setLogoutError(err instanceof Error ? err.message : "Sign out failed.");
    }
  }
  return (
    <div className="app-shell">
      <div className="mobile-app-bar">
        <Brand />
        <button
          className="icon-button"
          aria-label={open ? "Close navigation" : "Open navigation"}
          onClick={() => setOpen(!open)}
        >
          {open ? <X /> : <Menu />}
        </button>
      </div>
      <aside className={`sidebar ${open ? "sidebar-open" : ""}`}>
        <Brand />
        <div className="workspace-label">YOUR WORKSPACE</div>
        <nav aria-label="Main navigation">
          {navigation.map((item) => (
            <Link
              key={item.href}
              onClick={() => setOpen(false)}
              className={`nav-item ${pathname === item.href || (item.href === "/dashboard" && pathname.startsWith("/applications")) ? "nav-active" : ""}`}
              href={item.href}
            >
              <item.icon size={19} />
              {item.label}
              {pathname === item.href && <span className="nav-dot" />}
            </Link>
          ))}
        </nav>
        <Link
          className="button button-primary sidebar-new"
          href="/applications/new"
        >
          <Plus size={17} />
          New application
        </Link>
        <div className="sidebar-note">
          <span className="mini-compass">
            <Compass size={23} />
          </span>
          <h3>
            A little clarity.
            <br />A lot of possibility.
          </h3>
          <p>Keep your plans, sources, and next steps in one place.</p>
          <Link href="/sources">
            Explore the sources <ArrowUpRight size={15} />
          </Link>
        </div>
        <div className="sidebar-account">
          <span className="avatar">{user.name.slice(0, 1).toUpperCase()}</span>
          <div>
            <strong>{user.name}</strong>
            <small>{user.email}</small>
          </div>
          <button
            className="icon-button"
            onClick={logout}
            aria-label="Sign out"
          >
            <LogOut size={17} />
          </button>
        </div>
        {logoutError && <p className="small-error">{logoutError}</p>}
      </aside>
      <div className="app-main">
        <header className="app-topbar">
          <span>Make room for what’s next.</span>
          <div>
            <span className="environment-dot" />
            Personal workspace
            <span className="avatar avatar-small">
              {user.name.slice(0, 1).toUpperCase()}
            </span>
          </div>
        </header>
        <main className="app-content">{children}</main>
        <footer className="app-footer">
          <span>Built for your journey.</span>
          <span>
            Guidance is educational. Visa decisions belong to the authorities.
          </span>
        </footer>
      </div>
    </div>
  );
}
