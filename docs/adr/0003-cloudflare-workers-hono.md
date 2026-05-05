# Cloudflare Workers + Hono for the API

## Status

Accepted

## Context and Problem Statement

The application needs server-side endpoints for operations that require secrets: generating ElevateMaps SAS tokens for authenticated imagery access, proxying AI parcel search calls, and managing saved projects. These operations cannot be embedded in the static `index.html` because secrets would be exposed to any user who viewed the page source.

The team evaluated Pages Functions (Cloudflare's file-based serverless compute co-deployed with the Pages site) and standalone Cloudflare Workers. Pages Functions are simpler for trivial proxying but have a less mature ecosystem for D1 bindings, Durable Objects, and other Cloudflare primitives. Workers are the first-class product with the richest feature set and tooling.

For the framework layer, Hono was chosen over raw `fetch` handlers because it provides routing, middleware, and typed request context with a minimal footprint (~14 kB), and its API is idiomatic for the Workers runtime.

## Decision

Implement the API as a standalone Cloudflare Worker using the Hono framework. Secrets are stored as Worker environment variables and are never returned to the client. The Worker is deployed independently of the Pages site via `wrangler`.

## Consequences

**Positive:**
- Workers run at the Cloudflare edge with near-zero cold-start latency, close to the Pages CDN.
- Hono's routing and middleware model keeps endpoint code organized as the API grows.
- Secrets stored in `wrangler secret put` are encrypted at rest and never appear in git.
- Independent deployment: the Worker can be updated and rolled back without touching the Pages site.

**Negative:**
- Workers have CPU time limits: 10 ms on the free tier, 50 ms on paid. Long-running AI inference calls must be streamed or offloaded to an external provider within that budget.
- Local development requires `wrangler dev`, adding a tool requirement on top of pnpm.
- Hono is a young framework; breaking changes across minor versions have occurred and require attention on upgrades.
