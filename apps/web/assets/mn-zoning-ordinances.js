// Zoning ordinance lookup. Keyed by 'county_slug:city_slug' (exact-match,
// preferred) or 'county_slug' (county-level fallback). The lookup helper
// builds a final URL using one of three strategies, in priority order:
//
//   1. entry.urlFn(zoningCode) — function that returns a deep-link URL
//      (use for jurisdictions with PDF + per-zone page mappings)
//   2. entry.url — direct URL string (use for jurisdictions whose
//      ordinance lives at a stable, known link)
//   3. label-only — falls back to a Google search for the label, which
//      always returns a useful first result regardless of platform.
//
// Adding a new deep-link: drop a urlFn or url key on the entry. Adding
// a new jurisdiction: drop a new entry; it'll route via Google search
// until you fill in a real link.

// Carmel, Indiana — Unified Development Ordinance (single PDF).
// PDF deep-link via #page=N is supported by all major browsers' PDF
// viewers (Chrome, Firefox, Safari, Edge).
//
// To fill in a zone, set CARMEL_ZONE_PAGES[code] to the PDF page number
// where that district's permitted-uses section starts. Codes left out
// fall through to opening the PDF at page 1 (the table of contents).
var CARMEL_UDO_URL = 'https://www.carmel.in.gov/DocumentCenter/View/2657/UDO-Feb-12-2026-version-2';
var CARMEL_ZONE_PAGES = {
  // Fill these in as you confirm them from the UDO TOC.
  // Example shape — replace numbers when known:
  // 'S-1': 0, 'R-1': 0, 'R-2': 0, 'R-3': 0, 'R-4': 0, 'R-5': 0,
  // 'B-1': 0, 'B-2': 0, 'B-3': 0, 'B-5': 0, 'B-6': 0, 'B-7': 0, 'B-8': 0,
  // 'M-1': 0, 'M-2': 0, 'M-3': 0, 'P-1': 0,
};
function carmelUdoUrl(zoningCode) {
  var code = (zoningCode || '').toUpperCase().replace(/\s+/g, '');
  var page = CARMEL_ZONE_PAGES[code];
  return CARMEL_UDO_URL + (page ? '#page=' + page : '');
}

window.ZONING_ORDINANCES = {
  'marion:indianapolis':  { label: 'Indianapolis / Marion County' },

  'hamilton:carmel':      { label: 'Carmel, Indiana', urlFn: carmelUdoUrl },
  'hamilton:fishers':     { label: 'Fishers, Indiana' },
  'hamilton:noblesville': { label: 'Noblesville, Indiana' },
  'hamilton:westfield':   { label: 'Westfield, Indiana' },

  'monroe:bloomington':   { label: 'Bloomington, Indiana' },
  'allen:fortwayne':      { label: 'Fort Wayne, Indiana' },
  'bartholomew:columbus': { label: 'Columbus, Indiana' },
  'stjoseph:southbend':   { label: 'South Bend, Indiana' },

  // County-level fallbacks — used when the parcel's city doesn't have an
  // exact entry above. The popup falls back to county scope automatically.
  'marion':      { label: 'Marion County, Indiana' },
  'hamilton':    { label: 'Hamilton County, Indiana' },
  'monroe':      { label: 'Monroe County, Indiana' },
  'allen':       { label: 'Allen County, Indiana' },
  'bartholomew': { label: 'Bartholomew County, Indiana' },
  'stjoseph':    { label: 'St. Joseph County, Indiana' },
};

// Returns a URL string for the given county / city / zoningCode, or null
// if no jurisdiction is registered.
window.getZoningOrdinanceUrl = function (countyName, cityName, zoningCode) {
  var lookup = window.ZONING_ORDINANCES;
  if (!lookup) return null;
  var c  = (countyName || '').toLowerCase().replace(/\s*county\s*$/i, '').replace(/[^a-z]/g, '');
  var ci = (cityName   || '').toLowerCase().replace(/[^a-z]/g, '');
  if (!c) return null;
  var entry = (ci && lookup[c + ':' + ci]) || lookup[c] || null;
  if (!entry) return null;
  if (typeof entry.urlFn === 'function') return entry.urlFn(zoningCode);
  if (typeof entry.url === 'string')     return entry.url;
  var label = entry.label || (c + (ci ? ' ' + ci : ''));
  var q = label + ' zoning ordinance';
  if (zoningCode) q += ' ' + zoningCode;
  return 'https://www.google.com/search?q=' + encodeURIComponent(q);
};
