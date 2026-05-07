import type { Context, MiddlewareHandler } from 'hono'
import type { Env } from '../env'

/**
 * Per-route rate limiter backed by KV (works on Workers Free).
 *
 * Design:
 *  - Fixed window counters keyed on (key, route, window).
 *  - Window = floor(now / windowSec). Key TTL = 2x window so the bucket
 *    naturally expires (no manual cleanup).
 *  - Default key = CF-Connecting-IP. Override via keyFn for per-user
 *    or per-token rate limiting.
 *  - Sets X-RateLimit-Limit / X-RateLimit-Remaining / X-RateLimit-Reset
 *    on every response. Sets Retry-After on 429.
 *
 * Why KV and not Cloudflare's Rate Limiting API:
 *  - KV is on the free tier; Rate Limiting API requires Workers Paid +
 *    [[unsafe.bindings]] config and is opaque to mocks/tests.
 *  - Once we move to Paid, swapping to RL API is a one-file change
 *    (replace this file's body; keep the same export signature).
 *
 * Notes on accuracy:
 *  - KV is eventually consistent (~60s). Two simultaneous requests from
 *    the same IP at the boundary may both see count=N-1 and both succeed.
 *    Acceptable for our threat model (deters scraping; not anti-DoS).
 *  - Distributed read-modify-write isn't atomic in KV. We accept slight
 *    over-allowance at burst boundaries.
 */

export type RateLimitConfig = {
  /** Max requests allowed within the window. */
  limit: number
  /** Window length in seconds. */
  windowSec: number
  /** Override the rate-limit key (default: CF-Connecting-IP). */
  keyFn?: (c: Context) => string | undefined
  /** Identifies this rate-limit family in KV keys. Required so different
   *  routes have separate buckets even if they share a path prefix. */
  bucketName: string
}

function defaultKey(c: Context): string {
  return (
    c.req.header('CF-Connecting-IP') ??
    c.req.header('X-Forwarded-For')?.split(',')[0]?.trim() ??
    'unknown'
  )
}

export function rateLimit(config: RateLimitConfig): MiddlewareHandler<{ Bindings: Env }> {
  const { limit, windowSec, keyFn, bucketName } = config

  return async (c, next) => {
    const kv = c.env.DISCOVERY_CACHE
    const key = (keyFn ? keyFn(c) : defaultKey(c)) ?? defaultKey(c)
    const nowSec = Math.floor(Date.now() / 1000)
    const window = Math.floor(nowSec / windowSec)
    const resetAt = (window + 1) * windowSec
    const kvKey = `rl:${bucketName}:${key}:${window}`

    const raw = await kv.get(kvKey)
    const count = raw ? parseInt(raw, 10) : 0

    if (count >= limit) {
      const retryAfter = resetAt - nowSec
      return c.json(
        { error: 'Rate limit exceeded' },
        429,
        {
          'Retry-After': String(Math.max(retryAfter, 1)),
          'X-RateLimit-Limit': String(limit),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': String(resetAt),
        },
      )
    }

    // Optimistic increment. Race conditions at the edge are accepted.
    await kv.put(kvKey, String(count + 1), { expirationTtl: windowSec * 2 })

    c.header('X-RateLimit-Limit', String(limit))
    c.header('X-RateLimit-Remaining', String(Math.max(limit - count - 1, 0)))
    c.header('X-RateLimit-Reset', String(resetAt))
    return next()
  }
}

// ─── Pre-configured limiters by route group ─────────────────────────────────
// Tighter limits on routes that proxy external content (probe) than on routes
// that are pure cache reads (county lookups). Authenticated routes use a
// per-user limiter (keyFn pulls c.var.userId set by requireAuth).

/** /api/discover/county/:slug — 60 req/min/IP. Pure cache reads, generous. */
export const discoverCountyLimit = rateLimit({
  bucketName: 'discover-county',
  limit: 60,
  windowSec: 60,
})

/** /api/discover/probe — 20 req/min/IP. Proxies external HTTP, abuse vector. */
export const discoverProbeLimit = rateLimit({
  bucketName: 'discover-probe',
  limit: 20,
  windowSec: 60,
})

/**
 * /api/projects/* — 120 req/min PER USER (keyed off the authenticated userId).
 * Falls back to per-IP for the brief window between origin guard pass and auth
 * middleware setting userId (e.g. a 401 response from missing token); per-IP
 * still serves as a floor against unauthenticated abuse.
 *
 * 120/min is generous for a real human session (the project list won't be
 * fetched that often) but tight enough that automated enumeration / scraping
 * of a user's projects is impractical even with a stolen session token.
 */
export const projectsRateLimit = rateLimit({
  bucketName: 'projects',
  limit: 120,
  windowSec: 60,
  keyFn: c => {
    // c.var.userId is set by requireAuth. If unset (auth not yet run, or token
    // invalid), fall back to IP so we still rate-limit pre-auth requests.
    const userId = c.get('userId' as never) as string | undefined
    if (userId) return `u:${userId}`
    return undefined // triggers default IP-based key in rateLimit()
  },
})

/** Default for any future /api/* route that doesn't declare its own limit. */
export const defaultApiLimit = rateLimit({
  bucketName: 'api-default',
  limit: 30,
  windowSec: 60,
})
