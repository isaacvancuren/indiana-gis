import { Hono } from 'hono'
import { captureMessage } from '@sentry/cloudflare'
import type { Env } from './env'
import { withSentry, sentryConfig } from './middleware/sentry'
import { originGuard } from './middleware/originGuard'
<<<<<<< HEAD
import { discoverCountyLimit, discoverProbeLimit } from './middleware/rateLimit'
import { handleBackup } from './cron/backup'
=======
import {
  discoverCountyLimit,
  discoverProbeLimit,
  projectsRateLimit,
} from './middleware/rateLimit'
>>>>>>> 1b3fd33 (feat(api): auto-apply D1 migrations on deploy + per-user rate limit on /api/projects)
import health from './routes/health'
import discover from './routes/discover'
import projects from './routes/projects'

export const app = new Hono<{ Bindings: Env }>()

// Capture requests that take longer than 2 seconds
app.use('*', async (c, next) => {
  const start = Date.now()
  await next()
  const ms = Date.now() - start
  if (ms > 2000) {
    captureMessage(`Slow request: ${c.req.method} ${c.req.path} (${ms}ms)`, 'warning')
  }
})

// Origin allow-list on /api/* only. /health stays open for monitoring + uptime checks.
app.use('/api/*', originGuard)

// Per-route rate limits. Order matters — most specific first.
// /api/discover/probe is tighter than /county/:slug because probe proxies
// arbitrary external HTTP and is the higher-abuse-risk surface.
// /api/projects/* uses per-user keying (falls back to per-IP for unauth requests).
app.use('/api/discover/probe', discoverProbeLimit)
app.use('/api/discover/county/*', discoverCountyLimit)
app.use('/api/projects/*', projectsRateLimit)

app.route('/', health)
app.route('/', discover)
app.route('/api/projects', projects)

export default withSentry(
  (env: Env) => sentryConfig(env),
  {
    async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
      return app.fetch(request, env, ctx)
    },
    async scheduled(_event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
      // Daily D1 → R2 backup. waitUntil so the cron event resolves immediately.
      ctx.waitUntil(handleBackup(env))
    },
  },
)
