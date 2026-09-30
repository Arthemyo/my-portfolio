import { test, describe, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { startServer, validBody } from "./helpers.js";

describe("POST /api/contact", () => {
  let srv;
  beforeEach(async () => { srv = await startServer(); });
  afterEach(() => srv.close());

  test("sends a valid message and returns ok", async () => {
    const res = await srv.post(validBody());
    assert.equal(res.status, 200);
    assert.deepEqual(await res.json(), { ok: true });
    assert.equal(srv.sent.length, 1);
    assert.equal(srv.sent[0].to, "owner@example.com");
    assert.equal(srv.sent[0].replyTo.address, "maria@example.com");
    assert.equal(res.headers.get("cache-control"), "no-store");
  });

  test("works without an Origin header (e.g. curl)", async () => {
    const res = await fetch(`${srv.base}/api/contact`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(validBody()),
    });
    assert.equal(res.status, 200);
  });

  test("returns field errors for invalid input and sends nothing", async () => {
    const res = await srv.post({ ...validBody(), email: "bad", phone: "123" });
    assert.equal(res.status, 400);
    const json = await res.json();
    assert.equal(json.ok, false);
    assert.ok(json.fields.email);
    assert.ok(json.fields.phone);
    assert.equal(srv.sent.length, 0);
  });

  test("rejects header injection attempts", async () => {
    const res = await srv.post({ ...validBody(), subject: "Hi\r\nBcc: victim@example.com" });
    assert.equal(res.status, 400);
    assert.equal(srv.sent.length, 0);
  });

  test("ignores attempts to choose the recipient", async () => {
    const res = await srv.post({ ...validBody(), to: "attacker@example.com" });
    assert.equal(res.status, 400);
    assert.equal(srv.sent.length, 0);
  });

  test("rejects disallowed origins (cross-site posts)", async () => {
    const res = await srv.post(validBody(), { headers: { Origin: "https://evil.example" } });
    assert.equal(res.status, 403);
    assert.equal(srv.sent.length, 0);
  });

  test("requires JSON content type", async () => {
    const res = await srv.post(null, {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      raw: "name=a&email=b",
    });
    assert.equal(res.status, 415);
  });

  test("handles malformed JSON without leaking details", async () => {
    const res = await srv.post(null, { raw: "{not json" });
    assert.equal(res.status, 400);
    const json = await res.json();
    assert.deepEqual(json, { ok: false, error: "Invalid JSON." });
  });

  test("rejects bodies over 10kb", async () => {
    const res = await srv.post({ ...validBody(), message: "a".repeat(20_000) });
    assert.equal(res.status, 413);
    assert.equal(srv.sent.length, 0);
  });

  test("drops honeypot submissions silently", async () => {
    const res = await srv.post({ ...validBody(), website: "spam" });
    assert.equal(res.status, 200);
    assert.deepEqual(await res.json(), { ok: true });
    assert.equal(srv.sent.length, 0);
  });

  test("only allows POST", async () => {
    const res = await fetch(`${srv.base}/api/contact`);
    assert.equal(res.status, 405);
    assert.equal(res.headers.get("allow"), "POST");
  });

  test("unknown API routes return 404 JSON", async () => {
    const res = await fetch(`${srv.base}/api/nope`);
    assert.equal(res.status, 404);
    assert.equal((await res.json()).ok, false);
  });
});

describe("mail failures", () => {
  test("returns a generic 502 and doesn't leak the error", async () => {
    const srv = await startServer({
      mailer: { sendMail: async () => { throw new Error("535 auth failed for secret-user@smtp"); } },
    });
    try {
      const res = await srv.post(validBody());
      assert.equal(res.status, 502);
      const text = await res.text();
      assert.ok(!text.includes("secret-user"));
      assert.ok(!text.includes("535"));
    } finally {
      await srv.close();
    }
  });
});

describe("rate limiting", () => {
  test("blocks an IP after the limit and recovers after the window", async () => {
    let t = 1_000_000;
    const srv = await startServer({ env: { RATE_LIMIT_MAX: "3", RATE_LIMIT_WINDOW_MIN: "1" }, now: () => t });
    try {
      for (let i = 0; i < 3; i++) assert.equal((await srv.post(validBody())).status, 200);
      const blocked = await srv.post(validBody());
      assert.equal(blocked.status, 429);
      assert.ok(Number(blocked.headers.get("retry-after")) > 0);
      assert.equal(srv.sent.length, 3);

      t += 61_000;
      assert.equal((await srv.post(validBody())).status, 200);
    } finally {
      await srv.close();
    }
  });

  test("can't be bypassed by spoofing X-Forwarded-For", async () => {
    const srv = await startServer({ env: { RATE_LIMIT_MAX: "2" } });
    try {
      for (let i = 0; i < 3; i++) {
        const res = await srv.post(validBody(), { headers: { "X-Forwarded-For": `10.0.0.${i}` } });
        assert.equal(res.status, i < 2 ? 200 : 429);
      }
    } finally {
      await srv.close();
    }
  });

  test("counts invalid requests too, so they can't be used to probe endlessly", async () => {
    const srv = await startServer({ env: { RATE_LIMIT_MAX: "2" } });
    try {
      await srv.post({});
      await srv.post({});
      assert.equal((await srv.post(validBody())).status, 429);
    } finally {
      await srv.close();
    }
  });
});

describe("static site and headers", () => {
  let srv;
  beforeEach(async () => { srv = await startServer(); });
  afterEach(() => srv.close());

  test("serves the portfolio with security headers", async () => {
    const res = await fetch(`${srv.base}/`);
    assert.equal(res.status, 200);
    assert.ok((await res.text()).includes("<title>"));
    assert.ok(res.headers.get("content-security-policy").includes("default-src 'self'"));
    assert.equal(res.headers.get("x-content-type-options"), "nosniff");
    assert.equal(res.headers.get("x-frame-options"), "DENY");
    assert.equal(res.headers.get("x-powered-by"), null);
  });

  test("does not expose server code, secrets or dependencies", async () => {
    for (const p of ["/server/app.js", "/.env", "/package.json", "/node_modules/express/package.json",
      "/../.env", "/%2e%2e/.env", "/..%2f.env", "/%2e%2e%2fserver/config.js"]) {
      const res = await fetch(`${srv.base}${p}`);
      assert.notEqual(res.status, 200, p);
    }
  });
});

describe("config", () => {
  test("refuses to start in production without SMTP settings", async () => {
    const { loadConfig } = await import("../server/config.js");
    assert.throws(() => loadConfig({ NODE_ENV: "production", CONTACT_TO: "a@b.com" }), /SMTP/);
    assert.throws(() => loadConfig({}), /CONTACT_TO/);
  });
});
