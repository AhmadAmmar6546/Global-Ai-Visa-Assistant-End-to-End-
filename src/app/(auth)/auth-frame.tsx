import Link from "next/link";
import { ArrowUpRight, FileCheck2, MapPinned, ShieldCheck } from "lucide-react";
import type { ReactNode } from "react";
import { Brand } from "@/components/app-shell";

export function AuthFrame({ children }: { children: ReactNode }) {
  return (
    <main className="auth-layout">
      <section className="auth-story">
        <Brand light />
        <div className="auth-story-copy">
          <span className="eyebrow">A clearer path abroad</span>
          <h1>
            Your next chapter
            <br /> starts with a plan.
          </h1>
          <p>
            Keep your study visa journey organized, from your first question to
            your next step.
          </p>
          <div className="auth-points">
            <div>
              <span>
                <MapPinned size={20} />
              </span>
              <p>
                <strong>A workspace for your journey</strong>
                <br />
                Your applications, checklists, and reminders in one place.
              </p>
            </div>
            <div>
              <span>
                <FileCheck2 size={20} />
              </span>
              <p>
                <strong>Sources you can inspect</strong>
                <br />
                See the source and review status behind each requirement.
              </p>
            </div>
            <div>
              <span>
                <ShieldCheck size={20} />
              </span>
              <p>
                <strong>Your information, your control</strong>
                <br />
                Choose AI consent, export your data, or delete your account.
              </p>
            </div>
          </div>
        </div>
        <div className="auth-story-footer">
          <span>Made for the journey ahead.</span>
          <Link href="/sources">
            Explore sources <ArrowUpRight size={15} />
          </Link>
        </div>
      </section>
      <section className="auth-form-side">
        <div className="auth-card">{children}</div>
        <p className="auth-disclaimer">
          Visa Compass helps you organize and research. Always confirm current
          requirements with the official authority.
        </p>
      </section>
    </main>
  );
}
