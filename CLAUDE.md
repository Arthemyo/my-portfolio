# CLAUDE.md

Portfolio website for **Arthemyo Rodrigues** (Full Stack Developer): a static site plus a small Node.js backend that emails contact-form messages to the owner.

## Commands

```bash
npm install          # install dependencies (express, nodemailer)
cp .env.example .env # then fill in SMTP settings (see "Email setup")
npm start            # serve site + API at http://127.0.0.1:3000
npm run dev          # same, restarting on file changes
npm test             # run the backend test suite (node:test, no extra deps)
```

Requires Node.js 22+ (uses `--env-file-if-exists`, built-in `fetch` and `node:test`).

## Structure

```
public/            Static site (served by the backend)
  index.html       Page layout + <template id="contact-form-template"> (shared form markup)
  data.js          ✏️ ALL CONTENT: profile, skills, AI section, sites, projects, form endpoint
  main.js          Renders data.js into the page; phone mask; form submission
  styles.css       Styling (CSS variables, auto dark/light mode, mobile layout)
api/
  contact.js       Vercel Function entry: exports the same Express app for /api/contact
server/
  index.js         Entry point: loads config, creates mailer, starts HTTP server
  app.js           Express app: security headers, /api/contact, static files, error handler
  validate.js      Contact-form validation (allow-list of fields, lengths, formats)
  rateLimit.js     In-memory per-IP rate limiter
  email.js         Builds the notification email (text + escaped HTML)
  mailer.js        Nodemailer SMTP transport, or console logger when SMTP isn't configured (dev)
  config.js        Reads/validates environment variables
test/              node:test suites (validate, email, api) + helpers.js
.env.example       Documented environment variables (copy to .env; .env is git-ignored)
vercel.json        Vercel config: static output = public/, no build, security headers, function maxDuration
.vercelignore      Keeps .env, tests and node_modules out of uploads
```

## Page sections (in order)

1. **Contact form (top)**: "Let's talk" form above the profile.
2. **Hero/profile**: GitHub avatar, name, title, bio, "dentsu international · UNAMA · Brazil", then labeled links (Email, LinkedIn, GitHub). These are labels + links, deliberately **not** buttons.
3. **Websites I built**: Cicomal (with tech stack), Planejei Cyrela.
4. **Websites I contributed to**: Kérastase Brasil, Natura (agency work).
5. **AI integration**: intro, 4 capability cards, and "AI-powered projects" (app-claude, B3 stock analysis).
6. **Featured projects**: curated GitHub repos.
7. **More on GitHub**: every other public, non-fork repo, fetched live from `api.github.com` in the browser (`SHOW_ALL_REPOS`).
8. **Skills**
9. **Contact (bottom)**: labeled links + the same form again.

Both forms are cloned from the single `<template>` in `index.html`; edit it once to change both.

## Content sources and decisions

- **GitHub** (`github.com/Arthemyo`): avatar, repo list, nextjs-dashboard live demo URL.
- **LinkedIn**: only the public preview was reachable, giving the bio opener ("first line of code at 10… Unity"), dentsu international and UNAMA. Location is shown only as "Brazil".
- **Local projects** in `~/Documents/projects-others/` were used as references:
  - `app-claude`: AI parts search. Gemini 2.5 Flash Lite via OpenRouter normalizes Portuguese mechanic queries to JSON; compatibility only from FIPE/NHTSA/CarQuery (AI never invents parts). Source: `lib/ai.ts`, `CLAUDE.md`, `agents/`.
  - `stock-analitcs`: B3 fundamental analysis (Next.js + FastAPI + Redis + Docker, Graham valuation), built with a multi-agent Claude Code workflow. It does **not** call an LLM at runtime; the card says "built with" AI agents. No public repo, so no link.
  - `cicomal-landing-vision`: stack for the Cicomal card (React, Vite, Tailwind, shadcn/ui, Framer Motion, Firebase), prototyped with Lovable.
  - Not added (unknown live URL): Casa D'alvura (`pastel-weave-dreams-main`).
- Site/project descriptions for Planejei Cyrela, Kérastase and Natura were written without source material. The owner should confirm them and add what they actually did.
- The owner chose title **Full Stack Developer**.

## Contact form history

