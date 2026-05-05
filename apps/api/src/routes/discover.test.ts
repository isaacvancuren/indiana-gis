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

// ─── GET /api/discover/probe ─────────────────────────────────────────────────

describe('GET /api/discover/probe', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('returns 400 for missing url', async () => {
    const res = await app.fetch(new Request('http://localhost/api/discover/probe'), {
      DISCOVERY_CACHE: makeMockKV(),
    })
    expect(res.status).toBe(400)
  })

  it('returns 400 for non-https url', async () => {
    const url = encodeURIComponent('http://gis1.hamiltoncounty.in.gov/arcgis/rest/services?f=json')
    const res = await app.fetch(new Request(`http://localhost/api/discover/probe?url=${url}`), {
      DISCOVERY_CACHE: makeMockKV(),
    })
    expect(res.status).toBe(400)
    const body = (await res.json()) as { error: string }
    expect(body.error).toMatch(/https/i)
  })

  it('returns 403 for disallowed host', async () => {
    const url = encodeURIComponent('https://evil.com/arcgis/rest/services?f=json')
    const res = await app.fetch(new Request(`http://localhost/api/discover/probe?url=${url}`), {
      DISCOVERY_CACHE: makeMockKV(),
    })
    expect(res.status).toBe(403)
    const body = (await res.json()) as { error: string }
    expect(body.error).toMatch(/not allowed/i)
  })

  it('returns cached:true on KV cache hit', async () => {
    const probeUrl = 'https://gis1.hamiltoncounty.in.gov/arcgis/rest/services?f=json'
    const cachedPayload = { currentVersion: 10.81, services: [] }
    const kv = makeMockKV({ [`discover:probe:${probeUrl}`]: JSON.stringify(cachedPayload) })

    const res = await app.fetch(
      new Request(`http://localhost/api/discover/probe?url=${encodeURIComponent(probeUrl)}`),
      { DISCOVERY_CACHE: kv },
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
    const res = await app.fetch(new Request(`http://localhost/api/discover/probe?url=${probeUrl}`), {
      DISCOVERY_CACHE: makeMockKV(),
    })
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
    const res = await app.fetch(new Request('http://localhost/api/discover/county/unknowncounty'), {
      DISCOVERY_CACHE: makeMockKV(),
    })
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

    const res = await app.fetch(new Request('http://localhost/api/discover/county/marion'), {
      DISCOVERY_CACHE: kv,
    })
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

    const res = await app.fetch(new Request('http://localhost/api/discover/county/marion?refresh=1'), {
      DISCOVERY_CACHE: kv,
    })
    expect(res.status).toBe(200)
    const body = (await res.json()) as Record<string, unknown>
    // Result should NOT be the stale cached version
    expect(body['cached']).toBeUndefined()
    expect(body['errors']).not.toContain('stale')
  })
})
