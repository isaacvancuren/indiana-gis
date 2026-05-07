# ElevateMaps Owner-Data Proxy — Design Spec

**Status:** Draft · Issue #61  
**Scope:** Spec only — no implementation. This document is intended to be dispatched as a real implementation issue once Phase 1 ships.

---

## 1. Current State

### How `getOwnershipConfig(cKey)` decides the tier

`getOwnershipConfig` (`apps/web/static/v2/app.js:762`) uses a simple priority ladder:

```
Tier 1 → if (EM_LAYER92[cKey])  return { tier: 1, url: EM_BASE + em + '/MapServer/92/query' }
Tier 2 → if (COUNTY_PARCEL_APIS[cKey])  return { tier: 2, ...COUNTY_PARCEL_APIS[cKey] }
Tier 3 → WTH_GIS counties (coordinate-only; caller checks separately)
null   → no owner data; fallback is IGIO geometry + Beacon deep-link button
```

Only `bartholomew` is currently registered in `EM_LAYER92` (`app.js:435`). The remaining 18 counties that have `em:` service names in `INDIANA_COUNTIES` fall through to Tier 2 (Schneider WFS) or return null.

The 19 counties with ElevateMaps service names (i.e., `em:` present in `INDIANA_COUNTIES`):

| County | Service name |
|--------|--------------|
| bartholomew | `BartholomewINDynamic` ✓ Tier 1 working |
| benton | `BentonINDynamic` |
| cass | `CassINDynamic` |
| clark | `ClarkINDynamic` |
| elkhart | `ElkhartINDynamic` |
| floyd | `FloydINDynamic` |
| grant | `GrantINDynamic` |
| harrison | `HarrisonINDynamic` |
| hendricks | `HendricksINDynamic` |
| jay | `JayINDynamic` |
| laporte | `LaPorteINDynamic` |
| lawrence | `LawrenceINDynamic` |
| martin | `MartinINDynamic` |
| miami | `MiamiINDynamic` |
| monroe | `MonroeINDynamic` |
| morgan | `MorganINDynamic` |
| orange | `OrangeINDynamic` |
| owen | `OwenINDynamic` |
| white | `WhiteINDynamic` |

### Where the ElevateMaps base URL is built

```js
// app.js:438
const EM_BASE = 'https://elb.elevatemaps.io/arcgis/rest/services/eGISDynamicServices/';

// Tier 1 query URL pattern:
// EM_BASE + <ServiceName> + '/MapServer/92/query'
// Example (Bartholomew):
// https://elb.elevatemaps.io/arcgis/rest/services/eGISDynamicServices/BartholomewINDynamic/MapServer/92/query
```

The Layer 92 query for Bartholomew is issued directly from the browser with no auth headers:

```js
// app.js:871–884 (fetchOwnershipByPin, tier 1 branch)
resp = await fetch(cfg.url + '?' + params, { signal: AbortSignal.timeout(8000) });
```

`params` contains `where`, `outFields` (the `L92_FIELDS` list), `returnGeometry: false`, and `f: json`. No `token=` or `Authorization` header is sent.

### What the SAS auth flow looks like

There are **two distinct auth contexts** in the codebase. The CLAUDE.md note "ElevateMaps SAS tokens require server-side auth; cannot be reconstructed client-side" refers specifically to **context B**, not to the Layer 92 data API:

**A. Layer 92 data queries (ownership, AV, sale data)**  
Currently unauthenticated for Bartholomew — `elb.elevatemaps.io` accepts CORS requests from the browser without a token. It is **unknown** whether other counties' Layer 92 endpoints are equally open or require auth. This is the primary unknown to resolve in Phase A.

**B. Venturi PDF blob (Property Record Cards)**  
`getVenturiPDF()` (`app.js:2796`) fetches a county-specific page at `https://{em.host}/prc.html?pin=...&appId=...` and extracts a signed Azure SAS URL of the form:

```
https://venturi.blob.core.windows.net/fd-{folderId}/{pin}.pdf?sv=...&sig=...
```

