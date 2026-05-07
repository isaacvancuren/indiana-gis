export type Env = {
  // KV namespace for /api/discover caching + KV-backed rate limiter
  DISCOVERY_CACHE: KVNamespace
  // D1 database — users, projects, future server-side registries
  DB: D1Database
  // Clerk auth (Worker secret — set via `wrangler secret put CLERK_SECRET_KEY`)
  CLERK_SECRET_KEY: string
  // Sentry (Worker secret; Sentry stays disabled when unset)
  SENTRY_DSN_API?: string
  // Release tag for Sentry (set per-deploy via wrangler --var)
  WORKER_VERSION?: string
}
