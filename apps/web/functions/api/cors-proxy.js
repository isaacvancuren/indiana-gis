// Cloudflare Pages Function: CORS proxy for WTH GIS (MapDotNet) endpoints.
// Replaces third-party corsproxy.io with a tightly scoped allow-list.
// Allowed: any *.wthgis.com host. Path must be a MapDotNet REST endpoint.
//
// Usage from client: /api/cors-proxy?url=<encoded full url>
//
// Security:
//   - Only HTTPS targets allowed
//   - Only host suffix .wthgis.com permitted
//   - Only GET requests (no body forwarding)
//   - 8s upstream timeout
//   - Strips request/response cookies and auth headers

export async function onRequestGet({ request }) {
  const reqUrl = new URL(request.url);
  const target = reqUrl.searchParams.get('url');

  if (!target) {
    return new Response('Missing url parameter', { status: 400 });
  }

  let dest;
  try {
    dest = new URL(target);
  } catch {
    return new Response('Invalid url', { status: 400 });
  }

  if (dest.protocol !== 'https:') {
    return new Response('Only https targets allowed', { status: 400 });
  }

  // Allow-list: any subdomain of wthgis.com (or wthgis.com itself).
  const host = dest.hostname.toLowerCase();
  const allowed = host === 'wthgis.com' || host.endsWith('.wthgis.com');
  if (!allowed) {
    return new Response('Host not allowed', { status: 403 });
  }

  // Only allow MapDotNet REST paths
  if (!dest.pathname.startsWith('/MapDotNet/')) {
    return new Response('Path not allowed', { status: 403 });
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000);

  try {
    const upstream = await fetch(dest.toString(), {
      method: 'GET',
      headers: {
        'User-Agent': 'mapnova-cors-proxy/1.0',
        'Accept': 'text/html,application/json,*/*'
      },
      signal: controller.signal,
      redirect: 'follow'
    });

    const body = await upstream.text();
    return new Response(body, {
      status: upstream.status,
      headers: {
        'Content-Type': upstream.headers.get('Content-Type') || 'text/plain',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=60'
      }
    });
  } catch (err) {
    return new Response('Upstream error: ' + (err && err.message ? err.message : 'unknown'), { status: 502 });
  } finally {
    clearTimeout(timeoutId);
  }
}
