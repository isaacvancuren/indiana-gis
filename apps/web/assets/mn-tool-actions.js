/* Mapnova Tool Actions v1
 *
 * Wires up the universal Clear + Save-to-Project buttons added to each
 * tool section in the Tools panel:
 *
 *   #tb-clear-meas  -> remove all measurements
 *   #tb-save-meas   -> persist all measurements to active project
 *   #tb-save-draw   -> persist all drawings to active project
 *   #tb-sel-save    -> persist selected parcels to active project
 *
 * The actual save logic lives in mn-project-features.js (saveMeasurement,
 * saveAnnotation) and mn-multiselect-projects.js (INQ.addAllToProject for
 * parcels). This module is just the wiring + a couple of resilience
 * niceties (toast on no-active-project, idempotent click binding).
 */
(function(){
  'use strict';
  if (window.__mnToolActionsVersion === 1) return;
  window.__mnToolActionsVersion = 1;

  function $(id){ return document.getElementById(id); }

  function toast(msg, icon){
    if (typeof window.notify === 'function') return window.notify(msg, icon || 'fa-info-circle');
    if (typeof window.toast === 'function') return window.toast(msg);
    console.log('[mn-tool-actions]', msg);
  }

  function activeProjectId(){
    return window.MNProjects && window.MNProjects.state && window.MNProjects.state.current;
  }

  function ensureProject(){
    if (activeProjectId()) return true;
    toast('No active project. Open Projects (Saved tab) and Activate one first.', 'fa-folder-open');
    return false;
  }

  // ---- Measurement: clear ----
  function clearAllMeasurements(){
    var MNT = window.MNTools;
    if (!MNT) return;
    var ms = (MNT.measurements || []).slice();
    if (!ms.length) { toast('No measurements to clear', 'fa-info-circle'); return; }
    ms.forEach(function(m){
      try { if (m && m.layer && m.layer.remove) m.layer.remove(); } catch(e){}
      try { if (m && m.labelLayer && m.labelLayer.remove) m.labelLayer.remove(); } catch(e){}
    });
    MNT.measurements = [];
    if (typeof MNT.renderMeasList === 'function') {
      try { MNT.renderMeasList(); } catch(e){}
    }
    toast('Cleared ' + ms.length + ' measurement' + (ms.length===1?'':'s'), 'fa-eraser');
  }

  // ---- Measurement: save all ----
  async function saveAllMeasurements(){
    if (!ensureProject()) return;
    var PF = window.MNProjectFeatures;
    if (!PF || typeof PF.saveMeasurement !== 'function') {
      toast('Project save module not ready yet — try again in a moment', 'fa-clock');
      return;
    }
    var MNT = window.MNTools;
    var ms = (MNT && MNT.measurements) || [];
    if (!ms.length) { toast('No measurements to save', 'fa-info-circle'); return; }
    var n = 0, fail = 0, skipped = 0;
    for (var i = 0; i < ms.length; i++) {
      if (ms[i]._projectFeatureId) { skipped++; continue; }
      try {
        var r = await PF.saveMeasurement(ms[i]);
        if (r) n++; else fail++;
      } catch(e) { fail++; }
    }
    var bits = [];
    if (n) bits.push('Saved ' + n);
    if (skipped) bits.push(skipped + ' already saved');
    if (fail) bits.push(fail + ' failed');
    toast(bits.join(', ') || 'Nothing to save', n ? 'fa-folder-plus' : 'fa-info-circle');
    if (typeof MNT.renderMeasList === 'function') { try { MNT.renderMeasList(); } catch(e){} }
  }

  // ---- Draw / annotation: save all ----
  async function saveAllDrawings(){
    if (!ensureProject()) return;
    var PF = window.MNProjectFeatures;
    if (!PF || typeof PF.saveAnnotation !== 'function') {
      toast('Project save module not ready yet — try again in a moment', 'fa-clock');
      return;
    }
    var MNT = window.MNTools;
    var anns = (MNT && MNT.annotations) || [];
    if (!anns.length) { toast('No drawings to save', 'fa-info-circle'); return; }
    var n = 0, fail = 0, skipped = 0;
    for (var i = 0; i < anns.length; i++) {
      if (anns[i]._projectFeatureId) { skipped++; continue; }
      try {
        var r = await PF.saveAnnotation(anns[i]);
        if (r) n++; else fail++;
      } catch(e) { fail++; }
    }
    var bits = [];
    if (n) bits.push('Saved ' + n);
    if (skipped) bits.push(skipped + ' already saved');
    if (fail) bits.push(fail + ' failed');
    toast(bits.join(', ') || 'Nothing to save', n ? 'fa-folder-plus' : 'fa-info-circle');
    if (typeof PF.renderAnnotationList === 'function') { try { PF.renderAnnotationList(); } catch(e){} }
  }

  // ---- Selection: save all ----
  async function saveSelectionToProject(){
    if (!ensureProject()) return;
    // Prefer the inquiry list (multi-select feeds it). Fall back to MNSelect.
    var INQ = window.MNInquiryList;
    if (INQ && INQ.items && INQ.items.length && typeof INQ.addAllToProject === 'function') {
      try { return INQ.addAllToProject(); } catch(e) { console.warn(e); }
    }
    var MNS = window.MNSelect;
    if (!MNS || !MNS.selected || !MNS.selected.size) {
      toast('No parcels selected', 'fa-info-circle');
      return;
    }
    if (!window.MNProjects || typeof window.MNProjects.saveFeature !== 'function') {
      toast('Project save module not ready yet', 'fa-clock');
      return;
    }
    var n = 0, fail = 0;
    var entries = Array.from(MNS.selected.values());
    for (var i = 0; i < entries.length; i++) {
      var entry = entries[i];
      var layer = entry && entry.layer;
      if (!layer) continue;
      var props = (layer.feature && layer.feature.properties) || (layer.parcelData) || {};
      var geom = null;
      try {
        if (typeof layer.toGeoJSON === 'function') {
          var gj = layer.toGeoJSON();
          geom = (gj && gj.geometry) ? gj.geometry : gj;
        }
      } catch(e){}
      if (!geom) { fail++; continue; }
      var pid = props.parcel_id || props.state_parcel_id || props.PARCELID || props.PARID;
      var label = (props.prop_add ? props.prop_add : ('Parcel ' + (pid || '')));
      try {
        var r = await window.MNProjects.saveFeature('parcel', geom, props, label);
        if (r) n++; else fail++;
      } catch(e) { fail++; }
    }
    toast('Saved ' + n + ' parcel' + (n===1?'':'s') + (fail?(' ('+fail+' failed)'):'') + ' to project', n?'fa-folder-plus':'fa-info-circle');
  }

  function bind(){
    var bM = $('tb-clear-meas');
    if (bM && !bM.__mnBound) {
      bM.addEventListener('click', clearAllMeasurements);
      bM.__mnBound = true;
    }
    var sM = $('tb-save-meas');
    if (sM && !sM.__mnBound) {
      sM.addEventListener('click', saveAllMeasurements);
      sM.__mnBound = true;
    }
    var sD = $('tb-save-draw');
    if (sD && !sD.__mnBound) {
      sD.addEventListener('click', saveAllDrawings);
      sD.__mnBound = true;
    }
    var sS = $('tb-sel-save');
    if (sS && !sS.__mnBound) {
      sS.addEventListener('click', saveSelectionToProject);
      sS.__mnBound = true;
    }
  }

  // Run repeatedly until everything's bound (some buttons may be re-rendered).
  function start(){
    bind();
    setInterval(bind, 1500);
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }

  window.MNToolActions = {
    clearAllMeasurements: clearAllMeasurements,
    saveAllMeasurements: saveAllMeasurements,
    saveAllDrawings: saveAllDrawings,
    saveSelectionToProject: saveSelectionToProject
  };
})();
