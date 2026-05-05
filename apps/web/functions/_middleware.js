/**
 * Cloudflare Pages middleware: injects CLERK_PUBLISHABLE_KEY into HTML responses
 * as `window.__CLERK_PK` so the frontend can initialize the Clerk SDK.
 *
 * Set `CLERK_PUBLISHABLE_KEY` in Cloudflare Pages → Settings → Environment variables
 * for both Production and Preview environments.
 */
export async function onRequest(context) {
  const response = await context.next()

  // Only transform HTML responses
  const contentType = response.headers.get('content-type') || ''
  if (!contentType.includes('text/html')) return response

  const clerkKey = context.env.CLERK_PUBLISHABLE_KEY || ''

  const html = await response.text()
  const script = `<script>window.__CLERK_PK = ${JSON.stringify(clerkKey)};</script>`
  const modified = html.replace('</head>', `${script}\n</head>`)

  const newHeaders = new Headers(response.headers)
  newHeaders.delete('content-length') // body size changed

  return new Response(modified, {
    status: response.status,
    statusText: response.statusText,
    headers: newHeaders,
  })
}
