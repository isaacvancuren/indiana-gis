# Cloudflare D1 + Drizzle ORM for primary storage

## Status

Accepted

## Context and Problem Statement

Saved searches, projects, and parcel bookmarks require persistent relational storage. The project is already running on Cloudflare infrastructure; adding an external database (e.g., PlanetScale, Supabase, Neon) would introduce a separate billing relationship, a new set of connection secrets, and cross-region latency between the Worker and the database host.

Cloudflare D1 is a SQLite-based edge database bound directly to Workers via `wrangler.toml`. It requires no separate account, no connection pooling, and no VPC configuration. Drizzle ORM was chosen over Prisma because Drizzle targets the Workers runtime natively (no binary engine), and its migration model outputs plain SQL files that are reviewable in git.

## Decision

Use Cloudflare D1 bound to the Worker for primary relational storage, with Drizzle ORM for schema definition, migrations, and type-safe queries.

## Consequences

**Positive:**
- Zero additional infrastructure: D1 is declared in `wrangler.toml` alongside the Worker binding.
- Drizzle migrations are plain SQL files checked into git; schema history is auditable like any other code.
- SQLite's simplicity means fewer operational surprises than running a full Postgres cluster.
- Free tier (5 million rows read/day, 100k writes/day) is sufficient for current usage.

**Negative:**
- D1 is eventually consistent across Cloudflare regions during write propagation; it is unsuitable for high-frequency writes or strict read-your-own-write guarantees in multi-region scenarios.
- Hitting free-tier limits (row reads, write operations) would require upgrading to D1's paid tier or re-architecting storage access patterns.
- Drizzle is a relatively young ORM; its query builder API has changed across minor versions and requires careful pinning.
- SQLite has no native support for some Postgres features (e.g., `RETURNING` on older D1 versions, JSON operators); queries must be written to the lowest common denominator.
