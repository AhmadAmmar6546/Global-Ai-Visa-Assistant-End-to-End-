# Privacy and security notes

This document describes this codebase's MVP behavior and the work an operator must complete before exposing it to real applicants. It is not a GDPR, UK GDPR, immigration-service, or other legal compliance certification.

## Data stored

| Data | Why it is stored | User control |
| --- | --- | --- |
| Name, email, password hash, email verification timestamp | Account access and verification | Rename, private export, password reset, account deletion. |
| Destination, nationality, residence, jurisdiction, study purpose, intended date | Exact rule scope and preparation organization | Edit case profile; history is retained until case/account deletion. |
| Checklist statuses, notes, not-applicable reasons | Manual preparation tracking | Edit items; case/account deletion removes them. |
| Task titles, due dates, completion | In-app reminders | Edit/delete tasks or delete case. |
| Assistant conversation and interview answers/feedback | Persistent preparation context | Export or delete case/account. |
| Consent flags | Separate cloud AI and notification choices | Grant or withdraw in settings; both start false. |
| Session/token hashes and expiry | Authentication and one-time account actions | Logout revokes current session; password reset/account deletion revokes sessions. |
| Security/reviewer audit events | Investigate authorization denials and rule review | Account deletion removes actor linkage; limited audit records can remain. |

There is no document upload path, storage bucket, OCR extract, payment method, or microphone recording. Do not paste identity numbers, bank details, passport images, or unnecessary sensitive material into notes or chat. Names and preparation text are personal data even without document uploads.

## Consent and transfers

Local assistant mode does not call an external AI provider. Cloud AI requires reviewed `VERIFIED` evidence, an explicit applicant opt-in, server configuration, and available budget; demo and unknown scopes remain local. Provider context includes destination, nationality, residence, jurisdiction, visa type, bounded reviewed rule text, checklist rule IDs/statuses, and the submitted message. The server excludes account names/emails, applicant IDs, private checklist notes/reasons, study purpose, and prior conversation history. The question itself can still contain personal data, so users should avoid sensitive material. The operator must inspect exactly which provider, model, retention controls, processing location, contractual terms, and subprocessors apply before allowing real use. Withdrawing consent prevents future provider calls but cannot retract data already transmitted to that provider.

Notification consent is independent. Current reminders remain inside the app; the MVP does not deliver reminder emails, texts, or push notifications. Verification/reset emails are account-service messages and use configured transactional email. Document processing and voice consents are not implemented because those features are absent.

## Retention and deletion

Personal case content persists until the user deletes the case or account. This release does not run an automated age-based retention job. Account deletion requires the password and cascades through sessions, tokens, applications, checklist items, tasks, messages, profile history, and interview answers. Case deletion removes its child records. Exports omit password/session/token hashes and other applicants' records.

Audit records retain their security purpose after the user reference is nulled; resource UUIDs may remain. The operator must define an audit retention period, implement its enforcement, and determine what counts as personal data in deployment logs. Database backups are managed outside this repository. Deleting live rows does not immediately erase historic backups; the operator must publish backup retention and deletion handling before launch.

## Threat model

| Threat | Implemented control | Remaining responsibility |
| --- | --- | --- |
| User A reads or changes user B's case, task, checklist, chat, interview, or export | Ownership queries on every private route; indistinguishable private-resource 404; denial audit; integration tests. | Independent review, authorization regression checks, and avoidance of direct database exposure. |
| Session theft | Random opaque token, stored hash, HTTP-only cookie, expiry, logout/reset invalidation. | Production HTTPS, secure cookie verification, host/proxy configuration, incident response. |
| Cross-site browser mutation | Strict origin checks and SameSite cookie policy. | Configure canonical APP_URL and reverse proxy; do not add permissive CORS. |
| Password guessing or abusive API traffic | Password hashing, input schemas, database-backed limits. | WAF/edge controls, monitoring, tested recovery, realistic load testing. |
| Client role escalation | Role excluded from account patch; server checks ADMIN. | Restrict operator grant command/database access; review reviewer accounts and use organizational access controls. |
| False source authority or stale rules | Exact registered publisher, snapshot checksum, excerpt comparison, immutable versions, expiry, demo separation. | Human comparison with actual official text; freshness monitoring; knowledgeable reviewer review. |
| Prompt injection in notes or source text | Assistant uses read-only preparation context; citations constrained to known source context; no autonomous write/URL/submission tools. | Evaluate provider output and instruction boundaries; do not add privileged tools without new threat analysis. |
| Secrets or private export in source control/logs | Server-side environment variables; example values only; hashes excluded from export. | Secret manager, access restriction, log redaction, rotation and repository scanning. |
| Compromised dependencies or backups | Locked dependencies and repeatable build/migrations. | Timely advisories, release updates, database encryption and backup/restore drills. |

Database row-level security is not configured. Tenant isolation is enforced in application queries and tested against the real API. PostgreSQL encryption at rest, network encryption, availability, and backup access controls depend on the deployment provider; this repository does not provision or certify them.

## Operator incident procedure

Before launch, name the incident owner and a contact channel, define severity and notification timeframes with qualified advice, retain restricted incident evidence, and rehearse session revocation and database restore. On suspected exposure, restrict affected services, rotate relevant keys, revoke affected sessions, determine which users/data/providers were involved, and record remediation. Avoid placing incident secrets or applicant content in public GitHub issues.

The app does not automatically submit visa applications, contact authorities, make payments, or guarantee any outcome. Adding documents, voice, billing, organizations, or third-party messaging requires a separate privacy and authorization review before implementation.
