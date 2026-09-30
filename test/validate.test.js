import { test } from "node:test";
import assert from "node:assert/strict";
import { validateContact, LIMITS } from "../server/validate.js";
import { validBody } from "./helpers.js";

test("accepts a valid submission and normalizes it", () => {
  const r = validateContact({ ...validBody(), name: "  Maria  ", email: "Maria@Example.COM", message: "a\r\nb" });
  assert.equal(r.ok, true);
  assert.equal(r.isBot, false);
  assert.equal(r.data.name, "Maria");
  assert.equal(r.data.email, "maria@example.com");
  assert.equal(r.data.message, "a\nb");
});

test("phone is optional", () => {
  const r = validateContact({ ...validBody(), phone: "" });
  assert.equal(r.ok, true);
  assert.equal(validateContact({ ...validBody(), phone: undefined }).ok, true);
});

test("accepts mobile and landline Brazilian formats", () => {
  assert.equal(validateContact({ ...validBody(), phone: "(11) 91234-5678" }).ok, true);
  assert.equal(validateContact({ ...validBody(), phone: "(11) 3234-5678" }).ok, true);
});

test("rejects bad phone formats", () => {
  for (const phone of ["91987654321", "(91) 9876", "+55 91 98765-4321", "(91) 98765-43210"]) {
    const r = validateContact({ ...validBody(), phone });
    assert.equal(r.ok, false, phone);
    assert.ok(r.errors.phone);
  }
});

test("requires name, email, subject and message", () => {
  const r = validateContact({});
  assert.equal(r.ok, false);
  assert.deepEqual(Object.keys(r.errors).sort(), ["email", "message", "name", "subject"]);
});

test("whitespace-only fields count as empty", () => {
  const r = validateContact({ ...validBody(), name: "   " });
  assert.equal(r.ok, false);
  assert.ok(r.errors.name);
});

test("rejects invalid emails", () => {
  for (const email of ["nope", "a@b", "a b@c.com", "a@b.c", "<a@b.com>", "a@b.com, c@d.com"]) {
    assert.equal(validateContact({ ...validBody(), email }).ok, false, email);
  }
});

test("rejects CR/LF in single-line fields (email header injection)", () => {
  for (const field of ["name", "email", "subject", "phone"]) {
    const r = validateContact({ ...validBody(), [field]: "x\r\nBcc: victim@example.com" });
    assert.equal(r.ok, false, field);
    assert.ok(r.errors[field], field);
  }
});

test("allows newlines but rejects other control chars in the message", () => {
  assert.equal(validateContact({ ...validBody(), message: "line1\nline2\ttab" }).ok, true);
  assert.equal(validateContact({ ...validBody(), message: "bad\u0000null" }).ok, false);
});

test("enforces length limits", () => {
  for (const [field, max] of Object.entries(LIMITS)) {
    if (field === "phone" || field === "email") continue;
    const r = validateContact({ ...validBody(), [field]: "a".repeat(max + 1) });
    assert.equal(r.ok, false, field);
    assert.ok(r.errors[field], field);
    assert.equal(validateContact({ ...validBody(), [field]: "a".repeat(max) }).ok, true, field);
  }
});

test("rejects unknown fields and non-string values", () => {
  assert.equal(validateContact({ ...validBody(), to: "attacker@example.com" }).ok, false);
  assert.equal(validateContact({ ...validBody(), name: ["a"] }).ok, false);
  assert.equal(validateContact({ ...validBody(), message: { $gt: "" } }).ok, false);
  assert.equal(validateContact({ ...validBody(), __proto__: { x: 1 } }).ok, true); // prototype isn't an own key
  assert.equal(validateContact(JSON.parse('{"__proto__": {"x": 1}, "name": "a"}')).ok, false);
});

test("rejects non-object bodies", () => {
  for (const body of [null, "text", 42, [validBody()]]) {
    assert.equal(validateContact(body).ok, false);
  }
});

test("flags honeypot submissions as bots", () => {
  const r = validateContact({ ...validBody(), website: "http://spam.example" });
  assert.equal(r.ok, true);
  assert.equal(r.isBot, true);
});
