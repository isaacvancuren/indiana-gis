/* Mapnova Schneider WFS Fallback v3
 *
 * Runtime probe + register for IN counties (and now non-IN counties too)
 * that aren't yet in COUNTY_PARCEL_APIS.
 *
 * Background: Schneider Geospatial publishes parcel FeatureServers under
 * deterministic URL patterns:
 *   IN (Beacon)          : wfs.schneidercorp.com/.../   <County>CountyIN_WFS/MapServer
 *   Other states (qPublic): qpublic.net/<state>/<county> (parcel layer)
 *   Both products mirror the same WFS architecture.
 *
 * Many counties on Beacon / qPublic also expose this WFS publicly. We
 * probe at runtime — when the user selects a county that has no Tier
 * 1/2/3 entry, we ask Schneider for the layer list, find the parcels
 * layer, infer the field mapping, and register it in COUNTY_PARCEL_APIS
 * so the existing fetch pipeline picks it up automatically.
 *
 * Failure modes are silent: if the probe 404s or the service doesn't have
 * a parcels-shaped layer, the county stays unconfigured and the existing
 * IGIO fallback + Beacon deep-link continue to work.
 *
 * Probes are cached in sessionStorage so repeated county selects don't
 * re-probe. Cache key: 'mn2-schneider-probe:<county>'. Value: JSON
 * { ts, ok, config? }.
 */
