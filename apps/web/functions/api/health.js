// Cloudflare Pages Function: API health check.
// Lives at /api/health on mapnova.org and PR previews automatically.
export async function onRequestGet() {
  return new Response(
    JSON.stringify({ ok: true, version: '0.1.0' }),
    { headers: { 'content-type': 'application/json' } }
  );
}
