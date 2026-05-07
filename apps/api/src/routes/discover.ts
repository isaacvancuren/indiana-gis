import { Hono } from 'hono'
import type { Env } from '../env'

type Layer = {
  id: number
  name: string
  geometryType?: string
  defaultVisibility?: boolean
}

type ServiceInfo = {
  name: string
  type: string
  layers: Layer[]
}

type SourceResult = {
  host: string
  rest_root: string
  services: ServiceInfo[]
}

type CountyResult = {
  slug: string
  fetched_at: string
  cached?: boolean
  sources: SourceResult[]
  errors: string[]
}

// Per-county known ArcGIS REST roots (derived from county-gis-servers.js and county-parcel-apis.js)
const COUNTY_SOURCES: Record<string, { host: string; rest_root: string }[]> = {
  marion: [
    { host: 'gis.indy.gov', rest_root: 'https://gis.indy.gov/server/rest/services' },
    { host: 'maps.indy.gov', rest_root: 'https://maps.indy.gov/arcgis/rest/services' },
  ],
  hamilton: [
    { host: 'gis1.hamiltoncounty.in.gov', rest_root: 'https://gis1.hamiltoncounty.in.gov/arcgis/rest/services' },
    { host: 'services5.arcgis.com', rest_root: 'https://services5.arcgis.com/nKFfYbLYNDrYHgoO/arcgis/rest/services' },
  ],
  tippecanoe: [
    { host: 'maps.tippecanoe.in.gov', rest_root: 'https://maps.tippecanoe.in.gov/server/rest/services' },
  ],
  monroe: [
    { host: 'services1.arcgis.com', rest_root: 'https://services1.arcgis.com/nYfGJ9xFTKW6VPqW/arcgis/rest/services' },
    { host: 'wfs.schneidercorp.com', rest_root: 'https://wfs.schneidercorp.com/arcgis/rest/services/MonroeCountyIN_WFS' },
  ],
  madison: [
    { host: 'services3.arcgis.com', rest_root: 'https://services3.arcgis.com/4UkreHBazssuvI82/arcgis/rest/services' },
  ],
  dearborn: [
    { host: 'services2.arcgis.com', rest_root: 'https://services2.arcgis.com/Y0fDSibEfxdu2Ya6/arcgis/rest/services' },
  ],
  franklin: [
    { host: 'services2.arcgis.com', rest_root: 'https://services2.arcgis.com/Y0fDSibEfxdu2Ya6/arcgis/rest/services' },
  ],
  hancock: [
    { host: 'services2.arcgis.com', rest_root: 'https://services2.arcgis.com/Y0fDSibEfxdu2Ya6/arcgis/rest/services' },
    { host: 'wfs.schneidercorp.com', rest_root: 'https://wfs.schneidercorp.com/arcgis/rest/services/HancockCountyIN_WFS' },
  ],
  hendricks: [
    { host: 'services2.arcgis.com', rest_root: 'https://services2.arcgis.com/Y0fDSibEfxdu2Ya6/arcgis/rest/services' },
  ],
  knox: [
    { host: 'services2.arcgis.com', rest_root: 'https://services2.arcgis.com/Y0fDSibEfxdu2Ya6/arcgis/rest/services' },
  ],
  montgomery: [
    { host: 'services2.arcgis.com', rest_root: 'https://services2.arcgis.com/Y0fDSibEfxdu2Ya6/arcgis/rest/services' },
  ],
  morgan: [
    { host: 'services2.arcgis.com', rest_root: 'https://services2.arcgis.com/Y0fDSibEfxdu2Ya6/arcgis/rest/services' },
    { host: 'wfs.schneidercorp.com', rest_root: 'https://wfs.schneidercorp.com/arcgis/rest/services/MorganCountyIN_WFS' },
  ],
  lake: [
    { host: 'services5.arcgis.com', rest_root: 'https://services5.arcgis.com/8CXRnvSfSpwdf0R6/arcgis/rest/services' },
    { host: 'lcsogis.lakecountyin.org', rest_root: 'https://lcsogis.lakecountyin.org/server/rest/services' },
  ],
  porter: [
    { host: 'services5.arcgis.com', rest_root: 'https://services5.arcgis.com/Qp5vz8Fz7vawwcWD/arcgis/rest/services' },
    { host: 'services6.arcgis.com', rest_root: 'https://services6.arcgis.com/TQ2Al5QIvv4tMBL7/arcgis/rest/services' },
  ],
  allen: [
    { host: 'gis.cityoffortwayne.org', rest_root: 'https://gis.cityoffortwayne.org/arcgis/rest/services' },
  ],
  vanderburgh: [
    { host: 'maps.evansvillegis.com', rest_root: 'https://maps.evansvillegis.com/arcgis_server/rest/services' },
  ],
  stjoseph: [
    { host: 'gis.southbendin.gov', rest_root: 'https://gis.southbendin.gov/arcgis/rest/services' },
  ],
  johnson: [
    { host: 'wfs.schneidercorp.com', rest_root: 'https://wfs.schneidercorp.com/arcgis/rest/services/JohnsonCountyIN_WFS' },
    { host: 'greenwoodgis.greenwood.in.gov', rest_root: 'https://greenwoodgis.greenwood.in.gov/arcgis/rest/services' },
  ],
}

