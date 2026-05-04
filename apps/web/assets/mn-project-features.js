/* ============================================================================
 * Mapnova Project Features - Persist Annotations / Shapes / Measurements
 * ----------------------------------------------------------------------------
 * Adds "Save to Project" buttons next to every drawn shape, text annotation,
 * and measurement. Persists to Supabase via MNProjects.saveFeature so they
 * survive page refresh and are loaded back when the project is reactivated.
 *
 * Feature types persisted (project_features.feature_type):
 *   - "annotation:polygon"  geom = GeoJSON Polygon
 *   - "annotation:polyline" geom = GeoJSON LineString
 *   - "annotation:text"     geom = { type:'marker', coordinates:[lng,lat] }
 *                                  properties.text holds the label
 *   - "measurement:line"    geom = GeoJSON LineString
 *                                  properties.length_m
 *   - "measurement:area"    geom = GeoJSON Polygon
 *                                  properties.area_sqm, perimeter_m
 * ========================================================================= */
(function(){
  'use strict';

  function ready(fn){
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', fn, {once:true});
    } else { fn(); }
  }

  function waitFor(test, cb, maxTries){
    var n = 0, max = maxTries || 300;
    var t = setInterval(function(){
      n++;
      if (test()) { clearInterval(t); cb(); }
      else if (n >= max) { clearInterval(t); }
    }, 200);
  }

  function $(id){ return document.getElementById(id); }

  function getMap(){
    return (typeof window.getLeafletMap === 'function' ? window.getLeafletMap() : null) || window.map;
  }

  function pointsToLngLat(pts){
    return pts.map(function(p){ return [p[1] || p.lng, p[0] || p.lat]; });
  }

  function layerToGeoJSON(layer){
    if (!layer) return null;
    try {
      if (typeof layer.toGeoJSON === 'function') {
        var gj = layer.toGeoJSON();
        if (gj && gj.geometry) return gj.geometry;
        return gj;
      }
    } catch(e){}
    return null;
  }

  function annotationGeom(ann){
    if (!ann || !ann.layer) return null;
    if (ann.type === 'text' || ann.type === 'marker') {
      var ll = ann.layer.getLatLng ? ann.layer.getLatLng() : null;
      if (!ll) return null;
      return { type: 'marker', coordinates: [ll.lng, ll.lat] };
    }
    return layerToGeoJSON(ann.layer);
  }

  function measurementGeom(m){
    if (!m || !m.pts) return null;
    var coords = pointsToLngLat(m.pts);
    if (m.type === 'line') {
      return { type: 'LineString', coordinates: coords };
    }
    if (m.type === 'area') {
      var ring = coords.slice();
      if (ring.length && (ring[0][0] !== ring[ring.length-1][0] || ring[0][1] !== ring[ring.length-1][1])) {
        ring.push(ring[0]);
      }
      return { type: 'Polygon', coordinates: [ring] };
    }
    return null;
  }

  function activeProjectId(){
    return window.MNProjects && window.MNProjects.state && window.MNProjects.state.current;
  }

  function notify(msg){
    if (typeof window.toast === 'function') return window.toast(msg);
    if (window.MNHistory && typeof window.MNHistory.toast === 'function') return window.MNHistory.toast(msg);
    console.log('[mn-project-features]', msg);
  }

  async function saveAnnotation(ann){
    if (!activeProjectId()) { notify('No active project. Open Projects panel and Activate one first.'); return null; }
    var geom = annotationGeom(ann);
    if (!geom) { notify('Cannot extract geometry for this annotation.'); return null; }
    var ftype = 'annotation:' + (ann.type || 'shape');
    var props = { style: { color: ann.color || '#06b6d4', weight: 3 } };
    if (ann.type === 'text' && ann.text) props.text = ann.text;
    var label = (ann.type === 'text' && ann.text) ? ann.text : null;
    var saved = await window.MNProjects.saveFeature(ftype, geom, props, label);
    if (saved) { ann._projectFeatureId = saved.id; }
    return saved;
  }

  async function saveMeasurement(m){
    if (!activeProjectId()) { notify('No active project. Open Projects panel and Activate one first.'); return null; }
    var geom = measurementGeom(m);
    if (!geom) { notify('Cannot extract geometry for this measurement.'); return null; }
    var ftype = 'measurement:' + (m.type || 'meas');
    var props = { style: { color: '#06b6d4', weight: 3 } };
    if (m.type === 'line') {
      props.length_m = m.lengthM;
      props.label_value = window.MNTools && window.MNTools.fmtDist ? window.MNTools.fmtDist(m.lengthM) : (m.lengthM + ' m');
    } else if (m.type === 'area') {
      props.area_sqm = m.areaSqm;
      props.perimeter_m = m.perimM;
      props.label_value = window.MNTools && window.MNTools.fmtArea ? window.MNTools.fmtArea(m.areaSqm) : (m.areaSqm + ' m²');
    }
    var saved = await window.MNProjects.saveFeature(ftype, geom, props, props.label_value || null);
    if (saved) { m._projectFeatureId = saved.id; }
    return saved;
  }

  async function saveAll(){
    if (!activeProjectId()) { notify('No active project. Open Projects panel and Activate one first.'); return; }
    var MNT = window.MNTools;
    var n = 0, fail = 0;
    var anns = (MNT && MNT.annotations) || [];
    var meas = (MNT && MNT.measurements) || [];
    for (var i = 0; i < anns.length; i++) {
      if (anns[i]._projectFeatureId) continue;
      var r = await saveAnnotation(anns[i]);
      if (r) n++; else fail++;
    }
    for (var j = 0; j < meas.length; j++) {
      if (meas[j]._projectFeatureId) continue;
      var r2 = await saveMeasurement(meas[j]);
      if (r2) n++; else fail++;
    }
    notify('Saved ' + n + ' feature' + (n===1?'':'s') + ' to project' + (fail?(' ('+fail+' failed)'):'') + '.');
  }

  function renderToolbarButton(){
    var panel = $('mn-meas-panel-content') || $('mn-meas-body') || $('mn-meas-list');
    if (!panel) return;
    if ($('mn-save-all-to-proj')) return;
    var btn = document.createElement('button');
    btn.id = 'mn-save-all-to-proj';
    btn.type = 'button';
    btn.innerHTML = '<i class="fas fa-folder-plus"></i> Save All to Active Project';
    btn.style.cssText = 'display:block;width:100%;margin:6px 0;padding:6px 10px;background:#0e1726;border:1px solid #1e3a5f;border-radius:5px;color:#67e8f9;font-size:11px;font-weight:600;cursor:pointer;letter-spacing:.3px;';
    btn.addEventListener('click', function(){ saveAll(); });
    panel.parentNode.insertBefore(btn, panel);
  }

  function injectMeasRowButtons(){
    var list = $('mn-meas-list');
    if (!list) return;
    var rows = list.querySelectorAll('[data-mn-meas-zoom]');
    rows.forEach(function(zoomBtn){
      var id = zoomBtn.getAttribute('data-mn-meas-zoom');
      var rowEl = zoomBtn.parentElement;
      if (!rowEl || rowEl.querySelector('[data-mn-meas-save]')) return;
      var m = (window.MNTools.measurements || []).find(function(x){ return x.id === id; });
      var saved = m && m._projectFeatureId;
      var saveBtn = document.createElement('button');
      saveBtn.setAttribute('data-mn-meas-save', id);
      saveBtn.title = saved ? 'Saved to active project' : 'Save to active project';
      saveBtn.innerHTML = saved ? '<i class="fas fa-check-circle"></i>' : '<i class="fas fa-folder-plus"></i>';
      saveBtn.style.cssText = 'background:none;border:none;color:'+(saved?'#22c55e':'#67e8f9')+';cursor:pointer;padding:0 4px;font-size:12px;';
      saveBtn.addEventListener('click', function(ev){
        ev.stopPropagation();
        if (!m) return;
        if (m._projectFeatureId) { notify('Already saved to project.'); return; }
        saveMeasurement(m).then(function(r){ if (r) injectMeasRowButtons(); });
      });
      var delBtn = rowEl.querySelector('[data-mn-meas-del]');
      if (delBtn) rowEl.insertBefore(saveBtn, delBtn);
      else rowEl.appendChild(saveBtn);
    });
  }

  function wrapRenderMeasList(){
    var MNT = window.MNTools;
    if (!MNT || typeof MNT.renderMeasList !== 'function' || MNT.__projFeatWrapped) return;
    var orig = MNT.renderMeasList.bind(MNT);
    MNT.renderMeasList = function(){
      orig();
      try { injectMeasRowButtons(); renderToolbarButton(); } catch(e){}
    };
    MNT.__projFeatWrapped = true;
  }

  function ensureAnnotationsPanel(){
    if ($('mn-annot-list')) return $('mn-annot-list');
    var drawOpts = $('mn-draw-opts');
    if (!drawOpts) return null;
    var box = document.createElement('div');
    box.id = 'mn-annot-list';
    box.style.cssText = 'margin-top:8px;padding:6px;background:rgba(255,255,255,0.03);border-radius:5px;font-size:11px;';
    drawOpts.appendChild(box);
    return box;
  }

  function escapeHtml(s){ return String(s).replace(/[<>&]/g, function(c){ return {'<':'&lt;','>':'&gt;','&':'&amp;'}[c]; }); }

  function renderAnnotationList(){
    var box = ensureAnnotationsPanel();
    if (!box) return;
    var anns = (window.MNTools && window.MNTools.annotations) || [];
    if (!anns.length) { box.innerHTML = '<div style="color:#64748b;font-size:10px;padding:4px;">No annotations yet.</div>'; return; }
    var html = '<div style="font-size:10px;color:#64748b;margin-bottom:4px;font-weight:600;letter-spacing:.5px;">SAVED ANNOTATIONS (' + anns.length + ')</div>';
    anns.forEach(function(a){
      var saved = !!a._projectFeatureId;
      var icon = a.type === 'text' ? 'fa-font' : (a.type === 'polyline' ? 'fa-route' : 'fa-draw-polygon');
      var label = a.type === 'text' ? (a.text || 'text') : a.type;
      html += '<div data-mn-annot-row="' + a.id + '" style="display:flex;align-items:center;gap:5px;padding:4px 6px;background:rgba(255,255,255,0.04);border-radius:5px;margin-bottom:3px;">'
            + '<i class="fas ' + icon + '" style="color:' + (a.color || '#06b6d4') + ';font-size:11px;"></i>'
            + '<span style="flex:1;font-size:11px;color:#e2e8f0;">' + escapeHtml(label) + '</span>'
            + '<button data-mn-annot-save="' + a.id + '" title="' + (saved?'Saved to project':'Save to project') + '" style="background:none;border:none;color:' + (saved?'#22c55e':'#67e8f9') + ';cursor:pointer;padding:0 4px;font-size:12px;"><i class="fas ' + (saved?'fa-check-circle':'fa-folder-plus') + '"></i></button>'
            + '<button data-mn-annot-del="' + a.id + '" title="Delete" style="background:none;border:none;color:#f87171;cursor:pointer;padding:0 4px;font-size:11px;"><i class="fas fa-times"></i></button>'
            + '</div>';
    });
    box.innerHTML = html;
  }

  function bindAnnotationEvents(){
    if (window.__mnAnnotEventsBound) return;
    window.__mnAnnotEventsBound = true;
    document.addEventListener('click', function(ev){
      var s = ev.target.closest('[data-mn-annot-save]');
      if (s) {
        var id = s.getAttribute('data-mn-annot-save');
        var a = (window.MNTools.annotations || []).find(function(x){ return x.id === id; });
        if (a) {
          if (a._projectFeatureId) { notify('Already saved to project.'); return; }
          saveAnnotation(a).then(function(r){ if (r) renderAnnotationList(); });
        }
        return;
      }
      var d = ev.target.closest('[data-mn-annot-del]');
      if (d) {
        var id2 = d.getAttribute('data-mn-annot-del');
        var idx = (window.MNTools.annotations || []).findIndex(function(x){ return x.id === id2; });
        if (idx >= 0) {
          var a2 = window.MNTools.annotations[idx];
          try { if (a2.layer && a2.layer.remove) a2.layer.remove(); } catch(e){}
          window.MNTools.annotations.splice(idx, 1);
          renderAnnotationList();
        }
      }
    });
  }

  function wrapFinishHandlers(){
    var MNT = window.MNTools;
    if (!MNT || MNT.__projFeatFinishWrapped) return;
    var keys = ['finish_draw_polygon', 'finish_draw_polyline', 'click_draw_text'];
    keys.forEach(function(k){
      if (typeof MNT[k] !== 'function') return;
      var orig = MNT[k].bind(MNT);
      MNT[k] = function(){
        var ret = orig.apply(this, arguments);
        try { renderAnnotationList(); } catch(e){}
        return ret;
      };
    });
    MNT.__projFeatFinishWrapped = true;
  }

  ready(function(){
    waitFor(function(){
      return window.MNTools && window.MNProjects && typeof window.MNProjects.saveFeature === 'function';
    }, function(){
      wrapRenderMeasList();
      wrapFinishHandlers();
      bindAnnotationEvents();
      try { renderToolbarButton(); injectMeasRowButtons(); renderAnnotationList(); } catch(e){}
      window.MNProjectFeatures = {
        saveAnnotation: saveAnnotation,
        saveMeasurement: saveMeasurement,
        saveAll: saveAll,
        renderAnnotationList: renderAnnotationList
      };
      console.log('[Mapnova] Project Features module ready (annotations + shapes + measurements persistence).');
    });
  });
})();
