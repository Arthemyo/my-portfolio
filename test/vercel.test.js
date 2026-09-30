import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { loadConfig } from "../server/config.js";
import { startServer } from "./helpers.js";

const vercelJson = JSON.parse(readFileSync(new URL("../vercel.json", import.meta.url)));

test("allows the deployment, branch and production URLs on Vercel", () => {
  const config = loadConfig({
    CONTACT_TO: "a@b.com",
    VERCEL: "1",
    VERCEL_URL: "my-portfolio-abc123.vercel.app",
    VERCEL_BRANCH_URL: "my-portfolio-git-main.vercel.app",
    VERCEL_PROJECT_PRODUCTION_URL: "my-portfolio.vercel.app",
  });
  for (const origin of [
    "https://my-portfolio-abc123.vercel.app",
    "https://my-portfolio-git-main.vercel.app",
    "https://my-portfolio.vercel.app",
  ]) {
    assert.ok(config.allowedOrigins.includes(origin), origin);
  }
  assert.equal(config.trustProxy, 1);
});

test("does not trust proxy headers outside Vercel unless configured", () => {
  assert.equal(loadConfig({ CONTACT_TO: "a@b.com" }).trustProxy, false);
  assert.equal(loadConfig({ CONTACT_TO: "a@b.com", TRUST_PROXY: "2" }).trustProxy, 2);
});

test("vercel.json security headers match the Express ones", async () => {
  const srv = await startServer();
  try {
    const res = await fetch(`${srv.base}/`);
    const vercelHeaders = Object.fromEntries(vercelJson.headers[0].headers.map((h) => [h.key.toLowerCase(), h.value]));
    for (const name of ["content-security-policy", "x-content-type-options", "x-frame-options", "referrer-policy", "permissions-policy"]) {
      assert.equal(vercelHeaders[name], res.headers.get(name), name);
    }
  } finally {
    await srv.close();
  }
});

test("the Vercel function exports the Express app", async () => {
  process.env.CONTACT_TO ??= "owner@example.com";
  const { default: handler } = await import("../api/contact.js");
  assert.equal(typeof handler, "function");
  assert.equal(typeof handler.handle, "function");
});
