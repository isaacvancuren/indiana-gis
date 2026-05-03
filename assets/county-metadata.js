// assets/county-metadata.js
// Extracted from index.html (county-level metadata: county lookup, ElevateMaps mapping, WTH/XSoft/Beacon).
// Defines: INDIANA_COUNTIES, EM_COUNTIES, WTH_GIS, XSOFT_SLUGS, BEACON_APPS.
(function(){

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


// PPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPP
//  PRC PDF — DIRECT COUNTY ENDPOINTS
//  Exhaustively researched. These are all confirmed
//  public-access direct PDF/report URLs per county.
// PPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPP

// PPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPP
//  PRC PDF SYSTEM — DIRECT & RELIABLE
//
//  Sources (in priority order):
//  1. Marion County  → maps.indy.gov (real PDF server)
//  2. Hamilton County → secure2.hamiltoncounty.in.gov (real PDF server)
//  3. ElevateMaps counties → fetch SAS URL from ElevateMaps API, open Venturi blob PDF
//  4. XSoft Engage counties → engage.xsoftinc.com detail page
//  5. All others → professional browser-generated PDF from real assessment data
// PPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPP

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

// Beacon app names — Schneider Geospatial's hosted property viewer.
// URL pattern: https://beacon.schneidercorp.com/Application.aspx?App=<value>&...
// Naming convention: <CamelCaseCountyName>CountyIN (DeKalb, LaGrange, LaPorte,
// StJoseph have special casing). Counties not actually published on Beacon
// will 404 when opened — the deep-link is still valid as a fallback try.
// Coverage: all 92 Indiana counties so the "Open in Beacon" affordance is
// universally available; the more accurate Tier 1/2/3 owner data takes
// precedence for any county that has it configured.
//
// BEACON_APP_DETAIL: numeric triplet (AppID, LayerID, PageID) for direct
// deep-link to a specific parcel's report page. When present, the popup
// uses this instead of the App=...&PageType=Search URL, taking the user
// straight to the parcel detail. Discovered via web research 2026-05-03.
// Add new entries by visiting beacon.schneidercorp.com/?site=<App>, opening
// any parcel, and copying the AppID/LayerID/PageID query params.
const BEACON_APPS = {
  adams:       'AdamsCountyIN',
  allen:       'AllenCountyIN',
  bartholomew: 'BartholomewCountyIN',
  benton:      'BentonCountyIN',
  blackford:   'BlackfordCountyIN',
  boone:       'BooneCountyIN',
  brown:       'BrownCountyIN',
  carroll:     'CarrollCountyIN',
  cass:        'CassCountyIN',
  clark:       'ClarkCountyIN',
  clay:        'ClayCountyIN',
  clinton:     'ClintonCountyIN',
  crawford:    'CrawfordCountyIN',
  daviess:     'DaviessCountyIN',
  dearborn:    'DearbornCountyIN',
  decatur:     'DecaturCountyIN',
  dekalb:      'DeKalbCountyIN',
  delaware:    'DelawareCountyIN',
  dubois:      'DuboisCountyIN',
  elkhart:     'ElkhartCountyIN',
  fayette:     'FayetteCountyIN',
  floyd:       'FloydCountyIN',
  fountain:    'FountainCountyIN',
  franklin:    'FranklinCountyIN',
  fulton:      'FultonCountyIN',
  gibson:      'GibsonCountyIN',
  grant:       'GrantCountyIN',
  greene:      'GreeneCountyIN',
  hamilton:    'HamiltonCountyIN',
  hancock:     'HancockCountyIN',
  harrison:    'HarrisonCountyIN',
  hendricks:   'HendricksCountyIN',
  henry:       'HenryCountyIN',
  howard:      'HowardCountyIN',
  huntington:  'HuntingtonCountyIN',
  jackson:     'JacksonCountyIN',
  jasper:      'JasperCountyIN',
  jay:         'JayCountyIN',
  jefferson:   'JeffersonCountyIN',
  jennings:    'JenningsCountyIN',
  johnson:     'JohnsonCountyIN',
  knox:        'KnoxCountyIN',
  kosciusko:   'KosciuskoCountyIN',
  lagrange:    'LaGrangeCountyIN',
  lake:        'LakeCountyIN',
  laporte:     'LaPorteCountyIN',
  lawrence:    'LawrenceCountyIN',
  madison:     'MadisonCountyIN',
  marion:      'MarionCountyIN',
  marshall:    'MarshallCountyIN',
  martin:      'MartinCountyIN',
  miami:       'MiamiCountyIN',
  monroe:      'MonroeCountyIN',
  montgomery:  'MontgomeryCountyIN',
  morgan:      'MorganCountyIN',
  newton:      'NewtonCountyIN',
  noble:       'NobleCountyIN',
  ohio:        'OhioCountyIN',
  orange:      'OrangeCountyIN',
  owen:        'OwenCountyIN',
  parke:       'ParkeCountyIN',
  perry:       'PerryCountyIN',
  pike:        'PikeCountyIN',
  porter:      'PorterCountyIN',
  posey:       'PoseyCountyIN',
  pulaski:     'PulaskiCountyIN',
  putnam:      'PutnamCountyIN',
  randolph:    'RandolphCountyIN',
  ripley:      'RipleyCountyIN',
  rush:        'RushCountyIN',
  stjoseph:    'StJosephCountyIN',
  scott:       'ScottCountyIN',
  shelby:      'ShelbyCountyIN',
  spencer:     'SpencerCountyIN',
  starke:      'StarkeCountyIN',
  steuben:     'SteubenCountyIN',
  sullivan:    'SullivanCountyIN',
  switzerland: 'SwitzerlandCountyIN',
  tippecanoe:  'TippecanoeCountyIN',
  tipton:      'TiptonCountyIN',
  union:       'UnionCountyIN',
  vanderburgh: 'VanderburghCountyIN',
  vermillion:  'VermillionCountyIN',
  vigo:        'VigoCountyIN',
  wabash:      'WabashCountyIN',
  warren:      'WarrenCountyIN',
  warrick:     'WarrickCountyIN',
  washington:  'WashingtonCountyIN',
  wayne:       'WayneCountyIN',
  wells:       'WellsCountyIN',
  white:       'WhiteCountyIN',
  whitley:     'WhitleyCountyIN',
};

// Numeric Beacon parcel-detail-page deep-link config.
// Each value: [AppID, LayerID, PageID] — when set, the popup builds:
//   https://beacon.schneidercorp.com/Application.aspx?AppID=<a>&LayerID=<l>&PageTypeID=4&PageID=<p>&KeyValue=<pin>
// PageTypeID=4 is the "Parcel Report" page in Beacon. This lands the user
// directly on the property record rather than the search page.
const BEACON_APP_DETAIL = {
  allen:       [1178,34847,13392],
  bartholomew: [1130,28606,12977],
  boone:       [84,795,550],
  carroll:     [377,5553,2976],
  dearborn:    [267,3292,1830],
  decatur:     [124,1376,743],
  dekalb:      [385,6053,3292],
  delaware:    [213,2828,1566],
  fountain:    [907,17344,7798],
  gibson:      [114,1283,733],
  hamilton:    [1186,35358,13446],
  hancock:     [111,1206,674],
  harrison:    [1170,31893,12993],
  hendricks:   [327,3469,2293],
  henry:       [478,6864,3658],
  howard:      [94,952,599],
  huntington:  [184,2248,1144],
  jasper:      [325,3398,2260],
  johnson:     [129,1554,939],
  kosciusko:   [152,1998,1013],
  lagrange:    [185,2435,1270],
  laporte:     [205,2736,1532],
  madison:     [406,6209,3309],
  marion:      [70,477,449],
  miami:       [229,3117,1686],
  montgomery:  [200,2653,1511],
  newton:      [295,3320,2026],
  noble:       [127,1479,798],
  steuben:     [97,963,613],
  tippecanoe:  [578,8505,4151],
  tipton:      [77,702,510],
  vigo:        [99,962,611],
  wabash:      [167,2153,1112],
  wayne:       [402,6170,3300],
  whitley:     [85,829,560],
};


  if (typeof INDIANA_COUNTIES !== 'undefined') window.INDIANA_COUNTIES = INDIANA_COUNTIES;
  if (typeof EM_COUNTIES !== 'undefined') window.EM_COUNTIES = EM_COUNTIES;
  if (typeof WTH_GIS !== 'undefined') window.WTH_GIS = WTH_GIS;
  if (typeof XSOFT_SLUGS !== 'undefined') window.XSOFT_SLUGS = XSOFT_SLUGS;
  if (typeof BEACON_APPS !== 'undefined') window.BEACON_APPS = BEACON_APPS;
  if (typeof BEACON_APP_DETAIL !== 'undefined') window.BEACON_APP_DETAIL = BEACON_APP_DETAIL;
})();
