/* Mapnova Cloud Projects — saved projects backed by D1 via /api/projects.
 *
 * End-to-end demo of the Clerk → API → D1 chain. When the user is signed
 * in via Clerk (window.MNClerk), this module:
 *
 *   1. Fetches the user's saved projects from /api/projects
 *      (Authorization: Bearer <clerk-jwt> attached automatically by mnAuthFetch).
 *   2. Renders a small floating panel listing those projects.
 *   3. Provides a "Save current map state" action that snapshots the user's
 *      current measurements + drawings + selections and POSTs to /api/projects
 *      so they persist across sessions and devices.
 *   4. Provides "Load" on any saved project to restore measurements/drawings
 *      to the map (selections aren't restored because parcels may not be
 *      currently rendered).
 *
 * Public API:
 *   window.MNCloudProjects.fetch()           // → Promise<Project[]>
 *   window.MNCloudProjects.create(name)      // → Promise<Project>
 *   window.MNCloudProjects.snapshot(name)    // → Promise<Project>, current map → server
 *   window.MNCloudProjects.load(projectId)   // restore project's data onto the map
 *   window.MNCloudProjects.delete(projectId) // → Promise<{ok:true}>
 *
 * This is ADDITIVE. It does NOT modify the existing Supabase-backed
 * MNProjects/MNProjectFeatures system. Both run in parallel until Supabase
 * is removed in a follow-up PR.
 *
 * Loaded via <script src="static/v2/usr-clerk-projects.js" defer> in index.html.
 */
