import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Hono } from 'hono'
import { rateLimit } from './rateLimit'
import type { Env } from '../env'

// Stateful KV mock that actually counts increments and respects TTL.
function makeKV(): KVNamespace {
  const store = new Map<string, string>()
  return {
    get: vi.fn(async (k: string) => store.get(k) ?? null),
    put: vi.fn(async (k: string, v: string) => {
      store.set(k, v)
    }),
    delete: vi.fn(async (k: string) => {
      store.delete(k)
    }),
    list: vi.fn(),
    getWithMetadata: vi.fn(),
  } as unknown as KVNamespace
}

const FIXED_NOW_MS = 1_700_000_000_000

function makeApp(limit: number, windowSec: number) {
  const limiter = rateLimit({ bucketName: 'test', limit, windowSec })
  const app = new Hono<{ Bindings: Env }>()
  app.use('*', limiter)
  app.get('/x', c => c.json({ ok: true }))
  return app
}

function req(headers: Record<string, string> = {}) {
  return new Request('http://localhost/x', { headers })
}

describe('rateLimit', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(FIXED_NOW_MS)
  })

  it('allows requests under the limit', async () => {
    const app = makeApp(3, 60)
    const env = { DISCOVERY_CACHE: makeKV() } as Env

    for (let i = 0; i < 3; i++) {
      const res = await app.fetch(req({ 'CF-Connecting-IP': '1.1.1.1' }), env)
      expect(res.status).toBe(200)
      expect(res.headers.get('X-RateLimit-Limit')).toBe('3')
      expect(res.headers.get('X-RateLimit-Remaining')).toBe(String(3 - i - 1))
    }
  })

  it('returns 429 with Retry-After when limit exceeded', async () => {
    const app = makeApp(2, 60)
    const env = { DISCOVERY_CACHE: makeKV() } as Env

    await app.fetch(req({ 'CF-Connecting-IP': '2.2.2.2' }), env)
    await app.fetch(req({ 'CF-Connecting-IP': '2.2.2.2' }), env)
    const res = await app.fetch(req({ 'CF-Connecting-IP': '2.2.2.2' }), env)

    expect(res.status).toBe(429)
    expect(res.headers.get('Retry-After')).toBeDefined()
    expect(parseInt(res.headers.get('Retry-After')!, 10)).toBeGreaterThan(0)
    expect(res.headers.get('X-RateLimit-Remaining')).toBe('0')
    const body = (await res.json()) as { error: string }
    expect(body.error).toMatch(/rate limit/i)
  })

  it('isolates buckets per IP', async () => {
    const app = makeApp(1, 60)
    const env = { DISCOVERY_CACHE: makeKV() } as Env

    const a = await app.fetch(req({ 'CF-Connecting-IP': '3.3.3.3' }), env)
    const b = await app.fetch(req({ 'CF-Connecting-IP': '4.4.4.4' }), env)
    expect(a.status).toBe(200)
    expect(b.status).toBe(200)

    // Same-IP repeat is blocked
    const c = await app.fetch(req({ 'CF-Connecting-IP': '3.3.3.3' }), env)
    expect(c.status).toBe(429)
  })

  it('falls back to X-Forwarded-For if CF-Connecting-IP missing', async () => {
    const app = makeApp(1, 60)
    const env = { DISCOVERY_CACHE: makeKV() } as Env

    const a = await app.fetch(req({ 'X-Forwarded-For': '5.5.5.5' }), env)
    expect(a.status).toBe(200)

    const b = await app.fetch(req({ 'X-Forwarded-For': '5.5.5.5' }), env)
    expect(b.status).toBe(429)
  })

  it('uses "unknown" key when no IP headers present (still rate-limited)', async () => {
    const app = makeApp(1, 60)
    const env = { DISCOVERY_CACHE: makeKV() } as Env

    const a = await app.fetch(req(), env)
    expect(a.status).toBe(200)

    const b = await app.fetch(req(), env)
    expect(b.status).toBe(429)
  })

  it('rolls to a new bucket when window advances', async () => {
    const app = makeApp(1, 60)
    const env = { DISCOVERY_CACHE: makeKV() } as Env

    const a = await app.fetch(req({ 'CF-Connecting-IP': '6.6.6.6' }), env)
    expect(a.status).toBe(200)

    const b = await app.fetch(req({ 'CF-Connecting-IP': '6.6.6.6' }), env)
    expect(b.status).toBe(429)

    // Advance past the window boundary
    vi.setSystemTime(FIXED_NOW_MS + 60_000 + 1)
    const c = await app.fetch(req({ 'CF-Connecting-IP': '6.6.6.6' }), env)
    expect(c.status).toBe(200)
  })

  it('keyFn override: per-user instead of per-IP', async () => {
    const limiter = rateLimit({
      bucketName: 'test-user',
      limit: 1,
      windowSec: 60,
      keyFn: c => c.req.header('X-User-Id'),
    })
    const app = new Hono<{ Bindings: Env }>()
    app.use('*', limiter)
    app.get('/x', c => c.json({ ok: true }))
    const env = { DISCOVERY_CACHE: makeKV() } as Env

    const a = await app.fetch(
      new Request('http://localhost/x', {
        headers: { 'X-User-Id': 'user_a', 'CF-Connecting-IP': '7.7.7.7' },
      }),
      env,
    )
    expect(a.status).toBe(200)

    // Same user, different IP — still blocked
    const b = await app.fetch(
      new Request('http://localhost/x', {
        headers: { 'X-User-Id': 'user_a', 'CF-Connecting-IP': '8.8.8.8' },
      }),
      env,
    )
    expect(b.status).toBe(429)

    // Different user, same IP — allowed
    const c = await app.fetch(
      new Request('http://localhost/x', {
        headers: { 'X-User-Id': 'user_b', 'CF-Connecting-IP': '7.7.7.7' },
      }),
      env,
    )
    expect(c.status).toBe(200)
  })

  it('separate buckets per bucketName even when key collides', async () => {
    const limiterA = rateLimit({ bucketName: 'route-a', limit: 1, windowSec: 60 })
    const limiterB = rateLimit({ bucketName: 'route-b', limit: 1, windowSec: 60 })
    const app = new Hono<{ Bindings: Env }>()
    app.get('/a', limiterA, c => c.json({ ok: true }))
    app.get('/b', limiterB, c => c.json({ ok: true }))
    const env = { DISCOVERY_CACHE: makeKV() } as Env

    const a1 = await app.fetch(
      new Request('http://localhost/a', { headers: { 'CF-Connecting-IP': '9.9.9.9' } }),
      env,
    )
    const b1 = await app.fetch(
      new Request('http://localhost/b', { headers: { 'CF-Connecting-IP': '9.9.9.9' } }),
      env,
    )
    expect(a1.status).toBe(200)
    expect(b1.status).toBe(200)

    // Both buckets independently exhausted on second hit
    const a2 = await app.fetch(
      new Request('http://localhost/a', { headers: { 'CF-Connecting-IP': '9.9.9.9' } }),
      env,
    )
    const b2 = await app.fetch(
      new Request('http://localhost/b', { headers: { 'CF-Connecting-IP': '9.9.9.9' } }),
      env,
    )
    expect(a2.status).toBe(429)
    expect(b2.status).toBe(429)
  })

  it('Retry-After is at least 1 even at the boundary', async () => {
    const app = makeApp(1, 60)
    const env = { DISCOVERY_CACHE: makeKV() } as Env

    await app.fetch(req({ 'CF-Connecting-IP': '10.10.10.10' }), env)

    // Advance time to ~end of window so resetAt - now is small
    vi.setSystemTime(FIXED_NOW_MS + 59_500)

    const res = await app.fetch(req({ 'CF-Connecting-IP': '10.10.10.10' }), env)
    expect(res.status).toBe(429)
    expect(parseInt(res.headers.get('Retry-After')!, 10)).toBeGreaterThanOrEqual(1)
  })
})
