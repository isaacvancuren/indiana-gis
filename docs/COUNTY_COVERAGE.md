# Indiana County Data Coverage

**Audited:** 2026-05-05  
**Source files:** `apps/web/assets/county-metadata.js`, `county-gis-servers.js`, `municipal-gis-servers.js`, `county-parcel-apis.js`, `mn-schneider-fallback.js`, `mn-zoning-ordinances.js`

## Coverage Matrix

**Column key**

| Column | Meaning |
|--------|---------|
| Parcel boundaries | ✅ = covered by IGIO statewide (all 92 counties) |
| Owner data tier | **1** = ElevateMaps (`em:` in `INDIANA_COUNTIES`); **2** = `COUNTY_PARCEL_APIS`; **3** = `WTH_GIS`; **—** = none configured |
| Layer count (county) | Entry count in `COUNTY_GIS_SERVERS[slug]`; 0 if absent |
| Layer count (municipal) | Sum of all layer entries across cities in `MUNICIPAL_GIS_SERVERS[slug]`; 0 if absent |
| Zoning ordinance | ✅ = any `county` or `county:city` key exists in `ZONING_ORDINANCES`; ✗ = not registered (issue #58 targets ✅ for all) |

---

| County | FIPS | Parcel boundaries | Owner data tier | Layer count (county) | Layer count (municipal) | Zoning ordinance | Notes |
|--------|------|:-----------------:|:---------------:|:--------------------:|:-----------------------:|:----------------:|-------|
| Adams | 18001 | ✅ | — | 0 | 0 | ✗ | `own:` ArcGIS assessor URL in metadata (not in COUNTY_PARCEL_APIS); Beacon fallback; Schneider probe eligible |
| Allen | 18003 | ✅ | 2 | 1 | 5 | ✅ | Fort Wayne ArcGIS (gis.cityoffortwayne.org); municipal: Fort Wayne (5) |
| Bartholomew | 18005 | ✅ | 1 | 0 | 7 | ✅ | EM Layer 92 LOCKED (appId confirmed); municipal: Columbus (7); Schneider WFS also available |
| Benton | 18007 | ✅ | 1 | 0 | 0 | ✗ | ElevateMaps (bentonin.elevatemaps.io); folderId null |
| Blackford | 18009 | ✅ | — | 0 | 0 | ✗ | Beacon only; no public ArcGIS configured |
| Boone | 18011 | ✅ | — | 0 | 0 | ✗ | XSoft PRC; Beacon fallback; Schneider probe eligible |
| Brown | 18013 | ✅ | 3 | 0 | 0 | ✗ | WTH GIS (brownin.wthgis.com); MapDotNet; CORS via corsproxy.io |
| Carroll | 18015 | ✅ | — | 0 | 0 | ✗ | Beacon only; no public ArcGIS configured |
| Cass | 18017 | ✅ | 1 | 0 | 0 | ✗ | ElevateMaps (cassin.elevatemaps.io); folderId null |
| Clark | 18019 | ✅ | 1 | 0 | 0 | ✗ | ElevateMaps (ClarkINDynamic); XSoft PRC also available |
| Clay | 18021 | ✅ | — | 0 | 0 | ✗ | Beacon only; no public ArcGIS configured |
| Clinton | 18023 | ✅ | — | 0 | 0 | ✗ | Beacon only; no public ArcGIS configured |
| Crawford | 18025 | ✅ | — | 0 | 0 | ✗ | Beacon only; no public ArcGIS configured |
| Daviess | 18027 | ✅ | 3 | 0 | 0 | ✗ | WTH GIS (daviessin.wthgis.com); XSoft PRC also available |
| Dearborn | 18029 | ✅ | — | 10 | 0 | ✗ | IEDC ArcGIS layers (services2.arcgis.com/Y0fDSibEfxdu2Ya6); no owner endpoint; includes parcels geometry |
| Decatur | 18031 | ✅ | 2 | 0 | 0 | ✗ | Schneider WFS (DecaturCountyIN_WFS); schema confirmed |
| DeKalb | 18033 | ✅ | — | 0 | 0 | ✗ | XSoft PRC; Beacon fallback; Schneider probe eligible |
| Delaware | 18035 | ✅ | — | 0 | 0 | ✗ | Beacon only; Muncie metro (~115k pop); high-impact gap |
| Dubois | 18037 | ✅ | 3 | 0 | 0 | ✗ | WTH GIS (duboisin.wthgis.com); MapDotNet; CORS via corsproxy.io |
| Elkhart | 18039 | ✅ | 1 | 0 | 0 | ✗ | ElevateMaps (elkhartin.elevatemaps.io); folderId null |
| Fayette | 18041 | ✅ | — | 0 | 0 | ✗ | Beacon only; no public ArcGIS configured |
| Floyd | 18043 | ✅ | 1 | 0 | 0 | ✗ | ElevateMaps (floydin.elevatemaps.io); folderId null |
| Fountain | 18045 | ✅ | — | 0 | 0 | ✗ | XSoft PRC; Beacon fallback; Schneider probe eligible |
| Franklin | 18047 | ✅ | — | 9 | 0 | ✗ | IEDC ArcGIS layers (Franklin_County_GIS_Map); includes parcels geometry; no owner endpoint |
| Fulton | 18049 | ✅ | — | 0 | 0 | ✗ | XSoft PRC; Beacon fallback; Schneider probe eligible |
| Gibson | 18051 | ✅ | — | 0 | 0 | ✗ | XSoft PRC; Beacon fallback; Schneider probe eligible |
| Grant | 18053 | ✅ | 1 | 0 | 0 | ✗ | ElevateMaps (grantin.elevatemaps.io); folderId null |
| Greene | 18055 | ✅ | — | 0 | 0 | ✗ | XSoft PRC; Beacon fallback; Schneider probe eligible |
| Hamilton | 18057 | ✅ | 2 | 22 | 6 | ✅ | County ArcGIS (gis1.hamiltoncounty.in.gov); schema LOCKED; municipal: Carmel (6); full layer coverage |
| Hancock | 18059 | ✅ | 2 | 7 | 0 | ✗ | Schneider WFS (HancockCountyIN_WFS) + IEDC ArcGIS layers; schema confirmed |
| Harrison | 18061 | ✅ | 1 | 0 | 0 | ✗ | ElevateMaps (harrisonin.elevatemaps.io); folderId null |
| Hendricks | 18063 | ✅ | 1 | 8 | 16 | ✗ | ElevateMaps + IEDC ArcGIS layers; municipal: Avon (8), Brownsburg (8); XSoft PRC also; Plainfield planned, not yet coded |
| Henry | 18065 | ✅ | 3 | 0 | 0 | ✗ | WTH GIS (henryin.wthgis.com); MapDotNet; CORS via corsproxy.io |
| Howard | 18067 | ✅ | — | 0 | 0 | ✗ | XSoft PRC; Beacon fallback; Kokomo metro (~82k pop); Schneider probe eligible |
| Huntington | 18069 | ✅ | — | 0 | 0 | ✗ | Beacon deep-link configured; no public ArcGIS found |
| Jackson | 18071 | ✅ | 3 | 0 | 0 | ✗ | WTH GIS (jacksonin.wthgis.com); XSoft PRC also |
| Jasper | 18073 | ✅ | 3 | 0 | 0 | ✗ | WTH GIS (jasperin.wthgis.com); MapDotNet; CORS via corsproxy.io |
| Jay | 18075 | ✅ | 1 | 0 | 0 | ✗ | ElevateMaps (jayin.elevatemaps.io); folderId null |
| Jefferson | 18077 | ✅ | 3 | 0 | 0 | ✗ | WTH GIS (jeffersonin.wthgis.com); XSoft PRC also |
| Jennings | 18079 | ✅ | 3 | 0 | 0 | ✗ | WTH GIS (jenningsin.wthgis.com); MapDotNet; CORS via corsproxy.io |
| Johnson | 18081 | ✅ | 2 | 0 | 4 | ✗ | Schneider WFS (JohnsonCountyIN_WFS); schema LOCKED; municipal: Greenwood (4); `own: 'schneiderjc'` in metadata |
| Knox | 18083 | ✅ | — | 17 | 0 | ✗ | IEDC ArcGIS (Knox_County_GIS_View_Only); civic/POI/infrastructure only, no parcel layer; XSoft PRC; Beacon deep-link |
| Kosciusko | 18085 | ✅ | — | 0 | 0 | ✗ | Beacon deep-link configured; no public ArcGIS configured |
| LaGrange | 18087 | ✅ | 2 | 0 | 0 | ✗ | Schneider WFS (LaGrangeCountyIN_WFS); schema confirmed |
| Lake | 18089 | ✅ | 2 | 25 | 6 | ✗ | County ArcGIS (lcsogis.lakecountyin.org + services5.arcgis.com); municipal: Hammond (6); extensive layer coverage |
| LaPorte | 18091 | ✅ | 1 | 0 | 0 | ✗ | ElevateMaps (laportein.elevatemaps.io); folderId null |
| Lawrence | 18093 | ✅ | 1 | 0 | 0 | ✗ | ElevateMaps (lawrencein.elevatemaps.io); folderId null |
| Madison | 18095 | ✅ | — | 9 | 0 | ✗ | ArcGIS layers (services3.arcgis.com/4UkreHBazssuvI82); XSoft PRC; no owner endpoint; Anderson metro (~129k pop) |
| Marion | 18097 | ✅ | 2 | 21 | 21 | ✅ | Indianapolis/Marion consolidated GIS (gis.indy.gov); schema LOCKED; municipal: Indianapolis (21); most complete county coverage |
| Marshall | 18099 | ✅ | — | 0 | 0 | ✗ | XSoft PRC; Beacon fallback; Schneider probe eligible |
| Martin | 18101 | ✅ | 1 | 0 | 0 | ✗ | ElevateMaps (martinin.elevatemaps.io); folderId null |
| Miami | 18103 | ✅ | 1 | 0 | 0 | ✗ | ElevateMaps (miamiin.elevatemaps.io); Schneider WFS backup LOCKED (MiamiCountyIN_WFS/0) |
| Monroe | 18105 | ✅ | 1 | 25 | 6 | ✅ | ElevateMaps (monroein.elevatemaps.io); Schneider WFS backup LOCKED (MonroeCountyIN_WFS/0); municipal: Bloomington (6); full layer coverage |
| Montgomery | 18107 | ✅ | — | 8 | 0 | ✗ | IEDC ArcGIS layers (Montgomery_County_GIS_Map); includes parcels geometry; no owner endpoint |
| Morgan | 18109 | ✅ | 1 | 8 | 0 | ✗ | ElevateMaps (morganin.elevatemaps.io); Schneider WFS backup LOCKED (MorganCountyIN_WFS/0) + IEDC layers |
| Newton | 18111 | ✅ | 3 | 0 | 0 | ✗ | WTH GIS (newtonin.wthgis.com); MapDotNet; CORS via corsproxy.io |
| Noble | 18113 | ✅ | 3 | 0 | 0 | ✗ | WTH GIS (noblein.wthgis.com); MapDotNet; CORS via corsproxy.io |
| Ohio | 18115 | ✅ | — | 0 | 0 | ✗ | XSoft PRC; Beacon fallback; smallest county by population |
| Orange | 18117 | ✅ | 1 | 0 | 0 | ✗ | ElevateMaps (orangein.elevatemaps.io); folderId null |
| Owen | 18119 | ✅ | 1 | 0 | 0 | ✗ | ElevateMaps (owenin.elevatemaps.io); folderId null |
| Parke | 18121 | ✅ | 3 | 0 | 0 | ✗ | WTH GIS (parkein.wthgis.com); MapDotNet; CORS via corsproxy.io |
| Perry | 18123 | ✅ | 3 | 0 | 0 | ✗ | WTH GIS (perryin.wthgis.com); MapDotNet; CORS via corsproxy.io |
| Pike | 18125 | ✅ | 3 | 0 | 0 | ✗ | WTH GIS (pikein.wthgis.com); MapDotNet; CORS via corsproxy.io |
| Porter | 18127 | ✅ | — | 12 | 4 | ✗ | ArcGIS layers (Porter County AGOL); municipal: Valparaiso (4); XSoft PRC; no owner endpoint — high-value gap (~170k pop) |
| Posey | 18129 | ✅ | — | 0 | 0 | ✗ | XSoft PRC; Beacon fallback |
| Pulaski | 18131 | ✅ | 3 | 0 | 0 | ✗ | WTH GIS (pulaskin.wthgis.com); MapDotNet; CORS via corsproxy.io |
| Putnam | 18133 | ✅ | 3 | 0 | 0 | ✗ | WTH GIS (putnamin.wthgis.com); MapDotNet; CORS via corsproxy.io |
| Randolph | 18135 | ✅ | — | 0 | 0 | ✗ | XSoft PRC; Beacon fallback; Schneider probe eligible |
| Ripley | 18137 | ✅ | — | 0 | 0 | ✗ | XSoft PRC; Beacon fallback |
| Rush | 18139 | ✅ | 2 | 0 | 0 | ✗ | Schneider WFS (RushCountyIN_WFS); schema confirmed |
| St. Joseph | 18141 | ✅ | 2 | 0 | 7 | ✅ | South Bend GIS (gis.southbendin.gov); schema confirmed; municipal: South Bend (7) |
| Scott | 18143 | ✅ | 3 | 0 | 0 | ✗ | WTH GIS (scottin.wthgis.com); MapDotNet; CORS via corsproxy.io |
| Shelby | 18145 | ✅ | — | 0 | 0 | ✗ | XSoft PRC; Beacon fallback |
| Spencer | 18147 | ✅ | — | 0 | 0 | ✗ | XSoft PRC; Beacon fallback |
| Starke | 18149 | ✅ | 3 | 0 | 0 | ✗ | WTH GIS (starkein.wthgis.com); MapDotNet; CORS via corsproxy.io |
| Steuben | 18151 | ✅ | 2 | 0 | 0 | ✗ | Schneider WFS (SteubenCountyIN_WFS); schema confirmed |
| Sullivan | 18153 | ✅ | 3 | 0 | 0 | ✗ | WTH GIS (sullivanin.wthgis.com); MapDotNet; CORS via corsproxy.io |
| Switzerland | 18155 | ✅ | — | 0 | 0 | ✗ | XSoft PRC; Beacon fallback |
| Tippecanoe | 18157 | ✅ | 2 | 26 | 0 | ✗ | Schneider WFS (wfs.schneidercorp.com) + county ArcGIS (maps.tippecanoe.in.gov); most county-level GIS layers in state |
| Tipton | 18159 | ✅ | 2 | 0 | 0 | ✗ | Schneider WFS (TiptonCountyIN_WFS); schema confirmed |
| Union | 18161 | ✅ | 3 | 0 | 0 | ✗ | WTH GIS (unionin.wthgis.com); MapDotNet; CORS via corsproxy.io |
| Vanderburgh | 18163 | ✅ | 2 | 22 | 6 | ✗ | Evansville GIS (maps.evansvillegis.com); XSoft PRC also; municipal: Evansville (6); no zoning link yet |
| Vermillion | 18165 | ✅ | 3 | 0 | 0 | ✗ | WTH GIS (vermillionin.wthgis.com); MapDotNet; CORS via corsproxy.io |
| Vigo | 18167 | ✅ | — | 0 | 0 | ✗ | Beacon deep-link configured; no public ArcGIS found; Terre Haute metro (~100k pop) |
| Wabash | 18169 | ✅ | 2 | 0 | 0 | ✗ | Schneider WFS (WabashCountyIN_WFS); schema confirmed |
| Warren | 18171 | ✅ | 3 | 0 | 0 | ✗ | WTH GIS (warrennin.wthgis.com); MapDotNet; CORS via corsproxy.io |
| Warrick | 18173 | ✅ | — | 0 | 0 | ✗ | XSoft PRC; Beacon fallback |
| Washington | 18175 | ✅ | — | 0 | 0 | ✗ | XSoft PRC; Beacon fallback |
| Wayne | 18177 | ✅ | — | 0 | 0 | ✗ | XSoft PRC; Beacon fallback; Richmond metro (~68k pop) |
| Wells | 18179 | ✅ | 2 | 0 | 0 | ✗ | Schneider WFS (WellsCountyIN_WFS); schema confirmed |
| White | 18181 | ✅ | 1 | 0 | 0 | ✗ | ElevateMaps (whitein.elevatemaps.io); Schneider WFS backup LOCKED (WhiteCountyIN_WFS/0) |
| Whitley | 18183 | ✅ | 2 | 0 | 0 | ✗ | Schneider WFS (WhitleyCountyIN_WFS); schema confirmed |

---

## Summary Statistics

| Metric | Count |
|--------|-------|
| Total counties | 92 |
| Parcel boundaries (IGIO) | 92 / 92 |
| Owner data Tier 1 (ElevateMaps) | 19 |
| Owner data Tier 2 (COUNTY_PARCEL_APIS) | 17 |
| Owner data Tier 3 (WTH GIS) | 21 |
| No owner data configured | 35 |
| Counties with county GIS layers | 16 |
| Counties with municipal GIS layers | 11 |
| Zoning ordinance registered | 6 |

**Tier 2 note:** Four counties (Miami, Monroe, Morgan, White) appear in both `EM_COUNTIES`/`em:` (Tier 1) and `COUNTY_PARCEL_APIS` (Schneider WFS confirmed LOCKED). Tier 1 takes precedence; the Schneider WFS serves as a live backup.

---

## Gaps and Next-step Opportunities

- **Best-served counties** are Marion, Monroe, Hamilton, Lake, Vanderburgh, and Tippecanoe — all have rich county GIS layer catalogs (21–26 entries), configured owner endpoints, and at least one city with municipal GIS layers. Monroe and Marion additionally have fully confirmed EM/county API schemas and zoning entries. These are the benchmark to aim for.

- **Porter County is the highest-impact quick win.** With 12 county and 4 municipal GIS layers already registered, it is the best-equipped county that still lacks a configured owner endpoint (tier —). The county is on XSoft Engage; a Schneider WFS probe entry or a direct `COUNTY_PARCEL_APIS` entry would close the gap for a ~170k-population area. Similarly, **Madison County** (Anderson metro, ~129k) has 9 AGOL ArcGIS layers including parcels but no owner tier — a `COUNTY_PARCEL_APIS` entry is the natural next step.

- **Large population counties with no GIS at all** are the clearest priorities after the above: **Delaware** (Muncie, ~115k), **Vigo** (Terre Haute, ~100k), **Howard** (Kokomo, ~82k), and **Wayne** (Richmond, ~68k) each have either Beacon-only or XSoft-only coverage, with zero county GIS layers registered. All four would benefit from researching their county GIS portals and adding COUNTY_GIS_SERVERS entries; owner-endpoint configuration (ideally Schneider WFS, confirmed via runtime probe) would follow.

- **IEDC-served counties need owner endpoints.** Dearborn, Franklin, Montgomery, Knox, and (partly) Hancock have geometry layers from Indiana's IEDC ArcGIS org (`services2.arcgis.com/Y0fDSibEfxdu2Ya6`) but no configured owner lookup. For Dearborn and Franklin this means parcel geometry is renderable but clicking a parcel yields no owner data. Researching their Schneider WFS availability or county assessor ArcGIS service would complete these.

- **WTH GIS CORS dependency is a systemic risk.** All 21 Tier 3 counties route through `corsproxy.io` — a third-party service outside Mapnova's control. If that proxy is unavailable, all 21 counties silently lose Tier 3 owner data (IGIO fallback still works). Replacing the WTH GIS tier with direct Schneider WFS probes (most WTH counties are in `BEACON_APPS` and likely have public WFS) would eliminate this single point of failure. The runtime `mn-schneider-fallback.js` already has the probe machinery; static `COUNTY_PARCEL_APIS` entries for high-priority WTH counties (e.g. Brown, Dubois, Henry, Daviess) would be more reliable.

- **ElevateMaps folderId gap limits PDF deep-links.** Of 19 Tier 1 counties, only Bartholomew has a confirmed `folderId` for Venturi blob PDF generation. The other 18 (`cass`, `floyd`, `grant`, `harrison`, `jay`, `lawrence`, `martin`, `miami`, `orange`, `benton`, `elkhart`, `laporte`, `owen`, `white`, `clark`, `hendricks`, `monroe`, `morgan`) have `folderId: null`. The owner lookup pipeline works for all of them, but the "Open Property Card" PDF feature is degraded. Discovering and filling in `folderId` values for high-traffic counties (Elkhart, LaPorte, Monroe, Hendricks) is low-effort and high-reward.