(function(){
  'use strict';
  if (window.MNCloudProjects) return;

  // ─── Helpers ────────────────────────────────────────────────────────────────

  function authReady() {
    return window.MNClerk && window.MNClerk.ready;
  }

  function authedFetch(path, init) {
    return window.mnAuthFetch(path, init || {}).then(function(r){
      if (!r.ok) {
        return r.text().then(function(t){
          throw new Error('HTTP ' + r.status + ' ' + path + ': ' + t);
        });
      }
      return r.json();
    });
  }

  // Snapshot the current map state into a serializable project.data shape
  // matching ProjectDataSchema in @mapnova/shared (features[], notes, settings).
  function snapshotMapState() {
    var MNT = window.MNTools;
    var features = [];
    if (MNT) {
      // Measurements
      (MNT.measurements || []).forEach(function(m, i){
        var coords;
        try { coords = (m.pts || []).map(function(p){ return [p.lng, p.lat]; }); } catch(_){}
        if (!coords) return;
        if (m.type === 'line') {
          features.push({
            id: m.id || ('m' + i),
            feature_type: 'measurement:line',
            geom: { type: 'LineString', coordinates: coords },
            properties: { length_m: m.lengthM || 0 },
            label: null,
          });
        } else if (m.type === 'area') {
          var ring = coords.slice();
          if (ring.length && (ring[0][0] !== ring[ring.length-1][0] || ring[0][1] !== ring[ring.length-1][1])) {
            ring.push(ring[0]);
          }
          features.push({
            id: m.id || ('m' + i),
            feature_type: 'measurement:area',
            geom: { type: 'Polygon', coordinates: [ring] },
            properties: { area_sqm: m.areaSqm || 0, perimeter_m: m.perimM || 0 },
            label: null,
          });
        }
      });
      // Drawings (annotations)
      (MNT.annotations || []).forEach(function(a, i){
        var geom = null;
        try {
          if (a.layer && typeof a.layer.toGeoJSON === 'function') {
            var gj = a.layer.toGeoJSON();
            geom = (gj && gj.geometry) ? gj.geometry : gj;
          } else if (a.layer && typeof a.layer.getLatLng === 'function') {
            var ll = a.layer.getLatLng();
            geom = { type: 'marker', coordinates: [ll.lng, ll.lat] };
          }
        } catch(_e){}
        if (!geom) return;
        var props = {};
        if (a.text) props.text = a.text;
        features.push({
          id: a.id || ('a' + i),
          feature_type: 'annotation:' + (a.type || 'shape'),
          geom: geom,
          properties: props,
          label: a.text || null,
          color: a.color || undefined,
        });
      });
    }
    return { features: features, notes: '', settings: {} };
  }

  // Restore project.data.features back onto the map. Best-effort — drawings
  // and measurements are reconstructed; selections are not (parcels may not
  // be currently visible on the map).
  function restoreMapState(data) {
    if (!data || !Array.isArray(data.features)) return 0;
    var map = window.map;
    var L = window.L;
    var MNT = window.MNTools;
    if (!map || !L || !MNT) return 0;

    var restored = 0;
    data.features.forEach(function(f){
      try {
        var color = f.color || '#fbbf24';
        if (f.feature_type === 'annotation:polygon' && f.geom && f.geom.coordinates) {
          var ring = f.geom.coordinates[0].map(function(c){ return [c[1], c[0]]; });
          var p = L.polygon(ring, { color: color, weight: 2, fillColor: color, fillOpacity: 0.2 }).addTo(MNT.drawLayer);
          MNT.annotations.push({ id: f.id, type: 'polygon', layer: p, color: color });
          restored++;
        } else if (f.feature_type === 'annotation:polyline' && f.geom && f.geom.coordinates) {
          var line = f.geom.coordinates.map(function(c){ return [c[1], c[0]]; });
          var pl = L.polyline(line, { color: color, weight: 3 }).addTo(MNT.drawLayer);
          MNT.annotations.push({ id: f.id, type: 'polyline', layer: pl, color: color });
          restored++;
        } else if (f.feature_type === 'annotation:text' && f.geom && f.geom.coordinates) {
          var tll = [f.geom.coordinates[1], f.geom.coordinates[0]];
          var txt = (f.properties && f.properties.text) || f.label || '';
          var marker = L.marker(tll, { icon: L.divIcon({ className: 'mn2-text-label', html: '<span style="background:rgba(0,0,0,0.7);color:'+color+';padding:3px 8px;border-radius:4px;font-size:13px;font-weight:600;border:1px solid '+color+';">'+escapeHtml(txt)+'</span>' }) }).addTo(MNT.drawLayer);
          MNT.annotations.push({ id: f.id, type: 'text', layer: marker, color: color, text: txt });
          restored++;
        } else if (f.feature_type === 'measurement:line' && f.geom && f.geom.coordinates) {
          var pts = f.geom.coordinates.map(function(c){ return L.latLng(c[1], c[0]); });
          var len = (f.properties && f.properties.length_m) || MNT.lineLength(pts);
          var ml = L.polyline(pts, { color: '#06b6d4', weight: 3 }).addTo(MNT.measLayer);
          var midPos = pts[Math.floor(pts.length/2)];
          var lbl = L.marker(midPos, { icon: L.divIcon({ className: 'mn2-meas-label', html: '<span style="background:#0891b2;color:#fff;padding:2px 6px;border-radius:4px;font-size:11px;font-weight:600;">'+MNT.fmtDist(len)+'</span>' }) }).addTo(MNT.measLayer);
          MNT.measurements.push({ id: f.id, type: 'line', pts: pts, lengthM: len, layer: ml, label: lbl });
          restored++;
        } else if (f.feature_type === 'measurement:area' && f.geom && f.geom.coordinates) {
          var ring2 = f.geom.coordinates[0].slice(0, -1).map(function(c){ return L.latLng(c[1], c[0]); });
          var sqm = (f.properties && f.properties.area_sqm) || MNT.geodesicArea(ring2);
          var perim = (f.properties && f.properties.perimeter_m) || MNT.lineLength(ring2.concat([ring2[0]]));
          var pp = L.polygon(ring2, { color: '#06b6d4', weight: 2, fillColor: '#06b6d4', fillOpacity: 0.15 }).addTo(MNT.measLayer);
          var ctr = pp.getBounds().getCenter();
          var lbl2 = L.marker(ctr, { icon: L.divIcon({ className: 'mn2-meas-label', html: '<span style="background:#0891b2;color:#fff;padding:2px 6px;border-radius:4px;font-size:11px;font-weight:600;">'+MNT.fmtArea(sqm)+'</span>' }) }).addTo(MNT.measLayer);
          MNT.measurements.push({ id: f.id, type: 'area', pts: ring2, areaSqm: sqm, perimM: perim, layer: pp, label: lbl2 });
          restored++;
        }
      } catch(_e){
        console.warn('[MNCloudProjects] Failed to restore feature', f, _e);
      }
    });

    if (typeof MNT.renderMeasList === 'function') {
      try { MNT.renderMeasList(); } catch(_e){}
    }
    return restored;
  }

  function escapeHtml(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function(c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  // ─── Public API ─────────────────────────────────────────────────────────────

  var MNCloudProjects = window.MNCloudProjects = {
    fetch: function() {
      return authedFetch('/api/projects').then(function(r){ return (r && r.projects) || []; });
    },
    create: function(name, data) {
      return authedFetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name, data: data || { features: [], notes: '', settings: {} } }),
      }).then(function(r){ return r.project; });
    },
    snapshot: function(name) {
      var data = snapshotMapState();
      return MNCloudProjects.create(name, data);
    },
    update: function(id, body) {
      return authedFetch('/api/projects/' + encodeURIComponent(id), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }).then(function(r){ return r.project; });
    },
    load: function(id) {
      return authedFetch('/api/projects/' + encodeURIComponent(id)).then(function(r){
        if (!r || !r.project) throw new Error('Project not found');
        var data;
        try { data = JSON.parse(r.project.data); } catch(_e){ data = { features: [] }; }
        return restoreMapState(data);
      });
    },
    delete: function(id) {
      return authedFetch('/api/projects/' + encodeURIComponent(id), { method: 'DELETE' });
    },
  };

  // ─── UI panel ───────────────────────────────────────────────────────────────

  function mountPanel() {
    if (document.getElementById('mn2-cloud-projects-panel')) return;

    var panel = document.createElement('div');
    panel.id = 'mn2-cloud-projects-panel';
    panel.style.cssText = [
      'position:fixed', 'top:60px', 'right:10px', 'z-index:9998',
      'background:rgba(14,20,32,0.96)', 'border:1px solid #1a2d40',
      'border-radius:8px', 'padding:10px 12px', 'min-width:240px', 'max-width:280px',
      'font:12px -apple-system,system-ui,sans-serif', 'color:#dde4f0',
      'backdrop-filter:blur(8px)', '-webkit-backdrop-filter:blur(8px)',
      'box-shadow:0 4px 12px rgba(0,0,0,0.4)',
      'display:none',
    ].join(';');
    document.body.appendChild(panel);

    function render(projects, msg) {
      var html = [
        '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">',
          '<strong style="font-size:13px">Saved projects</strong>',
          '<button id="mn2-cp-refresh" type="button" style="background:transparent;border:none;color:#94a3b8;cursor:pointer;font-size:12px" title="Refresh"><i class="fa fa-rotate"></i> ↻</button>',
        '</div>',
      ];
      if (msg) html.push('<div style="opacity:.7;margin-bottom:6px">'+escapeHtml(msg)+'</div>');
      if (projects && projects.length) {
        html.push('<div style="max-height:240px;overflow-y:auto;margin-bottom:8px">');
        projects.forEach(function(p){
          var when = p.updated_at ? new Date(p.updated_at * 1000).toLocaleDateString() : '';
          html.push(
            '<div data-cp-id="'+escapeHtml(p.id)+'" style="display:flex;align-items:center;gap:6px;padding:5px 6px;border-radius:5px;margin-bottom:3px;background:rgba(255,255,255,.04)">',
              '<div style="flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+escapeHtml(p.name)+' <span style="opacity:.5;font-size:11px">'+escapeHtml(when)+'</span></div>',
              '<button data-cp-load="'+escapeHtml(p.id)+'" type="button" title="Load on map" style="background:transparent;border:1px solid #334;color:#dde4f0;cursor:pointer;padding:2px 6px;border-radius:4px;font-size:11px">Load</button>',
              '<button data-cp-del="'+escapeHtml(p.id)+'" type="button" title="Delete" style="background:transparent;border:none;color:#f87171;cursor:pointer;padding:2px 4px;font-size:13px">×</button>',
            '</div>'
          );
        });
        html.push('</div>');
      } else if (!msg) {
        html.push('<div style="opacity:.5;margin:8px 0;font-size:11px">No saved projects yet.</div>');
      }
      html.push(
        '<div style="display:flex;gap:6px">',
          '<input id="mn2-cp-name" placeholder="Project name…" style="flex:1;background:#0e1420;border:1px solid #1a2d40;color:#dde4f0;padding:5px 8px;border-radius:4px;font-size:12px" />',
          '<button id="mn2-cp-save" type="button" style="background:#1d4ed8;border:none;color:#fff;cursor:pointer;padding:5px 12px;border-radius:4px;font-size:12px;font-weight:500">Save</button>',
        '</div>',
        '<div id="mn2-cp-status" style="margin-top:6px;font-size:11px;opacity:.6;min-height:14px"></div>'
      );
      panel.innerHTML = html.join('');

      var refreshBtn = document.getElementById('mn2-cp-refresh');
      if (refreshBtn) refreshBtn.onclick = refresh;
      var saveBtn = document.getElementById('mn2-cp-save');
      var nameInput = document.getElementById('mn2-cp-name');
      if (saveBtn && nameInput) saveBtn.onclick = function(){ saveCurrent(nameInput.value || ('Project ' + new Date().toLocaleString())); };

      panel.querySelectorAll('[data-cp-load]').forEach(function(b){
        b.onclick = function(){ loadProject(b.getAttribute('data-cp-load')); };
      });
      panel.querySelectorAll('[data-cp-del]').forEach(function(b){
        b.onclick = function(){ deleteProject(b.getAttribute('data-cp-del')); };
      });
    }

    function status(msg, isErr) {
      var s = document.getElementById('mn2-cp-status');
      if (s) { s.textContent = msg || ''; s.style.color = isErr ? '#f87171' : '#94a3b8'; }
    }

    function refresh() {
      render(null, 'Loading…');
      MNCloudProjects.fetch().then(function(projects){ render(projects); }).catch(function(err){
        render(null, 'Error: ' + err.message);
      });
    }

    function saveCurrent(name) {
      status('Saving…');
      MNCloudProjects.snapshot(name).then(function(p){
        status('Saved: ' + p.name);
        setTimeout(refresh, 200);
      }).catch(function(err){
        status('Save failed: ' + err.message, true);
      });
    }

    function loadProject(id) {
      status('Loading project…');
      MNCloudProjects.load(id).then(function(n){
        status('Restored ' + n + ' feature' + (n === 1 ? '' : 's'));
      }).catch(function(err){
        status('Load failed: ' + err.message, true);
      });
    }

    function deleteProject(id) {
      if (!confirm('Delete this saved project?')) return;
      status('Deleting…');
      MNCloudProjects.delete(id).then(function(){
        status('Deleted');
        setTimeout(refresh, 200);
      }).catch(function(err){
        status('Delete failed: ' + err.message, true);
      });
    }

    // Toggle button next to user widget
    var toggleBtn = document.createElement('button');
    toggleBtn.id = 'mn2-cp-toggle';
    toggleBtn.type = 'button';
    toggleBtn.title = 'Saved projects';
    toggleBtn.textContent = '☁';
    toggleBtn.style.cssText = 'position:fixed;top:14px;right:64px;z-index:9999;width:32px;height:32px;border-radius:50%;border:1px solid #1a2d40;background:rgba(14,20,32,0.92);color:#dde4f0;cursor:pointer;font-size:14px;backdrop-filter:blur(6px);display:none';
    document.body.appendChild(toggleBtn);
    toggleBtn.onclick = function(){
      if (panel.style.display === 'none') {
        panel.style.display = 'block';
        refresh();
      } else {
        panel.style.display = 'none';
      }
    };

    // Show/hide based on auth state
    function updateVisibility() {
      var signedIn = window.MNClerk && window.MNClerk.isSignedIn && window.MNClerk.isSignedIn();
      toggleBtn.style.display = signedIn ? 'inline-block' : 'none';
      if (!signedIn) panel.style.display = 'none';
    }

    if (window.MNClerk && window.MNClerk.onAuthChange) {
      window.MNClerk.onAuthChange(updateVisibility);
    }
    if (authReady()) {
      window.MNClerk.ready.then(updateVisibility);
    }
    setInterval(updateVisibility, 2000); // belt-and-suspenders for missed auth events
  }

  // Boot when DOM + dependencies are ready.
  function boot() {
    var tries = 0;
    var t = setInterval(function(){
      tries++;
      if (window.mnAuthFetch && window.MNClerk) {
        clearInterval(t);
        mountPanel();
        console.log('[MNCloudProjects] mounted');
      } else if (tries > 200) {
        clearInterval(t);
        console.warn('[MNCloudProjects] dependencies not ready (mnAuthFetch + MNClerk); panel disabled');
      }
    }, 200);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }
})();
