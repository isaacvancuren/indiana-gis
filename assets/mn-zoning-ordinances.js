// Zoning ordinance lookup. Keyed by 'county_slug:city_slug' (exact-match,
// preferred) or 'county_slug' (county-level fallback). Values are display
// metadata describing the jurisdiction; the URL is built per-call as a
// Google search so we never serve a broken Municode link.
//
// Many Indiana cities do host their ordinances on Municode, but the slug
// pattern is inconsistent (carmel, fishers-in, town_of_fishers, etc.) and
// guessing 404s. Routing through search guarantees the user lands on a
// page that lets them find the actual ordinance, regardless of host.
window.ZONING_ORDINANCES = {
  'marion:indianapolis':  { label: 'Indianapolis / Marion County' },

  'hamilton:carmel':      { label: 'Carmel, Indiana' },
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

// Returns a URL string for the given county/city/zoningCode, or null if no
// jurisdiction is registered. URL is a Google search rather than a direct
// link to a code library so we never produce a 404.
window.getZoningOrdinanceUrl = function (countyName, cityName, zoningCode) {
  var lookup = window.ZONING_ORDINANCES;
  if (!lookup) return null;
  var c  = (countyName || '').toLowerCase().replace(/\s*county\s*$/i, '').replace(/[^a-z]/g, '');
  var ci = (cityName   || '').toLowerCase().replace(/[^a-z]/g, '');
  if (!c) return null;
  var entry = (ci && lookup[c + ':' + ci]) || lookup[c] || null;
  if (!entry) return null;
  var label = entry.label || (c + (ci ? ' ' + ci : ''));
  var q = label + ' zoning ordinance';
  if (zoningCode) q += ' ' + zoningCode;
  return 'https://www.google.com/search?q=' + encodeURIComponent(q);
};
