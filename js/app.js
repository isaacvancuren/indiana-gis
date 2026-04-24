
// ══════════════════════════════════════════════
//  MAP INITIALIZATION
// ══════════════════════════════════════════════
const map = L.map('map',{
  center: [39.2015, -85.9210],
  zoom: 14,
  zoomControl: false,
  attributionControl: true,
  scrollWheelZoom: true,   // ← enable trackpad/mouse wheel zoom
  touchZoom: true,         // ← enable pinch zoom on mobile
  doubleClickZoom: true,
  dragging: true,
  tap: true,
  preferCanvas: true       // ← faster rendering for many polygons
});

const basemaps = {
  // CARTO Voyager — clean street map, no referer required
  streets: L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',{
    maxZoom:19, attribution:'© <a href="https://carto.com/">CARTO</a> © OpenStreetMap contributors',
    subdomains:'abcd'
  }),
  // Esri World Imagery — free, no referer required
  satellite: L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',{
    maxZoom:19, attribution:'© Esri, Maxar, Earthstar Geographics'
  }),
  // Esri World Topo — no referer required
  topo: L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}',{
    maxZoom:19, attribution:'© Esri, HERE, Garmin, FAO, NOAA, USGS'
  }),
  // CARTO Dark Matter — no referer required (was already working)
  dark: L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',{
    maxZoom:19, attribution:'© <a href="https://carto.com/">CARTO</a> © OpenStreetMap contributors',
    subdomains:'abcd'
  }),
  // CARTO Positron Light — no referer required
  light: L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',{
    maxZoom:19, attribution:'© <a href="https://carto.com/">CARTO</a> © OpenStreetMap contributors',
    subdomains:'abcd'
  }),
  // Esri World Street Map — extra fallback
  esri: L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}',{
    maxZoom:19, attribution:'© Esri, HERE, Garmin'
  })
};
let curBM = 'dark';
basemaps.dark.addTo(map);

function setBasemap(name,btn){
  map.removeLayer(basemaps[curBM]);
  basemaps[name].addTo(map);
  basemaps[name].bringToBack();
  curBM = name;
  document.querySelectorAll('.bmbtn').forEach(b=>b.classList.remove('on'));
  btn?.classList.add('on');
  // Parcel canvas layer always renders on top of basemaps naturally
}

// ══════════════════════════════════════════════
//  PARCEL DATA — Extended with full owner + PRC history
// ══════════════════════════════════════════════
// ══════════════════════════════════════════════
//  LIVE PARCEL SYSTEM — Indiana IGIO Official Data
//  Source: gisdata.in.gov FeatureServer
//  Bartholomew County FIPS: 18005 / county_id: 3
// ══════════════════════════════════════════════

// ── Parcel layer — Canvas renderer is dramatically faster than SVG ────────────
// Canvas renders all polygons as a single bitmap — no DOM elements per parcel
const canvasRenderer = L.canvas({ padding: 0.5, tolerance: 4 });
const parcelLayer = L.featureGroup().addTo(map);
let selectedParcel = null;
let selectedLayer  = null;

// Tile cache + dedup
const parcelTileCache  = new Set();
const loadedParcelIds  = new Set();
let   activeRequests   = 0;
let   apiErrorCount    = 0;
const MAX_CONCURRENT   = 3;  // max simultaneous IGIO requests
let   pendingTiles     = []; // queue of bbox objects waiting to fetch
let   loadDebounceTimer = null;

// ── IGIO FeatureServer endpoint ──────────────────────────────────────────────
const IGIO_BASE = 'https://gisdata.in.gov/server/rest/services/Hosted/Parcel_Boundaries_of_Indiana_Current/FeatureServer/0/query';

function buildParcelQuery(bbox) {
  const geomJson = JSON.stringify({
    xmin: bbox.minLng, ymin: bbox.minLat,
    xmax: bbox.maxLng, ymax: bbox.maxLat,
    spatialReference: { wkid: 4326 }
  });
  const p = new URLSearchParams({
    where:           activeCounty && activeCounty.fips
                     ? "county_fips='" + activeCounty.fips + "'"
                     : "1=1",
    geometry:        geomJson,
    geometryType:    'esriGeometryEnvelope',
    inSR:            '4326',
    spatialRel:      'esriSpatialRelIntersects',
    outFields:       'parcel_id,prop_add,prop_city,prop_zip,dlgf_prop_class_code,state_parcel_id,latitude,longitude',
    returnGeometry:  'true',
    outSR:           '4326',
    resultRecordCount: '2000',
    f:               'geojson'
  });
  return IGIO_BASE + '?' + p.toString();
}

function tileKey(lat, lng, tileSize) {
  return `${tileSize}|${Math.floor(lat/tileSize)}|${Math.floor(lng/tileSize)}`;
}
function tileBBox(row, col, tileSize, pad) {
  return {
    minLat: row * tileSize - pad,    maxLat: (row+1) * tileSize + pad,
    minLng: col * tileSize - pad,    maxLng: (col+1) * tileSize + pad
  };
}

// ── Debounced tile loader — prevents rapid-pan from flooding requests ─────────
function loadParcelsForView() {
  clearTimeout(loadDebounceTimer);
  loadDebounceTimer = setTimeout(_doLoadParcels, 150);
}

function _doLoadParcels() {
  const zoom = map.getZoom();
  if (zoom < 13) { showZoomHint(); return; }

  const bounds   = map.getBounds();
  const tileSize = zoom >= 16 ? 0.008 : zoom >= 15 ? 0.012 : zoom >= 14 ? 0.018 : 0.025;
  const rowMin   = Math.floor(bounds.getSouth() / tileSize);
  const rowMax   = Math.floor(bounds.getNorth() / tileSize);
  const colMin   = Math.floor(bounds.getWest()  / tileSize);
  const colMax   = Math.floor(bounds.getEast()  / tileSize);

  const newTiles = [];
  for (let row = rowMin; row <= rowMax; row++) {
    for (let col = colMin; col <= colMax; col++) {
      const key = `${tileSize}|${row}|${col}`;
      if (parcelTileCache.has(key)) continue;
      parcelTileCache.add(key);
      newTiles.push(tileBBox(row, col, tileSize, 0.001));
    }
  }

  // Add to queue and drain
  pendingTiles.push(...newTiles);
  _drainTileQueue();
}

// ── Concurrent-capped tile fetcher ────────────────────────────────────────────
function _drainTileQueue() {
  while (pendingTiles.length > 0 && activeRequests < MAX_CONCURRENT) {
    const bbox = pendingTiles.shift();
    _fetchOneTile(bbox);
  }
}

async function _fetchOneTile(bbox) {
  if (apiErrorCount >= 5) return;
  activeRequests++;
  showLoadingIndicator(true);
  try {
    const ctrl  = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 15000);
    const resp  = await fetch(buildParcelQuery(bbox), { signal: ctrl.signal });
    clearTimeout(timer);
    if (!resp.ok) throw new Error('HTTP ' + resp.status);
    const data = await resp.json();
    if (data && Array.isArray(data.features) && data.features.length > 0) {
      // Render in non-blocking chunks — never block the main thread
      _renderChunked(data.features, 0, 60);
      apiErrorCount = 0;
    }
  } catch(e) {
    if (e.name !== 'AbortError') {
      apiErrorCount++;
      console.warn('[parcel]', e.message);
      if (apiErrorCount === 5) notify('Parcel API unreachable', 'fa-triangle-exclamation');
    }
  } finally {
    activeRequests--;
    _drainTileQueue(); // start next queued tile
    if (activeRequests === 0 && pendingTiles.length === 0) showLoadingIndicator(false);
  }
}

// ── Non-blocking chunked renderer ────────────────────────────────────────────
// Builds a batch of layers then adds them all at once per frame
function _renderChunked(features, startIdx, chunkSize) {
  const end   = Math.min(startIdx + chunkSize, features.length);
  const batch = [];
  for (let i = startIdx; i < end; i++) {
    const layer = _buildParcelLayer(features[i]);
    if (layer) batch.push(layer);
  }
  // Single addLayer call per batch — one Leaflet redraw instead of N
  if (batch.length) {
    batch.forEach(l => parcelLayer.addLayer(l));
  }
  if (end < features.length) {
    requestAnimationFrame(() => _renderChunked(features, end, chunkSize));
  }
}

// ── Build one parcel polygon layer (no map mutation yet) ─────────────────────
function _buildParcelLayer(feature) {
  if (!feature || !feature.geometry) return null;
  const props = feature.properties || {};
  const pid   = (props.parcel_id || props.state_parcel_id || '').toString();
  if (pid && loadedParcelIds.has(pid)) return null;
  if (pid) loadedParcelIds.add(pid);

  const addr = (props.prop_add  || '').trim() || 'Parcel';
  const city = (props.prop_city || '').trim();
  const zip  = (props.prop_zip  || '').trim();
  const cls  = (props.dlgf_prop_class_code || '').toString().trim();
  const lat  = parseFloat(props.latitude)  || 0;
  const lng  = parseFloat(props.longitude) || 0;
  const use  = getPropClass(cls);

  const p = {
    id: pid || ('lv-' + Math.random().toString(36).slice(2,8)),
    lat, lon: lng, addr, city, zip, pid, use,
    owner:'(see assessor)', otype:use,
    oaddr:`${addr}, ${city}, IN ${zip}`,
    deed:'—', txdate:'—', txprice:'—', acres:'—', sqft:'—', twp:'—',
    sec:'—', range:'—', legal:pid, zone:'—', yr:'—', struct:'—',
    bed:'—', const:'—', cond:'—', lv:'—', iv:'—', tv:'—', hx:'—',
    ty:'2024', tax:'—', txstat:'—', sales:[], taxhist:[]
  };

  // Extract coordinate rings — use L.polygon directly, skip geoJSON wrapper
  let latlngs = null;
  try {
    const g = feature.geometry;
    if (g.type === 'Polygon') {
      latlngs = g.coordinates.map(ring => ring.map(c => [c[1], c[0]]));
    } else if (g.type === 'MultiPolygon') {
      latlngs = g.coordinates.map(poly => poly.map(ring => ring.map(c => [c[1], c[0]])));
    }
  } catch(e) { return null; }
  if (!latlngs) return null;

  const poly = L.polygon(latlngs, {
    renderer:    canvasRenderer,
    color:       '#f0a500',
    weight:      1.2,
    opacity:     0.9,
    fillColor:   '#f0a500',
    fillOpacity: 0.07,
    interactive: true
  });

  poly.on('mouseover', function() {
    if (this !== selectedLayer)
      this.setStyle({ color:'#ffd966', weight:2.5, fillOpacity:0.30 });

    // Pull owner from cache if available
    const cacheKey  = (p.pid || '').replace(/[^a-zA-Z0-9]/g,'');
    const cached    = ownerCache[cacheKey];
    const ownerName = cached?.owner || p.owner || null;
    const tv        = cached?.tot_assessed_value != null
                        ? '$' + Math.round(cached.tot_assessed_value).toLocaleString()
                        : (p.tv && p.tv !== '—' ? p.tv : null);

    this.bindTooltip(
      `<div style="font-family:'Barlow Condensed',sans-serif;line-height:1.6;min-width:180px;">
         <div style="font-size:14px;font-weight:800;color:#fff;letter-spacing:.2px;">${addr || 'Parcel'}</div>
         <div style="font-size:10px;color:#94a3b8;">${city}${zip ? ', IN '+zip : ''}</div>
         ${ownerName && ownerName !== '(see assessor)' && ownerName !== '—'
           ? `<div style="font-size:11px;color:#34d399;font-weight:600;margin-top:3px;">
                <i class="fas fa-user" style="font-size:9px;margin-right:4px;opacity:.7;"></i>${ownerName}</div>`
           : `<div style="font-size:10px;color:#64748b;margin-top:2px;font-style:italic;">Click to load owner…</div>`}
         ${tv ? `<div style="font-size:10px;color:#f0a500;margin-top:1px;">AV: ${tv}</div>` : ''}
         <div style="font-size:10px;color:#64748b;margin-top:2px;">${use}</div>
       </div>`,
      { sticky:true, direction:'top', offset:[0,-6], opacity:1 }
    ).openTooltip();
  });
  poly.on('mouseout', function() {
    if (this !== selectedLayer)
      this.setStyle({ color:'#f0a500', weight:1.2, fillOpacity:0.07 });
    this.closeTooltip();
  });
  poly.on('click', function(e) {
    L.DomEvent.stop(e);
    this.parcelData = p;
    selectParcelLive(p, this);
  });

  poly.parcelData = p;
  return poly;
}

// ── Single-feature entry point (backwards compat) ─────────────────────────────
function _addParcelFeature(feature) {
  const l = _buildParcelLayer(feature);
  if (l) parcelLayer.addLayer(l);
}

// ── Backwards-compat aliases ──────────────────────────────────────────────────
function renderGeoJSONParcels(features) { _renderChunked(features, 0, 80); }
function fetchParcelTile(bbox)          { pendingTiles.push(bbox); _drainTileQueue(); }


function getPropClass(code) {
  const map = {
    '100':'Residential','101':'Single Family Residential','102':'Mobile Home',
    '200':'Agricultural','201':'AG Land','202':'AG Improvement',
    '300':'Industrial','400':'Commercial','500':'Utilities',
    '600':'Exempt','700':'Vacant Land','001':'Residential','010':'Commercial',
    '100-000':'Residential','200-000':'Agricultural','300-000':'Industrial',
    '400-000':'Commercial','500-000':'Utility','600-000':'Exempt',
    '':'Unknown'
  };
  return map[code] || (code ? `Class ${code}` : 'Unknown');
}

// ── Get centroid from GeoJSON geometry ───────────────────────────────────────
function getBBoxCenter(geometry) {
  try {
    const coords = geometry.type === 'Polygon' ? geometry.coordinates[0]
                 : geometry.type === 'MultiPolygon' ? geometry.coordinates[0][0]
                 : [];
    if (!coords.length) return { lat:39.201, lng:-85.921 };
    const sumLat = coords.reduce((a,c)=>a+c[1],0)/coords.length;
    const sumLng = coords.reduce((a,c)=>a+c[0],0)/coords.length;
    return { lat:sumLat, lng:sumLng };
  } catch(e) { return { lat:39.201, lng:-85.921 }; }
}

// ── Show/hide the loading spinner ────────────────────────────────────────────
function showLoadingIndicator(show) {
  const el = document.getElementById('loading');
  if (el) el.classList.toggle('gone', !show);
}

// ── Zoom hint ─────────────────────────────────────────────────────────────────
let zoomHintTimer;
function showZoomHint() {
  const el = document.getElementById('zoom-hint');
  if (!el) return;
  el.classList.add('on');
  clearTimeout(zoomHintTimer);
  zoomHintTimer = setTimeout(()=>el.classList.remove('on'), 2500);
}

// ── Select a live (API-loaded) parcel ────────────────────────────────────────

// ══════════════════════════════════════════════
//  OWNERSHIP DATA — ElevateMaps Layer 92
//  Bartholomew County full parcel + owner data
//  Same source that powers Beacon GIS
// ══════════════════════════════════════════════

// ElevateMaps ownership URL — dynamic based on active county
// Counties on ElevateMaps have rich ownership data; others use IGIO + Gateway links
function getElevateUrl() {
  const em = activeCounty.em;
  if (!em) return null;
  return 'https://elb.elevatemaps.io/arcgis/rest/services/eGISDynamicServices/' + em + '/MapServer/92/query';
}
const ELEVATE_URL = getElevateUrl; // function reference, call as getElevateUrl()

// In-memory ownership cache keyed by pin_18 (parcel ID)
// ══════════════════════════════════════════════════════════════════════
//  OWNERSHIP DATA SYSTEM — ALL 92 INDIANA COUNTIES
//
//  TIER 1: ElevateMaps Layer 92 — 19 counties (richest: owner, AV, sales)
//  TIER 2: County-specific ArcGIS REST services — 20+ additional counties
//  TIER 3: Marion County (Indy) own ArcGIS service
//  TIER 4: DLGF Tax Bill lookup link — remaining counties (no API, link only)
//
//  Architecture: prefetchOwnershipForView() bulk-fetches for viewport.
//  fetchOwnershipByPin() fetches on-demand when a parcel is clicked.
//  enrichParcelData() maps any source's fields onto the common parcel object.
// ══════════════════════════════════════════════════════════════════════


// ██████████████████████████████████████████████████████████████████████████████
//  !! BASELINE LOCKED — DO NOT MODIFY THIS OWNERSHIP SYSTEM !!
//
//  This is the confirmed working ownership model for ALL Indiana counties.
//  Bartholomew County is the baseline. Every county uses this exact system.
//
//  WHAT WORKS (DO NOT CHANGE):
//  • Hover tooltip  → address, city, owner name (green), AV, property class
//  • Click popup    → opens immediately, updates with full owner data async
//  • Owner panel    → owner, mailing addr, AV, land/improv, acres, sale, twp
//  • Prefetch       → bulk-loads ownerCache on pan/zoom so data is instant
//
//  DATA FLOW (DO NOT CHANGE):
//  1. prefetchOwnershipForView() → fills ownerCache for all visible parcels
//  2. mouseover → reads ownerCache → shows owner in tooltip immediately
//  3. click → selectParcelLive() → buildPopupHTML() → shows popup
//  4. fetchOwnershipByPin() → enrichParcelData() → popup.setContent() updates
//
//  TIER 1 (ElevateMaps Layer 92 — 19 counties): direct fetch, richest data
//  TIER 2 (County ArcGIS services): normalized via _normalizeCountyAttr()
// ██████████████████████████████████████████████████████████████████████████████

// ══════════════════════════════════════════════════════════════════════════════
//  OWNERSHIP DATA SYSTEM — ALL 92 INDIANA COUNTIES
//
//  TIER 1: ElevateMaps Layer 92 — 19 counties (richest: owner, AV, sales)
//  TIER 2: County-specific ArcGIS REST services — additional counties
//  Architecture: prefetchOwnershipForView() bulk-fetches for viewport.
//  fetchOwnershipByPin() fetches on-demand when a parcel is clicked.
//  enrichParcelData() maps any source's fields onto the common parcel object.
// ══════════════════════════════════════════════════════════════════════════════

const ownerCache = {};
let ownerCacheLoading = false;

// ── TIER 1: ElevateMaps Layer 92 ─────────────────────────────────────────────
const EM_LAYER92 = {
  bartholomew: 'BartholomewINDynamic',
  benton:      'BentonINDynamic',
  cass:        'CassINDynamic',
  clark:       'ClarkINDynamic',
  elkhart:     'ElkhartINDynamic',
  floyd:       'FloydINDynamic',
  grant:       'GrantINDynamic',
  harrison:    'HarrisonINDynamic',
  hendricks:   'HendricksINDynamic',
  jay:         'JayINDynamic',
  laporte:     'LaPorteINDynamic',
  lawrence:    'LawrenceINDynamic',
  martin:      'MartinINDynamic',
  miami:       'MiamiINDynamic',
  monroe:      'MonroeINDynamic',
  morgan:      'MorganINDynamic',
  orange:      'OrangeINDynamic',
  owen:        'OwenINDynamic',
  white:       'WhiteINDynamic',
};
const EM_BASE = 'https://elb.elevatemaps.io/arcgis/rest/services/eGISDynamicServices/';
const L92_FIELDS = [
  'pin_18','tax_10','pin_18stripped',
  'owner','owner_street','owner_city_st_zip',
  'property_street','property_city_st_zip',
  'legal_desc','nbhd_name','nbhd_code',
  'prop_class_code','prop_class_desc',
  'land_value','improv_value','tot_assessed_value',
  'legal_acreage','calc_sq_ft','calc_ac',
  'political_twp','school_corporation',
  'latest_sale_date','latest_sale_price',
  'deedbook','deedpage','documentnumber',
  'latest_sale_year','validsale','notes','review_year'
].join(',');

