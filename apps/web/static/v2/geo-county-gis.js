// static/v2/geo-county-gis.js
// Extracted from index.html (county GIS layer registry).
// Defines window.COUNTY_GIS_SERVERS for use by inline parcel-engine code.
// See CLAUDE.md for extraction methodology.
(function(){

const COUNTY_GIS_SERVERS = {

  //  Hamilton County — gis1.hamiltoncounty.in.gov (verified –) 
  hamilton: [
    {svc:'https://gis1.hamiltoncounty.in.gov/arcgis/rest/services/HamCoParcelsPublic/MapServer',    ids:[0], name:'Parcels',                cat:'parcels'},
    {svc:'https://gis1.hamiltoncounty.in.gov/arcgis/rest/services/HamCoParcelLabels/MapServer',     ids:[0], name:'Parcel Labels',           cat:'annotations'},
    {svc:'https://gis1.hamiltoncounty.in.gov/arcgis/rest/services/HamCoBuildingFootprints/MapServer',ids:[0], name:'Building Footprints',    cat:'parcels'},
    {svc:'https://gis1.hamiltoncounty.in.gov/arcgis/rest/services/HamCoPlanning/MapServer',         ids:[0], name:'Planning & Zoning',       cat:'zoning'},
    {svc:'https://gis1.hamiltoncounty.in.gov/arcgis/rest/services/HamCoAnnexation/MapServer',       ids:[0], name:'Annexation',              cat:'zoning'},
    {svc:'https://gis1.hamiltoncounty.in.gov/arcgis/rest/services/HamCoTIFDistricts/MapServer',     ids:[0], name:'TIF Districts',           cat:'zoning'},
    {svc:'https://gis1.hamiltoncounty.in.gov/arcgis/rest/services/HamCoDrains/MapServer',           ids:[0], name:'Drainage',                cat:'hydrology'},
    {svc:'https://gis1.hamiltoncounty.in.gov/arcgis/rest/services/HamCoHydro/MapServer',            ids:[0], name:'Hydrology / Waterways',   cat:'hydrology'},
    {svc:'https://gis1.hamiltoncounty.in.gov/arcgis/rest/services/HamCoCorporateLimits/MapServer',  ids:[0], name:'Corporate Limits',        cat:'civic'},
    {svc:'https://gis1.hamiltoncounty.in.gov/arcgis/rest/services/HamCoBoundary/MapServer',         ids:[0], name:'County Boundary',         cat:'civic'},
    {svc:'https://gis1.hamiltoncounty.in.gov/arcgis/rest/services/HamCoSubdivisions/MapServer',     ids:[0], name:'Subdivisions / Plats',    cat:'parcels'},
    {svc:'https://gis1.hamiltoncounty.in.gov/arcgis/rest/services/HamCoTaxDistricts/MapServer',     ids:[0], name:'Tax Districts',           cat:'civic'},
    {svc:'https://gis1.hamiltoncounty.in.gov/arcgis/rest/services/HamCoPolitical/MapServer',        ids:[0], name:'Political Boundaries',    cat:'districts'},
    {svc:'https://gis1.hamiltoncounty.in.gov/arcgis/rest/services/HamCoVoting/MapServer',           ids:[0], name:'Voting Precincts',        cat:'districts'},
    {svc:'https://gis1.hamiltoncounty.in.gov/arcgis/rest/services/HamCoSchools/MapServer',          ids:[0], name:'School Corporations',     cat:'districts'},
    {svc:'https://gis1.hamiltoncounty.in.gov/arcgis/rest/services/HamCoFireDepartments/MapServer',  ids:[0], name:'Fire Departments',        cat:'poi'},
    {svc:'https://gis1.hamiltoncounty.in.gov/arcgis/rest/services/HamCo911/MapServer',              ids:[0], name:'911 / Emergency',         cat:'poi'},
    {svc:'https://gis1.hamiltoncounty.in.gov/arcgis/rest/services/HamCoParks/MapServer',            ids:[0], name:'Parks & Recreation',      cat:'poi'},
    {svc:'https://gis1.hamiltoncounty.in.gov/arcgis/rest/services/HamCoCemeteries/MapServer',       ids:[0], name:'Cemeteries',              cat:'poi'},
    {svc:'https://gis1.hamiltoncounty.in.gov/arcgis/rest/services/SurveyAll/MapServer',             ids:[0], name:'Survey Points',           cat:'civic'},
    {svc:'https://gis1.hamiltoncounty.in.gov/arcgis/rest/services/Streets_2244/MapServer',          ids:[0], name:'Roads / Streets',         cat:'transportation'},
    {svc:'https://gis1.hamiltoncounty.in.gov/arcgis/rest/services/HamCoTopo/MapServer',             ids:[0], name:'Topography / Contours',   cat:'environment'},
  ],

  //  Tippecanoe County — maps.tippecanoe.in.gov (verified –) 
  tippecanoe: [
    {svc:'https://maps.tippecanoe.in.gov/server/rest/services/GeneralViewer/MapServer', ids:[3],  name:'Parcels',                  cat:'parcels'},
    {svc:'https://maps.tippecanoe.in.gov/server/rest/services/GeneralViewer/MapServer', ids:[20], name:'Address Points',           cat:'parcels'},
    {svc:'https://maps.tippecanoe.in.gov/server/rest/services/GeneralViewer/MapServer', ids:[5],  name:'Subdivisions',             cat:'parcels'},
    {svc:'https://maps.tippecanoe.in.gov/server/rest/services/Zoning/MapServer',        ids:[0],  name:'Zoning Districts',         cat:'zoning'},
    {svc:'https://maps.tippecanoe.in.gov/server/rest/services/ZoningOnly/MapServer',    ids:[0],  name:'Zoning Only',              cat:'zoning'},
    {svc:'https://maps.tippecanoe.in.gov/server/rest/services/APC/MapServer',           ids:[0],  name:'Area Plan Commission',     cat:'zoning'},
    {svc:'https://maps.tippecanoe.in.gov/server/rest/services/GeneralViewer/MapServer', ids:[40], name:'Zoning (General)',         cat:'zoning'},
    {svc:'https://maps.tippecanoe.in.gov/server/rest/services/FIRM/MapServer',          ids:[0],  name:'Flood Zones (FIRM)',       cat:'hydrology'},
    {svc:'https://maps.tippecanoe.in.gov/server/rest/services/Drains/MapServer',        ids:[0],  name:'Drainage',                 cat:'hydrology'},
    {svc:'https://maps.tippecanoe.in.gov/server/rest/services/All_Flooding_Hazard_Areas/MapServer', ids:[0], name:'All Flood Hazard Areas', cat:'hydrology'},
    {svc:'https://maps.tippecanoe.in.gov/server/rest/services/GeneralViewer/MapServer', ids:[30], name:'Roads / Centerlines',      cat:'transportation'},
    {svc:'https://maps.tippecanoe.in.gov/server/rest/services/Road/MapServer',          ids:[0],  name:'Road Network',             cat:'transportation'},
    {svc:'https://maps.tippecanoe.in.gov/server/rest/services/Road_ROW/MapServer',      ids:[0],  name:'Road Right of Way',        cat:'transportation'},
    {svc:'https://maps.tippecanoe.in.gov/server/rest/services/Bridges/MapServer',       ids:[0],  name:'Bridges',                  cat:'transportation'},
    {svc:'https://maps.tippecanoe.in.gov/server/rest/services/GeneralViewer/MapServer', ids:[60], name:'Cities & Towns',           cat:'civic'},
    {svc:'https://maps.tippecanoe.in.gov/server/rest/services/GeneralViewer/MapServer', ids:[2],  name:'Townships',                cat:'civic'},
    {svc:'https://maps.tippecanoe.in.gov/server/rest/services/GeneralViewer/MapServer', ids:[6],  name:'Tax Districts',            cat:'civic'},
    {svc:'https://maps.tippecanoe.in.gov/server/rest/services/Sections/MapServer',      ids:[0],  name:'Survey Sections',          cat:'civic'},
    {svc:'https://maps.tippecanoe.in.gov/server/rest/services/Voting/MapServer',        ids:[0],  name:'Voting Precincts',         cat:'districts'},
    {svc:'https://maps.tippecanoe.in.gov/server/rest/services/Township_Trustees/MapServer', ids:[0], name:'Township Trustees',    cat:'districts'},
    {svc:'https://maps.tippecanoe.in.gov/server/rest/services/Garage_Districts/MapServer',  ids:[0], name:'Garage Districts',      cat:'districts'},
    {svc:'https://maps.tippecanoe.in.gov/server/rest/services/Contours_2023/MapServer', ids:[0],  name:'Contours 2023',           cat:'environment'},
    {svc:'https://maps.tippecanoe.in.gov/server/rest/services/soils/MapServer',         ids:[0],  name:'Soils',                   cat:'environment'},
    {svc:'https://maps.tippecanoe.in.gov/server/rest/services/Statewide_Apt_Sales/MapServer', ids:[0], name:'Apartment Sales',    cat:'parcels'},
    {svc:'https://maps.tippecanoe.in.gov/server/rest/services/Zoning_Violations/MapServer',  ids:[0], name:'Zoning Violations',   cat:'zoning'},
    {svc:'https://maps.tippecanoe.in.gov/server/rest/services/Surveyor/MapServer',      ids:[0],  name:'Surveyor',                cat:'civic'},
  ],

  // Monroe County (Bloomington) - services1.arcgis.com/nYfGJ9xFTKW6VPqW (verified)
  monroe: [
    {svc:'https://services1.arcgis.com/nYfGJ9xFTKW6VPqW/arcgis/rest/services/Parcels_No_Subdivision/FeatureServer', ids:[0], name:'Parcels', cat:'parcels'},
    {svc:'https://services1.arcgis.com/nYfGJ9xFTKW6VPqW/arcgis/rest/services/Subdivisions/FeatureServer', ids:[0], name:'Subdivisions', cat:'parcels'},
    {svc:'https://services1.arcgis.com/nYfGJ9xFTKW6VPqW/arcgis/rest/services/moco_address_to_parcels09152025/FeatureServer', ids:[0], name:'Address Points', cat:'parcels'},
    {svc:'https://services1.arcgis.com/nYfGJ9xFTKW6VPqW/arcgis/rest/services/Current_County_Zoning/FeatureServer', ids:[3], name:'County Zoning', cat:'zoning'},
    {svc:'https://services1.arcgis.com/nYfGJ9xFTKW6VPqW/arcgis/rest/services/Bloomington_Zoning/FeatureServer', ids:[0], name:'Bloomington Zoning', cat:'zoning'},
    {svc:'https://services1.arcgis.com/nYfGJ9xFTKW6VPqW/arcgis/rest/services/Comp_Plan_Land_Use/FeatureServer', ids:[29], name:'Comp Plan Land Use (2015)', cat:'zoning'},
    {svc:'https://services1.arcgis.com/nYfGJ9xFTKW6VPqW/arcgis/rest/services/Historic_Preservation_Overlay/FeatureServer', ids:[21], name:'Historic Preservation Overlay', cat:'zoning'},
    {svc:'https://services1.arcgis.com/nYfGJ9xFTKW6VPqW/arcgis/rest/services/Environmental_Contraint_Overlay/FeatureServer', ids:[0], name:'Environmental Constraint Overlay', cat:'zoning'},
    {svc:'https://services1.arcgis.com/nYfGJ9xFTKW6VPqW/arcgis/rest/services/DNR_Best_Available_Floodplain_Map/FeatureServer', ids:[0], name:'DNR Floodplain (Best Available)', cat:'hydrology'},
    {svc:'https://services1.arcgis.com/nYfGJ9xFTKW6VPqW/arcgis/rest/services/County_Maintained_Roads/FeatureServer', ids:[0], name:'County Maintained Roads', cat:'transportation'},
    {svc:'https://services1.arcgis.com/nYfGJ9xFTKW6VPqW/arcgis/rest/services/1022018_Road_Centerlines/FeatureServer', ids:[0], name:'Road Centerlines', cat:'transportation'},
    {svc:'https://services1.arcgis.com/nYfGJ9xFTKW6VPqW/arcgis/rest/services/Sidewalk_Assessment_Map_WFL1/FeatureServer', ids:[0], name:'County Sidewalks', cat:'transportation'},
    {svc:'https://services1.arcgis.com/nYfGJ9xFTKW6VPqW/arcgis/rest/services/Airport_Noise_and_Height_Overlay/FeatureServer', ids:[29], name:'Airport Noise & Height Overlay', cat:'transportation'},
    {svc:'https://services1.arcgis.com/nYfGJ9xFTKW6VPqW/arcgis/rest/services/Corporate_Boundaries/FeatureServer', ids:[28], name:'Corporate Boundaries', cat:'civic'},
    {svc:'https://services1.arcgis.com/nYfGJ9xFTKW6VPqW/arcgis/rest/services/Monroe_County_Civil_Townships/FeatureServer', ids:[17], name:'Civil Townships', cat:'civic'},
    {svc:'https://services1.arcgis.com/nYfGJ9xFTKW6VPqW/arcgis/rest/services/Census_Blocks/FeatureServer', ids:[0], name:'Census Blocks', cat:'civic'},
    {svc:'https://services1.arcgis.com/nYfGJ9xFTKW6VPqW/arcgis/rest/services/CityCouncilDistricts/FeatureServer', ids:[0], name:'City Council Districts', cat:'districts'},
    {svc:'https://services1.arcgis.com/nYfGJ9xFTKW6VPqW/arcgis/rest/services/MOCO_Precincts/FeatureServer', ids:[2], name:'Voting Precincts', cat:'districts'},
    {svc:'https://services1.arcgis.com/nYfGJ9xFTKW6VPqW/arcgis/rest/services/PrecinctSplitsCurrent/FeatureServer', ids:[37], name:'Precinct Splits', cat:'districts'},
    {svc:'https://services1.arcgis.com/nYfGJ9xFTKW6VPqW/arcgis/rest/services/MCCSC_School_Districts_2024/FeatureServer', ids:[29], name:'MCCSC School Districts', cat:'districts'},
    {svc:'https://services1.arcgis.com/nYfGJ9xFTKW6VPqW/arcgis/rest/services/MCCSC_School_Board_2024/FeatureServer', ids:[1], name:'MCCSC School Board (2024)', cat:'districts'},
    {svc:'https://services1.arcgis.com/nYfGJ9xFTKW6VPqW/arcgis/rest/services/CountyOwned_Properties/FeatureServer', ids:[1], name:'County-Owned Lands', cat:'poi'},
    {svc:'https://services1.arcgis.com/nYfGJ9xFTKW6VPqW/arcgis/rest/services/CountyOwned_Properties/FeatureServer', ids:[0], name:'County-Owned ROWs', cat:'poi'},
    {svc:'https://services1.arcgis.com/nYfGJ9xFTKW6VPqW/arcgis/rest/services/Dog_Parks/FeatureServer', ids:[0], name:'Dog Parks', cat:'poi'},
    {svc:'https://services1.arcgis.com/nYfGJ9xFTKW6VPqW/arcgis/rest/services/DNR_Trails/FeatureServer', ids:[0], name:'DNR Trails', cat:'poi'},
  ],

  // Madison County (Anderson) - services3.arcgis.com/4UkreHBazssuvI82
  madison: [
    {svc:'https://services3.arcgis.com/4UkreHBazssuvI82/arcgis/rest/services/Parcels/FeatureServer', ids:[0], name:'Parcels', cat:'parcels'},
    {svc:'https://services3.arcgis.com/4UkreHBazssuvI82/arcgis/rest/services/AddressPoints/FeatureServer', ids:[0], name:'Address Points', cat:'parcels'},
    {svc:'https://services3.arcgis.com/4UkreHBazssuvI82/arcgis/rest/services/Zoning2020/FeatureServer', ids:[0], name:'Zoning (2020)', cat:'zoning'},
    {svc:'https://services3.arcgis.com/4UkreHBazssuvI82/arcgis/rest/services/Anderson_Floodplains/FeatureServer', ids:[0], name:'Anderson Floodplains', cat:'hydrology'},
    {svc:'https://services3.arcgis.com/4UkreHBazssuvI82/arcgis/rest/services/Streets/FeatureServer', ids:[0], name:'Streets', cat:'transportation'},
    {svc:'https://services3.arcgis.com/4UkreHBazssuvI82/arcgis/rest/services/City_Limits/FeatureServer', ids:[0], name:'City Limits', cat:'civic'},
    {svc:'https://services3.arcgis.com/4UkreHBazssuvI82/arcgis/rest/services/County_Precincts/FeatureServer', ids:[0], name:'County Precincts', cat:'districts'},
    {svc:'https://services3.arcgis.com/4UkreHBazssuvI82/arcgis/rest/services/Districts_Ord14_24/FeatureServer', ids:[0], name:'Districts (Ord 14-24)', cat:'districts'},
    {svc:'https://services3.arcgis.com/4UkreHBazssuvI82/arcgis/rest/services/City_Owned_Properties/FeatureServer', ids:[0], name:'City-Owned Properties', cat:'poi'},
  ],

  // Dearborn County - IEDC services2.arcgis.com/Y0fDSibEfxdu2Ya6
  dearborn: [
    {svc:'https://services2.arcgis.com/Y0fDSibEfxdu2Ya6/arcgis/rest/services/Dearborn_County_GIS_Data/FeatureServer', ids:[7], name:'Parcels', cat:'parcels'},
    {svc:'https://services2.arcgis.com/Y0fDSibEfxdu2Ya6/arcgis/rest/services/Dearborn_County_GIS_Data/FeatureServer', ids:[6], name:'Floodplains', cat:'hydrology'},
    {svc:'https://services2.arcgis.com/Y0fDSibEfxdu2Ya6/arcgis/rest/services/Dearborn_County_GIS_Data/FeatureServer', ids:[8], name:'Wetlands', cat:'hydrology'},
    {svc:'https://services2.arcgis.com/Y0fDSibEfxdu2Ya6/arcgis/rest/services/Dearborn_County_GIS_Data/FeatureServer', ids:[3], name:'Streams', cat:'hydrology'},
    {svc:'https://services2.arcgis.com/Y0fDSibEfxdu2Ya6/arcgis/rest/services/Dearborn_County_GIS_Data/FeatureServer', ids:[2], name:'Railroads', cat:'transportation'},
    {svc:'https://services2.arcgis.com/Y0fDSibEfxdu2Ya6/arcgis/rest/services/Dearborn_County_GIS_Data/FeatureServer', ids:[1], name:'Pipelines', cat:'transportation'},
    {svc:'https://services2.arcgis.com/Y0fDSibEfxdu2Ya6/arcgis/rest/services/Dearborn_County_GIS_Data/FeatureServer', ids:[9], name:'County Boundary', cat:'civic'},
    {svc:'https://services2.arcgis.com/Y0fDSibEfxdu2Ya6/arcgis/rest/services/Dearborn_County_GIS_Data/FeatureServer', ids:[5], name:'Electric Service Territories', cat:'districts'},
    {svc:'https://services2.arcgis.com/Y0fDSibEfxdu2Ya6/arcgis/rest/services/Dearborn_County_GIS_Data/FeatureServer', ids:[0], name:'Cemeteries', cat:'poi'},
    {svc:'https://services2.arcgis.com/Y0fDSibEfxdu2Ya6/arcgis/rest/services/Dearborn_County_GIS_Data/FeatureServer', ids:[4], name:'Sites', cat:'poi'},
  ],

  // Franklin County - IEDC services2.arcgis.com/Y0fDSibEfxdu2Ya6
  franklin: [
    {svc:'https://services2.arcgis.com/Y0fDSibEfxdu2Ya6/arcgis/rest/services/Franklin_County_GIS_Map/FeatureServer', ids:[8], name:'Parcels', cat:'parcels'},
    {svc:'https://services2.arcgis.com/Y0fDSibEfxdu2Ya6/arcgis/rest/services/Franklin_County_GIS_Map/FeatureServer', ids:[3], name:'Floodplains', cat:'hydrology'},
    {svc:'https://services2.arcgis.com/Y0fDSibEfxdu2Ya6/arcgis/rest/services/Franklin_County_GIS_Map/FeatureServer', ids:[2], name:'Wetlands', cat:'hydrology'},
    {svc:'https://services2.arcgis.com/Y0fDSibEfxdu2Ya6/arcgis/rest/services/Franklin_County_GIS_Map/FeatureServer', ids:[1], name:'Streams', cat:'hydrology'},
    {svc:'https://services2.arcgis.com/Y0fDSibEfxdu2Ya6/arcgis/rest/services/Franklin_County_GIS_Map/FeatureServer', ids:[6], name:'Railroads', cat:'transportation'},
    {svc:'https://services2.arcgis.com/Y0fDSibEfxdu2Ya6/arcgis/rest/services/Franklin_County_GIS_Map/FeatureServer', ids:[0], name:'Pipelines', cat:'transportation'},
    {svc:'https://services2.arcgis.com/Y0fDSibEfxdu2Ya6/arcgis/rest/services/Franklin_County_GIS_Map/FeatureServer', ids:[7], name:'Electric Service Territories', cat:'districts'},
    {svc:'https://services2.arcgis.com/Y0fDSibEfxdu2Ya6/arcgis/rest/services/Franklin_County_GIS_Map/FeatureServer', ids:[5], name:'Cemeteries', cat:'poi'},
    {svc:'https://services2.arcgis.com/Y0fDSibEfxdu2Ya6/arcgis/rest/services/Franklin_County_GIS_Map/FeatureServer', ids:[4], name:'Sites', cat:'poi'},
  ],

  // Hancock County - IEDC services2.arcgis.com/Y0fDSibEfxdu2Ya6
  hancock: [
    {svc:'https://services2.arcgis.com/Y0fDSibEfxdu2Ya6/arcgis/rest/services/Hancock_County___GIS_Map___2023/FeatureServer', ids:[7], name:'Flood Hazard (2023)', cat:'hydrology'},
    {svc:'https://services2.arcgis.com/Y0fDSibEfxdu2Ya6/arcgis/rest/services/Hancock_County___GIS_Map___2023/FeatureServer', ids:[1], name:'Wetlands (2023)', cat:'hydrology'},
    {svc:'https://services2.arcgis.com/Y0fDSibEfxdu2Ya6/arcgis/rest/services/Hancock_County___GIS_Map___2023/FeatureServer', ids:[5], name:'Pipelines', cat:'transportation'},
    {svc:'https://services2.arcgis.com/Y0fDSibEfxdu2Ya6/arcgis/rest/services/Hancock_County___GIS_Map___2023/FeatureServer', ids:[4], name:'Rail System', cat:'transportation'},
    {svc:'https://services2.arcgis.com/Y0fDSibEfxdu2Ya6/arcgis/rest/services/Hancock_County___GIS_Map___2023/FeatureServer', ids:[2], name:'County Outline', cat:'civic'},
    {svc:'https://services2.arcgis.com/Y0fDSibEfxdu2Ya6/arcgis/rest/services/Hancock_County___GIS_Map___2023/FeatureServer', ids:[6], name:'Electric Service', cat:'districts'},
    {svc:'https://services2.arcgis.com/Y0fDSibEfxdu2Ya6/arcgis/rest/services/Hancock_County___GIS_Map___2023/FeatureServer', ids:[3], name:'Cemeteries', cat:'poi'},
  ],

  // Hendricks County - IEDC services2.arcgis.com/Y0fDSibEfxdu2Ya6
  hendricks: [
    {svc:'https://services2.arcgis.com/Y0fDSibEfxdu2Ya6/arcgis/rest/services/Hendricks_County_GIS_Map/FeatureServer', ids:[0], name:'Parcels (2019)', cat:'parcels'},
    {svc:'https://services2.arcgis.com/Y0fDSibEfxdu2Ya6/arcgis/rest/services/Hendricks_County_GIS_Map/FeatureServer', ids:[1], name:'FIRM Floodplains', cat:'hydrology'},
    {svc:'https://services2.arcgis.com/Y0fDSibEfxdu2Ya6/arcgis/rest/services/Hendricks_County_GIS_Map/FeatureServer', ids:[2], name:'Wetlands', cat:'hydrology'},
    {svc:'https://services2.arcgis.com/Y0fDSibEfxdu2Ya6/arcgis/rest/services/Hendricks_County_GIS_Map/FeatureServer', ids:[5], name:'Pipelines', cat:'transportation'},
    {svc:'https://services2.arcgis.com/Y0fDSibEfxdu2Ya6/arcgis/rest/services/Hendricks_County_GIS_Map/FeatureServer', ids:[6], name:'Railroad', cat:'transportation'},
    {svc:'https://services2.arcgis.com/Y0fDSibEfxdu2Ya6/arcgis/rest/services/Hendricks_County_GIS_Map/FeatureServer', ids:[3], name:'Electric Service Territories', cat:'districts'},
    {svc:'https://services2.arcgis.com/Y0fDSibEfxdu2Ya6/arcgis/rest/services/Hendricks_County_GIS_Map/FeatureServer', ids:[4], name:'Cemeteries', cat:'poi'},
    {svc:'https://services2.arcgis.com/Y0fDSibEfxdu2Ya6/arcgis/rest/services/Hendricks_County_GIS_Map/FeatureServer', ids:[7], name:'Sites', cat:'poi'},
  ],

  // Knox County - IEDC services2.arcgis.com/Y0fDSibEfxdu2Ya6
  knox: [
    {svc:'https://services2.arcgis.com/Y0fDSibEfxdu2Ya6/arcgis/rest/services/Knox_County___GIS_View_Only/FeatureServer', ids:[17], name:'County Boundary', cat:'civic'},
    {svc:'https://services2.arcgis.com/Y0fDSibEfxdu2Ya6/arcgis/rest/services/Knox_County___GIS_View_Only/FeatureServer', ids:[14], name:'Pipelines', cat:'transportation'},
    {svc:'https://services2.arcgis.com/Y0fDSibEfxdu2Ya6/arcgis/rest/services/Knox_County___GIS_View_Only/FeatureServer', ids:[15], name:'Rail Systems', cat:'transportation'},
    {svc:'https://services2.arcgis.com/Y0fDSibEfxdu2Ya6/arcgis/rest/services/Knox_County___GIS_View_Only/FeatureServer', ids:[16], name:'Trails', cat:'transportation'},
    {svc:'https://services2.arcgis.com/Y0fDSibEfxdu2Ya6/arcgis/rest/services/Knox_County___GIS_View_Only/FeatureServer', ids:[1], name:'City & Town Hall', cat:'civic'},
    {svc:'https://services2.arcgis.com/Y0fDSibEfxdu2Ya6/arcgis/rest/services/Knox_County___GIS_View_Only/FeatureServer', ids:[2], name:'Colleges & Universities', cat:'poi'},
    {svc:'https://services2.arcgis.com/Y0fDSibEfxdu2Ya6/arcgis/rest/services/Knox_County___GIS_View_Only/FeatureServer', ids:[3], name:'EMS Stations', cat:'poi'},
    {svc:'https://services2.arcgis.com/Y0fDSibEfxdu2Ya6/arcgis/rest/services/Knox_County___GIS_View_Only/FeatureServer', ids:[4], name:'Fire Stations', cat:'poi'},
    {svc:'https://services2.arcgis.com/Y0fDSibEfxdu2Ya6/arcgis/rest/services/Knox_County___GIS_View_Only/FeatureServer', ids:[5], name:'Hospitals', cat:'poi'},
    {svc:'https://services2.arcgis.com/Y0fDSibEfxdu2Ya6/arcgis/rest/services/Knox_County___GIS_View_Only/FeatureServer', ids:[6], name:'Police Stations', cat:'poi'},
    {svc:'https://services2.arcgis.com/Y0fDSibEfxdu2Ya6/arcgis/rest/services/Knox_County___GIS_View_Only/FeatureServer', ids:[7], name:'Historic Sites', cat:'poi'},
    {svc:'https://services2.arcgis.com/Y0fDSibEfxdu2Ya6/arcgis/rest/services/Knox_County___GIS_View_Only/FeatureServer', ids:[8], name:'Public Libraries', cat:'poi'},
    {svc:'https://services2.arcgis.com/Y0fDSibEfxdu2Ya6/arcgis/rest/services/Knox_County___GIS_View_Only/FeatureServer', ids:[9], name:'Schools', cat:'poi'},
    {svc:'https://services2.arcgis.com/Y0fDSibEfxdu2Ya6/arcgis/rest/services/Knox_County___GIS_View_Only/FeatureServer', ids:[10], name:'Recreational', cat:'poi'},
    {svc:'https://services2.arcgis.com/Y0fDSibEfxdu2Ya6/arcgis/rest/services/Knox_County___GIS_View_Only/FeatureServer', ids:[11], name:'Religious Centers', cat:'poi'},
    {svc:'https://services2.arcgis.com/Y0fDSibEfxdu2Ya6/arcgis/rest/services/Knox_County___GIS_View_Only/FeatureServer', ids:[12], name:'Cemeteries', cat:'poi'},
    {svc:'https://services2.arcgis.com/Y0fDSibEfxdu2Ya6/arcgis/rest/services/Knox_County___GIS_View_Only/FeatureServer', ids:[13], name:'Historic Bridges', cat:'poi'},
  ],

  // Montgomery County - IEDC services2.arcgis.com/Y0fDSibEfxdu2Ya6
  montgomery: [
    {svc:'https://services2.arcgis.com/Y0fDSibEfxdu2Ya6/arcgis/rest/services/Montgomery_County_GIS_Map/FeatureServer', ids:[7], name:'Parcels', cat:'parcels'},
    {svc:'https://services2.arcgis.com/Y0fDSibEfxdu2Ya6/arcgis/rest/services/Montgomery_County_GIS_Map/FeatureServer', ids:[6], name:'Floodplains', cat:'hydrology'},
    {svc:'https://services2.arcgis.com/Y0fDSibEfxdu2Ya6/arcgis/rest/services/Montgomery_County_GIS_Map/FeatureServer', ids:[8], name:'Wetlands', cat:'hydrology'},
    {svc:'https://services2.arcgis.com/Y0fDSibEfxdu2Ya6/arcgis/rest/services/Montgomery_County_GIS_Map/FeatureServer', ids:[3], name:'Streams', cat:'hydrology'},
    {svc:'https://services2.arcgis.com/Y0fDSibEfxdu2Ya6/arcgis/rest/services/Montgomery_County_GIS_Map/FeatureServer', ids:[2], name:'Railroads', cat:'transportation'},
    {svc:'https://services2.arcgis.com/Y0fDSibEfxdu2Ya6/arcgis/rest/services/Montgomery_County_GIS_Map/FeatureServer', ids:[1], name:'Pipelines', cat:'transportation'},
    {svc:'https://services2.arcgis.com/Y0fDSibEfxdu2Ya6/arcgis/rest/services/Montgomery_County_GIS_Map/FeatureServer', ids:[5], name:'Electric Service Territories', cat:'districts'},
    {svc:'https://services2.arcgis.com/Y0fDSibEfxdu2Ya6/arcgis/rest/services/Montgomery_County_GIS_Map/FeatureServer', ids:[0], name:'Cemeteries', cat:'poi'},
  ],

  // Morgan County - IEDC services2.arcgis.com/Y0fDSibEfxdu2Ya6
  morgan: [
    {svc:'https://services2.arcgis.com/Y0fDSibEfxdu2Ya6/arcgis/rest/services/Morgan_County_GIS_Map/FeatureServer', ids:[7], name:'Parcels (2019)', cat:'parcels'},
    {svc:'https://services2.arcgis.com/Y0fDSibEfxdu2Ya6/arcgis/rest/services/Morgan_County_GIS_Map/FeatureServer', ids:[4], name:'FIRM Floodplains (2019)', cat:'hydrology'},
    {svc:'https://services2.arcgis.com/Y0fDSibEfxdu2Ya6/arcgis/rest/services/Morgan_County_GIS_Map/FeatureServer', ids:[5], name:'Wetlands', cat:'hydrology'},
    {svc:'https://services2.arcgis.com/Y0fDSibEfxdu2Ya6/arcgis/rest/services/Morgan_County_GIS_Map/FeatureServer', ids:[1], name:'Streams', cat:'hydrology'},
    {svc:'https://services2.arcgis.com/Y0fDSibEfxdu2Ya6/arcgis/rest/services/Morgan_County_GIS_Map/FeatureServer', ids:[2], name:'Railroad', cat:'transportation'},
    {svc:'https://services2.arcgis.com/Y0fDSibEfxdu2Ya6/arcgis/rest/services/Morgan_County_GIS_Map/FeatureServer', ids:[3], name:'Pipelines', cat:'transportation'},
    {svc:'https://services2.arcgis.com/Y0fDSibEfxdu2Ya6/arcgis/rest/services/Morgan_County_GIS_Map/FeatureServer', ids:[6], name:'Electric Service Territories', cat:'districts'},
    {svc:'https://services2.arcgis.com/Y0fDSibEfxdu2Ya6/arcgis/rest/services/Morgan_County_GIS_Map/FeatureServer', ids:[0], name:'Cemeteries', cat:'poi'},
  ],



  // Lake County (lakecountyod AGOL + lcsogis.lakecountyin.org)
  lake: [
    {svc:'https://services5.arcgis.com/8CXRnvSfSpwdf0R6/arcgis/rest/services/Lake_County_Parcels/FeatureServer', ids:[0], name:'Lake County Parcels', cat:'parcels'},
    {svc:'https://services5.arcgis.com/8CXRnvSfSpwdf0R6/arcgis/rest/services/Lake_County_Address_Points/FeatureServer', ids:[0], name:'Lake County Address Points', cat:'parcels'},
    {svc:'https://lcsogis.lakecountyin.org/server/rest/services/Building_Footprints_2023/FeatureServer', ids:[0], name:'Building Footprints (2023)', cat:'parcels'},
    {svc:'https://lcsogis.lakecountyin.org/server/rest/services/Subdivisions/FeatureServer', ids:[0], name:'Subdivisions', cat:'parcels'},
    {svc:'https://lcsogis.lakecountyin.org/server/rest/services/Cadastral_Lines/FeatureServer', ids:[0], name:'Cadastral Lines', cat:'parcels'},
    {svc:'https://lcsogis.lakecountyin.org/server/rest/services/Lot_Boundaries/FeatureServer', ids:[0], name:'Lot Boundaries', cat:'parcels'},
    {svc:'https://lcsogis.lakecountyin.org/server/rest/services/Corporate_Boundaries/FeatureServer', ids:[0], name:'Corporate Boundaries', cat:'districts'},
    {svc:'https://lcsogis.lakecountyin.org/server/rest/services/TIF_Districts/FeatureServer', ids:[0], name:'TIF Districts', cat:'districts'},
    {svc:'https://lcsogis.lakecountyin.org/server/rest/services/Geographic_Township_Boundary/FeatureServer', ids:[0], name:'Township Boundaries', cat:'districts'},
    {svc:'https://services5.arcgis.com/8CXRnvSfSpwdf0R6/arcgis/rest/services/Zip_Code_Poly_Clip/FeatureServer', ids:[0], name:'ZIP Code Boundaries', cat:'districts'},
    {svc:'https://lcsogis.lakecountyin.org/server/rest/services/Centerlines/FeatureServer', ids:[0], name:'Road Centerlines', cat:'transportation'},
    {svc:'https://lcsogis.lakecountyin.org/server/rest/services/DFIRM/FeatureServer', ids:[0], name:'DFIRM Flood Zones', cat:'hydrology'},
    {svc:'https://lcsogis.lakecountyin.org/server/rest/services/Lake_County_Wetlands/FeatureServer', ids:[0], name:'Wetlands', cat:'environment'},
    {svc:'https://lcsogis.lakecountyin.org/server/rest/services/NHD_Flowlines/FeatureServer', ids:[0], name:'NHD Flowlines', cat:'hydrology'},
    {svc:'https://lcsogis.lakecountyin.org/server/rest/services/NHD_Lakes/FeatureServer', ids:[0], name:'NHD Lakes', cat:'hydrology'},
    {svc:'https://lcsogis.lakecountyin.org/server/rest/services/NHD_Waterbody/FeatureServer', ids:[0], name:'NHD Waterbodies', cat:'hydrology'},
    {svc:'https://lcsogis.lakecountyin.org/server/rest/services/Drainage/FeatureServer', ids:[0], name:'Drainage Network', cat:'hydrology'},
    {svc:'https://lcsogis.lakecountyin.org/server/rest/services/Watershed_Divide/FeatureServer', ids:[0], name:'Watershed Divides', cat:'environment'},
    {svc:'https://lcsogis.lakecountyin.org/server/rest/services/Hydrography_2013/FeatureServer', ids:[0], name:'Hydrography (2013)', cat:'hydrology'},
    {svc:'https://services5.arcgis.com/8CXRnvSfSpwdf0R6/arcgis/rest/services/Fire_Stations/FeatureServer', ids:[0], name:'Fire Stations', cat:'civic'},
    {svc:'https://services5.arcgis.com/8CXRnvSfSpwdf0R6/arcgis/rest/services/Police_Stations/FeatureServer', ids:[0], name:'Police Stations', cat:'civic'},
    {svc:'https://services5.arcgis.com/8CXRnvSfSpwdf0R6/arcgis/rest/services/Hospitals/FeatureServer', ids:[0], name:'Healthcare Facilities', cat:'civic'},
    {svc:'https://services5.arcgis.com/8CXRnvSfSpwdf0R6/arcgis/rest/services/Schools/FeatureServer', ids:[0], name:'Schools', cat:'civic'},
    {svc:'https://services5.arcgis.com/8CXRnvSfSpwdf0R6/arcgis/rest/services/Emergency_Shelters/FeatureServer', ids:[0], name:'Emergency Shelters', cat:'civic'},
    {svc:'https://services5.arcgis.com/8CXRnvSfSpwdf0R6/arcgis/rest/services/Section_Corners/FeatureServer', ids:[0], name:'Section Corners', cat:'parcels'}
  ],
  // Porter County (PorterCountyGov + smcdaniel21 base data)
  porter: [
    {svc:'https://services5.arcgis.com/Qp5vz8Fz7vawwcWD/arcgis/rest/services/Parcel_view/FeatureServer', ids:[0], name:'Parcels (2026)', cat:'parcels'},
    {svc:'https://services5.arcgis.com/Qp5vz8Fz7vawwcWD/arcgis/rest/services/Zoning_Districts/FeatureServer', ids:[0], name:'Zoning Districts', cat:'zoning'},
    {svc:'https://services6.arcgis.com/TQ2Al5QIvv4tMBL7/arcgis/rest/services/UDO_Zoning_Districts/FeatureServer', ids:[0], name:'UDO Zoning Districts', cat:'zoning'},
    {svc:'https://services6.arcgis.com/TQ2Al5QIvv4tMBL7/arcgis/rest/services/MunicipalBoundaries/FeatureServer', ids:[0], name:'Municipal Boundaries', cat:'districts'},
    {svc:'https://services6.arcgis.com/TQ2Al5QIvv4tMBL7/arcgis/rest/services/RoadCenterline/FeatureServer', ids:[0], name:'Road Centerlines', cat:'transportation'},
    {svc:'https://services6.arcgis.com/TQ2Al5QIvv4tMBL7/arcgis/rest/services/Subdivisions/FeatureServer', ids:[0], name:'Subdivisions', cat:'parcels'},
    {svc:'https://services6.arcgis.com/TQ2Al5QIvv4tMBL7/arcgis/rest/services/RegulatedDrains/FeatureServer', ids:[0], name:'Regulated Drains', cat:'hydrology'},
    {svc:'https://services6.arcgis.com/TQ2Al5QIvv4tMBL7/arcgis/rest/services/Legal_Drain_Centerline/FeatureServer', ids:[0], name:'Legal Drain Centerlines', cat:'hydrology'},
    {svc:'https://services5.arcgis.com/Qp5vz8Fz7vawwcWD/arcgis/rest/services/Park_and_Recreation_Inventory_Viewing/FeatureServer', ids:[7,15,18], name:'Parks, Trails & Natural Areas', cat:'civic'},
    {svc:'https://services5.arcgis.com/Qp5vz8Fz7vawwcWD/arcgis/rest/services/TIF_Areas/FeatureServer', ids:[1,2,3,4,5,6,7], name:'TIF Allocation Areas', cat:'districts'},
    {svc:'https://services5.arcgis.com/Qp5vz8Fz7vawwcWD/arcgis/rest/services/Council_Reps/FeatureServer', ids:[0], name:'City Council Members', cat:'districts'},
    {svc:'https://services5.arcgis.com/Qp5vz8Fz7vawwcWD/arcgis/rest/services/Sign_Inventory/FeatureServer', ids:[0,1], name:'Sign Inventory & Poles', cat:'transportation'}
  ],
  // Marion County (Indianapolis/Marion Consolidated) — gis.indy.gov (verified via municipal-gis-servers.js + county-parcel-apis.js)
  marion: [
    {svc:'https://gis.indy.gov/server/rest/services/MapIndy/MapIndyProperty/MapServer',          ids:[10], name:'Parcels',                       cat:'parcels'},
    {svc:'https://gis.indy.gov/server/rest/services/OpenData/OpenData_Boundaries/MapServer',     ids:[3],  name:'Parcel Boundaries',             cat:'parcels'},
    {svc:'https://gis.indy.gov/server/rest/services/OpenData/OpenData_Boundaries/MapServer',     ids:[5],  name:'Building Addresses',            cat:'parcels'},
    {svc:'https://gis.indy.gov/server/rest/services/OpenData/OpenData_Boundaries/MapServer',     ids:[12], name:'Building Footprints',           cat:'parcels'},
    {svc:'https://gis.indy.gov/server/rest/services/OpenData/OpenData_Boundaries/MapServer',     ids:[1],  name:'Subdivision Boundaries',        cat:'parcels'},
    {svc:'https://gis.indy.gov/server/rest/services/OpenData/OpenData_PlanningZoning/MapServer', ids:[9],  name:'Zoning',                        cat:'zoning'},
    {svc:'https://gis.indy.gov/server/rest/services/OpenData/OpenData_PlanningZoning/MapServer', ids:[3],  name:'Current Land Use',              cat:'zoning'},
    {svc:'https://gis.indy.gov/server/rest/services/OpenData/OpenData_PlanningZoning/MapServer', ids:[15], name:'TIF Districts',                 cat:'zoning'},
    {svc:'https://gis.indy.gov/server/rest/services/OpenData/OpenData_PlanningZoning/MapServer', ids:[5],  name:'Flood Plain',                  cat:'hydrology'},
    {svc:'https://gis.indy.gov/server/rest/services/OpenData/OpenData_Transportation/MapServer', ids:[13], name:'Street Centerlines',            cat:'transportation'},
    {svc:'https://gis.indy.gov/server/rest/services/OpenData/OpenData_Transportation/MapServer', ids:[10], name:'Bike Lanes',                    cat:'transportation'},
    {svc:'https://gis.indy.gov/server/rest/services/OpenData/OpenData_Transportation/MapServer', ids:[9],  name:'Trails',                        cat:'transportation'},
    {svc:'https://gis.indy.gov/server/rest/services/OpenData/OpenData_Transportation/MapServer', ids:[11], name:'IndyGo Bus Routes',             cat:'transportation'},
    {svc:'https://gis.indy.gov/server/rest/services/OpenData/OpenData_Transportation/MapServer', ids:[4],  name:'IndyGo Bus Stops',             cat:'transportation'},
    {svc:'https://gis.indy.gov/server/rest/services/OpenData/OpenData_Transportation/MapServer', ids:[17], name:'Bridges',                      cat:'transportation'},
    {svc:'https://gis.indy.gov/server/rest/services/OpenData/OpenData_Boundaries/MapServer',     ids:[10], name:'Neighborhoods',                 cat:'civic'},
    {svc:'https://gis.indy.gov/server/rest/services/OpenData/OpenData_Political/MapServer',      ids:[1],  name:'City-County Council Districts', cat:'districts'},
    {svc:'https://gis.indy.gov/server/rest/services/OpenData/OpenData_Political/MapServer',      ids:[2],  name:'Precincts',                     cat:'districts'},
    {svc:'https://gis.indy.gov/server/rest/services/OpenData/OpenData_Political/MapServer',      ids:[9],  name:'School Board Districts',        cat:'districts'},
    {svc:'https://gis.indy.gov/server/rest/services/OpenData/OpenData_PlanningZoning/MapServer', ids:[6],  name:'Historic Register',             cat:'districts'},
    {svc:'https://gis.indy.gov/server/rest/services/OpenData/OpenData_Infrastructure/MapServer', ids:[2],  name:'Vacant & Abandoned Houses',     cat:'poi'},
  ],

  // Allen County (Fort Wayne) — gis.cityoffortwayne.org (parcels confirmed in county-parcel-apis.js)
  // Additional services need human verification against https://gis.cityoffortwayne.org/arcgis/rest/services/Public
  allen: [
    {svc:'https://gis.cityoffortwayne.org/arcgis/rest/services/Public/Parcels/FeatureServer',   ids:[0],  name:'Parcels',                       cat:'parcels'},
  ],

  // Vanderburgh County (Evansville GIS server)
  vanderburgh: [
    {svc:'https://maps.evansvillegis.com/arcgis_server/rest/services/PROPERTY/PARCELS/MapServer', ids:[0], name:'Parcels', cat:'parcels'},
    {svc:'https://maps.evansvillegis.com/arcgis_server/rest/services/PROPERTY/PROPERTY_BOUNDARIES/MapServer', ids:[0], name:'Property Boundaries', cat:'parcels'},
    {svc:'https://maps.evansvillegis.com/arcgis_server/rest/services/PROPERTY/SUBDIVISIONS/MapServer', ids:[0], name:'Subdivisions', cat:'parcels'},
    {svc:'https://maps.evansvillegis.com/arcgis_server/rest/services/PROPERTY/BUILDINGS_2023/MapServer', ids:[0], name:'Building Footprints (2023)', cat:'parcels'},
    {svc:'https://maps.evansvillegis.com/arcgis_server/rest/services/PROPERTY/ZONING/MapServer', ids:[0], name:'Zoning', cat:'zoning'},
    {svc:'https://maps.evansvillegis.com/arcgis_server/rest/services/PROPERTY/EXISTING_LAND_USE/MapServer', ids:[0], name:'Existing Land Use', cat:'zoning'},
    {svc:'https://maps.evansvillegis.com/arcgis_server/rest/services/PROPERTY/FUTURE_LAND_USE/MapServer', ids:[0], name:'Future Land Use', cat:'zoning'},
    {svc:'https://maps.evansvillegis.com/arcgis_server/rest/services/BOUNDARIES/CITY_LIMITS/MapServer', ids:[0], name:'City Limits', cat:'districts'},
    {svc:'https://maps.evansvillegis.com/arcgis_server/rest/services/POLITICAL/CITY_COUNCIL_WARDS/MapServer', ids:[0], name:'City Council Wards', cat:'districts'},
    {svc:'https://maps.evansvillegis.com/arcgis_server/rest/services/POLITICAL/PRECINCTS/MapServer', ids:[0], name:'Precincts', cat:'districts'},
    {svc:'https://maps.evansvillegis.com/arcgis_server/rest/services/POLITICAL/VOTE_CENTERS/MapServer', ids:[0], name:'Voting Centers (2026)', cat:'civic'},
    {svc:'https://maps.evansvillegis.com/arcgis_server/rest/services/HYDROLOGY/AREA_WETLANDS/MapServer', ids:[0], name:'Wetlands', cat:'environment'},
    {svc:'https://maps.evansvillegis.com/arcgis_server/rest/services/HYDROLOGY/HYDROLOGY/MapServer', ids:[0], name:'Hydrology', cat:'hydrology'},
    {svc:'https://maps.evansvillegis.com/arcgis_server/rest/services/HYDROLOGY/FLOODZONES_DYNAMIC/MapServer', ids:[0], name:'Flood Zones', cat:'hydrology'},
    {svc:'https://maps.evansvillegis.com/arcgis_server/rest/services/HYDROLOGY/REGULATED_DRAINS/MapServer', ids:[0], name:'Regulated Drains', cat:'hydrology'},
    {svc:'https://maps.evansvillegis.com/arcgis_server/rest/services/TRANSPORTATION/TRANSPORTATION_DYNAMIC/MapServer', ids:[0,4], name:'Streets & Major Roads', cat:'transportation'},
    {svc:'https://maps.evansvillegis.com/arcgis_server/rest/services/TRANSPORTATION/Greenway_Bike_Network/MapServer', ids:[0,1], name:'Greenway & Bike Network', cat:'transportation'},
    {svc:'https://maps.evansvillegis.com/arcgis_server/rest/services/TRANSPORTATION/METS_BUS_STOPS/MapServer', ids:[0], name:'METS Bus Stops', cat:'transportation'},
    {svc:'https://maps.evansvillegis.com/arcgis_server/rest/services/TRANSPORTATION/VC_BRIDGES/MapServer', ids:[0], name:'County Bridges', cat:'transportation'},
    {svc:'https://maps.evansvillegis.com/arcgis_server/rest/services/ENVIRONMENTAL/PARKS/MapServer', ids:[0], name:'Parks', cat:'civic'},
    {svc:'https://maps.evansvillegis.com/arcgis_server/rest/services/ENVIRONMENTAL/SOILS/MapServer', ids:[0], name:'Soils', cat:'environment'},
    {svc:'https://maps.evansvillegis.com/arcgis_server/rest/services/HISTORICAL/HISTORIC_DISTRICTS/MapServer', ids:[0], name:'Historic Districts', cat:'districts'}
  ]
};


  // Expose globally so legacy inline code in index.html can read it
  if (typeof COUNTY_GIS_SERVERS !== 'undefined') {
    try { window.COUNTY_GIS_SERVERS = COUNTY_GIS_SERVERS; } catch(e){}
  }
})();
