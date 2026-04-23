# IndianaGIS — Claude Code Instructions

## Project Overview
Universal GIS mapping platform for all 92 Indiana counties. Single-page app using Leaflet.js.

## Architecture

### Files
- `index.html` — app shell (HTML structure only, no inline JS/CSS)
- `css/app.css` — all styles
- `js/app.js` — all application logic (~6000 lines)

### Key Data Structures in js/app.js

**COUNTIES** — map of county key → {lat, lng, zoom, fips, name, em?}
**EM_LAYER92** — ElevateMaps county → MapServer service name (Tier 1 owner data)
**COUNTY_PARCEL_APIS** — county → ArcGIS REST endpoint config (Tier 2 owner data)
**WTH_GIS** — county → WTH MapDotNet host (Tier 3 owner data)
**BEACON_APPS** — county → Beacon App name for PRC links
**BEACON_IDS** — county → {appId, layerId} for direct Beacon PRC URLs

### Owner Data Tiers
1. **Tier 1 ElevateMaps** — 19 counties — `getOwnershipConfig()` returns tier:1
2. **Tier 2 ArcGIS REST** — 18 counties — `getOwnershipConfig()` returns tier:2
3. **Tier 3 WTH GIS** — 21 counties — coordinate-based, uses corsproxy.io

### Key Functions
- `prefetchOwnershipForView()` — batch fetch owner data for visible parcels
- `fetchOwnershipByPin(pin, pin2)` — fetch single parcel owner data
- `selectParcelLive(p, layer)` — handles parcel click, cache lookup, async fetch
- `enrichParcelData(p, attr)` — applies owner attrs to parcel object
- `_normalizeCountyAttr(raw, cfg)` — normalizes tier 2 field names
- `_openPRCForCounty(cKey, p, pin)` — opens Beacon PRC
- `buildCountyLayerPanel()` — rebuilds layer panel on county switch

### IGIO Parcel Layer
- Endpoint: `https://gisdata.in.gov/server/rest/services/Hosted/Parcel_Boundaries_of_Indiana_Current/FeatureServer/0/query`
- Fields: `objectid, parcel_id, state_parcel_id, prop_add, prop_city, prop_zip, dlgf_prop_class_code, latitude, longitude, county_fips`
- **Known issue**: `state_parcel_id` and `parcel_id` sometimes return null — app falls back to `objectid`

## Active Issues
1. IGIO returning null parcel IDs for some counties — spatial fallback needed for owner lookup
2. Bartholomew owner data — spatial query fallback in place, needs verification
3. PRC links — only Bartholomew has confirmed AppID (1130/28606), others use Search page

## Adding a New County
1. Add to `COUNTIES` map with lat/lng/zoom/fips/name
2. Add to appropriate tier:
   - ElevateMaps: add to `EM_LAYER92` with service name
   - Schneider WFS: add to `COUNTY_PARCEL_APIS` with confirmed field names
   - WTH: add to `WTH_GIS` with host URL
3. Add to `BEACON_APPS` for PRC links
4. Test: select county, zoom in, click parcel, verify owner shows

## Deployment
- Hosted on Netlify, auto-deploys from GitHub main branch
- No build step required — static files only
