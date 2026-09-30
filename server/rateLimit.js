// Small in-memory fixed-window rate limiter, keyed by client IP.
// Good enough for a single-instance portfolio; use a shared store if you scale out.

export function createRateLimiter({ windowMs, max, maxKeys = 10_000, now = Date.now }) {
  const hits = new Map();

  function prune(t) {
    for (const [key, entry] of hits) {
      if (entry.resetAt <= t) hits.delete(key);
    }
  }

  return function rateLimit(req, res, next) {
    const t = now();
    if (hits.size >= maxKeys) prune(t);

    const key = req.ip ?? "unknown";
    let entry = hits.get(key);
    if (!entry || entry.resetAt <= t) {
      entry = { count: 0, resetAt: t + windowMs };
      hits.set(key, entry);
    }
    entry.count++;

    const remaining = Math.max(0, max - entry.count);
    res.set("RateLimit-Limit", String(max));
    res.set("RateLimit-Remaining", String(remaining));
    res.set("RateLimit-Reset", String(Math.ceil((entry.resetAt - t) / 1000)));

    if (entry.count > max) {
      res.set("Retry-After", String(Math.ceil((entry.resetAt - t) / 1000)));
      return res.status(429).json({ ok: false, error: "Too many messages. Please try again later." });
    }
    next();
  };
}
