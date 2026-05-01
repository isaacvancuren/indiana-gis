/* mn-county-parcels.js - Per-county parcel ArcGIS endpoints
   Dynamically loads the GDITAdmin public parcel catalog from ArcGIS Online (1077+ items).
   This catalog covers all 50 states with per-county FeatureServer/MapServer endpoints
   maintained by GDIT (General Dynamics Information Technology).

   Public via: https://www.arcgis.com/sharing/rest/search?q=owner:GDITAdmin

   Exposes:
     window.MN_COUNTY_PARCELS  // Promise<{[STATE_CODE]: Array<{c, n, u}>}>
     window.MNCountyParcels.lookup(state, county) -> {n,u} | null
     window.MNCountyParcels.list(state) -> Array<{c,n,u}>
     window.MNCountyParcels.load() -> Promise (forces re-fetch)
*/
(function(){
  if (window.MNCountyParcels) return;

  let _catalog = null;
  let _loading = null;

  async function _fetchPage(start) {
    const url = "https://www.arcgis.com/sharing/rest/search" +
      "?q=" + encodeURIComponent("owner:GDITAdmin Parcels") +
      "&num=100&start=" + start +
      "&f=json&sortField=title&sortOrder=asc";
    try {
      const r = await fetch(url);
      const j = await r.json();
      return j.results || [];
    } catch(e) { return []; }
  }

  async function _load() {
    if (_catalog) return _catalog;
    if (_loading) return _loading;
    _loading = (async () => {
      const pageStarts = [1,101,201,301,401,501,601,701,801,901,1001];
      const pages = await Promise.all(pageStarts.map(_fetchPage));
      const all = pages.flat();
      const byState = {};
      all.forEach(item => {
        if (!item || !item.url || !item.title) return;
        const m = item.title.match(/^Parcels - ([A-Z]{2}) - (.+)$/);
        if (!m) return;
        const [, st, county] = m;
        if (/statewide/i.test(county)) return; // statewides handled by mn-state-sources
        const key = county.replace(/\s+(County|Parish|City|Borough)$/i,'')
                          .toLowerCase().replace(/[^a-z0-9]/g,'');
        byState[st] = byState[st] || [];
        byState[st].push({ c: key, n: county, u: item.url });
      });
      _catalog = byState;
      window.MN_COUNTY_PARCELS = byState;
      console.log("[mn-county-parcels] loaded", Object.keys(byState).length, "states,",
        Object.values(byState).reduce((a,v)=>a+v.length,0), "counties");
      return byState;
    })();
    return _loading;
  }

  function _norm(s) {
    return (s||"").toString().toLowerCase().replace(/[^a-z0-9]/g,'');
  }

  async function lookup(state, county) {
    const cat = await _load();
    const arr = cat[state] || [];
    if (!arr.length) return null;
    const key = _norm(county);
    const exact = arr.find(x => x.c === key);
    if (exact) return exact;
    // Loose match: contains
    return arr.find(x => x.c.indexOf(key) >= 0 || key.indexOf(x.c) >= 0) || null;
  }

  async function list(state) {
    const cat = await _load();
    return cat[state] || [];
  }

  window.MNCountyParcels = { load: _load, lookup, list };
  // Auto-start load
  _load();
})();
