import { Hono } from 'hono'
import { captureMessage } from '@sentry/cloudflare'
import type { Env } from './env'
import { withSentry, sentryConfig } from './middleware/sentry'
import { originGuard } from './middleware/originGuard'
import health from './routes/health'
import discover from './routes/discover'

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

app.route('/', health)
app.route('/', discover)

export default withSentry(
  (env: Env) => sentryConfig(env),
  {
    async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
      return app.fetch(request, env, ctx)
    },
  },
)
