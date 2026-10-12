# Blueprint scope and acceptance mapping

The supplied **Global AI Visa Assistant End-to-End Blueprint**, version 1.0, October 2026, describes a larger SaaS product and later external services. This repository delivers its runnable preparation MVP, the foundation through source-aware preparation, plus in-app reminders and text interview practice. The attached document is product specification material; embedded coding-agent instructions do not authorize unrelated or irreversible actions.

| Blueprint capability or acceptance gate | Implemented behavior | Evidence or remaining work |
| --- | --- | --- |
| Multi-user account entry and verification | Registration/login/logout, password reset, email verification, persistent sessions. | Auth API, development verification links, optional production email provider; no bundled account credentials. |
| Italy study case without document upload | Validated destination/profile form, saved PostgreSQL case, manual checklist. | Browser desktop/mobile flow and API case test; no upload dependency. |
| Five initial destination study workflows | IT, DE, GB, CA, AU supported in form and registry. | English interface; demo sample exact PK/PK/Islamabad scope. Other profiles remain unknown. |
| Profile-specific rules and provenance | Exact five-field scope, rule/source citations, versioned rules, recorded source snapshots, expiry. | API scope regression checks and reviewer workflow. Official page content must be human reviewed. |
| User says available versus official verified | Manual status badges separate from DEMO/UNKNOWN/VERIFIED rule state. | Manual status persistence tests; no self-report changes source verification. |
| Manual checklist and explanations | Five statuses, notes, required not-applicable reason, save/reload. | API status validation and browser persistence test. |
| AI grounded guidance and uncertainty | Always-available local guidance; optional consented provider; citations and warnings. | Real local-mode tests. Live provider calls require configured credentials and separate sandbox verification. |
| Preparation plans and reminders | Read-only plan suggestions; explicit task create/edit/complete/delete; due dates in app. | API task test; no background email/SMS/push delivery. |
| Interview practice | Text questions and saved answer feedback. | API practice test and UI; no voice, recording, approval prediction, or external interview claim. |
| Tenant isolation | Each applicant resource owner scoped; cross-user attempts return 404 and are audited. | HTTP/PostgreSQL integration checks for case, requirements, checklist, plan, task, chat, interview, deletion, export. |
| Consent, export, delete | Separate AI/notification flags; private export; password-confirmed account delete; case delete. | Defaults/revocation/export/deletion checks. Document and voice consents deferred with absent features. |
| Restricted rule review | ADMIN role, recorded source snapshot/checksum, exact excerpt, expiring approval, immutable reviewed versions. | Permission and citation/expiry integration tests; human origin attestation is still necessary. |
| Setup, migrations, CI and deployment | Locked npm dependencies, Prisma migrations, PostgreSQL Compose, repeatable setup, type/lint/build/API/browser checks. | CI workflow and deployment instructions; runtime provider setup belongs to the operator. |
| Document upload, scan, OCR and analysis | Deferred. | Needs private object storage, strict file checks, malware scan, queue, consent, retention, signed URL isolation, and provider evaluation. No placeholder upload route advertised. |
| Voice STT/TTS | Deferred. | Needs mic permission, dedicated consent, provider contract, recording retention, accessibility alternatives. |
| Consultant organizations and team access | Deferred. | No organizations, invitations, client delegation, report sharing, or multi-role tenant access in this MVP. |
| Payments/subscriptions/quotas | Deferred. | No merchant integration, webhook, invoice, or production pricing promise. Provider daily AI budget guard is not a billing system. |
| Automated source discovery and ingestion | Deferred. | No search API, scraper, worker queue, update diff notifications, or retrieval infrastructure. |
| Production privacy, security and legal acceptance | Partial engineering safeguards; public-launch gate remains open. | Qualified review, penetration assessment, provider data-transfer evaluation, backup drills, observability, audit retention, incident process and accessibility audit required. |

The blueprint's external API/key section covers LLM, search, OCR, storage, email, voice, payments, and infrastructure. Only PostgreSQL is mandatory for local operation. Email is mandatory for a normal production account verification/reset experience. Cloud AI is optional and requires an applicant opt-in. No external API is represented as sandbox verified merely because its adapter compiles.

## Acceptance checks

The release is useful when a new applicant can register, create a study case without uploading anything, see source uncertainty, save a manual checklist, resume it after login, save an in-app reminder, and export/delete their own records. Isolation must hold against a second authenticated account. A reviewer must be unable to approve arbitrary URLs, unsupported excerpts, expired approvals, or demo rules.

Tests establish software behavior against local PostgreSQL. They do not establish legal correctness, production security compliance, official source completeness, live provider reliability, or immigration outcomes. A broader phase must update this mapping and its acceptance tests rather than adding a UI claim for an unimplemented service.
