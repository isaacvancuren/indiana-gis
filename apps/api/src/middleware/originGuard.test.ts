import { describe, it, expect } from 'vitest'
import { Hono } from 'hono'
import { originGuard } from './originGuard'
import type { Env } from '../env'

function makeApp() {
  const app = new Hono<{ Bindings: Env }>()
  app.use('/api/*', originGuard)
  app.get('/api/test', c => c.json({ ok: true }))
  app.get('/health', c => c.json({ ok: true }))
  return app
}

const env = { DISCOVERY_CACHE: {} as KVNamespace }

function req(path: string, headers: Record<string, string> = {}) {
  return new Request(`http://localhost${path}`, { headers })
}

describe('originGuard', () => {
  const app = makeApp()

  it('allows mapnova.org origin', async () => {
    const res = await app.fetch(req('/api/test', { Origin: 'https://mapnova.org' }), env)
    expect(res.status).toBe(200)
  })

  it('allows www.mapnova.org origin', async () => {
    const res = await app.fetch(req('/api/test', { Origin: 'https://www.mapnova.org' }), env)
    expect(res.status).toBe(200)
  })

  it('allows Cloudflare Pages preview origin', async () => {
    const res = await app.fetch(
      req('/api/test', { Origin: 'https://fix-something.mapnova.pages.dev' }),
      env,
    )
    expect(res.status).toBe(200)
  })

  it('allows localhost for local dev', async () => {
    const res = await app.fetch(req('/api/test', { Origin: 'http://localhost:5173' }), env)
    expect(res.status).toBe(200)
  })

  it('falls back to Referer when Origin is missing', async () => {
    const res = await app.fetch(
      req('/api/test', { Referer: 'https://mapnova.org/some/path' }),
      env,
    )
    expect(res.status).toBe(200)
  })

  it('rejects unknown origin with 403', async () => {
    const res = await app.fetch(req('/api/test', { Origin: 'https://evil.com' }), env)
    expect(res.status).toBe(403)
    const body = (await res.json()) as { error: string }
    expect(body.error).toMatch(/origin not allowed/i)
  })

  it('rejects request with no Origin and no Referer', async () => {
    const res = await app.fetch(req('/api/test'), env)
    expect(res.status).toBe(403)
  })

  it('rejects malformed Origin header', async () => {
    const res = await app.fetch(req('/api/test', { Origin: 'not-a-url' }), env)
    expect(res.status).toBe(403)
  })

  it('rejects look-alike domain', async () => {
    const res = await app.fetch(
      req('/api/test', { Origin: 'https://mapnova.org.evil.com' }),
      env,
    )
    expect(res.status).toBe(403)
  })

  it('does not affect /health (no Origin required)', async () => {
    const res = await app.fetch(req('/health'), env)
    expect(res.status).toBe(200)
  })
})
