// Reads configuration from environment variables (see .env.example).

export function loadConfig(env = process.env) {
  const isProd = env.NODE_ENV === "production";
  const smtpConfigured = Boolean(env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASS);

  const config = {
    isProd,
    port: Number(env.PORT) || 3000,
    host: env.HOST || "127.0.0.1",
    // Set to the number of proxies in front of the app (e.g. 1 behind nginx/Vercel) so req.ip is the real client.
    // On Vercel the platform overwrites X-Forwarded-For with the real client IP, so trust one hop.
    trustProxy: env.TRUST_PROXY ? Number(env.TRUST_PROXY) : env.VERCEL ? 1 : false,
    allowedOrigins: [
      ...(env.ALLOWED_ORIGINS || "http://localhost:3000,http://127.0.0.1:3000").split(","),
      // Vercel system env vars: this deployment's URL, its branch URL and the production domain.
      ...[env.VERCEL_URL, env.VERCEL_BRANCH_URL, env.VERCEL_PROJECT_PRODUCTION_URL]
        .filter(Boolean)
        .map((host) => `https://${host}`),
    ]
      .map((o) => o.trim())
      .filter(Boolean),
    contactTo: env.CONTACT_TO || "",
    mailFrom: env.MAIL_FROM || env.SMTP_USER || "",
    smtp: smtpConfigured
      ? {
          host: env.SMTP_HOST,
          port: Number(env.SMTP_PORT) || 465,
          secure: (Number(env.SMTP_PORT) || 465) === 465,
          auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
        }
      : null,
    rateLimit: {
      windowMs: (Number(env.RATE_LIMIT_WINDOW_MIN) || 15) * 60_000,
      max: Number(env.RATE_LIMIT_MAX) || 5,
    },
  };

  const problems = [];
  if (!config.contactTo) problems.push("CONTACT_TO is required");
  if (isProd && !config.smtp) problems.push("SMTP_HOST, SMTP_USER and SMTP_PASS are required in production");
  if (config.smtp && !config.mailFrom) problems.push("MAIL_FROM or SMTP_USER is required");
  if (problems.length) throw new Error(`Invalid configuration: ${problems.join("; ")}`);

  return config;
}
