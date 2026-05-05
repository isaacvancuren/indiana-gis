// Cloudflare Pages Function middleware
// Injects server-side env vars as window globals into HTML responses.
// Env vars injected:
//   CLERK_PUBLISHABLE_KEY  → window.__CLERK_PK
//   SENTRY_DSN             → window.__SENTRY_DSN

export async function onRequest(context) {
  const response = await context.next();

  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('text/html')) return response;

  const lines = [];
  if (context.env.CLERK_PUBLISHABLE_KEY) {
    lines.push(`window.__CLERK_PK=${JSON.stringify(context.env.CLERK_PUBLISHABLE_KEY)};`);
  }
  if (context.env.SENTRY_DSN) {
    lines.push(`window.__SENTRY_DSN=${JSON.stringify(context.env.SENTRY_DSN)};`);
  }

  if (!lines.length) return response;

  const html = await response.text();
  const snippet = `<script>${lines.join('')}</script>`;
  const injected = html.replace('<head>', `<head>${snippet}`);

  const headers = new Headers(response.headers);
  headers.delete('content-length');

  return new Response(injected, { status: response.status, headers });
}
