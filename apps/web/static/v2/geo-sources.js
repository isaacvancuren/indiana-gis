/* mn2-state-sources.js - Confirmed statewide parcel sources for non-IN states
   Each source uses a public ArcGIS REST FeatureService with envelope queries.
   Add new states by extending the SOURCES object below and committing.
*/
(function(){
  function reg(){
    if (!window.MNStates || !window.MNStates.registerSource) return setTimeout(reg, 200);

    var SOURCES = {
      OH: {
        type: "esri",
        url:  "https://services2.arcgis.com/MlJ0G8iWUyC7jAmu/arcgis/rest/services/OhioStatewidePacels_full_view/FeatureServer/0/query",
        outFields: "OBJECTID,County,LocalParcelID,StateParcelID,SitusAddressAll,MailAddressAll,MailCity,MailZip,StateLUC,LandArea",
        countyField: "County",
        countyMatch: "name",
        whereTpl: "1=1",
        fields: { parcel_id:"LocalParcelID", state_parcel_id:"StateParcelID", prop_add:"SitusAddressAll", prop_city:null, prop_zip:"MailZip", owner:null, class_code:"StateLUC", latitude:null, longitude:null }
      },
      FL: {
        type: "esri",
        url:  "https://services9.arcgis.com/Gh9awoU677aKree0/arcgis/rest/services/Florida_Statewide_Cadastral/FeatureServer/0/query",
        outFields: "PARCEL_ID,OWN_NAME,OWN_ADDR1,OWN_CITY,OWN_STATE,OWN_ZIPCD,PHY_ADDR1,PHY_ZIPCD,DOR_UC,JV,LND_SQFOOT,CO_NO,ASMNT_YR,S_LEGAL",
        whereTpl: "1=1",
        fields: { parcel_id:"PARCEL_ID", state_parcel_id:"PARCEL_ID", prop_add:"PHY_ADDR1", prop_city:null, prop_zip:"PHY_ZIPCD", owner:"OWN_NAME", class_code:"DOR_UC", latitude:null, longitude:null }
      },
      NY: {
        type: "esri",
        url:  "https://services6.arcgis.com/EbVsqZ18sv1kVJ3k/arcgis/rest/services/NYS_Tax_Parcels_Public/FeatureServer/1/query",
        outFields: "PRINT_KEY,SBL,PARCEL_ADDR,LOC_STREET,LOC_ZIP,PRIMARY_OWNER,MAIL_ADDR,MAIL_CITY,MAIL_ZIP,PROP_CLASS,LAND_AV,TOTAL_AV,FULL_MARKET_VAL,ACRES,COUNTY_NAME,MUNI_NAME",
        countyField: "COUNTY_NAME",
        countyMatch: "name",
        whereTpl: "1=1",
        fields: { parcel_id:"PRINT_KEY", state_parcel_id:"SBL", prop_add:"PARCEL_ADDR", prop_city:"MUNI_NAME", prop_zip:"LOC_ZIP", owner:"PRIMARY_OWNER", class_code:"PROP_CLASS", latitude:null, longitude:null }
      },
      TX: {
        type: "esri",
        url:  "https://services1.arcgis.com/1mtXwieMId59thmg/arcgis/rest/services/2019_Texas_Parcels_StratMap/FeatureServer/0/query",
        outFields: "Prop_ID,GEO_ID,OWNER_NAME,LEGAL_DESC,SITUS_ADDR,MAIL_ADDR,LEGAL_AREA",
        whereTpl: "1=1",
        fields: { parcel_id:"Prop_ID", state_parcel_id:"GEO_ID", prop_add:"SITUS_ADDR", prop_city:null, prop_zip:null, owner:"OWNER_NAME", class_code:null, latitude:null, longitude:null }
      },
      WI: {
        type: "esri",
        url:  "https://services3.arcgis.com/n6uYoouQZW75n5WI/arcgis/rest/services/Wisconsin_Statewide_Parcels/FeatureServer/0/query",
        outFields: "PARCELID,TAXPARCELID,OWNERNME1,SITEADRESS,STREETNAME,ZIPCODE,PROPCLASS,GISACRES,CONAME,SCHOOLDIST",
        countyField: "CONAME",
        countyMatch: "name",
        whereTpl: "1=1",
        fields: { parcel_id:"PARCELID", state_parcel_id:"TAXPARCELID", prop_add:"SITEADRESS", prop_city:null, prop_zip:"ZIPCODE", owner:"OWNERNME1", class_code:"PROPCLASS", latitude:null, longitude:null }
      },
      NC: {
        type: "esri",
        url:  "https://services.nconemap.gov/secure/rest/services/NC1Map_Parcels/MapServer/1/query",
        outFields: "parno,altparno,ownname,siteadd,scity,szip,parval,landval,improvval,gisacres,cntyname",
        countyField: "cntyname",
        countyMatch: "name",
        whereTpl: "1=1",
        fields: { parcel_id:"parno", state_parcel_id:"altparno", prop_add:"siteadd", prop_city:"scity", prop_zip:"szip", owner:"ownname", class_code:null, latitude:null, longitude:null }
      },
      MA: {
        type: "esri",
        url:  "https://arcgisserver.digital.mass.gov/arcgisserver/rest/services/AGOL/L3Parcels_feature_service/FeatureServer/0/query",
        outFields: "MAP_PAR_ID,LOC_ID,PROP_ID,SITE_ADDR,CITY,ZIP,OWNER1,OWN_ADDR,OWN_CITY,OWN_STATE,OWN_ZIP,USE_CODE,LOT_SIZE,TOTAL_VAL",
        whereTpl: "1=1",
        fields: { parcel_id:"MAP_PAR_ID", state_parcel_id:"LOC_ID", prop_add:"SITE_ADDR", prop_city:"CITY", prop_zip:"ZIP", owner:"OWNER1", class_code:"USE_CODE", latitude:null, longitude:null }
      },
      CT: {
        type: "esri",
        url:  "https://services3.arcgis.com/3FL1kr7L4LvwA2Kb/arcgis/rest/services/Connecticut_State_Parcel_Layer_2023/FeatureServer/0/query",
        outFields: "Town_Name,Link,Owner,Co_Owner,Location,Mailing_Address,Mailing_City,Mailing_State,Assessed_Total,Zone,Sale_Price,Sale_Date",
        countyField: "Town_Name",
        countyMatch: "name",
        whereTpl: "1=1",
        fields: { parcel_id:"Link", state_parcel_id:"Link", prop_add:"Location", prop_city:"Town_Name", prop_zip:null, owner:"Owner", class_code:"Zone", latitude:null, longitude:null }
      },
      MD: {
        type: "esri",
        url:  "https://mdgeodata.md.gov/imap/rest/services/PlanningCadastre/MD_ParcelBoundaries/MapServer/0/query",
        outFields: "ACCTID,JURSCODE,ADDRESS,CITY,ZIPCODE,OWNADD1,OWNCITY,OWNSTATE,OWNERZIP,LEGAL1,SUBDIVSN",
        whereTpl: "1=1",
        fields: { parcel_id:"ACCTID", state_parcel_id:"ACCTID", prop_add:"ADDRESS", prop_city:"CITY", prop_zip:"ZIPCODE", owner:null, class_code:"JURSCODE", latitude:null, longitude:null }
      },
      VA: {
        type: "esri",
        url:  "https://vginmaps.vdem.virginia.gov/arcgis/rest/services/VA_Base_Layers/VA_Parcels/FeatureServer/0/query",
        outFields: "VGIN_QPID,FIPS,LOCALITY,PARCELID,PTM_ID",
        countyField: "LOCALITY",
        countyMatch: "name",
        whereTpl: "1=1",
        fields: { parcel_id:"PARCELID", state_parcel_id:"VGIN_QPID", prop_add:null, prop_city:"LOCALITY", prop_zip:null, owner:null, class_code:null, latitude:null, longitude:null }
      },
      VT: {
        type: "esri",
        url:  "https://services1.arcgis.com/BkFxaEFNwHqX3tAw/arcgis/rest/services/FS_VCGI_VTPARCELS_WM_NOCACHE_v2/FeatureServer/0/query",
        outFields: "STATUS,PARENTSPAN,SPAN,MAPID,PROPTYPE,YEAR,TOWN",
        countyField: "TOWN",
        countyMatch: "name",
        whereTpl: "1=1",
        fields: { parcel_id:"SPAN", state_parcel_id:"PARENTSPAN", prop_add:null, prop_city:"TOWN", prop_zip:null, owner:null, class_code:"PROPTYPE", latitude:null, longitude:null }
      },
      NJ: {
        type: "esri",
        url:  "https://maps.nj.gov/arcgis/rest/services/Framework/Cadastral/MapServer/0/query",
        outFields: "PAMS_PIN,PCL_MUN,COUNTY,MUN_NAME,PROP_CLASS,PROP_LOC,OWNER_NAME,ST_ADDRESS,CITY_STATE,ZIP_CODE,LAND_VAL,NET_VALUE,CALC_ACRE",
        countyField: "COUNTY",
        countyMatch: "name",
        whereTpl: "1=1",
        fields: { parcel_id:"PAMS_PIN", state_parcel_id:"PAMS_PIN", prop_add:"PROP_LOC", prop_city:"MUN_NAME", prop_zip:"ZIP_CODE", owner:"OWNER_NAME", class_code:"PROP_CLASS", latitude:null, longitude:null }
      },
                                    AK: {
      type: "esri",
      url:  "https://services1.arcgis.com/7HDiw78fcUiM2BWn/arcgis/rest/services/AK_Parcels/FeatureServer/0/query",
      outFields: "parcel_id,owner,property_type,property_use,land_value,total_value,local_gov",
      countyField: "local_gov",
      countyMatch: "name",
      whereTpl: "1=1",
      fields: { parcel_id:"parcel_id", state_parcel_id:"parcel_id", prop_add:null, prop_city:"local_gov", prop_zip:null, owner:"owner", class_code:"property_type", latitude:null, longitude:null }
      },
      ND: {
      type: "esri",
      url:  "https://services1.arcgis.com/GOcSXpzwBHyk2nog/arcgis/rest/services/NDGISHUB_Parcels/FeatureServer/0/query",
      outFields: "GISID,UniqueGISID,CountyName,CountyFIPS,Lot,Block,SubdivisionPlat,SectionNumber,TownshipName,CalculatedAcres,Ownership",
      countyField: "CountyFIPS",
      countyMatch: "fips3",
      whereTpl: "1=1",
      fields: { parcel_id:"GISID", state_parcel_id:"UniqueGISID", prop_add:null, prop_city:"CountyName", prop_zip:null, owner:"Ownership", class_code:null, latitude:null, longitude:null }
      },
CA: {
      type: "esri",
      url:  "https://services1.arcgis.com/jUJYIo9tSA7EHvfZ/arcgis/rest/services/CA_Statewide_Parcels_Public_view/FeatureServer/0/query",
      outFields: "PARCEL_APN,FIPS_CODE,COUNTYNAME,SITE_ADDR,SITE_CITY,SITE_STATE,SITE_ZIP,FullStreetAddress",
      countyField: "FIPS_CODE",
      countyMatch: "fips5",
      whereTpl: "1=1",
      fields: { parcel_id:"PARCEL_APN", state_parcel_id:"PARCEL_APN", prop_add:"SITE_ADDR", prop_city:"SITE_CITY", prop_zip:"SITE_ZIP", owner:null, class_code:null, latitude:null, longitude:null }
      },
TN: {
      type: "esri",
      url:  "https://services1.arcgis.com/YuVBSS7Y1of2Qud1/arcgis/rest/services/Tennessee_Property_Boundaries_Public_Use/FeatureServer/0/query",
      outFields: "PARCELID,GISLINK,ADDRESS,OWNER,OWNER2,COUNTY_NAME,DEEDAC,SUBDIV,LOT",
      countyField: "COUNTY_NAME",
      countyMatch: "name",
      whereTpl: "1=1",
      fields: { parcel_id:"PARCELID", state_parcel_id:"GISLINK", prop_add:"ADDRESS", prop_city:"COUNTY_NAME", prop_zip:null, owner:"OWNER", class_code:null, latitude:null, longitude:null }
      },
UT: {
      type: "esri",
      url:  "https://services1.arcgis.com/99lidPhWCzftIe9K/arcgis/rest/services/UtahStatewideParcels/FeatureServer/0/query",
      outFields: "PARCEL_ID,PARCEL_ADD,PARCEL_CITY,PARCEL_ZIP,County,RECORDER",
      countyField: "County",
      countyMatch: "name",
      whereTpl: "1=1",
      fields: { parcel_id:"PARCEL_ID", state_parcel_id:"PARCEL_ID", prop_add:"PARCEL_ADD", prop_city:"PARCEL_CITY", prop_zip:"PARCEL_ZIP", owner:null, class_code:null, latitude:null, longitude:null }
      },
HI: {
        type: "esri",
        url:  "https://geodata.hawaii.gov/arcgis/rest/services/ParcelsZoning/MapServer/25/query",
        outFields: "tmk,tmk_txt,county,island,zone,section,plat,parcel,gisacres",
        countyField: "county",
        countyMatch: "name",
        whereTpl: "1=1",
        fields: { parcel_id:"tmk_txt", state_parcel_id:"tmk", prop_add:null, prop_city:"county", prop_zip:null, owner:null, class_code:"zone", latitude:null, longitude:null }
      },
NH: {
        type: "esri",
        url:  "https://nhgeodata.unh.edu/hosting/rest/services/Hosted/CAD_ParcelMosaic/FeatureServer/1/query",
        outFields: "parceloid,nh_gis_id,pid,town,countyid,sluc,streetaddress,name",
        countyField: "town",
        countyMatch: "name",
        whereTpl: "1=1",
        fields: { parcel_id:"pid", state_parcel_id:"nh_gis_id", prop_add:"streetaddress", prop_city:"town", prop_zip:null, owner:"name", class_code:"sluc", latitude:null, longitude:null }
      }
    ,
      WA: {
        type: "esri",
        url: "https://services.arcgis.com/jsIt88o09Q0r1j8h/arcgis/rest/services/Current_Parcels/FeatureServer/0/query",
        outFields: "FIPS_NR,COUNTY_NM,PARCEL_ID_NR,ORIG_PARCEL_ID,SITUS_ADDRESS,SITUS_CITY_NM,SITUS_ZIP_NR,LANDUSE_CD,VALUE_LAND,VALUE_BLDG",
        whereTpl: "1=1",
        countyField: "FIPS_NR",
        countyMatch: "fips5",
        fields: { parcel_id:"PARCEL_ID_NR", state_parcel_id:"ORIG_PARCEL_ID", prop_add:"SITUS_ADDRESS", prop_city:"SITUS_CITY_NM", prop_zip:"SITUS_ZIP_NR", owner:null, class_code:"LANDUSE_CD", latitude:null, longitude:null }
      },
      IA: {
        type: "esri",
        url: "https://services3.arcgis.com/kd9gaiUExYqUbnoq/arcgis/rest/services/Iowa_Parcels_2017/FeatureServer/0/query",
        outFields: "OBJECTID,COUNTYNAME,STATEPARID,UNPARCELID,PARCELNUMB,PARCELCLAS,DEEDHOLDER",
        whereTpl: "1=1",
        countyField: "COUNTYNAME",
        countyMatch: "name",
        fields: { parcel_id:"PARCELNUMB", state_parcel_id:"STATEPARID", prop_add:null, prop_city:"COUNTYNAME", prop_zip:null, owner:"DEEDHOLDER", class_code:"PARCELCLAS", latitude:null, longitude:null }
      },
      AR: {
        type: "esri",
        url: "https://gis.arkansas.gov/arcgis/rest/services/FEATURESERVICES/Planning_Cadastre/MapServer/6/query",
        outFields: "objectid,countyfips,parcelid,parcellgl,ownername,adrlabel,adrcity,adrzip5,parceltype,assessvalue,totalvalue,subdivision",
        whereTpl: "1=1",
        countyField: "countyfips",
        countyMatch: "fips5",
        fields: { parcel_id:"parcelid", state_parcel_id:"parcelid", prop_add:"adrlabel", prop_city:"adrcity", prop_zip:"adrzip5", owner:"ownername", class_code:"parceltype", latitude:null, longitude:null }
      },
      MS: {
        type: "esri",
        url: "https://gis.waggonereng.com/server/rest/services/Hosted/Mississippi_Parcels_Staewide/FeatureServer/3/query",
        outFields: "objectid,parno,altparno,ownname,siteadd,scity,szip,cntyname,cntyfips,stcntyfips,landval,totval,total_ac,zoning",
        whereTpl: "1=1",
        countyField: "stcntyfips",
        countyMatch: "fips5",
        fields: { parcel_id:"parno", state_parcel_id:"altparno", prop_add:"siteadd", prop_city:"scity", prop_zip:"szip", owner:"ownname", class_code:"zoning", latitude:null, longitude:null }
      },
      ID: {
        type: "esri",
        url: "https://services1.arcgis.com/CNPdEkvnGl65jCX8/arcgis/rest/services/Public_Idaho_Parcels_/FeatureServer/7/query",
        outFields: "OBJECTID,PARCEL_ID,County,FIPS,ASR_ACRES,OWNER1,OWNER2,MAIL_ADD1,MAIL_CITY,MAIL_STATE,MAIL_ZIP",
        whereTpl: "1=1",
        countyField: "FIPS",
        countyMatch: "fips5",
        fields: { parcel_id:"PARCEL_ID", state_parcel_id:"PARCEL_ID", prop_add:"MAIL_ADD1", prop_city:"MAIL_CITY", prop_zip:"MAIL_ZIP", owner:"OWNER1", class_code:null, latitude:null, longitude:null }
      },
      ME: {
        type: "esri",
        url: "https://services1.arcgis.com/RbMX0mRVOFNTdLzd/arcgis/rest/services/Parcels/FeatureServer/38/query",
        outFields: "OBJECTID,Parcel_ID",
        whereTpl: "1=1",
        countyField: null,
        countyMatch: null,
        fields: { parcel_id:"Parcel_ID", state_parcel_id:"Parcel_ID", prop_add:null, prop_city:null, prop_zip:null, owner:null, class_code:null, latitude:null, longitude:null }
      },
      WV: {
        type: "esri",
        url: "https://services.wvgis.wvu.edu/arcgis/rest/services/Planning_Cadastre/WV_Parcels/MapServer/0/query",
        outFields: "OBJECTID,CleanParcelID,FullOwnerName,FullOwnerAddress,FullPhysicalAddress,Acres_C,CountyID",
        whereTpl: "1=1",
        countyField: null,
        countyMatch: null,
        fields: { parcel_id:"CleanParcelID", state_parcel_id:"CleanParcelID", prop_add:"FullPhysicalAddress", prop_city:null, prop_zip:null, owner:"FullOwnerName", class_code:null, latitude:null, longitude:null }
      },
      MT: {
        type: "esri",
        url: "https://gisservicemt.gov/arcgis/rest/services/MSDI_Framework/Parcels/MapServer/0/query",
        outFields: "OBJECTID,PARCELID,COUNTYCD,CountyName,AddressLine1,CityStateZip,OwnerName,OwnerAddress1,OwnerCity,OwnerZipCode,PropType,LegalDescriptionShort,TotalAcres",
        whereTpl: "1=1",
        countyField: "CountyName",
        countyMatch: "name",
        fields: { parcel_id:"PARCELID", state_parcel_id:"PARCELID", prop_add:"AddressLine1", prop_city:"CityStateZip", prop_zip:null, owner:"OwnerName", class_code:"PropType", latitude:null, longitude:null }
      },
      WY: {
        type: "esri",
        url: "https://gis2.statelands.wyo.gov/arcgis/rest/services/oslisde/Parcels2025/MapServer/0/query",
        outFields: "OBJECTID,parcelnb,accountno,jurisdicti,ownername1,mailaddres,mailcity,mailstate,mailzipcod,locationad,landgrossa",
        whereTpl: "1=1",
        countyField: "jurisdicti",
        countyMatch: "name",
        fields: { parcel_id:"parcelnb", state_parcel_id:"accountno", prop_add:"locationad", prop_city:"mailcity", prop_zip:"mailzipcod", owner:"ownername1", class_code:null, latitude:null, longitude:null }
      },
      CO: {
        type: "esri",
        url: "https://gis.colorado.gov/public/rest/services/Address_and_Parcel/Colorado_Public_Parcels/FeatureServer/0/query",
        outFields: "OBJECTID,parcel_id,account,situsAdd,sitAddCty,sitAddZip,owner,countyName,countyFips,landUseDsc,zoningCode",
        whereTpl: "1=1",
        countyField: "countyFips",
        countyMatch: "fips3",
        fields: { parcel_id:"parcel_id", state_parcel_id:"account", prop_add:"situsAdd", prop_city:"sitAddCty", prop_zip:"sitAddZip", owner:"owner", class_code:"landUseDsc", latitude:null, longitude:null }
      },
      PA: {
        type: "esri",
        url: "https://imagery.pasda.psu.edu/arcgis/rest/services/PA_Parcels/MapServer/1/query",
        outFields: "OBJECTID,PIN,Source,Date",
        whereTpl: "1=1",
        countyField: "Source",
        countyMatch: "name",
        fields: { parcel_id:"PIN", state_parcel_id:"PIN", prop_add:null, prop_city:null, prop_zip:null, owner:null, class_code:null, latitude:null, longitude:null }
      },
      AZ: {
        type: "esri",
        url: "https://azgeo.az.gov/arcgis/rest/services/TerraSystems/AZParcel_Cache/FeatureServer/0/query",
        outFields: "OBJECTID,Source,AZ_PlaceName,AZ_APN,AZ_Address",
        whereTpl: "1=1",
        countyField: "Source",
        countyMatch: "name",
        fields: { parcel_id:"AZ_APN", state_parcel_id:"AZ_APN", prop_add:"AZ_Address", prop_city:"AZ_PlaceName", prop_zip:null, owner:null, class_code:null, latitude:null, longitude:null }
      },
      RI: {
        type: "esri",
        url: "https://risegis.ri.gov/hosting/rest/services/RIDEM/Tax_Parcels/MapServer/0/query",
        outFields: "OBJECTID,PlatLot,Acres,E911,TownCode,E911Desc",
        whereTpl: "1=1",
        countyField: null,
        countyMatch: null,
        fields: { parcel_id:"PlatLot", state_parcel_id:"PlatLot", prop_add:"E911", prop_city:"TownCode", prop_zip:null, owner:null, class_code:"E911Desc", latitude:null, longitude:null }
      },
      NV: {
        type: "esri",
        url: "https://arcgis.water.nv.gov/arcgis/rest/services/BaseLayers/County_Parcels_in_Nevada/MapServer/0/query",
        outFields: "OBJECTID,APN,SiteCity,Acres,County,PIN",
        whereTpl: "1=1",
        countyField: "County",
        countyMatch: "name",
        fields: { parcel_id:"APN", state_parcel_id:"PIN", prop_add:null, prop_city:"SiteCity", prop_zip:null, owner:null, class_code:null, latitude:null, longitude:null }
      }
    };

    Object.keys(SOURCES).forEach(function(code){
      window.MNStates.registerSource(code, SOURCES[code]);
    });
    console.log("[mn2-state-sources] registered:", Object.keys(SOURCES));
  }
  reg();
})();
