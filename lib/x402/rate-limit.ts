/**
 * A rate limit that actually limits.
 *
 * The one this replaces kept its counters in a `new Map()`. On serverless that
 * is not a slow rate limit, it is no rate limit: each instance starts at zero,
 * so the ceiling is the stated limit multiplied by however many instances the
 * platform felt like starting. It also read, incremented and wrote back, which
 * is the same read-modify-write race that once let five concurrent requests
 * collect one subscription five times.
 *
 * Both problems have the same answer. INCR is atomic and it happens in Redis,
 * so concurrent requests cannot both see the same count and no instance has a
 * private view of it. The expiry is set only on the request that created the
 * key, which makes the window a fixed bucket rather than a sliding one: cheap,
 * predictable, and at worst it allows a burst across a bucket boundary.
 *
 * When Redis is absent this degrades to a per-process counter and says so
 * rather than pretending. A limiter that quietly stops limiting is worse than
 * one that admits it, because only the second kind gets fixed.
 */

import { redisCommand, redisConfigured } from './keyed-store';

export interface RateVerdict {
  allowed: boolean;
  limit: number;
  remaining: number;
  /** Seconds until the window resets. */
  resetIn: number;
  /** False when this count is per-instance rather than shared. Reported. */
  shared: boolean;
}

interface LocalEntry {
  count: number;
  resetAt: number;
}

/** Fallback counters, per process. Only used when there is no Redis. */
const LOCAL = Symbol.for('payless.rateLimitFallback');
const g = globalThis as unknown as Record<symbol, Map<string, LocalEntry> | undefined>;
function local(): Map<string, LocalEntry> {
  if (!g[LOCAL]) g[LOCAL] = new Map();
  return g[LOCAL]!;
}

function consumeLocally(key: string, limit: number, windowSeconds: number): RateVerdict {
  const now = Date.now();
  const map = local();
  const entry = map.get(key);

  if (!entry || now > entry.resetAt) {
    map.set(key, { count: 1, resetAt: now + windowSeconds * 1000 });
    return { allowed: true, limit, remaining: limit - 1, resetIn: windowSeconds, shared: false };
  }

  entry.count += 1;
  const resetIn = Math.max(0, Math.ceil((entry.resetAt - now) / 1000));
  return {
    allowed: entry.count <= limit,
    limit,
    remaining: Math.max(0, limit - entry.count),
    resetIn,
    shared: false,
  };
}

/**
 * Spend one request against a bucket.
 *
 * `limit` of -1 means unlimited, which is checked before anything is counted:
 * an unlimited caller should not be paying for a Redis round trip to be told so.
 */
export async function consume(
  key: string,
  limit: number,
  windowSeconds = 3600
): Promise<RateVerdict> {
  if (limit < 0) {
    return { allowed: true, limit: -1, remaining: -1, resetIn: 0, shared: true };
  }
  if (limit === 0) {
    return { allowed: false, limit: 0, remaining: 0, resetIn: windowSeconds, shared: true };
  }
  if (!redisConfigured()) return consumeLocally(key, limit, windowSeconds);

  const bucket = `payless:rate:${key}`;
  try {
    const count = Number(await redisCommand(['INCR', bucket]));
    if (!Number.isFinite(count)) return consumeLocally(key, limit, windowSeconds);

    // Only the request that created the key sets the expiry. Refreshing it on
    // every hit would turn a one hour window into one that never ends for a
    // caller who keeps knocking.
    if (count === 1) await redisCommand(['EXPIRE', bucket, windowSeconds]);

    const ttl = Number(await redisCommand(['TTL', bucket]));
    return {
      allowed: count <= limit,
      limit,
      remaining: Math.max(0, limit - count),
      resetIn: ttl > 0 ? ttl : windowSeconds,
      shared: true,
    };
  } catch (error) {
    // A limiter that fails closed would take the whole API down with Redis.
    // Failing open on the shared counter but still counting locally keeps some
    // ceiling in place, and the verdict says the count is not shared.
    console.error('[rate-limit] shared counter unavailable:', error);
    return consumeLocally(key, limit, windowSeconds);
  }
}

/**
 * Who is calling, for endpoints with no wallet behind them.
 *
 * The forwarded header is the only signal a platform gives, and it can be
 * spoofed. That is acceptable here: this exists to stop a loop hammering an
 * expensive endpoint, not to stop a determined attacker, and pretending
 * otherwise would be the lie worth avoiding.
 */
export function callerKey(headers: Headers, scope: string): string {
  const forwarded = headers.get('x-forwarded-for') || '';
  const ip = forwarded.split(',')[0].trim() || headers.get('x-real-ip') || 'unknown';
  return `${scope}:${ip}`;
}

/** Headers a caller can act on, rather than a bare 429. */
export function rateHeaders(verdict: RateVerdict): Record<string, string> {
  return {
    'x-ratelimit-limit': String(verdict.limit),
    'x-ratelimit-remaining': String(verdict.remaining),
    'x-ratelimit-reset': String(verdict.resetIn),
    // Stated so a caller can tell a real ceiling from a best effort one.
    'x-ratelimit-shared': String(verdict.shared),
    ...(verdict.allowed ? {} : { 'retry-after': String(verdict.resetIn) }),
  };
}
