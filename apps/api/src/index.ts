import { OpenAPIHono } from '@hono/zod-openapi'
import { swaggerUI } from '@hono/swagger-ui'
import type { Env } from './env'
import health from './routes/health'
import discover from './routes/discover'

const app = new OpenAPIHono<{ Bindings: Env }>()

app.route('/', health)
app.route('/', discover)

app.doc('/openapi.json', {
  openapi: '3.1.0',
  info: { title: 'Mapnova API', version: '0.1.0' },
})

app.get('/docs', swaggerUI({ url: '/openapi.json' }))

export default app
