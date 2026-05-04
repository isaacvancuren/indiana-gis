/* mn-state-OH.js - Ohio statewide parcels via OGRIP AGOL endpoint */
(function(){
  function reg(){
    if (!window.MNStates || !window.MNStates.registerSource) {
      return setTimeout(reg, 200);
    }
    window.MNStates.registerSource("OH", {
      type: "esri",
      url:  "https://services2.arcgis.com/MlJ0G8iWUyC7jAmu/arcgis/rest/services/OhioStatewidePacels_full_view/FeatureServer/0/query",
      outFields: "LocalParcelID,StateParcelID,SitusAddressAll,MailAddressAll,MailCity,MailZip,MailState,County,StateLUC,LandArea",
      whereTpl: "1=1",
      fields: {
        parcel_id: "LocalParcelID",
        state_parcel_id: "StateParcelID",
        prop_add: "SitusAddressAll",
        prop_city: null,
        prop_zip: "MailZip",
        owner: null,
        class_code: "StateLUC",
        latitude: null,
        longitude: null
      }
    });
    console.log("[mn-state-OH] registered Ohio parcels source");
  }
  reg();
})();