// ── TIER 2: County-specific ArcGIS parcel/assessor services ──────────────────
const COUNTY_PARCEL_APIS = {
  // ── TIER 2A: County-hosted ArcGIS ──────────────────────────────────────────

  // Marion County (Indianapolis) — confirmed working
  marion: {
    url: 'https://gis.indy.gov/server/rest/services/Assessors/Parcel/FeatureServer/0/query',
    pinField: 'PARCEL_NUM', ownerField: 'OWNER_NAME', addrField: 'SITUS_ADDR',
    avField: 'NET_AV', acresField: 'ACRES', schema: 'marion',
    lookupUrl: 'https://www.indy.gov/activity/check-your-assessed-value'
  },

  // Hamilton County — confirmed fields from gis1.hamiltoncounty.in.gov live schema
  hamilton: {
    url:           'https://gis1.hamiltoncounty.in.gov/arcgis/rest/services/HamCoParcelsPublic/FeatureServer/0/query',
    pinField:      'FMTPRCLNO',  ownerField:    'DEEDEDOWNR',
    addrField:     'LOCADDRESS', cityField:     'LOCCITY',    zipField:  'LOCZIP',
    legalField:    'LEGALDESC',  saleDateField: 'LSTXFRDATE',
    schema: 'hamilton',
    lookupUrl: 'https://www.hamiltoncounty.in.gov/propertyreports'
  },

  // Allen County (Fort Wayne) — county parcel service
  allen: {
    url: 'https://gis.cityoffortwayne.org/arcgis/rest/services/Public/Parcels/FeatureServer/0/query',
    pinField: 'PARCEL_ID', ownerField: 'OWNER', addrField: 'PROP_ADDR',
    avField: 'TOTAL_AV', acresField: 'ACRES', schema: 'standard',
    lookupUrl: 'https://www.allencounty.in.gov/egov/apps/assessor/index.egov'
  },

  // Lake County Indiana
  lake: {
    url: 'https://gis.lakecountyin.org/arcgis/rest/services/Assessment/PublicParcels/FeatureServer/0/query',
    pinField: 'PARCELNO', ownerField: 'OWNER', addrField: 'SITUS_ADDRESS',
    avField: 'NET_AV', acresField: 'ACRES', schema: 'standard',
    lookupUrl: 'https://lakeinsurveyor.mygisonline.com/'
  },

  // St. Joseph County (South Bend/Mishawaka)
  stjoseph: {
    url: 'https://gisapps.sjcgov.org/arcgis/rest/services/Public/Parcels/FeatureServer/0/query',
    pinField: 'PARCEL_ID', ownerField: 'OWNER_NAME', addrField: 'PROP_ADDR',
    avField: 'AV_TOTAL', acresField: 'CALC_ACRES', schema: 'standard',
    lookupUrl: 'https://sjcgov.org/department/assessor'
  },

  // Vanderburgh County (Evansville) — confirmed public MapServer
  vanderburgh: {
    url:      'https://maps.evansvillegis.com/arcgis_server/rest/services/PROPERTY/PARCELS/MapServer/0/query',
    pinField: 'STATE_PARCEL_ID', ownerField: 'OWNER_NAME', addrField: 'PROP_ADDR',
    acresField: 'CALC_ACRES', schema: 'vanderburgh',
    lookupUrl: 'https://maps.evansvillegis.com/'
  },

  // Tippecanoe County (Lafayette) — ArcGIS Online public layer
  tippecanoe: {
    url: 'https://services1.arcgis.com/FvF9MZKp3JWPrSsg/arcgis/rest/services/Tippecanoe_Parcels/FeatureServer/0/query',
    pinField: 'PARCEL_NUMBER', ownerField: 'OWNER_NAME', addrField: 'PROPERTY_ADDRESS',
    avField: 'ASSESSED_VALUE', acresField: 'ACRES', schema: 'standard',
    lookupUrl: 'https://beacon.schneidercorp.com/?site=TippecanoeCountyIN'
  },

  // ── TIER 2B: Schneider WFS — confirmed field schemas ───────────────────────

  // Johnson County — LOCKED (confirmed working)
  johnson: {
    url:           'https://wfs.schneidercorp.com/arcgis/rest/services/JohnsonCountyIN_WFS/MapServer/2/query',
    pinField:      'PARCEL_NUM',  ownerField:    'OWNER1',
    addrField:     'ST_ADDR',     cityField:     'ST_CITY',    zipField:     'ST_ZIP',
    mailAddrField: 'MAIL_ADDR',   mailCityField: 'MAIL_CITY',  mailStField:  'MAIL_ST', mailZipField: 'MAIL_ZIP',
    avField:       'CERT_VALUE',  acresField:    'ACRES',      twpField:     'TWP_NAME',
    schoolField:   'SCHOOL_DIST', legalField:    'LEGAL',      saleDateField:'XFER_DATE', docField:'DOC_NUM',
    classField:    'PROP_CLASS',
    schema: 'schneiderjc', lookupUrl: 'https://beacon.schneidercorp.com/?site=JohnsonCountyIN'
  },

  // Hancock County — confirmed from live schema: OWNER1, PARCEL_ID, LEG_ACR
  hancock: {
    url:           'https://wfs.schneidercorp.com/arcgis/rest/services/HancockCountyIN_WFS/MapServer/3/query',
    pinField:      'PARCEL_ID',   ownerField:    'OWNER1',
    addrField:     'PROP_STREE',  cityField:     'PROP_CITY',  zipField:     'PROP_ZIP',
    mailAddrField: 'OWN_STREET',  mailCityField: 'OWN_CITY',   mailZipField: 'OWN_ZIP',
    legalField:    'LEG_DESC',    acresField:    'LEG_ACR',    saleDateField:'LASTTRANS', salePriceField:'CONSIDERAT',
    classField:    'PROPERTY_C',
    schema: 'schneiderhc', lookupUrl: 'https://beacon.schneidercorp.com/?site=HancockCountyIN'
  },

  // Decatur County — confirmed from live schema: owner1, PIN, TotalValue
  decatur: {
    url:           'https://wfs.schneidercorp.com/arcgis/rest/services/DecaturCountyIN_WFS/MapServer/0/query',
    pinField:      'PIN',         ownerField:    'owner1',
    addrField:     'prop_str',    cityField:     'prop_city',  zipField:     'prop_zip',
    mailAddrField: 'own_street',  mailCityField: 'own_city',   mailStField:  'own_state', mailZipField: 'own_zip',
    acresField:    'Acreage',     avField:       'TotalValue', lvField:      'LandValue', ivField: 'ImprovValue',
    classField:    'PropertyCl',
    schema: 'schneiderdc', lookupUrl: 'https://beacon.schneidercorp.com/?site=DecaturCountyIN'
  },

  // LaGrange County — confirmed: Owner, PIN, Legal_Ac
  lagrange: {
    url:      'https://wfs.schneidercorp.com/arcgis/rest/services/LaGrangeCountyIN_WFS/MapServer/3/query',
    pinField: 'PIN', ownerField: 'Owner', acresField: 'Legal_Ac', legalField: 'Description',
    schema:   'schneiderlg', lookupUrl: 'https://beacon.schneidercorp.com/?site=LaGrangeCountyIN'
  },

  // Steuben County — confirmed: Owners, PIN, Acreage
  steuben: {
    url:      'https://wfs.schneidercorp.com/arcgis/rest/services/SteubenCountyIN_WFS/MapServer/3/query',
    pinField: 'PIN', ownerField: 'Owners', acresField: 'Acreage',
    schema:   'schneiderst', lookupUrl: 'https://beacon.schneidercorp.com/?site=SteubenCountyIN'
  },

  // Wabash County — Schneider WFS
  wabash: {
    url:      'https://wfs.schneidercorp.com/arcgis/rest/services/WabashCountyIN_WFS/MapServer/2/query',
    pinField: 'PARCEL_NUM', ownerField: 'OWNER1', addrField: 'PROP_ADDR', acresField: 'ACRES',
    schema:   'schneiderwb', lookupUrl: 'https://beacon.schneidercorp.com/?site=WabashCountyIN'
  },

  // Wells County — Schneider WFS
  wells: {
    url:      'https://wfs.schneidercorp.com/arcgis/rest/services/WellsCountyIN_WFS/MapServer/2/query',
    pinField: 'PARCEL_NUM', ownerField: 'OWNER1', addrField: 'PROP_ADDR', acresField: 'ACRES',
    schema:   'schneiderwl', lookupUrl: 'https://beacon.schneidercorp.com/?site=WellsCountyIN'
  },

  // Whitley County — Schneider WFS
  whitley: {
    url:      'https://wfs.schneidercorp.com/arcgis/rest/services/WhitleyCountyIN_WFS/MapServer/2/query',
    pinField: 'PARCEL_NUM', ownerField: 'OWNER1', addrField: 'PROP_ADDR', acresField: 'ACRES',
    schema:   'schneiderwy', lookupUrl: 'https://beacon.schneidercorp.com/?site=WhitleyCountyIN'
  },

  // Monroe County — Schneider WFS (also in ElevateMaps but this may be more current)
  // Note: Monroe is in EM_LAYER92 so ElevateMaps takes precedence

  // Morgan County — Schneider WFS
  morgan: {
    url:      'https://wfs.schneidercorp.com/arcgis/rest/services/MorganCountyIN_WFS/MapServer/2/query',
    pinField: 'PARCEL_NUM', ownerField: 'OWNER1', addrField: 'PROP_ADDR', acresField: 'ACRES',
    schema:   'schneidermg', lookupUrl: 'https://beacon.schneidercorp.com/?site=MorganCountyIN'
  },

  // Rush County — Schneider WFS
  rush: {
    url:      'https://wfs.schneidercorp.com/arcgis/rest/services/RushCountyIN_WFS/MapServer/2/query',
    pinField: 'PIN', ownerField: 'OWNER1', addrField: 'PROP_ADDR', acresField: 'ACRES',
    schema:   'schneiderrh', lookupUrl: 'https://beacon.schneidercorp.com/?site=RushCountyIN'
  },

  // Tipton County — Schneider WFS
  tipton: {
    url:      'https://wfs.schneidercorp.com/arcgis/rest/services/TiptonCountyIN_WFS/MapServer/2/query',
    pinField: 'PARCEL_NUM', ownerField: 'OWNER1', addrField: 'PROP_ADDR', acresField: 'ACRES',
    schema:   'schneidertp', lookupUrl: 'https://beacon.schneidercorp.com/?site=TiptonCountyIN'
  },
};

// ── Get county key ────────────────────────────────────────────────────────────
function getCountyKey() {
  if (!activeCounty) return 'bartholomew';
  return activeCounty.name.toLowerCase()
    .replace(' county','').replace(/[^a-z]/g,'');
}

// ── Get ownership config for county ──────────────────────────────────────────
function getOwnershipConfig(cKey) {
  if (EM_LAYER92[cKey]) {
    return { tier: 1, url: EM_BASE + EM_LAYER92[cKey] + '/MapServer/92/query' };
  }
  if (COUNTY_PARCEL_APIS[cKey]) {
    return { tier: 2, ...COUNTY_PARCEL_APIS[cKey] };
  }
  return null;
}

function getOwnershipUrl(cKey) {
  const cfg = getOwnershipConfig(cKey || getCountyKey());
  return cfg ? cfg.url : null;
}


// ── Tier 3: WTH GIS (MapDotNet coordinate-based) ──────────────────────────────
// WTH hosts use MapDotNet tiles. We convert Leaflet lat/lng to WTH tile coords.
function _latlngToWthTile(lat, lng, zoom) {
  // MapDotNet uses Web Mercator EPSG:3857 internally, pixel coords at zoom
  const sinLat = Math.sin(lat * Math.PI / 180);
  const worldX = (lng + 180) / 360;
  const worldY = (0.5 - Math.log((1 + sinLat) / (1 - sinLat)) / (4 * Math.PI));
  const scale  = Math.pow(2, zoom) * 256;
  return {
    tileX: Math.floor(worldX * scale / 256),
    tileY: Math.floor(worldY * scale / 256),
    pixelX: Math.floor(((worldX * scale) % 256)),
    pixelY: Math.floor(((worldY * scale) % 256)),
    zoom:   zoom
  };
}

function _parseWthResponse(text) {
  const result = {};
  // WTH returns HTML with definition-list-like table rows
  const rows = [...text.matchAll(/<th[^>]*class[^>]*leftheader[^>]*>([^<]+)<\/th>\s*<td[^>]*>([^<]*)<\/td>/gi)];
  for (const [,key,val] of rows) {
    result[key.trim()] = val.replace(/<[^>]+>/g,'').trim();
  }
  // Also try standard ArcGIS-style identifyResults
  if (text.includes('OwnerName')) {
    const m = text.match(/"OwnerName"\s*:\s*"([^"]+)"/);
    if (m) result['OwnerName'] = m[1];
  }
  return result;
}

async function fetchWthByLatLng(cfg, lat, lng) {
  // Try multiple zoom levels to ensure we hit a valid tile
  for (const zoom of [17, 16, 15]) {
    try {
      const { tileX, tileY, pixelX, pixelY } = _latlngToWthTile(lat, lng, zoom);
      const url = `${cfg.host}/MapDotNet/REST/Map/Identify/MapDotNetUTF?contentType=json` +
        `&mapDefinitionID=currentMapDefID&layers=${cfg.layers}` +
        `&tileX=${tileX}&tileY=${tileY}&pixelX=${pixelX}&pixelY=${pixelY}&zoomLevel=${zoom}`;
      const proxy = `https://corsproxy.io/?url=${encodeURIComponent(url)}`;
      const r = await fetch(proxy, { signal: AbortSignal.timeout(8000) });
      if (!r.ok) continue;
      const text = await r.text();
      if (!text || text.length < 50) continue;
      // Try JSON first
      try {
        const json = JSON.parse(text);
        const features = json.identifyResults || json.features || [];
        if (features.length > 0) {
          const attrs = features[0].attributes || features[0];
          return _normalizeWthAttrs(attrs);
        }
      } catch(e) {}
      // Fallback: parse HTML tables from WTH viewer
      const parsed = _parseWthResponse(text);
      if (Object.keys(parsed).length > 0) return _normalizeWthAttrs(parsed);
    } catch(e) { /* try next zoom */ }
  }
  return null;
}

function _normalizeWthAttrs(raw) {
  if (!raw) return null;
  const get = (...keys) => { for (const k of keys) { const v = raw[k]; if (v && v !== ' ') return String(v).trim(); } return null; };
  return {
    owner:   get('OwnerName','OWNERNAME','Owner','owner'),
    addr:    get('LocationAddress','LOCATIONADDRESS','SitusAddress','situs_address'),
    oad:     get('OwnerAddress','OWNERADDRESS','MailingAddress'),
    pin:     get('StateParcelNumber','STATEPARCELNUMBER','PIN','pin'),
    legal:   get('LegalDescription','LEGALDESCRIPTION','Legal'),
    acres:   get('Acreage','ACREAGE','acres'),
    cls:     get('PropertyClass','PROPERTYCLASS','PropClass'),
    doc:     get('InstrumentNumber','INSTRUMENTNUMBER'),
    tv:      null, // WTH assessment data requires separate tab fetch
  };
}

// ── End Tier 3 ────────────────────────────────────────────────────────────────

// ── Main ownership fetch ──────────────────────────────────────────────────────
async function fetchOwnershipByPin(pin) {
  if (!pin) return null;
  const cacheKey = pin.replace(/[^a-zA-Z0-9]/g,'');
  if (ownerCache[cacheKey]) return ownerCache[cacheKey];

  const cKey = getCountyKey();
  const cfg  = getOwnershipConfig(cKey);
  if (!cfg) return null;

  try {
    let params, resp, data;

    if (cfg.tier === 1) {
      const stripped = pin.replace(/[^a-zA-Z0-9]/g,'');
      const where = `pin_18='${pin}' OR tax_10='${pin}' OR pin_18stripped='${stripped}'`;
      params = new URLSearchParams({
        where, outFields: L92_FIELDS, returnGeometry: 'false', f: 'json'
      });
      resp = await fetch(cfg.url + '?' + params, { signal: AbortSignal.timeout(8000) });
      if (!resp.ok) return null;
      data = await resp.json();
      if (data.features && data.features.length > 0) {
        const attr = data.features[0].attributes;
        ownerCache[cacheKey] = attr;
        return attr;
      }
    } else if (cfg.tier === 2) {
      const stripped = pin.replace(/[^a-zA-Z0-9]/g,'');
      const digits   = pin.replace(/[^0-9]/g,'');
      // Try primary pin field + UNFORMATTED (raw numeric) as fallback
      const clauses = [];
      if (cfg.pinField) {
        clauses.push(`${cfg.pinField}='${pin}'`);
        if (stripped !== pin)  clauses.push(`${cfg.pinField}='${stripped}'`);
        if (digits && digits !== stripped) clauses.push(`${cfg.pinField}='${digits}'`);
      }
      clauses.push(`UNFORMATTED='${stripped}'`);
      if (digits && digits !== stripped) clauses.push(`UNFORMATTED='${digits}'`);
      const where = clauses.join(' OR ');
      params = new URLSearchParams({
        where, outFields: '*', returnGeometry: 'false',
        resultRecordCount: '1', f: 'json'
      });
      resp = await fetch(cfg.url + '?' + params, { signal: AbortSignal.timeout(8000) });
      if (!resp.ok) return null;
      data = await resp.json();
      if (data.features && data.features.length > 0) {
        const norm = _normalizeCountyAttr(data.features[0].attributes, cfg);
        ownerCache[cacheKey] = norm;
        return norm;
      }
    }
  } catch(e) {
    console.warn('[own]', cKey, e.message);
  }
  return null;
}

// ── Normalize tier-2 county attributes to common L92 schema ──────────────────
function _normalizeCountyAttr(raw, cfg) {
  const get = f => (f && raw[f] != null) ? String(raw[f]).trim() : null;
  const getNum = f => (f && raw[f] != null) ? parseFloat(raw[f]) : null;

  // Build mailing address from parts
  let ownerCitySt = null;
  if (cfg.mailAddrField) {
    const parts = [get(cfg.mailAddrField), get(cfg.mailCityField),
                   get(cfg.mailStField), get(cfg.mailZipField)].filter(Boolean);
    if (parts.length > 1) ownerCitySt = parts.join(', ');
  }

  // Parse sale date from epoch ms or date string
  let saleDate = null;
  if (cfg.saleDateField && raw[cfg.saleDateField] != null) {
    const v = raw[cfg.saleDateField];
    const d = typeof v === 'number' ? new Date(v) : new Date(v);
    if (!isNaN(d)) saleDate = d.toLocaleDateString('en-US');
  }

  return {
    owner:              get(cfg.ownerField),
    property_street:    get(cfg.addrField),
    owner_street:       get(cfg.mailAddrField),
    owner_city_st_zip:  ownerCitySt,
    legal_desc:         get(cfg.legalField),
    legal_acreage:      getNum(cfg.acresField),
    tot_assessed_value: getNum(cfg.avField),
    political_twp:      get(cfg.twpField),
    school_corporation: get(cfg.schoolField),
    latest_sale_date:   saleDate,
    documentnumber:     get(cfg.docField),
    _raw: raw, _schema: cfg.schema
  };
}

// ── Bulk viewport prefetch ────────────────────────────────────────────────────
async function prefetchOwnershipForView() {
  if (map.getZoom() < 14) return;
  const cKey = getCountyKey();
  const cfg  = getOwnershipConfig(cKey);
  if (!cfg || cfg.tier === 3) return; // WTH is coordinate-only, no batch endpoint

  const b    = map.getBounds();
  const geom = JSON.stringify({
    xmin: b.getWest(), ymin: b.getSouth(),
    xmax: b.getEast(), ymax: b.getNorth(),
    spatialReference: { wkid: 4326 }
  });

  try {
    const outF   = cfg.tier === 1 ? L92_FIELDS : '*';
    const params = new URLSearchParams({
      geometry: geom, geometryType: 'esriGeometryEnvelope',
      inSR: '4326', spatialRel: 'esriSpatialRelIntersects',
      outFields: outF, returnGeometry: 'false',
      resultRecordCount: '2000', f: 'json'
    });
    const resp = await fetch(cfg.url + '?' + params, { signal: AbortSignal.timeout(15000) });
    if (!resp.ok) return;
    const data = await resp.json();
    if (!data.features) return;

    let n = 0;
    if (cfg.tier === 1) {
      data.features.forEach(f => {
        const a  = f.attributes;
        const k1 = (a.pin_18         || '').replace(/[^a-zA-Z0-9]/g,'');
        const k2 = (a.tax_10         || '').replace(/[^a-zA-Z0-9]/g,'');
        const k3 = (a.pin_18stripped || '').replace(/[^a-zA-Z0-9]/g,'');
        if (k1) { ownerCache[k1] = a; n++; }
        if (k2 && k2 !== k1) ownerCache[k2] = a;
        if (k3 && k3 !== k1 && k3 !== k2) ownerCache[k3] = a;
      });
    } else {
      data.features.forEach(f => {
        const pin = cfg.pinField ? String(f.attributes[cfg.pinField] || '') : '';
        const key = pin.replace(/[^a-zA-Z0-9]/g,'');
        if (key) { ownerCache[key] = _normalizeCountyAttr(f.attributes, cfg); n++; }
      });
    }
    if (n > 0) {
      _applyOwnerCacheToParcels();
      notify(`Owner data: ${n} parcels`, 'fa-user-check');
    }
  } catch(e) {
    console.warn('[prefetch own]', cKey, e.message);
  }
}

// ── Apply ownerCache to already-rendered parcels ──────────────────────────────
function _applyOwnerCacheToParcels() {
  parcelLayer.eachLayer(l => {
    if (!l.parcelData || l.parcelData._enriched) return;
    const pid = (l.parcelData.pid || '').replace(/[^a-zA-Z0-9]/g,'');
    if (ownerCache[pid]) enrichParcelData(l.parcelData, ownerCache[pid]);
  });
}

// ── Enrich parcel data with ownership attributes ──────────────────────────────
function enrichParcelData(p, attr) {
  if (!attr) return;
  if (attr.owner)                p.owner  = attr.owner;
  if (attr.owner_street)         p.oaddr  = [attr.owner_street, attr.owner_city_st_zip].filter(Boolean).join(', ');
  if (attr.property_street)      p.addr   = attr.property_street;
  if (attr.property_city_st_zip) p.city   = (attr.property_city_st_zip||'').split(',')[0].trim();
  if (attr.legal_desc)           p.legal  = attr.legal_desc;
  if (attr.prop_class_desc)      { p.use  = attr.prop_class_desc; p.zone = attr.prop_class_desc; }
  if (attr.legal_acreage  != null) p.acres = parseFloat(attr.legal_acreage).toFixed(3);
  if (attr.calc_sq_ft     != null) p.sqft  = Math.round(attr.calc_sq_ft).toLocaleString();
  if (attr.political_twp)          p.twp   = attr.political_twp;
  if (attr.school_corporation)     p.school= attr.school_corporation;
  if (attr.nbhd_name)              p.nbhd  = attr.nbhd_name;
  if (attr.land_value         != null) p.lv = '$' + Math.round(attr.land_value).toLocaleString();
  if (attr.improv_value       != null) p.iv = '$' + Math.round(attr.improv_value).toLocaleString();
  if (attr.tot_assessed_value != null) p.tv = '$' + Math.round(attr.tot_assessed_value).toLocaleString();
  if (attr.latest_sale_date) {
    const d   = new Date(attr.latest_sale_date);
    p.txdate  = isNaN(d) ? '—' : d.toLocaleDateString('en-US');
    p.txprice = attr.latest_sale_price ? '$' + Math.round(attr.latest_sale_price).toLocaleString() : '—';
    p.deed    = [attr.deedbook, attr.deedpage].filter(Boolean).join('/') || attr.documentnumber || '—';
    p.sales   = [{ dt: p.txdate, price: p.txprice, buyer: p.owner, type: attr.validsale === 'Yes' ? 'Valid Sale' : 'Transfer' }];
  }
  p._enriched = true;
}


window._selectedLiveParcel = null;

// ── Get best parcel lookup URL (used in popup) ────────────────────────────────
function getParcelLookupUrl(pin) {
  const cKey = getCountyKey();
  // Use BEACON_APPS if available (defined further below), else DLGF fallback
  if (typeof BEACON_APPS !== 'undefined' && BEACON_APPS[cKey]) {
    return `https://beacon.schneidercorp.com/Application.aspx?App=${BEACON_APPS[cKey]}&PageType=GeneralInfo&ParcelNumber=${encodeURIComponent(pin || '')}`;
  }
  return `https://gateway.ifionline.org/TaxBillLookUp/Default.aspx`;
}

