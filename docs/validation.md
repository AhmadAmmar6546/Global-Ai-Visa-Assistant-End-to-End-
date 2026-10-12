# Validation record

Validated in the cloud development environment on 12 October 2026. Tests use
local PostgreSQL and synthetic accounts; those accounts and temporary source
fixtures are removed by the test cleanup.

| Check | Result |
| --- | --- |
| Clean `npm run setup` | Passed: frozen installation, client generation, database readiness, migrations and seeding. |
| Repeat migration and seed | Passed; no pending migrations and no duplicate seed records. |
| `npm run lint` | Passed. |
| `npm run typecheck` | Passed, including generated Next.js route types. |
| `npm run build` | Passed. |
| `npm run test:integration` | 33 real HTTP/PostgreSQL checks passed. |
| Desktop and mobile Chromium E2E | 2 tests passed; actual signup, verification, no-upload case, checklist persistence, source notices and UNKNOWN profile handling. |
| `npm audit --omit=dev` | Zero reported runtime dependency vulnerabilities. |
| Docker application image | Built successfully; standalone runtime passed database health, source-directory reads and landing-page requests. |
| Vercel deployment preparation | Local build wrapper, 12 origin checks, and failure on missing production email settings passed. |
| Hosted Vercel deployment | Production deployment of `815cedc` reached `READY` on 12 October 2026; hosted migrations and seed completed. |
| Public HTTPS smoke | Landing, login and registration pages returned 200; all 10 referenced CSS/JS assets returned 200. `/api/health` returned `database: connected`, `/api/sources` returned five sources, and anonymous `/api/applications` returned 401. No production accounts were created or email sent. |

The pinned `deepmerge-ts` override removes its reported runtime advisory and was
checked against Prisma config loading, client generation and migrations. A full
audit including developer tools reports the upstream `braces` advisory
GHSA-vfj7-8cjw-p6xm through Next's ESLint plugin. That dependency is part of lint
tooling, not the standalone application runtime; its upstream remediation is
still outstanding. No TLS, checksum or npm integrity verification was disabled.

The restricted build environment required its configured proxy, its public CA
as the optional `build_ca` BuildKit mount, and a Docker host mapping for the
proxy hostname because Docker bridge DNS could not resolve it. These are build
environment settings; no proxy credentials or CA data are committed.

The public application is available at
<https://global-ai-visa-assistant-end-to-end-alpha.vercel.app>.
Production browser rendering was not verified because local Chromium lacked the
environment proxy CA; HTTPS requests kept certificate verification enabled.
The configured Resend test sender can only deliver to the Resend account owner;
a verified sending domain is required for other recipients.

Live email delivery, cloud AI responses, official legal-source verification,
and a fresh cloud snapshot restore were not validated. Demo rules
remain unverified. GitHub CI configuration is included; this local record does
not claim that a remote GitHub Actions run has completed.
