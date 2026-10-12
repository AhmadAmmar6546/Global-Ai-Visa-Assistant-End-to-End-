"use client";

import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  CheckCheck,
  Compass,
  Globe2,
  BookOpen,
  MessageCircle,
  MoveUpRight,
  ShieldCheck,
  Sparkles,
  ListChecks,
} from "lucide-react";
import { Brand } from "@/components/app-shell";
import { CountryArt } from "@/components/country-art";
import { countries } from "@/lib/client";

export default function Home() {
  return (
    <div className="landing">
      <header className="landing-header">
        <div className="landing-nav">
          <Brand />
          <nav aria-label="Website navigation">
            <a href="#how-it-works">How it works</a>
            <a href="#destinations">Destinations</a>
            <Link href="/sources">
              Source library <ArrowUpRight size={13} />
            </Link>
          </nav>
          <div className="landing-auth">
            <Link href="/login" className="login-link">
              Log in
            </Link>
            <Link href="/register" className="button button-primary">
              Get started <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </header>
      <main>
        <section className="hero landing-container">
          <div className="hero-copy">
            <div className="hero-kicker">
              <span className="tiny-star">
                <Sparkles size={13} />
              </span>
              A CLEARER PATH TO STUDYING ABROAD
            </div>
            <h1>
              Your next chapter.
              <br />A clearer <span>way there.</span>
            </h1>
            <p>
              Big plans deserve a little clarity. Bring your visa checklist,
              trusted sources, and next steps together — so you can focus on
              what’s ahead.
            </p>
            <div className="hero-actions">
              <Link
                href="/register"
                className="button button-primary button-large"
              >
                Start your journey <ArrowRight size={18} />
              </Link>
              <a href="#how-it-works" className="hero-secondary">
                See how it works <MoveUpRight size={17} />
              </a>
            </div>
            <div className="hero-promises">
              <span>
                <Check size={14} />
                Built around your profile
              </span>
              <span>
                <Check size={14} />
                Sources you can inspect
              </span>
            </div>
            <div className="hero-country-pills">
              {countries.map((c) => (
                <span key={c.code}>
                  {c.flag} {c.name}
                </span>
              ))}
            </div>
          </div>
          <div className="hero-visual">
            <div className="hero-grid" />
            <div className="visual-eyebrow">
              <span className="environment-dot" /> YOUR WORLD, WITHIN REACH
            </div>
            <svg className="route-art" viewBox="0 0 540 430" aria-hidden="true">
              <defs>
                <linearGradient id="continent" x1="0" y1="0" x2="1" y2="1">
                  <stop stopColor="#40716e" />
                  <stop offset="1" stopColor="#1c464b" />
                </linearGradient>
              </defs>
              <path
                d="M75 103L126 69L179 76L200 100L232 109L225 135L202 146L190 167L151 175L145 210L117 196L112 164L81 149L60 127Z"
                fill="url(#continent)"
              />
              <path
                d="M167 212L202 206L232 227L239 264L223 284L215 316L193 344L176 318L178 284L160 254Z"
                fill="url(#continent)"
              />
              <path
                d="M276 120L315 102L345 118L379 91L434 112L474 147L447 177L414 171L395 193L359 168L344 151L319 155L300 172L280 151Z"
                fill="url(#continent)"
              />
              <path
                d="M280 178L318 168L349 189L357 222L338 263L320 286L293 270L284 229L267 201Z"
                fill="url(#continent)"
              />
              <path
                d="M411 279L448 264L475 282L484 311L458 332L420 324L404 299Z"
                fill="url(#continent)"
              />
              <path
                d="M357 179Q318 33 149 116"
                stroke="#e9c68e"
                strokeWidth="1.5"
                strokeDasharray="5 7"
              />
              <path
                d="M357 179Q429 207 450 297"
                stroke="#e9c68e"
                strokeWidth="1.5"
                strokeDasharray="5 7"
              />
              <path
                d="M357 179Q304 128 308 135"
                stroke="#e9c68e"
                strokeWidth="1.5"
                strokeDasharray="5 7"
              />
              <circle cx="357" cy="179" r="14" fill="#f2bf73" opacity=".15" />
              <circle cx="357" cy="179" r="5" fill="#f2bf73" />
              <circle cx="149" cy="116" r="5" fill="#e5f2e8" />
              <circle cx="308" cy="135" r="5" fill="#e5f2e8" />
              <circle cx="450" cy="297" r="5" fill="#e5f2e8" />
              <text x="367" y="176" fill="#cad8d4" fontSize="11">
                YOUR JOURNEY
              </text>
            </svg>
            <div className="floating-destination">
              <span className="destination-flag">🇮🇹</span>
              <div>
                <small>YOUR NEXT CHAPTER</small>
                <strong>Study in Italy</strong>
                <span>A plan. One step at a time.</span>
              </div>
              <ArrowUpRight size={19} />
            </div>
            <div className="floating-checklist">
              <div className="floating-card-top">
                <span className="floating-icon">
                  <ListChecks size={18} />
                </span>
                <strong>
                  Less wondering.
                  <br />
                  More moving forward.
                </strong>
              </div>
              <div className="mini-check-row">
                <CheckCheck size={15} />
                <span>Your profile</span>
                <span className="mini-done">Ready</span>
              </div>
              <div className="mini-check-row">
                <BookOpen size={15} />
                <span>Source-led checklist</span>
                <ArrowRight size={14} />
              </div>
              <div className="mini-check-row">
                <MessageCircle size={15} />
                <span>A space for your questions</span>
                <ArrowRight size={14} />
              </div>
              <div className="sample-caption">
                Illustrative workflow · no application data
              </div>
            </div>
            <div className="hero-visual-footer">
              <Compass size={18} />
              <span>
                A WORLD OF POSSIBILITIES.
                <br />
                <strong>A PLAN THAT STARTS WITH YOU.</strong>
              </span>
              <span className="visual-number">01 — 05</span>
            </div>
          </div>
        </section>
        <div className="trust-strip">
          <div className="landing-container">
            <span>
              Thoughtful guidance.
              <br />
              <strong>Grounded in transparency.</strong>
            </span>
            <div>
              <ShieldCheck size={22} />
              <span>Clear source attribution</span>
            </div>
            <div>
              <Globe2 size={22} />
              <span>Five study destinations</span>
            </div>
            <div>
              <CheckCheck size={22} />
              <span>Progress on your terms</span>
            </div>
          </div>
        </div>
        <section id="how-it-works" className="how-section landing-container">
          <div className="section-heading">
            <div>
              <span className="eyebrow">
                A LITTLE STRUCTURE GOES A LONG WAY
              </span>
              <h2>
                From “where do I start?”
                <br />
                to “here’s my next step.”
              </h2>
            </div>
            <p>Your journey is personal. Your preparation should be, too.</p>
          </div>
          <div className="steps-grid">
            {[
              {
                n: "01",
                icon: Compass,
                title: "Start with your story",
                text: "Choose your destination and tell us about your study plans. Your profile sets the scope of your checklist.",
              },
              {
                n: "02",
                icon: BookOpen,
                title: "Understand what’s needed",
                text: "Explore requirements alongside their sources. See clearly when guidance is verified, a demo, or unknown.",
              },
              {
                n: "03",
                icon: CheckCheck,
                title: "Move forward with a plan",
                text: "Keep track of what you have, add reminders, ask questions, and practice explaining your plans.",
              },
            ].map((s) => (
              <article className="step-card" key={s.n}>
                <div className="step-card-top">
                  <span className="step-icon">
                    <s.icon size={23} />
                  </span>
                  <span>{s.n}</span>
                </div>
                <h3>{s.title}</h3>
                <p>{s.text}</p>
              </article>
            ))}
          </div>
        </section>
        <section id="destinations" className="destinations-section">
          <div className="landing-container">
            <div className="section-heading">
              <div>
                <span className="eyebrow">THINK BIG. START SOMEWHERE.</span>
                <h2>Where will your story go?</h2>
              </div>
              <Link href="/register" className="text-link">
                Explore your options <ArrowRight size={16} />
              </Link>
            </div>
            <div className="destination-grid">
              {countries.map((c) => (
                <Link
                  href={`/applications/new?destination=${c.code}`}
                  className="destination-card"
                  key={c.code}
                >
                  <CountryArt code={c.code} />
                  <div>
                    <span className="destination-card-title">
                      {c.name}
                      <ArrowUpRight size={17} />
                    </span>
                    <small>{c.caption}</small>
                  </div>
                </Link>
              ))}
            </div>
            <p className="destinations-note">
              <ShieldCheck size={15} />
              Current checklists include clearly labeled demonstration rules.
              Official requirements depend on your exact profile and source
              review.
            </p>
          </div>
        </section>
        <section className="landing-container closing-section">
          <div className="closing-icon">
            <Compass size={37} strokeWidth={1.25} />
          </div>
          <div>
            <span className="eyebrow">
              YOU DON’T NEED EVERY ANSWER TO BEGIN
            </span>
            <h2>Just a place to take the first step.</h2>
            <p>Create your workspace and make a little room for what’s next.</p>
          </div>
          <Link href="/register" className="button button-primary button-large">
            Let’s get started <ArrowRight size={18} />
          </Link>
        </section>
      </main>
      <footer className="landing-footer landing-container">
        <div>
          <Brand />
          <p>Clarity for the journey ahead.</p>
        </div>
        <div className="footer-links">
          <Link href="/sources">Source library</Link>
          <Link href="/login">Sign in</Link>
          <Link href="/register">Create account</Link>
        </div>
        <p className="footer-disclaimer">
          An educational preparation tool. No legal advice, approval guarantees,
          or official visa decisions.
        </p>
      </footer>
    </div>
  );
}
