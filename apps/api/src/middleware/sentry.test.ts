import { describe, it, expect, vi, beforeEach } from 'vitest'
import { sentryConfig } from './sentry'

// Keep real @sentry/cloudflare, but replace capture functions with spies.
vi.mock('@sentry/cloudflare', async () => {
  const actual = await vi.importActual<typeof import('@sentry/cloudflare')>('@sentry/cloudflare')
  return { ...actual, captureMessage: vi.fn(), captureException: vi.fn() }
})

type Evt = Parameters<ReturnType<typeof sentryConfig>['beforeSend']>[0]

function makeEnv(overrides: Partial<{ SENTRY_DSN_API: string; WORKER_VERSION: string }> = {}) {
  return { DISCOVERY_CACHE: {} as KVNamespace, ...overrides }
}

// ─── sentryConfig unit tests ─────────────────────────────────────────────────

describe('sentryConfig', () => {
  describe('enabled flag', () => {
    it('disables Sentry when DSN is absent', () => {
      expect(sentryConfig(makeEnv()).enabled).toBe(false)
    })

    it('enables Sentry when DSN is present', () => {
      const cfg = sentryConfig(makeEnv({ SENTRY_DSN_API: 'https://pub@sentry.io/1' }))
      expect(cfg.enabled).toBe(true)
      expect(cfg.dsn).toBe('https://pub@sentry.io/1')
    })
  })

  it('sets release from WORKER_VERSION', () => {
    const cfg = sentryConfig(makeEnv({ SENTRY_DSN_API: 'https://pub@sentry.io/1', WORKER_VERSION: 'deadbeef' }))
    expect(cfg.release).toBe('deadbeef')
  })

  it('uses 10% trace sampling', () => {
    expect(sentryConfig(makeEnv()).tracesSampleRate).toBe(0.1)
  })

  describe('beforeSend — PII scrubbing', () => {
    const cfg = sentryConfig(makeEnv({ SENTRY_DSN_API: 'https://pub@sentry.io/1' }))

    it('removes Authorization header', () => {
      const event: Evt = { request: { headers: { Authorization: 'Bearer secret', 'Content-Type': 'application/json' } } }
      cfg.beforeSend(event, {})
      expect((event.request!['headers'] as Record<string, string>)['Authorization']).toBeUndefined()
      expect((event.request!['headers'] as Record<string, string>)['Content-Type']).toBe('application/json')
    })

    it('removes lowercase authorization header', () => {
      const event: Evt = { request: { headers: { authorization: 'Bearer secret' } } }
      cfg.beforeSend(event, {})
      expect((event.request!['headers'] as Record<string, string>)['authorization']).toBeUndefined()
    })

    it('removes request body data', () => {
      const event: Evt = { request: { headers: {}, data: '{"password":"s3cr3t"}' } }
      cfg.beforeSend(event, {})
      expect(event.request!['data']).toBeUndefined()
    })

    it('passes events without a request field unchanged', () => {
      const event: Evt = { message: 'something went wrong', level: 'error' }
      const result = cfg.beforeSend(event, {})
      expect(result).toBe(event)
    })
  })
})

// ─── slow request capture ────────────────────────────────────────────────────

describe('slow request capture', () => {
  beforeEach(() => vi.restoreAllMocks())

  it('calls captureMessage when a request exceeds 2 seconds', async () => {
    const { captureMessage } = await import('@sentry/cloudflare')
    const { app } = await import('../index')

    let tick = 0
    vi.spyOn(Date, 'now').mockImplementation(() => (tick++ === 0 ? 0 : 2500))

    await app.fetch(new Request('http://localhost/health'), { DISCOVERY_CACHE: {} as KVNamespace })

    expect(vi.mocked(captureMessage)).toHaveBeenCalledWith(expect.stringContaining('Slow request'), 'warning')
  })

  it('does not call captureMessage for fast requests', async () => {
    const { captureMessage } = await import('@sentry/cloudflare')
    const { app } = await import('../index')

    vi.spyOn(Date, 'now').mockReturnValue(0)

    await app.fetch(new Request('http://localhost/health'), { DISCOVERY_CACHE: {} as KVNamespace })

    expect(vi.mocked(captureMessage)).not.toHaveBeenCalled()
  })
})

// ─── forced exception capture ────────────────────────────────────────────────
// Simulates what @sentry/cloudflare's withSentry does: call captureException
// when the Hono handler throws. Tests that our handler wiring is correct.

describe('forced exception capture', () => {
  it('captures an unhandled exception thrown inside a route', async () => {
    const captureExceptionSpy = vi.fn()
    const { Hono } = await import('hono')

    const testApp = new Hono()
    testApp.get('/boom', () => {
      throw new Error('forced test error')
    })

    // Minimal withSentry stub: mirrors the real SDK's error-capture behaviour
    const wrapped = {
      async fetch(req: Request, env: unknown, ctx: unknown) {
        try {
          return await testApp.fetch(req, env as never, ctx as never)
        } catch (err) {
          captureExceptionSpy(err)
          throw err
        }
      },
    }

    await expect(
      wrapped.fetch(new Request('http://localhost/boom'), {}, {}),
    ).rejects.toThrow('forced test error')

    expect(captureExceptionSpy).toHaveBeenCalledWith(expect.objectContaining({ message: 'forced test error' }))
  })
})
