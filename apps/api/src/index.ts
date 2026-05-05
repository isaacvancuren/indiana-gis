import { Hono } from 'hono'
import { cors } from 'hono/cors'
import type { Env } from './env'
import health from './routes/health'
import projects from './routes/projects'

const app = new Hono<{ Bindings: Env }>()

app.use(
  '*',
  cors({
    origin: '*',
    allowHeaders: ['Authorization', 'Content-Type'],
    allowMethods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  }),
)

app.route('/', health)
app.route('/api/projects', projects)

export default app
