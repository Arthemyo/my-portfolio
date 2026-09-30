import { loadConfig } from "./config.js";
import { createMailer } from "./mailer.js";
import { createApp } from "./app.js";

let config;
try {
  config = loadConfig();
} catch (err) {
  console.error(err.message);
  console.error("Copy .env.example to .env and fill it in.");
  process.exit(1);
}

const mailer = createMailer(config);
if (config.smtp && typeof mailer.verify === "function") {
  mailer.verify().then(
    () => console.log("[mail] SMTP connection verified"),
    (err) => console.error("[mail] SMTP verification failed:", err.message),
  );
}

const app = createApp({ config, mailer });
const server = app.listen(config.port, config.host, () => {
  console.log(`Portfolio running at http://${config.host === "0.0.0.0" ? "localhost" : config.host}:${config.port}`);
});
server.requestTimeout = 15_000;
server.headersTimeout = 10_000;

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => server.close(() => process.exit(0)));
}