This SAS URL is time-limited and embedded in the page's JavaScript — it cannot be reconstructed without knowing the signing key or fetching the page. Today's workaround routes through the Claude API (`api.anthropic.com/v1/messages` with `web_search`) to fetch the page server-side and extract the URL. This workaround has known fragility (Claude API key in browser, web_search tool rate limits).

The `EM_COUNTIES` registry (`county-metadata.js:124`) stores the `appId` and `folderId` needed to build the PRC URL; counties without a known `appId` cannot use this path today.

---

## 2. Proposed Architecture

### Worker route

```
GET /api/em-proxy/{county}/{pid}
```

- `{county}` — lowercase county key (e.g., `bartholomew`, `cass`)
- `{pid}` — parcel ID (18-digit PIN or tax-10 form; Worker passes both variants in the upstream `where` clause)

### Worker implementation sketch (pseudocode only)

```
1. Validate county is in the known EM service map.
2. Build upstream URL:
     https://elb.elevatemaps.io/arcgis/rest/services/eGISDynamicServices/
       {ServiceName}/MapServer/92/query
       ?where=pin_18='{pid}' OR tax_10='{pid}' OR pin_18stripped='{stripped}'
       &outFields={L92_FIELDS}
       &returnGeometry=false
       &f=json
       &token={ELEVATEMAPS_SAS_TOKEN}   ← injected from Worker secret
3. Check KV cache (key: `em:{county}:{strippedPid}`, TTL: 24h).
   - Cache hit → return cached JSON.
4. Fetch upstream. On 401/403 → return { error: 'auth', tier: 2 } (frontend falls back).
5. On success → store in KV, return JSON.
```

### Worker secret

Store as a Cloudflare Worker secret (not in `wrangler.toml`):

```
wrangler secret put ELEVATEMAPS_SAS_TOKEN
```

Whether this is a single account-level token, per-county tokens, or a different auth mechanism is an **open question** (see §3).

### KV namespace

Add a new KV namespace `EM_CACHE` to `wrangler.toml`:

```toml
[[kv_namespaces]]
name = "EM_CACHE"
id   = "<namespace-id>"
```

Cache entries: JSON string of the ArcGIS feature attributes. TTL 24 hours (assessment data doesn't change intraday).

### Frontend change

In `fetchOwnershipByPin` (`app.js:871`), the Tier 1 branch currently calls `elb.elevatemaps.io` directly. The proxy swap would change it to:

```js
// Before (direct, no auth):
resp = await fetch(cfg.url + '?' + params, { signal: AbortSignal.timeout(8000) });

// After (via Worker proxy):
resp = await fetch(`https://api.mapnova.org/api/em-proxy/${cKey}/${encodeURIComponent(pin)}`,
  { signal: AbortSignal.timeout(10000) });