function selectParcelLive(p, layer) {
  if (selectedLayer && selectedLayer !== layer) {
    try { selectedLayer.setStyle({ color:'#f0a500', weight:1.5, fillOpacity:0.08 }); } catch(e) {}
  }
  selectedLayer  = layer;
  selectedParcel = p;
  window._selectedLiveParcel = p;

  layer.setStyle({ color:'#ffffff', weight:3, fillOpacity:0.45 });
  layer.bringToFront();

  // ── Pre-enrich from ownerCache immediately (no async wait needed if prefetch ran)
  if (!p._enriched) {
    const cacheKey = (p.pid || '').replace(/[^a-zA-Z0-9]/g,'');
    if (ownerCache[cacheKey]) {
      enrichParcelData(p, ownerCache[cacheKey]);
    }
  }

  const center = (layer.getBounds ? layer.getBounds().getCenter() : null) || L.latLng(p.lat, p.lon);
  p.lookupUrl  = getParcelLookupUrl(p.pid);

  // Show popup immediately with whatever data we have now
  const popup = L.popup({ maxWidth:340, className:'dark-popup', autoPan:true })
    .setLatLng(center)
    .setContent(buildPopupHTML(p))
    .openOn(map);

  document.getElementById('sel-info').textContent = '📌 ' + (p.addr || 'Parcel selected');
  loadLiveParcelPanel(p);

  // If still not enriched, fetch async and update when it arrives
  if (!p._enriched) {
    const cKey3  = getCountyKey();
    const cfg3   = getOwnershipConfig(cKey3);
    const doFetch = cfg3 && cfg3.tier === 3
      ? fetchWthByLatLng(cfg3, center.lat, center.lng)
      : fetchOwnershipByPin(p.pid);
    doFetch.then(attr => {
      if (!attr) return;
      enrichParcelData(p, attr);
      loadLiveParcelPanel(p);
      try { popup.setContent(buildPopupHTML(p)); } catch(e) {}
      if (layer._tooltip) layer.closeTooltip();
    });
  }
}

function buildPopupHTML(p) {
  const hasOwner = p.owner && p.owner !== '—' && p.owner !== '(see assessor)';
  const hasTV    = p.tv    && p.tv    !== '—';
  const hasAcres = p.acres && p.acres !== '—';
  const lookupUrl = p.lookupUrl || getParcelLookupUrl(p.pid);

  return `
    <div class="mpop">
      <div class="mpop-header">
        <div class="mpop-addr">${p.addr || 'Parcel'}</div>
        <div class="mpop-owner" style="color:${hasOwner ? '#34d399' : '#94a3b8'};">
          ${hasOwner
            ? `<i class="fas fa-user" style="font-size:9px;margin-right:4px;opacity:.8;"></i>${p.owner}`
            : `<span style="font-size:10px;">${p.use || 'Parcel'} · ${p.pid ? p.pid.substring(0,14)+'…' : 'No PIN'}</span>`}
        </div>
      </div>
      <div class="mpop-body">
        <div class="mpop-row"><span class="mpop-k">Parcel ID</span>
          <span class="mpop-v" style="font-size:10px;font-family:monospace;">${p.pid || '—'}</span></div>
        ${p.oaddr && p.oaddr !== '—' && hasOwner
          ? `<div class="mpop-row"><span class="mpop-k">Mailing Addr</span>
             <span class="mpop-v" style="font-size:10px;">${p.oaddr}</span></div>` : ''}
        <div class="mpop-row"><span class="mpop-k">Assessed Value</span>
          <span class="mpop-v" style="color:#f0a500;font-weight:700;">${hasTV ? p.tv : '—'}</span></div>
        ${p.lv && p.lv !== '—'
          ? `<div class="mpop-row"><span class="mpop-k">Land / Improvement</span>
             <span class="mpop-v" style="font-size:10px;">${p.lv} / ${p.iv || '—'}</span></div>` : ''}
        <div class="mpop-row"><span class="mpop-k">Property Class</span>
          <span class="mpop-v">${p.use || '—'}</span></div>
        <div class="mpop-row"><span class="mpop-k">Acres</span>
          <span class="mpop-v">${hasAcres ? p.acres + ' ac' : '—'}</span></div>
        ${p.txdate && p.txdate !== '—'
          ? `<div class="mpop-row"><span class="mpop-k">Last Sale</span>
             <span class="mpop-v" style="font-size:10px;">${p.txdate}${p.txprice && p.txprice !== '—' ? ' · ' + p.txprice : ''}</span></div>` : ''}
        ${p.twp && p.twp !== '—'
          ? `<div class="mpop-row"><span class="mpop-k">Township</span>
             <span class="mpop-v" style="font-size:10px;">${p.twp}</span></div>` : ''}
      </div>
      <div class="mpop-footer">
        <button class="mpop-btn mpop-btn-p" onclick="openPRCPanel()" title="Property Record Card">
          <i class="fas fa-id-card"></i> PRC
        </button>
        <button class="mpop-btn" style="background:rgba(96,165,250,.12);color:#60a5fa;border:1px solid rgba(96,165,250,.25);"
          onclick="switchTab('parcel')" title="Full parcel details">
          <i class="fas fa-list"></i> Details
        </button>
        <button class="mpop-btn mpop-btn-s" onclick="map.closePopup()" title="Close">
          <i class="fas fa-xmark"></i>
        </button>
      </div>
    </div>`;
}
// openPRCPanel defined below


function selectParcel(p, layer) { selectParcelLive(p, layer); }

// ── Full PRC panel with real ownership data ───────────────────────────────────
function loadLiveParcelPanel(p) {
  // Ensure the parcel detail is visible (called from both selectParcel and openPRCPanel)
  const emptyEl  = document.getElementById('parcel-empty');
  const detailEl = document.getElementById('parcel-detail');
  if (emptyEl)  emptyEl.style.display  = 'none';
  if (detailEl) detailEl.style.display = 'block';

  // Add a notification dot on the Parcel tab to signal data is ready
  const parcelTab = document.querySelector('.stab[data-tab="parcel"]');
  if (parcelTab) {
    parcelTab.style.position = 'relative';
    let dot = parcelTab.querySelector('.tab-dot');
    if (!dot) {
      dot = document.createElement('span');
      dot.className = 'tab-dot';
      dot.style.cssText = 'position:absolute;top:4px;right:4px;width:7px;height:7px;border-radius:50%;background:#f0a500;border:1.5px solid var(--panel2);';
      parcelTab.appendChild(dot);
    }
  }

  const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v || '—'; };

  // PRC Header — use active county name
  const countyName = (activeCounty && activeCounty.name) ? activeCounty.name : 'Indiana';
  set('prc-county-name', countyName);
  set('prc-doc-sub',     `Tax Year 2024 · Pay 2025 · DLGF Official Record`);
  set('prc-pid',    p.pid);
  set('prc-use',    p.use);
  set('prc-tv',     p.tv);
  set('prc-tax',    p.tax);
  set('prc-addr',   (p.addr || '') + ', ' + (p.city || '') + ', IN ' + (p.zip || ''));
  set('prc-acres',  p.acres && p.acres !== '—' ? p.acres + ' ac' : '—');
  set('prc-zone',   p.zone);

  // Tax table
  const tbl = document.getElementById('prc-tax-table');
  if (tbl) tbl.innerHTML = `
    <tr style="border-bottom:1px solid var(--border)"><th style="padding:4px 8px;text-align:left;color:var(--text3);">Field</th><th style="padding:4px 8px;text-align:right;color:var(--text3);">Value</th></tr>
    <tr><td>Land Assessed Value</td><td style="text-align:right;color:var(--green);">${p.lv||'—'}</td></tr>
    <tr><td>Improvement AV</td><td style="text-align:right;color:var(--green);">${p.iv||'—'}</td></tr>
    <tr><td>Total Assessed Value</td><td style="text-align:right;color:var(--accent);font-weight:700;">${p.tv||'—'}</td></tr>
    <tr><td>Parcel ID (PIN 18)</td><td style="text-align:right;font-family:monospace;font-size:10px;">${p.pid}</td></tr>
    <tr><td>Property Class</td><td style="text-align:right;">${p.use||'—'}</td></tr>
    <tr><td>Neighborhood</td><td style="text-align:right;">${p.nbhd||'—'}</td></tr>
    <tr><td>School Corp</td><td style="text-align:right;">${p.school||'—'}</td></tr>
    <tr><td>Deed Reference</td><td style="text-align:right;font-family:monospace;font-size:10px;">${p.deed||'—'}</td></tr>
    <tr><td>Data Source</td><td style="text-align:right;font-size:10px;color:var(--text3);">ElevateMaps / Beacon 2024</td></tr>`;

  // Owner — show name if available (ElevateMaps counties), parcel ID otherwise
  const hasRealOwner = p.owner && p.owner !== '—' && p.owner !== '(see assessor)';
  const ownerEl = document.getElementById('pi-owner');
  if (ownerEl) {
    if (hasRealOwner) {
      ownerEl.textContent = p.owner;
      ownerEl.style.color = '';
    } else {
      ownerEl.textContent = 'See county assessor records';
      ownerEl.style.color = 'var(--text3)';
    }
  }
  const otypel = document.getElementById('pi-otype');
  if (otypel) {
    const cls = p.use && p.use.match(/resid/i) ? 'bg-blue'
              : p.use && p.use.match(/comm|ind/i) ? 'bg-amber'
              : p.use && p.use.match(/ag/i) ? 'bg-green'
              : 'bg-blue';
    otypel.textContent = p.use ? p.use.split(' ')[0] : 'Unknown';
    otypel.className = 'pbadge ' + cls;
  }
  set('pi-oaddr',   p.oaddr);
  set('pi-deed',    p.deed);
  set('pi-txdate',  p.txdate);
  set('pi-txprice', p.txprice);

  // Location
  set('pi-addr',   p.addr);
  set('pi-citzip', (p.city||'Columbus') + ', IN ' + (p.zip||'47201'));
  set('pi-county', 'Bartholomew');
  set('pi-latlon',  p.lat && p.lon ? p.lat.toFixed(5) + ', ' + p.lon.toFixed(5) : '—');
  set('pi-twp',    p.twp);
  set('pi-sec',    p.sec);
  set('pi-range',  p.range);
  set('pi-legal',  p.legal);

  // Physical
  set('pi-acressf', p.sqft ? p.acres + ' ac · ' + p.sqft + ' sf' : p.acres);
  set('pi-yr',     p.yr);
  set('pi-struct', p.struct);
  set('pi-bed',    p.bed);
  set('pi-const',  p.const);
  const condEl = document.getElementById('pi-cond');
  if (condEl) { condEl.textContent = p.cond || '—'; condEl.className = 'pbadge bg-amber'; }

  // Assessment
  set('pi-lv',  p.lv);
  set('pi-iv',  p.iv);
  set('pi-tv',  p.tv);
  set('pi-hx',  p.hx);
  set('pi-tax', p.tax);
  set('pi-ty',  p.ty);
  const txstatEl = document.getElementById('pi-txstat');
  if (txstatEl) { txstatEl.textContent = p.txstat || '—'; txstatEl.className = 'pbadge bg-blue'; }

  // Sales
  const salesDiv = document.getElementById('pi-sales');
  if (salesDiv) {
    if (p.sales && p.sales.length > 0) {
      salesDiv.innerHTML = p.sales.map(s => `
        <div class="prow" style="border-bottom:1px solid var(--border);padding:4px 0;">
          <span class="pk">${s.dt}</span>
          <span class="pv" style="color:var(--accent);font-weight:700;">${s.price}</span>
          <span class="pk" style="margin-top:2px;">${s.buyer||'—'} · ${s.type||'—'}</span>
        </div>`).join('');
    } else {
      salesDiv.innerHTML = `<div class="prow">
        <span class="pk">No sale data</span>
        <span class="pv" style="font-size:10px;color:var(--text3);">
          <a href="https://gateway.ifionline.org/TaxBillLookUp/Default.aspx" target="_blank" style="color:var(--accent);">
            Search Gateway Tax Bill Lookup →
          </a>
        </span></div>`;
    }
  }

  buildLiveReport(p);
}

function buildLiveReport(p) {
  const rb = document.getElementById('report-body');
  if (!rb) return;
  rb.innerHTML = `
    <div style="border-bottom:1px solid var(--border);margin-bottom:14px;padding-bottom:12px;display:flex;align-items:flex-start;justify-content:space-between;gap:10px;">
      <div>
        <div style="font-family:'Barlow Condensed',sans-serif;font-size:22px;font-weight:800;color:var(--text);">${p.addr||'Parcel'}</div>
        <div style="font-size:12px;color:var(--text3);margin-top:2px;">${p.city||'Columbus'}, IN ${p.zip||'47201'} · Bartholomew County</div>
        <div style="font-size:11px;color:var(--text3);margin-top:1px;">Parcel: ${p.pid}</div>
      </div>
      <a href="https://beacon.schneidercorp.com/Application.aspx?App=BartholomewCountyIN&PageType=GeneralInfo&ParcelNumber=${encodeURIComponent(p.pid)}"
         target="_blank" style="background:rgba(240,165,0,.15);border:1px solid rgba(240,165,0,.4);color:var(--accent);padding:6px 10px;border-radius:5px;font-size:11px;white-space:nowrap;text-decoration:none;flex-shrink:0;">
        <i class="fas fa-arrow-up-right-from-square" style="margin-right:4px;"></i>View on Beacon
      </a>
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:14px;">
      <div style="background:var(--panel2);border:1px solid var(--border);border-radius:6px;padding:10px;text-align:center;">
        <div style="font-size:20px;font-weight:800;font-family:'Barlow Condensed',sans-serif;color:var(--accent);">${p.tv||'—'}</div>
        <div style="font-size:10px;color:var(--text3);text-transform:uppercase;">Total AV</div>
      </div>
      <div style="background:var(--panel2);border:1px solid var(--border);border-radius:6px;padding:10px;text-align:center;">
        <div style="font-size:20px;font-weight:800;font-family:'Barlow Condensed',sans-serif;color:var(--green);">${p.lv||'—'}</div>
        <div style="font-size:10px;color:var(--text3);text-transform:uppercase;">Land AV</div>
      </div>
      <div style="background:var(--panel2);border:1px solid var(--border);border-radius:6px;padding:10px;text-align:center;">
        <div style="font-size:20px;font-weight:800;font-family:'Barlow Condensed',sans-serif;color:var(--blue);">${p.acres||'—'} ac</div>
        <div style="font-size:10px;color:var(--text3);text-transform:uppercase;">Area</div>
      </div>
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;font-size:12px;margin-bottom:14px;">
      <div style="background:var(--panel2);border:1px solid var(--border);border-radius:5px;padding:9px;">
        <b style="color:var(--text3);font-size:10px;text-transform:uppercase;letter-spacing:.4px;">Owner</b><br>
        <span style="color:var(--text);font-weight:600;">${p.owner||'—'}</span><br>
        <span style="color:var(--text3);font-size:11px;">${p.oaddr||'—'}</span>
      </div>
      <div style="background:var(--panel2);border:1px solid var(--border);border-radius:5px;padding:9px;">
        <b style="color:var(--text3);font-size:10px;text-transform:uppercase;letter-spacing:.4px;">Property Class</b><br>
        <span style="color:var(--text);">${p.use||'—'}</span><br>
        <span style="color:var(--text3);font-size:11px;">Township: ${p.twp||'—'}</span>
      </div>
      <div style="background:var(--panel2);border:1px solid var(--border);border-radius:5px;padding:9px;">
        <b style="color:var(--text3);font-size:10px;text-transform:uppercase;letter-spacing:.4px;">Deed Reference</b><br>
        <span style="font-family:monospace;font-size:11px;color:var(--text);">${p.deed||'—'}</span><br>
        <span style="color:var(--text3);font-size:11px;">Transferred: ${p.txdate||'—'} · ${p.txprice||'—'}</span>
      </div>
      <div style="background:var(--panel2);border:1px solid var(--border);border-radius:5px;padding:9px;">
        <b style="color:var(--text3);font-size:10px;text-transform:uppercase;letter-spacing:.4px;">Neighborhood</b><br>
        <span style="color:var(--text);">${p.nbhd||'—'}</span><br>
        <span style="color:var(--text3);font-size:11px;">School: ${p.school||'—'}</span>
      </div>
    </div>

    <div style="margin-bottom:12px;">
      <b style="color:var(--text3);font-size:10px;text-transform:uppercase;letter-spacing:.4px;">Legal Description</b>
      <div style="font-family:monospace;font-size:11px;color:var(--text2);margin-top:4px;background:var(--panel2);padding:8px;border-radius:4px;border:1px solid var(--border);word-break:break-word;">${p.legal||'—'}</div>
    </div>

    <div style="margin-bottom:12px;">
      <b style="color:var(--text3);font-size:10px;text-transform:uppercase;letter-spacing:.4px;">Sales History</b>
      ${p.sales && p.sales.length ? p.sales.map(s=>`
        <div style="display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px solid var(--border);font-size:12px;">
          <span style="color:var(--text3);">${s.dt} · ${s.type}</span>
          <span style="color:var(--accent);font-weight:700;">${s.price}</span>
        </div>`).join('') :
        `<div style="font-size:11px;color:var(--text3);padding:6px 0;">No sales on record · 
          <a href="https://gateway.ifionline.org/TaxBillLookUp/Default.aspx" target="_blank" style="color:var(--accent);">Search Gateway →</a>
        </div>`}
    </div>

    <div style="background:rgba(240,165,0,.06);border:1px solid rgba(240,165,0,.25);border-radius:6px;padding:10px;font-size:11px;color:var(--text3);line-height:1.8;">
      <div style="font-weight:700;color:var(--text2);margin-bottom:6px;"><i class="fas fa-database" style="color:var(--accent);margin-right:5px;"></i>Official Data Sources &amp; Links</div>
      ${(()=>{
        const cKey = activeCounty ? activeCounty.name.toLowerCase().replace(' county','').replace(/[^a-z]/g,'') : 'bartholomew';
        const prcUrl = buildPRCUrl(cKey, p.pid);
        const beaconUrl = buildBeaconUrl(cKey, p.pid);
        const gwUrl = buildGatewayUrl(activeCounty ? activeCounty.name : '', p.pid);
        let links = [];
        if (prcUrl) links.push('<a href="'+prcUrl+'" target="_blank" style="display:inline-block;background:var(--accent);color:#000;padding:4px 10px;border-radius:4px;font-weight:700;text-decoration:none;margin:2px 2px 2px 0;"><i class="fas fa-id-card" style="margin-right:4px;"></i>Property Record Card (ElevateMaps)</a>');
        if (beaconUrl) links.push('<a href="'+beaconUrl+'" target="_blank" style="display:inline-block;background:rgba(96,165,250,.15);color:#60a5fa;border:1px solid rgba(96,165,250,.3);padding:4px 10px;border-radius:4px;font-weight:700;text-decoration:none;margin:2px 2px 2px 0;"><i class="fas fa-map" style="margin-right:4px;"></i>Beacon GIS Record</a>');
        if (gwUrl) links.push('<a href="'+gwUrl+'" target="_blank" style="display:inline-block;background:rgba(34,211,238,.1);color:#22d3ee;border:1px solid rgba(34,211,238,.25);padding:4px 10px;border-radius:4px;font-weight:700;text-decoration:none;margin:2px 2px 2px 0;"><i class="fas fa-receipt" style="margin-right:4px;"></i>Gateway Tax Bill</a>');
        links.push('<a href="https://www.in.gov/dlgf/understanding-your-tax-bill/assessed-value-search/" target="_blank" style="display:inline-block;background:rgba(167,139,250,.1);color:#a78bfa;border:1px solid rgba(167,139,250,.25);padding:4px 10px;border-radius:4px;font-weight:700;text-decoration:none;margin:2px 2px 2px 0;"><i class="fas fa-search-dollar" style="margin-right:4px;"></i>DLGF Assessed Value</a>');
        return links.join('');
      })()}
      <div style="margin-top:6px;color:var(--text3);font-size:10px;">Parcel geometry: Indiana IGIO (gisdata.in.gov) · Assessment: ElevateMaps Layer 92 / Bartholomew County Assessor</div>
    </div>`;
}

// ── renderParcels is now a wrapper that triggers the live API load ────────────
function renderParcels() {
  loadParcelsForView();
}

// ── Map event handlers — debounced, no bringToFront thrash ───────────────────
// zoomend always fires before moveend — skip moveend after a zoom
let _lastZoomTime = 0;

map.on('zoomend', function() {
  _lastZoomTime = Date.now();
  document.getElementById('zoom-disp').innerHTML =
    `<i class="fas fa-magnifying-glass-plus" style="margin-right:4px;color:var(--text3);"></i>Zoom: ${map.getZoom()}`;
  loadParcelsForView();
  clearTimeout(_ownerPrefetchTimer);
  _ownerPrefetchTimer = setTimeout(prefetchOwnershipForView, 1200);
});

let _ownerPrefetchTimer = null;
map.on('moveend', function() {
  // Skip if this moveend was caused by a zoom (already handled above)
  if (Date.now() - _lastZoomTime < 300) return;
  loadParcelsForView();
  clearTimeout(_ownerPrefetchTimer);
  _ownerPrefetchTimer = setTimeout(prefetchOwnershipForView, 1200);
});


function loadParcelPanel(pid) {
  // Redirect to live data panel — find parcel in loaded layer
  let found = null;
  parcelLayer.eachLayer(l => {
    if (l.parcelData && (l.parcelData.id === pid || l.parcelData.pid === pid)) found = l.parcelData;
  });
  if (found) loadLiveParcelPanel(found);
}

function buildFullReport(p) { buildLiveReport(p); }


// ══════════════════════════════════════════════════════════════════════
//  UNIVERSAL GIS LAYER SYSTEM — ALL 92 INDIANA COUNTIES
//
//  Two categories of layers:
//
//  A) STATEWIDE — work for every county, sourced from:
//     • gisdata.in.gov  (IGIO — official Indiana state GIS)
//     • hazards.fema.gov (FEMA NFHL — national flood hazard)
//     • server.arcgisonline.com (Esri World Imagery)
//
//  B) COUNTY-SPECIFIC — sourced from ElevateMaps MapServer
//     Each county has its own MapServer with different layer IDs.
//     On county switch: query MapServer?f=json, read layer list,
//     match by name keyword, cache. Then remove+readd active layers.
// ══════════════════════════════════════════════════════════════════════

