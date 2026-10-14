import assert from "node:assert/strict";
import { deliverAuthEmail } from "../../src/lib/email";
import { AppError } from "../../src/lib/http";

async function main() {
  const originalFetch = globalThis.fetch;
  const originalError = console.error;
  const originalEnv = Object.fromEntries(["RESEND_API_KEY", "EMAIL_FROM", "NODE_ENV"].map(name => [name, process.env[name]]));
  const key = "synthetic-email-key-for-mocked-tests";
  const recipient = "private-recipient@example.test";
  const link = "https://visa.example.test/reset-password?token=private-reset-token";
  const logs: string[] = [];
  let requests = 0;
  let reply: () => Promise<Response> = async () => new Response("{}", { status: 201 });
  globalThis.fetch = async (input, init) => {
    requests++;
    assert.equal(input, "https://api.resend.com/emails");
    assert.equal(init?.method, "POST");
    assert.equal(new Headers(init?.headers).get("Authorization"), `Bearer ${key}`);
    const payload = JSON.parse(String(init?.body));
    assert.deepEqual(payload.to, [recipient]);
    assert.ok(payload.text.includes(link));
    return reply();
  };
  console.error = (...values: unknown[]) => { logs.push(values.map(String).join(" ")); };
  try {
    Object.assign(process.env, { RESEND_API_KEY: key, EMAIL_FROM: "sender@example.test", NODE_ENV: "production" });
    assert.equal(await deliverAuthEmail(recipient, link, "verify"), true);
    assert.equal(logs.length, 0);

    const sensitive = `${key} ${recipient} ${link}`;
    const failure = () => assert.rejects(deliverAuthEmail(recipient, link, "reset"), (error: unknown) => {
      if (!(error instanceof AppError) || error.status !== 503) return false;
      for (const privateValue of [key, recipient, link, "private-reset-token"]) assert.ok(!error.message.includes(privateValue), "Private email data must not appear in public errors.");
      return true;
    });
    reply = async () => Response.json({ name: "invalid_api_key", message: sensitive }, { status: 401 });
    await failure();
    assert.equal(JSON.parse(logs.at(-1)!).providerStatus, 401);
    assert.equal(JSON.parse(logs.at(-1)!).reason, "invalid_api_key");

    reply = async () => Response.json({ name: sensitive, message: sensitive }, { status: 403 });
    await failure();
    assert.equal(JSON.parse(logs.at(-1)!).reason, "provider_error");
    reply = async () => new Response(sensitive, { status: 502 });
    await failure();
    reply = async () => { throw new Error(sensitive); };
    await failure();
    assert.equal(JSON.parse(logs.at(-1)!).reason, "network_error");
    reply = async () => { throw new DOMException(sensitive, "TimeoutError"); };
    await failure();
    assert.equal(JSON.parse(logs.at(-1)!).reason, "timeout");

    const combined = logs.join("\n");
    for (const privateValue of [key, recipient, link, "private-reset-token"]) assert.ok(!combined.includes(privateValue), "Private email data must not appear in logs.");
    const before = requests;
    delete process.env.RESEND_API_KEY;
    await assert.rejects(deliverAuthEmail(recipient, link, "reset"), (error: unknown) => error instanceof AppError && error.status === 503);
    Object.assign(process.env, { NODE_ENV: "development" });
    assert.equal(await deliverAuthEmail(recipient, link, "reset"), false);
    assert.equal(requests, before);
    console.log("Email transport, error handling and privacy checks passed; no real emails sent.");
  } finally {
    globalThis.fetch = originalFetch;
    console.error = originalError;
    for (const [name, value] of Object.entries(originalEnv)) {
      if (value === undefined) delete process.env[name];
      else process.env[name] = value;
    }
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
