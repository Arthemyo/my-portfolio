import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import { validateContact } from "./validate.js";
import { createRateLimiter } from "./rateLimit.js";
import { buildContactEmail } from "./email.js";

const PUBLIC_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "public");

const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self'",
  "img-src 'self' data: https://avatars.githubusercontent.com",
  "connect-src 'self' https://api.github.com",
  "font-src 'self'",
  "object-src 'none'",
  "base-uri 'none'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join("; ");

function securityHeaders(isProd) {
  return (req, res, next) => {
    res.set({
      "Content-Security-Policy": CSP,
      "X-Content-Type-Options": "nosniff",
      "X-Frame-Options": "DENY",
      "Referrer-Policy": "strict-origin-when-cross-origin",
      "Permissions-Policy": "camera=(), microphone=(), geolocation=(), interest-cohort=()",
      "Cross-Origin-Opener-Policy": "same-origin",
      "Cross-Origin-Resource-Policy": "same-origin",
    });
    if (isProd) res.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
    next();
  };
}

// Blocks cross-site form posts: browsers always send Origin on POST from a page.
function requireAllowedOrigin(allowedOrigins) {
  const allowed = new Set(allowedOrigins);
  return (req, res, next) => {
    const origin = req.get("origin");
    if (origin && !allowed.has(origin)) {
      return res.status(403).json({ ok: false, error: "Origin not allowed." });
    }
    next();
  };
}

function requireJson(req, res, next) {
  if (!req.is("application/json")) {
    return res.status(415).json({ ok: false, error: "Content-Type must be application/json." });
  }
  next();
}

/**
 * @param {object} deps
 * @param {ReturnType<import('./config.js').loadConfig>} deps.config
 * @param {{ sendMail(msg: object): Promise<unknown> }} deps.mailer
 */
export function createApp({ config, mailer, logger = console, now = Date.now }) {
  const app = express();
  app.disable("x-powered-by");
  app.set("trust proxy", config.trustProxy);
  app.use(securityHeaders(config.isProd));

  const api = express.Router();
  api.use((req, res, next) => {
    res.set("Cache-Control", "no-store");
    next();
  });

  api.post(
    "/contact",
    requireAllowedOrigin(config.allowedOrigins),
    createRateLimiter({ ...config.rateLimit, now }),
    requireJson,
    express.json({ limit: "10kb", strict: true }),
    async (req, res) => {
      const result = validateContact(req.body);
      if (!result.ok) {
        return res.status(400).json({ ok: false, error: "Please check the highlighted fields.", fields: result.errors });
      }
      if (result.isBot) {
        // Pretend success so bots don't learn they were filtered.
        logger.info("[contact] honeypot triggered, message dropped");
        return res.json({ ok: true });
      }

      const message = buildContactEmail(result.data, { to: config.contactTo, from: config.mailFrom, ip: req.ip });
      try {
        await mailer.sendMail(message);
      } catch (err) {
        logger.error("[contact] failed to send email:", err?.message);
        return res.status(502).json({ ok: false, error: "Could not send your message right now. Please try again later." });
      }
      res.json({ ok: true });
    },
  );

  api.all("/contact", (req, res) => res.set("Allow", "POST").status(405).json({ ok: false, error: "Method not allowed." }));
  api.use((req, res) => res.status(404).json({ ok: false, error: "Not found." }));

  app.use("/api", api);
  app.use(express.static(PUBLIC_DIR, { dotfiles: "ignore", index: "index.html", extensions: false }));
  app.use((req, res) => res.status(404).type("text").send("Not found"));

  // Final error handler: never leak stack traces or internals.
  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    const status = err.status || err.statusCode || 500;
    if (status === 413) return res.status(413).json({ ok: false, error: "Message is too large." });
    if (status === 400 && err.type === "entity.parse.failed") {
      return res.status(400).json({ ok: false, error: "Invalid JSON." });
    }
    if (status >= 500) logger.error("[server] unexpected error:", err?.message);
    res.status(status >= 400 && status < 600 ? status : 500).json({ ok: false, error: status < 500 ? "Bad request." : "Server error." });
  });

  return app;
}