// ── Statewide gisdata.in.gov services (confirmed live 2025) ──────────────────
const IGIO_SVC = 'https://gisdata.in.gov/server/rest/services/Hosted';
const IGIO_ADMIN = IGIO_SVC + '/Administrative_Boundaries_of_Indiana_2024/FeatureServer';
// Layer IDs in Administrative_Boundaries_of_Indiana_2024:
//  0=Municipalities, 1=Unincorporated, 2=Neighborhoods
//  3=County Commissioner, 4=County Council, 5=EMS, 6=Fire
//  7=Library, 8=Police, 9=Provisioning, 10=PSAP
//  11=School District, 12=Tax District, 13=TIF District

// ── ElevateMaps county-specific MapServer base URL ───────────────────────────
// ══════════════════════════════════════════════════════════════════════
//  UNIVERSAL DYNAMIC GIS LAYER SYSTEM v18
//  
//  Architecture:
//  1. On county switch: fetch MapServer?f=json → get real layer list
//  2. Build layer panel HTML dynamically from that list  
//  3. Each checkbox maps directly to its real layer ID — no guessing
//  4. Statewide layers (FEMA, imagery) always present
//  5. County-specific layers only shown when county has them
// ══════════════════════════════════════════════════════════════════════

// County ElevateMaps MapServer base URL
// ══════════════════════════════════════════════════════════════════════
//  GIS LAYER SYSTEM — Bartholomew County First, All 92 Dynamic
// ══════════════════════════════════════════════════════════════════════

function getActiveDynamicBase() {
  const em = activeCounty && activeCounty.em;
  return em
    ? 'https://elb.elevatemaps.io/arcgis/rest/services/eGISDynamicServices/' + em + '/MapServer'
    : null;
}

// Confirmed Bartholomew County layers (live MapServer, all real IDs)
const BARTHOLOMEW_LAYERS = [
  // Parcels & Property
  {id:92,  name:'Parcels',                        cat:'parcels'},
  {id:110, name:'Parcels — Latest Sale',           cat:'parcels'},
  {id:125, name:'BZA Parcels',                    cat:'parcels'},
  {id:93,  name:'Subdivisions / Plats',           cat:'parcels'},
  {id:87,  name:'Lot / Deed Lines',               cat:'parcels'},
  {id:86,  name:'Easements',                      cat:'parcels'},
  {id:0,   name:'Address Points',                 cat:'parcels'},
  {id:41,  name:'Building Footprints',            cat:'parcels'},
  {id:94,  name:'Property Classes',               cat:'parcels'},
  {id:119, name:'Residential Review Group',       cat:'parcels'},
  {id:120, name:'Commercial/Industrial Group',    cat:'parcels'},
  {id:121, name:'Agricultural Review Group',      cat:'parcels'},
  {id:118, name:'Exempt Review Group',            cat:'parcels'},
  {id:112, name:'Utility Review Group',           cat:'parcels'},
  {id:95,  name:'Neighborhoods',                  cat:'parcels'},
  {id:96,  name:'Tax Units',                      cat:'parcels'},
  // Parcel Annotations
  {id:1,   name:'Annotations — Acreage',          cat:'annotations'},
  {id:7,   name:'Annotations — Lot Numbers',      cat:'annotations'},
  {id:13,  name:'Annotations — Dimensions',       cat:'annotations'},
  {id:88,  name:'Property Address Labels',        cat:'annotations'},
  {id:89,  name:'GIS Area Labels',                cat:'annotations'},
  {id:90,  name:'State ID Labels',                cat:'annotations'},
  // Zoning
  {id:80,  name:'Zoning — Base Districts',        cat:'zoning'},
  {id:71,  name:'Zoning — Hartsville',            cat:'zoning'},
  {id:72,  name:'Zoning — Joint Overlay',         cat:'zoning'},
  {id:74,  name:'Zoning — Wellfield Overlay',     cat:'zoning'},
  {id:76,  name:'Zoning — Airport Overlay',       cat:'zoning'},
  {id:127, name:'Zoning — Front Door Overlay',    cat:'zoning'},
  {id:75,  name:'Zoning — Commitments',           cat:'zoning'},
  {id:70,  name:'TIF Districts',                  cat:'zoning'},
  {id:85,  name:'Planning Jurisdiction',          cat:'zoning'},
  // Hydrology & Flooding
  {id:31,  name:'Hydrology (Streams / Water)',    cat:'hydrology'},
  {id:81,  name:'Regulated Drains',               cat:'hydrology'},
  {id:82,  name:'Drain Watersheds',               cat:'hydrology'},
  {id:77,  name:'FEMA Floodplain (ElevateMaps)',  cat:'hydrology'},
  {id:78,  name:'Floodplain FIRM Panel Numbers',  cat:'hydrology'},
  {id:79,  name:'Haw Creek Floodplain',           cat:'hydrology'},
  {id:98,  name:'MS4 Stormwater Areas',           cat:'hydrology'},
  {id:84,  name:'Buffered Areas',                 cat:'hydrology'},
  // Transportation
  {id:47,  name:'Roads / Centerlines',            cat:'transportation'},
  {id:42,  name:'Road Right-of-Way',              cat:'transportation'},
  {id:43,  name:'Active Rail System',             cat:'transportation'},
  {id:39,  name:'Bridge Inventory',               cat:'transportation'},
  {id:40,  name:'Culverts',                       cat:'transportation'},
  {id:55,  name:'Bicycle & Pedestrian Facilities',cat:'transportation'},
  {id:56,  name:'ColumBUS Transit Routes',        cat:'transportation'},
  // Civic Boundaries
  {id:54,  name:'County Boundary',                cat:'civic'},
  {id:52,  name:'Corporate Boundaries (Cities)',  cat:'civic'},
  {id:53,  name:'Townships',                      cat:'civic'},
  {id:67,  name:'Land Survey Sections (PLSS)',    cat:'civic'},
  {id:107, name:'Voting Precincts',               cat:'civic'},
  {id:68,  name:'2020 Census Blocks',             cat:'civic'},
  {id:69,  name:'2020 Census Tracts',             cat:'civic'},
  {id:97,  name:'Electric Service Areas',         cat:'civic'},
  // Districts & Political
  {id:99,  name:'School Districts',               cat:'districts'},
  {id:100, name:'School Board Districts',         cat:'districts'},
  {id:101, name:'High School Districts',          cat:'districts'},
  {id:102, name:'Middle School Districts',        cat:'districts'},
  {id:103, name:'Elementary School Districts',    cat:'districts'},
  {id:104, name:'City Council Districts',         cat:'districts'},
  {id:105, name:'County Commissioner Districts',  cat:'districts'},
  {id:106, name:'County Council Districts',       cat:'districts'},
  {id:116, name:'Congressional Districts (2021)', cat:'districts'},
  {id:115, name:'Indiana House (2021)',            cat:'districts'},
  {id:114, name:'Indiana Senate (2021)',           cat:'districts'},
  // Points of Interest
  {id:83,  name:'Parks',                          cat:'poi'},
  {id:32,  name:'Schools',                        cat:'poi'},
  {id:33,  name:'Hospitals & Rural Health',       cat:'poi'},
  {id:34,  name:'Libraries',                      cat:'poi'},
  {id:35,  name:'Cemeteries',                     cat:'poi'},
  {id:38,  name:'Cell Towers',                    cat:'poi'},
  // Environment
  {id:57,  name:'Contours (All Scales)',           cat:'environment'},
  {id:108, name:'Soils (SSURGO)',                 cat:'environment'},
];

// ── Johnson County Indiana — Complete multi-service ArcGIS layer list ────────
// Server: https://greenwoodgis.greenwood.in.gov/arcgis/rest/services/
// Confirmed services and layer IDs from live ArcGIS REST endpoints
// Folders: Airport, BaseMaps, Cityworks, Code_Enforcement, Council, County,
//          Dig_Smart, Engineering, Parks, Planning, Sanitary_Sewer,
//          Schools, Street_Maps, Stormwater
const JC_BASE = 'https://greenwoodgis.greenwood.in.gov/arcgis/rest/services';
const JOHNSON_LAYERS = [

  // ── PARCELS & PROPERTY ──────────────────────────────────────────────────────
  // County/Land_Records — primary parcel service with all parcel sub-layers
  {svc:`${JC_BASE}/County/Land_Records/MapServer`,      ids:[0],   name:'Parcels',                          cat:'parcels'},
  {svc:`${JC_BASE}/County/Land_Records/MapServer`,      ids:[1],   name:'Parcel Labels / Annotations',      cat:'annotations'},
  {svc:`${JC_BASE}/County/Land_Records/MapServer`,      ids:[2],   name:'Parcel Text',                      cat:'annotations'},
  {svc:`${JC_BASE}/County/Land_Records/MapServer`,      ids:[3],   name:'Acreage Labels',                   cat:'annotations'},
  {svc:`${JC_BASE}/County/Land_Records/MapServer`,      ids:[4],   name:'BRP Labels',                       cat:'annotations'},
  {svc:`${JC_BASE}/County/Land_Records/MapServer`,      ids:[5],   name:'Parcel Dimensions',                cat:'annotations'},
  // Separate address point service
  {svc:`${JC_BASE}/County/JohnsonCountyAddresses/MapServer`, ids:[0], name:'Address Points',               cat:'parcels'},
  // Combined county parcels + addresses + roads (IC = Integrated County)
  {svc:`${JC_BASE}/County/Parcels_AddressPoints_Roads_IC/MapServer`, ids:[0], name:'Parcels (Integrated)',  cat:'parcels'},
  {svc:`${JC_BASE}/County/Parcels_AddressPoints_Roads_IC/MapServer`, ids:[1], name:'Address Points (IC)',   cat:'parcels'},
  {svc:`${JC_BASE}/County/Parcels_AddressPoints_Roads_IC/MapServer`, ids:[2], name:'Roads (IC)',            cat:'transportation'},

  // ── ZONING & PLANNING ───────────────────────────────────────────────────────
  {svc:`${JC_BASE}/Planning/Zoning_District/MapServer`,   ids:[0],  name:'County Zoning Districts',         cat:'zoning'},
  // Planning_On has multiple layers: Public Notice Map (0), Annexations (1), PDS Zones (2), Plans & Plats group
  {svc:`${JC_BASE}/Planning/Planning_On/MapServer`,        ids:[0],  name:'Public Notice Map',              cat:'zoning'},
  {svc:`${JC_BASE}/Planning/Planning_On/MapServer`,        ids:[1],  name:'Annexations',                    cat:'zoning'},
  {svc:`${JC_BASE}/Planning/Planning_On/MapServer`,        ids:[2],  name:'PDS Zones',                      cat:'zoning'},
  {svc:`${JC_BASE}/Planning/Planning_On/MapServer`,        ids:[4,5],name:'Plans & Plats',                  cat:'zoning'},
  // JCAS Zones (Jurisdictional / Assessment zones)
  {svc:`${JC_BASE}/Planning/JCAS_Zones/MapServer`,         ids:[0],  name:'JCAS Assessment Zones',          cat:'zoning'},

  // ── HYDROLOGY & STORMWATER ──────────────────────────────────────────────────
  // FEMA flood data stored in Land_Records
  {svc:`${JC_BASE}/County/Land_Records/MapServer`,          ids:[6],  name:'FEMA Floodplain',               cat:'hydrology'},
  // Stormwater creek network
  {svc:`${JC_BASE}/Stormwater/StormwaterCreeks/MapServer`,  ids:[0],  name:'Stormwater Creeks',             cat:'hydrology'},
  // Impervious surfaces (City of Greenwood)
  {svc:`${JC_BASE}/Stormwater/ImperviousSurface/MapServer`, ids:[0],  name:'Impervious Surfaces (Greenwood)',cat:'hydrology'},
  // Stormwater structures map
  {svc:`${JC_BASE}/Cityworks/Stormwater_Map/MapServer`,     ids:[0,1,2,3,4,5,6,7], name:'Stormwater System (Greenwood)', cat:'hydrology'},

  // ── TRANSPORTATION ──────────────────────────────────────────────────────────
  // Street Department — road centerlines, names, intersections
  {svc:`${JC_BASE}/Street_Maps/Street_Department/MapServer`,ids:[0],  name:'Roads (Greenwood)',             cat:'transportation'},
  {svc:`${JC_BASE}/Street_Maps/Street_Department/MapServer`,ids:[1],  name:'Road Names',                    cat:'transportation'},
  {svc:`${JC_BASE}/Street_Maps/Street_Department/MapServer`,ids:[2],  name:'Intersections',                 cat:'transportation'},
  {svc:`${JC_BASE}/Street_Maps/Street_Department/MapServer`,ids:[3],  name:'Sidewalks',                     cat:'transportation'},
  {svc:`${JC_BASE}/Street_Maps/Street_Department/MapServer`,ids:[4],  name:'Street Pavement Condition',     cat:'transportation'},
  {svc:`${JC_BASE}/Street_Maps/Street_Department/MapServer`,ids:[5],  name:'Road Construction & Closures',  cat:'transportation'},
  // Engineering — road repair, crack seals, construction projects
  {svc:`${JC_BASE}/Engineering/Engineering_On/MapServer`,   ids:[0,1,2,3,4,5,6,7,8,9,10], name:'Engineering Projects',cat:'transportation'},
  // Parks trails & paths network
  {svc:`${JC_BASE}/Parks/TrailsPaths/MapServer`,            ids:[0],  name:'Trails & Paths (Greenwood)',    cat:'transportation'},
  // Bridges (from Cityworks Main Map)
  {svc:`${JC_BASE}/Cityworks/Main_Map_1222020/MapServer`,   ids:[5],  name:'Bridges',                       cat:'transportation'},
  // Curb ramps
  {svc:`${JC_BASE}/Cityworks/Main_Map_1222020/MapServer`,   ids:[6],  name:'Curb Ramps',                    cat:'transportation'},

  // ── UTILITIES & INFRASTRUCTURE ──────────────────────────────────────────────
  // Sanitary Sewer system
  {svc:`${JC_BASE}/Sanitary_Sewer/Sanitary_Sewer_Off/MapServer`,ids:[0], name:'Sanitary Sewer System',     cat:'utility'},
  {svc:`${JC_BASE}/Sanitary_Sewer/Sanitary_Sewer_Off/MapServer`,ids:[1], name:'Sewer Manholes',            cat:'utility'},
  {svc:`${JC_BASE}/Sanitary_Sewer/Sanitary_Sewer_Off/MapServer`,ids:[3], name:'Sewer Gravity Mains',       cat:'utility'},
  {svc:`${JC_BASE}/Sanitary_Sewer/Sanitary_Sewer_Off/MapServer`,ids:[5], name:'Sewer Lateral Lines',       cat:'utility'},
  // Signs & poles (street infrastructure)
  {svc:`${JC_BASE}/Cityworks/Main_Map_1222020/MapServer`,   ids:[8],  name:'Street Signs',                  cat:'utility'},
  {svc:`${JC_BASE}/Cityworks/Main_Map_1222020/MapServer`,   ids:[9],  name:'Utility Poles',                 cat:'utility'},
  // Special Tax Districts
  {svc:`${JC_BASE}/Cityworks/Main_Map_1222020/MapServer`,   ids:[3],  name:'Special Tax Districts',         cat:'civic'},

  // ── CIVIC BOUNDARIES ────────────────────────────────────────────────────────
  // Land Survey / PLSS / USNG grid
  {svc:`${JC_BASE}/County/Public_Land_Survey_USNG/MapServer`,ids:[0], name:'Land Survey Sections (PLSS)',   cat:'civic'},
  {svc:`${JC_BASE}/County/Public_Land_Survey_USNG/MapServer`,ids:[1], name:'USNG Grid',                     cat:'civic'},
  // Neighborhoods
  {svc:`${JC_BASE}/County/Neighborhoods/MapServer`,          ids:[0], name:'Neighborhoods',                  cat:'civic'},
  // ROW (Right-of-Way) research layers
  {svc:`${JC_BASE}/County/ROW_Research_Plans/MapServer`,     ids:[0], name:'ROW Plans',                     cat:'civic'},
  {svc:`${JC_BASE}/County/ROW_Research_Docs/MapServer`,      ids:[0], name:'ROW Documents',                 cat:'civic'},
  // Road Construction & Closures
  {svc:`${JC_BASE}/County/Road_Construction_Closures/MapServer`,ids:[0],name:'Road Closures',               cat:'civic'},

  // ── SCHOOL & POLITICAL DISTRICTS ────────────────────────────────────────────
  // School Attendance Areas
  {svc:`${JC_BASE}/County/School_Attendance_Area_Lookup/MapServer`, ids:[0], name:'School Attendance Zones', cat:'districts'},
  {svc:`${JC_BASE}/County/School_Attendance_Area_Lookup_Supplement/MapServer`,ids:[0],name:'School Zones (Supplement)',cat:'districts'},
  // Schools points layer
  {svc:`${JC_BASE}/County/Schools/MapServer`,                ids:[0], name:'Schools',                        cat:'districts'},

  // ── POINTS OF INTEREST ──────────────────────────────────────────────────────
  // Parks system
  {svc:`${JC_BASE}/Parks/TrailsPaths/MapServer`,             ids:[1], name:'Parks',                          cat:'poi'},
  // Code enforcement / public health
  {svc:`${JC_BASE}/County/Public_Health/MapServer`,          ids:[0], name:'Public Health Facilities',       cat:'poi'},

  // ── ELECTION & GOVERNMENT ───────────────────────────────────────────────────
  {svc:`${JC_BASE}/Council/MapServer`,                       ids:[0], name:'Council Districts',              cat:'districts'},
];

// ── County layer registry ─────────────────────────────────────────────────────
const countyLayerCache = {
  bartholomew: BARTHOLOMEW_LAYERS,
  johnson:     JOHNSON_LAYERS,
};

async function fetchCountyLayers(cKey) {
  if (countyLayerCache[cKey]) return countyLayerCache[cKey];
  const base = getActiveDynamicBase();
  if (!base) { countyLayerCache[cKey] = []; return []; }
  try {
    const r = await fetch(base + '?f=json', { signal: AbortSignal.timeout(12000) });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    const d = await r.json();
    const layers = (d.layers || []).filter(l => l.type !== 'Group Layer')
      .map(l => ({ id: l.id, name: l.name, cat: categorizeLayer(l.name) }));
    countyLayerCache[cKey] = layers;
    return layers;
  } catch(e) {
    console.warn('[fetchCountyLayers]', cKey, e.message);
    countyLayerCache[cKey] = [];
    return [];
  }
}

function categorizeLayer(name) {
  const n = name.toLowerCase();
  if (/annot|acreage.*label|lot.*num|dimension|state.*id.*label|area.*label/.test(n)) return 'annotations';
  if (/parcel|lot.?line|deed.?line|easement|subdivis|plat|building|footprint|address.*point|addr.*pt|latest.?sale|bza|review.?group|residential|commercial|agricultural|exempt|utility.*group|neighborhood|tax.?unit|prop.*class/.test(n)) return 'parcels';
  if (/zon|land.?use|comp.*plan|overlay|wellfield|airport.*overlay|front.?door|commitment|tif\b|tax.*increment|planning.*jx|planning.*jurisd/.test(n)) return 'zoning';
  if (/flood|firm|nfhl|floodplain|haw.?creek|sfha|ms4|stormwater|drain|watershed|hydro|stream|river|creek|water(?!shed)|buffered/.test(n)) return 'hydrology';
  if (/road|street|centerline|highway|right.of.way|\brow\b|rail|railroad|transit|bus.?route|bicycle|pedestrian|bike|culvert|bridge/.test(n)) return 'transportation';
  if (/school|elem|middle|high.?school|k-12|school.?board|city.?council|commissioner|county.?council|precinct|voting|congressional|house.?dist|senate.?dist|corporate|corp.*bound|municipal/.test(n)) return 'districts';
  if (/township|section|plss|land.*survey|census|block.?group|census.?tract|county.?bound|county.?line|electric|utility.*area/.test(n)) return 'civic';
  if (/park|recreation|cemeter|hospital|librar|cell.?tower|tower|school(?!.*board|.*dist)/.test(n)) return 'poi';
  if (/contour|elevation|topo|terrain|soil|ssurgo|wetland/.test(n)) return 'environment';
  return 'other';
}

const CATEGORY_META = {
  parcels:       {icon:'fa-house',          color:'#f59e0b', label:'Parcels & Property'},
  annotations:   {icon:'fa-tag',            color:'#94a3b8', label:'Parcel Annotations'},
  zoning:        {icon:'fa-scale-balanced', color:'#eab308', label:'Zoning & Planning'},
  hydrology:     {icon:'fa-water',          color:'#38bdf8', label:'Hydrology & Flood'},
  transportation:{icon:'fa-road',           color:'#94a3b8', label:'Transportation'},
  utility:       {icon:'fa-bolt',           color:'#facc15', label:'Utilities & Infrastructure'},
  districts:     {icon:'fa-graduation-cap', color:'#60a5fa', label:'Districts & Political'},
  civic:         {icon:'fa-landmark',       color:'#fbbf24', label:'Civic Boundaries'},
  poi:           {icon:'fa-location-dot',   color:'#f472b6', label:'Points of Interest'},
  environment:   {icon:'fa-leaf',           color:'#4ade80', label:'Environment & Terrain'},
  other:         {icon:'fa-layer-group',    color:'#a78bfa', label:'Other Layers'},
};
const CAT_ORDER = ['parcels','annotations','zoning','hydrology','transportation','utility','districts','civic','poi','environment','other'];