// Host allowlist — extend as new counties are added
const ALLOWED_SUFFIXES = ['.in.gov', '.indy.gov']
const ALLOWED_EXACT = new Set([
  'gis.cityoffortwayne.org',
  'wfs.schneidercorp.com',
  'gisdata.in.gov',
  'services1.arcgis.com',
  'services2.arcgis.com',
  'services3.arcgis.com',
  'services5.arcgis.com',
  'services6.arcgis.com',
  'services8.arcgis.com',
  'lcsogis.lakecountyin.org',
  'maps.evansvillegis.com',
  'gis.southbendin.gov',
  // Ordinance code-hosting platforms (used by /api/discover/probe?mode=head)
  'library.municode.com',
  'codelibrary.amlegal.com',
  'ecode360.com',
])

export function isAllowedHost(hostname: string): boolean {
  const h = hostname.toLowerCase()
  if (ALLOWED_EXACT.has(h)) return true
  return ALLOWED_SUFFIXES.some(suffix => h === suffix.slice(1) || h.endsWith(suffix))
}

const sleep = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms))

async function fetchJson(url: string, timeoutMs = 5000): Promise<Record<string, unknown>> {
  const resp = await fetch(url, {
    signal: AbortSignal.timeout(timeoutMs),
    headers: { 'User-Agent': 'mapnova-discover/1.0', Accept: 'application/json' },
  })
  if (!resp.ok) throw new Error(`HTTP ${resp.status} from ${new URL(url).hostname}`)
  return resp.json() as Promise<Record<string, unknown>>
}

function extractLayers(svcJson: Record<string, unknown>): Layer[] {
  const raw = svcJson.layers
  if (!Array.isArray(raw)) return []
  return (raw as Record<string, unknown>[]).map(l => ({
    id: Number(l['id']),
    name: String(l['name'] ?? ''),
    ...(l['geometryType'] != null ? { geometryType: String(l['geometryType']) } : {}),
    ...(l['defaultVisibility'] != null ? { defaultVisibility: Boolean(l['defaultVisibility']) } : {}),
  }))
}

async function discoverSource(source: {
  host: string
  rest_root: string
}): Promise<{ result: SourceResult; error?: string }> {
  const { host, rest_root } = source
  const services: ServiceInfo[] = []

  try {
    const rootJson = await fetchJson(`${rest_root}?f=json`)

    type SvcEntry = { name: string; type: string }
    let allServices: SvcEntry[] = []

    if (Array.isArray(rootJson['services'])) {
      allServices = allServices.concat(rootJson['services'] as SvcEntry[])
    }

    // Recurse one level into subfolders so folder-based servers (e.g. gis.indy.gov) are fully covered
    if (Array.isArray(rootJson['folders'])) {
      for (const folder of rootJson['folders'] as string[]) {
        await sleep(200)
        try {
          const folderJson = await fetchJson(`${rest_root}/${encodeURIComponent(folder)}?f=json`)
          if (Array.isArray(folderJson['services'])) {
            allServices = allServices.concat(folderJson['services'] as SvcEntry[])
          }
        } catch {
          // skip failed folder probes
        }
      }
    }

    // Filter to MapServer/FeatureServer, cap at 50 per source to avoid runaway probing
    const filtered = allServices
      .filter(s => s.type === 'MapServer' || s.type === 'FeatureServer')
      .slice(0, 50)

    for (const svc of filtered) {
      await sleep(200)
      try {
        const svcJson = await fetchJson(`${rest_root}/${svc.name}/${svc.type}?f=json`)
        services.push({ name: svc.name, type: svc.type, layers: extractLayers(svcJson) })
      } catch {
        // skip individual service probe failures
      }
    }
  } catch (err: unknown) {
    return {
      result: { host, rest_root, services },
      error: err instanceof Error ? err.message : String(err),
    }
  }

  return { result: { host, rest_root, services } }
}