(function(){
  'use strict';
  if (window.__mnSchneiderFallbackVersion === 3) return;
  window.__mnSchneiderFallbackVersion = 3;

  const HOST = 'https://wfs.schneidercorp.com/arcgis/rest/services';
  const TIMEOUT_MS = 6000;
  const CACHE_TTL_MS = 12 * 60 * 60 * 1000; // 12 hours

  // Field-name patterns to detect from layer schemas. Order = priority.
  const PIN_FIELDS    = ['pin_18','PIN_18','PARCEL_NUM','PARCELNUM','PARCEL_ID','PARCELID','PIN','PARID','STATE_PARCEL_ID','STATEPARCELID','PARCEL_NUMBER','TaxParcel'];
  const OWNER_FIELDS  = ['owner','OWNER','OWNER1','Owner','Owners','OWNER_NAME','OWNERNAME','OWNERFULL','FULLOWNERNAME','OWNER_FULL','DEEDEDOWNR'];
  const ADDR_FIELDS   = ['property_street','PROPERTY_ADDRESS','PROP_ADDR','PROP_STREE','SITE_ADDR','LOCADDRESS','Property_Street','prop_str','SITUS_ADDRESS','SITUSADDRESS','SiteAddress'];
  const CITY_FIELDS   = ['property_city_st_zip','PROP_CITY','prop_city','LOCCITY','Property_City'];
  const ZIP_FIELDS    = ['PROP_ZIP','prop_zip','LOCZIP','Property_Zip'];
  const ACRES_FIELDS  = ['legal_acreage','LEG_ACR','Acreage','ACRES','Legal_Ac','CALC_ACRES'];
  const AV_FIELDS     = ['tot_assessed_value','AVTOTGROSS','TotalValue','ASSESSED_VALUE','CERT_VALUE','TOTAL_AV','AV_TOTAL'];
  const LEGAL_FIELDS  = ['legal_desc','LEGAL','LEG_DESC','Legal_Desc','Description','LEGAL_DESCRIPTION_'];
  const SALEDT_FIELDS = ['latest_sale_date','LASTTRANS','XFER_DATE','LSTXFRDATE','Latest_Sale_Date'];
  const SALEPR_FIELDS = ['latest_sale_price','CONSIDERAT','Latest_Sale_Price'];
  const CLASS_FIELDS  = ['prop_class_desc','PROPERTY_C','PROP_CLASS','PropertyCl','PROPUSE','PROP_Class_Desc'];

  const PARCEL_TITLE_HINTS = /parcel|tax\s?parcel|cama|property/i;

  function cacheGet(county) {
    try {
      const raw = sessionStorage.getItem('mn2-schneider-probe:' + county);
      if (!raw) return null;
      const j = JSON.parse(raw);
      if (!j || (j.ts && Date.now() - j.ts > CACHE_TTL_MS)) return null;
      return j;
    } catch(_e) { return null; }
  }
  function cacheSet(county, val) {
    try { sessionStorage.setItem('mn2-schneider-probe:' + county, JSON.stringify(Object.assign({ ts: Date.now() }, val))); } catch(_e){}
  }

  function fetchJson(url) {
    return new Promise(function(resolve){
      let done = false;
      const timer = setTimeout(function(){ if (!done) { done = true; resolve(null); } }, TIMEOUT_MS);
      fetch(url + (url.indexOf('?') >= 0 ? '&' : '?') + 'f=json', { credentials: 'omit' })
        .then(function(r){ return r.ok ? r.json() : null; })
        .then(function(j){ if (!done) { done = true; clearTimeout(timer); resolve(j); } })
        .catch(function(){ if (!done) { done = true; clearTimeout(timer); resolve(null); } });
    });
  }

  function pickField(layerFields, candidates) {
    if (!Array.isArray(layerFields)) return null;
    const names = layerFields.map(function(f){ return f && (f.name || f); });
    for (let i = 0; i < candidates.length; i++) {
      const idx = names.indexOf(candidates[i]);
      if (idx >= 0) return candidates[i];
    }
    // Case-insensitive secondary pass
    const lower = names.map(function(n){ return (n||'').toLowerCase(); });
    for (let j = 0; j < candidates.length; j++) {
      const idx = lower.indexOf(candidates[j].toLowerCase());
      if (idx >= 0) return names[idx];
    }
    return null;
  }

  function camelCounty(county) {
    // Beacon uses CamelCase: bartholomew -> Bartholomew, dekalb -> DeKalb,
    // lagrange -> LaGrange, laporte -> LaPorte, stjoseph -> StJoseph
    const SPECIAL = {
      dekalb: 'DeKalb', lagrange: 'LaGrange', laporte: 'LaPorte', stjoseph: 'StJoseph'
    };
    if (SPECIAL[county]) return SPECIAL[county];
    return county.charAt(0).toUpperCase() + county.slice(1);
  }

  function buildConfigFromLayer(svcUrl, layer) {
    const fields = layer.fields || [];
    const pin    = pickField(fields, PIN_FIELDS);
    const owner  = pickField(fields, OWNER_FIELDS);
    if (!pin || !owner) return null; // no parcel-shaped layer
    const cfg = {
      url:       svcUrl + '/' + layer.id + '/query',
      pinField:  pin,
      ownerField: owner,
      addrField:  pickField(fields, ADDR_FIELDS),
      cityField:  pickField(fields, CITY_FIELDS),
      zipField:   pickField(fields, ZIP_FIELDS),
      acresField: pickField(fields, ACRES_FIELDS),
      avField:    pickField(fields, AV_FIELDS),
      legalField: pickField(fields, LEGAL_FIELDS),
      saleDateField: pickField(fields, SALEDT_FIELDS),
      salePriceField: pickField(fields, SALEPR_FIELDS),
      classField: pickField(fields, CLASS_FIELDS),
      schema:     'schneiderprobed'
    };
    return cfg;
  }

  async function probeCounty(county, stateCode) {
    stateCode = stateCode || 'IN';
    const cacheKey = stateCode + ':' + county;
    const cached = cacheGet(cacheKey);
    if (cached) return cached.ok ? cached.config : null;

    const camel = camelCounty(county);
    const svcUrl = HOST + '/' + camel + 'County' + stateCode + '_WFS/MapServer';
    const meta = await fetchJson(svcUrl);
    if (!meta || !Array.isArray(meta.layers)) {
      cacheSet(cacheKey, { ok: false });
      return null;
    }
    // Find candidate layers — title hints first, then probe field schemas
    const candidates = meta.layers
      .filter(function(l){ return l && l.id != null && (PARCEL_TITLE_HINTS.test(l.name||'') || true); })
      .sort(function(a,b){
        // Prefer named "Parcel*" layers
        const ap = PARCEL_TITLE_HINTS.test(a.name||'') ? 0 : 1;
        const bp = PARCEL_TITLE_HINTS.test(b.name||'') ? 0 : 1;
        return ap - bp;
      });

    for (let i = 0; i < candidates.length && i < 6; i++) {
      const layerMeta = await fetchJson(svcUrl + '/' + candidates[i].id);
      if (!layerMeta) continue;
      if (layerMeta.geometryType !== 'esriGeometryPolygon') continue;
      const cfg = buildConfigFromLayer(svcUrl, layerMeta);
      if (cfg) {
        const QPUBLIC = new Set(['KY','GA','AL','FL','MS','TN','NC','SC','LA','MD','VA','WV','AR']);
        const host = QPUBLIC.has(stateCode) ? 'qpublic.schneidercorp.com' : 'beacon.schneidercorp.com';
        cfg.lookupUrl = 'https://' + host + '/?site=' + camel + 'County' + stateCode;
        cacheSet(cacheKey, { ok: true, config: cfg });
        return cfg;
      }
    }
    cacheSet(cacheKey, { ok: false });
    return null;
  }

  function alreadyConfigured(county) {
    if (window.EM_LAYER92 && window.EM_LAYER92[county]) return true;
    if (window.COUNTY_PARCEL_APIS && window.COUNTY_PARCEL_APIS[county]) return true;
    if (window.WTH_GIS && window.WTH_GIS[county]) return true;
    return false;
  }

  function getCountyKey() {
    if (typeof window.getCountyKey === 'function') return window.getCountyKey();
    if (window.activeCounty && window.activeCounty.name) {
      return window.activeCounty.name.toLowerCase().replace(' county','').replace(/[^a-z]/g,'');
    }
    return null;
  }

  function activeStateCode() {
    try {
      if (window.MNStates && typeof window.MNStates.active === 'function') {
        return window.MNStates.active() || 'IN';
      }
    } catch(_e){}
    return 'IN';
  }

  async function maybeProbe() {
    const key = getCountyKey();
    if (!key || key === 'all') return;
    if (alreadyConfigured(key)) return;
    const stateCode = activeStateCode();
    // For IN we have the explicit Beacon WFS host pattern. For other states
    // the public Schneider WFS host is the same — services aren't suffixed
    // with the state, just the county name + _WFS. Try the same probe path
    // with state-suffixed county name. Failures stay silent.
    const cfg = await probeCounty(key, stateCode);
    if (cfg) {
      window.COUNTY_PARCEL_APIS = window.COUNTY_PARCEL_APIS || {};
      window.COUNTY_PARCEL_APIS[key] = cfg;
      console.log('[mn2-schneider-fallback] auto-registered', stateCode, key, '→', cfg.url);
      try { window.dispatchEvent(new CustomEvent('mn:county-config-added', { detail: { county: key, state: stateCode, source: 'schneider-fallback' } })); } catch(_e){}
      try {
        if (typeof window.notify === 'function') {
          var pretty = key.charAt(0).toUpperCase() + key.slice(1);
          window.notify('Live owner data activated for ' + pretty + ' County (' + stateCode + ')', 'fa-check-circle');
        }
      } catch (_e) {}
    } else {
      // Quiet — many counties just aren't on Schneider's public WFS. The
      // Beacon / qPublic deep-link button in the popup remains as the
      // user's escape hatch.
    }
  }

  function start() {
    // Probe on county change. The app updates window.activeCounty when the
    // user picks a county; poll for changes.
    let lastKey = null;
    setInterval(function(){
      const k = getCountyKey();
      if (k && k !== lastKey) { lastKey = k; maybeProbe(); }
    }, 800);
    // Also probe on initial load (after a short delay so the catalog is ready).
    setTimeout(maybeProbe, 1500);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }

  window.MNSchneiderFallback = { probeCounty: probeCounty, maybeProbe: maybeProbe };
})();
