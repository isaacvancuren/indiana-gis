import { describe, it, expect, vi, beforeEach } from 'vitest'
import app from '../index'
import { isAllowedHost } from './discover'

// Minimal KV mock — only the methods discover.ts uses
function makeMockKV(initial: Record<string, string> = {}): KVNamespace {
  const store: Record<string, string> = { ...initial }
  return {
    get: vi.fn(async (key: string, type?: string) => {
      const val = store[key] ?? null
      if (val === null) return null
      if (type === 'json') return JSON.parse(val)
      return val
    }),
    put: vi.fn(async (key: string, value: string) => {
      store[key] = value
    }),
    delete: vi.fn(),
    list: vi.fn(),
    getWithMetadata: vi.fn(),
  } as unknown as KVNamespace
}

function makeMockRateLimit(allow = true): RateLimit {
  return {
    limit: vi.fn(async () => ({ success: allow })),
  } as unknown as RateLimit
}

// Stateful mock that allows `limit` requests then blocks
function makeMockRateLimitStateful(limitCount: number): RateLimit {
  let count = 0
  return {
    limit: vi.fn(async () => ({ success: ++count <= limitCount })),
  } as unknown as RateLimit
}

function makeEnv(opts: { allow?: boolean; kv?: KVNamespace } = {}) {
  return {
    DISCOVERY_CACHE: opts.kv ?? makeMockKV(),
    RATE_LIMIT_DISCOVER: makeMockRateLimit(opts.allow ?? true),
  }
}

// ─── isAllowedHost ───────────────────────────────────────────────────────────

describe('isAllowedHost', () => {
  it('allows .in.gov hosts', () => {
    expect(isAllowedHost('gis1.hamiltoncounty.in.gov')).toBe(true)
    expect(isAllowedHost('maps.tippecanoe.in.gov')).toBe(true)
    expect(isAllowedHost('gisdata.in.gov')).toBe(true)
  })

  it('allows .indy.gov hosts', () => {
    expect(isAllowedHost('gis.indy.gov')).toBe(true)
    expect(isAllowedHost('maps.indy.gov')).toBe(true)
  })

  it('allows exact arcgis.com hosts', () => {
    expect(isAllowedHost('services1.arcgis.com')).toBe(true)
    expect(isAllowedHost('services2.arcgis.com')).toBe(true)
    expect(isAllowedHost('services3.arcgis.com')).toBe(true)
    expect(isAllowedHost('services5.arcgis.com')).toBe(true)
    expect(isAllowedHost('services6.arcgis.com')).toBe(true)
    expect(isAllowedHost('services8.arcgis.com')).toBe(true)
  })

  it('allows other explicitly allowed hosts', () => {
    expect(isAllowedHost('gis.cityoffortwayne.org')).toBe(true)
    expect(isAllowedHost('wfs.schneidercorp.com')).toBe(true)
    expect(isAllowedHost('lcsogis.lakecountyin.org')).toBe(true)
    expect(isAllowedHost('maps.evansvillegis.com')).toBe(true)
    expect(isAllowedHost('gis.southbendin.gov')).toBe(true)
  })

  it('rejects unknown hosts', () => {
    expect(isAllowedHost('evil.com')).toBe(false)
    expect(isAllowedHost('google.com')).toBe(false)
    expect(isAllowedHost('services99.arcgis.com')).toBe(false)
    expect(isAllowedHost('notarcgis.com')).toBe(false)
  })

  it('rejects hosts that look like allowlist bypasses', () => {
    // domain.in.gov.evil.com must NOT be allowed
    expect(isAllowedHost('gis1.hamiltoncounty.in.gov.evil.com')).toBe(false)
    expect(isAllowedHost('fake.indy.gov.com')).toBe(false)
  })
})

// ─── Rate limiting middleware ─────────────────────────────────────────────────

describe('Rate limiting on /api/discover/*', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('allows request when rate limiter returns success', async () => {
    const res = await app.fetch(
      new Request('http://localhost/api/discover/county/unknowncounty'),
      makeEnv({ allow: true }),
    )
    expect(res.status).toBe(200)
  })

  it('returns 429 with Retry-After header when rate limiter blocks', async () => {
    const res = await app.fetch(
      new Request('http://localhost/api/discover/county/marion'),
      makeEnv({ allow: false }),
    )
    expect(res.status).toBe(429)
    expect(res.headers.get('Retry-After')).toBe('60')
    const body = (await res.json()) as { error: string }
    expect(body.error).toMatch(/rate limit/i)
  })

  it('returns 429 on the 31st request (stateful mock, 30-req limit)', async () => {
    const kv = makeMockKV()
    const rateLimit = makeMockRateLimitStateful(30)
    const env = { DISCOVERY_CACHE: kv, RATE_LIMIT_DISCOVER: rateLimit }

    // First 30 requests should succeed (unknown county returns 200 without upstream calls)
    for (let i = 1; i <= 30; i++) {
      const res = await app.fetch(
        new Request('http://localhost/api/discover/county/unknowncounty'),
        env,
      )
      expect(res.status).toBe(200)
    }

    // 31st request must be blocked
    const res = await app.fetch(
      new Request('http://localhost/api/discover/county/unknowncounty'),
      env,
    )
    expect(res.status).toBe(429)
    expect(res.headers.get('Retry-After')).toBe('60')
  })

  it('does not apply rate limiting to /health', async () => {
    // health route has no rate limiter — passes even with allow=false in env
    const res = await app.fetch(
      new Request('http://localhost/health'),
      makeEnv({ allow: false }),
    )
    expect(res.status).toBe(200)
  })
})

