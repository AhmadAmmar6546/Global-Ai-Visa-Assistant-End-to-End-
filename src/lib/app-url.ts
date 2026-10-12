export function resolveAppUrl(environment: NodeJS.ProcessEnv = process.env) {
  const vercelHost = environment.VERCEL_ENV === "production"
    ? environment.VERCEL_PROJECT_PRODUCTION_URL || environment.VERCEL_URL
    : environment.VERCEL_URL;
  const configured = environment.APP_URL?.trim();
  const candidate = configured || (vercelHost ? `https://${vercelHost}` : "");
  if (!candidate) {
    if (environment.NODE_ENV === "production") throw new Error("Configure APP_URL or a Vercel public hostname before sending account links.");
    return "http://localhost:3000";
  }
  const url = new URL(candidate);
  if (!["http:", "https:"].includes(url.protocol) || url.username || url.password || url.search || url.hash || url.pathname !== "/") {
    throw new Error("APP_URL must be a public HTTP(S) origin, without credentials, query or path.");
  }
  const local = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
  if (environment.NODE_ENV === "production" && url.protocol !== "https:" && !local) {
    throw new Error("Public production account links require HTTPS.");
  }
  return url.origin;
}
