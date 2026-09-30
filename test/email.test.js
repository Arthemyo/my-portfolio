import { test } from "node:test";
import assert from "node:assert/strict";
import { buildContactEmail } from "../server/email.js";
import { validBody } from "./helpers.js";

const opts = { to: "owner@example.com", from: "Portfolio <owner@example.com>", receivedAt: new Date("2026-01-01T00:00:00Z") };

test("sends to the configured owner with the visitor as reply-to", () => {
  const msg = buildContactEmail(validBody(), opts);
  assert.equal(msg.to, "owner@example.com");
  assert.equal(msg.from, "Portfolio <owner@example.com>");
  assert.deepEqual(msg.replyTo, { name: "Maria Silva", address: "maria@example.com" });
  assert.equal(msg.subject, "[Portfolio] Project inquiry");
});

test("includes all fields in the text body", () => {
  const { text } = buildContactEmail(validBody(), opts);
  for (const v of ["Maria Silva", "maria@example.com", "(91) 98765-4321", "Project inquiry", "talk about a website"]) {
    assert.ok(text.includes(v), v);
  }
});

test("escapes HTML so visitor input can't inject markup", () => {
  const data = { ...validBody(), name: '<img src=x onerror="alert(1)">', message: "<script>alert(1)</script> & 'q'" };
  const { html } = buildContactEmail(data, opts);
  assert.ok(!html.includes("<script>"));
  assert.ok(!html.includes("<img src=x"));
  assert.ok(html.includes("&lt;script&gt;alert(1)&lt;/script&gt; &amp; &#39;q&#39;"));
});

test("shows a dash when no phone is given", () => {
  const { text } = buildContactEmail({ ...validBody(), phone: "" }, opts);
  assert.ok(text.includes("Phone: —"));
});

test("blocks nodemailer file and URL access", () => {
  const msg = buildContactEmail(validBody(), opts);
  assert.equal(msg.disableFileAccess, true);
  assert.equal(msg.disableUrlAccess, true);
});
