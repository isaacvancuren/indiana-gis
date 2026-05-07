// static/v2/geo-county-apis.js
// Extracted from index.html (TIER 1+2 county parcel API registry).
// Defines: EM_LAYER92, EM_BASE, L92_FIELDS, COUNTY_PARCEL_APIS as window globals.
(function(){

const EM_LAYER92 = {
  bartholomew: 'BartholomewINDynamic', // = LOCKED — Tier 1 confirmed working
};
const EM_BASE = 'https://elb.elevatemaps.io/arcgis/rest/services/eGISDynamicServices/';
const L92_FIELDS = [
  'pin_18','tax_10','pin_18stripped',
  'owner','owner_street','owner_city_st_zip',
  'property_street','property_city_st_zip',
  'legal_desc','nbhd_name','nbhd_code',
  'prop_class_code','prop_class_desc',
  'land_value','improv_value','tot_assessed_value',
  'legal_acreage','calc_sq_ft','calc_ac',
  'political_twp','school_corporation',
  'latest_sale_date','latest_sale_price',
  'deedbook','deedpage','documentnumber',
  'latest_sale_year','validsale','notes','review_year'
].join(',');

//  TIER 2: County-specific ArcGIS parcel/assessor services 
const COUNTY_PARCEL_APIS = {
  //  TIER 2A: County-hosted ArcGIS 

  // Marion County (Indianapolis) — confirmed working
  marion: {
    // MapIndyProperty/10 = confirmed public parcel+owner layer (AGOL item 0d28e222479743baa97f8f4456da7bb4)
    url: 'https://gis.indy.gov/server/rest/services/MapIndy/MapIndyProperty/MapServer/10/query',
    pinField: 'STATEPARCELNUMBER', ownerField: 'FULLOWNERNAME',
    addrField: 'FULL_STNAME', mailAddrField: 'OWNERADDRESS',
    mailCityField: 'OWNERCITY', mailStField: 'OWNERSTATE', mailZipField: 'OWNERZIP',
    avField: 'ASSESSORYEAR_TOTALAV', acresField: 'ACREAGE',
    legalField: 'LEGAL_DESCRIPTION_', twpField: 'TOWNSHIP',
    schema: 'marion',
    lookupUrl: 'https://maps.indy.gov/AssessorPropertyCards/'
  },

  // Hamilton County — confirmed fields from gis1.hamiltoncounty.in.gov live schema
  hamilton: { // = LOCKED — STPRCLNO matches IGIO parcel_id, confirmed working
    url:             'https://gis1.hamiltoncounty.in.gov/arcgis/rest/services/HamCoParcelsPublic/FeatureServer/0/query',
    pinField:        'STPRCLNO',   ownerField:    'DEEDEDOWNR',
    addrField:       'LOCADDRESS', cityField:     'LOCCITY',    zipField:  'LOCZIP',
    legalField:      'LEGALDESC',  saleDateField: 'LSTXFRDATE',
    acresField:      'DEEDACRES',  avField:       'AVTOTGROSS',
    landValueField:  'AVLAND',     improvValueField: 'AVIMPROVE',
    twpField:        'POLTWP',     schoolField:   'TAXDISTNAM',
    classField:      'PROPUSE',
    mailAddrField:   'OWNADDRESS', mailCityField: 'OWNCITY',
    mailStField:     'OWNSTATE',   mailZipField:  'OWNZIP',
    schema: 'hamilton',
    noUnformatted: true,
    lookupUrl: 'https://www.hamiltoncounty.in.gov/propertyreports'
  },

  // Allen County (Fort Wayne) — county parcel service
  allen: {
    url: 'https://gis.cityoffortwayne.org/arcgis/rest/services/Public/Parcels/FeatureServer/0/query',
    pinField: 'PARCEL_ID', ownerField: 'OWNER', addrField: 'PROP_ADDR',
    avField: 'TOTAL_AV', acresField: 'ACRES', schema: 'standard',
    lookupUrl: 'https://www.allencounty.in.gov/egov/apps/assessor/index.egov'
  },

  // Lake County Indiana
  lake: {
    url: 'https://services5.arcgis.com/8CXRnvSfSpwdf0R6/arcgis/rest/services/Lake_County_Parcels/FeatureServer/0/query',
    pinField: 'PARCELNO', ownerField: 'OWNER', addrField: 'SITUS_ADDRESS',
    avField: 'NET_AV', acresField: 'ACRES', schema: 'standard',
    lookupUrl: 'https://lakeinsurveyor.mygisonline.com/'
  },

  // St. Joseph County (South Bend/Mishawaka)
  stjoseph: {
    url: 'https://gis.southbendin.gov/arcgis/rest/services/LandRecords/Parcels_County/MapServer/0/query',
    pinField: 'PARCEL_ID', ownerField: 'OWNER_NAME', addrField: 'PROP_ADDR',
    avField: 'AV_TOTAL', acresField: 'CALC_ACRES', schema: 'standard',
    lookupUrl: 'https://sjcgov.org/department/assessor'
  },

  // Vanderburgh County (Evansville) — confirmed public MapServer
  vanderburgh: {
    url:      'https://maps.evansvillegis.com/arcgis_server/rest/services/PROPERTY/PARCELS/MapServer/0/query',
    pinField: 'STATE_PARCEL_ID', ownerField: 'OWNER_NAME', addrField: 'PROP_ADDR',
    acresField: 'CALC_ACRES', schema: 'vanderburgh',
    lookupUrl: 'https://maps.evansvillegis.com/'
  },

  // Tippecanoe County (Lafayette) — ArcGIS Online public layer
  tippecanoe: {
    url: 'https://wfs.schneidercorp.com/arcgis/rest/services/TippecanoeCountyIN_WFS/MapServer/58/query',
    pinField: 'PARCEL_NUMBER', ownerField: 'OWNER_NAME', addrField: 'PROPERTY_ADDRESS',
    avField: 'ASSESSED_VALUE', acresField: 'ACRES', schema: 'standard',
    lookupUrl: 'https://beacon.schneidercorp.com/?site=TippecanoeCountyIN'
  },

  //  TIER 2B: Schneider WFS — confirmed field schemas 

  // Johnson County — LOCKED (confirmed working)
  johnson: {
    url:           'https://wfs.schneidercorp.com/arcgis/rest/services/JohnsonCountyIN_WFS/MapServer/2/query',
    pinField:      'PARCEL_NUM',  ownerField:    'OWNER1',
    addrField:     'ST_ADDR',     cityField:     'ST_CITY',    zipField:     'ST_ZIP',
    mailAddrField: 'MAIL_ADDR',   mailCityField: 'MAIL_CITY',  mailStField:  'MAIL_ST', mailZipField: 'MAIL_ZIP',
    avField:       'CERT_VALUE',  acresField:    'ACRES',      twpField:     'TWP_NAME',
    schoolField:   'SCHOOL_DIST', legalField:    'LEGAL',      saleDateField:'XFER_DATE', docField:'DOC_NUM',
    classField:    'PROP_CLASS',
    schema: 'schneiderjc', lookupUrl: 'https://beacon.schneidercorp.com/?site=JohnsonCountyIN'
  },

  // Hancock County — confirmed from live schema: OWNER1, PARCEL_ID, LEG_ACR
  hancock: {
    url:           'https://wfs.schneidercorp.com/arcgis/rest/services/HancockCountyIN_WFS/MapServer/3/query',
    pinField:      'PARCEL_ID',   ownerField:    'OWNER1',
    addrField:     'PROP_STREE',  cityField:     'PROP_CITY',  zipField:     'PROP_ZIP',
    mailAddrField: 'OWN_STREET',  mailCityField: 'OWN_CITY',   mailZipField: 'OWN_ZIP',
    legalField:    'LEG_DESC',    acresField:    'LEG_ACR',    saleDateField:'LASTTRANS', salePriceField:'CONSIDERAT',
    classField:    'PROPERTY_C',
    schema: 'schneiderhc', lookupUrl: 'https://beacon.schneidercorp.com/?site=HancockCountyIN'
  },

  // Decatur County — confirmed from live schema: owner1, PIN, TotalValue
  decatur: {
    url:           'https://wfs.schneidercorp.com/arcgis/rest/services/DecaturCountyIN_WFS/MapServer/0/query',
    pinField:      'PIN',         ownerField:    'owner1',
    addrField:     'prop_str',    cityField:     'prop_city',  zipField:     'prop_zip',
    mailAddrField: 'own_street',  mailCityField: 'own_city',   mailStField:  'own_state', mailZipField: 'own_zip',
    acresField:    'Acreage',     avField:       'TotalValue', lvField:      'LandValue', ivField: 'ImprovValue',
    classField:    'PropertyCl',
    schema: 'schneiderdc', lookupUrl: 'https://beacon.schneidercorp.com/?site=DecaturCountyIN'
  },

  // LaGrange County — confirmed: Owner, PIN, Legal_Ac
  lagrange: {
    url:      'https://wfs.schneidercorp.com/arcgis/rest/services/LaGrangeCountyIN_WFS/MapServer/3/query',
    pinField: 'PIN', ownerField: 'Owner', acresField: 'Legal_Ac', legalField: 'Description',
    schema:   'schneiderlg', lookupUrl: 'https://beacon.schneidercorp.com/?site=LaGrangeCountyIN'
  },

  // Steuben County — confirmed: Owners, PIN, Acreage
  steuben: {
    url:      'https://wfs.schneidercorp.com/arcgis/rest/services/SteubenCountyIN_WFS/MapServer/3/query',
    pinField: 'PIN', ownerField: 'Owners', acresField: 'Acreage',
    schema:   'schneiderst', lookupUrl: 'https://beacon.schneidercorp.com/?site=SteubenCountyIN'
  },

  // Wabash County — Schneider WFS
  wabash: {
    url:      'https://wfs.schneidercorp.com/arcgis/rest/services/WabashCountyIN_WFS/MapServer/2/query',
    pinField: 'PARCEL_NUM', ownerField: 'OWNER1', addrField: 'PROP_ADDR', acresField: 'ACRES',
    schema:   'schneiderwb', lookupUrl: 'https://beacon.schneidercorp.com/?site=WabashCountyIN'
  },

  // Wells County — Schneider WFS
  wells: {
    url:      'https://wfs.schneidercorp.com/arcgis/rest/services/WellsCountyIN_WFS/MapServer/2/query',
    pinField: 'PARCEL_NUM', ownerField: 'OWNER1', addrField: 'PROP_ADDR', acresField: 'ACRES',
    schema:   'schneiderwl', lookupUrl: 'https://beacon.schneidercorp.com/?site=WellsCountyIN'
  },

  // Whitley County — Schneider WFS
  whitley: {
    url:      'https://wfs.schneidercorp.com/arcgis/rest/services/WhitleyCountyIN_WFS/MapServer/2/query',
    pinField: 'PARCEL_NUM', ownerField: 'OWNER1', addrField: 'PROP_ADDR', acresField: 'ACRES',
    schema:   'schneiderwy', lookupUrl: 'https://beacon.schneidercorp.com/?site=WhitleyCountyIN'
  },

  // Monroe County — Schneider WFS (also in ElevateMaps but this may be more current)
  // Note: Monroe is in EM_LAYER92 so ElevateMaps takes precedence

  // Morgan County — Schneider WFS — CONFIRMED layer 0 — = LOCKED
  // Verified 2026-04-27: MorganCountyIN_WFS/MapServer/0
  morgan: {
    url:           'https://wfs.schneidercorp.com/arcgis/rest/services/MorganCountyIN_WFS/MapServer/0/query',
    pinField:      'pin_18',             ownerField:    'owner',
    addrField:     'property_street',    mailAddrField: 'owner_street',
    mailCityStZipField: 'owner_city_st_zip',
    avField:       'tot_assessed_value', acresField:    'legal_acreage',
    legalField:    'legal_desc',         twpField:      'political_twp',
    saleDateField: 'latest_sale_date',   salePriceField:'latest_sale_price',
    classField:    'prop_class_desc',
    schema:        'schneidermg',        lookupUrl: 'https://beacon.schneidercorp.com/?site=MorganCountyIN'
  },

  // Rush County — Schneider WFS
  rush: {
    url:      'https://wfs.schneidercorp.com/arcgis/rest/services/RushCountyIN_WFS/MapServer/2/query',
    pinField: 'PIN', ownerField: 'OWNER1', addrField: 'PROP_ADDR', acresField: 'ACRES',
    schema:   'schneiderrh', lookupUrl: 'https://beacon.schneidercorp.com/?site=RushCountyIN'
  },

  // Tipton County — Schneider WFS
  tipton: {
    url:      'https://wfs.schneidercorp.com/arcgis/rest/services/TiptonCountyIN_WFS/MapServer/2/query',
    pinField: 'PARCEL_NUM', ownerField: 'OWNER1', addrField: 'PROP_ADDR', acresField: 'ACRES',
    schema:   'schneidertp', lookupUrl: 'https://beacon.schneidercorp.com/?site=TiptonCountyIN'
  },

  // Miami County — Schneider WFS — CONFIRMED layer 0 — = LOCKED
  // Verified 2026-04-27: MiamiCountyIN_WFS/MapServer/0
  miami: {
    url:           'https://wfs.schneidercorp.com/arcgis/rest/services/MiamiCountyIN_WFS/MapServer/0/query',
    pinField:      'pin_18',             ownerField:    'owner',
    addrField:     'property_street',    mailAddrField: 'owner_street',
    mailCityStZipField: 'owner_city_st_zip',
    avField:       'tot_assessed_value', acresField:    'legal_acreage',
    legalField:    'legal_desc',         twpField:      'political_twp',
    saleDateField: 'latest_sale_date',   salePriceField:'latest_sale_price',
    classField:    'prop_class_desc',
    schema:        'schneidermg',        lookupUrl: 'https://beacon.schneidercorp.com/?site=MiamiCountyIN'
  },

  // Monroe County (Bloomington) — Schneider WFS — CONFIRMED layer 0 — = LOCKED
  // Verified 2026-04-27: MonroeCountyIN_WFS/MapServer/0 (mixed-case fields)
  monroe: {
    url:           'https://wfs.schneidercorp.com/arcgis/rest/services/MonroeCountyIN_WFS/MapServer/0/query',
    pinField:      'PIN_18',             ownerField:    'Owner',
    addrField:     'Property_Street',    mailAddrField: 'Owner_Street',
    mailCityStZipField: 'Owner_City_ST_ZIP',
    avField:       'tot_assessed_value', acresField:    'Legal_Acreage',
    legalField:    'Legal_Desc',         twpField:      'Political_Twp',
    saleDateField: 'Latest_Sale_Date',   salePriceField:'Latest_Sale_Price',
    classField:    'PROP_Class_Desc',
    schema:        'schneidermg',        lookupUrl: 'https://beacon.schneidercorp.com/?site=MonroeCountyIN'
  },

  // White County — Schneider WFS — CONFIRMED layer 0 — = LOCKED
  // Verified 2026-04-27: WhiteCountyIN_WFS/MapServer/0
  white: {
    url:           'https://wfs.schneidercorp.com/arcgis/rest/services/WhiteCountyIN_WFS/MapServer/0/query',
    pinField:      'pin_18',             ownerField:    'owner',
    addrField:     'property_street',    mailAddrField: 'owner_street',
    mailCityStZipField: 'owner_city_st_zip',
    avField:       'tot_assessed_value', acresField:    'legal_acreage',
    legalField:    'legal_desc',         twpField:      'political_twp',
    saleDateField: 'latest_sale_date',   salePriceField:'latest_sale_price',
    classField:    'prop_class_desc',
    schema:        'schneidermg',        lookupUrl: 'https://beacon.schneidercorp.com/?site=WhiteCountyIN'
  },
};


  if (typeof EM_LAYER92         !== 'undefined') window.EM_LAYER92         = EM_LAYER92;
  if (typeof EM_BASE            !== 'undefined') window.EM_BASE            = EM_BASE;
  if (typeof L92_FIELDS         !== 'undefined') window.L92_FIELDS         = L92_FIELDS;
  if (typeof COUNTY_PARCEL_APIS !== 'undefined') window.COUNTY_PARCEL_APIS = COUNTY_PARCEL_APIS;
})();