```

The Worker response would be an ArcGIS-compatible JSON envelope (`{ features: [...] }`) so the existing attribute-reading code in `fetchOwnershipByPin` and `prefetchOwnershipForView` requires minimal or no changes.

A 401/403 or `{ error: 'auth' }` response causes the frontend to fall back to Tier 2/IGIO rather than showing an error to the user.

### Expanding `EM_LAYER92`

Once the proxy is live and auth is confirmed to work, the remaining 18 counties can be added to `EM_LAYER92` one by one (or all at once) in `apps/web/static/v2/county-parcel-apis.js` and `apps/web/static/v2/app.js`. No other frontend change is needed.

---

## 3. Open Questions (requires user input before implementation)

1. **Auth mechanism** — Does ElevateMaps Layer 92 require authentication at all? The Bartholomew endpoint currently works without a token from the browser. For the 18 remaining counties:
   - Are they equally open (no proxy needed, just add them to `EM_LAYER92`)?
   - Or do they require a token (single account-level API key, per-county key, or a SAS that rotates on a schedule)?
   - Is there a developer portal or API key page at elevatemaps.io?

2. **Rate limits / pricing** — What is the ElevateMaps policy on programmatic queries to Layer 92? Cloudflare KV will absorb repeated identical lookups, but each unique PIN is a cache miss on first access. Rough estimate: if the app serves N unique parcels per day, that's N upstream calls per 24h window.

3. **Terms of service / data license** — Is there a contractual restriction on:
   - Caching responses (even server-side for 24h)?
   - Proxying data to end users without an ElevateMaps-hosted UI?
   - Redistribution beyond what the counties' individual licenses permit?

4. **SAS rotation cadence (if applicable)** — If a SAS token is involved, what is its lifetime? A rotating token would require a secret-refresh workflow (e.g., a scheduled Worker or manual `wrangler secret put` on rotation).

5. **Coverage confirmation** — Are all 18 non-Bartholomew counties actually served by `elb.elevatemaps.io/arcgis/.../{ServiceName}/MapServer/92`? It's possible some counties use a different layer number or a different ElevateMaps host.

---

## 4. Implementation Phases (future issues)

### Phase A — Research (manual; no code)
- Contact ElevateMaps or check developer docs to answer the open questions above.
- Manually test Layer 92 query for 2–3 non-Bartholomew counties (e.g., Cass, Floyd) to confirm the endpoint pattern and whether a token is required.
- Confirm layer 92 field schema is consistent across counties (expected yes, but verify).
- **Gate:** Do not proceed to Phase B without auth clarity.

### Phase B — Worker route (stub)
- Add `GET /api/em-proxy/:county/:pid` to `apps/api/src/index.ts`.
- Worker reads `ELEVATEMAPS_SAS_TOKEN` from env (may be empty/stub if auth isn't needed).
- Constructs and fetches upstream Layer 92 URL, appending token if present.
- On 401/403, returns `{ error: 'auth', fallback: true }`.
- No KV yet — pure passthrough.
- Test with `wrangler dev` against Bartholomew to confirm the route works end-to-end.

### Phase C — Frontend wire-up
- In `fetchOwnershipByPin` and `prefetchOwnershipForView`, add a branch: when `cfg.tier === 1`, call the Worker proxy instead of `elb.elevatemaps.io` directly.
- Add the remaining 18 counties to `EM_LAYER92` (gated on Phase A confirming their Layer 92 endpoints).
- Verify no regression on Bartholomew (which currently works in the direct path).

### Phase D — KV cache + rate limiting
- Provision `EM_CACHE` KV namespace.
- Wire cache read/write in the Worker (24h TTL).
- Add per-county rate limiting via Cloudflare rate-limit rules or a simple KV counter to stay within any ElevateMaps usage limits discovered in Phase A.
- Monitor KV read/write counts via Cloudflare dashboard.

---

## 5. Risks

### Terms of service / contractual constraints
ElevateMaps is a commercial GIS platform serving county governments. Proxying their data through Mapnova's infrastructure may violate the counties' service agreements with ElevateMaps, even if the endpoints are technically accessible. **Resolve in Phase A before writing any proxy code.**

### SAS rotation cadence
If a SAS token is required and has a short lifetime (e.g., 1–7 days), the operation burden of rotating `ELEVATEMAPS_SAS_TOKEN` is low but must be documented and monitored. A stale token would silently degrade all Tier 1 counties to Tier 2; the fallback behavior prevents user-visible errors but masks the problem.

### Cost
ElevateMaps may charge counties per API call or impose usage quotas. Mapnova's server-side proxy converts what were browser-direct requests (not billed to Mapnova) into Worker-originated requests that may be attributed to a single account. Phase A must clarify whether this changes the billing relationship.

### Layer 92 schema drift
The `L92_FIELDS` constant (`app.js:439`) assumes a fixed field list across all ElevateMaps counties. If some counties' Layer 92 services have a different schema (different field names, missing fields), the normalization logic would silently return nulls. Phase A should verify schema consistency.

### Worker cold-start latency
Cloudflare Workers have negligible cold-start times, but adding a Worker hop to every parcel click increases latency slightly vs. the current direct-to-ElevateMaps path. The KV cache (Phase D) mitigates this for repeated lookups.
