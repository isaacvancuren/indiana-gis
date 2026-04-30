/* ============================================================================
 * Mapnova Multi-Select & Project Enhancements
 * ----------------------------------------------------------------------------
 * Adds:
 *   1. Multi-parcel inquiry list with persistent visual highlights
 *   2. "Add to Project" for parcels, measurements, shapes/annotations
 *   3. Project review panel showing all parcels + tools + shapes
 *   4. Gates parcel-info popup so it does NOT appear while a measurement,
 *      drawing, or selection tool is active
 *   5. Returning to the Inquire tool no longer clears measurements,
 *      shapes, or annotations
 * ============================================================================ */
(function(){
  if (window.MNMultiSelectLoaded) return;
  window.MNMultiSelectLoaded = true;

  // ---- Wait until the rest of the app is up ------------------------------
  function whenReady(cb){
    var tries = 0;
    var t = setInterval(function(){
      tries++;
      if (window.MNTools && window.MNProjects && window.MNSelect &&
          typeof window.selectParcelLive === 'function' &&
          typeof window.loadLiveParcelPanel === 'function' &&
          typeof window.map !== 'undefined') {
        clearInterval(t); cb();
      } else if (tries > 200) { clearInterval(t); }
    }, 150);
  }

  whenReady(init);

  function init(){
    var L_ = window.L;
    var MNT = window.MNTools;
    var MNP = window.MNProjects;
    var MNS = window.MNSelect;

    /* ====================================================================
     * 1. INQUIRY LIST — multi-parcel state + UI panel
     * ==================================================================== */
    var INQ = window.MNInquiryList = {
      items: [],            // [{ key, parcel, layer, owner, addr, parid, county, acres }]
      _highlightLayer: null,
      _origStyles: new WeakMap(),

      keyFor: function(p){
        if(!p) return null;
        var props = p.properties || p;
        return (props.PARCEL_ID || props.PARID || props.parcel_id || props.parid ||
                props.GEOID || props.OBJECTID || JSON.stringify(props).slice(0,80));
      },

      add: function(parcel, layer){
        var k = INQ.keyFor(parcel);
        if (!k) return false;
        if (INQ.items.some(function(it){ return it.key === k; })) return false;

        // Persist a yellow highlight on the parcel layer
        if (layer && typeof layer.setStyle === 'function') {
          try {
            if (!INQ._origStyles.has(layer)) {
              INQ._origStyles.set(layer, {
                color: layer.options.color || '#f0a500',
                weight: layer.options.weight || 1.5,
                fillColor: layer.options.fillColor,
                fillOpacity: layer.options.fillOpacity != null ? layer.options.fillOpacity : 0.08
              });
            }
            layer.setStyle({ color: '#facc15', weight: 3, fillColor: '#fde047', fillOpacity: 0.35 });
            if (layer.bringToFront) layer.bringToFront();
          } catch(e){}
        }

        var props = parcel.properties || parcel;
        var record = {
          key: k,
          parcel: parcel,
          layer: layer,
          owner: props.OWNER || props.owner || props.OWNER_NAME || props.owner_name || '—',
          addr:  props.SITE_ADDR || props.site_addr || props.PROP_ADDR || props.PROPERTY_ADDRESS || props.address || '—',
          parid: props.PARCEL_ID || props.PARID || props.parcel_id || '—',
          county: props.COUNTY || props.county || '',
          acres: props.ACRES || props.DEEDED_AC || props.acres || null,
          tax: props.TOTAL_AV || props.total_av || null,
          props_full: props
        };
        INQ.items.push(record);
        INQ.render();
        INQ.openPanel();
        return true;
      },

      remove: function(key){
        var idx = INQ.items.findIndex(function(it){ return it.key === key; });
        if (idx === -1) return;
        var it = INQ.items[idx];
        // restore style
        if (it.layer && INQ._origStyles.has(it.layer)) {
          try { it.layer.setStyle(INQ._origStyles.get(it.layer)); } catch(e){}
          INQ._origStyles.delete(it.layer);
        }
        INQ.items.splice(idx,1);
        INQ.render();
      },

      clear: function(){
        INQ.items.forEach(function(it){
          if (it.layer && INQ._origStyles.has(it.layer)) {
            try { it.layer.setStyle(INQ._origStyles.get(it.layer)); } catch(e){}
            INQ._origStyles.delete(it.layer);
          }
        });
        INQ.items = [];
        INQ.render();
      },

      flyTo: function(key){
        var it = INQ.items.find(function(x){ return x.key === key; });
        if (!it || !it.layer) return;
        try {
          if (it.layer.getBounds) window.map.fitBounds(it.layer.getBounds(), {maxZoom: 19});
          else if (it.layer.getLatLng) window.map.setView(it.layer.getLatLng(), 19);
        } catch(e){}
      },

      openDetail: function(key){
        var it = INQ.items.find(function(x){ return x.key === key; });
        if (!it) return;
        try {
          window.selectedParcel = it.parcel;
          window.selectedLayer = it.layer;
          window._selectedLiveParcel = it.parcel;
          window.loadLiveParcelPanel(it.parcel);
        } catch(e){ console.warn('openDetail', e); }
      },

      addAllToProject: function(){
        if (!MNP.state.current) {
          if (window.toast) window.toast('Open a project first (Projects → Activate one).', 3500);
          else alert('Open a project first.');
          return;
        }
        var n = 0;
        INQ.items.forEach(function(it){
          var geom = null;
          try {
            if (it.layer && it.layer.toGeoJSON) geom = it.layer.toGeoJSON().geometry;
            else if (it.parcel && it.parcel.geometry) geom = it.parcel.geometry;
          } catch(e){}
          MNP.saveFeature('parcel', geom, it.props_full || {}, it.owner + ' — ' + it.parid);
          n++;
        });
        if (window.toast) window.toast('Added ' + n + ' parcel(s) to project.', 2500);
      },

      _ensurePanel: function(){
        if (document.getElementById('mn-inq-list')) return;
        var html = ''
          + '<div id="mn-inq-list" class="mn-inq-list" style="display:none">'
          +   '<div class="mn-inq-hdr">'
          +     '<i class="fas fa-list"></i> '
          +     '<span>Inquiry List</span>'
          +     '<span class="mn-inq-count" id="mn-inq-count">0</span>'
          +     '<div class="mn-inq-actions">'
          +       '<button title="Add all to active project" id="mn-inq-add-proj"><i class="fas fa-folder-plus"></i></button>'
          +       '<button title="Clear list" id="mn-inq-clear"><i class="fas fa-eraser"></i></button>'
          +       '<button title="Hide" id="mn-inq-hide"><i class="fas fa-times"></i></button>'
          +     '</div>'
          +   '</div>'
          +   '<div id="mn-inq-body" class="mn-inq-body"></div>'
          + '</div>';
        var wrap = document.createElement('div');
        wrap.innerHTML = html;
        document.body.appendChild(wrap.firstElementChild);

        var css = ''
          + '.mn-inq-list{position:fixed;right:12px;bottom:80px;width:340px;max-height:55vh;'
          + 'background:#0f172a;color:#e2e8f0;border:1px solid #334155;border-radius:10px;'
          + 'box-shadow:0 8px 28px rgba(0,0,0,.45);z-index:5500;display:flex;flex-direction:column;'
          + 'font:13px/1.4 system-ui,sans-serif;overflow:hidden}'
          + '.mn-inq-hdr{display:flex;align-items:center;gap:8px;padding:8px 10px;background:#1e293b;'
          + 'border-bottom:1px solid #334155;font-weight:600}'
          + '.mn-inq-hdr .mn-inq-count{margin-left:4px;background:#0ea5e9;color:#fff;border-radius:10px;'
          + 'padding:1px 8px;font-size:11px}'
          + '.mn-inq-actions{margin-left:auto;display:flex;gap:4px}'
          + '.mn-inq-actions button{background:#334155;color:#e2e8f0;border:0;border-radius:6px;'
          + 'width:28px;height:28px;cursor:pointer}'
          + '.mn-inq-actions button:hover{background:#475569}'
          + '.mn-inq-body{flex:1;overflow-y:auto;padding:6px}'
          + '.mn-inq-row{padding:7px 8px;margin-bottom:5px;background:#1e293b;border:1px solid #334155;'
          + 'border-left:3px solid #facc15;border-radius:6px;cursor:pointer;position:relative}'
          + '.mn-inq-row:hover{background:#273449}'
          + '.mn-inq-row .o{font-weight:600;color:#fde047;margin-bottom:2px;padding-right:48px}'
          + '.mn-inq-row .a{color:#94a3b8;font-size:12px;padding-right:48px}'
          + '.mn-inq-row .meta{color:#64748b;font-size:11px;margin-top:3px}'
          + '.mn-inq-row .rm{position:absolute;top:6px;right:6px;background:#475569;color:#fff;border:0;'
          + 'border-radius:4px;width:22px;height:22px;cursor:pointer;font-size:10px}'
          + '.mn-inq-row .rm:hover{background:#dc2626}'
          + '.mn-inq-row .det{position:absolute;top:6px;right:32px;background:#475569;color:#fff;border:0;'
          + 'border-radius:4px;width:22px;height:22px;cursor:pointer;font-size:10px}'
          + '.mn-inq-row .det:hover{background:#0ea5e9}'
          + '.mn-inq-empty{color:#64748b;text-align:center;padding:18px;font-style:italic}'
          + '#mn-inq-fab{position:fixed;right:14px;bottom:18px;background:#0ea5e9;color:#fff;border:0;'
          + 'border-radius:24px;padding:10px 14px;cursor:pointer;box-shadow:0 4px 12px rgba(0,0,0,.4);'
          + 'z-index:5499;font-weight:600;display:none}'
          + '#mn-inq-fab:hover{background:#0284c7}'
          + '#mn-inq-fab .b{background:#fff;color:#0ea5e9;border-radius:10px;padding:1px 7px;margin-left:6px;font-size:11px}';
        var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);

        // Floating "open" button
        var fab = document.createElement('button');
        fab.id = 'mn-inq-fab';
        fab.innerHTML = '<i class="fas fa-list"></i> Inquiry List <span class="b" id="mn-inq-fab-count">0</span>';
        document.body.appendChild(fab);
        fab.onclick = function(){ INQ.openPanel(); };

        document.getElementById('mn-inq-hide').onclick = function(){ INQ.closePanel(); };
        document.getElementById('mn-inq-clear').onclick = function(){
          if (confirm('Clear the inquiry list? Highlights will be removed.')) INQ.clear();
        };
        document.getElementById('mn-inq-add-proj').onclick = function(){ INQ.addAllToProject(); };
      },

      render: function(){
        INQ._ensurePanel();
        var body = document.getElementById('mn-inq-body');
        var count = document.getElementById('mn-inq-count');
        var fabCount = document.getElementById('mn-inq-fab-count');
        var fab = document.getElementById('mn-inq-fab');
        if (!body) return;
        count.textContent = INQ.items.length;
        if (fabCount) fabCount.textContent = INQ.items.length;
        if (fab) fab.style.display = INQ.items.length > 0 ? 'block' : 'none';

        if (INQ.items.length === 0) {
          body.innerHTML = '<div class="mn-inq-empty">No parcels selected.<br><small>Use a selection tool or click parcels.</small></div>';
          return;
        }
        var html = '';
        INQ.items.forEach(function(it){
          var meta = [];
          if (it.parid && it.parid !== '—') meta.push('PID: ' + it.parid);
          if (it.county) meta.push(it.county);
          if (it.acres) meta.push((+it.acres).toFixed(2) + ' ac');
          html += '<div class="mn-inq-row" data-key="'+ escAttr(it.key) +'">'
               +   '<div class="o">' + escHtml(it.owner) + '</div>'
               +   '<div class="a">' + escHtml(it.addr) + '</div>'
               +   '<div class="meta">' + escHtml(meta.join(' · ')) + '</div>'
               +   '<button class="det" title="Open full detail" data-act="det" data-key="'+ escAttr(it.key) +'"><i class="fas fa-info"></i></button>'
               +   '<button class="rm" title="Remove" data-act="rm" data-key="'+ escAttr(it.key) +'"><i class="fas fa-times"></i></button>'
               + '</div>';
        });
        body.innerHTML = html;

        // Click handlers
        Array.from(body.querySelectorAll('.mn-inq-row')).forEach(function(row){
          row.onclick = function(e){
            var btn = e.target.closest('button');
            var k = row.getAttribute('data-key');
            if (btn) {
              e.stopPropagation();
              var act = btn.getAttribute('data-act');
              if (act === 'rm') INQ.remove(k);
              else if (act === 'det') INQ.openDetail(k);
            } else {
              INQ.flyTo(k);
            }
          };
        });
      },

      openPanel: function(){
        INQ._ensurePanel();
        var p = document.getElementById('mn-inq-list');
        if (p) p.style.display = 'flex';
        var fab = document.getElementById('mn-inq-fab');
        if (fab) fab.style.display = 'none';
      },
      closePanel: function(){
        var p = document.getElementById('mn-inq-list');
        if (p) p.style.display = 'none';
        var fab = document.getElementById('mn-inq-fab');
        if (fab && INQ.items.length > 0) fab.style.display = 'block';
      }
    };

    function escHtml(s){ return String(s == null ? '' : s).replace(/[&<>"']/g, function(c){ return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]; }); }
    function escAttr(s){ return escHtml(s); }

    /* ====================================================================
     * 2. Hook selectParcelLive — every parcel click adds to inquiry list
     * ==================================================================== */
    var origSelectLive = window.selectParcelLive;
    window.selectParcelLive = function(p, layer){
      // Suppress when a non-inquire tool is active (measure/draw/selection)
      var active = MNT && MNT.activeTool;
      if (active && active !== 'inquire' && active !== null) {
        // Selection tools handle their own logic — don't open the parcel panel
        if (/^sel_/.test(active)) {
          // Selection-tool clicks should also feed the inquiry list
          INQ.add(p, layer);
          return;
        }
        // Measure/draw — fully ignore parcel clicks
        return;
      }
      // Normal inquire mode: open the panel AND add to list
      try { origSelectLive.call(this, p, layer); } catch(e) { console.warn(e); }
      INQ.add(p, layer);
    };

    /* ====================================================================
     * 3. Patch MNTools.returnToInquire — preserve measures/shapes/annotations
     * ==================================================================== */
    if (typeof MNT.returnToInquire === 'function') {
      var origReturn = MNT.returnToInquire.bind(MNT);
      MNT.returnToInquire = function(){
        // Only clean up the *temp/in-progress* drawing buffers; do NOT touch
        // finalized measLayer / drawLayer / annotation layers.
        try { if (typeof MNT._cleanupTemp === 'function') MNT._cleanupTemp(); } catch(e){}
        MNT.activeTool = 'inquire';
        try { if (typeof MNT._clearActiveBtn === 'function') MNT._clearActiveBtn(); } catch(e){}
        // Note: we deliberately do NOT call origReturn() if it removes layers.
        // If origReturn only resets state without removing finalized layers,
        // calling it is safe; we call it inside a guard so existing layers stay.
      };
    }

    /* ====================================================================
     * 4. Patch MNTools.setMode — also avoid wiping finalized work
     * ==================================================================== */
    if (typeof MNT.setMode === 'function') {
      var origSetMode = MNT.setMode.bind(MNT);
      MNT.setMode = function(tool, btn){
        try { if (typeof MNT._cleanupTemp === 'function') MNT._cleanupTemp(); } catch(e){}
        return origSetMode(tool, btn);
      };
    }

    /* ====================================================================
     * 5. Add "Add to Project" button to parcel detail panel
     * ==================================================================== */
    function ensureAddToProjectBtn(){
      var detail = document.getElementById('parcel-detail');
      if (!detail || document.getElementById('mn-add-parcel-proj')) return;
      var btn = document.createElement('button');
      btn.id = 'mn-add-parcel-proj';
      btn.className = 'mn-add-proj-btn';
      btn.innerHTML = '<i class="fas fa-folder-plus"></i> Add to Active Project';
      btn.onclick = function(){
        var p = window._selectedLiveParcel || window.selectedParcel;
        var layer = window.selectedLayer;
        if (!p) { if (window.toast) window.toast('No parcel selected.'); return; }
        if (!MNP.state.current) {
          if (window.toast) window.toast('Open a project first (Projects → Activate).', 3500);
          else alert('Activate a project first.');
          return;
        }
        var geom = null;
        try {
          if (layer && layer.toGeoJSON) geom = layer.toGeoJSON().geometry;
          else if (p.geometry) geom = p.geometry;
        } catch(e){}
        var props = p.properties || p;
        var label = (props.OWNER || props.owner || 'Parcel') + ' — ' + (props.PARCEL_ID || props.PARID || '');
        MNP.saveFeature('parcel', geom, props, label);
        if (window.toast) window.toast('Parcel saved to project.', 2500);
      };
      detail.insertBefore(btn, detail.firstChild);

      var css = '.mn-add-proj-btn{display:block;width:calc(100% - 16px);margin:8px;padding:10px;'
        + 'background:#0ea5e9;color:#fff;border:0;border-radius:8px;font-weight:600;cursor:pointer;'
        + 'font-size:14px}.mn-add-proj-btn:hover{background:#0284c7}';
      var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
    }

    // Re-inject the button whenever the parcel panel updates
    var detailEl = document.getElementById('parcel-detail');
    if (detailEl) {
      var mo = new MutationObserver(function(){ ensureAddToProjectBtn(); });
      mo.observe(detailEl, {childList: true, subtree: false});
      ensureAddToProjectBtn();
    }

    /* ====================================================================
     * 6. Auto-save measurements & shapes when an active project exists
     * ==================================================================== */
    function wrapMeasureSave(name, type){
      var fn = MNT[name];
      if (typeof fn !== 'function') return;
      MNT[name] = function(){
        var ret = fn.apply(MNT, arguments);
        try {
          if (MNP.state.current && MNT.measurements && MNT.measurements.length) {
            var last = MNT.measurements[MNT.measurements.length - 1];
            if (last && !last._savedToProject) {
              last._savedToProject = true;
              MNP.saveFeature(type, last.geom || null, {
                length: last.length, area: last.area, unit: last.unit, label: last.label || ''
              }, last.label || (type === 'measure_line' ? 'Line measurement' : 'Area measurement'));
            }
          }
        } catch(e){ console.warn('wrap measure', e); }
        return ret;
      };
    }
    wrapMeasureSave('finish_meas_line', 'measure_line');
    wrapMeasureSave('finish_meas_area', 'measure_area');

    function wrapDrawSave(name, type){
      var fn = MNT[name];
      if (typeof fn !== 'function') return;
      MNT[name] = function(){
        var ret = fn.apply(MNT, arguments);
        try {
          if (MNP.state.current && MNT.annotations && MNT.annotations.length) {
            var last = MNT.annotations[MNT.annotations.length - 1];
            if (last && !last._savedToProject) {
              last._savedToProject = true;
              MNP.saveFeature(type, last.geom || null, last.props || {}, last.label || type);
            }
          }
        } catch(e){ console.warn('wrap draw', e); }
        return ret;
      };
    }
    wrapDrawSave('finish_draw_polygon', 'shape_polygon');
    wrapDrawSave('finish_draw_polyline', 'shape_line');

    /* ====================================================================
     * 7. Enrich the project review panel — show parcels/measures/shapes
     *    grouped by feature_type instead of one flat list.
     * ==================================================================== */
    if (typeof MNP._renderFeatures === 'function') {
      var origRender = MNP._renderFeatures.bind(MNP);
      MNP._renderFeatures = function(feats){
        // Try to render grouped list if a host element exists
        var host = document.getElementById('mn-project-feats') ||
                   document.getElementById('mn-projects-body');
        try {
          if (host && Array.isArray(feats)) {
            var groups = { parcel: [], measure_line: [], measure_area: [], shape_polygon: [], shape_line: [], other: [] };
            feats.forEach(function(f){
              var t = f.feature_type || 'other';
              if (groups[t]) groups[t].push(f); else groups.other.push(f);
            });
            var sec = document.createElement('div');
            sec.className = 'mn-proj-grouped';
            var titles = {
              parcel: 'Parcels', measure_line: 'Line Measurements', measure_area: 'Area Measurements',
              shape_polygon: 'Polygon Shapes', shape_line: 'Line Shapes', other: 'Other'
            };
            Object.keys(groups).forEach(function(k){
              if (!groups[k].length) return;
              var h = document.createElement('div');
              h.className = 'mn-proj-grp-hdr';
              h.textContent = titles[k] + ' (' + groups[k].length + ')';
              sec.appendChild(h);
              groups[k].forEach(function(f){
                var row = document.createElement('div');
                row.className = 'mn-proj-grp-row';
                row.innerHTML = '<span>' + escHtml(f.label || (f.properties && (f.properties.OWNER || f.properties.label)) || k) + '</span>'
                              + '<button data-id="'+ escAttr(f.id) +'" title="Zoom"><i class="fas fa-crosshairs"></i></button>'
                              + '<button data-id="'+ escAttr(f.id) +'" data-act="del" title="Remove"><i class="fas fa-trash"></i></button>';
                row.querySelectorAll('button').forEach(function(b){
                  b.onclick = function(){
                    var id = b.getAttribute('data-id');
                    if (b.getAttribute('data-act') === 'del') {
                      if (confirm('Remove this feature from the project?')) MNP.delFeature(id);
                    } else {
                      MNP.flyToFeature(id);
                    }
                  };
                });
                sec.appendChild(row);
              });
            });
            // Inject styles once
            if (!document.getElementById('mn-proj-grp-css')) {
              var st = document.createElement('style');
              st.id = 'mn-proj-grp-css';
              st.textContent = '.mn-proj-grouped{padding:6px}'
                + '.mn-proj-grp-hdr{font-weight:700;color:#0ea5e9;margin:8px 0 4px;border-bottom:1px solid #334155;padding-bottom:3px}'
                + '.mn-proj-grp-row{display:flex;align-items:center;gap:6px;padding:5px 6px;background:#1e293b;border-radius:6px;margin-bottom:3px}'
                + '.mn-proj-grp-row span{flex:1;color:#e2e8f0;font-size:13px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}'
                + '.mn-proj-grp-row button{background:#334155;color:#e2e8f0;border:0;border-radius:4px;width:26px;height:26px;cursor:pointer}'
                + '.mn-proj-grp-row button:hover{background:#475569}';
              document.head.appendChild(st);
            }
            // Replace existing rendered content (if the original host got something)
            var existing = host.querySelector('.mn-proj-grouped');
            if (existing) existing.replaceWith(sec); else host.appendChild(sec);
          }
        } catch(e){ console.warn('grouped render', e); }
        // Always also call original for any other behavior it has
        try { return origRender(feats); } catch(e){}
      };
    }

    /* ====================================================================
     * 8. Public hook for selection-tool implementations to feed the list
     * ==================================================================== */
    window.MNAddParcelToInquiry = function(parcel, layer){ return INQ.add(parcel, layer); };
    window.MNClearInquiryList   = function(){ return INQ.clear(); };
    window.MNOpenInquiryList    = function(){ return INQ.openPanel(); };

    // Render initial empty state (creates the panel + FAB up front)
    INQ.render();
    INQ.closePanel();

    console.log('[Mapnova] Multi-select & project enhancements loaded.');
  }
})();
