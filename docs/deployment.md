# Deployment and release checks

## Required runtime configuration

| Variable/service | Purpose | Requirement |
| --- | --- | --- |
| Node.js 22 or 24 | App/build tooling | Required; use the lockfile. |
| PostgreSQL 17 and `DATABASE_URL` | Durable app data and rate limits | Required, private connection with a restricted application account. |
| `APP_URL` | Canonical origin and account link URL | Required for the deployed HTTPS origin. |
| `RESEND_API_KEY`, `EMAIL_FROM` | Verification/password-reset email | Required for production account onboarding; validate sender and sandbox delivery. |
| `AI_PROVIDER` | `local` default; optional supported provider | Local guidance requires no external credentials. |
| `AI_API_KEY` or `OPENAI_API_KEY`; `OPENAI_MODEL` | OpenAI server-side assistant | Optional; `AI_API_KEY` takes precedence, model allowlist is `gpt-4.1-mini`/`gpt-4o-mini`. |
| `GEMINI_API_KEY`; `GEMINI_MODEL` | Gemini server-side assistant | Optional; model allowlist is `gemini-2.5-flash-lite`/`gemini-2.5-flash`. |
| `AI_DAILY_BUDGET_TOKENS` | App-wide provider cost guard | Conservative daily reservation based on input UTF-8 bytes, output cap, and framing; not metered billing. |
| Redis | Future workers | Not used or required in this release. |

Use platform secret settings, not checked-in `.env` files. The `.env.example` database password is for a local-only database and must be replaced for deployment. The Compose database port binds to localhost. Place production PostgreSQL behind private networking and apply TLS/encryption controls supported by your provider.

## Build and start

1. Provision PostgreSQL and configure the server environment. Confirm access with a least-privilege application account and a separate migration privilege strategy when needed.
2. Install from the lockfile with `npm ci --ignore-scripts`, then `npm run db:generate`. Run `npm run db:migrate`; migrations are committed and production uses deploy mode rather than schema push.
3. Seed the registered publisher directory and explicitly labeled demo data with `npm run db:seed`. This does not approve official requirements or create account passwords.
4. Run `npm run typecheck`, `npm run lint`, and `npm run build` in the release pipeline. Test a disposable database before pointing a process at live applicant data.
5. Start `npm run start` behind a TLS reverse proxy using the canonical `APP_URL`. The platform must route both pages and `/api/*` to this service and preserve correct request origins.
6. Confirm `/api/health` reports connected, then perform production-mode signup, delivered email verification, login, reset, and logout using an operator-owned sandbox address. Do not use test database promotions as email-delivery validation.
7. Grant a reviewer role only to the intended existing verified account with `npm run admin:grant -- email@example.com`. Keep database/operator access restricted.

Do not run integration tests against a production database. They intentionally create accounts, rules, tasks, and synthetic source snapshots. `TEST_BASE_URL` rejects remote hosts, but a localhost process can still connect to a remote database: the operator must verify `DATABASE_URL` is disposable before testing. The source fixture restores the original GB snapshot in normal cleanup; an interrupted process may need operator cleanup. Browser test identities use the `e2e-` prefix and are deleted on normal completion.

Prisma/client is pinned to 6.19.3 with the JavaScript query engine (`engineType = "client"`) and `@prisma/adapter-pg` 7.10.0. The newer adapter fixes PostgreSQL catalog `NAME`/OID 19 handling required by the JavaScript migration engine; the exact mixed versions were validated for migrations and runtime queries. Configuration enables the experimental JavaScript migration engine. This is a deliberate restriction-compatible toolchain choice, not a claim that experimental migration tooling has a production support guarantee. Test deploy migrations and restore against the target PostgreSQL service before release; upgrading Prisma requires rechecking generation, migration, driver behavior, and the integration suite. Installation uses explicit generation after `--ignore-scripts` so an unused native-engine download is not required; npm package integrity and TLS verification remain enabled.

## Release gate

- Validate signup, delivered verification/reset, and session-cookie attributes through the real HTTPS proxy. Confirm an unauthenticated user and another applicant cannot read private APIs.
- Run type/lint/build, the HTTP integration suite, and Chromium desktop/mobile flows against a fresh local database. Review any screenshot or trace failures; passing tests are not a substitute for manual accessibility checks.
- Review demo and unknown messages in every case surface, AI answer, and public description. Do not call the seeded sample checklist official.
- Independently verify each source snapshot and scoped approved rule, define a reviewer refresh schedule, and check expired/rejected versions cannot reappear.
- If enabling a provider, validate credentials, consent refusal, failure fallback, token/cost limits, allowed model, request timeout, and data-handling policy in its sandbox. Local tests do not validate a live service.
- Establish backup frequency/retention, encrypted storage, restricted restore credentials, and perform a restore drill with matching schema migrations. Define database, audit, and log retention with qualified review.
- Check dependency/security advisories, rate limits, logging redaction, monitoring alerts, incident contacts, deletion/export behavior, and support procedures. Run an independent authorization/security assessment before real sensitive use.
- Publish an operator privacy notice covering identity/contact, purpose, lawful basis where applicable, providers, transfers, retention/backups, user rights, and complaint process. Obtain qualified jurisdictional advice before any compliance claim.

## Rollback and operations

Take and test backups before schema changes; Prisma deploy does not automatically roll a migration back. Roll app code back only when it remains compatible with the deployed schema. Follow a written forward-fix or restore procedure for schema failures. Store release versions and migration output in restricted operational logs.

Monitor application error rates, database availability, verification/reset delivery, provider failures/cost, and repeated denial/rate-limit events. The MVP has a health endpoint and database audit trail, not a complete metrics or incident platform. Never paste applicant exports, raw session cookies, or provider keys into public troubleshooting issues.
