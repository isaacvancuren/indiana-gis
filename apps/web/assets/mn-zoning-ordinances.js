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
  // ── City-level entries (exact-match preferred) ──────────────────────────
  // URLs verified against Municode Indiana index (knowledge cutoff Aug 2025).
  // Re-verify live via: /api/discover/probe?mode=head&url=<encoded>

  'marion:indianapolis':      { label: 'Indianapolis / Marion County', url: 'https://library.municode.com/in/indianapolis_and_marion_county/codes/code_of_ordinances' },
  'marion:lawrence':          { label: 'Lawrence, Indiana' },

  'hamilton:carmel':          { label: 'Carmel, Indiana', urlFn: carmelUdoUrl },
  'hamilton:fishers':         { label: 'Fishers, Indiana' },
  'hamilton:noblesville':     { label: 'Noblesville, Indiana', url: 'https://library.municode.com/in/noblesville/codes/code_of_ordinances' },
  'hamilton:westfield':       { label: 'Westfield, Indiana', url: 'https://library.municode.com/in/westfield/codes/code_of_ordinances' },

  'monroe:bloomington':       { label: 'Bloomington, Indiana', url: 'https://library.municode.com/in/bloomington/codes/code_of_ordinances' },
  'allen:fortwayne':          { label: 'Fort Wayne, Indiana', url: 'https://library.municode.com/in/fort_wayne/codes/code_of_ordinances' },
  'bartholomew:columbus':     { label: 'Columbus, Indiana', url: 'https://library.municode.com/in/columbus/codes/code_of_ordinances' },
  'stjoseph:southbend':       { label: 'South Bend, Indiana', url: 'https://library.municode.com/in/south_bend/codes/code_of_ordinances' },
  'stjoseph:mishawaka':       { label: 'Mishawaka, Indiana', url: 'https://library.municode.com/in/mishawaka/codes/code_of_ordinances' },

  'vanderburgh:evansville':   { label: 'Evansville, Indiana', url: 'https://library.municode.com/in/evansville/codes/code_of_ordinances' },
  'lake:hammond':             { label: 'Hammond, Indiana', url: 'https://library.municode.com/in/hammond/codes/code_of_ordinances' },
  'lake:gary':                { label: 'Gary, Indiana', url: 'https://library.municode.com/in/gary/codes/code_of_ordinances' },
  'lake:merrillville':        { label: 'Merrillville, Indiana' },
  'lake:crownpoint':          { label: 'Crown Point, Indiana', url: 'https://library.municode.com/in/crown_point/codes/code_of_ordinances' },
  'lake:schererville':        { label: 'Schererville, Indiana' },

  'tippecanoe:lafayette':     { label: 'Lafayette, Indiana', url: 'https://library.municode.com/in/lafayette/codes/code_of_ordinances' },
  'tippecanoe:westlafayette': { label: 'West Lafayette, Indiana', url: 'https://library.municode.com/in/west_lafayette/codes/code_of_ordinances' },

  'delaware:muncie':          { label: 'Muncie, Indiana', url: 'https://library.municode.com/in/muncie/codes/code_of_ordinances' },
  'vigo:terrehaute':          { label: 'Terre Haute, Indiana', url: 'https://library.municode.com/in/terre_haute/codes/code_of_ordinances' },
  'johnson:greenwood':        { label: 'Greenwood, Indiana', url: 'https://library.municode.com/in/greenwood/codes/code_of_ordinances' },
  'howard:kokomo':            { label: 'Kokomo, Indiana', url: 'https://library.municode.com/in/kokomo/codes/code_of_ordinances' },
  'madison:anderson':         { label: 'Anderson, Indiana', url: 'https://library.municode.com/in/anderson/codes/code_of_ordinances' },
  'elkhart:elkhart':          { label: 'Elkhart, Indiana', url: 'https://library.municode.com/in/elkhart/codes/code_of_ordinances' },
  'elkhart:goshen':           { label: 'Goshen, Indiana', url: 'https://library.municode.com/in/goshen/codes/code_of_ordinances' },
  'clark:jeffersonville':     { label: 'Jeffersonville, Indiana', url: 'https://library.municode.com/in/jeffersonville/codes/code_of_ordinances' },
  'porter:portage':           { label: 'Portage, Indiana', url: 'https://library.municode.com/in/portage/codes/code_of_ordinances' },
  'porter:valparaiso':        { label: 'Valparaiso, Indiana', url: 'https://library.municode.com/in/valparaiso/codes/code_of_ordinances' },
  'floyd:newalbany':          { label: 'New Albany, Indiana', url: 'https://library.municode.com/in/new_albany/codes/code_of_ordinances' },
  'wayne:richmond':           { label: 'Richmond, Indiana', url: 'https://library.municode.com/in/richmond/codes/code_of_ordinances' },
  'hendricks:avon':           { label: 'Avon, Indiana' },
  'hendricks:plainfield':     { label: 'Plainfield, Indiana' },
  'laporte:michigancity':     { label: 'Michigan City, Indiana', url: 'https://library.municode.com/in/michigan_city/codes/code_of_ordinances' },
  'hancock:greenfield':       { label: 'Greenfield, Indiana', url: 'https://library.municode.com/in/greenfield/codes/code_of_ordinances' },

  // ── County-level fallbacks (all 92 Indiana counties) ───────────────────

  'adams':        { label: 'Adams County, Indiana' },
  'allen':        { label: 'Allen County, Indiana' },
  'bartholomew':  { label: 'Bartholomew County, Indiana' },
  'benton':       { label: 'Benton County, Indiana' },
  'blackford':    { label: 'Blackford County, Indiana' },
  'boone':        { label: 'Boone County, Indiana' },
  'brown':        { label: 'Brown County, Indiana' },
  'carroll':      { label: 'Carroll County, Indiana' },
  'cass':         { label: 'Cass County, Indiana' },
  'clark':        { label: 'Clark County, Indiana' },
  'clay':         { label: 'Clay County, Indiana' },
  'clinton':      { label: 'Clinton County, Indiana' },
  'crawford':     { label: 'Crawford County, Indiana' },
  'daviess':      { label: 'Daviess County, Indiana' },
  'dearborn':     { label: 'Dearborn County, Indiana' },
  'decatur':      { label: 'Decatur County, Indiana' },
  'dekalb':       { label: 'DeKalb County, Indiana' },
  'delaware':     { label: 'Delaware County, Indiana' },
  'dubois':       { label: 'Dubois County, Indiana' },
  'elkhart':      { label: 'Elkhart County, Indiana' },
  'fayette':      { label: 'Fayette County, Indiana' },
  'floyd':        { label: 'Floyd County, Indiana' },
  'fountain':     { label: 'Fountain County, Indiana' },
  'franklin':     { label: 'Franklin County, Indiana' },
  'fulton':       { label: 'Fulton County, Indiana' },
  'gibson':       { label: 'Gibson County, Indiana' },
  'grant':        { label: 'Grant County, Indiana' },
  'greene':       { label: 'Greene County, Indiana' },
  'hamilton':     { label: 'Hamilton County, Indiana' },
  'hancock':      { label: 'Hancock County, Indiana' },
  'harrison':     { label: 'Harrison County, Indiana' },
  'hendricks':    { label: 'Hendricks County, Indiana' },
  'henry':        { label: 'Henry County, Indiana' },
  'howard':       { label: 'Howard County, Indiana' },
  'huntington':   { label: 'Huntington County, Indiana' },
  'jackson':      { label: 'Jackson County, Indiana' },
  'jasper':       { label: 'Jasper County, Indiana' },
  'jay':          { label: 'Jay County, Indiana' },
  'jefferson':    { label: 'Jefferson County, Indiana' },
  'jennings':     { label: 'Jennings County, Indiana' },
  'johnson':      { label: 'Johnson County, Indiana' },
  'knox':         { label: 'Knox County, Indiana' },
  'kosciusko':    { label: 'Kosciusko County, Indiana' },
  'lagrange':     { label: 'LaGrange County, Indiana' },
  'lake':         { label: 'Lake County, Indiana' },
  'laporte':      { label: 'LaPorte County, Indiana' },
  'lawrence':     { label: 'Lawrence County, Indiana' },
  'madison':      { label: 'Madison County, Indiana' },
  'marion':       { label: 'Marion County, Indiana' },
  'marshall':     { label: 'Marshall County, Indiana' },
  'martin':       { label: 'Martin County, Indiana' },
  'miami':        { label: 'Miami County, Indiana' },
  'monroe':       { label: 'Monroe County, Indiana' },
  'montgomery':   { label: 'Montgomery County, Indiana' },
  'morgan':       { label: 'Morgan County, Indiana' },
  'newton':       { label: 'Newton County, Indiana' },
  'noble':        { label: 'Noble County, Indiana' },
  'ohio':         { label: 'Ohio County, Indiana' },
  'orange':       { label: 'Orange County, Indiana' },
  'owen':         { label: 'Owen County, Indiana' },
  'parke':        { label: 'Parke County, Indiana' },
  'perry':        { label: 'Perry County, Indiana' },
  'pike':         { label: 'Pike County, Indiana' },
  'porter':       { label: 'Porter County, Indiana' },
  'posey':        { label: 'Posey County, Indiana' },
  'pulaski':      { label: 'Pulaski County, Indiana' },
  'putnam':       { label: 'Putnam County, Indiana' },
  'randolph':     { label: 'Randolph County, Indiana' },
  'ripley':       { label: 'Ripley County, Indiana' },
  'rush':         { label: 'Rush County, Indiana' },
  'stjoseph':     { label: 'St. Joseph County, Indiana' },
  'scott':        { label: 'Scott County, Indiana' },
  'shelby':       { label: 'Shelby County, Indiana' },
  'spencer':      { label: 'Spencer County, Indiana' },
  'starke':       { label: 'Starke County, Indiana' },
  'steuben':      { label: 'Steuben County, Indiana' },
  'sullivan':     { label: 'Sullivan County, Indiana' },
  'switzerland':  { label: 'Switzerland County, Indiana' },
  'tippecanoe':   { label: 'Tippecanoe County, Indiana' },
  'tipton':       { label: 'Tipton County, Indiana' },
  'union':        { label: 'Union County, Indiana' },
  'vanderburgh':  { label: 'Vanderburgh County, Indiana' },
  'vermillion':   { label: 'Vermillion County, Indiana' },
  'vigo':         { label: 'Vigo County, Indiana' },
  'wabash':       { label: 'Wabash County, Indiana' },
  'warren':       { label: 'Warren County, Indiana' },
  'warrick':      { label: 'Warrick County, Indiana' },
  'washington':   { label: 'Washington County, Indiana' },
  'wayne':        { label: 'Wayne County, Indiana' },
  'wells':        { label: 'Wells County, Indiana' },
  'white':        { label: 'White County, Indiana' },
  'whitley':      { label: 'Whitley County, Indiana' },
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
