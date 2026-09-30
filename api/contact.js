// Vercel Function entry: the static site in public/ is served by Vercel's CDN,
// and requests to /api/contact are handled by the same Express app used locally.
import { loadConfig } from "../server/config.js";
import { createMailer } from "../server/mailer.js";
import { createApp } from "../server/app.js";

const config = loadConfig();
const app = createApp({ config, mailer: createMailer(config) });

export default app;
