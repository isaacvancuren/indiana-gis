// static/v2/geo-county-layers.js
// Extracted from index.html (Tier-2 county-specific layer registries).
// Defines: IGIO_SVC, IGIO_ADMIN, *_BASE, *_LAYERS as window globals.
(function(){

const IGIO_SVC = 'https://gisdata.in.gov/server/rest/services/Hosted';
const IGIO_ADMIN = IGIO_SVC + '/Administrative_Boundaries_of_Indiana_2024/FeatureServer';
// Layer IDs in Administrative_Boundaries_of_Indiana_2024:
//  0=Municipalities, 1=Unincorporated, 2=Neighborhoods
//  3=County Commissioner, 4=County Council, 5=EMS, 6=Fire
//  7=Library, 8=Police, 9=Provisioning, 10=PSAP
//  11=School District, 12=Tax District, 13=TIF District

//  ElevateMaps county-specific MapServer base URL 
// PPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPP
//  UNIVERSAL DYNAMIC GIS LAYER SYSTEM v18
//  
//  Architecture:
//  1. On county switch: fetch MapServer?f=json → get real layer list
//  2. Build layer panel HTML dynamically from that list  
//  3. Each checkbox maps directly to its real layer ID — no guessing
//  4. Statewide layers (FEMA, imagery) always present
//  5. County-specific layers only shown when county has them
// PPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPP

// County ElevateMaps MapServer base URL
// PPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPP
//  GIS LAYER SYSTEM — Bartholomew County First, All 92 Dynamic
// PPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPP

function getActiveDynamicBase() {
  const em = activeCounty && activeCounty.em;
  return em
    ? 'https://elb.elevatemaps.io/arcgis/rest/services/eGISDynamicServices/' + em + '/MapServer'
    : null;
}

// Confirmed Bartholomew County layers (live MapServer, all real IDs)
const BARTHOLOMEW_LAYERS = [
  // Parcels & Property
  {id:92,  name:'Parcels',                        cat:'parcels'},
  {id:110, name:'Parcels — Latest Sale',           cat:'parcels'},
  {id:125, name:'BZA Parcels',                    cat:'parcels'},
  {id:93,  name:'Subdivisions / Plats',           cat:'parcels'},
  {id:87,  name:'Lot / Deed Lines',               cat:'parcels'},
  {id:86,  name:'Easements',                      cat:'parcels'},
  {id:0,   name:'Address Points',                 cat:'parcels'},
  {id:41,  name:'Building Footprints',            cat:'parcels'},
  {id:94,  name:'Property Classes',               cat:'parcels'},
  {id:119, name:'Residential Review Group',       cat:'parcels'},
  {id:120, name:'Commercial/Industrial Group',    cat:'parcels'},
  {id:121, name:'Agricultural Review Group',      cat:'parcels'},
  {id:118, name:'Exempt Review Group',            cat:'parcels'},
  {id:112, name:'Utility Review Group',           cat:'parcels'},
  {id:95,  name:'Neighborhoods',                  cat:'parcels'},
  {id:96,  name:'Tax Units',                      cat:'parcels'},
  // Parcel Annotations
  {id:1,   name:'Annotations — Acreage',          cat:'annotations'},
  {id:7,   name:'Annotations — Lot Numbers',      cat:'annotations'},
  {id:13,  name:'Annotations — Dimensions',       cat:'annotations'},
  {id:88,  name:'Property Address Labels',        cat:'annotations'},
  {id:89,  name:'GIS Area Labels',                cat:'annotations'},
  {id:90,  name:'State ID Labels',                cat:'annotations'},
  // Zoning
  {id:80,  name:'Zoning — Base Districts',        cat:'zoning'},
  {id:71,  name:'Zoning — Hartsville',            cat:'zoning'},
  {id:72,  name:'Zoning — Joint Overlay',         cat:'zoning'},
  {id:74,  name:'Zoning — Wellfield Overlay',     cat:'zoning'},
  {id:76,  name:'Zoning — Airport Overlay',       cat:'zoning'},
  {id:127, name:'Zoning — Front Door Overlay',    cat:'zoning'},
  {id:75,  name:'Zoning — Commitments',           cat:'zoning'},
  {id:70,  name:'TIF Districts',                  cat:'zoning'},
  {id:85,  name:'Planning Jurisdiction',          cat:'zoning'},
  // Hydrology & Flooding
  {id:31,  name:'Hydrology (Streams / Water)',    cat:'hydrology'},
  {id:81,  name:'Regulated Drains',               cat:'hydrology'},
  {id:82,  name:'Drain Watersheds',               cat:'hydrology'},
  {id:77,  name:'FEMA Floodplain (ElevateMaps)',  cat:'hydrology'},
  {id:78,  name:'Floodplain FIRM Panel Numbers',  cat:'hydrology'},
  {id:79,  name:'Haw Creek Floodplain',           cat:'hydrology'},
  {id:98,  name:'MS4 Stormwater Areas',           cat:'hydrology'},
  {id:84,  name:'Buffered Areas',                 cat:'hydrology'},
  // Transportation
  {id:47,  name:'Roads / Centerlines',            cat:'transportation'},
  {id:42,  name:'Road Right-of-Way',              cat:'transportation'},
  {id:43,  name:'Active Rail System',             cat:'transportation'},
  {id:39,  name:'Bridge Inventory',               cat:'transportation'},
  {id:40,  name:'Culverts',                       cat:'transportation'},
  {id:55,  name:'Bicycle & Pedestrian Facilities',cat:'transportation'},
  {id:56,  name:'ColumBUS Transit Routes',        cat:'transportation'},
  // Civic Boundaries
  {id:54,  name:'County Boundary',                cat:'civic'},
  {id:52,  name:'Corporate Boundaries (Cities)',  cat:'civic'},
  {id:53,  name:'Townships',                      cat:'civic'},
  {id:67,  name:'Land Survey Sections (PLSS)',    cat:'civic'},
  {id:107, name:'Voting Precincts',               cat:'civic'},
  {id:68,  name:'2020 Census Blocks',             cat:'civic'},
  {id:69,  name:'2020 Census Tracts',             cat:'civic'},
  {id:97,  name:'Electric Service Areas',         cat:'civic'},
  // Districts & Political
  {id:99,  name:'School Districts',               cat:'districts'},
  {id:100, name:'School Board Districts',         cat:'districts'},
  {id:101, name:'High School Districts',          cat:'districts'},
  {id:102, name:'Middle School Districts',        cat:'districts'},
  {id:103, name:'Elementary School Districts',    cat:'districts'},
  {id:104, name:'City Council Districts',         cat:'districts'},
  {id:105, name:'County Commissioner Districts',  cat:'districts'},
  {id:106, name:'County Council Districts',       cat:'districts'},
  {id:116, name:'Congressional Districts (2021)', cat:'districts'},
  {id:115, name:'Indiana House (2021)',            cat:'districts'},
  {id:114, name:'Indiana Senate (2021)',           cat:'districts'},
  // Points of Interest
  {id:83,  name:'Parks',                          cat:'poi'},
  {id:32,  name:'Schools',                        cat:'poi'},
  {id:33,  name:'Hospitals & Rural Health',       cat:'poi'},
  {id:34,  name:'Libraries',                      cat:'poi'},
  {id:35,  name:'Cemeteries',                     cat:'poi'},
  {id:38,  name:'Cell Towers',                    cat:'poi'},
  // Environment
  {id:57,  name:'Contours (All Scales)',           cat:'environment'},
  {id:108, name:'Soils (SSURGO)',                 cat:'environment'},
];

//  Johnson County Indiana — Complete multi-service ArcGIS layer list 
// Server: https://greenwoodgis.greenwood.in.gov/arcgis/rest/services/
// Confirmed services and layer IDs from live ArcGIS REST endpoints
// Folders: Airport, BaseMaps, Cityworks, Code_Enforcement, Council, County,
//          Dig_Smart, Engineering, Parks, Planning, Sanitary_Sewer,
//          Schools, Street_Maps, Stormwater
const JC_BASE = 'https://greenwoodgis.greenwood.in.gov/arcgis/rest/services';
const JOHNSON_LAYERS = [

  //  PARCELS & PROPERTY 
  // County/Land_Records — primary parcel service with all parcel sub-layers
  {svc:`${JC_BASE}/County/Land_Records/MapServer`,      ids:[0],   name:'Parcels',                          cat:'parcels'},
  {svc:`${JC_BASE}/County/Land_Records/MapServer`,      ids:[1],   name:'Parcel Labels / Annotations',      cat:'annotations'},
  {svc:`${JC_BASE}/County/Land_Records/MapServer`,      ids:[2],   name:'Parcel Text',                      cat:'annotations'},
  {svc:`${JC_BASE}/County/Land_Records/MapServer`,      ids:[3],   name:'Acreage Labels',                   cat:'annotations'},
  {svc:`${JC_BASE}/County/Land_Records/MapServer`,      ids:[4],   name:'BRP Labels',                       cat:'annotations'},
  {svc:`${JC_BASE}/County/Land_Records/MapServer`,      ids:[5],   name:'Parcel Dimensions',                cat:'annotations'},
  // Separate address point service
  {svc:`${JC_BASE}/County/JohnsonCountyAddresses/MapServer`, ids:[0], name:'Address Points',               cat:'parcels'},
  // Combined county parcels + addresses + roads (IC = Integrated County)
  {svc:`${JC_BASE}/County/Parcels_AddressPoints_Roads_IC/MapServer`, ids:[0], name:'Parcels (Integrated)',  cat:'parcels'},
  {svc:`${JC_BASE}/County/Parcels_AddressPoints_Roads_IC/MapServer`, ids:[1], name:'Address Points (IC)',   cat:'parcels'},
  {svc:`${JC_BASE}/County/Parcels_AddressPoints_Roads_IC/MapServer`, ids:[2], name:'Roads (IC)',            cat:'transportation'},

  //  ZONING & PLANNING 
  {svc:`${JC_BASE}/Planning/Zoning_District/MapServer`,   ids:[0],  name:'County Zoning Districts',         cat:'zoning'},
  // Planning_On has multiple layers: Public Notice Map (0), Annexations (1), PDS Zones (2), Plans & Plats group
  {svc:`${JC_BASE}/Planning/Planning_On/MapServer`,        ids:[0],  name:'Public Notice Map',              cat:'zoning'},
  {svc:`${JC_BASE}/Planning/Planning_On/MapServer`,        ids:[1],  name:'Annexations',                    cat:'zoning'},
  {svc:`${JC_BASE}/Planning/Planning_On/MapServer`,        ids:[2],  name:'PDS Zones',                      cat:'zoning'},
  {svc:`${JC_BASE}/Planning/Planning_On/MapServer`,        ids:[4,5],name:'Plans & Plats',                  cat:'zoning'},
  // JCAS Zones (Jurisdictional / Assessment zones)
  {svc:`${JC_BASE}/Planning/JCAS_Zones/MapServer`,         ids:[0],  name:'JCAS Assessment Zones',          cat:'zoning'},

  //  HYDROLOGY & STORMWATER 
  // FEMA flood data stored in Land_Records
  {svc:`${JC_BASE}/County/Land_Records/MapServer`,          ids:[6],  name:'FEMA Floodplain',               cat:'hydrology'},
  // Stormwater creek network
  {svc:`${JC_BASE}/Stormwater/StormwaterCreeks/MapServer`,  ids:[0],  name:'Stormwater Creeks',             cat:'hydrology'},
  // Impervious surfaces (City of Greenwood)
  {svc:`${JC_BASE}/Stormwater/ImperviousSurface/MapServer`, ids:[0],  name:'Impervious Surfaces (Greenwood)',cat:'hydrology'},
  // Stormwater structures map
  {svc:`${JC_BASE}/Cityworks/Stormwater_Map/MapServer`,     ids:[0,1,2,3,4,5,6,7], name:'Stormwater System (Greenwood)', cat:'hydrology'},

  //  TRANSPORTATION 
  // Street Department — road centerlines, names, intersections
  {svc:`${JC_BASE}/Street_Maps/Street_Department/MapServer`,ids:[0],  name:'Roads (Greenwood)',             cat:'transportation'},
  {svc:`${JC_BASE}/Street_Maps/Street_Department/MapServer`,ids:[1],  name:'Road Names',                    cat:'transportation'},
  {svc:`${JC_BASE}/Street_Maps/Street_Department/MapServer`,ids:[2],  name:'Intersections',                 cat:'transportation'},
  {svc:`${JC_BASE}/Street_Maps/Street_Department/MapServer`,ids:[3],  name:'Sidewalks',                     cat:'transportation'},
  {svc:`${JC_BASE}/Street_Maps/Street_Department/MapServer`,ids:[4],  name:'Street Pavement Condition',     cat:'transportation'},
  {svc:`${JC_BASE}/Street_Maps/Street_Department/MapServer`,ids:[5],  name:'Road Construction & Closures',  cat:'transportation'},
  // Engineering — road repair, crack seals, construction projects
  {svc:`${JC_BASE}/Engineering/Engineering_On/MapServer`,   ids:[0,1,2,3,4,5,6,7,8,9,10], name:'Engineering Projects',cat:'transportation'},
  // Parks trails & paths network
  {svc:`${JC_BASE}/Parks/TrailsPaths/MapServer`,            ids:[0],  name:'Trails & Paths (Greenwood)',    cat:'transportation'},
  // Bridges (from Cityworks Main Map)
  {svc:`${JC_BASE}/Cityworks/Main_Map_1222020/MapServer`,   ids:[5],  name:'Bridges',                       cat:'transportation'},
  // Curb ramps
  {svc:`${JC_BASE}/Cityworks/Main_Map_1222020/MapServer`,   ids:[6],  name:'Curb Ramps',                    cat:'transportation'},

  //  UTILITIES & INFRASTRUCTURE 
  // Sanitary Sewer system
  {svc:`${JC_BASE}/Sanitary_Sewer/Sanitary_Sewer_Off/MapServer`,ids:[0], name:'Sanitary Sewer System',     cat:'utility'},
  {svc:`${JC_BASE}/Sanitary_Sewer/Sanitary_Sewer_Off/MapServer`,ids:[1], name:'Sewer Manholes',            cat:'utility'},
  {svc:`${JC_BASE}/Sanitary_Sewer/Sanitary_Sewer_Off/MapServer`,ids:[3], name:'Sewer Gravity Mains',       cat:'utility'},
  {svc:`${JC_BASE}/Sanitary_Sewer/Sanitary_Sewer_Off/MapServer`,ids:[5], name:'Sewer Lateral Lines',       cat:'utility'},
  // Signs & poles (street infrastructure)
  {svc:`${JC_BASE}/Cityworks/Main_Map_1222020/MapServer`,   ids:[8],  name:'Street Signs',                  cat:'utility'},
  {svc:`${JC_BASE}/Cityworks/Main_Map_1222020/MapServer`,   ids:[9],  name:'Utility Poles',                 cat:'utility'},
  // Special Tax Districts
  {svc:`${JC_BASE}/Cityworks/Main_Map_1222020/MapServer`,   ids:[3],  name:'Special Tax Districts',         cat:'civic'},

  //  CIVIC BOUNDARIES 
  // Land Survey / PLSS / USNG grid
  {svc:`${JC_BASE}/County/Public_Land_Survey_USNG/MapServer`,ids:[0], name:'Land Survey Sections (PLSS)',   cat:'civic'},
  {svc:`${JC_BASE}/County/Public_Land_Survey_USNG/MapServer`,ids:[1], name:'USNG Grid',                     cat:'civic'},
  // Neighborhoods
  {svc:`${JC_BASE}/County/Neighborhoods/MapServer`,          ids:[0], name:'Neighborhoods',                  cat:'civic'},
  // ROW (Right-of-Way) research layers
  {svc:`${JC_BASE}/County/ROW_Research_Plans/MapServer`,     ids:[0], name:'ROW Plans',                     cat:'civic'},
  {svc:`${JC_BASE}/County/ROW_Research_Docs/MapServer`,      ids:[0], name:'ROW Documents',                 cat:'civic'},
  // Road Construction & Closures
  {svc:`${JC_BASE}/County/Road_Construction_Closures/MapServer`,ids:[0],name:'Road Closures',               cat:'civic'},

  //  SCHOOL & POLITICAL DISTRICTS 
  // School Attendance Areas
  {svc:`${JC_BASE}/County/School_Attendance_Area_Lookup/MapServer`, ids:[0], name:'School Attendance Zones', cat:'districts'},
  {svc:`${JC_BASE}/County/School_Attendance_Area_Lookup_Supplement/MapServer`,ids:[0],name:'School Zones (Supplement)',cat:'districts'},
  // Schools points layer
  {svc:`${JC_BASE}/County/Schools/MapServer`,                ids:[0], name:'Schools',                        cat:'districts'},

  //  POINTS OF INTEREST 
  // Parks system
  {svc:`${JC_BASE}/Parks/TrailsPaths/MapServer`,             ids:[1], name:'Parks',                          cat:'poi'},
  // Code enforcement / public health
  {svc:`${JC_BASE}/County/Public_Health/MapServer`,          ids:[0], name:'Public Health Facilities',       cat:'poi'},

  //  ELECTION & GOVERNMENT 
  {svc:`${JC_BASE}/Council/MapServer`,                       ids:[0], name:'Council Districts',              cat:'districts'},
];


//  Marion County (Indianapolis) — Multi-service ArcGIS layer list 
// Primary server: https://gis.indy.gov/server/rest/services/MapIndy/
const MC_BASE = 'https://gis.indy.gov/server/rest/services/MapIndy';
const MARION_LAYERS = [
  //  PARCELS & PROPERTY
  {svc:`${MC_BASE}/MapIndyProperty/MapServer`, ids:[10],  name:'Parcels',                       cat:'parcels'},
  {svc:`${MC_BASE}/MapIndyProperty/MapServer`, ids:[0],   name:'Address Points',                cat:'parcels'},
  {svc:`${MC_BASE}/MapIndyProperty/MapServer`, ids:[8],   name:'Buildings',                     cat:'parcels'},
  {svc:`${MC_BASE}/MapIndyProperty/MapServer`, ids:[9],   name:'Right of Way',                  cat:'parcels'},
  {svc:`${MC_BASE}/MapIndyProperty/MapServer`, ids:[11],  name:'Abandoned & Vacant Properties', cat:'parcels'},
  {svc:`${MC_BASE}/MapIndyProperty/MapServer`, ids:[16],  name:'Abandoned & Vacant (Points)',   cat:'parcels'},
  {svc:`${MC_BASE}/MapIndyProperty/MapServer`, ids:[27],  name:'Registered Landlord Properties',cat:'parcels'},
  {svc:`${MC_BASE}/MapIndyProperty/MapServer`, ids:[13],  name:'Easements',                     cat:'parcels'},
  {svc:`${MC_BASE}/MapIndyProperty/MapServer`, ids:[19],  name:'Subdivisions',                  cat:'parcels'},
  {svc:`${MC_BASE}/Zoning/MapServer`,          ids:[4],   name:'Building Footprints',           cat:'parcels'},
  //  ANNOTATIONS
  {svc:`${MC_BASE}/MapIndyProperty/MapServer`, ids:[12],  name:'Street Labels',                 cat:'annotations'},
  {svc:`${MC_BASE}/MapIndyProperty/MapServer`, ids:[1],   name:'Landmarks',                     cat:'annotations'},
  //  ZONING & PLANNING
  {svc:`${MC_BASE}/Zoning/MapServer`,          ids:[6],   name:'Zoning Districts',              cat:'zoning'},
  {svc:`${MC_BASE}/Zoning/MapServer`,          ids:[5],   name:'Rezoning',                      cat:'zoning'},
  {svc:`${MC_BASE}/Zoning/MapServer`,          ids:[1],   name:'Zoning Variances',              cat:'zoning'},
  {svc:`${MC_BASE}/Zoning/MapServer`,          ids:[2],   name:'Legal Non-Conforming Use',      cat:'zoning'},
  {svc:`${MC_BASE}/Zoning/MapServer`,          ids:[3],   name:'Development Approvals',         cat:'zoning'},
  {svc:`${MC_BASE}/MapIndyProperty/MapServer`, ids:[17],  name:'Zoning (Property View)',        cat:'zoning'},
  {svc:`${MC_BASE}/MapIndyProperty/MapServer`, ids:[18],  name:'Rezoning (Property View)',      cat:'zoning'},
  {svc:`${MC_BASE}/Zoning/MapServer`,          ids:[8],   name:'Historically Significant Areas',cat:'zoning'},
  //  HYDROLOGY & FLOOD
  {svc:`${MC_BASE}/Zoning/MapServer`,          ids:[7],   name:'Flood Zones (FEMA)',            cat:'hydrology'},
  {svc:`${MC_BASE}/MapIndyProperty/MapServer`, ids:[28],  name:'Flood Zones (Property View)',   cat:'hydrology'},
  {svc:`${MC_BASE}/MapIndyProperty/MapServer`, ids:[14],  name:'Legal Drains',                  cat:'hydrology'},
  {svc:`${MC_BASE}/MapIndyProperty/MapServer`, ids:[4,5], name:'Sanitary Sewers & Manholes',    cat:'hydrology'},
  {svc:`${MC_BASE}/MapIndyProperty/MapServer`, ids:[6,7], name:'Storm Sewers & Manholes',       cat:'hydrology'},
  //  ENVIRONMENT
  {svc:`${MC_BASE}/MapIndyProperty/MapServer`, ids:[2,3], name:'Contours (2016)',               cat:'environment'},
  {svc:`${MC_BASE}/IndyBrownfields/MapServer`, ids:[0],   name:'Brownfields Site Inventory',   cat:'environment'},
  {svc:`${MC_BASE}/MapIndyProperty/MapServer`, ids:[29],  name:'Brownfields (Property View)',  cat:'environment'},
  //  CIVIC BOUNDARIES
  {svc:`${MC_BASE}/MapIndyProperty/MapServer`, ids:[20],  name:'Excluded Cities',               cat:'civic'},
  {svc:`${MC_BASE}/MapIndyProperty/MapServer`, ids:[21],  name:'Towns',                         cat:'civic'},
  {svc:`${MC_BASE}/MapIndyProperty/MapServer`, ids:[22],  name:'Zip Codes',                     cat:'civic'},
  {svc:`${MC_BASE}/MapIndyProperty/MapServer`, ids:[23],  name:'2010 Census Tracts',            cat:'civic'},
  {svc:`${MC_BASE}/MapIndyProperty/MapServer`, ids:[24],  name:'Survey Quarter Sections',       cat:'civic'},
  {svc:`${MC_BASE}/MapIndyProperty/MapServer`, ids:[25],  name:'Township Boundaries',           cat:'civic'},
  {svc:`${MC_BASE}/PoliticalBoundaries/MapServer`, ids:[0], name:'Cities (Indianapolis)',       cat:'civic'},
  {svc:`${MC_BASE}/PoliticalBoundaries/MapServer`, ids:[2], name:'Towns (Boundaries)',          cat:'civic'},
  {svc:`${MC_BASE}/PoliticalBoundaries/MapServer`, ids:[3], name:'Township Boundaries (Political)', cat:'civic'},
  //  DISTRICTS & POLITICAL
  {svc:`${MC_BASE}/PoliticalBoundaries/MapServer`, ids:[1], name:'School Corporations',        cat:'districts'},
  {svc:`${MC_BASE}/PoliticalBoundaries/MapServer`, ids:[4], name:'Voting Township Boards',     cat:'districts'},
  {svc:`${MC_BASE}/PoliticalBoundaries/MapServer`, ids:[6], name:'Voting Township Boards (Current)', cat:'districts'},
  {svc:`${MC_BASE}/PoliticalBoundaries/MapServer`, ids:[7], name:'Town Council Districts',     cat:'districts'},
  {svc:`${MC_BASE}/VotingPrecinctsElectionResults/MapServer`, ids:[0], name:'Voting Precincts', cat:'districts'},
  {svc:`${MC_BASE}/MapIndyProperty/MapServer`, ids:[26],  name:'Fire Marshal Districts',       cat:'districts'},
  //  POINTS OF INTEREST
  {svc:`${MC_BASE}/MapIndyProperty/MapServer`, ids:[15],  name:'Fire Stations',                cat:'poi'},
  {svc:`${MC_BASE}/LawEnforcementFeatures/MapServer`, ids:[0], name:'Law Enforcement Features', cat:'poi'},
];

//  Hamilton County (gis1.hamiltoncounty.in.gov) 
const HC_BASE = 'https://gis1.hamiltoncounty.in.gov/arcgis/rest/services';
const HAMILTON_LAYERS = [
    // Parcels & Property
  {svc:`${HC_BASE}/HamCoParcelsPublic/MapServer`,             ids:[0],         name:'Parcels',                              cat:'parcels'},
  {svc:`${HC_BASE}/HamCoParcelLabels/MapServer`,              ids:[0],         name:'Parcel Labels',                        cat:'parcels'},
  {svc:`${HC_BASE}/HamCoSubdivisions/MapServer`,              ids:[0],         name:'Subdivisions',                         cat:'parcels'},
  {svc:`${HC_BASE}/HamCoPlat/MapServer`,                      ids:[0],         name:'Plats',                                cat:'parcels'},
  {svc:`${HC_BASE}/Streets_2244/MapServer`,                   ids:[8],         name:'Building Footprints',                  cat:'parcels'},

    // Annotations
  {svc:`${HC_BASE}/Streets_2244/MapServer`,                   ids:[9],         name:'Subdivision Labels',                   cat:'annotations'},
  {svc:`${HC_BASE}/Streets_2244/MapServer`,                   ids:[1],         name:'County Boundary Labels',               cat:'annotations'},
  {svc:`${HC_BASE}/HamCoCorporateLimits_NewViewer/MapServer`, ids:[0],         name:'Corporate Limits (Label)',             cat:'annotations'},

    // Zoning & Planning
  {svc:`${HC_BASE}/HamCoPlanning/MapServer`,                  ids:[1],         name:'Zoning (County)',                      cat:'zoning'},
  {svc:`${HC_BASE}/HamCoPlanning/MapServer`,                  ids:[0],         name:'Planning Jurisdictions',               cat:'zoning'},
  {svc:`${HC_BASE}/HamCoTIFDistricts/MapServer`,              ids:[0],         name:'TIF Districts',                        cat:'zoning'},
  {svc:`${HC_BASE}/HamCoAnnexation/MapServer`,                ids:[0],         name:'Annexations',                          cat:'zoning'},

    // Hydrology & Flooding
  {svc:`${HC_BASE}/HamCoHydro/MapServer`,                     ids:[2,3],       name:'Hydroline & Hydro Area',               cat:'hydrology'},
  {svc:`${HC_BASE}/HamCoHydro/MapServer`,                     ids:[5],         name:'Lakes and Reservoirs',                 cat:'hydrology'},
  {svc:`${HC_BASE}/HamCoHydro/MapServer`,                     ids:[6,7,8],     name:'Streams, Centerline & Pond Area',      cat:'hydrology'},
  {svc:`${HC_BASE}/HamCoHydro/MapServer`,                     ids:[0],         name:'Dams',                                 cat:'hydrology'},
  {svc:`${HC_BASE}/HamCoHydro/MapServer`,                     ids:[10,11,12],  name:'Aquifers (PSM)',                       cat:'hydrology'},
  {svc:`${HC_BASE}/HamCoDrains/MapServer`,                    ids:[16,17,18,19], name:'Regulated Drains',                   cat:'hydrology'},
  {svc:`${HC_BASE}/HamCoDrains/MapServer`,                    ids:[1],         name:'Drain Names',                          cat:'hydrology'},
  {svc:`${HC_BASE}/HamCoDrains/MapServer`,                    ids:[0],         name:'Drainage Structures',                  cat:'hydrology'},
  {svc:`${HC_BASE}/HamCoDrains/MapServer`,                    ids:[25],        name:'Drains Under Construction',            cat:'hydrology'},
  {svc:`${HC_BASE}/HamCoDrainageSheds/MapServer`,             ids:[0,1,2,3,4], name:'Drainage Sheds & Basins',              cat:'hydrology'},

    // Transportation
  {svc:`${HC_BASE}/Streets_2244/MapServer`,                   ids:[4,5,6,7],   name:'Roads (Interstates, State, Major, Minor)', cat:'transportation'},
  {svc:`${HC_BASE}/HamCoEdgeOfPavement/MapServer`,            ids:[0],         name:'Edge of Pavement (2024)',              cat:'transportation'},

    // Civic Boundaries
  {svc:`${HC_BASE}/HamCoBoundary/MapServer`,                  ids:[0],         name:'Hamilton County Boundary',             cat:'civic'},
  {svc:`${HC_BASE}/HamCoCorporateLimits_NewViewer/MapServer`, ids:[1,2],       name:'Corporate Limits (Cities)',            cat:'civic'},
  {svc:`${HC_BASE}/HamCoPolitical/MapServer`,                 ids:[0],         name:'Civil Townships',                      cat:'civic'},
  {svc:`${HC_BASE}/HamCoTaxDistricts/MapServer`,              ids:[0],         name:'Tax Districts',                        cat:'civic'},
  {svc:`${HC_BASE}/HamCoVoting/MapServer`,                    ids:[3],         name:'Voting Precincts (2026)',              cat:'civic'},
  {svc:`${HC_BASE}/HamCoVoting/MapServer`,                    ids:[2],         name:'Precinct Townships',                   cat:'civic'},

    // Districts & Political
  {svc:`${HC_BASE}/HamCoSchools/MapServer`,                   ids:[1],         name:'School Board Districts (2022)',        cat:'districts'},
  {svc:`${HC_BASE}/HamCoPolitical/MapServer`,                 ids:[1],         name:'County Commissioner Districts',        cat:'districts'},
  {svc:`${HC_BASE}/HamCoPolitical/MapServer`,                 ids:[2],         name:'County Council Districts',             cat:'districts'},
  {svc:`${HC_BASE}/HamCoPolitical/MapServer`,                 ids:[7],         name:'Municipal Council Districts',          cat:'districts'},
  {svc:`${HC_BASE}/HamCoPolitical/MapServer`,                 ids:[3],         name:'Indiana House Districts (123rd)',      cat:'districts'},
  {svc:`${HC_BASE}/HamCoPolitical/MapServer`,                 ids:[5],         name:'Indiana Senate Districts (123rd)',     cat:'districts'},
  {svc:`${HC_BASE}/HamCoPolitical/MapServer`,                 ids:[6],         name:'Congressional Districts (117th)',      cat:'districts'},

    // Points of Interest
  {svc:`${HC_BASE}/HamCoSchools/MapServer`,                   ids:[0],         name:'Schools',                              cat:'poi'},
  {svc:`${HC_BASE}/HamCoParks/MapServer`,                     ids:[4],         name:'Park Boundaries',                      cat:'poi'},
  {svc:`${HC_BASE}/HamCoParks/MapServer`,                     ids:[3],         name:'Trails',                               cat:'poi'},
  {svc:`${HC_BASE}/HamCoParks/MapServer`,                     ids:[2],         name:'Trailheads',                           cat:'poi'},
  {svc:`${HC_BASE}/HamCoCemeteries/MapServer`,                ids:[0],         name:'Cemeteries',                           cat:'poi'},
  {svc:`${HC_BASE}/HamCoHealth/MapServer`,                    ids:[0],         name:'Health Care Facilities',               cat:'poi'},
  {svc:`${HC_BASE}/HamCoHealth/MapServer`,                    ids:[1],         name:'Pharmacies',                           cat:'poi'},
  {svc:`${HC_BASE}/HamCoVoting/MapServer`,                    ids:[0],         name:'Voting Locations',                     cat:'poi'},
  {svc:`${HC_BASE}/HamCoEarlyVoting/MapServer`,               ids:[84],        name:'Early Voting Locations',               cat:'poi'},

    // Environment
  {svc:`${HC_BASE}/HamCoTopo/MapServer`,                      ids:[2,3,4,5],   name:'Contours (2024 — 10/5/2/1 ft)',         cat:'environment'},
  {svc:`${HC_BASE}/HamCoTopo/MapServer`,                      ids:[1],         name:'Spot Elevations (2024)',               cat:'environment'},
  {svc:`${HC_BASE}/Streets_2244/MapServer`,                   ids:[18],        name:'Hillshade',                            cat:'environment'},
  ];

//  Boone County (services1.arcgis.com — boonemapping AGOL org) 
const BC_BASE = 'https://services1.arcgis.com/GkTTq9BaSPUnctWP/arcgis/rest/services';
const BOONE_LAYERS = [
    // Parcels & Property
  {svc:`${BC_BASE}/BC_Parcels2024/FeatureServer`,            ids:[0], name:'Parcels (2025)',                  cat:'parcels'},
  {svc:`${BC_BASE}/BC_Assessor_points2020/FeatureServer`,    ids:[0], name:'Assessor Points (2020)',          cat:'parcels'},
  {svc:`${BC_BASE}/BC_Points/FeatureServer`,                 ids:[0], name:'Address / Building Points',       cat:'parcels'},

    // Hydrology
  {svc:`${BC_BASE}/Boone_County_Streams/FeatureServer`,      ids:[0], name:'Streams & Water Features',        cat:'hydrology'},
  {svc:`${BC_BASE}/BC_Low_Water_Crossings/FeatureServer`,    ids:[0], name:'Low Water Crossings',             cat:'hydrology'},
  {svc:`${BC_BASE}/Boone_County_Fire_Hydrants/FeatureServer`,ids:[0], name:'Fire Hydrants',                   cat:'hydrology'},

    // Transportation
  {svc:`${BC_BASE}/Boone_County_Roads/FeatureServer`,        ids:[0], name:'Roads',                           cat:'transportation'},
  {svc:`${BC_BASE}/Roadcenter04112024/FeatureServer`,        ids:[0], name:'Road Centerlines (2024)',         cat:'transportation'},

    // Civic Boundaries
  {svc:`${BC_BASE}/Boone_County_Line/FeatureServer`,         ids:[0], name:'Boone County Boundary',           cat:'civic'},
  {svc:`${BC_BASE}/City_Limits2020/FeatureServer`,           ids:[0], name:'City Limits (2020)',              cat:'civic'},
  {svc:`${BC_BASE}/HSN_CityLimit_2016/FeatureServer`,        ids:[0], name:'Historic City Limits (2016)',     cat:'civic'},
  {svc:`${BC_BASE}/BCSO_Patrol_Zones/FeatureServer`,         ids:[0], name:'Sheriff Patrol Zones',            cat:'civic'},

    // Districts
  {svc:`${BC_BASE}/BC_FireDistricts2021/FeatureServer`,      ids:[0], name:'Fire Districts (2021)',           cat:'districts'},
  {svc:`${BC_BASE}/HarrisonFirezones/FeatureServer`,         ids:[0], name:'Harrison Fire Zones',             cat:'districts'},
  {svc:`${BC_BASE}/Responder_Area/FeatureServer`,            ids:[0], name:'Responder Areas',                 cat:'districts'},
  {svc:`${BC_BASE}/Fire_Responder/FeatureServer`,            ids:[0], name:'Fire Responders',                 cat:'districts'},

    // Points of Interest
  {svc:`${BC_BASE}/Fire_Stations/FeatureServer`,             ids:[0], name:'Fire Stations',                   cat:'poi'},
  {svc:`${BC_BASE}/Air_Evac_LZ/FeatureServer`,               ids:[0], name:'Air Evac Landing Zones',          cat:'poi'},
];

  //  Wayne County (Richmond/WCRGIS AGOL org) 
  const WC_BASE = 'https://services3.arcgis.com/fhBemP00ea7p7i0U/arcgis/rest/services';
const WAYNE_LAYERS = [
    // Parcels & Property
  {svc:`${WC_BASE}/Parcel_BND_Cama/FeatureServer`,            ids:[0], name:'Parcels (BND/CAMA)',              cat:'parcels'},
  {svc:`${WC_BASE}/Richmond_Parcels_v2/FeatureServer`,        ids:[0], name:'Richmond Parcels',                cat:'parcels'},
  {svc:`${WC_BASE}/Land_Use/FeatureServer`,                   ids:[0], name:'Land Use',                        cat:'parcels'},
  {svc:`${WC_BASE}/Public_Right_of_Way/FeatureServer`,        ids:[0], name:'Public Right of Way',             cat:'parcels'},

    // Zoning & Planning
  {svc:`${WC_BASE}/Development_Zones/FeatureServer`,          ids:[0], name:'Development Zones',               cat:'zoning'},
  {svc:`${WC_BASE}/TIF/FeatureServer`,                        ids:[0], name:'TIF Districts',                   cat:'zoning'},
  {svc:`${WC_BASE}/Richmond_Opportunity_Zone/FeatureServer`,  ids:[0], name:'Opportunity Zone',                cat:'zoning'},
  {svc:`${WC_BASE}/Historic_Richmond_Conservation_District/FeatureServer`, ids:[0], name:'Historic Conservation District', cat:'zoning'},
  {svc:`${WC_BASE}/Outdoor_Refreshment_Area/FeatureServer`,   ids:[0], name:'Outdoor Refreshment Area',        cat:'zoning'},

    // Hydrology
  {svc:`${WC_BASE}/IDNR_Best_Available_Flood_Areas/FeatureServer`, ids:[0], name:'IDNR Flood Areas',           cat:'hydrology'},
  {svc:`${WC_BASE}/NFHL_Flood_Areas/FeatureServer`,           ids:[0], name:'NFHL Flood Areas',                cat:'hydrology'},
  {svc:`${WC_BASE}/Aquifer_Systems_of_Wayne_County/FeatureServer`, ids:[0], name:'Aquifer Systems',            cat:'hydrology'},
  {svc:`${WC_BASE}/Legal_Drain_Russell/FeatureServer`,        ids:[0], name:'Legal Drain (Russell)',           cat:'hydrology'},
  {svc:`${WC_BASE}/MWIP_Wetlands/FeatureServer`,              ids:[0], name:'MWIP Wetlands',                   cat:'hydrology'},

    // Transportation
  {svc:`${WC_BASE}/Street_Centerline/FeatureServer`,          ids:[0], name:'Street Centerlines',              cat:'transportation'},
  {svc:`${WC_BASE}/Community_Crossings/FeatureServer`,        ids:[0], name:'Community Crossings',             cat:'transportation'},
  {svc:`${WC_BASE}/June_2022_PASER_Ratings/FeatureServer`,    ids:[0], name:'PASER Pavement Ratings (2022)',   cat:'transportation'},

    // Civic Boundaries
  {svc:`${WC_BASE}/Richmond_City_Limits/FeatureServer`,       ids:[0], name:'Richmond City Limits',            cat:'civic'},
{svc:`${WC_BASE}/Richmond_Limits/FeatureServer`,            ids:[0], name:'Richmond Limits',                 cat:'civic'},
{svc:`${WC_BASE}/Centerville_Main_Street/FeatureServer`,    ids:[0], name:'Centerville Main Street',         cat:'civic'},
{svc:`${WC_BASE}/Political_County_Precincts/FeatureServer`, ids:[0], name:'Voting Precincts',                cat:'civic'},

    // Districts
{svc:`${WC_BASE}/Richmond_Certified_Technology_Park/FeatureServer`, ids:[0], name:'Certified Technology Park',  cat:'districts'},

    // Points of Interest
{svc:`${WC_BASE}/Community_Assets/FeatureServer`,           ids:[0], name:'Community Assets',                cat:'poi'},
{svc:`${WC_BASE}/Historic_Sites_and_Buildings/FeatureServer`, ids:[0], name:'Historic Sites & Buildings',     cat:'poi'},
{svc:`${WC_BASE}/Park_and_Recreation_Facilities_public/FeatureServer`, ids:[0], name:'Parks & Recreation',     cat:'poi'},
{svc:`${WC_BASE}/Tree_Inventory_2022/FeatureServer`,        ids:[0], name:'Tree Inventory (2022)',           cat:'poi'},
  ];

//  Floyd County (New Albany / OHM AGOL org) 
const FC_BASE = 'https://services.arcgis.com/EAoy39bcmpweKJ4f/arcgis/rest/services';
const FLOYD_LAYERS = [
    // Parcels & Property
  {svc:`${FC_BASE}/Floyd_County_Parcel_view/FeatureServer`,    ids:[0], name:'Parcels',                          cat:'parcels'},
  {svc:`${FC_BASE}/floyd_parcels/FeatureServer`,               ids:[0], name:'Parcels (Source)',                 cat:'parcels'},
  {svc:`${FC_BASE}/Permit_Parcels/FeatureServer`,              ids:[0], name:'Permit Parcels',                   cat:'parcels'},
  {svc:`${FC_BASE}/Floyd_County_Subdivisions_view/FeatureServer`, ids:[0], name:'Subdivisions',                  cat:'parcels'},
  {svc:`${FC_BASE}/Address_Points_view/FeatureServer`,         ids:[0], name:'Address Points',                   cat:'parcels'},
  {svc:`${FC_BASE}/Floyd_County_Section_Corners/FeatureServer`,ids:[0], name:'Section Corners',                  cat:'parcels'},
  {svc:`${FC_BASE}/Sections_2_shp/FeatureServer`,              ids:[0], name:'Land Sections',                    cat:'parcels'},

    // Zoning & Planning
  {svc:`${FC_BASE}/County_Zone_Map_view/FeatureServer`,        ids:[0], name:'County Zoning',                    cat:'zoning'},
  {svc:`${FC_BASE}/New_Albany_Zoning_view/FeatureServer`,      ids:[0], name:'New Albany Zoning',                 cat:'zoning'},
  {svc:`${FC_BASE}/Greenville_Zone_Map_view/FeatureServer`,    ids:[0], name:'Greenville Zoning',                 cat:'zoning'},
  {svc:`${FC_BASE}/Greenville_Historic_District_Zoning_view/FeatureServer`, ids:[0], name:'Greenville Historic District', cat:'zoning'},
  {svc:`${FC_BASE}/New_Albany_Planning_Fringe_view/FeatureServer`, ids:[0], name:'New Albany Planning Fringe',     cat:'zoning'},
  {svc:`${FC_BASE}/Floyd_County_TIF_Districts_view/FeatureServer`, ids:[0], name:'TIF Districts',                  cat:'zoning'},

    // Hydrology
  {svc:`${FC_BASE}/DNR_Floodplain_for_Floyd_County/FeatureServer`, ids:[0], name:'DNR Floodplain',                cat:'hydrology'},
  {svc:`${FC_BASE}/FloodHazard_BestAvai_DNR_Water/FeatureServer`,  ids:[0], name:'Best Available Flood Hazard',   cat:'hydrology'},
  {svc:`${FC_BASE}/Floyd_County_Steep_Slope_view/FeatureServer`,   ids:[0], name:'Steep Slopes',                  cat:'hydrology'},
  {svc:`${FC_BASE}/Stormwater_Lines/FeatureServer`,            ids:[0], name:'Stormwater Lines',                 cat:'hydrology'},
  {svc:`${FC_BASE}/Stormwater_Points/FeatureServer`,           ids:[0], name:'Stormwater Points',                cat:'hydrology'},
  {svc:`${FC_BASE}/Muddy_Fork/FeatureServer`,                  ids:[0], name:'Muddy Fork',                       cat:'hydrology'},

    // Transportation
  {svc:`${FC_BASE}/Road_Centerlines_view/FeatureServer`,       ids:[0], name:'Road Centerlines',                 cat:'transportation'},
  {svc:`${FC_BASE}/_Floyd_County_Non_Local_Roads/FeatureServer`, ids:[0], name:'Non-Local Roads',                cat:'transportation'},
  {svc:`${FC_BASE}/Snow_Routes/FeatureServer`,                 ids:[0], name:'Snow Routes',                      cat:'transportation'},
  {svc:`${FC_BASE}/Floyd_County_Sign_Inventory_view/FeatureServer`, ids:[0], name:'Sign Inventory',              cat:'transportation'},

    // Civic Boundaries
  {svc:`${FC_BASE}/County_Boundaries/FeatureServer`,           ids:[0], name:'County Boundary',                  cat:'civic'},
{svc:`${FC_BASE}/County_Townships/FeatureServer`,            ids:[0], name:'Townships',                        cat:'civic'},
{svc:`${FC_BASE}/Floyd_County_Cities_view/FeatureServer`,    ids:[0], name:'Cities',                           cat:'civic'},
{svc:`${FC_BASE}/Township_Boundaries/FeatureServer`,         ids:[0], name:'Township Boundaries',              cat:'civic'},
{svc:`${FC_BASE}/Unincorporated_Areas_of_Floyd_County/FeatureServer`, ids:[0], name:'Unincorporated Areas',     cat:'civic'},

    // Districts
{svc:`${FC_BASE}/Commissioner_Dist/FeatureServer`,           ids:[0], name:'Commissioner Districts',          cat:'districts'},
{svc:`${FC_BASE}/Floyd_County_Council_Districts/FeatureServer`, ids:[0], name:'County Council Districts',     cat:'districts'},
{svc:`${FC_BASE}/Floyd_County_Indiana_House_Area/FeatureServer`, ids:[0], name:'Indiana House Area',          cat:'districts'},
{svc:`${FC_BASE}/Floyd_County_Indiana_Senate_Area/FeatureServer`, ids:[0], name:'Indiana Senate Area',         cat:'districts'},
{svc:`${FC_BASE}/School_Board_District_1_(Public)/FeatureServer`, ids:[0], name:'School Board District 1',     cat:'districts'},
{svc:`${FC_BASE}/School_Board_District_2_(Public)/FeatureServer`, ids:[0], name:'School Board District 2',     cat:'districts'},
{svc:`${FC_BASE}/School_Board_District_3_(Public)/FeatureServer`, ids:[0], name:'School Board District 3',     cat:'districts'},
{svc:`${FC_BASE}/School_Board_District_4_(Public)/FeatureServer`, ids:[0], name:'School Board District 4',     cat:'districts'},

    // Points of Interest
{svc:`${FC_BASE}/Floyd_County_Parks/FeatureServer`,          ids:[0], name:'Parks',                            cat:'poi'},
{svc:`${FC_BASE}/Capital_Projects/FeatureServer`,            ids:[0], name:'Capital Projects',                 cat:'poi'},
  ];

//  Delaware County (Muncie / kyleajohnson AGOL org) 
const DC_BASE = 'https://services.arcgis.com/VyRjdyMziYNF5Bwe/arcgis/rest/services';
const DELAWARE_LAYERS = [
    // Parcels & Property
  {svc:`${DC_BASE}/ParcelWebpublish/FeatureServer`,            ids:[0], name:'Parcels',                          cat:'parcels'},
  {svc:`${DC_BASE}/CountyOwnedProperties_July_2024/FeatureServer`, ids:[0], name:'County-Owned Properties',     cat:'parcels'},
  {svc:`${DC_BASE}/Building_Permit/FeatureServer`,             ids:[0], name:'Building Permits',                 cat:'parcels'},

    // Zoning & Planning
  {svc:`${DC_BASE}/Administrative_Jurisdictions/FeatureServer`,ids:[0], name:'Administrative Jurisdictions',     cat:'zoning'},
  {svc:`${DC_BASE}/Taxing_Units/FeatureServer`,                ids:[0], name:'Taxing Units',                     cat:'zoning'},

    // Hydrology
  {svc:`${DC_BASE}/county_drains_incomplete/FeatureServer`,    ids:[0], name:'County Drains',                    cat:'hydrology'},
  {svc:`${DC_BASE}/Drainage_Maps_webpublish/FeatureServer`,    ids:[0], name:'Drainage Maps',                    cat:'hydrology'},

    // Transportation
  {svc:`${DC_BASE}/CountyPavedRoads_2017_2019/FeatureServer`,  ids:[0], name:'Paved Roads',                      cat:'transportation'},
  {svc:`${DC_BASE}/County_Road_Problem_Reports_Public/FeatureServer`, ids:[0], name:'Road Problem Reports',     cat:'transportation'},
  {svc:`${DC_BASE}/CGW_Bridges/FeatureServer`,                 ids:[0], name:'Bridges',                          cat:'transportation'},
  {svc:`${DC_BASE}/Bicycle_amenities_hosted/FeatureServer`,    ids:[0], name:'Bicycle Amenities',                cat:'transportation'},
  {svc:`${DC_BASE}/Bike_Ped_Plans_Routes/FeatureServer`,       ids:[0], name:'Bike/Ped Plan Routes',             cat:'transportation'},

    // Civic Boundaries
  {svc:`${DC_BASE}/Incorporated_Areas_and_Political_Townships/FeatureServer`, ids:[0], name:'Incorporated Areas & Townships', cat:'civic'},
{svc:`${DC_BASE}/CensusBlocks_2020/FeatureServer`,           ids:[0], name:'Census Blocks (2020)',             cat:'civic'},

    // Districts
{svc:`${DC_BASE}/County_council_2012/FeatureServer`,         ids:[0], name:'County Council Districts',         cat:'districts'},
{svc:`${DC_BASE}/CountyCommissioner_districts_2012/FeatureServer`, ids:[0], name:'Commissioner Districts',     cat:'districts'},
{svc:`${DC_BASE}/Delaware_County_Council_At_Large/FeatureServer`, ids:[0], name:'County Council At-Large',     cat:'districts'},
{svc:`${DC_BASE}/DelawareCountySchoolsk12_HigherEd/FeatureServer`, ids:[0], name:'Schools (K-12 & Higher Ed)', cat:'districts'},

    // Points of Interest
{svc:`${DC_BASE}/ALL_FIRE_EMS_STATIONS_UPDATED/FeatureServer`, ids:[0], name:'Fire & EMS Stations',            cat:'poi'},
{svc:`${DC_BASE}/Arts_and_Culture/FeatureServer`,            ids:[0], name:'Arts & Culture',                   cat:'poi'},
{svc:`${DC_BASE}/2nd_Harvest_Food_Distribution_Locations/FeatureServer`, ids:[0], name:'Food Distribution',     cat:'poi'},

    // Environment
{svc:`${DC_BASE}/2ft_Contours_spot_elevations/FeatureServer`,ids:[0], name:'Contours (2 ft) & Spot Elevations',cat:'environment'},
{svc:`${DC_BASE}/CAFO_Restricted_Areas/FeatureServer`,       ids:[0], name:'CAFO Restricted Areas',            cat:'environment'},
  ];

//  Howard County (Kokomo) 
const HOWC_BASE = 'https://services2.arcgis.com/xAEbEfvA4av8VdwR/arcgis/rest/services';
const HOWARD_LAYERS = [
    // Civic Boundaries
  {svc:`${HOWC_BASE}/Howard_County_Boundary/FeatureServer`,    ids:[0], name:'Howard County Boundary',           cat:'civic'},
];

  //  Clark County (Jeffersonville) 
  const CLC_BASE = 'https://services.arcgis.com/5BYw7o0uNAgcAttE/arcgis/rest/services';
const CLARK_LAYERS = [
    // Parcels & Property
  {svc:`${CLC_BASE}/Clark_County_Boundary_Data/FeatureServer`, ids:[2], name:'Parcels',                  cat:'parcels'},
  {svc:`${CLC_BASE}/Clark_County_Reference_Data/FeatureServer`,ids:[0], name:'Address Points',           cat:'parcels'},

    // Hydrology
  {svc:`${CLC_BASE}/Clark_County_Reference_Data/FeatureServer`,ids:[1], name:'Rivers',                   cat:'hydrology'},

    // Transportation
  {svc:`${CLC_BASE}/Clark_County_Reference_Data/FeatureServer`,ids:[2], name:'Roads',                    cat:'transportation'},
  {svc:`${CLC_BASE}/Clark_County_Reference_Data/FeatureServer`,ids:[3], name:'Railroads',                cat:'transportation'},
  {svc:`${CLC_BASE}/Clark_County_Reference_Data/FeatureServer`,ids:[4], name:'Interstates',              cat:'transportation'},
  {svc:`${CLC_BASE}/Clark_County_Reference_Data/FeatureServer`,ids:[6], name:'Bridges',                  cat:'transportation'},

    // Civic Boundaries
  {svc:`${CLC_BASE}/Clark_County_Boundary_Data/FeatureServer`, ids:[0], name:'Clark County Boundary',    cat:'civic'},
  {svc:`${CLC_BASE}/Clark_County_Boundary_Data/FeatureServer`, ids:[1], name:'City Boundaries',          cat:'civic'},
  {svc:`${CLC_BASE}/Clark_County_Reference_Data/FeatureServer`,ids:[5], name:'Corporate Boundary',       cat:'civic'},
  ];


  if (typeof IGIO_SVC !== 'undefined') window.IGIO_SVC = IGIO_SVC;
  if (typeof IGIO_ADMIN !== 'undefined') window.IGIO_ADMIN = IGIO_ADMIN;
  if (typeof getActiveDynamicBase === 'function') window.getActiveDynamicBase = getActiveDynamicBase;
  if (typeof BARTHOLOMEW_LAYERS !== 'undefined') window.BARTHOLOMEW_LAYERS = BARTHOLOMEW_LAYERS;
  if (typeof JC_BASE !== 'undefined') window.JC_BASE = JC_BASE;
  if (typeof JOHNSON_LAYERS !== 'undefined') window.JOHNSON_LAYERS = JOHNSON_LAYERS;
  if (typeof MC_BASE !== 'undefined') window.MC_BASE = MC_BASE;
  if (typeof MARION_LAYERS !== 'undefined') window.MARION_LAYERS = MARION_LAYERS;
  if (typeof HC_BASE !== 'undefined') window.HC_BASE = HC_BASE;
  if (typeof HAMILTON_LAYERS !== 'undefined') window.HAMILTON_LAYERS = HAMILTON_LAYERS;
  if (typeof BC_BASE !== 'undefined') window.BC_BASE = BC_BASE;
  if (typeof BOONE_LAYERS !== 'undefined') window.BOONE_LAYERS = BOONE_LAYERS;
  if (typeof WC_BASE !== 'undefined') window.WC_BASE = WC_BASE;
  if (typeof WAYNE_LAYERS !== 'undefined') window.WAYNE_LAYERS = WAYNE_LAYERS;
  if (typeof FC_BASE !== 'undefined') window.FC_BASE = FC_BASE;
  if (typeof FLOYD_LAYERS !== 'undefined') window.FLOYD_LAYERS = FLOYD_LAYERS;
  if (typeof DC_BASE !== 'undefined') window.DC_BASE = DC_BASE;
  if (typeof DELAWARE_LAYERS !== 'undefined') window.DELAWARE_LAYERS = DELAWARE_LAYERS;
  if (typeof HOWC_BASE !== 'undefined') window.HOWC_BASE = HOWC_BASE;
  if (typeof HOWARD_LAYERS !== 'undefined') window.HOWARD_LAYERS = HOWARD_LAYERS;
  if (typeof CLC_BASE !== 'undefined') window.CLC_BASE = CLC_BASE;
  if (typeof CLARK_LAYERS !== 'undefined') window.CLARK_LAYERS = CLARK_LAYERS;
})();
