import { Hono } from 'hono'
import type { Env } from './env'
import health from './routes/health'
import discover from './routes/discover'
import { rateLimit } from './middleware/rateLimit'

const app = new Hono<{ Bindings: Env }>()

app.use('/api/discover/*', rateLimit('RATE_LIMIT_DISCOVER'))

app.route('/', health)
app.route('/', discover)

export default app
