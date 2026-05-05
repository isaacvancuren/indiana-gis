# Pages Functions vs Workers — chose Workers

## Status

Accepted

## Context and Problem Statement

Cloudflare offers two edge-compute options for a Pages-hosted project: Pages Functions (file-based routing in a `functions/` directory, co-deployed with the Pages site via a single Cloudflare Pages project) and standalone Workers (deployed separately via `wrangler`, with their own project and dashboard). PRs #43 and #48 explored both approaches before this decision was finalized.

Pages Functions are simpler to set up for trivial use cases: drop a file in `functions/api/[[route]].ts`, push to the Pages branch, and the function is live at `/api/*` automatically. However, Pages Functions have a reduced feature set compared to standalone Workers: binding to D1, Durable Objects, and other primitives works but is documented as secondary to the Workers product. Local development with Pages Functions (via `wrangler pages dev`) is also less mature than `wrangler dev` for standalone Workers.

## Decision

Implement the API as a standalone Cloudflare Worker, not a Pages Function. The Worker is deployed independently via `wrangler deploy` and the Pages site makes cross-origin requests to the Worker's own subdomain.

## Consequences

**Positive:**
- Standalone Workers have first-class support for all Cloudflare primitives: D1, Durable Objects, Queues, R2, and Hyperdrive.
- The Worker can be deployed and rolled back independently of the Pages site; a bad API deploy does not require re-deploying the frontend.
- `wrangler dev` provides a mature local development experience with full binding support and accurate emulation of the production runtime.
- Workers have a dedicated dashboard with metrics, logs, and trace sampling that Pages Functions lack.

**Negative:**
- Two separate deployment targets: Pages for the frontend and Workers for the API, each with their own CI step and Cloudflare project.
- Contributors must understand two Cloudflare products and their separate configuration files (`wrangler.toml` vs. Pages project settings).
- Pages Functions would have been sufficient for trivial proxying (e.g., a single SAS-token endpoint) and would have eliminated the cross-origin request entirely.
- CORS must be explicitly configured on the Worker since it lives on a different origin from the Pages site.
