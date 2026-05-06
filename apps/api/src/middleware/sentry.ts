import type { Env } from '../env'

export { withSentry } from '@sentry/cloudflare'

export function sentryConfig(env: Env) {
  return {
    dsn: env.SENTRY_DSN_API ?? '',
    enabled: !!env.SENTRY_DSN_API,
    release: env.WORKER_VERSION,
    tracesSampleRate: 0.1,
    beforeSend(
      event: { request?: Record<string, unknown>; [k: string]: unknown },
      _hint: unknown,
    ) {
      if (event.request) {
        const req = event.request
        if (req['headers']) {
          const headers = { ...(req['headers'] as Record<string, string>) }
          delete headers['Authorization']
          delete headers['authorization']
          req['headers'] = headers
        }
        delete req['data']
      }
      return event
    },
  }
}
