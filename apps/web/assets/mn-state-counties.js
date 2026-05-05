/* mn-state-counties.js
   Dynamic county loader for non-Indiana states.
   - Hooks #state-sel changes
   - Fetches counties from US Census TIGERweb (authoritative federal source)
   - Populates #county-sel with options including FIPS, name, centroid, zoom
   - Wires #county-sel change to fly map to selected county
   - Caches results in sessionStorage to avoid re-fetching
   - Indiana keeps its existing hardcoded STATE_COUNTIES entry (this script no-ops for it)
*/
(function(){
  var TIGER_URL = 'https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/State_County/MapServer/13/query';
  var CACHE_PREFIX = 'mn-counties-v1:';
  var inFlight = {};

  function slugToCode(slug){
    if(!slug || !window.MNStates) return null;
    var key = slug.toLowerCase().replace(/[^a-z]/g,'');
    var states = window.MNStates.list;
    for(var c in states){
      if(states[c].n.toLowerCase().replace(/[^a-z]/g,'') === key) return c;
    }
    return null;
  }

  function escapeHtml(s){ return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

  // Compute centroid + bbox from ArcGIS rings geometry
  function geomToCenterBbox(geom){
    if(!geom || !geom.rings) return null;
    var minX=Infinity, minY=Infinity, maxX=-Infinity, maxY=-Infinity;
    geom.rings.forEach(function(ring){
      ring.forEach(function(pt){
        if(pt[0]<minX)minX=pt[0]; if(pt[0]>maxX)maxX=pt[0];
        if(pt[1]<minY)minY=pt[1]; if(pt[1]>maxY)maxY=pt[1];
      });
    });
    return {
      lat: (minY+maxY)/2,
      lng: (minX+maxX)/2,
      bbox: [minX,minY,maxX,maxY]
    };
  }

  function bboxToZoom(bbox){
    var w = bbox[2]-bbox[0], h = bbox[3]-bbox[1];
    var span = Math.max(w, h);
    if(span > 5) return 7;
    if(span > 2) return 8;
    if(span > 1) return 9;
    if(span > 0.5) return 10;
    if(span > 0.25) return 11;
    return 12;
  }

  function fetchCountiesForState(stateCode){
    var info = window.MNStates && window.MNStates.list[stateCode];
    if(!info) return Promise.reject(new Error('unknown state '+stateCode));
    var fips = info.fips;
    var cacheKey = CACHE_PREFIX + stateCode;
    try {
      var cached = sessionStorage.getItem(cacheKey);
      if(cached) return Promise.resolve(JSON.parse(cached));
    } catch(e){}
    if(inFlight[stateCode]) return inFlight[stateCode];
    var url = TIGER_URL + '?where=STATE%3D%27'+fips+'%27&outFields=GEOID,NAME,STATE,COUNTY,BASENAME&returnGeometry=true&outSR=4326&f=json';
    var p = fetch(url).then(function(r){return r.json();}).then(function(d){
      if(!d.features) throw new Error('no features');
      var counties = d.features.map(function(f){
        var attr = f.attributes;
        var cb = geomToCenterBbox(f.geometry) || {lat:0,lng:0,bbox:[0,0,0,0]};
        return {
          fips: attr.GEOID,
          name: attr.NAME,
          basename: attr.BASENAME,
          countyFips: attr.COUNTY,
          lat: cb.lat,
          lng: cb.lng,
          z: bboxToZoom(cb.bbox),
          bbox: cb.bbox
        };
      }).sort(function(a,b){return a.name.localeCompare(b.name);});
      try { sessionStorage.setItem(cacheKey, JSON.stringify(counties)); } catch(e){}
      return counties;
    });
    inFlight[stateCode] = p;
    p.finally(function(){ delete inFlight[stateCode]; });
    return p;
  }

  function buildOptionsHtml(stateName, counties){
    var opts = ['<option value="" selected>— Select County —</option>'];
    opts.push('<option value="all">All '+escapeHtml(stateName)+'</option>');
    counties.forEach(function(c){
      var slug = c.basename.toLowerCase().replace(/[^a-z0-9]/g,'');
      opts.push('<option value="'+escapeHtml(slug)+'" data-fips="'+escapeHtml(c.fips)+'" data-lat="'+c.lat.toFixed(6)+'" data-lng="'+c.lng.toFixed(6)+'" data-z="'+c.z+'">'+escapeHtml(c.name)+'</option>');
    });
    return opts.join('\n');
  }

  function setLoadingState(){
    var cs = document.getElementById('county-sel');
    if(!cs) return;
    cs.innerHTML = '<option value="" selected>Loading counties…</option>';
    cs.disabled = true;
    cs.title = 'Loading counties…';
  }

  function setCountiesOnDropdown(stateName, counties){
    var cs = document.getElementById('county-sel');
    if(!cs) return;
    cs.innerHTML = buildOptionsHtml(stateName, counties);
    cs.disabled = false;
    cs.title = 'Select County';
    cs.value = '';
    // Notify other listeners
    cs.dispatchEvent(new Event('change'));
  }

  function setNoCountiesError(msg){
    var cs = document.getElementById('county-sel');
    if(!cs) return;
    cs.innerHTML = '<option value="" selected>'+escapeHtml(msg||'No counties available')+'</option>';
    cs.disabled = true;
  }

  // Hook county-sel change to fly map (works alongside Indiana handler)
  function bindCountyChange(){
    var cs = document.getElementById('county-sel');
    if(!cs || cs.__mnStateCountiesBound) return;
    cs.__mnStateCountiesBound = true;
    cs.addEventListener('change', function(){
      var opt = cs.options[cs.selectedIndex];
      if(!opt || !opt.value || opt.value === 'all') return;
      var lat = parseFloat(opt.getAttribute('data-lat'));
      var lng = parseFloat(opt.getAttribute('data-lng'));
      var z = parseInt(opt.getAttribute('data-z'),10) || 11;
      if(!isFinite(lat) || !isFinite(lng)) return;
      var map = window.__leafletMap || window.map;
      if(map && map.setView) {
        map.setView([lat, lng], z);
      }
    });
  }

  function handleStateChange(stateSlug){
    if(!stateSlug) return;
    // Indiana already handled by built-in STATE_COUNTIES — skip
    if(stateSlug === 'indiana') return;
    var code = slugToCode(stateSlug);
    if(!code) return;
    var info = window.MNStates && window.MNStates.list[code];
    if(!info) return;
    setLoadingState();
    fetchCountiesForState(code).then(function(counties){
      setCountiesOnDropdown(info.n, counties);
      bindCountyChange();
    }).catch(function(err){
      console.warn('[mn-state-counties] fetch failed for '+code, err);
      setNoCountiesError('Could not load counties');
    });
  }

  function init(){
    var stateSel = document.getElementById('state-sel');
    if(!stateSel) return setTimeout(init, 300);
    bindCountyChange();
    // Listen AFTER existing handler — runs in addition
    stateSel.addEventListener('change', function(){
      handleStateChange(this.value);
    });
    // If a state is already selected at load, populate now
    if(stateSel.value && stateSel.value !== 'indiana'){
      handleStateChange(stateSel.value);
    }
    console.log('[mn-state-counties] initialized');
  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', function(){ setTimeout(init, 1200); });
  } else {
    setTimeout(init, 1200);
  }
  setTimeout(init, 3500);
})();
