# API contract

All bodies and responses use JSON. Errors are `{ "error": "message" }`. Dates serialize as ISO timestamps. Except for health, account entry points, and the source directory, reads require an authenticated session cookie. Administrative endpoints also require `ADMIN`. Private resource queries enforce ownership on the server.

For a browser mutation, send an `Origin` equal to the app origin. Local non-browser clients can omit `Origin` and send `x-requested-with: visa-assistant`. This header is a script convention, not an authentication credential; the session cookie and server-side ownership checks are still required. Do not allow arbitrary origins at a reverse proxy.

## Authentication and account

| Method and route | Request | Result |
| --- | --- | --- |
| `GET /api/health` | None | `{status:"ok", database:"connected"}` only after a database check. |
| `POST /api/auth/register` | `{name,email,password}` | `201 {user,developmentVerificationUrl?}` plus session cookie. |
| `POST /api/auth/login` | `{email,password}` | `{user}` plus session cookie. |
| `POST /api/auth/logout` | `{}` | `{ok:true}` and revocation of the current session. |
| `GET /api/auth/me` | None | `{user}` or `{user:null}`. |
| `GET /api/auth/verify-email?token=...` | One-time token | Verifies the email; follow the on-screen account flow. |
| `POST /api/auth/resend-verification` | `{}` plus account session | `{ok:true,developmentVerificationUrl?}`; replaces an unused link and is rate limited. |
| `POST /api/auth/forgot-password` | `{email}` | Generic `{ok:true,developmentResetUrl?}`; no production account enumeration. |
| `POST /api/auth/reset-password` | `{token,password}` | Password update; old sessions are revoked. |
| `PATCH /api/account` | Any of `{name,aiConsent,notificationConsent}` | `{user}`; role and password hash cannot be patched. |
| `GET /api/account/export` | None | Private JSON of the requesting user's personal data, without authentication hashes. |
| `DELETE /api/account` | `{password}` | `{ok:true}`; deletes owned records and sessions. |

Passwords must contain letters and digits and be between 12 and 128 characters. Public user fields are `id`, `email`, `name`, `role`, `emailVerifiedAt`, `aiConsent`, and `notificationConsent`. Development links are shown only in development; production delivery requires configured transactional email.

## Cases and preparation

| Method and route | Request | Result |
| --- | --- | --- |
| `GET /api/applications` | None | `{applications}` belonging to the current user. |
| `POST /api/applications` | Case profile below | `201 {application}`. No document or upload is required. |
| `GET /api/applications/:id` | None | `{application}` with checklist rules/sources, tasks, messages, and profile history. |
| `PATCH /api/applications/:id` | Changed profile fields | `{application}` after versioning and checklist scope synchronization. |
| `DELETE /api/applications/:id` | None | `{ok:true}` with child-record deletion. |
| `GET /api/applications/:id/requirements` | None | `{verificationStatus,items,sources,notice}`. |
| `PATCH /api/checklist/:id` | `{status,notes?,reason?}` | `{item}`. `NOT_APPLICABLE` requires a nonempty reason. |
| `POST /api/tasks` | `{applicationId,title,dueAt?}` | `201 {task}`; explicit user action only. |
| `PATCH /api/tasks/:id` | `{title?,dueAt?,completed?}` | `{task}`. |
| `DELETE /api/tasks/:id` | None | `{ok:true}`. |
| `GET /api/applications/:id/plan` | None | `{tasks:[{title,description,priority,sourceUrl?}],notice}`; suggestions are not persisted. |
| `POST /api/ai/chat` | `{applicationId,message}` | `{message:{id,role,content,citations},mode:"local"|"provider"}`. |
| `POST /api/interview/session` | `{applicationId,question?,answer?}` | `{questions,feedback?}`; an explicit answer is saved for practice. |

Case profile:

```json
{
  "destination": "IT",
  "nationality": "PK",
  "residence": "PK",
  "jurisdiction": "Islamabad",
  "visaType": "study",
  "purpose": "Study at a university",
  "intendedDate": "2030-09-01"
}
```

Destination is one of `IT`, `DE`, `GB`, `CA`, `AU`; visa type is `study`. Nationality and residence are two-letter country codes. The defaults are `PK`, `PK`, and `Islamabad`. Intended date is optional and supports a calendar date or ISO timestamp; impossible calendar dates are rejected. Accepted manual statuses are `NOT_STARTED`, `HAVE_IT`, `NEED_HELP`, `NOT_APPLICABLE`, and `REVIEWED`. A status is a user statement, not official verification.

## Sources and reviewers

| Method and route | Request | Result |
| --- | --- | --- |
| `GET /api/sources` | None; public | `{sources}` with registered publisher links and source provenance. |
| `GET /api/admin/rules` | Reviewer session | `{rules}` with source records. |
| `POST /api/admin/rules` | `{sourceId,destination,nationality,residence,jurisdiction,visaType,title,description,sourceExcerpt}` | `201 {rule}`; creates an immutable-version draft rather than changing a published record. |
| `POST /api/admin/sources/:id/snapshot` | `{excerpt,confirmOfficialOrigin:true}` | Records reviewer-provided source text, capture time, and checksum. |
| `PATCH /api/admin/rules/:id` | `{reviewStatus:"APPROVED"|"REJECTED",validUntil?}` | `{rule}` with reviewer audit. Approval requires a supported official publisher, verified snapshot checksum, exact excerpt, and future expiry within one year. |
| `GET /api/admin/audit` | Reviewer session | `{logs}` of recent security/administration activity. |

The app does not fetch or certify a source merely because an administrator pastes text. Reviewers must compare the recorded text with the official page. Existing reviewed rule records cannot be reviewed again; create a new draft version.

## Response failures

| Code | Meaning |
| --- | --- |
| `400` | Invalid schema, impossible date, unsupported review evidence, or invalid ID. |
| `401` | Missing/expired session or invalid password. |
| `403` | Reviewer privilege missing, invalid origin, or required verified account/consent absent. |
| `404` | Resource missing or outside the authenticated applicant's ownership. |
| `409` | Concurrent profile change or immutable/stale review conflict. |
| `429` | Database-backed rate limit exceeded. |
| `500` | Unexpected server failure; sensitive details remain server-side. |
| `503` | Required production email delivery is not configured. |

This MVP has bounded list results rather than public pagination or idempotency keys. Application/task writes should not be automatically replayed after an uncertain network response. There are no upload, OCR, voice, billing, external messaging, or visa submission endpoints.
