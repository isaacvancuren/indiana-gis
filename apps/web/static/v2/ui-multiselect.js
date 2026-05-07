/* ============================================================================
 * Mapnova Multi-Select & Project Enhancements (v2)
 * ----------------------------------------------------------------------------
 * Adds:
 *   1. Multi-parcel inquiry list with persistent visual highlights
 *   2. "Add to Project" for parcels, measurements, shapes/annotations
 *   3. Project review panel grouped by feature type
 *   4. Suppresses parcel-info popup while ANY non-inquire tool is active
 *      (checks both legacy global "activeTool" AND MNTools.activeTool)
 *   5. Returning to Inquire no longer wipes finalized measurements/shapes
 *   6. Multi-select via MNSelect.toggle/add now feeds the inquiry list
 * ============================================================================ */
(function(){
  if (window.MNMultiSelectLoaded === 'v2') {
    console.log('[Mapnova MS] v2 already loaded — skipping re-init');
    return;
  }
  window.MNMultiSelectLoaded = 'v2';

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
    var MNT = window.MNTools;
    var MNP = window.MNProjects;
    var MNS = window.MNSelect;

    var INQ = window.MNInquiryList = {
      items: [],
      _origStyles: new WeakMap(),

      keyFor: function(p){
        if(!p) return null;
        var props = (p && p.properties) || p || {};
        return (props.PARCEL_ID || props.PARID || props.parcel_id || props.parid ||
                props.PARCELID || props.GEOID || props.OBJECTID || JSON.stringify(props).slice(0,80));
      },

      add: function(parcelOrLayer, maybeLayer){
        var parcel, layer;
        if (parcelOrLayer && parcelOrLayer.feature && parcelOrLayer._leaflet_id) {
          layer = parcelOrLayer; parcel = parcelOrLayer.feature;
        } else { parcel = parcelOrLayer; layer = maybeLayer || null; }
        if (!parcel) return false;
        var k = INQ.keyFor(parcel);
        if (!k) return false;
        if (INQ.items.some(function(it){ return it.key === k; })) return false;

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
        INQ.items.push({
          key: k, parcel: parcel, layer: layer,
          owner: props.OWNER || props.owner || props.OWNER_NAME || props.owner_name || '—',
          addr:  props.SITE_ADDR || props.site_addr || props.PROP_ADDR || props.PROPERTY_ADDRESS || props.address || '—',
          parid: props.PARCEL_ID || props.PARID || props.parcel_id || props.PARCELID || '—',
          county: props.COUNTY || props.county || '',
          acres: props.ACRES || props.DEEDED_AC || props.acres || null,
          props_full: props
        });
        INQ.render(); INQ.openPanel();
        return true;
      },

      remove: function(key){
        var idx = INQ.items.findIndex(function(it){ return it.key === key; });
        if (idx === -1) return;
        var it = INQ.items[idx];
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
        INQ.items = []; INQ.render();
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
          if (typeof window.loadLiveParcelPanel === 'function') window.loadLiveParcelPanel(it.parcel);
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
        if (document.getElementById('mn2-inq-list')) return;
        var html = '<div id="mn2-inq-list" class="mn2-inq-list" style="display:none">'
          +   '<div class="mn2-inq-hdr">'
          +     '<i class="fas fa-list"></i> '
          +     '<span>Inquiry List</span>'
          +     '<span class="mn2-inq-count" id="mn2-inq-count">0</span>'
          +     '<div class="mn2-inq-actions">'
          +       '<button title="Add all to active project" id="mn2-inq-add-proj"><i class="fas fa-folder-plus"></i></button>'
          +       '<button title="Clear list" id="mn2-inq-clear"><i class="fas fa-eraser"></i></button>'
          +       '<button title="Hide" id="mn2-inq-hide"><i class="fas fa-times"></i></button>'
          +     '</div>'
          +   '</div>'
          +   '<div id="mn2-inq-body" class="mn2-inq-body"></div>'
          + '</div>';
        var wrap = document.createElement('div');
        wrap.innerHTML = html;
        document.body.appendChild(wrap.firstElementChild);

        var css = '.mn2-inq-list{position:fixed;right:12px;bottom:80px;width:340px;max-height:55vh;'
          + 'background:#0f172a;color:#e2e8f0;border:1px solid #334155;border-radius:10px;'
          + 'box-shadow:0 8px 28px rgba(0,0,0,.45);z-index:5500;display:flex;flex-direction:column;'
          + 'font:13px/1.4 system-ui,sans-serif;overflow:hidden}'
          + '.mn2-inq-hdr{display:flex;align-items:center;gap:8px;padding:8px 10px;background:#1e293b;'
          + 'border-bottom:1px solid #334155;font-weight:600}'
          + '.mn2-inq-hdr .mn2-inq-count{margin-left:4px;background:#0ea5e9;color:#fff;border-radius:10px;'
          + 'padding:1px 8px;font-size:11px}'
          + '.mn2-inq-actions{margin-left:auto;display:flex;gap:4px}'
          + '.mn2-inq-actions button{background:#334155;color:#e2e8f0;border:0;border-radius:6px;'
          + 'width:28px;height:28px;cursor:pointer}'
          + '.mn2-inq-actions button:hover{background:#475569}'
          + '.mn2-inq-body{flex:1;overflow-y:auto;padding:6px}'
          + '.mn2-inq-row{padding:7px 8px;margin-bottom:5px;background:#1e293b;border:1px solid #334155;'
          + 'border-left:3px solid #facc15;border-radius:6px;cursor:pointer;position:relative}'
          + '.mn2-inq-row:hover{background:#273449}'
          + '.mn2-inq-row .o{font-weight:600;color:#fde047;margin-bottom:2px;padding-right:60px}'
          + '.mn2-inq-row .a{color:#94a3b8;font-size:12px;padding-right:60px}'
          + '.mn2-inq-row .meta{color:#64748b;font-size:11px;margin-top:3px}'
          + '.mn2-inq-row .rm{position:absolute;top:6px;right:6px;background:#475569;color:#fff;border:0;'
          + 'border-radius:4px;width:24px;height:24px;cursor:pointer;font-size:11px}'
          + '.mn2-inq-row .rm:hover{background:#dc2626}'
          + '.mn2-inq-row .det{position:absolute;top:6px;right:34px;background:#475569;color:#fff;border:0;'
          + 'border-radius:4px;width:24px;height:24px;cursor:pointer;font-size:11px}'
          + '.mn2-inq-row .det:hover{background:#0ea5e9}'
          + '.mn2-inq-empty{color:#64748b;text-align:center;padding:18px;font-style:italic}'
          + '#mn2-inq-fab{position:fixed;right:14px;bottom:18px;background:#0ea5e9;color:#fff;border:0;'
          + 'border-radius:24px;padding:10px 14px;cursor:pointer;box-shadow:0 4px 12px rgba(0,0,0,.4);'
          + 'z-index:5499;font-weight:600;display:none}'
          + '#mn2-inq-fab:hover{background:#0284c7}'
          + '#mn2-inq-fab .b{background:#fff;color:#0ea5e9;border-radius:10px;padding:1px 7px;margin-left:6px;font-size:11px}';
        var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);

        var fab = document.createElement('button');
        fab.id = 'mn2-inq-fab';
        fab.innerHTML = '<i class="fas fa-list"></i> Inquiry List <span class="b" id="mn2-inq-fab-count">0</span>';
        document.body.appendChild(fab);
        fab.onclick = function(){ INQ.openPanel(); };

        document.getElementById('mn2-inq-hide').onclick = function(){ INQ.closePanel(); };
        document.getElementById('mn2-inq-clear').onclick = function(){
          if (confirm('Clear the inquiry list? Highlights will be removed.')) INQ.clear();
        };
        document.getElementById('mn2-inq-add-proj').onclick = function(){ INQ.addAllToProject(); };
      },

      render: function(){
        INQ._ensurePanel();
        var body = document.getElementById('mn2-inq-body');
        var count = document.getElementById('mn2-inq-count');
        var fabCount = document.getElementById('mn2-inq-fab-count');
        var fab = document.getElementById('mn2-inq-fab');
        var panel = document.getElementById('mn2-inq-list');
        if (!body) return;
        count.textContent = INQ.items.length;
        if (fabCount) fabCount.textContent = INQ.items.length;
        if (fab) {
          if (INQ.items.length === 0) fab.style.display = 'none';
          else if (panel && panel.style.display === 'none') fab.style.display = 'block';
        }

        if (INQ.items.length === 0) {
          body.innerHTML = '<div class="mn2-inq-empty">No parcels selected.<br><small>Use a selection tool or click parcels.</small></div>';
          return;
        }
        var html = '';
        INQ.items.forEach(function(it){
          var meta = [];
          if (it.parid && it.parid !== '—') meta.push('PID: ' + it.parid);
          if (it.county) meta.push(it.county);
          if (it.acres) meta.push((+it.acres).toFixed(2) + ' ac');
          html += '<div class="mn2-inq-row" data-key="'+ escAttr(it.key) +'">'
               +   '<div class="o">' + escHtml(it.owner) + '</div>'
               +   '<div class="a">' + escHtml(it.addr) + '</div>'
               +   '<div class="meta">' + escHtml(meta.join(' · ')) + '</div>'
               +   '<button class="det" title="Open full detail" data-act="det" data-key="'+ escAttr(it.key) +'"><i class="fas fa-info"></i></button>'
               +   '<button class="rm" title="Remove" data-act="rm" data-key="'+ escAttr(it.key) +'"><i class="fas fa-times"></i></button>'
               + '</div>';
        });
        body.innerHTML = html;

        Array.from(body.querySelectorAll('.mn2-inq-row')).forEach(function(row){
          row.onclick = function(e){
            var btn = e.target.closest('button');
            var k = row.getAttribute('data-key');
            if (btn) {
              e.stopPropagation();
              var act = btn.getAttribute('data-act');
              if (act === 'rm') INQ.remove(k);
              else if (act === 'det') INQ.openDetail(k);
            } else { INQ.flyTo(k); }
          };
        });
      },

      openPanel: function(){
        INQ._ensurePanel();
        var p = document.getElementById('mn2-inq-list');
        if (p) p.style.display = 'flex';
        var fab = document.getElementById('mn2-inq-fab');
        if (fab) fab.style.display = 'none';
      },
      closePanel: function(){
        var p = document.getElementById('mn2-inq-list');
        if (p) p.style.display = 'none';
        var fab = document.getElementById('mn2-inq-fab');
        if (fab && INQ.items.length > 0) fab.style.display = 'block';
      }
    };

    function escHtml(s){ return String(s == null ? '' : s).replace(/[&<>"']/g, function(c){ return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]; }); }
    function escAttr(s){ return escHtml(s); }

    /* Tool gating */
    function isToolActive(){
      var legacy = null;
      try { legacy = window.activeTool; } catch(e){}
      var modern = MNT && MNT.activeTool;
      function bad(t){ return t && t !== 'inquire' && t !== 'inquire-tool'; }
      return bad(legacy) || bad(modern);
    }
    function activeToolName(){
      try { return window.activeTool || (MNT && MNT.activeTool) || null; } catch(e){ return MNT && MNT.activeTool; }
    }
    function isSelectTool(){
      var n = activeToolName() || '';
      return n === 'select' || n === 'select-rect' || n === 'select-poly' || /^sel[\-_]/.test(n) || /^sel_/.test(n);
    }

    /* selectParcelLive: bail when tool active; feed inquiry list ONLY when
       a select tool is the active one. Plain inquire-mode clicks must not
       add to the list. */
    var origSelectLive = window.selectParcelLive;
    window.selectParcelLive = function(p, layer){
      if (isToolActive()) {
        if (isSelectTool()) INQ.add(p, layer);
        return;
      }
      try { origSelectLive.call(this, p, layer); } catch(e) { console.warn(e); }
    };

    /* loadLiveParcelPanel: also gate (some other paths call it directly) */
    if (typeof window.loadLiveParcelPanel === 'function') {
      var origLoadPanel = window.loadLiveParcelPanel;
      window.loadLiveParcelPanel = function(p){
        if (isToolActive() && !isSelectTool()) return;
        return origLoadPanel.apply(this, arguments);
      };
    }

    /* MNSelect.add / toggle / clear: feed inquiry list */
    if (MNS && typeof MNS.add === 'function') {
      var origMSadd = MNS.add.bind(MNS);
      MNS.add = function(layer, props, latlng){
        var ret = origMSadd(layer, props, latlng);
        try {
          var parcel = (layer && layer.feature) ? layer.feature : { properties: props || {} };
          INQ.add(parcel, layer);
        } catch(e){ console.warn('MNSelect.add hook', e); }
        return ret;
      };
    }
    if (MNS && typeof MNS.toggle === 'function') {
      var origMStoggle = MNS.toggle.bind(MNS);
      MNS.toggle = function(layer, props, latlng){
        var keyForCheck = MNS.keyFor ? MNS.keyFor(props || (layer && layer.feature && layer.feature.properties), latlng) : null;
        var wasSelected = keyForCheck && MNS.selected && MNS.selected.has(keyForCheck);
        var ret = origMStoggle(layer, props, latlng);
        try {
          var parcel = (layer && layer.feature) ? layer.feature : { properties: props || {} };
          var iqKey = INQ.keyFor(parcel);
          if (wasSelected) { if (iqKey) INQ.remove(iqKey); }
          else INQ.add(parcel, layer);
        } catch(e){ console.warn('MNSelect.toggle hook', e); }
        return ret;
      };
    }
    if (MNS && typeof MNS.clear === 'function') {
      var origMSclear = MNS.clear.bind(MNS);
      MNS.clear = function(){
        var ret = origMSclear();
        try { INQ.clear(); } catch(e){}
        return ret;
      };
    }

    /* Preserve finalized work when returning to inquire / switching modes */
    if (typeof MNT.returnToInquire === 'function') {
      var origReturn = MNT.returnToInquire.bind(MNT);
      MNT.returnToInquire = function(){
        try { if (typeof MNT._cleanupTemp === 'function') MNT._cleanupTemp(); } catch(e){}
        try { window.activeTool = null; } catch(e){}
        try { MNT.activeTool = null; } catch(e){}
        try { if (typeof MNT._clearActiveBtn === 'function') MNT._clearActiveBtn(); } catch(e){}
      };
    }
    if (typeof MNT.setMode === 'function') {
      var origSetMode = MNT.setMode.bind(MNT);
      MNT.setMode = function(tool, btn){
        try { if (typeof MNT._cleanupTemp === 'function') MNT._cleanupTemp(); } catch(e){}
        return origSetMode(tool, btn);
      };
    }

    /* Add to Project button on parcel detail */
    function ensureAddToProjectBtn(){
      var detail = document.getElementById('parcel-detail');
      if (!detail || document.getElementById('mn2-add-parcel-proj')) return;
      var btn = document.createElement('button');
      btn.id = 'mn2-add-parcel-proj';
      btn.className = 'mn2-add-proj-btn';
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
      var css = '.mn2-add-proj-btn{display:block;width:calc(100% - 16px);margin:8px;padding:10px;'
        + 'background:#0ea5e9;color:#fff;border:0;border-radius:8px;font-weight:600;cursor:pointer;'
        + 'font-size:14px}.mn2-add-proj-btn:hover{background:#0284c7}';
      var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
    }
    var detailEl = document.getElementById('parcel-detail');
    if (detailEl) {
      var mo = new MutationObserver(function(){ ensureAddToProjectBtn(); });
      mo.observe(detailEl, {childList: true, subtree: false});
      ensureAddToProjectBtn();
    }

    /* Public hooks */
    window.MNAddParcelToInquiry = function(parcel, layer){ return INQ.add(parcel, layer); };
    window.MNClearInquiryList   = function(){ return INQ.clear(); };
    window.MNOpenInquiryList    = function(){ return INQ.openPanel(); };

    INQ.render(); INQ.closePanel();
    console.log('[Mapnova] Multi-select & project enhancements v2 loaded.');
  }
})();