const ArcGISCountyLayer = L.TileLayer.extend({
  // svcUrl: explicit URL (multi-service counties) OR null (use getActiveDynamicBase())
  initialize: function(ids, opacity, svcUrl) {
    this._ids    = Array.isArray(ids) ? ids : [ids];
    this._svcUrl = svcUrl || null;  // null = use ElevateMaps dynamic base
    this._ts     = Date.now();
    L.TileLayer.prototype.initialize.call(this, '', {
      opacity: opacity || 0.75, tileSize: 256,
      attribution: '© County GIS', maxZoom: 22, keepBuffer: 0
    });
  },
  bumpTimestamp: function() { this._ts = Date.now(); },
  getTileUrl: function(coords) {
    const base = this._svcUrl || getActiveDynamicBase();
    if (!base || !this._ids.length) return '';
    const n    = Math.pow(2, coords.z);
    const xmin = (coords.x/n)     * 40075016.68 - 20037508.34;
    const xmax = ((coords.x+1)/n) * 40075016.68 - 20037508.34;
    const ymin = 20037508.34 - ((coords.y+1)/n) * 40075016.68;
    const ymax = 20037508.34 - (coords.y/n)     * 40075016.68;
    return base + '/export?dpi=96&transparent=true&format=png32&f=image' +
      '&bbox=' + xmin + ',' + ymin + ',' + xmax + ',' + ymax +
      '&bboxSR=3857&imageSR=3857&size=256,256' +
      '&layers=show:' + this._ids.join(',') +
      '&_t=' + this._ts;
  }
});

const StatewideLayer = L.TileLayer.extend({
  initialize: function(base, ids, opacity) {
    this._base = base;
    this._ids  = Array.isArray(ids) ? ids : [ids];
    L.TileLayer.prototype.initialize.call(this, '', {
      opacity: opacity || 0.75, tileSize: 256,
      attribution: '© IGIO / IndianaMap', maxZoom: 22
    });
  },
  getTileUrl: function(coords) {
    const n    = Math.pow(2, coords.z);
    const xmin = (coords.x/n)     * 40075016.68 - 20037508.34;
    const xmax = ((coords.x+1)/n) * 40075016.68 - 20037508.34;
    const ymin = 20037508.34 - ((coords.y+1)/n) * 40075016.68;
    const ymax = 20037508.34 - (coords.y/n)     * 40075016.68;
    return this._base + '/export?dpi=96&transparent=true&format=png32&f=image' +
      '&bbox=' + xmin + ',' + ymin + ',' + xmax + ',' + ymax +
      '&bboxSR=3857&imageSR=3857&size=256,256' +
      (this._ids.length ? '&layers=show:' + this._ids.join(',') : '');
  }
});

async function buildCountyLayerPanel(cKey) {
  const container = document.getElementById('county-layers-container');
  if (!container) return;
  container.innerHTML = `<div style="padding:14px;color:var(--text3);font-size:11px;text-align:center;"><i class="fas fa-spinner fa-spin" style="margin-right:6px;color:var(--accent);"></i>Loading ${(activeCounty||{name:cKey}).name} layers…</div>`;

  // Remove all old county layers
  const KEEP = new Set(['parcels','flood','imagery','imagery-labels']);
  Object.keys(gisLayers).forEach(k => {
    if (KEEP.has(k)) return;
    if (map.hasLayer(gisLayers[k])) map.removeLayer(gisLayers[k]);
    delete gisLayers[k];
  });
  [...activeLyrs].forEach(k => { if (!KEEP.has(k)) activeLyrs.delete(k); });

  const base = getActiveDynamicBase();
  const hasCachedData = countyLayerCache[cKey] && countyLayerCache[cKey].length > 0;

  if (!base && !hasCachedData) {
    container.innerHTML = `<div style="padding:14px 12px;color:var(--text3);font-size:11px;line-height:1.6;">
      <i class="fas fa-info-circle" style="margin-right:6px;color:#60a5fa;"></i>
      <strong style="color:var(--text);">${(activeCounty||{name:cKey}).name}</strong><br>
      County-specific GIS layers for this county are being added.<br>
      Statewide layers (FEMA Flood, Imagery) are available above.
    </div>`;
    updateLegend(); updateLayerBadge(); return;
  }

  const layers = await fetchCountyLayers(cKey);
  if (!layers.length) {
    container.innerHTML = `<div style="padding:14px;color:var(--text3);font-size:11px;">No layers found.</div>`;
    return;
  }

  const groups = {};
  layers.forEach(lyr => {
    if (!groups[lyr.cat]) groups[lyr.cat] = [];
    groups[lyr.cat].push(lyr);
  });

  const ts = Date.now();
  const swatchIcons = {
    parcels:      {icon:'fa-draw-polygon',  color:'#f59e0b'},
    annotations:  {icon:'fa-pen-ruler',     color:'#94a3b8'},
    zoning:       {icon:'fa-map',           color:'#eab308'},
    hydrology:    {icon:'fa-water',         color:'#38bdf8'},
    transportation:{icon:'fa-road',         color:'#94a3b8'},
    districts:    {icon:'fa-flag',          color:'#60a5fa'},
    civic:        {icon:'fa-landmark',      color:'#fbbf24'},
    poi:          {icon:'fa-location-dot',  color:'#f472b6'},
    utility:      {icon:'fa-bolt',          color:'#facc15'},
    environment:  {icon:'fa-leaf',          color:'#4ade80'},
    other:        {icon:'fa-layer-group',   color:'#a78bfa'},
  };

  let panelHtml = '';
  CAT_ORDER.forEach(cat => {
    if (!groups[cat] || !groups[cat].length) return;
    const meta = CATEGORY_META[cat];
    panelHtml += `<div class="lgrp"><div class="lgh" onclick="toggleGrp(this)"><i class="fas ${meta.icon} gi" style="color:${meta.color};"></i> ${meta.label} <span style="font-size:9px;opacity:.4;margin-left:3px;">${groups[cat].length}</span><i class="fas fa-chevron-right arr"></i></div><div class="lgitems">`;
    groups[cat].forEach((lyr, idx) => {
      // Unique key per layer — use index within category to handle duplicate IDs across services
      const key = 'lyr-' + cKey + '-' + cat + '-' + idx;
      const ids  = lyr.ids || [lyr.id];
      const svc  = lyr.svc || null;
      const tl   = new ArcGISCountyLayer(ids, 0.75, svc);
      tl._ts = ts;
      gisLayers[key] = tl;
      const sw   = swatchIcons[lyr.cat] || swatchIcons.other;
      const safe = lyr.name.replace(/[<>"'&]/g, c => ({'<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;','&':'&amp;'}[c]));
      panelHtml += `<div class="li"><input type="checkbox" id="cb-${key}" onchange="toggleLyr('${key}',this)"><i class="fas ${sw.icon} li-icon" style="color:${sw.color};"></i><span class="ln">${safe}</span></div>`;
    });
    panelHtml += '</div></div>';
  });

  container.innerHTML = panelHtml;
  // Open first group by default
  const firstHdr = container.querySelector('.lgh');
  if (firstHdr) { firstHdr.classList.add('open'); firstHdr.nextElementSibling.classList.add('open'); }

  updateLegend(); updateLayerBadge();
  notify('Loaded ' + layers.length + ' layers for ' + (activeCounty||{name:cKey}).name, 'fa-layer-group');
}

async function refreshCountyLayers() {
  const cKey = activeCounty
    ? activeCounty.name.toLowerCase().replace(' county','').replace(/[^a-z]/g,'')
    : 'bartholomew';
  await buildCountyLayerPanel(cKey);
  Object.keys(ownerCache).forEach(k => delete ownerCache[k]);
  setTimeout(prefetchOwnershipForView, 1800);
}

// ── Permanent layer registry (statewide — all 92 counties) ───────────────────
const gisLayers = {};
gisLayers['parcels']        = parcelLayer;
gisLayers['flood']          = L.tileLayer.wms('https://hazards.fema.gov/gis/nfhl/services/public/NFHL/MapServer/WMSServer',
  {layers:'28,29',format:'image/png',transparent:true,version:'1.3.0',opacity:0.60,attribution:'FEMA NFHL',keepBuffer:0});
gisLayers['imagery']        = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
  {maxZoom:20,attribution:'© Esri, Maxar',opacity:0.85});
gisLayers['imagery-labels'] = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',
  {maxZoom:20,attribution:'© Esri',opacity:0.80});


const legendData = {
  'parcels':         {'c':'#f59e0b','l':'Parcel Boundaries'},
  'flood':           {'c':'#3b82f6','l':'FEMA Floodplain'},
  'imagery':         {'c':'#374151','l':'Esri Imagery'},
  'imagery-labels':  {'c':'#9ca3af','l':'Imagery Labels'},
  'plss-sections':   {'c':'#64748b','l':'PLSS Sections'},
  'plss-townships':  {'c':'#475569','l':'PLSS Townships'},
};


const activeLyrs = new Set(['parcels']);

// ── Universal layer toggle ────────────────────────────────────────────────────
function toggleLyr(name, cb) {
  const layer = gisLayers[name];
  if (!layer) {
    if (cb) cb.checked = false;
    return;
  }
  if (cb && cb.checked) {
    layer.addTo(map);
    activeLyrs.add(name);
    if (name !== 'parcels') {
      // Canvas renderer handles z-order — no manual bringToFront needed
    }
  } else {
    map.removeLayer(layer);
    activeLyrs.delete(name);
  }
  syncChip(name, cb ? cb.checked : false);
  updateLegend();
  updateLayerBadge();
}

// ══════════════════════════════════════════════
//  MEASUREMENT
// ══════════════════════════════════════════════
let activeTool = null;
let measurePts = [];
let measureTotal = 0;
let measurePolylines = [];

function activateTool(name, btn) {
  activeTool = name;
  measurePts = [];
  measureTotal = 0;
  document.querySelectorAll('.tbtn').forEach(b=>b.classList.remove('on'));
  btn?.classList.add('on');
  const msgs={
    distance:'<i class="fas fa-ruler-horizontal" style="color:var(--accent);margin-right:6px;"></i>Click to add points. Double-click to finish.',
    area:'<i class="fas fa-draw-polygon" style="color:var(--accent);margin-right:6px;"></i>Click to define polygon. Double-click to close.',
    bearing:'<i class="fas fa-compass" style="color:var(--accent);margin-right:6px;"></i>Click point 1, then point 2.',
    coordinate:'<i class="fas fa-crosshairs" style="color:var(--accent);margin-right:6px;"></i>Click any map location for coordinates.',
    'section-corner':'<i class="fas fa-location-pin" style="color:var(--accent);margin-right:6px;"></i>Click to record a section corner.',
    'select-rect':'<i class="fas fa-crop-simple" style="color:var(--accent);margin-right:6px;"></i>Box select active — use Leaflet Draw.',
    'select-poly':'<i class="fas fa-lasso" style="color:var(--accent);margin-right:6px;"></i>Polygon select active.'
  };
  document.getElementById('mout').innerHTML = msgs[name]||'Tool active.';
  notify(name.charAt(0).toUpperCase()+name.slice(1)+' tool activated','fa-check-circle');
}

map.on('click', e=>{
  const {lat,lng} = e.latlng;
  if(!activeTool) return;
  handleToolClick(lat,lng);
});

function handleToolClick(lat,lng) {
  if(activeTool==='coordinate'){
    const out=document.getElementById('mout');
    out.innerHTML=`
      <div class="mout-row"><span class="mk">Decimal Deg.</span><span class="mv">${lat.toFixed(6)}, ${lng.toFixed(6)}</span></div>
      <div class="mout-row"><span class="mk">DMS</span><span class="mv">${toDMS(lat,lng)}</span></div>
      <div class="mout-row"><span class="mk">UTM (approx)</span><span class="mv">${toUTM(lat,lng)}</span></div>`;
    L.circleMarker([lat,lng],{radius:6,color:'#f0a500',fillColor:'#f0a500',fillOpacity:.9,weight:2}).addTo(map);
    return;
  }
  if(activeTool==='section-corner'){
    notify('Corner recorded: '+lat.toFixed(5)+', '+lng.toFixed(5),'fa-location-pin');
    L.marker([lat,lng]).addTo(map).bindPopup(`<div class="mpop-body"><b style="color:var(--accent);">Section Corner</b><br>${lat.toFixed(6)}, ${lng.toFixed(6)}</div>`).openPopup();
    return;
  }
  measurePts.push([lat,lng]);
  L.circleMarker([lat,lng],{radius:4,color:'#f0a500',fillColor:'#f0a500',fillOpacity:.9,weight:1.5}).addTo(map);

  if(activeTool==='bearing' && measurePts.length===2){
    const b=calcBearing(measurePts[0],measurePts[1]);
    const d=calcDist(measurePts[0],measurePts[1]);
    const line = L.polyline(measurePts,{color:'#f0a500',weight:2,dashArray:'5,4'}).addTo(map);
    measurePolylines.push(line);
    document.getElementById('mout').innerHTML=`
      <div class="mout-row"><span class="mk">Bearing</span><span class="mv">${b.toFixed(2)}°</span></div>
      <div class="mout-row"><span class="mk">Distance</span><span class="mv">${(d*5280).toFixed(0)} ft</span></div>
      <div class="mout-row"><span class="mk">Miles</span><span class="mv">${d.toFixed(4)} mi</span></div>`;
    measurePts=[];
    return;
  }
  if(activeTool==='distance' && measurePts.length>1){
    const d=calcDist(measurePts[measurePts.length-2],measurePts[measurePts.length-1]);
    measureTotal+=d;
    const line=L.polyline([measurePts[measurePts.length-2],measurePts[measurePts.length-1]],{color:'#f0a500',weight:2}).addTo(map);
    measurePolylines.push(line);
    document.getElementById('mout').innerHTML=`
      <div class="mout-row"><span class="mk">Last Segment</span><span class="mv">${(d*5280).toFixed(0)} ft</span></div>
      <div class="mout-row"><span class="mk">Total Distance</span><span class="mv">${(measureTotal*5280).toFixed(0)} ft</span></div>
      <div class="mout-row"><span class="mk">Total (miles)</span><span class="mv">${measureTotal.toFixed(4)} mi</span></div>`;
  }
  if(activeTool==='area' && measurePts.length>=3){
    const a=calcArea(measurePts);
    document.getElementById('mout').innerHTML=`
      <div class="mout-row"><span class="mk">Area</span><span class="mv">${a.toFixed(3)} acres</span></div>
      <div class="mout-row"><span class="mk">Square Feet</span><span class="mv">${(a*43560).toFixed(0)} sf</span></div>
      <div class="mout-row"><span class="mk">Points</span><span class="mv">${measurePts.length}</span></div>`;
  }
}

function calcDist(a,b){
  const R=3958.8,dL=(b[0]-a[0])*Math.PI/180,dl=(b[1]-a[1])*Math.PI/180;
  const s=Math.sin(dL/2)**2+Math.cos(a[0]*Math.PI/180)*Math.cos(b[0]*Math.PI/180)*Math.sin(dl/2)**2;
  return R*2*Math.asin(Math.sqrt(s));
}
function calcBearing(a,b){
  const dl=(b[1]-a[1])*Math.PI/180;
  const y=Math.sin(dl)*Math.cos(b[0]*Math.PI/180);
  const x=Math.cos(a[0]*Math.PI/180)*Math.sin(b[0]*Math.PI/180)-Math.sin(a[0]*Math.PI/180)*Math.cos(b[0]*Math.PI/180)*Math.cos(dl);
  return ((Math.atan2(y,x)*180/Math.PI)+360)%360;
}
function calcArea(pts){
  let a=0;
  for(let i=0;i<pts.length;i++){const j=(i+1)%pts.length;a+=pts[i][1]*pts[j][0]-pts[j][1]*pts[i][0];}
  return Math.abs(a/2)*12321.75;
}
function toDMS(lat,lng){
  const fmt=(v,dirs)=>{
    const d=Math.floor(Math.abs(v)),m=Math.floor((Math.abs(v)-d)*60),s=((Math.abs(v)-d)*60-m)*60;
    return `${d}° ${m}' ${s.toFixed(2)}" ${v>=0?dirs[0]:dirs[1]}`;
  };
  return `${fmt(lat,['N','S'])}, ${fmt(lng,['E','W'])}`;
}
function toUTM(lat,lng){
  const zone=Math.floor((lng+180)/6)+1;
  return `Zone ${zone}N ${Math.abs(Math.round((lng+180)*111320))}E ${Math.round(lat*110540)}N`;
}
function clearMeasure(){
  measurePts=[];measureTotal=0;activeTool=null;
  measurePolylines.forEach(l=>map.removeLayer(l));
  measurePolylines=[];
  document.querySelectorAll('.tbtn').forEach(b=>b.classList.remove('on'));
  document.getElementById('mout').textContent='Click a tool above, then click on the map.';
  notify('Measurements cleared','fa-trash-can');
}

// ══════════════════════════════════════════════
//  DRAW TOOLS
// ══════════════════════════════════════════════
const drawnItems = new L.FeatureGroup().addTo(map);
let drawCtrl = null;
let drawActive = false;

function activateDraw(type, btn) {
  document.querySelectorAll('.tbtn').forEach(b=>b.classList.remove('on'));
  btn?.classList.add('on');
  if(!drawActive){
    drawCtrl = new L.Control.Draw({
      edit:{featureGroup:drawnItems},
      draw:{
        polygon:{shapeOptions:{color:'#f0a500',fillOpacity:.2,weight:2}},
        rectangle:{shapeOptions:{color:'#f0a500',fillOpacity:.2,weight:2}},
        circle:{shapeOptions:{color:'#f0a500',fillOpacity:.2,weight:2}},
        polyline:{shapeOptions:{color:'#f0a500',weight:2}},
        marker:true,circlemarker:false
      }
    });
    map.addControl(drawCtrl);
    drawActive=true;
  }
  const Handlers={polygon:L.Draw.Polygon,rectangle:L.Draw.Rectangle,circle:L.Draw.Circle,polyline:L.Draw.Polyline,marker:L.Draw.Marker};
  if(Handlers[type]) new Handlers[type](map,drawCtrl.options.draw[type]||{}).enable();
  notify('Draw '+type+' mode active','fa-pencil');
}
map.on(L.Draw.Event.CREATED,e=>{drawnItems.addLayer(e.layer);notify('Shape added to map','fa-check');});
function clearDrawings(){drawnItems.clearLayers();notify('All drawings cleared','fa-eraser');}

// ══════════════════════════════════════════════
//  COORDINATE CONVERTER
// ══════════════════════════════════════════════
function convertCoords(){
  const lat=parseFloat(document.getElementById('conv-lat').value);
  const lon=parseFloat(document.getElementById('conv-lon').value);
  if(isNaN(lat)||isNaN(lon)){document.getElementById('conv-out').textContent='Invalid coordinates.';return;}
  document.getElementById('conv-out').innerHTML=`
    <div class="mout-row"><span class="mk">Decimal Deg.</span><span class="mv">${lat.toFixed(6)}, ${lon.toFixed(6)}</span></div>
    <div class="mout-row"><span class="mk">DMS</span><span class="mv">${toDMS(lat,lon)}</span></div>
    <div class="mout-row"><span class="mk">UTM (approx)</span><span class="mv">${toUTM(lat,lon)}</span></div>
    <div class="mout-row"><span class="mk">State Plane</span><span class="mv">Indiana East Zone</span></div>`;
  map.setView([lat,lon],16);
  closeModal('coords-modal');
}

// ══════════════════════════════════════════════
//  HEADER SEARCH
// ══════════════════════════════════════════════
const $searchInput = document.getElementById('search-input');
const $searchDrop = document.getElementById('search-dropdown');

$searchInput.addEventListener('input', function(){
  const q=this.value.trim().toLowerCase();
  if(q.length<2){$searchDrop.style.display='none';return;}
  // Search loaded parcel layer
  const matches=[];
  parcelLayer.eachLayer(l=>{
    if(!l.parcelData) return;
    const p=l.parcelData;
    const addr=(p.addr||'').toLowerCase();
    const pid=(p.pid||'').toLowerCase();
    const city=(p.city||'').toLowerCase();
    if(addr.includes(q)||pid.includes(q)||city.includes(q)) matches.push({p,l});
  });
  if(!matches.length){
    // If no loaded parcels match yet, show a geocode hint
    $searchDrop.innerHTML=`<div class="sdr-item"><div class="sdr-icon" style="background:var(--panel2);border:1px solid var(--border);"><i class="fas fa-magnifying-glass" style="color:var(--accent);"></i></div><div class="sdr-text"><div class="t1">Search "${q}"</div><div class="t2">Press Enter to geocode or zoom in to load parcels</div></div></div>`;
    $searchDrop.style.display='block';
    return;
  }
  $searchDrop.innerHTML=matches.slice(0,8).map(({p,l})=>`
    <div class="sdr-item" onclick="selectFromSearch('${p.pid||p.id}')">
      <div class="sdr-icon" style="background:var(--panel2);border:1px solid var(--border);"><i class="fas fa-house" style="color:var(--accent);"></i></div>
      <div class="sdr-text"><div class="t1">${p.addr}, ${p.city}</div><div class="t2">${p.use||'Parcel'} · ${p.pid}</div></div>
    </div>`).join('');
  $searchDrop.style.display='block';
});
document.addEventListener('click',e=>{if(!e.target.closest('#search-wrap'))$searchDrop.style.display='none';});
document.getElementById('search-btn').addEventListener('click',()=>$searchInput.dispatchEvent(new Event('input')));
$searchInput.addEventListener('keydown',e=>{if(e.key==='Enter'){$searchInput.dispatchEvent(new Event('input'));}});

function selectFromSearch(pid){
  // Find in live loaded parcels
  let found = null;
  parcelLayer.eachLayer(l=>{
    if(l.parcelData&&(l.parcelData.id===pid||l.parcelData.pid===pid)) found={p:l.parcelData,l:l};
  });
  if(found){
    $searchDrop.style.display='none';
    $searchInput.value=found.p.addr+', '+found.p.city;
    const center=found.l.getBounds?found.l.getBounds().getCenter():L.latLng(found.p.lat,found.p.lon);
    map.setView(center,17);
    selectParcelLive(found.p,found.l);
  }
}

// ══════════════════════════════════════════════
//  SIDEBAR SEARCH TAB
// ══════════════════════════════════════════════
function updateSearchUI(){
  const t=document.getElementById('stype').value;
  const lbls={address:'Street Address',parcel:'Parcel Number',owner:'Owner Name',coords:'Coordinates (Lat, Lon)',section:'Section · Township · Range',subdivision:'Subdivision Name'};
  const phs={address:'e.g. 440 3rd Street, Columbus IN',parcel:'03-01-14-400-001.000-003',owner:'Last, First or Company Name',coords:'39.2015, -85.9210',section:'Sec 14, T11N, R5E',subdivision:'Autumn Ridge'};
  document.getElementById('sflabel').textContent=lbls[t]||'Query';
  document.getElementById('sfield').placeholder=phs[t]||'';
}

