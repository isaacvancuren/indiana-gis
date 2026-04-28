# IndianaGIS â Claude Code Instructions

## Project Overview
Universal GIS mapping platform for all 92 Indiana counties. Single-page app using Leaflet.js.

## Architecture

### Files
- `index.html` â app shell (HTML structure only, no inline JS/CSS)
- `css/app.css` â all styles
- `js/app.js` â all application logic (~6000 lines)

### Key Data Structures in js/app.js

**COUNTIES** â map of county key â {lat, lng, zoom, fips, name, em?}
**EM_LAYER92** â ElevateMaps county â MapServer service name (Tier 1 owner data)
**COUNTY_PARCEL_APIS** â county â ArcGIS REST endpoint config (Tier 2 owner data)
**WTH_GIS** â county â WTH MapDotNet host (Tier 3 owner data)
**BEACON_APPS** â county â Beacon App name for PRC links
**BEACON_IDS** â county â {appId, layerId} for direct Beacon PRC URLs

### Owner Data Tiers
1. **Tier 1 ElevateMaps** â 19 counties â `getOwnershipConfig()` returns tier:1
2. **Tier 2 ArcGIS REST** â 18 counties â `getOwnershipConfig()` returns tier:2
3. **Tier 3 WTH GIS** â 21 counties â coordinate-based, uses corsproxy.io

### Key Functions
- `prefetchOwnershipForView()` â batch fetch owner data for visible parcels
- `fetchOwnershipByPin(pin, pin2)` â fetch single parcel owner data
- `selectParcelLive(p, layer)` â handles parcel click, cache lookup, async fetch
- `enrichParcelData(p, attr)` â applies owner attrs to parcel object
- `_normalizeCountyAttr(raw, cfg)` â normalizes tier 2 field names
- `_openPRCForCounty(cKey, p, pin)` â opens Beacon PRC
- `buildCountyLayerPanel()` â rebuilds layer panel on county switch

### IGIO Parcel Layer
- Endpoint: `https://gisdata.in.gov/server/rest/services/Hosted/Parcel_Boundaries_of_Indiana_Current/FeatureServer/0/query`
- Fields: `objectid, parcel_id, state_parcel_id, prop_add, prop_city, prop_zip, dlgf_prop_class_code, latitude, longitude, county_fips`
- **Known issue**: `state_parcel_id` and `parcel_id` sometimes return null â app falls back to `objectid`

## Locked Counties (DO NOT EDIT unless explicitly requested)
Tier 1 (ElevateMaps) â LOCKED:
  Bartholomew â ElevateMaps layer 92, confirmed working
Tier 2 (Schneider WFS / ArcGIS REST) â LOCKED:
  Marion â MapIndyProperty/MapServer/10 (confirmed working)
  Johnson â JohnsonCountyIN_WFS/MapServer/2 (confirmed working)
  Morgan â MorganCountyIN_WFS/MapServer/0 (confirmed 2026-04-27)
  Miami â MiamiCountyIN_WFS/MapServer/0 (confirmed 2026-04-27)
  Monroe â MonroeCountyIN_WFS/MapServer/0 (confirmed 2026-04-27, mixed-case fields)
  White â WhiteCountyIN_WFS/MapServer/0 (confirmed 2026-04-27)

Active Issues
1. IGIO returning null parcel IDs for some counties â spatial fallback needed for owner lookup
2. Bartholomew confirmed working (Tier 1 ElevateMaps); all other broken EM_LAYER92 entries removed
3. PRC links â only Bartholomew has confirmed AppID (1130/28606), others use Search page

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
- No build step required â static files only
