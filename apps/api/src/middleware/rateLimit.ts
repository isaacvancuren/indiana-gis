import type { MiddlewareHandler } from 'hono'
import type { Env } from '../env'

// Keys in Env whose values implement the CF Workers RateLimit binding interface
type RateLimitKey = keyof { [K in keyof Env as Env[K] extends RateLimit ? K : never]: Env[K] }

export function rateLimit(bindingKey: RateLimitKey): MiddlewareHandler<{ Bindings: Env }> {
  return async (c, next) => {
    const limiter = c.env[bindingKey] as RateLimit | undefined
    if (limiter) {
      const ip = c.req.header('CF-Connecting-IP') ?? c.req.header('X-Forwarded-For') ?? 'unknown'
      const { success } = await limiter.limit({ key: ip })
      if (!success) {
        return c.json({ error: 'Rate limit exceeded' }, 429, { 'Retry-After': '60' })
      }
    }
    await next()
  }
}
