/* mn2-parcel-cache.js
   IndexedDB write-through cache for IGIO statewide parcel search.

   Schema
   ------
   DB:    mn2-parcel-cache  (version 1)
   Store: parcels
     keyPath: pid
     Indices:
       by_fips      → county_fips           (county-scoped scans, used by search() and warm())
       by_fips_addr → [county_fips, addr]   (compound; reserved for future prefix-range queries)
       by_ts        → ts                    (TTL eviction via openCursor)

   Each record:
     { pid, id, county_fips, addr (lc), addrOrig, city (lc), cityOrig,
       zip, use, lat, lon, ts (epoch ms) }

   Public API (window.parcelCache):
     search(q, fips, stype)  → Promise<parcel[]>  (cache-first; [] on miss)
     store(parcels, fips)    → void               (write-through after IGIO fetch)
     warm(fips)              → void               (background prefetch, max 5×1000)
     evict()                 → void               (remove records older than 7 days)
*/
(function () {
  var DB_NAME    = 'mn2-parcel-cache';
  var DB_VERSION = 1;
  var STORE      = 'parcels';
  var TTL_MS     = 7 * 24 * 60 * 60 * 1000;
  var WARM_PAGES = 5;
  var PAGE_SIZE  = 1000;
  var IGIO_URL   = 'https://gisdata.in.gov/server/rest/services/Hosted/Parcel_Boundaries_of_Indiana_Current/FeatureServer/0/query';

  var _db      = null;
  var _warming = new Set();

  function openDB() {
    if (_db) return Promise.resolve(_db);
    return new Promise(function (resolve, reject) {
      var req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = function (e) {
        var db = e.target.result;
        if (!db.objectStoreNames.contains(STORE)) {
          var st = db.createObjectStore(STORE, { keyPath: 'pid' });
          st.createIndex('by_fips',      'county_fips',           { unique: false });
          st.createIndex('by_fips_addr', ['county_fips', 'addr'], { unique: false });
          st.createIndex('by_ts',        'ts',                    { unique: false });
        }
      };
      req.onsuccess = function (e) { _db = e.target.result; resolve(_db); };
      req.onerror   = function (e) { reject(e.target.error); };
    });
  }

  function putAll(db, records) {
    return new Promise(function (resolve, reject) {
      var tx = db.transaction(STORE, 'readwrite');
      var st = tx.objectStore(STORE);
      records.forEach(function (r) { st.put(r); });
      tx.oncomplete = resolve;
      tx.onerror    = function (e) { reject(e.target.error); };
    });
  }

  function getAllByFips(db, fips) {
    return new Promise(function (resolve, reject) {
      var tx  = db.transaction(STORE, 'readonly');
      var idx = tx.objectStore(STORE).index('by_fips');
      var req = idx.getAll(fips);
      req.onsuccess = function (e) { resolve(e.target.result || []); };
      req.onerror   = function (e) { reject(e.target.error); };
    });
  }

  function toSearchResult(r) {
    var useRaw = r.use || '';
    // The cache stores either a raw DLGF class code (from warm() / fetchIGIOPage)
    // or an already-translated label (from store() called after _fetchIGIOAndCache,
    // which pre-translates). Only call getPropClass when the value looks like a code.
    var isCode = /^\d{2,4}$/.test(useRaw);
    return {
      id:   r.pid,
      pid:  r.pid,
      addr: r.addrOrig || r.addr || '',
      city: r.cityOrig || r.city || '',
      zip:  r.zip  || '',
      use:  isCode && typeof getPropClass === 'function' ? getPropClass(useRaw) : (useRaw || 'Parcel'),
      lat:  r.lat  || 0,
      lon:  r.lon  || 0
    };
  }

  function search(q, fips, stype) {
    if (!fips) return Promise.resolve([]);
    return openDB().then(function (db) {
      return getAllByFips(db, String(fips));
    }).then(function (records) {
      var now   = Date.now();
      var ql    = q.toLowerCase();
      var fresh = records.filter(function (r) { return (now - r.ts) < TTL_MS; });
      if (!fresh.length) return [];
      return fresh.filter(function (r) {
        if (stype === 'parcel') return r.pid.toLowerCase().indexOf(ql) !== -1;
        if (stype === 'owner')  return false; // IGIO doesn't carry owner names
        return r.addr.indexOf(ql) !== -1 || r.city.indexOf(ql) !== -1 || r.pid.toLowerCase().indexOf(ql) !== -1;
      }).map(toSearchResult);
    }).catch(function () { return []; });
  }

  function store(parcels, fips) {
    openDB().then(function (db) {
      var now = Date.now();
      var records = parcels.map(function (p) {
        return {
          pid:         String(p.pid || p.id || ''),
          id:          String(p.pid || p.id || ''),
          county_fips: String(fips),
          addr:        (p.addr || '').toLowerCase(),
          addrOrig:    p.addr || '',
          city:        (p.city || '').toLowerCase(),
          cityOrig:    p.city || '',
          zip:         p.zip  || '',
          use:         p.use  || '',
          lat:         p.lat  || 0,
          lon:         p.lon  || 0,
          ts:          now
        };
      }).filter(function (r) { return r.pid; });
      if (records.length) putAll(db, records).catch(function () {});
    }).catch(function () {});
  }

  function fetchIGIOPage(fips, offset) {
    var where = 'county_fips=' + parseInt(fips, 10);
    var url = IGIO_URL
      + '?where='             + encodeURIComponent(where)
      + '&outFields=parcel_id,state_parcel_id,prop_add,prop_city,prop_zip,dlgf_prop_class_code,latitude,longitude'
      + '&returnGeometry=false'
      + '&resultRecordCount=' + PAGE_SIZE
      + '&resultOffset='      + offset
      + '&f=json';
    return fetch(url).then(function (resp) {
      if (!resp.ok) return [];
      return resp.json().then(function (j) {
        var now = Date.now();
        return (j.features || []).map(function (f) {
          var a   = f.attributes || {};
          var pid = a.parcel_id || a.state_parcel_id || '';
          return {
            pid:         pid,
            id:          pid,
            county_fips: String(fips),
            addr:        (a.prop_add   || '').toLowerCase(),
            addrOrig:    a.prop_add   || '',
            city:        (a.prop_city || '').toLowerCase(),
            cityOrig:    a.prop_city || '',
            zip:         a.prop_zip  || '',
            use:         a.dlgf_prop_class_code || '',
            lat:         parseFloat(a.latitude)  || 0,
            lon:         parseFloat(a.longitude) || 0,
            ts:          now
          };
        }).filter(function (r) { return r.pid; });
      });
    }).catch(function () { return []; });
  }

  function warm(fips) {
    if (!fips || _warming.has(fips)) return;
    _warming.add(fips);
    openDB().then(function (db) {
      return getAllByFips(db, String(fips)).then(function (records) {
        var now   = Date.now();
        var fresh = records.filter(function (r) { return (now - r.ts) < TTL_MS; });
        if (fresh.length >= PAGE_SIZE) { _warming.delete(fips); return; }

        var page = 0;
        function nextPage() {
          if (page >= WARM_PAGES) { _warming.delete(fips); return; }
          var offset = page * PAGE_SIZE;
          page++;
          fetchIGIOPage(fips, offset).then(function (batch) {
            if (!batch.length) { _warming.delete(fips); return; }
            putAll(db, batch).catch(function () {}).then(function () {
              setTimeout(nextPage, 300);
            });
          }).catch(function () { _warming.delete(fips); });
        }
        nextPage();
      });
    }).catch(function () { _warming.delete(fips); });
  }

  function evict() {
    openDB().then(function (db) {
      var cutoff = Date.now() - TTL_MS;
      var tx  = db.transaction(STORE, 'readwrite');
      var idx = tx.objectStore(STORE).index('by_ts');
      var req = idx.openCursor(IDBKeyRange.upperBound(cutoff));
      req.onsuccess = function (e) {
        var cursor = e.target.result;
        if (!cursor) return;
        cursor.delete();
        cursor.continue();
      };
    }).catch(function () {});
  }

  window.parcelCache = { search: search, store: store, warm: warm, evict: evict };

  // Evict stale entries shortly after page load
  setTimeout(evict, 5000);

  // Warm the county that was active when the page loaded (read from window.activeCounty
  // which is set in the main script block before this deferred module runs)
  setTimeout(function () {
    var c = window.activeCounty;
    if (c && c.fips) warm(c.fips);
  }, 1500);
})();
