# 0011 — Move county registries server-side (post-Phase 1)

**Status:** Accepted (planning) — implementation deferred until Phase 1 auth ships (PR #50)
**Date:** 2026-05-06
**Drives:** Issue #4 (long-term IP protection follow-up to incident #109/#96)

## Context

Today, the project's most valuable competitive asset — hardcoded GIS service URLs, ArcGIS layer registries, parcel API mappings, and zoning ordinance metadata for all 92 Indiana counties — lives in `apps/web/assets/county-*.js` and `municipal-gis-servers.js`. These files are shipped to every browser that loads `mapnova.org` and were public from the project's inception until the 2026-05-06 visibility flip.

ADR 0008 established that hardcoded county registries are the right architecture (universal layer-fetching does not work; per-county discovery is the only reliable path). That ADR is correct and not being relitigated. The question this ADR addresses is: **where does that data live**, not whether it should be hardcoded.

## Problem

1. **The data is the moat.** Anyone with the public-era HTML has a list of every working ArcGIS endpoint we've curated. Replicating that list independently is months of work.
2. **The data is permanent in the snapshot.** MIT-licensed code that has been forked cannot be retroactively privatized; the snapshot a fork holds is theirs to keep.
3. **The data ships unauthenticated.** Anyone visiting the site (including bots) can scrape the entire registry from the JS files in seconds.

Future copies of the codebase are protected only when the *data* lives behind authenticated API endpoints, not in the static bundle.

## Decision

When Phase 1 (Clerk auth + D1 projects API, PR #50) is merged and stable, migrate the county/municipal/zoning registries from static JS files to D1 tables, served via authenticated `/api/registries/*` endpoints.

The frontend will fetch the registry for whichever county the user is viewing, on-demand and cached client-side per session. Without an authenticated session token, the registry endpoints will return 401.

## Migration sequencing

**Phase A (after #50 lands):** schema + seed script, no frontend wiring.

- D1 schema: `gis_registries` table keyed by `(state, county_slug, kind)`, value is JSON. (`kind` ∈ `'county_layers' | 'municipal_layers' | 'parcel_apis' | 'zoning'`.)
- One-time seed script at `apps/api/scripts/seed-registries.ts` that imports the static JS modules and writes their contents to D1.
- API routes: `GET /api/registries/:state/:county` returning the merged registry for a single county. Auth-required.

**Phase B:** frontend rewires to use the API.

- Replace the static JS imports in `index.html` with a runtime fetch.
- Add a session-scoped `Map<county, registry>` cache in the frontend.
- `buildCountyLayerPanel()` becomes async (already kind of is, given current overlay loading patterns).
- The static JS modules stay in the repo as the seed source of truth for now — they're not yet shipped to clients but a `loadCounty(slug)` thin shim handles the API roundtrip.

**Phase C:** delete the static JS modules from the production bundle.

- Once registries are exclusively served via API and the frontend has been verified for at least 30 days, remove the `apps/web/assets/county-gis-servers.js`, `county-layer-engines.js`, `municipal-gis-servers.js`, `mn-zoning-ordinances.js`, `county-parcel-apis.js`, `county-metadata.js` from the deployed bundle. Keep them in the repo (under `apps/api/seeds/` or similar) as the canonical source for re-seeding.

## Trade-offs accepted

| Trade-off | Cost | Why we accept it |
|---|---|---|
| Extra fetch per county switch | ~100–300ms | Caching makes this one-time per session; counties don't switch frequently |
| Frontend can't render before D1 reachable | Hard dependency on Worker uptime | We already depend on the Worker for `/api/discover` — same blast radius |
| Breaks current "open in any browser, no API" model | Public unauthenticated map view stops working | This is the entire point — the threat model now requires it |
| New auth gate on registries breaks anonymous visitors | All visitors must sign in | We accept losing anonymous-visitor mode. If we want a public read-only view back, we serve a curated subset of registries via a public unauth endpoint with rate limiting (separate decision later) |

## Alternatives considered

1. **Obfuscation/minification of the static JS** — rejected. Modern unminifiers (`de4js`, `prettier`) recover readable code. Buys minutes against any motivated attacker. Also violates ADR 0001's no-build-step constraint.
2. **Encrypt the static JS at rest, decrypt client-side** — rejected. The decryption key has to ship to the client, so any browser can decrypt. Cosmetic protection only.
3. **Continue shipping registries to client, gate just the API calls** — rejected. The registry IS the IP; gating only the discovery proxy still lets a clone build their own backend pointing at the same ArcGIS endpoints.
4. **Move registries to a CDN with hotlink protection** — rejected. CDN signed-URL schemes break the static-file model and don't add real auth.

## Consequences

**Positive:**
- The competitive moat moves from "publicly readable JS" to "authenticated API behind a Clerk session". Forks of the frontend code become useless without standing up your own equivalent dataset.
- Centralizing registries in D1 enables future features that need querying registries server-side: AI parcel search (#4), geographic search across counties, audit logging of which registries are accessed.
- The seed script + D1 model also means future registries (other states beyond Indiana) can be added by writing data, not by editing JS modules.

**Negative:**
- Loses the "single-page HTML, runs from any static host" simplicity. Frontend is now hard-coupled to the Worker.
- Anonymous visitors lose access unless we add a public read-only registry endpoint. (Open question; revisit when we know whether anonymous mode matters for our target users.)
- The first migration (Phase A → C) is multi-week and touches dozens of frontend files. Schedule it deliberately.

## Implementation prerequisites (must land before Phase A)

- [ ] PR #50 merged (Clerk + D1 projects API). Provides the auth model.
- [ ] D1 schema migrations infrastructure working (Drizzle from #50).
- [ ] R2 bucket `mapnova-backups` created — D1 backup story (PR #106) should be live before we make D1 the single source of truth for the registries.
- [ ] PR #110 merged (workflow + repo hardening) so the supply chain is sane.
