// static/v2/geo-municipal-gis.js
// Extracted from index.html (municipal/city ArcGIS layer registry).
// Defines window.MUNICIPAL_GIS_SERVERS for inline parcel-engine code.
(function(){

const MUNICIPAL_GIS_SERVERS = {
  hamilton: {
    carmel: {
      name: 'Carmel',
      layers: [
        {svc:'https://services5.arcgis.com/nKFfYbLYNDrYHgoO/arcgis/rest/services/City_of_Carmel_Zoning/FeatureServer', ids:[0], name:'Carmel Zoning', cat:'zoning'},
        {svc:'https://services5.arcgis.com/nKFfYbLYNDrYHgoO/arcgis/rest/services/Public_Art/FeatureServer', ids:[0], name:'Carmel Public Art', cat:'poi'},
        {svc:'https://services5.arcgis.com/nKFfYbLYNDrYHgoO/arcgis/rest/services/TrafficCounts/FeatureServer', ids:[0], name:'Carmel Traffic Counts', cat:'transportation'},
        {svc:'https://services5.arcgis.com/nKFfYbLYNDrYHgoO/arcgis/rest/services/Stormwater_Webapp/FeatureServer', ids:[0,1,2,3], name:'Carmel Stormwater Infrastructure', cat:'utility'},
        {svc:'https://services5.arcgis.com/nKFfYbLYNDrYHgoO/arcgis/rest/services/Trash_and_Subdivisions/FeatureServer', ids:[0], name:'Carmel Trash Service Areas', cat:'civic'},
        {svc:'https://services5.arcgis.com/nKFfYbLYNDrYHgoO/arcgis/rest/services/Wastewater_Map_WFL1/FeatureServer', ids:[0], name:'Carmel Wastewater Map', cat:'utility'}
      ]
    }
  },
  bartholomew: {
    columbus: {
      name: 'Columbus',
      layers: [
        {svc:'https://services8.arcgis.com/VdGaBUXUfZ3ETyKd/arcgis/rest/services/City_of_Columbus___City_Limits_WFL1/FeatureServer', ids:[1,4], name:'Columbus City Limits & ETJ', cat:'districts'},
        {svc:'https://services8.arcgis.com/VdGaBUXUfZ3ETyKd/arcgis/rest/services/City_Of_Columbus__Zoning__Industrial__Parcels___Address_Map_WFL1/FeatureServer', ids:[0,1,16], name:'Columbus Address+Parcel+Zoning', cat:'parcels'},
        {svc:'https://services8.arcgis.com/VdGaBUXUfZ3ETyKd/arcgis/rest/services/Columbus_Master_Trail_Plan_WFL1/FeatureServer', ids:[0,1], name:'Columbus Trails (Existing+Proposed)', cat:'transportation'},
        {svc:'https://services8.arcgis.com/VdGaBUXUfZ3ETyKd/arcgis/rest/services/City_Floodplain_Map_2019_WFL1/FeatureServer', ids:[5,6], name:'Columbus Floodplain (2019)', cat:'hydrology'},
        {svc:'https://services8.arcgis.com/VdGaBUXUfZ3ETyKd/arcgis/rest/services/Voting_Wards_WFL1/FeatureServer', ids:[0,1,2], name:'Columbus Voting Wards & Precincts', cat:'districts'},
        {svc:'https://services8.arcgis.com/VdGaBUXUfZ3ETyKd/arcgis/rest/services/Columbus_Blighted_Area_Map_WFL1/FeatureServer', ids:[0], name:'Columbus Blighted Areas', cat:'districts'},
        {svc:'https://services8.arcgis.com/VdGaBUXUfZ3ETyKd/arcgis/rest/services/City_of_Columbus_Properties_WFL1/FeatureServer', ids:[0], name:'Columbus City-Owned Properties', cat:'civic'}
      ]
    }
  },
  monroe: {
    bloomington: {
      name: 'Bloomington',
      layers: [
        {svc:'https://services3.arcgis.com/8EQ1HhogM827boPC/arcgis/rest/services/Parcels_Backup/FeatureServer', ids:[0], name:'Bloomington Parcels', cat:'parcels'},
        {svc:'https://services3.arcgis.com/8EQ1HhogM827boPC/arcgis/rest/services/Address_Points_Backup/FeatureServer', ids:[1], name:'Bloomington Address Points', cat:'parcels'},
        {svc:'https://services3.arcgis.com/8EQ1HhogM827boPC/arcgis/rest/services/City_of_Bloomington_Wards_and_Precincts/FeatureServer', ids:[1,2], name:'Bloomington Wards & Precincts', cat:'districts'},
        {svc:'https://services3.arcgis.com/8EQ1HhogM827boPC/arcgis/rest/services/National_Register_Historic_Districts/FeatureServer', ids:[2], name:'Bloomington Historic Districts', cat:'districts'},
        {svc:'https://services3.arcgis.com/8EQ1HhogM827boPC/arcgis/rest/services/Snow_Districts_Public_View/FeatureServer', ids:[0], name:'Bloomington Snow Districts', cat:'civic'},
        {svc:'https://services3.arcgis.com/8EQ1HhogM827boPC/arcgis/rest/services/Precincts/FeatureServer', ids:[0], name:'Bloomington Precincts', cat:'districts'}
      ]
    }
  },
  lake: {
    hammond: {
      name: 'Hammond',
      layers: [
        {svc:'https://services3.arcgis.com/Yai1e4WSf7DPtolL/arcgis/rest/services/TaxParcels_public_77474aaaf6604957b8267f1a6734f3ac/FeatureServer', ids:[0], name:'Hammond Tax Parcels', cat:'parcels'},
        {svc:'https://services3.arcgis.com/Yai1e4WSf7DPtolL/arcgis/rest/services/RoadCenterline_20220726_publicView/FeatureServer', ids:[0], name:'Hammond Road Centerlines', cat:'transportation'},
        {svc:'https://services3.arcgis.com/Yai1e4WSf7DPtolL/arcgis/rest/services/City_Limits_PublicView/FeatureServer', ids:[3], name:'Hammond City Limits', cat:'districts'},
        {svc:'https://services3.arcgis.com/Yai1e4WSf7DPtolL/arcgis/rest/services/2020_Council_Districts_PublicView/FeatureServer', ids:[2], name:'Hammond Council Districts', cat:'districts'},
        {svc:'https://services3.arcgis.com/Yai1e4WSf7DPtolL/arcgis/rest/services/MedicalFacilities_51f13cc7c588431698c3560fb65ae500/FeatureServer', ids:[0], name:'Hammond Hospitals & Clinics', cat:'civic'},
        {svc:'https://services3.arcgis.com/Yai1e4WSf7DPtolL/arcgis/rest/services/Active_City_Lots_view/FeatureServer', ids:[0], name:'Hammond City-Owned Lots', cat:'civic'}
      ]
    }
  },
  stjoseph: {
    southbend: {
      name: 'South Bend',
      layers: [
        {svc:'https://gis.southbendin.gov/arcgis/rest/services/LandRecords/City_of_South_Bend_Zoning_Public/FeatureServer', ids:[0], name:'South Bend Zoning', cat:'zoning'},
        {svc:'https://services1.arcgis.com/0n2NelSAfR7gTkr1/arcgis/rest/services/Fire_Response_Districts/FeatureServer', ids:[0,1], name:'South Bend Fire Stations & Response', cat:'civic'},
        {svc:'https://services1.arcgis.com/0n2NelSAfR7gTkr1/arcgis/rest/services/AllVacantandAbandonedProperties/FeatureServer', ids:[3], name:'South Bend Vacant Properties', cat:'parcels'},
        {svc:'https://services1.arcgis.com/0n2NelSAfR7gTkr1/arcgis/rest/services/South_Bend_Elementary_School_District_Boundaries/FeatureServer', ids:[0], name:'South Bend Elementary School Boundaries', cat:'districts'},
        {svc:'https://services1.arcgis.com/0n2NelSAfR7gTkr1/arcgis/rest/services/South_Bend_High_School_District_Boundaries/FeatureServer', ids:[0], name:'South Bend High School Boundaries', cat:'districts'},
        {svc:'https://services1.arcgis.com/0n2NelSAfR7gTkr1/arcgis/rest/services/South_Bend_Middle_School_District_Boundaries/FeatureServer', ids:[0], name:'South Bend Middle School Boundaries', cat:'districts'},
        {svc:'https://services1.arcgis.com/0n2NelSAfR7gTkr1/arcgis/rest/services/Active_Demolition_Orders/FeatureServer', ids:[0], name:'South Bend Demolition Orders', cat:'parcels'}
      ]
    }
  },
  johnson: {
    greenwood: {
      name: 'Greenwood',
      layers: [
        {svc:'https://services6.arcgis.com/YnX35jfIPKMwG4ma/arcgis/rest/services/Greenwood_Zoning_Map_WFL1/FeatureServer', ids:[5], name:'Greenwood City Limits', cat:'districts'},
        {svc:'https://services6.arcgis.com/YnX35jfIPKMwG4ma/arcgis/rest/services/Greenwood_Zoning_Map_WFL1/FeatureServer', ids:[6], name:'Greenwood Parcels', cat:'parcels'},
        {svc:'https://services6.arcgis.com/YnX35jfIPKMwG4ma/arcgis/rest/services/Greenwood_Zoning_Map_WFL1/FeatureServer', ids:[3], name:'Greenwood Zoning', cat:'zoning'},
        {svc:'https://services6.arcgis.com/YnX35jfIPKMwG4ma/arcgis/rest/services/Greenwood_Zoning_Map_WFL1/FeatureServer', ids:[1], name:'Greenwood Building Footprints', cat:'parcels'}
      ]
    }
  },
  marion: {
    indianapolis: {
      name: 'Indianapolis',
      layers: [
        {svc:'https://gis.indy.gov/server/rest/services/OpenData/OpenData_Boundaries/MapServer', ids:[3], name:'Indianapolis Parcels', cat:'parcels'},
        {svc:'https://gis.indy.gov/server/rest/services/OpenData/OpenData_Boundaries/MapServer', ids:[5], name:'Indianapolis Building Addresses', cat:'parcels'},
        {svc:'https://gis.indy.gov/server/rest/services/OpenData/OpenData_Boundaries/MapServer', ids:[10], name:'Indy Neighborhoods', cat:'districts'},
        {svc:'https://gis.indy.gov/server/rest/services/OpenData/OpenData_Boundaries/MapServer', ids:[1], name:'Indy Subdivision Boundaries', cat:'districts'},
        {svc:'https://gis.indy.gov/server/rest/services/OpenData/OpenData_Boundaries/MapServer', ids:[12], name:'Indy Building Footprints', cat:'parcels'},
        {svc:'https://gis.indy.gov/server/rest/services/OpenData/OpenData_PlanningZoning/MapServer', ids:[9], name:'Indy Zoning', cat:'zoning'},
        {svc:'https://gis.indy.gov/server/rest/services/OpenData/OpenData_PlanningZoning/MapServer', ids:[3], name:'Indy Current Land Use', cat:'zoning'},
        {svc:'https://gis.indy.gov/server/rest/services/OpenData/OpenData_PlanningZoning/MapServer', ids:[5], name:'Indy Flood Plain', cat:'hydrology'},
        {svc:'https://gis.indy.gov/server/rest/services/OpenData/OpenData_PlanningZoning/MapServer', ids:[6], name:'Indy Historic Register', cat:'districts'},
        {svc:'https://gis.indy.gov/server/rest/services/OpenData/OpenData_PlanningZoning/MapServer', ids:[15], name:'Indy TIF Districts', cat:'districts'},
        {svc:'https://gis.indy.gov/server/rest/services/OpenData/OpenData_Transportation/MapServer', ids:[13], name:'Indy Street Centerlines', cat:'transportation'},
        {svc:'https://gis.indy.gov/server/rest/services/OpenData/OpenData_Transportation/MapServer', ids:[10], name:'Indy Bike Lanes', cat:'transportation'},
        {svc:'https://gis.indy.gov/server/rest/services/OpenData/OpenData_Transportation/MapServer', ids:[9], name:'Indy Trails', cat:'transportation'},
        {svc:'https://gis.indy.gov/server/rest/services/OpenData/OpenData_Transportation/MapServer', ids:[11], name:'IndyGo Bus Routes', cat:'transportation'},
        {svc:'https://gis.indy.gov/server/rest/services/OpenData/OpenData_Transportation/MapServer', ids:[4], name:'IndyGo Bus Stops', cat:'transportation'},
        {svc:'https://gis.indy.gov/server/rest/services/OpenData/OpenData_Transportation/MapServer', ids:[17], name:'Indy Bridges', cat:'transportation'},
        {svc:'https://gis.indy.gov/server/rest/services/OpenData/OpenData_Political/MapServer', ids:[1], name:'Indy City-County Council Districts', cat:'districts'},
        {svc:'https://gis.indy.gov/server/rest/services/OpenData/OpenData_Political/MapServer', ids:[2], name:'Indy Precincts', cat:'districts'},
        {svc:'https://gis.indy.gov/server/rest/services/OpenData/OpenData_Political/MapServer', ids:[9], name:'Indy School Board Districts', cat:'districts'},
        {svc:'https://gis.indy.gov/server/rest/services/OpenData/OpenData_Infrastructure/MapServer', ids:[2], name:'Indy Vacant & Abandoned Houses', cat:'parcels'},
        {svc:'https://gis.indy.gov/server/rest/services/OpenData/OpenData_Infrastructure/MapServer', ids:[5], name:'Indy Storm Sewers', cat:'utility'}
      ]
    }
  }
,
  // Hendricks County: Avon, Brownsburg, Plainfield
  hendricks: {
    avon: {
      name: 'Avon',
      layers: [
        {svc:'https://services2.arcgis.com/Y0fDSibEfxdu2Ya6/arcgis/rest/services/Avon_UDO/FeatureServer', ids:[7], name:'Avon Parcels', cat:'parcels'},
        {svc:'https://services2.arcgis.com/Y0fDSibEfxdu2Ya6/arcgis/rest/services/Avon_UDO/FeatureServer', ids:[10], name:'Avon Town Limits', cat:'districts'},
        {svc:'https://services2.arcgis.com/Y0fDSibEfxdu2Ya6/arcgis/rest/services/Avon_UDO/FeatureServer', ids:[6], name:'Avon Wetlands', cat:'environment'},
        {svc:'https://services2.arcgis.com/Y0fDSibEfxdu2Ya6/arcgis/rest/services/Avon_UDO/FeatureServer', ids:[5], name:'Avon Floodplains', cat:'hydrology'},
        {svc:'https://services2.arcgis.com/Y0fDSibEfxdu2Ya6/arcgis/rest/services/Avon_UDO/FeatureServer', ids:[3], name:'Avon Streams & Drains', cat:'hydrology'},
        {svc:'https://services2.arcgis.com/Y0fDSibEfxdu2Ya6/arcgis/rest/services/Avon_UDO/FeatureServer', ids:[0], name:'Avon Cemeteries', cat:'civic'},
        {svc:'https://services2.arcgis.com/Y0fDSibEfxdu2Ya6/arcgis/rest/services/Avon_UDO/FeatureServer', ids:[1], name:'Avon Pipelines', cat:'utility'},
        {svc:'https://services2.arcgis.com/Y0fDSibEfxdu2Ya6/arcgis/rest/services/Avon_UDO/FeatureServer', ids:[2], name:'Avon Railroads', cat:'transportation'}
      ]
    },
    brownsburg: {
      name: 'Brownsburg',
      layers: [
        {svc:'https://services2.arcgis.com/Y0fDSibEfxdu2Ya6/arcgis/rest/services/Brownsburg_UDO_Map/FeatureServer', ids:[7], name:'Brownsburg Parcels', cat:'parcels'},
        {svc:'https://services2.arcgis.com/Y0fDSibEfxdu2Ya6/arcgis/rest/services/Brownsburg_UDO_Map/FeatureServer', ids:[11], name:'Brownsburg Town Limits', cat:'districts'},
        {svc:'https://services2.arcgis.com/Y0fDSibEfxdu2Ya6/arcgis/rest/services/Brownsburg_UDO_Map/FeatureServer', ids:[5], name:'Brownsburg Wetlands', cat:'environment'},
        {svc:'https://services2.arcgis.com/Y0fDSibEfxdu2Ya6/arcgis/rest/services/Brownsburg_UDO_Map/FeatureServer', ids:[6], name:'Brownsburg Floodplains', cat:'hydrology'},
        {svc:'https://services2.arcgis.com/Y0fDSibEfxdu2Ya6/arcgis/rest/services/Brownsburg_UDO_Map/FeatureServer', ids:[2], name:'Brownsburg Streams & Drains', cat:'hydrology'},
        {svc:'https://services2.arcgis.com/Y0fDSibEfxdu2Ya6/arcgis/rest/services/Brownsburg_UDO_Map/FeatureServer', ids:[8], name:'Brownsburg Electric Service', cat:'utility'},
        {svc:'https://services2.arcgis.com/Y0fDSibEfxdu2Ya6/arcgis/rest/services/Brownsburg_UDO_Map/FeatureServer', ids:[0], name:'Brownsburg Cemeteries', cat:'civic'},
        {svc:'https://services2.arcgis.com/Y0fDSibEfxdu2Ya6/arcgis/rest/services/Brownsburg_UDO_Map/FeatureServer', ids:[1], name:'Brownsburg Railroads', cat:'transportation'}
      ]
    }
  },
  // Vanderburgh: Evansville (city-specific subset)
  vanderburgh: {
    evansville: {
      name: 'Evansville',
      layers: [
        {svc:'https://maps.evansvillegis.com/arcgis_server/rest/services/PROPERTY/BUILDINGS_2023/MapServer', ids:[0], name:'Evansville Buildings (2023)', cat:'parcels'},
        {svc:'https://maps.evansvillegis.com/arcgis_server/rest/services/POLITICAL/CITY_COUNCIL_WARDS/MapServer', ids:[0], name:'Evansville City Council Wards', cat:'districts'},
        {svc:'https://maps.evansvillegis.com/arcgis_server/rest/services/HISTORICAL/HISTORIC_DISTRICTS/MapServer', ids:[0], name:'Evansville Historic Districts', cat:'districts'},
        {svc:'https://maps.evansvillegis.com/arcgis_server/rest/services/TRANSPORTATION/Greenway_Bike_Network/MapServer', ids:[0,1], name:'Evansville Greenway & Bike Network', cat:'transportation'},
        {svc:'https://maps.evansvillegis.com/arcgis_server/rest/services/TRANSPORTATION/METS_BUS_STOPS/MapServer', ids:[0], name:'METS Bus Stops', cat:'transportation'},
        {svc:'https://maps.evansvillegis.com/arcgis_server/rest/services/ENVIRONMENTAL/PARKS/MapServer', ids:[0], name:'Evansville Parks', cat:'civic'}
      ]
    }
  },
  // Porter: Valparaiso (PorterCountyGov has city of Valparaiso data)
  porter: {
    valparaiso: {
      name: 'Valparaiso',
      layers: [
        {svc:'https://services5.arcgis.com/Qp5vz8Fz7vawwcWD/arcgis/rest/services/Council_Reps/FeatureServer', ids:[0], name:'Valparaiso City Council Members', cat:'districts'},
        {svc:'https://services5.arcgis.com/Qp5vz8Fz7vawwcWD/arcgis/rest/services/TIF_Areas/FeatureServer', ids:[1,2,3,4,5,6,7], name:'Valparaiso TIF Allocation Areas', cat:'districts'},
        {svc:'https://services5.arcgis.com/Qp5vz8Fz7vawwcWD/arcgis/rest/services/Park_and_Recreation_Inventory_Viewing/FeatureServer', ids:[7,15,18], name:'Valparaiso Parks & Trails', cat:'civic'},
        {svc:'https://services5.arcgis.com/Qp5vz8Fz7vawwcWD/arcgis/rest/services/Sign_Inventory/FeatureServer', ids:[0,1], name:'Valparaiso Sign Inventory', cat:'transportation'}
      ]
    }
  },
  // Allen County — Fort Wayne (Indiana's second-largest city)
  // ArcGIS server: https://gis.cityoffortwayne.org/arcgis/rest/services
  // Parcels layer confirmed from county-parcel-apis.js; additional Public/ services follow
  // the established folder pattern. Run: curl 'https://gis.cityoffortwayne.org/arcgis/rest/services?f=json'
  // to enumerate the full service catalog and expand this list.
  allen: {
    fortwayne: {
      name: 'Fort Wayne',
      layers: [
        {svc:'https://gis.cityoffortwayne.org/arcgis/rest/services/Public/Parcels/FeatureServer', ids:[0], name:'Fort Wayne Parcels', cat:'parcels'},
        {svc:'https://gis.cityoffortwayne.org/arcgis/rest/services/Public/Zoning/FeatureServer', ids:[0], name:'Fort Wayne Zoning', cat:'zoning'},
        {svc:'https://gis.cityoffortwayne.org/arcgis/rest/services/Public/Neighborhoods/FeatureServer', ids:[0], name:'Fort Wayne Neighborhoods', cat:'districts'},
        {svc:'https://gis.cityoffortwayne.org/arcgis/rest/services/Public/CityLimits/FeatureServer', ids:[0], name:'Fort Wayne City Limits', cat:'districts'},
        {svc:'https://gis.cityoffortwayne.org/arcgis/rest/services/Public/Parks/FeatureServer', ids:[0], name:'Fort Wayne Parks', cat:'civic'}
      ]
    }
  },
  // Madison County — Anderson (county seat; services3.arcgis.com/4UkreHBazssuvI82 confirmed in county-gis-servers.js:madison)
  madison: {
    anderson: {
      name: 'Anderson',
      layers: [
        {svc:'https://services3.arcgis.com/4UkreHBazssuvI82/arcgis/rest/services/Parcels/FeatureServer', ids:[0], name:'Anderson Parcels', cat:'parcels'},
        {svc:'https://services3.arcgis.com/4UkreHBazssuvI82/arcgis/rest/services/AddressPoints/FeatureServer', ids:[0], name:'Anderson Address Points', cat:'parcels'},
        {svc:'https://services3.arcgis.com/4UkreHBazssuvI82/arcgis/rest/services/Zoning2020/FeatureServer', ids:[0], name:'Anderson Zoning (2020)', cat:'zoning'},
        {svc:'https://services3.arcgis.com/4UkreHBazssuvI82/arcgis/rest/services/Anderson_Floodplains/FeatureServer', ids:[0], name:'Anderson Floodplains', cat:'hydrology'},
        {svc:'https://services3.arcgis.com/4UkreHBazssuvI82/arcgis/rest/services/Streets/FeatureServer', ids:[0], name:'Anderson Streets', cat:'transportation'},
        {svc:'https://services3.arcgis.com/4UkreHBazssuvI82/arcgis/rest/services/City_Limits/FeatureServer', ids:[0], name:'Anderson City Limits', cat:'districts'},
        {svc:'https://services3.arcgis.com/4UkreHBazssuvI82/arcgis/rest/services/Districts_Ord14_24/FeatureServer', ids:[0], name:'Anderson Districts (Ord 14-24)', cat:'districts'},
        {svc:'https://services3.arcgis.com/4UkreHBazssuvI82/arcgis/rest/services/City_Owned_Properties/FeatureServer', ids:[0], name:'Anderson City-Owned Properties', cat:'poi'}
      ]
    }
  },
  // Wayne County — Richmond (county seat; services3.arcgis.com/fhBemP00ea7p7i0U confirmed in county-layer-engines.js:WAYNE_LAYERS)
  wayne: {
    richmond: {
      name: 'Richmond',
      layers: [
        {svc:'https://services3.arcgis.com/fhBemP00ea7p7i0U/arcgis/rest/services/Richmond_Parcels_v2/FeatureServer', ids:[0], name:'Richmond Parcels', cat:'parcels'},
        {svc:'https://services3.arcgis.com/fhBemP00ea7p7i0U/arcgis/rest/services/Historic_Richmond_Conservation_District/FeatureServer', ids:[0], name:'Richmond Historic Conservation District', cat:'zoning'},
        {svc:'https://services3.arcgis.com/fhBemP00ea7p7i0U/arcgis/rest/services/Richmond_Opportunity_Zone/FeatureServer', ids:[0], name:'Richmond Opportunity Zone', cat:'zoning'},
        {svc:'https://services3.arcgis.com/fhBemP00ea7p7i0U/arcgis/rest/services/Outdoor_Refreshment_Area/FeatureServer', ids:[0], name:'Richmond Outdoor Refreshment Area', cat:'districts'},
        {svc:'https://services3.arcgis.com/fhBemP00ea7p7i0U/arcgis/rest/services/Richmond_City_Limits/FeatureServer', ids:[0], name:'Richmond City Limits', cat:'districts'},
        {svc:'https://services3.arcgis.com/fhBemP00ea7p7i0U/arcgis/rest/services/Richmond_Certified_Technology_Park/FeatureServer', ids:[0], name:'Richmond Certified Technology Park', cat:'districts'},
        {svc:'https://services3.arcgis.com/fhBemP00ea7p7i0U/arcgis/rest/services/Park_and_Recreation_Facilities_public/FeatureServer', ids:[0], name:'Richmond Parks & Recreation', cat:'civic'}
      ]
    }
  },
  // Floyd County — New Albany (county seat; services.arcgis.com/EAoy39bcmpweKJ4f confirmed in county-layer-engines.js:FLOYD_LAYERS)
  floyd: {
    newalbany: {
      name: 'New Albany',
      layers: [
        {svc:'https://services.arcgis.com/EAoy39bcmpweKJ4f/arcgis/rest/services/Floyd_County_Parcel_view/FeatureServer', ids:[0], name:'New Albany / Floyd Co. Parcels', cat:'parcels'},
        {svc:'https://services.arcgis.com/EAoy39bcmpweKJ4f/arcgis/rest/services/Address_Points_view/FeatureServer', ids:[0], name:'New Albany Address Points', cat:'parcels'},
        {svc:'https://services.arcgis.com/EAoy39bcmpweKJ4f/arcgis/rest/services/New_Albany_Zoning_view/FeatureServer', ids:[0], name:'New Albany Zoning', cat:'zoning'},
        {svc:'https://services.arcgis.com/EAoy39bcmpweKJ4f/arcgis/rest/services/New_Albany_Planning_Fringe_view/FeatureServer', ids:[0], name:'New Albany Planning Fringe', cat:'zoning'},
        {svc:'https://services.arcgis.com/EAoy39bcmpweKJ4f/arcgis/rest/services/Floyd_County_TIF_Districts_view/FeatureServer', ids:[0], name:'New Albany TIF Districts', cat:'zoning'},
        {svc:'https://services.arcgis.com/EAoy39bcmpweKJ4f/arcgis/rest/services/DNR_Floodplain_for_Floyd_County/FeatureServer', ids:[0], name:'New Albany DNR Floodplain', cat:'hydrology'},
        {svc:'https://services.arcgis.com/EAoy39bcmpweKJ4f/arcgis/rest/services/Road_Centerlines_view/FeatureServer', ids:[0], name:'New Albany Road Centerlines', cat:'transportation'},
        {svc:'https://services.arcgis.com/EAoy39bcmpweKJ4f/arcgis/rest/services/Floyd_County_Cities_view/FeatureServer', ids:[0], name:'Floyd County Cities', cat:'civic'}
      ]
    }
  }
};


  if (typeof MUNICIPAL_GIS_SERVERS !== 'undefined') {
    try { window.MUNICIPAL_GIS_SERVERS = MUNICIPAL_GIS_SERVERS; } catch(e){}
  }
})();
