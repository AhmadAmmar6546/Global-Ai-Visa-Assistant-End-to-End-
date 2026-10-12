import assert from "node:assert/strict";
import { resolveAppUrl } from "../../src/lib/app-url";

assert.equal(resolveAppUrl({NODE_ENV: "development"}), "http://localhost:3000");
assert.equal(resolveAppUrl({NODE_ENV: "production", VERCEL_ENV: "production", VERCEL_PROJECT_PRODUCTION_URL: "visa-example.vercel.app", VERCEL_URL: "deployment-example.vercel.app"}), "https://visa-example.vercel.app");
assert.equal(resolveAppUrl({NODE_ENV: "production", VERCEL_ENV: "preview", VERCEL_PROJECT_PRODUCTION_URL: "visa-example.vercel.app", VERCEL_URL: "preview-example.vercel.app"}), "https://preview-example.vercel.app");
assert.equal(resolveAppUrl({NODE_ENV: "production", APP_URL: "https://visa.example/", VERCEL_URL: "deployment-example.vercel.app"}), "https://visa.example");
assert.equal(resolveAppUrl({NODE_ENV: "production", APP_URL: "http://localhost:3002"}), "http://localhost:3002");
assert.throws(() => resolveAppUrl({NODE_ENV: "production"}));
for (const candidate of ["javascript:alert(1)", "https://user:password@visa.example", "https://visa.example/path", "https://visa.example/?x=1", "https://visa.example/#fragment", "http://public-visa.example"]) {
  assert.throws(() => resolveAppUrl({NODE_ENV: "production", APP_URL: candidate}));
}
console.log("12 deployment-origin checks passed.");