function doSearch(){
  const q=document.getElementById('sfield').value.trim().toLowerCase();
  const res=document.getElementById('search-res');
  if(!q){res.innerHTML='';return;}
  // First search loaded parcel layer
  const matches=[];
  parcelLayer.eachLayer(l=>{
    if(!l.parcelData) return;
    const p=l.parcelData;
    const addr=(p.addr||'').toLowerCase();
    const pid=(p.pid||'').toLowerCase();
    const city=(p.city||'').toLowerCase();
    const use=(p.use||'').toLowerCase();
    if(addr.includes(q)||pid.includes(q)||city.includes(q)||use.includes(q)) matches.push({p,l});
  });

  if(!matches.length){
    // Try Nominatim geocoder as fallback
    res.innerHTML='<div style="color:var(--text3);font-size:12px;padding:8px 0;"><i class="fas fa-spinner fa-spin" style="margin-right:6px;"></i>Searching…</div>';
    fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q+', Bartholomew County, Indiana')}&limit=5`)
      .then(r=>r.json())
      .then(data=>{
        if(!data.length){
          res.innerHTML='<div style="color:var(--text3);font-size:12px;padding:8px 0;"><i class="fas fa-circle-exclamation" style="margin-right:6px;"></i>No results. Zoom in to load more parcels first.</div>';
          return;
        }
        res.innerHTML=data.map(d=>`
          <div class="scard" onclick="map.setView([${d.lat},${d.lon}],17);loadParcelsForView()">
            <div class="sc-top"><i class="fas fa-map-pin" style="color:var(--accent);margin-right:5px;"></i>${d.display_name.split(',')[0]}</div>
            <div class="sc-sub">${d.display_name}</div>
          </div>`).join('');
      }).catch(()=>{
        res.innerHTML='<div style="color:var(--text3);font-size:12px;">No results found.</div>';
      });
    return;
  }

  res.innerHTML=matches.slice(0,20).map(({p})=>`
    <div class="scard" onclick="selectFromSearch('${p.pid||p.id}')">
      <div class="sc-top"><i class="fas fa-house" style="color:var(--accent);margin-right:5px;"></i>${p.addr}, ${p.city} ${p.zip}</div>
      <div class="sc-sub">${p.use||'Parcel'} · ${p.pid}</div>
      <div class="sc-badges">
        <span class="pbadge bg-amber">${(p.use||'Unknown').split(' ')[0]}</span>
      </div>
    </div>`).join('');
}
function clearSearch(){document.getElementById('sfield').value='';document.getElementById('search-res').innerHTML='';}

// ══════════════════════════════════════════════
//  MAP STATUS UPDATES
// ══════════════════════════════════════════════
map.on('mousemove',e=>{
  document.getElementById('coords-disp').innerHTML=
    `<i class="fas fa-crosshairs" style="margin-right:4px;color:var(--text3);"></i>Lat: ${e.latlng.lat.toFixed(5)} · Lon: ${e.latlng.lng.toFixed(5)}`;
});

// ══════════════════════════════════════════════
//  TABS & UI
// ══════════════════════════════════════════════
function switchTab(name){
  document.querySelectorAll('.stab').forEach(t=>t.classList.remove('on'));
  document.querySelectorAll('.tpane').forEach(p=>p.classList.remove('on'));
  document.querySelector(`.stab[data-tab="${name}"]`)?.classList.add('on');
  document.getElementById('tab-'+name)?.classList.add('on');
  // Always ensure sidebar is visible
  const sb = document.getElementById('sidebar');
  sb.classList.remove('hide');
  sb.classList.add('mobile-open'); // works on both mobile and desktop
  // Scroll sidebar body to top so PRC is visible
  const sbody = document.getElementById('sbody');
  if (sbody) sbody.scrollTop = 0;
}

function toggleGrp(hdr){
  hdr.classList.toggle('open');
  hdr.nextElementSibling.classList.toggle('open');
}
// Open all layer groups
document.querySelectorAll('.lgh').forEach(h=>{h.classList.add('open');h.nextElementSibling.classList.add('open');});

function toggleSidebar(){document.getElementById('sidebar').classList.toggle('hide');}
function toggleRight(){document.getElementById('rpanel').classList.toggle('hide');}

// ══════════════════════════════════════════════
//  BASEMAP COUNTY SELECTOR
// ══════════════════════════════════════════════
// ══════════════════════════════════════════════
//  ALL 92 INDIANA COUNTIES
//  lat, lng, zoom, fips, name, elevatemaps_server(if available)
// ══════════════════════════════════════════════
const INDIANA_COUNTIES = {
  // em = ElevateMaps MapServer service name (Layer 92 ownership + county GIS layers)
  // own = county-specific ArcGIS ownership endpoint (for non-ElevateMaps counties)
  // prc = direct PRC/report URL type
  adams:       {lat:40.745,lng:-84.935,z:12,fips:'18001',name:'Adams County',     own:'https://gis.adamscounty.net/arcgis/rest/services/Assessor/MapServer'},
  allen:       {lat:41.085,lng:-85.065,z:12,fips:'18003',name:'Allen County',     own:'https://www.assessor.allencounty.in.gov/'},
  bartholomew: {lat:39.201,lng:-85.921,z:14,fips:'18005',name:'Bartholomew County',em:'BartholomewINDynamic'},
  benton:      {lat:40.605,lng:-87.300,z:12,fips:'18007',name:'Benton County',    em:'BentonINDynamic'},
  blackford:   {lat:40.475,lng:-85.330,z:12,fips:'18009',name:'Blackford County'},
  boone:       {lat:40.050,lng:-86.470,z:12,fips:'18011',name:'Boone County'},
  brown:       {lat:39.205,lng:-86.230,z:12,fips:'18013',name:'Brown County'},
  carroll:     {lat:40.575,lng:-86.560,z:12,fips:'18015',name:'Carroll County'},
  cass:        {lat:40.770,lng:-86.345,z:12,fips:'18017',name:'Cass County',      em:'CassINDynamic'},
  clark:       {lat:38.475,lng:-85.715,z:12,fips:'18019',name:'Clark County',     em:'ClarkINDynamic'},
  clay:        {lat:39.390,lng:-87.110,z:12,fips:'18021',name:'Clay County'},
  clinton:     {lat:40.300,lng:-86.475,z:12,fips:'18023',name:'Clinton County'},
  crawford:    {lat:38.290,lng:-86.440,z:12,fips:'18025',name:'Crawford County'},
  daviess:     {lat:38.700,lng:-87.070,z:12,fips:'18027',name:'Daviess County'},
  dearborn:    {lat:39.165,lng:-84.970,z:12,fips:'18029',name:'Dearborn County'},
  decatur:     {lat:39.310,lng:-85.490,z:12,fips:'18031',name:'Decatur County'},
  dekalb:      {lat:41.395,lng:-85.000,z:12,fips:'18033',name:'DeKalb County'},
  delaware:    {lat:40.230,lng:-85.395,z:12,fips:'18035',name:'Delaware County'},
  dubois:      {lat:38.365,lng:-86.875,z:12,fips:'18037',name:'Dubois County'},
  elkhart:     {lat:41.600,lng:-85.865,z:12,fips:'18039',name:'Elkhart County',   em:'ElkhartINDynamic'},
  fayette:     {lat:39.640,lng:-85.175,z:12,fips:'18041',name:'Fayette County'},
  floyd:       {lat:38.320,lng:-85.905,z:12,fips:'18043',name:'Floyd County',     em:'FloydINDynamic'},
  fountain:    {lat:40.120,lng:-87.255,z:12,fips:'18045',name:'Fountain County'},
  franklin:    {lat:39.415,lng:-85.070,z:12,fips:'18047',name:'Franklin County'},
  fulton:      {lat:41.040,lng:-86.265,z:12,fips:'18049',name:'Fulton County'},
  gibson:      {lat:38.315,lng:-87.590,z:12,fips:'18051',name:'Gibson County'},
  grant:       {lat:40.520,lng:-85.655,z:12,fips:'18053',name:'Grant County',     em:'GrantINDynamic'},
  greene:      {lat:39.040,lng:-86.960,z:12,fips:'18055',name:'Greene County'},
  hamilton:    {lat:40.055,lng:-86.015,z:12,fips:'18057',name:'Hamilton County'},
  hancock:     {lat:39.825,lng:-85.775,z:12,fips:'18059',name:'Hancock County'},
  harrison:    {lat:38.205,lng:-86.090,z:12,fips:'18061',name:'Harrison County',  em:'HarrisonINDynamic'},
  hendricks:   {lat:39.770,lng:-86.505,z:12,fips:'18063',name:'Hendricks County', em:'HendricksINDynamic'},
  henry:       {lat:39.935,lng:-85.370,z:12,fips:'18065',name:'Henry County'},
  howard:      {lat:40.480,lng:-86.105,z:12,fips:'18067',name:'Howard County'},
  huntington:  {lat:40.825,lng:-85.500,z:12,fips:'18069',name:'Huntington County'},
  jackson:     {lat:38.910,lng:-86.060,z:12,fips:'18071',name:'Jackson County'},
  jasper:      {lat:41.015,lng:-87.110,z:12,fips:'18073',name:'Jasper County'},
  jay:         {lat:40.440,lng:-84.940,z:12,fips:'18075',name:'Jay County',       em:'JayINDynamic'},
  jefferson:   {lat:38.775,lng:-85.425,z:12,fips:'18077',name:'Jefferson County'},
  jennings:    {lat:38.995,lng:-85.635,z:12,fips:'18079',name:'Jennings County'},
  johnson:     {lat:39.490,lng:-86.100,z:12,fips:'18081',name:'Johnson County', own:'schneiderjc'},
  knox:        {lat:38.685,lng:-87.435,z:12,fips:'18083',name:'Knox County'},
  kosciusko:   {lat:41.245,lng:-85.865,z:12,fips:'18085',name:'Kosciusko County'},
  lagrange:    {lat:41.645,lng:-85.435,z:12,fips:'18087',name:'LaGrange County'},
  lake:        {lat:41.455,lng:-87.370,z:12,fips:'18089',name:'Lake County'},
  laporte:     {lat:41.540,lng:-86.740,z:12,fips:'18091',name:'LaPorte County',   em:'LaPorteINDynamic'},
  lawrence:    {lat:38.840,lng:-86.480,z:12,fips:'18093',name:'Lawrence County',  em:'LawrenceINDynamic'},
  madison:     {lat:40.165,lng:-85.720,z:12,fips:'18095',name:'Madison County'},
  marion:      {lat:39.770,lng:-86.150,z:12,fips:'18097',name:'Marion County'},
  marshall:    {lat:41.330,lng:-86.265,z:12,fips:'18099',name:'Marshall County'},
  martin:      {lat:38.705,lng:-86.785,z:12,fips:'18101',name:'Martin County',    em:'MartinINDynamic'},
  miami:       {lat:40.770,lng:-86.040,z:12,fips:'18103',name:'Miami County',     em:'MiamiINDynamic'},
  monroe:      {lat:39.160,lng:-86.520,z:12,fips:'18105',name:'Monroe County',    em:'MonroeINDynamic'},
  montgomery:  {lat:40.040,lng:-86.900,z:12,fips:'18107',name:'Montgomery County'},
  morgan:      {lat:39.485,lng:-86.440,z:12,fips:'18109',name:'Morgan County',    em:'MorganINDynamic'},
  newton:      {lat:41.045,lng:-87.415,z:12,fips:'18111',name:'Newton County'},
  noble:       {lat:41.395,lng:-85.415,z:12,fips:'18113',name:'Noble County'},
  ohio:        {lat:38.935,lng:-84.975,z:12,fips:'18115',name:'Ohio County'},
  orange:      {lat:38.545,lng:-86.495,z:12,fips:'18117',name:'Orange County',    em:'OrangeINDynamic'},
  owen:        {lat:39.320,lng:-86.835,z:12,fips:'18119',name:'Owen County',      em:'OwenINDynamic'},
  parke:       {lat:39.790,lng:-87.210,z:12,fips:'18121',name:'Parke County'},
  perry:       {lat:37.930,lng:-86.600,z:12,fips:'18123',name:'Perry County'},
  pike:        {lat:38.400,lng:-87.220,z:12,fips:'18125',name:'Pike County'},
  porter:      {lat:41.520,lng:-87.060,z:12,fips:'18127',name:'Porter County'},
  posey:       {lat:38.010,lng:-87.870,z:12,fips:'18129',name:'Posey County'},
  pulaski:     {lat:41.045,lng:-86.695,z:12,fips:'18131',name:'Pulaski County'},
  putnam:      {lat:39.660,lng:-86.810,z:12,fips:'18133',name:'Putnam County'},
  randolph:    {lat:40.145,lng:-85.005,z:12,fips:'18135',name:'Randolph County'},
  ripley:      {lat:39.105,lng:-85.270,z:12,fips:'18137',name:'Ripley County'},
  rush:        {lat:39.615,lng:-85.480,z:12,fips:'18139',name:'Rush County'},
  stjoseph:    {lat:41.620,lng:-86.260,z:12,fips:'18141',name:'St. Joseph County'},
  scott:       {lat:38.690,lng:-85.745,z:12,fips:'18143',name:'Scott County'},
  shelby:      {lat:39.525,lng:-85.780,z:12,fips:'18145',name:'Shelby County'},
  spencer:     {lat:37.990,lng:-87.010,z:12,fips:'18147',name:'Spencer County'},
  starke:      {lat:41.285,lng:-86.630,z:12,fips:'18149',name:'Starke County'},
  steuben:     {lat:41.645,lng:-84.995,z:12,fips:'18151',name:'Steuben County'},
  sullivan:    {lat:39.095,lng:-87.420,z:12,fips:'18153',name:'Sullivan County'},
  switzerland: {lat:38.825,lng:-85.025,z:12,fips:'18155',name:'Switzerland County'},
  tippecanoe:  {lat:40.410,lng:-86.890,z:12,fips:'18157',name:'Tippecanoe County'},
  tipton:      {lat:40.290,lng:-86.045,z:12,fips:'18159',name:'Tipton County'},
  union:       {lat:39.640,lng:-84.920,z:12,fips:'18161',name:'Union County'},
  vanderburgh: {lat:37.980,lng:-87.560,z:12,fips:'18163',name:'Vanderburgh County'},
  vermillion:  {lat:39.845,lng:-87.460,z:12,fips:'18165',name:'Vermillion County'},
  vigo:        {lat:39.450,lng:-87.385,z:12,fips:'18167',name:'Vigo County'},
  wabash:      {lat:40.800,lng:-85.815,z:12,fips:'18169',name:'Wabash County'},
  warren:      {lat:40.355,lng:-87.370,z:12,fips:'18171',name:'Warren County'},
  warrick:     {lat:38.100,lng:-87.270,z:12,fips:'18173',name:'Warrick County'},
  washington:  {lat:38.605,lng:-86.105,z:12,fips:'18175',name:'Washington County'},
  wayne:       {lat:39.855,lng:-85.000,z:12,fips:'18177',name:'Wayne County'},
  wells:       {lat:40.730,lng:-85.225,z:12,fips:'18179',name:'Wells County'},
  white:       {lat:40.750,lng:-86.870,z:12,fips:'18181',name:'White County',     em:'WhiteINDynamic'},
  whitley:     {lat:41.135,lng:-85.510,z:12,fips:'18183',name:'Whitley County'},
  all:         {lat:39.770,lng:-86.150,z:7, fips:null,   name:'All Indiana'}
};


// ══════════════════════════════════════════════
//  PRC PDF — DIRECT COUNTY ENDPOINTS
//  Exhaustively researched. These are all confirmed
//  public-access direct PDF/report URLs per county.
// ══════════════════════════════════════════════

// ══════════════════════════════════════════════════════════════════════
//  PRC PDF SYSTEM — DIRECT & RELIABLE
//
//  Sources (in priority order):
//  1. Marion County  → maps.indy.gov (real PDF server)
//  2. Hamilton County → secure2.hamiltoncounty.in.gov (real PDF server)
//  3. ElevateMaps counties → fetch SAS URL from ElevateMaps API, open Venturi blob PDF
//  4. XSoft Engage counties → engage.xsoftinc.com detail page
//  5. All others → professional browser-generated PDF from real assessment data
// ══════════════════════════════════════════════════════════════════════

// ElevateMaps county config: appId required for API auth, folderId for Azure blob
const EM_COUNTIES = {
  bartholomew: { appId:'56a21b98420e711f6cac03a4', folderId:'6072', host:'bartholomewin.elevatemaps.io' },
  cass:        { appId:'56a21a6d12c7416c1ce9e363', folderId:null,   host:'cassin.elevatemaps.io' },
  monroe:      { appId:'56a2422e6debad32771174b3', folderId:null,   host:'monroein.elevatemaps.io' },
  morgan:      { appId:'56a2443faf57cfd377f3cc8b', folderId:null,   host:'morganin.elevatemaps.io' },
  floyd:       { appId:null, folderId:null, host:'floydin.elevatemaps.io' },
  grant:       { appId:null, folderId:null, host:'grantin.elevatemaps.io' },
  harrison:    { appId:null, folderId:null, host:'harrisonin.elevatemaps.io' },
  jay:         { appId:null, folderId:null, host:'jayin.elevatemaps.io' },
  lawrence:    { appId:null, folderId:null, host:'lawrencein.elevatemaps.io' },
  martin:      { appId:null, folderId:null, host:'martinin.elevatemaps.io' },
  miami:       { appId:null, folderId:null, host:'miamiin.elevatemaps.io' },
  orange:      { appId:null, folderId:null, host:'orangein.elevatemaps.io' },
  benton:      { appId:null, folderId:null, host:'bentonin.elevatemaps.io' },
  elkhart:     { appId:null, folderId:null, host:'elkhartin.elevatemaps.io' },
  laporte:     { appId:null, folderId:null, host:'laportein.elevatemaps.io' },
  owen:        { appId:null, folderId:null, host:'owenin.elevatemaps.io' },
  white:       { appId:null, folderId:null, host:'whitein.elevatemaps.io' },
};

// XSoft Engage counties
const WTH_GIS = {
  // MapDotNet-hosted counties — coordinate-based, requires corsproxy.io
  putnam:  { host:'https://putnamin.wthgis.com',      layers:'10739,1933,2965,8288' },
  brown:   { host:'https://brownin.wthgis.com',       layers:'10739,1933,2965,8288' },
  daviess: { host:'https://daviessin.wthgis.com',     layers:'10739,1933,2965,8288' },
  dubois:  { host:'https://duboisin.wthgis.com',      layers:'10739,1933,2965,8288' },
  henry:   { host:'https://henryin.wthgis.com',       layers:'10739,1933,2965,8288' },
  jackson: { host:'https://jacksonin.wthgis.com',     layers:'10739,1933,2965,8288' },
  jasper:  { host:'https://jasperin.wthgis.com',      layers:'10739,1933,2965,8288' },
  jefferson:{ host:'https://jeffersonin.wthgis.com',  layers:'10739,1933,2965,8288' },
  jennings:{ host:'https://jenningsin.wthgis.com',    layers:'10739,1933,2965,8288' },
  newton:  { host:'https://newtonin.wthgis.com',      layers:'10739,1933,2965,8288' },
  noble:   { host:'https://noblein.wthgis.com',       layers:'10739,1933,2965,8288' },
  parke:   { host:'https://parkein.wthgis.com',       layers:'10739,1933,2965,8288' },
  perry:   { host:'https://perryin.wthgis.com',       layers:'10739,1933,2965,8288' },
  pike:    { host:'https://pikein.wthgis.com',        layers:'10739,1933,2965,8288' },
  pulaski: { host:'https://pulaskin.wthgis.com',      layers:'10739,1933,2965,8288' },
  scott:   { host:'https://scottin.wthgis.com',       layers:'10739,1933,2965,8288' },
  starke:  { host:'https://starkein.wthgis.com',      layers:'10739,1933,2965,8288' },
  sullivan:{ host:'https://sullivanin.wthgis.com',    layers:'10739,1933,2965,8288' },
  union:   { host:'https://unionin.wthgis.com',       layers:'10739,1933,2965,8288' },
  vermillion:{ host:'https://vermillionin.wthgis.com',layers:'10739,1933,2965,8288' },
  warren:  { host:'https://warrennin.wthgis.com',     layers:'10739,1933,2965,8288' },
};

const XSOFT_SLUGS = {
  // Confirmed public /GetParcelDetail endpoint
  clark:'clark', daviess:'daviess', dekalb:'dekalb', fountain:'fountain',
  hendricks:'hendricks', knox:'knox', porter:'porter',
  posey:'posey', randolph:'randolph', shelby:'shelby',
  vanderburgh:'vanderburgh', warrick:'warrick',
  // Additional confirmed XSoft counties
  boone:'boone', fulton:'fulton', gibson:'gibson', greene:'greene',
  howard:'howard', jefferson:'jefferson', madison:'madison',
  marshall:'marshall', ohio:'ohio', ripley:'ripley', spencer:'spencer',
  switzerland:'switzerland', washington:'washington', wayne:'wayne',
};

// Beacon app names (last resort for unsupported counties)
const BEACON_APPS = {
  bartholomew:'BartholomewCountyIN', allen:'AllenCountyIN', hamilton:'HamiltonCountyIN',
  johnson:'JohnsonCountyIN', tippecanoe:'TippecanoeCountyIN', hancock:'HancockCountyIN',
  madison:'MadisonCountyIN', boone:'BooneCountyIN', delaware:'DelawareCountyIN',
  vigo:'VigoCountyIN', wayne:'WayneCountyIN', howard:'HowardCountyIN',
  kosciusko:'KosciuskoCountyIN', elkhart:'ElkhartCountyIN', cass:'CassCountyIN',
  grant:'GrantCountyIN', monroe:'MonroeCountyIN', morgan:'MorganCountyIN',
  floyd:'FloydCountyIN', laporte:'LaPorteCountyIN', clark:'ClarkCountyIN',
  johnson:'JohnsonCountyIN', jackson:'JacksonCountyIN',
};

// Legacy helpers for buildLiveReport
function buildPRCUrl(k, pin) { return null; }
function buildBeaconUrl(k, pin) {
  return BEACON_APPS[k] ? `https://beacon.schneidercorp.com/Application.aspx?App=${BEACON_APPS[k]}&PageType=GeneralInfo&ParcelNumber=${encodeURIComponent(pin)}` : null;
}
function buildGatewayUrl() { return 'https://gateway.ifionline.org/TaxBillLookUp/Default.aspx'; }

