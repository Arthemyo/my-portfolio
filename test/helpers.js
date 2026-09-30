import { createApp } from "../server/app.js";
import { loadConfig } from "../server/config.js";

export const ORIGIN = "http://localhost:3000";

export const validBody = () => ({
  name: "Maria Silva",
  email: "maria@example.com",
  phone: "(91) 98765-4321",
  subject: "Project inquiry",
  message: "Hi! I'd like to talk about a website.\nThanks.",
  website: "",
});

export const silentLogger = { info() {}, warn() {}, error() {} };

// Starts the app on a random port with a fake mailer that records messages.
export async function startServer({ env = {}, mailer, now } = {}) {
  const config = loadConfig({ CONTACT_TO: "owner@example.com", MAIL_FROM: "Portfolio <owner@example.com>", ...env });
  const sent = [];
  const fakeMailer = mailer ?? { sendMail: async (msg) => { sent.push(msg); return { messageId: "test" }; } };
  const app = createApp({ config, mailer: fakeMailer, logger: silentLogger, now });
  const server = await new Promise((resolve) => {
    const s = app.listen(0, "127.0.0.1", () => resolve(s));
  });
  const base = `http://127.0.0.1:${server.address().port}`;

  const post = (body, { headers = {}, raw } = {}) =>
    fetch(`${base}/api/contact`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Origin: ORIGIN, ...headers },
      body: raw ?? JSON.stringify(body),
    });

  return { base, sent, post, close: () => new Promise((r) => server.close(r)) };
}
