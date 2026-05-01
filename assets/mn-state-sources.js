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
      }
    };

    Object.keys(SOURCES).forEach(function(code){
      window.MNStates.registerSource(code, SOURCES[code]);
    });
    console.log("[mn-state-sources] registered:", Object.keys(SOURCES));
  }
  reg();
})();
