import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Hono } from 'hono'

// Mock jose before any module that imports it
vi.mock('jose', () => ({
  createRemoteJWKSet: vi.fn(() => 'mock-jwks'),
  jwtVerify: vi.fn(),
}))

import { jwtVerify } from 'jose'

// Build a fake base64url-encoded JWT so the middleware can decode the payload
function makeJwt(payload: Record<string, unknown>): string {
  const enc = (o: object) =>
    Buffer.from(JSON.stringify(o))
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '')
  return `${enc({ alg: 'RS256', typ: 'JWT' })}.${enc({ iss: 'https://clerk.test.dev', ...payload })}.fakesig`
}

// Minimal D1Database mock — each call to prepare() consumes the next row-set
type Row = Record<string, unknown>
function makeD1(rowSets: Row[][] = []) {
  let idx = 0
  return {
    prepare: () => {
      const myIdx = idx++
      const rows = rowSets[myIdx] ?? []
      return {
        bind: function () {
          return this
        },
        get: async () => rows[0] ?? null,
        all: async () => ({ results: rows, success: true, meta: {} }),
        run: async () => ({ success: true, meta: {} }),
        first: async () => rows[0] ?? null,
        raw: async () => [],
      }
    },
    exec: async () => ({ count: 0, duration: 0 }),
    batch: async () => [],
    dump: async () => new ArrayBuffer(0),
  } as unknown as D1Database
}

type Env = { DB: D1Database; CLERK_SECRET_KEY: string }

async function buildApp() {
  // Dynamic import so vi.mock has applied before the module loads
  const mod = await import('./projects')
  const app = new Hono<{ Bindings: Env }>()
  app.route('/api/projects', mod.default as Parameters<typeof app.route>[1])
  return app
}

describe('auth required', () => {
  let app: Hono

  beforeEach(async () => {
    vi.clearAllMocks()
    app = await buildApp()
  })

  it('GET /api/projects → 401 without token', async () => {
    const res = await app.request(
      '/api/projects',
      { method: 'GET' },
      { DB: makeD1(), CLERK_SECRET_KEY: 'sk_test' },
    )
    expect(res.status).toBe(401)
  })

  it('POST /api/projects → 401 without token', async () => {
    const res = await app.request(
      '/api/projects',
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{"name":"x"}' },
      { DB: makeD1(), CLERK_SECRET_KEY: 'sk_test' },
    )
    expect(res.status).toBe(401)
  })

  it('GET /api/projects/:id → 401 without token', async () => {
    const res = await app.request(
      '/api/projects/abc',
      { method: 'GET' },
      { DB: makeD1(), CLERK_SECRET_KEY: 'sk_test' },
    )
    expect(res.status).toBe(401)
  })

  it('DELETE /api/projects/:id → 401 without token', async () => {
    const res = await app.request(
      '/api/projects/abc',
      { method: 'DELETE' },
      { DB: makeD1(), CLERK_SECRET_KEY: 'sk_test' },
    )
    expect(res.status).toBe(401)
  })
})

describe('validation rejects bad input', () => {
  let app: Hono

  beforeEach(async () => {
    vi.clearAllMocks()
    // Mock jwtVerify to succeed for all auth'd tests
    vi.mocked(jwtVerify).mockResolvedValue({
      payload: { sub: 'user_me', iss: 'https://clerk.test.dev' },
    } as Awaited<ReturnType<typeof jwtVerify>>)
    app = await buildApp()
  })

  const authHeaders = (userId = 'user_me') => ({
    Authorization: `Bearer ${makeJwt({ sub: userId })}`,
    'Content-Type': 'application/json',
  })

  // DB that says the user already exists (avoids Clerk API call in middleware)
  const authedEnv = () => ({
    DB: makeD1([[{ id: 'user_me' }]]),
    CLERK_SECRET_KEY: 'sk_test',
  })

  it('POST /api/projects → 400 with missing name', async () => {
    const res = await app.request(
      '/api/projects',
      { method: 'POST', headers: authHeaders(), body: JSON.stringify({ description: 'no name' }) },
      authedEnv(),
    )
    expect(res.status).toBe(400)
  })

  it('POST /api/projects → 400 with empty name', async () => {
    const res = await app.request(
      '/api/projects',
      { method: 'POST', headers: authHeaders(), body: JSON.stringify({ name: '' }) },
      authedEnv(),
    )
    expect(res.status).toBe(400)
  })

  it('PATCH /api/projects/:id → 400 with empty body', async () => {
    const res = await app.request(
      '/api/projects/abc',
      { method: 'PATCH', headers: authHeaders(), body: JSON.stringify({}) },
      authedEnv(),
    )
    expect(res.status).toBe(400)
  })

  it('POST /api/projects/bulk → 400 with empty array', async () => {
    const res = await app.request(
      '/api/projects/bulk',
      { method: 'POST', headers: authHeaders(), body: JSON.stringify([]) },
      authedEnv(),
    )
    expect(res.status).toBe(400)
  })
})

describe('ownership enforced', () => {
  let app: Hono

  beforeEach(async () => {
    vi.clearAllMocks()
    vi.mocked(jwtVerify).mockResolvedValue({
      payload: { sub: 'user_me', iss: 'https://clerk.test.dev' },
    } as Awaited<ReturnType<typeof jwtVerify>>)
    app = await buildApp()
  })

  const otherUserProject: Row = {
    id: 'proj-abc',
    user_id: 'other_user',
    name: 'Not Mine',
    data: '{"features":[]}',
    created_at: 1000,
    updated_at: 1000,
  }

  function envWithProject() {
    // rowSets[0] = user check in middleware → user exists
    // rowSets[1] = project fetch in route → other user's project
    return {
      DB: makeD1([[{ id: 'user_me' }], [otherUserProject]]),
      CLERK_SECRET_KEY: 'sk_test',
    }
  }

  const authHeader = () => ({
    Authorization: `Bearer ${makeJwt({ sub: 'user_me' })}`,
  })

  it('GET /api/projects/:id → 403 for another user\'s project', async () => {
    const res = await app.request(
      '/api/projects/proj-abc',
      { method: 'GET', headers: authHeader() },
      envWithProject(),
    )
    expect(res.status).toBe(403)
  })

  it('PATCH /api/projects/:id → 403 for another user\'s project', async () => {
    const res = await app.request(
      '/api/projects/proj-abc',
      {
        method: 'PATCH',
        headers: { ...authHeader(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Steal' }),
      },
      envWithProject(),
    )
    expect(res.status).toBe(403)
  })

  it('DELETE /api/projects/:id → 403 for another user\'s project', async () => {
    const res = await app.request(
      '/api/projects/proj-abc',
      { method: 'DELETE', headers: authHeader() },
      envWithProject(),
    )
    expect(res.status).toBe(403)
  })
})
