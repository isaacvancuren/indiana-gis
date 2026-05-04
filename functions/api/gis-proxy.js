// Cloudflare Pages Function: CORS proxy for public Indiana GIS ArcGIS endpoints.
// Enables browser access to GIS services that block cross-origin requests.
//
// Usage: GET /api/gis-proxy?url=<URL-encoded upstream URL>
//
// Security:
//   - Only HTTPS targets allowed
//   - Host must be in ALLOWED_HOSTS allowlist — no arbitrary forwarding
//   - URL capped at 2000 chars
//   - GET only (no body forwarding)
//   - 8s upstream timeout
//   - No cookies or auth headers forwarded

const ALLOWED_HOSTS = new Set([
  'gis.cityoffortwayne.org',
  'gisdata.in.gov',
  'maps.indy.gov',
  'gis.indy.gov',
  'xmaps.indy.gov',
  'wfs.schneidercorp.com',
  'beacon.schneidercorp.com',
  'maps.tippecanoe.in.gov',
  'maps.evansvillegis.com',
  'gis1.hamiltoncounty.in.gov',
  'lcsogis.lakecountyin.org',
  'gis.southbendin.gov',
  // add more as we encounter CORS-blocked endpoints
]);

export async function onRequest({ request }) {
  // CORS preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Max-Age': '86400',
      },
    });
  }

  if (request.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  }

  const reqUrl = new URL(request.url);
  const target = reqUrl.searchParams.get('url');

  if (!target) {
    return new Response(JSON.stringify({ error: 'Missing url parameter' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  }

  if (target.length > 2000) {
    return new Response(JSON.stringify({ error: 'URL too long' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  }

  let dest;
  try {
    dest = new URL(target);
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid url' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  }

  if (dest.protocol !== 'https:') {
    return new Response(JSON.stringify({ error: 'Only https targets allowed' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  }

  if (!ALLOWED_HOSTS.has(dest.hostname.toLowerCase())) {
    return new Response(JSON.stringify({ error: 'Host not in allowlist' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000);

  try {
    const upstream = await fetch(dest.toString(), {
      method: 'GET',
      headers: {
        'User-Agent': 'mapnova-gis-proxy/1.0',
        'Accept': 'application/json,text/plain,*/*',
      },
      signal: controller.signal,
      redirect: 'follow',
    });

    const body = await upstream.arrayBuffer();
    return new Response(body, {
      status: upstream.status,
      headers: {
        'Content-Type': upstream.headers.get('Content-Type') || 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=300',
      },
    });
  } catch (err) {
    const msg = err && err.name === 'AbortError' ? 'Upstream timeout' : (err && err.message) || 'Unknown error';
    return new Response(JSON.stringify({ error: msg }), {
      status: 502,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  } finally {
    clearTimeout(timeoutId);
  }
}
