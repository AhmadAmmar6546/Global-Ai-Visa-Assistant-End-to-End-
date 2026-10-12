# Publish on Vercel

The repository now includes native Next.js Vercel configuration. A public site
has not been created yet: Vercel authentication and a hosted database are
external prerequisites. Publishing the Codex cloud environment snapshots the
development workspace; it does not publish this website.

## Required service settings

1. Sign in to [Vercel](https://vercel.com/new) and import
   `AhmadAmmar6546/Global-Ai-Visa-Assistant-End-to-End-`, branch `main`.
2. Create a hosted PostgreSQL database, for example through Vercel's Neon
   integration. Obtain a pooled runtime URL and the same database's direct URL.
   Keep TLS verification enabled. A localhost database cannot serve Vercel.
3. Set these **Production** environment variables securely in Vercel:

   | Name | Value |
   | --- | --- |
   | `DATABASE_URL` | Hosted runtime connection string. |
   | `MIGRATION_DATABASE_URL` | Direct connection to the same database for migrations and seed. Omit only when `DATABASE_URL` is already direct. |
   | `RESEND_API_KEY` | Your server-side transactional email key. |
   | `EMAIL_FROM` | Sender verified with your email provider. |
   | `AI_PROVIDER` | `local` initially; no AI key required. |

4. Keep the install/build commands from `vercel.json`. Production builds generate
   the client, apply committed migrations, seed without overwriting reviewed
   records, then build Next.js. A failed configuration/migration stops deployment.
   Serialize production releases instead of launching competing schema changes.
5. Deploy. Vercel displays the real public HTTPS URL after success. Account links
   use Vercel's production hostname automatically. For a custom domain, set
   `APP_URL` to that HTTPS origin and redeploy.
6. Check `/api/health`, `/api/sources`, delivered email verification, signup,
   checklist persistence, and account export/delete on the deployed service.
   Local tests do not validate the hosted database or live email delivery.

Automatic preview deployments are skipped initially to prevent connecting
unreviewed preview code to production applicant data. To enable previews later,
remove the `ignoreCommand` gate and configure a separate preview database with
its schema initialized before use. Never reuse production credentials for tests.

## Deploying through the assistant

For the assistant to create the Vercel project and deployment, add `VERCEL_TOKEN`
securely in Codex environment settings, scoped to your Vercel account/team.
The token is used only through `api.vercel.com`; never paste it into chat.
Provide hosted connection settings as `DEPLOY_DATABASE_URL` and
`DEPLOY_MIGRATION_DATABASE_URL`, and the verified sender as `EMAIL_FROM`.
These deployment-only URL names keep the cloud development database local.
The assistant forwards them to the Vercel project under the runtime names above;
connection strings must be raw secure variables, not HTTPS-proxy placeholders.

Live email configuration also requires a securely supplied `RESEND_API_KEY`.
Alternatively, enter those service variables directly in Vercel while importing
the repository. The final live URL must come from an actual successful deployment;
an import/setup link is not a live application URL.
