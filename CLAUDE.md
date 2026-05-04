# Mapnova (formerly IndianaGIS)

## Purpose
Single-file HTML GIS platform deployed at [mapnova.org](http://mapnova.org). Built on Leaflet.js, ElevateMaps ArcGIS services, and the IGIO statewide parcel dataset. Indiana-first but built to expand. Hard constraint: single HTML file, no build step, no framework.

## Deploy
Cloudflare Pages auto-deploys `main` to mapnova.org. Every commit to `main` goes live; PR branches get preview URLs (e.g. `https://<branch-slug>.mapnova.pages.dev`). Cloudflare Pages handles it; nothing else to do.

## Architecture
- County-by-county hardcoded ArcGISCountyLayer instances + permanent statewide layers (parcels, basemaps).
- Bartholomew: 74 confirmed real layer IDs.
- Johnson: 49 layers across multi-service ArcGIS ([greenwoodgis.greenwood.in.gov](http://greenwoodgis.greenwood.in.gov)).
- Parcel/owner lookups use IGIO statewide where possible, county services as fallback.

## Principles (do not relitigate)
- County hardcoding works; universal layer-fetching does not.
- Tile cache busting requires removing the layer, bumping &_t={timestamp}, re-adding.
- ElevateMaps SAS tokens require server-side auth; cannot be reconstructed client-side.
- buildCountyLayerPanel() rebuilds the panel from scratch on every county switch. Intentional.
- Single-file HTML is non-negotiable.

## Open work
- Issue #3: Search bar must query across the full geographic filter, not just visible parcels. Use IGIO for Indiana statewide queries. Don't switch to Google Maps or Beacon without explicit approval.
- Issue #4: AI-mode parcel search is an epic. Break into reviewable slices: (a) search-bar mode toggle, (b) LLM-backed parcel filter API, (c) results-list UI, (d) multi-select + map navigation, (e) save-to-project.

## Agent rules
- Always work on a feature branch named issue-<number>-<short-slug>.
- Open a draft PR, post a plan as the first PR comment, then implement.
- Don't edit [CLAUDE.md](http://CLAUDE.md) autonomously. Propose changes via PR like anything else.
- Don't bump version numbers unless I explicitly ask.
- Run no destructive git operations on main.
- If the task is ambiguous or could be solved multiple ways, post the options on the issue and wait for me before implementing.
