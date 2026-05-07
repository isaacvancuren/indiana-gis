/* mn2-state-ui.js
   - Integrate MNStates with the built-in #state-sel dropdown.
   - Replaces "(coming soon)" with proper labels for states that have parcel sources
   - Enables/disables options based on whether a parcel source is registered
   - Wires the dropdown change handler to call MNStates.set + flyTo
   - Removes the redundant #mn2-state-switcher injected by mn2-states.js
   - Updates labels live whenever a new source is registered
*/
(function(){
  function lcToCode(slug){
    if(!slug) return null;
    var key = slug.toLowerCase().replace(/[^a-z]/g,"");
    var states = window.MNStates && window.MNStates.list;
    if(!states) return null;
    for(var c in states){
      if(states[c].n.toLowerCase().replace(/[^a-z]/g,"") === key) return c;
    }
    return null;
  }
  function codeToSlug(code){
    var s = window.MNStates && window.MNStates.list[code];
    return s ? s.n.toLowerCase().replace(/\s+/g,"") : null;
  }
  function refreshLabels(){
    var sel = document.getElementById("state-sel");
    if(!sel || !window.MNStates) return;
    var srcs = window.MNStates.sources;
    Array.prototype.forEach.call(sel.options, function(opt){
      if(!opt.value) return;
      var code = lcToCode(opt.value);
      if(!code) return;
      var hasSrc = srcs[code] && srcs[code].type === "esri";
      var hasCountyFb = window.MN_COUNTY_PARCELS && window.MN_COUNTY_PARCELS[code] && window.MN_COUNTY_PARCELS[code].length > 0;
      var available = hasSrc || hasCountyFb;
      var name = window.MNStates.list[code].n;
      var suffix = hasSrc ? "" : (hasCountyFb ? " — county data" : " (coming soon)");
      opt.textContent = name + suffix;
      opt.disabled = !available;
      if(available) opt.removeAttribute("disabled");
    });
  }
  function bindHandler(){
    var sel = document.getElementById("state-sel");
    if(!sel || sel.__mnBound) return;
    sel.__mnBound = true;
    sel.addEventListener("change", function(){
      var code = lcToCode(sel.value);
      if(!code) return;
      window.MNStates.set(code);
      window.MNStates.flyTo(code);
      try { if (window.parcelTileCache && window.parcelTileCache.clear) window.parcelTileCache.clear(); } catch(e){}
      try { if (window.loadedParcelIds && window.loadedParcelIds.clear) window.loadedParcelIds.clear(); } catch(e){}
      try { if (window.parcelLayer && window.parcelLayer.clearLayers) window.parcelLayer.clearLayers(); } catch(e){}
      setTimeout(function(){
        if (typeof window.loadParcelsForView === "function") window.loadParcelsForView();
      }, 1500);
    });
  }
  function syncSelToActive(){
    var sel = document.getElementById("state-sel");
    if(!sel || !window.MNStates) return;
    var active = window.MNStates.active();
    var slug = codeToSlug(active);
    if(slug && sel.value !== slug){ sel.value = slug; }
  }
  function removeRedundantSwitcher(){
    var el = document.getElementById("mn2-state-switcher");
    if(el) el.remove();
  }
  function init(){
    if(!window.MNStates) return setTimeout(init, 200);
    refreshLabels();
    bindHandler();
    syncSelToActive();
    removeRedundantSwitcher();
  }
  document.addEventListener("DOMContentLoaded", function(){ setTimeout(init, 800); });
  setTimeout(init, 1000);
  setTimeout(init, 3000);
  setInterval(refreshLabels, 5000);
  document.addEventListener("mn:sourceAdded", refreshLabels);
  document.addEventListener("mn:stateChange", syncSelToActive);
  console.log("[mn2-state-ui] integrated with built-in #state-sel");
})();
