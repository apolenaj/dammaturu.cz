/**
 * In-memory sliding-window rate limiter (D-063).
 * Per-process only — pair with edge/WAF in multi-instance production.
 */

type Bucket = { timestamps: number[] };

const buckets = new Map<string, Bucket>();

export type RateLimitResult =
  | { ok: true; remaining: number }
  | { ok: false; retryAfterSec: number };

export function rateLimit(input: {
  key: string;
  limit: number;
  windowMs: number;
  now?: number;
}): RateLimitResult {
  const now = input.now ?? Date.now();
  const windowStart = now - input.windowMs;
  let bucket = buckets.get(input.key);
  if (!bucket) {
    bucket = { timestamps: [] };
    buckets.set(input.key, bucket);
  }
  bucket.timestamps = bucket.timestamps.filter((t) => t > windowStart);
  if (bucket.timestamps.length >= input.limit) {
    const oldest = bucket.timestamps[0] ?? now;
    const retryAfterSec = Math.max(
      1,
      Math.ceil((oldest + input.windowMs - now) / 1000),
    );
    return { ok: false, retryAfterSec };
  }
  bucket.timestamps.push(now);
  // Bound map size
  if (buckets.size > 20_000) {
    const first = buckets.keys().next().value;
    if (first) buckets.delete(first);
  }
  return { ok: true, remaining: input.limit - bucket.timestamps.length };
}

export function clearRateLimitsForTests(): void {
  buckets.clear();
}

export function clientIpFromHeaders(headers: Headers): string {
  const xf = headers.get("x-forwarded-for");
  if (xf) {
    const first = xf.split(",")[0]?.trim();
    if (first) return first.slice(0, 64);
  }
  const real = headers.get("x-real-ip")?.trim();
  if (real) return real.slice(0, 64);
  return "unknown";
}
