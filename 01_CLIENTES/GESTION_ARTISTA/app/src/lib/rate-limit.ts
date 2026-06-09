/**
 * Simple in-memory rate limiter for API routes.
 * Resets per window — not suitable for multi-instance deployments
 * (use Upstash Redis for that), but works fine on single Vercel serverless functions.
 */

interface Entry {
  count: number;
  reset: number; // timestamp ms
}

const store = new Map<string, Entry>();

// Cleanup old entries every 5 minutes to avoid memory leaks
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    store.forEach((entry, key) => {
      if (now > entry.reset) store.delete(key);
    });
  }, 5 * 60_000);
}

/**
 * Check whether a request is within rate limit.
 * @param key     Unique key (e.g. userId or IP)
 * @param limit   Max requests per window
 * @param windowMs Time window in milliseconds
 * @returns { allowed: boolean; remaining: number; resetAt: number }
 */
export function rateLimit(
  key: string,
  limit: number,
  windowMs: number
): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now();
  let entry = store.get(key);

  if (!entry || now > entry.reset) {
    entry = { count: 1, reset: now + windowMs };
    store.set(key, entry);
    return { allowed: true, remaining: limit - 1, resetAt: entry.reset };
  }

  if (entry.count >= limit) {
    return { allowed: false, remaining: 0, resetAt: entry.reset };
  }

  entry.count++;
  return { allowed: true, remaining: limit - entry.count, resetAt: entry.reset };
}