// Inline rate limit removed — replaced by reusable middleware in src/middleware/rateLimit.ts.
// Per-route limits are wired from src/index.ts.

const discover = new Hono<{ Bindings: Env }>()

discover.get('/api/discover/county/:slug', async c => {
  const kv = c.env.DISCOVERY_CACHE
  const slug = c.req.param('slug').toLowerCase()
  const refresh = c.req.query('refresh') === '1'

  const cacheKey = `discover:county:${slug}`

  if (!refresh) {
    const hit = (await kv.get(cacheKey, 'json')) as CountyResult | null
    if (hit) return c.json({ ...hit, cached: true })
  }

  const sources = COUNTY_SOURCES[slug]
  if (!sources) {
    const result: CountyResult = {
      slug,
      fetched_at: new Date().toISOString(),
      sources: [],
      errors: ['no known REST root'],
    }
    return c.json(result)
  }

  const sourceResults: SourceResult[] = []
  const errors: string[] = []

  for (const source of sources) {
    const { result, error } = await discoverSource(source)
    sourceResults.push(result)
    if (error) errors.push(error)
  }

  const payload: CountyResult = {
    slug,
    fetched_at: new Date().toISOString(),
    sources: sourceResults,
    errors,
  }

  await kv.put(cacheKey, JSON.stringify(payload), { expirationTtl: 86400 })
  return c.json(payload)
})

discover.get('/api/discover/probe', async c => {
  const rawUrl = c.req.query('url')
  if (!rawUrl) return c.json({ error: 'Missing url parameter' }, 400)

  let dest: URL
  try {
    dest = new URL(rawUrl)
  } catch {
    return c.json({ error: 'Invalid url' }, 400)
  }

  if (dest.protocol !== 'https:') {
    return c.json({ error: 'Only https targets allowed' }, 400)
  }

  if (!isAllowedHost(dest.hostname)) {
    return c.json({ error: 'Host not allowed' }, 403)
  }

  const kv = c.env.DISCOVERY_CACHE

  // mode=head: just check HTTP status — useful for HTML pages like ordinance code hosts
  if (c.req.query('mode') === 'head') {
    const cacheKey = `discover:probe:head:${rawUrl}`
    const cachedRaw = await kv.get(cacheKey, 'text')
    if (cachedRaw) {
      return c.json({ ...(JSON.parse(cachedRaw) as Record<string, unknown>), cached: true })
    }
    try {
      const resp = await fetch(rawUrl, {
        method: 'HEAD',
        signal: AbortSignal.timeout(5000),
        headers: { 'User-Agent': 'mapnova-discover/1.0' },
      })
      const result = { ok: resp.ok, status: resp.status }
      await kv.put(cacheKey, JSON.stringify(result), { expirationTtl: 300 })
      return c.json(result)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      return c.json({ error: `Upstream error: ${msg}` }, 502)
    }
  }

  const cacheKey = `discover:probe:${rawUrl}`
  const cachedRaw = await kv.get(cacheKey, 'text')
  if (cachedRaw) {
    const parsed = JSON.parse(cachedRaw) as Record<string, unknown>
    return c.json({ ...parsed, cached: true })
  }

  let upstreamJson: Record<string, unknown>
  try {
    upstreamJson = await fetchJson(rawUrl, 5000)
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    return c.json({ error: `Upstream error: ${msg}` }, 502)
  }

  await kv.put(cacheKey, JSON.stringify(upstreamJson), { expirationTtl: 300 })
  return c.json(upstreamJson)
})

export default discover
