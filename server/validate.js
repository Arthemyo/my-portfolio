// Validates and normalizes a contact-form submission.
// Only known fields are accepted; everything is length-limited and type-checked.

export const LIMITS = {
  name: 100,
  email: 254,
  phone: 15,
  subject: 150,
  message: 5000,
};

const ALLOWED_FIELDS = new Set(["name", "email", "phone", "subject", "message", "website"]);

// Pragmatic email check: one @, no spaces/control chars, a dot in the domain.
const EMAIL_RE = /^[^\s@<>()[\]\\,;:"]+@[^\s@<>()[\]\\,;:"]+\.[^\s@<>()[\]\\,;:"]{2,}$/;
// Brazilian phone as formatted by the page: (00) 0000-0000 or (00) 00000-0000.
const PHONE_RE = /^\(\d{2}\) \d{4,5}-\d{4}$/;
// Any control char (incl. CR/LF, which could inject email headers).
const CONTROL_RE = /[\u0000-\u001F\u007F]/;
// Control chars except tab and newlines, which are fine in a message body.
const BODY_CONTROL_RE = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/;

/**
 * @returns {{ ok: true, data: object, isBot: boolean } | { ok: false, errors: Record<string,string> }}
 */
export function validateContact(input) {
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    return { ok: false, errors: { form: "Invalid request body." } };
  }

  const errors = {};

  for (const key of Object.keys(input)) {
    if (!ALLOWED_FIELDS.has(key)) errors[key] = "Unknown field.";
  }
  for (const [key, value] of Object.entries(input)) {
    if (ALLOWED_FIELDS.has(key) && value !== undefined && typeof value !== "string") {
      errors[key] = "Must be text.";
    }
  }
  if (Object.keys(errors).length) return { ok: false, errors };

  const get = (k) => (input[k] ?? "").normalize("NFC").trim();
  const data = {
    name: get("name"),
    email: get("email").toLowerCase(),
    phone: get("phone"),
    subject: get("subject"),
    message: get("message").replace(/\r\n?/g, "\n"),
  };

  for (const field of ["name", "email", "subject", "message"]) {
    if (!data[field]) errors[field] = "Required.";
  }
  for (const [field, max] of Object.entries(LIMITS)) {
    if (data[field].length > max) errors[field] = `Must be at most ${max} characters.`;
  }
  for (const field of ["name", "email", "phone", "subject"]) {
    if (!errors[field] && CONTROL_RE.test(data[field])) errors[field] = "Contains invalid characters.";
  }
  if (!errors.message && BODY_CONTROL_RE.test(data.message)) errors.message = "Contains invalid characters.";
  if (!errors.email && data.email && !EMAIL_RE.test(data.email)) errors.email = "Invalid email address.";
  if (!errors.phone && data.phone && !PHONE_RE.test(data.phone)) errors.phone = "Use the format (00) 00000-0000.";

  if (Object.keys(errors).length) return { ok: false, errors };

  // Honeypot: real visitors never see or fill the "website" field.
  const isBot = typeof input.website === "string" && input.website.trim() !== "";
  return { ok: true, data, isBot };
}
