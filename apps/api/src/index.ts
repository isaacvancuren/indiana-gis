import { Hono } from 'hono'
import type { Env } from './env'
import health from './routes/health'
import discover from './routes/discover'

const app = new Hono<{ Bindings: Env }>()

app.route('/', health)
app.route('/', discover)

export default app
