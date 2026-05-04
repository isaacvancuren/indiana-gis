// Zoning ordinance URL lookup, keyed by 'county_slug:city_slug' (exact match)
// or 'county_slug' (county-level fallback). Values are a URL string or a
// function(zoningCode) => url for jurisdictions that support deep-linking.
window.ZONING_ORDINANCES = {
  // Marion County
  'marion:indianapolis':  'https://library.municode.com/in/indianapolis_-_marion_county/codes/unified_development_ordinance',

  // Hamilton County cities
  'hamilton:carmel':      'https://library.municode.com/in/carmel/codes/code_of_ordinances',
  'hamilton:fishers':     'https://www.fishers.in.us/216/Zoning',
  'hamilton:noblesville': 'https://library.municode.com/in/noblesville/codes/code_of_ordinances',
  'hamilton:westfield':   'https://library.municode.com/in/westfield/codes/code_of_ordinances',

  // Monroe County
  'monroe:bloomington':   'https://library.municode.com/in/bloomington/codes/code_of_ordinances',

  // Allen County
  'allen:fortwayne':      'https://library.municode.com/in/fort_wayne/codes/code_of_ordinances',

  // Bartholomew County
  'bartholomew:columbus': 'https://library.municode.com/in/columbus/codes/code_of_ordinances',

  // St. Joseph County
  'stjoseph:southbend':   'https://library.municode.com/in/south_bend/codes/code_of_ordinances',

  // County-level fallbacks (used when city doesn't match any entry above)
  'marion':      'https://library.municode.com/in/indianapolis_-_marion_county/codes/unified_development_ordinance',
  'hamilton':    'https://www.hamiltoncounty.in.gov/291/Planning-Zoning',
  'monroe':      'https://library.municode.com/in/bloomington/codes/code_of_ordinances',
  'allen':       'https://library.municode.com/in/fort_wayne/codes/code_of_ordinances',
  'bartholomew': 'https://library.municode.com/in/columbus/codes/code_of_ordinances',
  'stjoseph':    'https://library.municode.com/in/south_bend/codes/code_of_ordinances',
};

// Returns a URL string for the given county/city/zoningCode, or null if none registered.
window.getZoningOrdinanceUrl = function(countyName, cityName, zoningCode) {
  var lookup = window.ZONING_ORDINANCES;
  if (!lookup) return null;
  var c  = (countyName || '').toLowerCase().replace(/\s*county\s*$/i, '').replace(/[^a-z]/g, '');
  var ci = (cityName   || '').toLowerCase().replace(/[^a-z]/g, '');
  if (!c) return null;
  var entry = (ci && lookup[c + ':' + ci]) || lookup[c] || null;
  if (!entry) return null;
  return typeof entry === 'function' ? entry(zoningCode) : entry;
};
