/* mn-states.js - Multi-state parcel infrastructure for Mapnova
   Provides STATES registry, state-switcher UI, and per-state parcel data routing.
   Indiana remains default; all other states are wired progressively.
*/
(function(){
  // ----- STATES REGISTRY (50 + DC) -----
  var STATES = {
    AL: {n:'Alabama', fips:'01', ab:'AL', c:[-86.79,32.81], b:[-88.47,30.14,-84.89,35.01]},
    AK: {n:'Alaska', fips:'02', ab:'AK', c:[-154,64.2], b:[-179.15,51.21,179.78,71.44]},
    AZ: {n:'Arizona', fips:'04', ab:'AZ', c:[-111.43,34.27], b:[-114.82,31.33,-109.05,37]},
    AR: {n:'Arkansas', fips:'05', ab:'AR', c:[-92.37,34.97], b:[-94.62,33,-89.64,36.5]},
    CA: {n:'California', fips:'06', ab:'CA', c:[-119.42,36.78], b:[-124.48,32.53,-114.13,42.01]},
    CO: {n:'Colorado', fips:'08', ab:'CO', c:[-105.55,39.06], b:[-109.06,36.99,-102.04,41]},
    CT: {n:'Connecticut', fips:'09', ab:'CT', c:[-72.76,41.6], b:[-73.73,40.98,-71.79,42.05]},
    DE: {n:'Delaware', fips:'10', ab:'DE', c:[-75.51,39.32], b:[-75.79,38.45,-75.05,39.84]},
    DC: {n:'D.C.', fips:'11', ab:'DC', c:[-77.03,38.9], b:[-77.12,38.79,-76.91,38.99]},
    FL: {n:'Florida', fips:'12', ab:'FL', c:[-81.68,27.77], b:[-87.63,24.52,-79.97,31]},
    GA: {n:'Georgia', fips:'13', ab:'GA', c:[-83.64,32.96], b:[-85.61,30.36,-80.84,35]},
    HI: {n:'Hawaii', fips:'15', ab:'HI', c:[-157.5,20.79], b:[-160.25,18.91,-154.81,22.24]},
    ID: {n:'Idaho', fips:'16', ab:'ID', c:[-114.48,44.24], b:[-117.24,42,-111.04,49]},
    IL: {n:'Illinois', fips:'17', ab:'IL', c:[-89.4,40.35], b:[-91.51,36.97,-87.02,42.51]},
    IN: {n:'Indiana', fips:'18', ab:'IN', c:[-86.26,39.85], b:[-88.1,37.77,-84.78,41.76]},
    IA: {n:'Iowa', fips:'19', ab:'IA', c:[-93.21,42.01], b:[-96.64,40.38,-90.14,43.5]},
    KS: {n:'Kansas', fips:'20', ab:'KS', c:[-98.38,38.53], b:[-102.05,36.99,-94.59,40]},
    KY: {n:'Kentucky', fips:'21', ab:'KY', c:[-84.67,37.67], b:[-89.57,36.5,-81.96,39.15]},
    LA: {n:'Louisiana', fips:'22', ab:'LA', c:[-91.87,31.17], b:[-94.04,28.93,-88.82,33.02]},
    ME: {n:'Maine', fips:'23', ab:'ME', c:[-69.38,44.69], b:[-71.08,43.06,-66.95,47.46]},
    MD: {n:'Maryland', fips:'24', ab:'MD', c:[-76.8,39.06], b:[-79.49,37.91,-75.05,39.72]},
    MA: {n:'Massachusetts', fips:'25', ab:'MA', c:[-71.53,42.23], b:[-73.51,41.18,-69.93,42.89]},
    MI: {n:'Michigan', fips:'26', ab:'MI', c:[-84.54,43.33], b:[-90.42,41.7,-82.41,48.3]},
    MN: {n:'Minnesota', fips:'27', ab:'MN', c:[-93.9,45.69], b:[-97.24,43.5,-89.49,49.38]},
    MS: {n:'Mississippi', fips:'28', ab:'MS', c:[-89.68,32.74], b:[-91.66,30.17,-88.1,35.01]},
    MO: {n:'Missouri', fips:'29', ab:'MO', c:[-92.29,38.46], b:[-95.77,35.99,-89.1,40.61]},
    MT: {n:'Montana', fips:'30', ab:'MT', c:[-110.45,46.92], b:[-116.05,44.36,-104.04,49]},
    NE: {n:'Nebraska', fips:'31', ab:'NE', c:[-99.9,41.13], b:[-104.05,40,-95.31,43]},
    NV: {n:'Nevada', fips:'32', ab:'NV', c:[-117.06,38.31], b:[-120.01,35,-114.04,42]},
    NH: {n:'New Hampshire', fips:'33', ab:'NH', c:[-71.56,43.45], b:[-72.56,42.7,-70.61,45.31]},
    NJ: {n:'New Jersey', fips:'34', ab:'NJ', c:[-74.52,40.3], b:[-75.56,38.93,-73.89,41.36]},
    NM: {n:'New Mexico', fips:'35', ab:'NM', c:[-106.25,34.84], b:[-109.05,31.33,-103,37]},
    NY: {n:'New York', fips:'36', ab:'NY', c:[-74.95,42.17], b:[-79.76,40.5,-71.86,45.02]},
    NC: {n:'North Carolina', fips:'37', ab:'NC', c:[-79.81,35.63], b:[-84.32,33.84,-75.46,36.59]},
    ND: {n:'North Dakota', fips:'38', ab:'ND', c:[-99.78,47.53], b:[-104.05,45.94,-96.55,49]},
    OH: {n:'Ohio', fips:'39', ab:'OH', c:[-82.76,40.39], b:[-84.82,38.4,-80.52,41.98]},
    OK: {n:'Oklahoma', fips:'40', ab:'OK', c:[-96.93,35.57], b:[-103,33.62,-94.43,37]},
    OR: {n:'Oregon', fips:'41', ab:'OR', c:[-122.07,44.57], b:[-124.57,41.99,-116.46,46.3]},
    PA: {n:'Pennsylvania', fips:'42', ab:'PA', c:[-77.21,40.59], b:[-80.52,39.72,-74.69,42.27]},
    RI: {n:'Rhode Island', fips:'44', ab:'RI', c:[-71.51,41.68], b:[-71.91,41.13,-71.12,42.02]},
    SC: {n:'South Carolina', fips:'45', ab:'SC', c:[-80.95,33.86], b:[-83.35,32.03,-78.55,35.22]},
    SD: {n:'South Dakota', fips:'46', ab:'SD', c:[-99.44,44.3], b:[-104.06,42.48,-96.44,45.95]},
    TN: {n:'Tennessee', fips:'47', ab:'TN', c:[-86.69,35.75], b:[-90.31,34.98,-81.65,36.68]},
    TX: {n:'Texas', fips:'48', ab:'TX', c:[-97.56,31.05], b:[-106.65,25.84,-93.51,36.5]},
    UT: {n:'Utah', fips:'49', ab:'UT', c:[-111.86,40.15], b:[-114.05,37,-109.04,42]},
    VT: {n:'Vermont', fips:'50', ab:'VT', c:[-72.71,44.04], b:[-73.44,42.73,-71.46,45.02]},
    VA: {n:'Virginia', fips:'51', ab:'VA', c:[-78.17,37.77], b:[-83.68,36.54,-75.24,39.47]},
    WA: {n:'Washington', fips:'53', ab:'WA', c:[-121.49,47.4], b:[-124.85,45.54,-116.92,49]},
    WV: {n:'West Virginia', fips:'54', ab:'WV', c:[-80.95,38.49], b:[-82.64,37.2,-77.72,40.64]},
    WI: {n:'Wisconsin', fips:'55', ab:'WI', c:[-89.61,44.27], b:[-92.89,42.49,-86.81,47.08]},
    WY: {n:'Wyoming', fips:'56', ab:'WY', c:[-107.3,42.76], b:[-111.05,41,-104.05,45.01]},
  };

  // ----- PER-STATE PARCEL SOURCE CONFIG -----
  // Each entry maps state code to its parcel data source.
  // type:"esri" -> ArcGIS REST FeatureService that supports envelope queries
  // type:"none" -> no statewide source; can be filled in per-county later
  // fields: maps source field names to canonical schema (parcel_id, prop_add, prop_city, prop_zip, owner, dlgf_prop_class_code, latitude, longitude)
  // whereTpl: WHERE clause template; {fips} replaced with county FIPS digits if active
  var SOURCES = {
    IN: {
      type: "esri",
      url:  "https://gisdata.in.gov/server/rest/services/Hosted/Parcel_Boundaries_of_Indiana_Current/FeatureServer/0/query",
      outFields: "parcel_id,prop_add,prop_city,prop_zip,dlgf_prop_class_code,state_parcel_id,latitude,longitude",
      whereTpl: "county_fips={fips}",
      fields: null /* canonical already */
    }
  };

  // ----- ACTIVE STATE -----
  var DEFAULT_STATE = "IN";
  function getActive(){ return localStorage.getItem("mn:activeState") || DEFAULT_STATE; }
  function setActive(code){
    if(!STATES[code]) return false;
    localStorage.setItem("mn:activeState", code);
    window.__activeState = code;
    document.dispatchEvent(new CustomEvent("mn:stateChange",{detail:{code:code}}));
    return true;
  }

  // ----- API EXPOSED -----
  window.MNStates = {
    list: STATES,
    sources: SOURCES,
    active: getActive,
    set: setActive,
    get: function(code){ return STATES[code]; },
    flyTo: function(code){
      var s = STATES[code]; if(!s) return false;
      var m = window.__leafletMap || _findMap();
      if(!m) return false;
      var bb = s.b;
      m.fitBounds([[bb[1],bb[0]],[bb[3],bb[2]]]);
      return true;
    },
    addSource: function(code, src){ SOURCES[code] = src; }
  };

  // ----- MAP DISCOVERY (find Leaflet instance) -----
  function _findMap(){
    if(window.__leafletMap) return window.__leafletMap;
    if(!window.L || !L.Map) return null;
    var orig = L.Map.prototype.getZoom;
    L.Map.prototype.getZoom = function(){
      window.__leafletMap = this;
      L.Map.prototype.getZoom = orig;
      return orig.call(this);
    };
    try { window.dispatchEvent(new Event("resize")); } catch(e){}
    return window.__leafletMap;
  }
  setTimeout(_findMap, 500);
  setTimeout(_findMap, 1500);
  setTimeout(_findMap, 3000);

  // ----- STATE-AWARE FETCH INTERCEPTOR -----
  // Indiana original parcel queries hit gisdata.in.gov. When activeState != IN,
  // we rewrite the URL to the active state's SOURCE and normalize the response.
  // If the state has no statewide SOURCE entry but a county is selected, fall
  // back to the per-county GDIT catalog (window.MNCountyParcels.lookup).
  var IN_PATTERN = /gisdata\.in\.gov\/server\/rest\/services\/Hosted\/Parcel_Boundaries_of_Indiana_Current\/FeatureServer\/0\/query/;
  var origFetch = window.fetch.bind(window);
  window.fetch = function(input, init){
    try {
      var url = (typeof input === "string") ? input : (input && input.url);
      if (url && IN_PATTERN.test(url)) {
        var active = getActive();
        if (active !== "IN") {
          var src = SOURCES[active];
          if (src && src.type === "esri") {
            var rewritten = _rewriteUrl(url, src, active);
            return origFetch(rewritten, init).then(function(r){
              if (!r.ok) return r;
              return r.clone().json().then(function(data){
                var normalized = _normalizeFeatures(data, src, active);
                return new Response(JSON.stringify(normalized), {headers:{"content-type":"application/json"}, status:200});
              }).catch(function(){ return r; });
            });
          }
          // No statewide source \u2014 try GDIT per-county fallback
          var countyAttrs = _getActiveCountyAttrs();
          if (countyAttrs && window.MNCountyParcels && typeof window.MNCountyParcels.lookup === "function") {
            return _gditCountyFetch(url, active, countyAttrs).catch(function(){
              return new Response(JSON.stringify({type:"FeatureCollection",features:[]}),{headers:{"content-type":"application/json"}});
            });
          }
          // Final fallback: empty
          return Promise.resolve(new Response(JSON.stringify({type:"FeatureCollection",features:[]}),{headers:{"content-type":"application/json"}}));
        }
      }
    } catch(e){ console.warn("[mn-states] fetch hook error", e); }
    return origFetch(input, init);
  };

  // ----- GDIT PER-COUNTY FALLBACK -----
  // For states with no statewide ESRI source, the GDIT catalog
  // (window.MN_COUNTY_PARCELS, populated by mn-county-parcels.js) often has
  // per-county FeatureServers. Probe the layer schema, run an envelope query,
  // and normalize the response into the same GeoJSON shape the rest of the
  // app expects.
  var _gditSchemaCache = {};
  function _gditFieldName(fields, candidates){
    if (!Array.isArray(fields)) return null;
    var names = fields.map(function(f){ return f && (f.name || f); });
    var lower = names.map(function(n){ return (n||"").toLowerCase(); });
    for (var i = 0; i < candidates.length; i++) {
      var idx = names.indexOf(candidates[i]);
      if (idx >= 0) return candidates[i];
    }
    for (var j = 0; j < candidates.length; j++) {
      var idx2 = lower.indexOf(candidates[j].toLowerCase());
      if (idx2 >= 0) return names[idx2];
    }
    return null;
  }
  async function _gditProbeSchema(svcUrl){
    if (_gditSchemaCache[svcUrl]) return _gditSchemaCache[svcUrl];
    try {
      var r = await origFetch(svcUrl + (svcUrl.indexOf("?") >= 0 ? "&" : "?") + "f=json", { credentials: "omit" });
      if (!r.ok) return null;
      var meta = await r.json();
      var fields = (meta && meta.fields) || [];
      var schema = {
        parcel_id: _gditFieldName(fields, ["parcel_id","PARCEL_ID","PARCELID","PARCEL_NUM","PARCELNUM","PIN","PARID","PIN_18","pin_18","STATE_PARCEL_ID","TaxParcel","ParcelNumber"]),
        owner:     _gditFieldName(fields, ["owner","OWNER","OWNER1","Owner","OWNER_NAME","OWNERNAME","OwnerName","FULLOWNERNAME","DEEDEDOWNR"]),
        prop_add:  _gditFieldName(fields, ["prop_add","PROP_ADDR","PROPERTY_ADDRESS","SITUS_ADDRESS","SITE_ADDR","property_street","Property_Street","SiteAddress","ADDRESS"]),
        prop_city: _gditFieldName(fields, ["prop_city","PROP_CITY","CITY","SITUS_CITY","SiteCity"]),
        prop_zip:  _gditFieldName(fields, ["prop_zip","PROP_ZIP","ZIP","ZIPCODE","SITUS_ZIP","SiteZip"]),
        class_code:_gditFieldName(fields, ["dlgf_prop_class_code","PROP_CLASS","PROPERTY_C","prop_class_desc","PropertyClass","CLASS","ClassCode"])
      };
      _gditSchemaCache[svcUrl] = schema;
      return schema;
    } catch(e) { return null; }
  }
  async function _gditCountyFetch(origUrl, stateCode, countyAttrs){
    var basename = (countyAttrs.text || "").replace(/\s*County\s*$/i,"").replace(/\s*Borough\s*$/i,"").replace(/\s*Census Area\s*$/i,"").trim();
    var entry = await window.MNCountyParcels.lookup(stateCode, basename);
    if (!entry || !entry.u) return new Response(JSON.stringify({type:"FeatureCollection",features:[]}),{headers:{"content-type":"application/json"}});
    var svcUrl = entry.u.replace(/\/$/,"");
    var queryUrl = /\/(query|FeatureServer\/\d+|MapServer\/\d+)$/.test(svcUrl) ? svcUrl : svcUrl;
    if (!/\/query$/.test(queryUrl)) queryUrl = queryUrl + "/query";
    var schema = await _gditProbeSchema(svcUrl);
    var origQp = new URL(origUrl).searchParams;
    var nu = new URL(queryUrl);
    var np = nu.searchParams;
    np.set("geometry", origQp.get("geometry") || "");
    np.set("geometryType", origQp.get("geometryType") || "esriGeometryEnvelope");
    np.set("inSR", origQp.get("inSR") || "4326");
    np.set("spatialRel", origQp.get("spatialRel") || "esriSpatialRelIntersects");
    np.set("outFields", "*");
    np.set("returnGeometry","true");
    np.set("outSR","4326");
    np.set("resultRecordCount", origQp.get("resultRecordCount") || "2000");
    np.set("where","1=1");
    np.set("f","geojson");
    var r = await origFetch(nu.toString(), { credentials: "omit" });
    if (!r.ok) return new Response(JSON.stringify({type:"FeatureCollection",features:[]}),{headers:{"content-type":"application/json"}});
    var data = await r.json();
    if (!data || !data.features) return new Response(JSON.stringify({type:"FeatureCollection",features:[]}),{headers:{"content-type":"application/json"}});
    var fmap = schema || {};
    var normalized = {
      type: "FeatureCollection",
      features: data.features.map(function(f){
        var p = f.properties || {};
        function S(v){ return v == null ? "" : String(v); }
        function N(v){ var n = parseFloat(v); return isFinite(n) ? n : 0; }
        var np2 = {
          parcel_id:           S(fmap.parcel_id ? p[fmap.parcel_id] : (p.parcel_id || p.PARCEL_ID || p.PARCELID)),
          state_parcel_id:     S(fmap.parcel_id ? p[fmap.parcel_id] : (p.state_parcel_id || p.parcel_id || p.PARCEL_ID)),
          prop_add:            S(fmap.prop_add ? p[fmap.prop_add] : ""),
          prop_city:           S(fmap.prop_city ? p[fmap.prop_city] : ""),
          prop_zip:            S(fmap.prop_zip ? p[fmap.prop_zip] : ""),
          dlgf_prop_class_code:S(fmap.class_code ? p[fmap.class_code] : ""),
          owner:               S(fmap.owner ? p[fmap.owner] : ""),
          latitude:            0,
          longitude:           0,
          _state:              stateCode,
          _src:                p
        };
        return { type: "Feature", geometry: f.geometry, properties: np2 };
      })
    };
    return new Response(JSON.stringify(normalized), {headers:{"content-type":"application/json"}, status:200});
  }

  function _getActiveCountyAttrs(){
    try {
      var cs = document.getElementById("county-sel");
      if (!cs || !cs.value || cs.value === "all") return null;
      var opt = cs.options[cs.selectedIndex];
      if (!opt) return null;
      return {
        fips: opt.getAttribute("data-fips"),
        lat: opt.getAttribute("data-lat"),
        lng: opt.getAttribute("data-lng"),
        text: opt.textContent
      };
    } catch(e){ return null; }
  }

  function _buildCountyWhere(src, countyAttrs){
    if (!countyAttrs || !src.countyField || !src.countyMatch) return null;
    var f = src.countyField;
    var fips5 = countyAttrs.fips; // e.g. "06077"
    var basename = (countyAttrs.text || "").replace(/\s*County\s*$/i,"").replace(/\s*Borough\s*$/i,"").replace(/\s*Census Area\s*$/i,"").trim();
    switch (src.countyMatch) {
      case "fips5": return f + "='" + fips5 + "'";
      case "fips5num": return f + "=" + parseInt(fips5,10);
      case "fips3": return f + "='" + fips5.substring(2) + "'";
      case "fips3num": return f + "=" + parseInt(fips5.substring(2),10);
      case "name": return "UPPER(" + f + ") LIKE '%" + basename.toUpperCase().replace(/'/g,"''") + "%'";
      default: return null;
    }
  }

  function _rewriteUrl(origUrl, src, stateCode){
    var u = new URL(origUrl);
    var qp = u.searchParams;
    var nu = new URL(src.url);
    var np = nu.searchParams;
    np.set("geometry", qp.get("geometry") || "");
    np.set("geometryType", qp.get("geometryType") || "esriGeometryEnvelope");
    np.set("inSR", qp.get("inSR") || "4326");
    np.set("spatialRel", qp.get("spatialRel") || "esriSpatialRelIntersects");
    np.set("outFields", src.outFields || "*");
    np.set("returnGeometry","true");
    np.set("outSR", "4326");
    np.set("resultRecordCount", qp.get("resultRecordCount") || "2000");
    np.set("f", "geojson");
    // County filter: prefer county WHERE if a county is selected, otherwise default whereTpl
    var countyAttrs = _getActiveCountyAttrs();
    var countyWhere = _buildCountyWhere(src, countyAttrs);
    if (countyWhere) {
      np.set("where", countyWhere);
    } else {
      np.set("where", src.whereTpl ? src.whereTpl.replace("{fips}","1=1") : "1=1");
    }
    return nu.toString();
  }
  function _normalizeFeatures(data, src, stateCode){
    if (!data || !data.features) return {type:"FeatureCollection", features:[]};
    if (!src.fields) return data;
    var fmap = src.fields;
    var out = data.features.map(function(f){
      var p = f.properties || {};
      function S(v){ return v == null ? "" : String(v); }
      function N(v){ var n = parseFloat(v); return isFinite(n) ? n : 0; }
      var np = {
        parcel_id: S(p[fmap.parcel_id] || p.parcel_id),
        state_parcel_id: S(p[fmap.state_parcel_id] || p.state_parcel_id || p[fmap.parcel_id]),
        prop_add: S(p[fmap.prop_add] || p.prop_add),
        prop_city: S(p[fmap.prop_city] || p.prop_city),
        prop_zip: S(p[fmap.prop_zip] || p.prop_zip),
        dlgf_prop_class_code: S(p[fmap.class_code] || p.dlgf_prop_class_code),
        owner: S(p[fmap.owner] || p.owner),
        latitude: N(p[fmap.latitude] || p.latitude),
        longitude: N(p[fmap.longitude] || p.longitude),
        _state: stateCode,
        _src: p
      };
      return {type:"Feature", geometry:f.geometry, properties: np};
    });
    return {type:"FeatureCollection", features: out};
  }

  // ----- STATE-SWITCHER UI -----
  function _injectUI(){
    if (document.getElementById("mn-state-switcher")) return;
    var host = document.querySelector(".leaflet-top.leaflet-right") || document.body;
    var wrap = document.createElement("div");
    wrap.id = "mn-state-switcher";
    wrap.style.cssText = "position:absolute;top:8px;right:48px;z-index:1000;background:#fff;border:1px solid #ccc;border-radius:4px;padding:4px 6px;font:13px/1.2 system-ui,sans-serif;box-shadow:0 1px 3px rgba(0,0,0,.2);";
    var label = document.createElement("span");
    label.textContent = "State: ";
    label.style.cssText = "margin-right:4px;color:#444;";
    var sel = document.createElement("select");
    sel.id = "mn-state-select";
    sel.style.cssText = "border:none;background:transparent;font:inherit;color:#222;cursor:pointer;";
    var keys = Object.keys(STATES).sort(function(a,b){ return STATES[a].n.localeCompare(STATES[b].n); });
    keys.forEach(function(k){
      var opt = document.createElement("option");
      opt.value = k;
      var hasSrc = SOURCES[k] && SOURCES[k].type === "esri";
      opt.textContent = STATES[k].n + (hasSrc ? "" : " (no parcels)");
      if (k === getActive()) opt.selected = true;
      sel.appendChild(opt);
    });
    sel.addEventListener("change", function(){
      var code = sel.value;
      setActive(code);
      window.MNStates.flyTo(code);
      // Force parcel reload by clearing the tile cache via reflection
      try { if (window.parcelTileCache && window.parcelTileCache.clear) window.parcelTileCache.clear(); } catch(e){}
      try { if (typeof window.loadParcelsForView === "function") setTimeout(window.loadParcelsForView, 700); } catch(e){}
    });
    wrap.appendChild(label);
    wrap.appendChild(sel);
    var refresh = function(){
      Array.from(sel.options).forEach(function(o){
        var hasSrc = SOURCES[o.value] && SOURCES[o.value].type === "esri";
        o.textContent = STATES[o.value].n + (hasSrc ? "" : " (no parcels)");
      });
    };
    document.addEventListener("mn:sourceAdded", refresh);
    document.body.appendChild(wrap);
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", _injectUI);
  } else {
    setTimeout(_injectUI, 800);
  }
  setTimeout(_injectUI, 2500);

  // ----- PUBLIC: register additional source -----
  window.MNStates.registerSource = function(code, src){
    SOURCES[code] = src;
    document.dispatchEvent(new CustomEvent("mn:sourceAdded",{detail:{code:code}}));
  };
  // County change -> trigger parcel reload for non-IN states
  document.addEventListener("DOMContentLoaded", function(){
    setTimeout(function(){
      var cs = document.getElementById("county-sel");
      if (!cs || cs.__mnStatesCountyHook) return;
      cs.__mnStatesCountyHook = true;
      cs.addEventListener("change", function(){
        var active = getActive();
        if (active === "IN") return;
        try { if (window.parcelTileCache && window.parcelTileCache.clear) window.parcelTileCache.clear(); } catch(e){}
        try { if (window.loadedParcelIds && window.loadedParcelIds.clear) window.loadedParcelIds.clear(); } catch(e){}
        try { if (window.parcelLayer && window.parcelLayer.clearLayers) window.parcelLayer.clearLayers(); } catch(e){}
        setTimeout(function(){
          if (typeof window.loadParcelsForView === "function") window.loadParcelsForView();
        }, 800);
      });
    }, 1500);
  });
  // bootstrap initial active
  window.__activeState = getActive();
  console.log("[mn-states] loaded; active=", window.__activeState, "; sources=", Object.keys(SOURCES));
})();
