# Indiana GIS County Coverage Inventory

Last updated: 2026-05-02T14:38:18.086Z (autonomous run)

## Summary
- 92 total IN counties
- 59 currently configured (Tier 1: 17, Tier 2: 25, Tier 3: 21 — some overlap)
- 33 counties remaining

## Configuration architecture (in js/app.js)

### Tier 1 — ElevateMaps direct REST
`EM_LAYER92` map: county_key -> ElevateMaps service name. Single shared base URL.
Currently only `bartholomew` is in EM_LAYER92 (the others appear to be Tier 1.5 or wired via host:'<x>in.elevatemaps.io' but not in this map). Investigate.

### Tier 2 — county-specific ArcGIS REST
`COUNTY_PARCEL_APIS` map: county_key -> { url, pinField, ownerField, addrField, ... }.
Adding a new county requires:
  1. Discover the county's published ArcGIS REST endpoint for parcels layer
  2. Inspect schema to find PIN field, owner field, address fields, etc.
  3. Add config entry
  4. Test identify on the live site

### Tier 3 — WTH / MapDotNet via cors-proxy
Hosts on `*.wthgis.com`. Coordinate-based identify. Cors-proxied via /api/cors-proxy.
Adding requires: knowing the county's wthgis subdomain (always <county>in.wthgis.com pattern, e.g. putnamin.wthgis.com).

## 33 missing counties — research checklist

For each missing county, the next agent should:
1. Web search "<county> County Indiana parcel viewer GIS"
2. Identify the host (Beacon/Schneider, ESRI Hub, county-hosted ArcGIS, WTH, ElevateMaps, etc.)
3. If ArcGIS REST: find the parcel feature service URL ending in /MapServer/N or /FeatureServer/N
4. If WTH: try https://<county>in.wthgis.com — confirm it returns a valid response
5. If Beacon/Schneider: there is no machine-readable API. Mark as "Beacon (no API)". The app may need a separate integration for these (lookup link only).

| County | Pop. (2020) | Provider hint | Likely tier | Notes |
|---|---|---|---|---|
| blackford | 12,062 | unknown | Beacon? | Small county, likely Beacon/Schneider |
| boone | 70,812 | unknown | Tier 2 | Large enough to host own ArcGIS — try gis.boonecounty.in.gov |
| carroll | 19,902 | unknown | unknown | |
| clark | 121,093 | unknown | Tier 2 | Large county — likely has own ArcGIS |
| clay | 26,225 | unknown | unknown | |
| clinton | 33,190 | unknown | unknown | |
| crawford | 10,526 | unknown | Beacon? | Small county |
| dekalb | 43,265 | unknown | Tier 2 | |
| delaware | 111,903 | unknown | Tier 2 | Muncie — likely own ArcGIS |
| fayette | 23,102 | unknown | unknown | |
| fountain | 16,346 | unknown | Beacon? | |
| franklin | 22,758 | unknown | unknown | |
| fulton | 20,344 | unknown | unknown | |
| gibson | 33,659 | unknown | unknown | |
| greene | 32,272 | unknown | unknown | |
| howard | 83,757 | unknown | Tier 2 | Kokomo — likely own ArcGIS |
| huntington | 36,662 | unknown | unknown | |
| knox | 36,840 | unknown | unknown | Vincennes |
| kosciusko | 80,240 | unknown | Tier 2 | Likely own ArcGIS |
| marshall | 46,258 | unknown | unknown | |
| montgomery | 38,440 | unknown | unknown | |
| ohio | 5,940 | unknown | Beacon? | Smallest IN county |
| porter | 173,215 | unknown | Tier 2 | Large — likely own ArcGIS |
| posey | 25,222 | unknown | unknown | |
| randolph | 24,665 | unknown | unknown | |
| ripley | 28,818 | unknown | unknown | |
| shelby | 44,729 | unknown | Tier 2 | |
| spencer | 19,810 | unknown | unknown | |
| switzerland | 9,737 | unknown | Beacon? | Small county |
| vigo | 105,994 | unknown | Tier 2 | Terre Haute — likely own ArcGIS |
| warrick | 63,898 | unknown | Tier 2 | |
| washington | 27,898 | unknown | unknown | |
| wayne | 65,936 | unknown | Tier 2 | Richmond — likely own ArcGIS |

## Workflow proposal for next session

For each county:
1. Discover endpoint via web search
2. Probe with: `curl 'https://<endpoint>?f=json'` to confirm responds and check fields
3. Map fields to Mapnova schema (pinField, ownerField, etc.)
4. Add entry to COUNTY_PARCEL_APIS in js/app.js
5. Commit
6. Wait for auto-deploy (~60s)
7. Smoke test: load mapnova.org, select Indiana → that county, click a known parcel, verify identify popup populates with owner data
8. If broken: revert immediately, mark county as "needs investigation" in this file
9. Move to next county

Suggest: 5 counties per session, then break to verify all 5 are still working without regressions on previously-configured counties.

## Probe results from this autonomous session
Probed several common URL patterns from mapnova.org origin. All blocked by CORS or DNS. Cannot enumerate endpoints without web search. Marked blocker in CLAUDE.md.