// ─── GET /api/discover/probe ─────────────────────────────────────────────────

describe('GET /api/discover/probe', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('returns 400 for missing url', async () => {
    const res = await app.fetch(new Request('http://localhost/api/discover/probe'), makeEnv())
    expect(res.status).toBe(400)
  })

  it('returns 400 for non-https url', async () => {
    const url = encodeURIComponent('http://gis1.hamiltoncounty.in.gov/arcgis/rest/services?f=json')
    const res = await app.fetch(new Request(`http://localhost/api/discover/probe?url=${url}`), makeEnv())
    expect(res.status).toBe(400)
    const body = (await res.json()) as { error: string }
    expect(body.error).toMatch(/https/i)
  })

  it('returns 403 for disallowed host', async () => {
    const url = encodeURIComponent('https://evil.com/arcgis/rest/services?f=json')
    const res = await app.fetch(new Request(`http://localhost/api/discover/probe?url=${url}`), makeEnv())
    expect(res.status).toBe(403)
    const body = (await res.json()) as { error: string }
    expect(body.error).toMatch(/not allowed/i)
  })

  it('returns 429 when rate limiter blocks', async () => {
    const url = encodeURIComponent('https://gis1.hamiltoncounty.in.gov/arcgis/rest/services?f=json')
    const res = await app.fetch(
      new Request(`http://localhost/api/discover/probe?url=${url}`),
      makeEnv({ allow: false }),
    )
    expect(res.status).toBe(429)
    expect(res.headers.get('Retry-After')).toBe('60')
  })

  it('returns cached:true on KV cache hit', async () => {
    const probeUrl = 'https://gis1.hamiltoncounty.in.gov/arcgis/rest/services?f=json'
    const cachedPayload = { currentVersion: 10.81, services: [] }
    const kv = makeMockKV({ [`discover:probe:${probeUrl}`]: JSON.stringify(cachedPayload) })

    const res = await app.fetch(
      new Request(`http://localhost/api/discover/probe?url=${encodeURIComponent(probeUrl)}`),
      makeEnv({ kv }),
    )
    expect(res.status).toBe(200)
    const body = (await res.json()) as Record<string, unknown>
    expect(body['cached']).toBe(true)
    expect(body['currentVersion']).toBe(10.81)
  })

  it('returns 502 when upstream times out', async () => {
    const abortErr = Object.assign(new Error('The operation was aborted'), { name: 'AbortError' })
    vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(abortErr)

    const probeUrl = encodeURIComponent('https://gis1.hamiltoncounty.in.gov/arcgis/rest/services?f=json')
    const res = await app.fetch(new Request(`http://localhost/api/discover/probe?url=${probeUrl}`), makeEnv())
    expect(res.status).toBe(502)
    const body = (await res.json()) as { error: string }
    expect(body.error).toMatch(/Upstream error/i)
  })
})

// ─── GET /api/discover/county/:slug ──────────────────────────────────────────

describe('GET /api/discover/county/:slug', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('returns 200 with empty sources for unknown county slug', async () => {
    const res = await app.fetch(
      new Request('http://localhost/api/discover/county/unknowncounty'),
      makeEnv(),
    )
    expect(res.status).toBe(200)
    const body = (await res.json()) as { slug: string; sources: unknown[]; errors: string[] }
    expect(body.slug).toBe('unknowncounty')
    expect(body.sources).toHaveLength(0)
    expect(body.errors).toContain('no known REST root')
  })

  it('returns cached:true on KV cache hit', async () => {
    const cached = {
      slug: 'marion',
      fetched_at: new Date().toISOString(),
      sources: [{ host: 'gis.indy.gov', rest_root: 'https://gis.indy.gov/server/rest/services', services: [] }],
      errors: [],
    }
    const kv = makeMockKV({ 'discover:county:marion': JSON.stringify(cached) })

    const res = await app.fetch(
      new Request('http://localhost/api/discover/county/marion'),
      makeEnv({ kv }),
    )
    expect(res.status).toBe(200)
    const body = (await res.json()) as Record<string, unknown>
    expect(body['cached']).toBe(true)
    expect(body['slug']).toBe('marion')
    expect(body['sources']).toHaveLength(1)
  })

  it('bypasses cache with ?refresh=1', async () => {
    const cached = {
      slug: 'marion',
      fetched_at: '2000-01-01T00:00:00.000Z',
      sources: [],
      errors: ['stale'],
    }
    const kv = makeMockKV({ 'discover:county:marion': JSON.stringify(cached) })

    // Mock upstream to return empty services so the handler completes without real I/O
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ services: [], folders: [] }), { status: 200 }),
    )

    const res = await app.fetch(
      new Request('http://localhost/api/discover/county/marion?refresh=1'),
      makeEnv({ kv }),
    )
    expect(res.status).toBe(200)
    const body = (await res.json()) as Record<string, unknown>
    // Result should NOT be the stale cached version
    expect(body['cached']).toBeUndefined()
    expect(body['errors']).not.toContain('stale')
  })
})