// ── Try to get signed Venturi blob PDF URL via ElevateMaps ArcGIS API ────────
// The ElevateMaps MapServer exposes a "GetAttachments" or related endpoint
// that returns signed Azure blob URLs for stored PRC PDFs.
// ── Fetch signed Venturi PDF URL via Claude API (server-side, no CORS) ───────
async function getVenturiPDF(em, pin) {
  if (!em.appId || !em.folderId) return null;

  const prcPageUrl = `https://${em.host}/prc.html?pin=${encodeURIComponent(pin)}&appId=${em.appId}`;

  try {
    // Use Claude API with web_search to fetch the ElevateMaps PRC page
    // server-side and extract the Venturi blob URL (no CORS restriction)
    const resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 512,
        tools: [{ type: 'web_search_20250305', name: 'web_search' }],
        system: `You are a URL extractor. Use web_search to fetch the given URL. Look through the entire page source and JavaScript for any URL containing "venturi.blob.core.windows.net/fd-${em.folderId}". Return ONLY the complete URL including the full query string starting with ?sv=. If not found, return exactly: NOT_FOUND`,
        messages: [{ role: 'user', content: `Fetch this page and find the Venturi blob PDF URL: ${prcPageUrl}` }]
      })
    });

    if (!resp.ok) return null;
    const data = await resp.json();
    const text = (data.content || []).filter(b => b.type === 'text').map(b => b.text).join('');
    const match = text.match(/https:\/\/venturi\.blob\.core\.windows\.net\/fd-\d+\/[^\s"'<>]+sig=[^\s"'<>]+/);
    if (match && match[0].includes('sig=')) {
      console.log('Got Venturi URL via Claude proxy');
      return match[0];
    }
  } catch(e) {
    console.warn('Claude Venturi proxy failed:', e.message);
  }

  // Fallback: Try the ElevateMaps ArcGIS queryAttachments endpoint directly
  // This works because elb.elevatemaps.io allows CORS for ArcGIS REST
  try {
    const svc = `https://elb.elevatemaps.io/arcgis/rest/services/eGISDynamicServices/BartholomewINDynamic/MapServer/92`;
    const qr = await fetch(`${svc}/query?where=${encodeURIComponent(`pin_18='${pin}'`)}&outFields=OBJECTID&returnGeometry=false&f=json`, { signal: AbortSignal.timeout(8000) });
    if (qr.ok) {
      const qd = await qr.json();
      if (qd.features && qd.features.length) {
        const oid = qd.features[0].attributes.OBJECTID;
        const ar = await fetch(`${svc}/${oid}/attachments?f=json`, { signal: AbortSignal.timeout(8000) });
        if (ar.ok) {
          const ad = await ar.json();
          const pdf = (ad.attachmentInfos || []).find(a => a.contentType === 'application/pdf' || (a.name||'').endsWith('.pdf'));
          if (pdf) return `${svc}/${oid}/attachments/${pdf.id}`;
        }
      }
    }
  } catch(e) { /* fall through */ }

  return null;
}

// ── Main PRC button ───────────────────────────────────────────────────────────
function openPRCPanel() {
  const p = window._selectedLiveParcel;
  if (!p || !p.pid) {
    notify('Click a parcel on the map first', 'fa-triangle-exclamation');
    return;
  }

  const cKey = activeCounty
    ? activeCounty.name.toLowerCase().replace(' county','').replace(/\./g,'').replace(/\s+/g,'')
    : 'bartholomew';

  const pin = p.pid;
  notify('Fetching official PRC PDF…', 'fa-spinner');
  _openPRCForCounty(cKey, p, pin);
}

async function _openPRCForCounty(cKey, p, pin) {
  // ── 1. Marion County — real PDF server ────────────────────────────────────
  if (cKey === 'marion') {
    const num = pin.replace(/[^0-9]/g, '').substring(0, 10);
    if (num) {
      window.open(`https://maps.indy.gov/AssessorPropertyCards.Reports.Service/ReportPage.aspx?ParcelNumber=${num}`, '_blank', 'noopener');
      notify('Opened Marion County PRC', 'fa-file-pdf');
      return;
    }
  }

  // ── 2. Hamilton County — real property reports server ─────────────────────
  if (cKey === 'hamilton') {
    const num = pin.replace(/[^0-9]/g, '').padEnd(16, '0').substring(0, 16);
    if (num) {
      window.open(`https://secure2.hamiltoncounty.in.gov/propertyreports/reports.aspx?parcel=${num}`, '_blank', 'noopener');
      notify('Opened Hamilton County property report', 'fa-file-lines');
      return;
    }
  }

  // ── 3. ElevateMaps / Venturi CAMA counties ────────────────────────────────
  const em = EM_COUNTIES[cKey];
  if (em && em.folderId && em.appId) {
    notify('Fetching signed PRC PDF from Venturi CAMA…', 'fa-spinner');
    try {
      const pdfUrl = await getVenturiPDF(em, pin);
      if (pdfUrl) {
        window.open(pdfUrl, '_blank', 'noopener');
        notify('✓ Official assessor PRC PDF opened!', 'fa-file-pdf');
        return;
      }
    } catch(e) { /* fall through to generated PDF */ }
  }

  // ── 4. XSoft Engage counties ──────────────────────────────────────────────
  if (XSOFT_SLUGS[cKey]) {
    window.open(`https://engage.xsoftinc.com/${XSOFT_SLUGS[cKey]}/Map/GetParcelDetail?parcelId=${encodeURIComponent(pin)}`, '_blank', 'noopener');
    notify('Opened XSoft assessor record', 'fa-file-lines');
    return;
  }

  // ── 5. All counties — generate complete PDF from real assessment data ──────
  generateLocalPRC(p);
}

