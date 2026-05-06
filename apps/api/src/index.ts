import { Hono } from 'hono'
import type { Env } from './env'
import health from './routes/health'
import discover from './routes/discover'
import { handleBackup } from './cron/backup'

const app = new Hono<{ Bindings: Env }>()

app.route('/', health)
app.route('/', discover)

export default {
  fetch: app.fetch.bind(app),
  async scheduled(_event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
    ctx.waitUntil(handleBackup(env))
  },
}
