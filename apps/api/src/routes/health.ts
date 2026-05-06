import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi'
import type { Env } from '../env'

const HealthResponseSchema = z.object({
  ok: z.boolean(),
  version: z.string(),
})

const healthRoute = createRoute({
  method: 'get',
  path: '/health',
  responses: {
    200: {
      content: {
        'application/json': { schema: HealthResponseSchema },
      },
      description: 'API is healthy',
    },
  },
})

const health = new OpenAPIHono<{ Bindings: Env }>()

health.openapi(healthRoute, c => c.json({ ok: true, version: '0.1.0' }))

export default health