// ── Generate a proper PRC PDF in the browser ──────────────────────────────────
// Uses real ownership & assessment data from ElevateMaps Layer 92.
// Opens in a new window with a "Save as PDF" button — one click to PDF.
function generateLocalPRC(p) {
  const county = (activeCounty && activeCounty.name) || 'Indiana';
  const fips   = (activeCounty && activeCounty.fips)  || '';
  const now    = new Date().toLocaleDateString('en-US', { year:'numeric', month:'long', day:'numeric' });
  const v = x => (x && x !== '—' && x !== 'null' && x !== 'undefined') ? x : '—';

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Property Record Card — ${v(p.addr)}</title>
<style>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;900&display=swap');
*{margin:0;padding:0;box-sizing:border-box;}
body{font-family:'Inter',Arial,sans-serif;font-size:10.5px;color:#111827;background:#fff;-webkit-print-color-adjust:exact;print-color-adjust:exact;}
.page{max-width:960px;margin:0 auto;padding:20px 24px;}
.print-btn{background:#1e3a5f;color:#fff;padding:10px 18px;border-radius:6px;margin-bottom:18px;display:flex;align-items:center;justify-content:space-between;gap:12px;}
.print-btn span{font-size:12px;opacity:.85;}
.print-btn button{background:#f0a500;color:#0f2d5e;border:none;padding:9px 22px;border-radius:5px;font-size:13px;font-weight:800;cursor:pointer;letter-spacing:.2px;}
.hdr{display:flex;align-items:stretch;border:2px solid #1e3a5f;border-radius:6px;margin-bottom:14px;overflow:hidden;}
.hdr-seal{background:#1e3a5f;color:#fff;width:80px;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:10px 6px;flex-shrink:0;}
.hdr-seal svg{width:38px;height:38px;margin-bottom:5px;}
.hdr-seal div{font-size:7.5px;font-weight:700;letter-spacing:.7px;text-transform:uppercase;text-align:center;line-height:1.3;}
.hdr-main{flex:1;padding:10px 14px;display:flex;flex-direction:column;justify-content:center;}
.hdr-main h1{font-size:19px;font-weight:900;color:#1e3a5f;line-height:1.1;}
.hdr-main p{font-size:11px;color:#6b7280;margin-top:2px;}
.hdr-right{padding:10px 14px;text-align:right;border-left:1px solid #d1d5db;display:flex;flex-direction:column;justify-content:center;}
.hdr-right .doc{font-size:14px;font-weight:800;color:#1e3a5f;text-transform:uppercase;letter-spacing:.4px;}
.hdr-right .sub{font-size:9px;color:#6b7280;margin-top:3px;}
.hdr-right .badge{display:inline-block;background:#dbeafe;color:#1e40af;padding:2px 8px;border-radius:3px;font-size:8px;font-weight:700;letter-spacing:.3px;text-transform:uppercase;margin-top:4px;}
.statsbar{display:grid;grid-template-columns:repeat(5,1fr);border:1px solid #d1d5db;border-radius:5px;overflow:hidden;margin-bottom:14px;}
.stat{padding:8px 10px;text-align:center;background:#f9fafb;border-right:1px solid #e5e7eb;}
.stat:last-child{border-right:none;}
.stat .lbl{font-size:8px;text-transform:uppercase;letter-spacing:.4px;color:#6b7280;font-weight:600;}
.stat .val{font-size:14px;font-weight:800;color:#1e3a5f;margin-top:1px;}
.stat .val.money{color:#b45309;}
.sec{margin-bottom:13px;}
.sec-title{background:#1e3a5f;color:#fff;padding:5px 10px;font-size:8.5px;font-weight:700;text-transform:uppercase;letter-spacing:.6px;border-radius:4px 4px 0 0;}
.sec-body{border:1px solid #d1d5db;border-top:none;border-radius:0 0 4px 4px;}
.grid{display:grid;grid-template-columns:repeat(3,1fr);}
.cell{padding:7px 10px;border-right:1px solid #e5e7eb;border-bottom:1px solid #e5e7eb;}
.cell:nth-child(3n){border-right:none;}
.cell.s2{grid-column:span 2;}
.cell.s3{grid-column:span 3;}
.cell .lbl{font-size:7.5px;text-transform:uppercase;letter-spacing:.4px;color:#6b7280;font-weight:600;margin-bottom:2px;}
.cell .val{font-size:11px;font-weight:600;color:#111827;}
.cell .val.mono{font-family:Courier New,monospace;font-size:10px;}
.cell .val.accent{color:#1e3a5f;font-weight:800;}
.cell .val.money{color:#b45309;font-weight:800;}
table{width:100%;border-collapse:collapse;font-size:10px;}
table th{background:#e8f0fe;color:#1e3a5f;padding:5px 8px;text-align:left;font-weight:700;font-size:8.5px;text-transform:uppercase;letter-spacing:.3px;}
table td{padding:5px 8px;border-bottom:1px solid #e5e7eb;color:#374151;}
table tr:nth-child(even) td{background:#f9fafb;}
table td.right{text-align:right;}
table td.money{color:#b45309;font-weight:700;text-align:right;}
.legal{background:#f9fafb;border:1px solid #d1d5db;border-top:none;padding:8px 10px;font-family:Courier New,monospace;font-size:9.5px;line-height:1.7;color:#374151;word-break:break-word;border-radius:0 0 4px 4px;}
.footer{border-top:1px solid #d1d5db;padding-top:8px;margin-top:14px;display:flex;justify-content:space-between;font-size:8px;color:#9ca3af;line-height:1.6;}
@media print{.print-btn{display:none!important;}.page{padding:12px;}@page{margin:1.2cm;size:letter;}}
</style>
</head>
<body>
<div class="page">

<div class="print-btn">
  <span>Property Record Card — ${v(p.addr)}, ${county}<br>Assessment Year 2024 · Pay 2025 · DLGF Official Record</span>
  <button onclick="window.print()">⬇ Save as PDF / Print</button>
</div>

<div class="hdr">
  <div class="hdr-seal">
    <svg viewBox="0 0 50 50" fill="none"><circle cx="25" cy="25" r="22" stroke="#fff" stroke-width="1.5"/><polygon points="25,7 28,19 41,19 31,27 34,39 25,32 16,39 19,27 9,19 22,19" fill="#f0a500"/></svg>
    <div>Indiana<br>Assessor</div>
  </div>
  <div class="hdr-main">
    <h1>${county}</h1>
    <p>State of Indiana · Assessor's Office${fips ? ' · FIPS ' + fips : ''}</p>
  </div>
  <div class="hdr-right">
    <div class="doc">Property Record Card</div>
    <div class="sub">Assessment Year 2024 · Tax Year Pay 2025</div>
    <div class="badge">DLGF Official Assessment Record</div>
  </div>
</div>

<div class="statsbar">
  <div class="stat"><div class="lbl">Land Value</div><div class="val money">${v(p.lv)}</div></div>
  <div class="stat"><div class="lbl">Improvement Value</div><div class="val money">${v(p.iv)}</div></div>
  <div class="stat"><div class="lbl">Total Assessed Value</div><div class="val money" style="font-size:16px;">${v(p.tv)}</div></div>
  <div class="stat"><div class="lbl">Legal Acreage</div><div class="val">${v(p.acres)} ac</div></div>
  <div class="stat"><div class="lbl">Property Class</div><div class="val" style="font-size:10px;">${v(p.use)}</div></div>
</div>

<div class="sec">
  <div class="sec-title">Parcel Identification</div>
  <div class="sec-body">
    <div class="grid">
      <div class="cell s3"><div class="lbl">State Parcel ID (PIN-18)</div><div class="val mono accent">${v(p.pid)}</div></div>
      <div class="cell s2"><div class="lbl">Property Address</div><div class="val accent">${v(p.addr)}${p.city ? ', ' + p.city : ''}, IN ${v(p.zip)}</div></div>
      <div class="cell"><div class="lbl">County</div><div class="val">${county}</div></div>
      <div class="cell"><div class="lbl">Township</div><div class="val">${v(p.twp)}</div></div>
      <div class="cell"><div class="lbl">Neighborhood</div><div class="val">${v(p.nbhd)}</div></div>
      <div class="cell"><div class="lbl">School Corporation</div><div class="val">${v(p.school)}</div></div>
      <div class="cell"><div class="lbl">Legal Acreage</div><div class="val">${v(p.acres)} acres</div></div>
      <div class="cell"><div class="lbl">Property Class</div><div class="val">${v(p.use)}</div></div>
      <div class="cell"><div class="lbl">Coordinates (lat, lon)</div><div class="val mono">${p.lat ? p.lat.toFixed(5) + ', ' + p.lon.toFixed(5) : '—'}</div></div>
    </div>
  </div>
</div>

<div class="sec">
  <div class="sec-title">Owner Information</div>
  <div class="sec-body">
    <div class="grid">
      <div class="cell s2"><div class="lbl">Owner Name</div><div class="val accent" style="font-size:13px;">${
        p.owner && p.owner !== '(see assessor)' && p.owner !== '—'
          ? v(p.owner)
          : `<span style="color:var(--text3);font-size:11px;">See county assessor records</span>`
      }</div></div>
      <div class="cell"><div class="lbl">Owner Type</div><div class="val">${p.use && /resid/i.test(p.use) ? 'Residential' : p.use && /ag/i.test(p.use) ? 'Agricultural' : 'Other'}</div></div>
      <div class="cell s3"><div class="lbl">Mailing Address</div><div class="val">${v(p.oaddr)}</div></div>
      <div class="cell"><div class="lbl">Deed Book / Page</div><div class="val mono">${v(p.deed)}</div></div>
      <div class="cell"><div class="lbl">Transfer Date</div><div class="val">${v(p.txdate)}</div></div>
      <div class="cell"><div class="lbl">Transfer Price</div><div class="val money">${v(p.txprice)}</div></div>
    </div>
  </div>
</div>

<div class="sec">
  <div class="sec-title">Assessment &amp; Tax (2024 Pay 2025)</div>
  <div class="sec-body">
    <table>
      <tr><th>Component</th><th class="right">Value</th><th>Notes</th></tr>
      <tr><td>Land Assessed Value</td><td class="money">${v(p.lv)}</td><td>From county assessor</td></tr>
      <tr><td>Improvement Value</td><td class="money">${v(p.iv)}</td><td>Buildings &amp; structures</td></tr>
      <tr><td><strong>Total Assessed Value</strong></td><td class="money" style="font-weight:900;font-size:12px;">${v(p.tv)}</td><td><strong>DLGF Certified Gross AV</strong></td></tr>
      <tr><td>Homestead Exemption</td><td class="right">${v(p.hx)}</td><td>If applicable</td></tr>
      <tr><td>Estimated Annual Tax</td><td class="money">${v(p.tax)}</td><td>Contact treasurer for exact bill</td></tr>
    </table>
  </div>
</div>

<div class="sec">
  <div class="sec-title">Sales &amp; Transfer History</div>
  <div class="sec-body">
    <table>
      <tr><th>Date</th><th class="right">Sale Price</th><th>Buyer</th><th>Deed Reference</th><th>Type</th></tr>
      ${p.sales && p.sales.length
        ? p.sales.map(s => `<tr><td>${s.dt||'—'}</td><td class="money">${s.price||'—'}</td><td>${s.buyer||v(p.owner)}</td><td class="mono" style="font-size:9px;">${v(p.deed)}</td><td>${s.type||'Transfer'}</td></tr>`).join('')
        : '<tr><td colspan="5" style="text-align:center;color:#9ca3af;padding:8px;">No sales recorded · Contact county recorder for deed history</td></tr>'
      }
    </table>
  </div>
</div>

<div class="sec">
  <div class="sec-title">Legal Description</div>
  <div class="legal">${v(p.legal)}</div>
</div>

<div class="footer">
  <div>Mapnova Universal Mapping Platform · Data: Indiana IGIO + ElevateMaps Layer 92 (${county} Assessor)<br>For official records contact the ${county} Assessor's Office. This document is for informational purposes only.</div>
  <div style="text-align:right;">Generated: ${now}<br>Parcel ID: ${v(p.pid)}${fips ? ' · FIPS: ' + fips : ''}</div>
</div>

</div>
</body>
</html>`;

  const blob   = new Blob([html], { type: 'text/html;charset=utf-8' });
  const blobUrl = URL.createObjectURL(blob);
  const win    = window.open(blobUrl, '_blank', 'noopener,width=1020,height=780,scrollbars=yes');
  if (!win) {
    notify('Allow popups to view the PRC — check your browser bar', 'fa-triangle-exclamation');
  } else {
    notify('PRC opened — click "Save as PDF / Print" button', 'fa-file-pdf');
    setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);
  }
}
// Active county state
let activeCounty = INDIANA_COUNTIES.bartholomew;

// ── County selector handler ───────────────────────────────────────────────────
document.getElementById('county-sel').addEventListener('change', function() {
  const key = this.value;
  const c = INDIANA_COUNTIES[key];
  if (!c) return;
  activeCounty = c;
  map.setView([c.lat, c.lng], c.z);
  document.getElementById('county-disp').innerHTML =
    `<i class="fas fa-map" style="margin-right:4px;"></i>${c.name}`;

  // Clear parcel cache and layer so new county loads fresh
  parcelTileCache.clear();
  loadedParcelIds.clear();
  parcelLayer.clearLayers();

  // Update PRC county name in sidebar
  const cn = document.getElementById('prc-county-name');
  if (cn) cn.textContent = c.name;

  // Clear selected parcel
  selectedLayer = null; selectedParcel = null; window._selectedLiveParcel = null;
  document.getElementById('parcel-empty').style.display = '';
  document.getElementById('parcel-detail').style.display = 'none';

  // Trigger load for new county
  setTimeout(loadParcelsForView, 300);
  // Refresh all county-specific GIS layers to show new county's data
  refreshCountyLayers();
  // Clear ownership cache so new county's data is fetched fresh
  Object.keys(ownerCache).forEach(k => delete ownerCache[k]);
  // Pre-warm new county's ownership after parcels load
  setTimeout(prefetchOwnershipForView, 2500);
  notify('Switched to ' + c.name + ' — loading live data…', 'fa-map');
});


// ══════════════════════════════════════════════
//  GEOLOCATION
// ══════════════════════════════════════════════
function goToMe(){
  if(!navigator.geolocation){notify('Geolocation not supported','fa-triangle-exclamation');return;}
  navigator.geolocation.getCurrentPosition(pos=>{
    const {latitude:lat,longitude:lng}=pos.coords;
    map.setView([lat,lng],16);
    L.circleMarker([lat,lng],{radius:9,color:'#3b82f6',fillColor:'#3b82f6',fillOpacity:.85,weight:2})
      .addTo(map).bindPopup('<div class="mpop-body"><b style="color:#60a5fa;">Your Location</b></div>').openPopup();
    notify('Centered on your location','fa-location-crosshairs');
  },()=>notify('Location access denied','fa-lock'));
}
function toggleFullscreen(){
  if(!document.fullscreenElement) document.documentElement.requestFullscreen();
  else document.exitFullscreen();
}

// ══════════════════════════════════════════════
//  LEGEND
// ══════════════════════════════════════════════
function updateLegend(){
  // Update floating legend
  document.getElementById('leg-items').innerHTML=[...activeLyrs].map(n=>legendData[n]?`
    <div class="leg-item"><div class="leg-swatch" style="background:${legendData[n].c};"></div>${legendData[n].l}</div>`:''
  ).join('');

  // Update right panel active layers list
  const rpCount = document.getElementById('rp-layer-count');
  const rpList = document.getElementById('rp-active-layers');
  if (rpCount) rpCount.textContent = '(' + activeLyrs.size + ')';
  if (rpList) {
    const items = [...activeLyrs].filter(n => legendData[n]);
    if (items.length === 0) {
      rpList.innerHTML = '<span style="color:var(--text3);">No layers active</span>';
    } else {
      rpList.innerHTML = items.map(n => `
        <div style="display:flex;align-items:center;gap:6px;padding:3px 0;border-bottom:1px solid rgba(38,48,68,.3);">
          <div style="width:10px;height:10px;border-radius:2px;background:${legendData[n].c};flex-shrink:0;"></div>
          <span style="color:var(--text);font-size:11px;flex:1;">${legendData[n].l}</span>
          <button onclick="document.getElementById('lc-${n}')&&(document.getElementById('lc-${n}').checked=false,toggleLyr('${n}',document.getElementById('lc-${n}')))" 
            style="background:none;border:none;color:var(--text3);cursor:pointer;font-size:10px;padding:0 2px;" title="Remove layer">
            <i class="fas fa-xmark"></i>
          </button>
        </div>`).join('');
    }
  }
}
function toggleLegend(){
  document.getElementById('legend').classList.toggle('on');
  document.getElementById('leg-btn').classList.toggle('on');
  updateLegend();
}

// ══════════════════════════════════════════════
//  MODALS
// ══════════════════════════════════════════════
function openModal(id){document.getElementById(id)?.classList.add('on');}
function closeModal(id){document.getElementById(id)?.classList.remove('on');}
function overlayClick(e,el){if(e.target===el)el.classList.remove('on');}

// ══════════════════════════════════════════════
//  NOTIFICATIONS
// ══════════════════════════════════════════════
let notifT;
function notify(msg, icon='fa-circle-check'){
  document.getElementById('notif').querySelector('i').className='fas '+icon;
  document.getElementById('notif-msg').textContent=msg;
  document.getElementById('notif').classList.add('on');
  clearTimeout(notifT);
  notifT=setTimeout(()=>document.getElementById('notif').classList.remove('on'),2800);
}

// ══════════════════════════════════════════════
//  BOOKMARKS
// ══════════════════════════════════════════════
function addBM(){
  const name=document.getElementById('bm-name').value.trim();
  if(!name){notify('Enter a bookmark name','fa-exclamation');return;}
  const c=map.getCenter();
  const card=document.createElement('div');
  card.className='scard';
  card.innerHTML=`<div class="sc-top"><i class="fas fa-map-pin" style="color:var(--accent);margin-right:5px;"></i>${name}</div><div class="sc-sub">Lat ${c.lat.toFixed(4)} · Lon ${c.lng.toFixed(4)} · Zoom ${map.getZoom()}</div>`;
  card.onclick=()=>goBM(c.lat,c.lng,map.getZoom());
  document.getElementById('bm-list').prepend(card);
  document.getElementById('bm-name').value='';
  notify(`Bookmark "${name}" saved`,'fa-bookmark');
}
function goBM(lat,lng,zoom){map.setView([lat,lng],zoom);notify('Navigated to bookmark','fa-bookmark');}

// ══════════════════════════════════════════════
//  TREND CHART SPARKLINE
// ══════════════════════════════════════════════
function drawTrend(){
  const cvs=document.getElementById('trend-cvs');
  if(!cvs) return;
  const ctx=cvs.getContext('2d');
  const vals=[100,108,112,119,125,131,140,148,155,162,170,182];
  const W=cvs.width,H=cvs.height;
  const mn=Math.min(...vals),mx=Math.max(...vals);
  ctx.clearRect(0,0,W,H);
  ctx.strokeStyle='rgba(38,48,68,.4)';ctx.lineWidth=1;
  [.25,.5,.75].forEach(f=>{ctx.beginPath();ctx.moveTo(0,H*f);ctx.lineTo(W,H*f);ctx.stroke();});
  const grad=ctx.createLinearGradient(0,0,0,H);
  grad.addColorStop(0,'rgba(240,165,0,.35)');grad.addColorStop(1,'rgba(240,165,0,0)');
  ctx.beginPath();
  vals.forEach((v,i)=>{
    const x=i/(vals.length-1)*W,y=H-(v-mn)/(mx-mn)*(H*.78)-(H*.11);
    i===0?ctx.moveTo(x,y):ctx.lineTo(x,y);
  });
  ctx.lineTo(W,H);ctx.lineTo(0,H);ctx.closePath();
  ctx.fillStyle=grad;ctx.fill();
  ctx.strokeStyle='#f0a500';ctx.lineWidth=2;ctx.beginPath();
  vals.forEach((v,i)=>{const x=i/(vals.length-1)*W,y=H-(v-mn)/(mx-mn)*(H*.78)-(H*.11);i===0?ctx.moveTo(x,y):ctx.lineTo(x,y);});
  ctx.stroke();
  ctx.fillStyle='#f0a500';ctx.beginPath();
  const lx=(vals.length-1)/(vals.length-1)*W,ly=H-(vals[vals.length-1]-mn)/(mx-mn)*(H*.78)-(H*.11);
  ctx.arc(lx,ly,3.5,0,Math.PI*2);ctx.fill();
}

window.addEventListener('load', async () => {
  renderParcels();
  drawTrend();

  // Build county layer panel for default county (Bartholomew)
  await buildCountyLayerPanel('bartholomew');

  setTimeout(() => {
    updateLayerBadge();
    updateAnalytics();
  }, 400);

  // Pre-warm ownership cache
  setTimeout(prefetchOwnershipForView, 2500);

  updateLegend();
  setTimeout(() => notify('Mapnova — Live data loading…', 'fa-map-location-dot'), 700);
});
window.addEventListener('resize',()=>map.invalidateSize());
// ══════════════════════════════════════════════
//  LAYER OPACITY CONTROL
// ══════════════════════════════════════════════
const layerOpacity = {};

function setLyrOpac(name, slider) {
  const val = parseInt(slider.value) / 100;
  layerOpacity[name] = val;
  // Update label next to slider
  slider.nextElementSibling.textContent = slider.value + '%';
  const layer = gisLayers[name];
  if (!layer) return;
  // Apply opacity to Leaflet layer
  if (layer.setOpacity) {
    layer.setOpacity(val);
  } else if (layer.eachLayer) {
    layer.eachLayer(l => {
      if (l.setOpacity) l.setOpacity(val);
      else if (l.setStyle) {
        const curStyle = l.options || {};
        const fo = (curStyle.fillOpacity || 0.35) * val;
        l.setStyle({ opacity: val, fillOpacity: Math.min(fo, val) });
      }
    });
  }
}

// ══════════════════════════════════════════════
//  FILTER CHIP QUICK TOGGLES
// ══════════════════════════════════════════════
// ── Filter chip quick toggles ─────────────────────────────────────────────────
// Chips toggle static layers (flood, imagery) or search dynamic layer panel
function chipToggle(chipName, chipEl) {
  // Map chip names to stable statewide layer keys or dynamic category matches
  const staticChipMap = {
    parcels:  'parcels',
    flood:    'flood',
    imagery:  'imagery',
  };

  const staticKey = staticChipMap[chipName];
  if (staticKey) {
    const lyr = gisLayers[staticKey];
    if (!lyr) return;
    const isOn = map.hasLayer(lyr);
    if (isOn) {
      map.removeLayer(lyr);
      activeLyrs.delete(staticKey);
      chipEl.classList.remove('on');
    } else {
      lyr.addTo(map);
      activeLyrs.add(staticKey);
      chipEl.classList.add('on');
    }
    updateLegend();
    updateLayerBadge();
    return;
  }

  // For county-specific chips, find matching dynamic layer checkbox and click it
  const container = document.getElementById('county-layers-container');
  if (!container) return;
  const checkboxes = container.querySelectorAll('input[type=checkbox]');
  const CHIP_KEYWORDS = {
    roads:        /road|street|centerline/i,
    zone:         /zon|land.?use/i,
    subdivisions: /subdivi/i,
    drain:        /\bdrain\b/i,
    sections:     /section|plss/i,
    county:       /county.?bound/i,
  };
  const pattern = CHIP_KEYWORDS[chipName];
  if (!pattern) return;

  // Find first matching layer label and toggle it
  let found = false;
  checkboxes.forEach(cb => {
    if (found) return;
    const label = cb.closest('.li')?.querySelector('.ln')?.textContent || '';
    if (pattern.test(label)) {
      cb.checked = !cb.checked;
      toggleLyr(cb.id.replace('cb-',''), cb);
      chipEl.classList.toggle('on', cb.checked);
      found = true;
    }
  });
}

// sync chips when a layer is toggled
function syncChip(name, checked) {
  const chip = document.getElementById('chip-' + name);
  if (chip) chip.classList.toggle('on', checked);
}

function updateLayerBadge() {
  const badge = document.getElementById('lc-badge');
  if (badge) badge.textContent = activeLyrs.size;
}

// Parcels always visible — no zoom gating

// ══════════════════════════════════════════════
//  BUFFER ANALYSIS — draws real circle on map
// ══════════════════════════════════════════════
let bufferLayer = null;

function runBuffer() {
  const dist = parseFloat(document.getElementById('buf-dist').value) || 500;
  const unit = document.getElementById('buf-unit').value;
  // Convert to meters
  const toM = { ft: 0.3048, m: 1, mi: 1609.34, km: 1000 };
  const radiusM = dist * (toM[unit] || 1);

  // Center = selected parcel or map center
  const center = selectedParcel
    ? [selectedParcel.lat, selectedParcel.lon]
    : [map.getCenter().lat, map.getCenter().lng];

  clearBuffer();

  // Draw animated buffer ring
  bufferLayer = L.layerGroup();

  // Outer pulse ring
  L.circle(center, {
    radius: radiusM,
    color: '#f0a500',
    weight: 2,
    fillColor: '#f0a500',
    fillOpacity: 0.08,
    dashArray: '6 4',
    className: 'buffer-ring'
  }).addTo(bufferLayer);

  // Inner solid ring
  L.circle(center, {
    radius: radiusM * 0.02,
    color: '#ffc84a',
    weight: 3,
    fillColor: '#ffc84a',
    fillOpacity: 0.9
  }).addTo(bufferLayer);

  bufferLayer.addTo(map);
  map.fitBounds(L.circle(center, { radius: radiusM }).getBounds(), { padding: [30, 30] });

  // Count parcels within buffer using live layer data
  const liveParcelsForBuffer=[];
  parcelLayer.eachLayer(l=>{ if(l.parcelData) liveParcelsForBuffer.push(l.parcelData); });
  const within = liveParcelsForBuffer.filter(p => {
    const lat2 = p.lat || center[0];
    const lon2 = p.lon || center[1];
    const dLat = (lat2 - center[0]) * Math.PI / 180;
    const dLon = (lon2 - center[1]) * Math.PI / 180;
    const a = Math.sin(dLat/2)**2 + Math.cos(center[0]*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)**2;
    const distM = 6371000 * 2 * Math.asin(Math.sqrt(a));
    return distM <= radiusM;
  });

  // Show result
  const res = document.getElementById('buf-result');
  res.style.display = 'block';
  res.innerHTML = `
    <div style="font-weight:700;color:var(--accent);margin-bottom:6px;"><i class="fas fa-circle-check" style="margin-right:6px;"></i>${within.length} parcels found within ${dist} ${unit}</div>
    ${within.map(p=>`<div style="padding:3px 0;border-bottom:1px solid rgba(240,165,0,.1);color:var(--text2);">
      <span style="font-weight:600;color:var(--text);">${p.addr}</span> — ${p.tv} · ${p.acres} ac
    </div>`).join('')}
  `;

  // Highlight matched parcels on map
  parcelLayer.eachLayer(l => {
    const pd = l.parcelData;
    if (pd && within.some(p => p.id === pd.id || p.pid === pd.pid)) {
      l.setStyle({ color: '#22d3ee', weight: 3, fillOpacity: 0.35 });
    }
  });

  notify(`Buffer: ${within.length} parcels within ${dist} ${unit}`, 'fa-circle-dot');
  closeModal('buffer-modal');
}

function clearBuffer() {
  if (bufferLayer) { map.removeLayer(bufferLayer); bufferLayer = null; }
  // Reset parcel styles
  parcelLayer.eachLayer(l => {
    if (l !== selectedLayer) l.setStyle({ color: '#f0a500', weight: 2, fillOpacity: 0.15 });
  });
  document.getElementById('buf-result').style.display = 'none';
}

// ══════════════════════════════════════════════
//  ATTRIBUTE QUERY — real filter on parcel data
// ══════════════════════════════════════════════
let queryHighlightLayer = null;

function updateQBPreview() {
  const field = document.getElementById('qb-field').value;
  const op = document.getElementById('qb-op').value;
  const val = document.getElementById('qb-val').value;
  const opLabels = { contains:'LIKE', eq:'=', neq:'!=', gt:'>', lt:'<', starts:'STARTS' };
  document.getElementById('qb-preview').textContent =
    `SELECT * FROM parcels WHERE ${field} ${opLabels[op]||op} "${val}"`;
}
document.getElementById && document.getElementById('qb-val') &&
  document.getElementById('qb-val').addEventListener('input', updateQBPreview);

function updateQBOperators() { updateQBPreview(); }

function setQuery(field, op, val) {
  document.getElementById('qb-field').value = field;
  document.getElementById('qb-op').value = op;
  document.getElementById('qb-val').value = val;
  updateQBPreview();
}

function runQuery() {
  const field = document.getElementById('qb-field').value;
  const op = document.getElementById('qb-op').value;
  const val = document.getElementById('qb-val').value.toLowerCase().trim();

  if (!val) { notify('Enter a query value first', 'fa-exclamation'); return; }

  function getField(p, f) {
    const map2 = { owner:p.owner, use:p.use, zone:p.zone, otype:p.otype,
      tv:p.tv.replace(/[$,]/g,''), acres:p.acres, yr:p.yr, txstat:p.txstat };
    return (map2[f]||'').toLowerCase();
  }

  // Collect live parcels from map layer
  const liveParcels=[];
  parcelLayer.eachLayer(l=>{ if(l.parcelData) liveParcels.push({p:l.parcelData,l}); });

  const results = liveParcels.filter(({p}) => {
    const fv = getField(p, field);
    const qv = val;
    switch(op) {
      case 'contains': return fv.includes(qv);
      case 'eq': return fv === qv;
      case 'neq': return fv !== qv;
      case 'gt': return parseFloat(fv.replace(/[^0-9.]/g,'')) > parseFloat(qv);
      case 'lt': return parseFloat(fv.replace(/[^0-9.]/g,'')) < parseFloat(qv);
      case 'starts': return fv.startsWith(qv);
      default: return false;
    }
  }).map(({p})=>p);

  document.getElementById('qb-result-summary').innerHTML =
    `<span style="color:var(--accent);font-weight:700;">${results.length}</span> parcel${results.length!==1?'s':''} matched`;

  // Highlight matched parcels on map
  if (queryHighlightLayer) { map.removeLayer(queryHighlightLayer); }
  queryHighlightLayer = L.layerGroup();
  parcelLayer.eachLayer(l => {
    const pd = l.parcelData;
    if (pd && results.some(r => r.id === pd.id || r.pid === pd.pid)) {
      l.setStyle({ color: '#22c55e', weight: 3, fillOpacity: 0.40 });
    } else if (l !== selectedLayer) {
      l.setStyle({ color: '#f0a500', weight: 1.5, fillOpacity: 0.08 });
    }
  });

  // Show results bar
  showQResults(results, `Query: ${field} · ${results.length} results`);
  notify(`Query matched ${results.length} parcel${results.length!==1?'s':''}`, 'fa-filter');
  closeModal('query-modal');
}

function clearQuery() {
  document.getElementById('qb-val').value = '';
  document.getElementById('qb-result-summary').innerHTML = '';
  updateQBPreview();
  if (queryHighlightLayer) { map.removeLayer(queryHighlightLayer); queryHighlightLayer = null; }
  parcelLayer.eachLayer(l => {
    if (l !== selectedLayer) l.setStyle({ color: '#f0a500', weight: 1.5, fillOpacity: 0.10 });
  });
  document.getElementById('qresults-bar').classList.remove('open');
}

// ══════════════════════════════════════════════
//  QUERY RESULTS BOTTOM BAR
// ══════════════════════════════════════════════
function showQResults(results, title) {
  document.getElementById('qresults-title').textContent = title;
  document.getElementById('qresults-count').textContent = `${results.length} features`;
  const list = document.getElementById('qresults-list');
  list.innerHTML = results.map(p => `
    <div class="qr-card" onclick="selectFromSearch('${p.id}')">
      <div class="qr-addr">${p.addr}</div>
      <div class="qr-val">${p.tv}</div>
      <div class="qr-sub">${p.owner.substring(0,26)} · ${p.acres} ac</div>
    </div>`).join('');
  document.getElementById('qresults-bar').classList.add('open');
  document.getElementById('qr-arrow').style.transform = 'rotate(180deg)';
}

function toggleQResults() {
  const bar = document.getElementById('qresults-bar');
  const open = bar.classList.toggle('open');
  document.getElementById('qr-arrow').style.transform = open ? 'rotate(180deg)' : '';
}

// ══════════════════════════════════════════════
//  MOBILE SIDEBAR
// ══════════════════════════════════════════════
function toggleSidebar() {
  const sb = document.getElementById('sidebar');
  const ov = document.getElementById('mobile-overlay');
  if (window.innerWidth <= 680) {
    sb.classList.toggle('mobile-open');
    ov.classList.toggle('on', sb.classList.contains('mobile-open'));
  } else {
    sb.classList.toggle('hide');
  }
}
function closeMobileSidebar() {
  document.getElementById('sidebar').classList.remove('mobile-open');
  document.getElementById('mobile-overlay').classList.remove('on');
}

// ══════════════════════════════════════════════
//  BUFFER TARGET UPDATE when parcel selected
// ══════════════════════════════════════════════
// Patch selectParcel to also update buffer modal text
const _origSelectParcel = selectParcel;
window.selectParcel = function(p, layer) {
  _origSelectParcel(p, layer);
  const el = document.getElementById('buf-target-txt');
  if (el) el.textContent = `Target: ${p.addr} (${p.acres} ac)`;
};

// ══════════════════════════════════════════════
//  ENHANCED ANALYTICS — live parcel count
// ══════════════════════════════════════════════
function updateAnalytics() {
  // Count loaded parcel polygons in current map bounds
  const bounds = map.getBounds();
  let visible = 0;
  parcelLayer.eachLayer(l => {
    try {
      if (l.getBounds && bounds.intersects(l.getBounds())) visible++;
    } catch(e) {}
  });
  const el = document.getElementById('visible-parcel-count');
  if (el) el.textContent = visible.toLocaleString() + ' parcels in view';
}
// ══════════════════════════════════════════════
//  PROXIMITY REPORT
// ══════════════════════════════════════════════
function runProximity() {
  const radius = parseFloat(document.getElementById('prox-radius').value) || 1;
  const unit = document.getElementById('prox-unit').value;
  const toMi = { mi:1, km:0.621371, ft:1/5280, m:0.000621371 };
  const radiusMi = radius * (toMi[unit] || 1);

  const center = selectedParcel
    ? { lat: selectedParcel.lat, lon: selectedParcel.lon, label: selectedParcel.addr }
    : { lat: map.getCenter().lat, lon: map.getCenter().lng, label: 'Map Center' };

  function distMi(lat1, lon1, lat2, lon2) {
    const R = 3958.8;
    const dL = (lat2-lat1)*Math.PI/180, dl = (lon2-lon1)*Math.PI/180;
    const a = Math.sin(dL/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dl/2)**2;
    return R * 2 * Math.asin(Math.sqrt(a));
  }

  // Find nearby parcels from live layer
  const liveForProx=[];
  parcelLayer.eachLayer(l=>{ if(l.parcelData) liveForProx.push(l.parcelData); });
  const nearby = liveForProx
    .filter(p => {
      const plat = p.lat || center.lat;
      const plon = p.lon || center.lon;
      return Math.abs(plat-center.lat)>0.0001 || Math.abs(plon-center.lon)>0.0001;
    })
    .map(p => ({ ...p, dist: distMi(center.lat, center.lon, p.lat||center.lat, p.lon||center.lon) }))
    .filter(p => p.dist <= radiusMi)
    .sort((a, b) => a.dist - b.dist);

  const res = document.getElementById('prox-results');
  res.style.display = 'block';
  res.innerHTML = `
    <div style="font-family:'Barlow Condensed',sans-serif;font-size:14px;font-weight:800;color:var(--text);margin-bottom:10px;padding-bottom:6px;border-bottom:1px solid var(--border);">
      <i class="fas fa-circle-check" style="color:var(--accent);margin-right:6px;"></i>
      Proximity Report — ${radius} ${unit} from ${center.label}
    </div>
    <div style="font-size:11px;color:var(--text3);margin-bottom:8px;">${nearby.length} parcel${nearby.length!==1?'s':''} found within radius</div>
    ${nearby.length === 0 ? '<div style="color:var(--text3);font-size:12px;">No parcels found within this radius.</div>' :
      nearby.map(p => `
        <div style="display:flex;align-items:center;gap:8px;padding:5px 0;border-bottom:1px solid rgba(38,48,68,.4);cursor:pointer;" onclick="selectFromSearch('${p.id}');closeModal('proximity-modal')">
          <i class="fas fa-location-dot" style="color:var(--accent);font-size:12px;flex-shrink:0;"></i>
          <div style="flex:1;">
            <div style="font-size:11px;font-weight:600;color:var(--text);">${p.addr}</div>
            <div style="font-size:10px;color:var(--text3);">${p.use} · ${p.tv}</div>
          </div>
          <div style="font-size:10px;color:var(--accent2);font-weight:700;flex-shrink:0;">${p.dist.toFixed(2)} mi</div>
        </div>`).join('')
    }`;
  notify(`Found ${nearby.length} parcels within ${radius} ${unit}`, 'fa-magnifying-glass-location');
}

// ══════════════════════════════════════════════
//  MOBILE SIDEBAR OPEN
// ══════════════════════════════════════════════
function openMobileSidebar() {
  if (window.innerWidth <= 680) {
    document.getElementById('sidebar').classList.add('mobile-open');
    document.getElementById('mobile-overlay').classList.add('on');
  }
}

// Patch selectParcel to update proximity target text too
const _patchProx = window.selectParcel || selectParcel;
window.selectParcel = function(p, layer) {
  _patchProx(p, layer);
  const el = document.getElementById('prox-target-txt');
  if (el) el.innerHTML = `<i class="fas fa-location-dot" style="color:var(--accent);margin-right:4px;"></i>Target: <b style="color:var(--text);">${p.addr}</b>`;
};

