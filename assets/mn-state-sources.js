/* mn-state-sources.js - Confirmed statewide parcel sources for non-IN states
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
        whereTpl: "1=1",
        fields: { parcel_id:"PARCELID", state_parcel_id:"TAXPARCELID", prop_add:"SITEADRESS", prop_city:null, prop_zip:"ZIPCODE", owner:"OWNERNME1", class_code:"PROPCLASS", latitude:null, longitude:null }
      },
      NC: {
        type: "esri",
        url:  "https://services.nconemap.gov/secure/rest/services/NC1Map_Parcels/MapServer/1/query",
        outFields: "parno,altparno,ownname,siteadd,scity,szip,parval,landval,improvval,gisacres,cntyname",
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
        whereTpl: "1=1",
        fields: { parcel_id:"PARCELID", state_parcel_id:"VGIN_QPID", prop_add:null, prop_city:"LOCALITY", prop_zip:null, owner:null, class_code:null, latitude:null, longitude:null }
      },
      VT: {
        type: "esri",
        url:  "https://services1.arcgis.com/BkFxaEFNwHqX3tAw/arcgis/rest/services/FS_VCGI_VTPARCELS_WM_NOCACHE_v2/FeatureServer/0/query",
        outFields: "STATUS,PARENTSPAN,SPAN,MAPID,PROPTYPE,YEAR,TOWN",
        whereTpl: "1=1",
        fields: { parcel_id:"SPAN", state_parcel_id:"PARENTSPAN", prop_add:null, prop_city:"TOWN", prop_zip:null, owner:null, class_code:"PROPTYPE", latitude:null, longitude:null }
      },
      NJ: {
        type: "esri",
        url:  "https://maps.nj.gov/arcgis/rest/services/Framework/Cadastral/MapServer/0/query",
        outFields: "PAMS_PIN,PCL_MUN,COUNTY,MUN_NAME,PROP_CLASS,PROP_LOC,OWNER_NAME,ST_ADDRESS,CITY_STATE,ZIP_CODE,LAND_VAL,NET_VALUE,CALC_ACRE",
        whereTpl: "1=1",
        fields: { parcel_id:"PAMS_PIN", state_parcel_id:"PAMS_PIN", prop_add:"PROP_LOC", prop_city:"MUN_NAME", prop_zip:"ZIP_CODE", owner:"OWNER_NAME", class_code:"PROP_CLASS", latitude:null, longitude:null }
      },
                              CA: {
      type: "esri",
      url:  "https://services1.arcgis.com/jUJYIo9tSA7EHvfZ/arcgis/rest/services/CA_Statewide_Parcels_Public_view/FeatureServer/0/query",
      outFields: "PARCEL_APN,FIPS_CODE,COUNTYNAME,SITE_ADDR,SITE_CITY,SITE_STATE,SITE_ZIP,FullStreetAddress",
      whereTpl: "1=1",
      fields: { parcel_id:"PARCEL_APN", state_parcel_id:"PARCEL_APN", prop_add:"SITE_ADDR", prop_city:"SITE_CITY", prop_zip:"SITE_ZIP", owner:null, class_code:null, latitude:null, longitude:null }
      },
TN: {
      type: "esri",
      url:  "https://services1.arcgis.com/YuVBSS7Y1of2Qud1/arcgis/rest/services/Tennessee_Property_Boundaries_Public_Use/FeatureServer/0/query",
      outFields: "PARCELID,GISLINK,ADDRESS,OWNER,OWNER2,COUNTY_NAME,DEEDAC,SUBDIV,LOT",
      whereTpl: "1=1",
      fields: { parcel_id:"PARCELID", state_parcel_id:"GISLINK", prop_add:"ADDRESS", prop_city:"COUNTY_NAME", prop_zip:null, owner:"OWNER", class_code:null, latitude:null, longitude:null }
      },
UT: {
      type: "esri",
      url:  "https://services1.arcgis.com/99lidPhWCzftIe9K/arcgis/rest/services/UtahStatewideParcels/FeatureServer/0/query",
      outFields: "PARCEL_ID,PARCEL_ADD,PARCEL_CITY,PARCEL_ZIP,County,RECORDER",
      whereTpl: "1=1",
      fields: { parcel_id:"PARCEL_ID", state_parcel_id:"PARCEL_ID", prop_add:"PARCEL_ADD", prop_city:"PARCEL_CITY", prop_zip:"PARCEL_ZIP", owner:null, class_code:null, latitude:null, longitude:null }
      },
HI: {
        type: "esri",
        url:  "https://geodata.hawaii.gov/arcgis/rest/services/ParcelsZoning/MapServer/25/query",
        outFields: "tmk,tmk_txt,county,island,zone,section,plat,parcel,gisacres",
        whereTpl: "1=1",
        fields: { parcel_id:"tmk_txt", state_parcel_id:"tmk", prop_add:null, prop_city:"county", prop_zip:null, owner:null, class_code:"zone", latitude:null, longitude:null }
      },
NH: {
        type: "esri",
        url:  "https://nhgeodata.unh.edu/hosting/rest/services/Hosted/CAD_ParcelMosaic/FeatureServer/1/query",
        outFields: "parceloid,nh_gis_id,pid,town,countyid,sluc,streetaddress,name",
        whereTpl: "1=1",
        fields: { parcel_id:"pid", state_parcel_id:"nh_gis_id", prop_add:"streetaddress", prop_city:"town", prop_zip:null, owner:"name", class_code:"sluc", latitude:null, longitude:null }
      }
    };

    Object.keys(SOURCES).forEach(function(code){
      window.MNStates.registerSource(code, SOURCES[code]);
    });
    console.log("[mn-state-sources] registered:", Object.keys(SOURCES));
  }
  reg();
})();