1. FormSubmit (third-party API called from the browser).
2. Tried `mailto:` (opens the visitor's email app). **Rolled back** at the owner's request.
3. Added optional **Brazilian phone** field, auto-masked to `(00) 0000-0000` / `(00) 00000-0000` (`formatBrPhone` in `main.js`).
4. **Current:** own backend. The form POSTs JSON to `/api/contact` (`CONTACT_FORM_ENDPOINT` in `data.js`); the server emails it via SMTP. On failure the page shows the error plus a `mailto:` fallback link.

Form fields: `name`, `email`, `phone` (optional), `subject`, `message`, `website` (hidden honeypot).

## Email setup

Set in `.env` (see `.env.example`):
- `CONTACT_TO`: recipient (owner's inbox). Always taken from config, never from the request.
- `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASS`: for Gmail use `smtp.gmail.com:465` and an **App Password** (needs 2-Step Verification: https://myaccount.google.com/apppasswords).
- `MAIL_FROM`: sender name/address.

Without SMTP settings (and not in production) the server **logs messages to the console** instead of sending them. With `NODE_ENV=production` it refuses to start without SMTP.

## Backend security measures

| Threat | Mitigation | Where |
|---|---|---|
| Email header injection | CR/LF and control chars rejected in single-line fields; recipient fixed from config; visitor email only used as `replyTo` | `validate.js`, `email.js` |
| HTML injection in the email | All values HTML-escaped | `email.js` |
| Mass-assignment / unexpected input | Only allow-listed string fields; unknown keys → 400 | `validate.js` |
| Oversized payloads / DoS | JSON only (415 otherwise), 10 kB body limit (413), field length limits, request/header timeouts | `app.js`, `index.js` |
| Spam / abuse | Per-IP rate limit (default 5 per 15 min, counts invalid requests too), honeypot (silently accepted, not sent) | `rateLimit.js`, `app.js` |
| Rate-limit bypass via spoofed `X-Forwarded-For` | `trust proxy` off by default; set `TRUST_PROXY` only behind a real proxy | `config.js` |
| Cross-site form posts (CSRF-style spam) | `Origin` must be in `ALLOWED_ORIGINS` (403 otherwise) | `app.js` |
| XSS / clickjacking on the site | Strict CSP (`script-src 'self'`, no inline scripts/styles), `X-Frame-Options: DENY`, `nosniff`, Referrer/Permissions/COOP/CORP headers, HSTS in production; client code escapes with `esc()` | `app.js`, `public/main.js` |
| Leaking internals | Generic error messages (SMTP errors → generic 502), no stack traces, `x-powered-by` off, API `Cache-Control: no-store` | `app.js` |
| Exposing secrets/code | Only `public/` is served (dotfiles ignored); `.env` git-ignored; SMTP secrets only server-side | `app.js`, `.gitignore` |
| Nodemailer file/URL access (SSRF) | `disableFileAccess` / `disableUrlAccess`; TLS ≥ 1.2 required; nodemailer kept at latest (v7 had advisories, upgraded to v10, `npm audit` clean) | `mailer.js`, `email.js` |

**CSP note:** if you add inline `<script>`/`style=""`, or load images/fonts from new domains (e.g. site screenshots hosted elsewhere), update the `CSP` list in `server/app.js`.

## Tests

`npm test` runs 41 tests with no network or real SMTP (a fake mailer records messages; the server listens on a random port):
- `validate.test.js`: required fields, email/phone formats, length limits, CR/LF injection, control chars, unknown/non-string fields, prototype-pollution keys, honeypot.
- `email.test.js`: fixed recipient, reply-to, HTML escaping, file/URL access disabled.
- `vercel.test.js`: Vercel origins/trust-proxy config, header parity between `vercel.json` and Express, function export.
- `api.test.js`: happy path, 400/403/405/413/415/429/502 paths, spoofed `X-Forwarded-For`, rate-limit window reset (injected clock), security headers, path traversal / no access to `server/`, `.env`, `package.json`, `node_modules`, config fails fast.

When changing the backend, add or adjust tests alongside. `createApp({ config, mailer, logger, now })` takes its dependencies as arguments, so it is easy to test.

## Conventions

- Plain HTML/CSS/JS on the frontend (no build step). Keep content in `public/data.js`, not hard-coded in markup.
- ES modules everywhere (`"type": "module"`); minimal dependencies (only `express` and `nodemailer`).
- User-facing text is in English; the owner is Brazilian (pt-BR formats for phone).

## Deployment (Vercel)

- **Project:** `arthemyos-projects/my-portfolio` (linked in `.vercel/`, git-ignored).
- **Production URL:** https://my-portfolio-coral-two-18.vercel.app. The first deploy (2026-09-29) went to production automatically, as Vercel does for a project's first deployment.
- **How it runs:** Vercel's CDN serves `public/`; `api/contact.js` is a Node.js Vercel Function running the Express app. `server/index.js` is only for local use.
- **Env vars** (Production + Preview, stored as Sensitive): `CONTACT_TO`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM`. Copied from local `.env`.
- **Automatic on Vercel** (`config.js`): allowed origins include `VERCEL_URL`, `VERCEL_BRANCH_URL` and `VERCEL_PROJECT_PRODUCTION_URL`; `trust proxy` = 1 (Vercel overwrites `X-Forwarded-For`). Add a custom domain to `ALLOWED_ORIGINS` if it isn't the project's production domain.
- **Security headers** for static files come from `vercel.json`; `test/vercel.test.js` fails if they drift from the Express ones in `server/app.js`.
- **Commands** (the globally installed CLI 54.x is outdated and can't add Preview env vars without git; use the latest):
  ```bash
  npx vercel@latest deploy          # preview
  npx vercel@latest deploy --prod   # production (confirm first)
  npx vercel@latest logs <url> --level error --since 1h
  ```
- Preview deployments are protected by Vercel Authentication (only logged-in team members can open them).

## Deployment notes

- Outside Vercel: set `NODE_ENV=production`, `ALLOWED_ORIGINS=https://your-domain`, SMTP vars, and `TRUST_PROXY=1` if behind a reverse proxy/load balancer.
- The rate limiter is in-memory (per instance). On Vercel, instances are reused but not shared, so it is weaker. Consider a Vercel Firewall rate-limit rule on `/api/contact`, or a shared store (e.g. Upstash Redis).
