# Global AI Visa Assistant

A working visa preparation MVP built from the **Global AI Visa Assistant End-to-End Blueprint**. Applicants can create study visa cases, organize manual checklists, save in-app reminders, ask a source-aware assistant, and practice interview answers without uploading documents.

**Live app:** <https://global-ai-visa-assistant-end-to-end-alpha.vercel.app>. Public pages and the hosted database passed HTTPS checks. Email currently uses Resend's test sender; verification mail is limited to the Resend account owner's email until a sending domain is verified. Live email delivery has not been tested.

The initial interface is English. Destinations are Italy, Germany, the United Kingdom, Canada, and Australia. Seeded checklists are **educational demonstrations** for a Pakistani national living in Pakistan with Islamabad jurisdiction. They are not official visa requirements. Other profiles display **UNKNOWN** until an administrator reviews matching source material. No part of the app guarantees eligibility or approval.

## Run locally

Use Node.js 22 or 24, npm, and PostgreSQL 17. Docker Compose can provide PostgreSQL:

```bash
cp .env.example .env
docker compose up -d db
npm ci --ignore-scripts
npm run db:generate
npm run db:migrate
npm run db:seed
npm run dev
```

Open <http://localhost:3000>. Register your own account; no account or administrator password is bundled. Development registration returns an email verification link on screen. In production, email delivery must be configured and verification is required before private case operations.

`npm run setup` performs dependency installation and generation, starts the Docker Compose database, and runs migrations and seeding. Use the individual commands above when connecting to an existing PostgreSQL service; set `DATABASE_URL` and omit the Docker command. Keep `.env` private and use `.env.example` only as a template. Redis is a reserved optional Compose profile for future workers and is not required by this MVP.

Prisma/client 6.19.3 and PostgreSQL adapter 7.10.0 are pinned with the JavaScript query engine; migrations use the experimental JavaScript migration path. Adapter 7.10.0 fixes PostgreSQL catalog `NAME` type handling required by that path. This avoids downloading a native engine in restricted cloud environments. Dependency installation retains npm integrity checks; generation is run explicitly after installation. See the deployment notes before changing Prisma versions or migration tooling.

To give an existing verified account reviewer access on an environment you operate:

```bash
npm run admin:grant -- applicant@example.com
```

The public landing page and `/sources` require no account. After signing in, `/dashboard` shows real saved cases; `/applications/new` creates a case; the case page provides Overview, Checklist, Assistant, and Interview tabs. `/settings` controls separate AI and notification consents, private export, and password-confirmed account deletion. Reviewers use `/admin`.

## Check the project

```bash
npm run typecheck
npm run test:deployment
npm run test:email
npm run lint
npm run build
# Keep the local app running in another terminal, with the same DATABASE_URL.
npm run test:integration
npx playwright install chromium
npm run test:e2e
```

Integration tests use real HTTP requests and PostgreSQL. They create uniquely named local test users and remove their fixtures afterward. Run them against a disposable local development database; `TEST_BASE_URL` defaults to `http://127.0.0.1:3000` and rejects remote hosts. Browser tests cover signup, a no-upload Italy case, checklist persistence, and warnings at desktop and mobile sizes. CI runs these checks against a fresh PostgreSQL service.

If your environment already provides Chromium, skip the browser download and run `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npm run test:e2e` with its actual path. The standard CI browser installation remains available on networks that permit Playwright's download hosts.

## AI and source review

Local guidance works without an API key and does not send case data to an external provider. A supported server-side provider can be configured through `.env`; it runs only for reviewed `VERIFIED` evidence after the applicant explicitly enables cloud AI consent. `DEMO` and `UNKNOWN` always use local guidance. Provider failures or budget limits fall back to local guidance. Source references link to government publishers. A publisher link alone does not establish that a requirement was checked.

Manual statuses such as **Have it** and **Reviewed** remain applicant self-reports. Official rule review is separate: reviewers record official text, inspect a matching excerpt, create a scoped draft, and approve it with an expiry. Demo rules cannot be promoted to official rules. See [source governance](docs/source-governance.md) for review limits and expiry behavior.

## Scope and deployment

This is an MVP, not a production compliance certification. Document uploads/OCR, voice, payments, consultant organizations, automatic source discovery, queued email/SMS reminders, and multilingual UI remain future work. Never enter passport numbers or bank documents into free-text fields.

- [Blueprint scope and acceptance mapping](docs/blueprint-scope.md)
- [MVP requirements](docs/requirements.md)
- [Architecture and data flow](docs/architecture.md)
- [API contract](docs/api.md)
- [Privacy, threats, and operator responsibilities](docs/privacy-and-security.md)
- [Deployment and release checks](docs/deployment.md)
- [Vercel publishing steps](docs/vercel.md)
- [Validation results](docs/validation.md)

Before a public launch, configure real email delivery and TLS, replace development credentials, perform independent security and source reviews, establish backup/restore and privacy procedures, and validate provider configuration. Do not advertise external services as working until their own sandbox checks pass.
