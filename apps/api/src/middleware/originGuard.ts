import type { MiddlewareHandler } from 'hono'
import type { Env } from '../env'

// Allowed exact origins (production + Cloudflare-managed domains).
const ALLOWED_ORIGINS = new Set<string>([
  'https://mapnova.org',
  'https://www.mapnova.org',
])

// Allowed hostname patterns. Cloudflare Pages serves previews on
// <branch>.mapnova.pages.dev plus the production-pages domain.
const ALLOWED_HOST_PATTERNS: RegExp[] = [
  /^([a-z0-9-]+\.)?mapnova\.pages\.dev$/,
  /^([a-z0-9-]+\.)?mapnova\.org$/,
]

// Localhost ports for local development.
const ALLOWED_LOCAL_HOSTNAMES = new Set<string>([
  'localhost',
  '127.0.0.1',
  '0.0.0.0',
])

function originAllowed(rawHeader: string | undefined): boolean {
  if (!rawHeader) return false
  let url: URL
  try {
    url = new URL(rawHeader)
  } catch {
    return false
  }
  const originStr = `${url.protocol}//${url.host}`
  if (ALLOWED_ORIGINS.has(originStr)) return true
  if (ALLOWED_LOCAL_HOSTNAMES.has(url.hostname)) return true
  return ALLOWED_HOST_PATTERNS.some(p => p.test(url.hostname))
}

/**
 * Rejects API requests whose Origin or Referer is not on the mapnova.org
 * domain family. Defense against drive-by frontend cloning: if someone forks
 * the public-era HTML and points it at api.mapnova.org, browsers will block
 * the requests because they originate from a non-allowed domain.
 *
 * Bypassable by anyone using curl with a forged Origin header — that's
 * acceptable for the threat model. The point is to deter casual abuse, not
 * stop a determined attacker.
 *
 * Apply to /api/* only. /health intentionally remains open for monitoring.
 */
export const originGuard: MiddlewareHandler<{ Bindings: Env }> = async (c, next) => {
  const origin = c.req.header('Origin')
  const referer = c.req.header('Referer')

  // At least one must be present and allowed.
  if (origin && originAllowed(origin)) return next()
  if (referer && originAllowed(referer)) return next()

  return c.json({ error: 'Origin not allowed' }, 403)
}
