// assets/mn-bookmarks.js
// Extracted from index.html (bookmarks, history, Supabase client init).
// Self-contained IIFE.

(function(){
  let __mnLeafletMap = null;
  function getLeafletMap(){
    if(__mnLeafletMap) return __mnLeafletMap;
    if(window.L && window.L.Map){
      try {
        const origFire = L.Map.prototype.fire;
        let captured = null;
        L.Map.prototype.fire = function(){ captured = this; L.Map.prototype.fire = origFire; return origFire.apply(this, arguments); };
        const div = document.getElementById('map');
        if(div) div.dispatchEvent(new MouseEvent('mousemove', {bubbles: true, clientX: 500, clientY: 400}));
        if(captured){ __mnLeafletMap = captured; return captured; }
      } catch(e){}
    }
    if((getLeafletMap()||window.map) && typeof (getLeafletMap()||window.map).getCenter === 'function') return (getLeafletMap()||window.map);
    return null;
  }
  let __sbcInstance = null;
  let __sbcPromise = null;
  async function sbcInit(){
    if(__sbcInstance) return __sbcInstance;
    if(__sbcPromise) return __sbcPromise;
    __sbcPromise = (async () => {
      if(!window.supabase || !window.supabase.createClient) return null;
      const c = window.supabase.createClient('https://pcalrousicyuyiyoppqt.supabase.co', 'sb_publishable_mFKL1y755kJphEu231y8AA_KgV3W6xe', {
        auth: { storageKey: 'mn-ov-sbc-' + Math.random().toString(36).slice(2), persistSession: false, autoRefreshToken: false }
      });
      try {
        const raw = localStorage.getItem('sb-pcalrousicyuyiyoppqt-auth-token');
        if(raw){
          const s = JSON.parse(raw);
          if(s && s.access_token){
            await c.auth.setSession({ access_token: s.access_token, refresh_token: s.refresh_token });
          }
        }
      } catch(e){}
      __sbcInstance = c;
      return c;
    })();
    return __sbcPromise;
  }
  function sbc(){ return __sbcInstance; }
  function $(id){ return document.getElementById(id); }
  function esc(s){ return String(s||'').replace(/[&<>"]/g, c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c])); }
  function fmtDate(d){ try{ return new Date(d).toLocaleString(); }catch(e){return d;} }
  function toast(msg, ms){
    const el = $('mn-toast'); if(!el) return;
    el.textContent = msg;
    el.classList.add('open');
    clearTimeout(window.__mnToastT);
    window.__mnToastT = setTimeout(()=>el.classList.remove('open'), ms||2400);
  }
  function curUser(){ return window.MapNovaAuth && window.MapNovaAuth.user; }

  window.MNHistory = {
    open: async function(){
      await sbcInit();
      $('mn-history-back').classList.add('open');
      $('mn-history-body').innerHTML = '<div class="mn-empty">Loading&</div>';
      const u = curUser(); if(!u){ $('mn-history-body').innerHTML = '<div class="mn-empty">Please sign in to view history.</div>'; return; }
      try {
        const { data, error } = await sbc().from('user_history').select('*').eq('user_id', u.id).order('created_at',{ascending:false}).limit(100);
        if(error) throw error;
        if(!data || data.length === 0){ $('mn-history-body').innerHTML = '<div class="mn-empty">No activity yet. Start exploring counties and parcels  your history will appear here.</div>'; return; }
        const rows = data.map(h => {
          const icon = h.event_type==='login'?'fa-sign-in-alt':h.event_type==='view_county'?'fa-map':h.event_type==='view_parcel'?'fa-home':h.event_type==='session_start'?'fa-power-off':'fa-circle';
          const sub = (h.county? h.county+' " ':'') + fmtDate(h.created_at);
          return '<div class="mn-row"><div class="mn-row-icon"><i class="fas '+icon+'"></i></div><div class="mn-row-main"><div class="mn-row-title">'+esc(h.event_type||'event')+'</div><div class="mn-row-sub">'+esc(sub)+'</div></div></div>';
        }).join('');
        $('mn-history-body').innerHTML = '<div class="mn-list">'+rows+'</div>';
      } catch(e){
        $('mn-history-body').innerHTML = '<div class="mn-empty" style="color:#fca5a5;">Error loading history: '+esc(e.message||e)+'</div>';
      }
    },
    close: function(){ $('mn-history-back').classList.remove('open'); }
  };

  window.MNBookmarks = {
    open: async function(){
      await sbcInit();
      $('mn-bookmarks-back').classList.add('open');
      $('mn-bookmarks-body').innerHTML = '<div class="mn-empty">Loading&</div>';
      const u = curUser(); if(!u){ $('mn-bookmarks-body').innerHTML = '<div class="mn-empty">Please sign in to view bookmarks.</div>'; return; }
      try {
        const { data, error } = await sbc().from('bookmarks').select('*').eq('user_id', u.id).order('created_at',{ascending:false});
        if(error) throw error;
        if(!data || data.length === 0){ $('mn-bookmarks-body').innerHTML = '<div class="mn-empty">No bookmarks yet. Bookmark a parcel from the Parcel panel to save it.</div>'; return; }
        const rows = data.map(b => {
          const sub = [b.county, b.city, b.parcel_id].filter(Boolean).join(' " ');
          const hasGeo = (b.lat && b.lng);
          const goBtn = hasGeo ? '<button onclick="MNBookmarks.fly('+b.lat+','+b.lng+')"><i class="fas fa-location-arrow"></i> Go</button>' : '';
          return '<div class="mn-row"><div class="mn-row-icon"><i class="fas fa-bookmark"></i></div><div class="mn-row-main"><div class="mn-row-title">'+esc(b.label||'(no label)')+'</div><div class="mn-row-sub">'+esc(sub||fmtDate(b.created_at))+'</div></div><div class="mn-row-actions">'+goBtn+'<button onclick="MNBookmarks.del('+b.id+')"><i class="fas fa-trash"></i></button></div></div>';
        }).join('');
        $('mn-bookmarks-body').innerHTML = '<div class="mn-list">'+rows+'</div>';
      } catch(e){
        $('mn-bookmarks-body').innerHTML = '<div class="mn-empty" style="color:#fca5a5;">Error loading bookmarks: '+esc(e.message||e)+'</div>';
      }
    },
    close: function(){ $('mn-bookmarks-back').classList.remove('open'); },
    fly: function(lat,lng){
      try { if((getLeafletMap()||window.map)){ (getLeafletMap()||window.map).setView([lat,lng], 18); MNBookmarks.close(); toast('Flying to bookmark&'); } } catch(e){}
    },
    del: async function(id){
      await sbcInit();
      if(!confirm('Delete this bookmark?')) return;
      try { await sbc().from('bookmarks').delete().eq('id', id); MNBookmarks.open(); toast('Bookmark deleted.'); } catch(e){ alert('Failed: '+e.message); }
    }
  };

  window.MNProjects = {
    state: { current: null, drawnLayer: null, view: 'list' },
    
    open: async function(){
      await sbcInit();
      $('mn-projects-back').classList.add('open');
      this.state.view = 'list';
      $('mn-projects-title').textContent = 'My Projects';
      $('mn-projects-new-btn').style.display = '';
      const u = curUser(); if(!u){ $('mn-projects-body').innerHTML = '<div class="mn-empty">Please sign in to view your projects.</div>'; return; }
      $('mn-projects-body').innerHTML = '<div class="mn-empty">Loading&</div>';
      try {
        const { data: owned, error: e1 } = await sbc().from('projects').select('*').eq('user_id', u.id).order('updated_at',{ascending:false});
        if(e1) throw e1;
        let shared = [];
        try {
          const { data: shareRows } = await sbc().from('project_shares').select('project_id, permission').or('shared_with_user_id.eq.'+u.id+',shared_with_email.eq.'+(u.email||''));
          if(shareRows && shareRows.length){
            const ids = shareRows.map(s=>s.project_id);
            const { data: sp } = await sbc().from('projects').select('*').in('id', ids);
            shared = (sp||[]).map(p => Object.assign({}, p, { _shared: true, _perm: (shareRows.find(s=>s.project_id===p.id)||{}).permission }));
          }
        } catch(e){}
        
        const all = [...(owned||[]), ...shared];
        if(all.length === 0){
          $('mn-projects-body').innerHTML = '<div class="mn-empty"><i class="fas fa-folder-open" style="font-size:32px;color:#3b82f6;margin-bottom:12px;display:block;"></i>No projects yet.<br><br>Click <strong>+ New Project</strong> to start. Then use the draw tools on the map to add shapes, measurements, or selected parcels to your project.</div>';
          return;
        }
        const ownedRows = (owned||[]).map(p => MNProjects._rowHtml(p, false)).join('');
        const sharedRows = shared.map(p => MNProjects._rowHtml(p, true)).join('');
        let html = '';
        if(owned && owned.length) html += '<div class="mn-label" style="margin:0 0 8px 4px;">Owned ('+owned.length+')</div><div class="mn-list" style="margin-bottom:18px;">'+ownedRows+'</div>';
        if(shared.length) html += '<div class="mn-label" style="margin:0 0 8px 4px;">Shared with me ('+shared.length+')</div><div class="mn-list">'+sharedRows+'</div>';
        $('mn-projects-body').innerHTML = html;
      } catch(e){
        $('mn-projects-body').innerHTML = '<div class="mn-empty" style="color:#fca5a5;">Error: '+esc(e.message||e)+'</div>';
      }
    },
    
    _rowHtml: function(p, isShared){
      const sub = (p.county||'') + (p.county?' " ':'') + 'Updated '+fmtDate(p.updated_at);
      const sharedBadge = isShared ? '<span style="font-size:10px;background:#3b82f6;color:#fff;padding:2px 6px;border-radius:3px;margin-left:6px;">SHARED ('+(p._perm||'read').toUpperCase()+')</span>' : '';
      const delBtn = isShared ? '' : '<button onclick="event.stopPropagation();MNProjects.del(\''+p.id+'\')" title="Delete"><i class="fas fa-trash"></i></button>';
      const shareBtn = isShared ? '' : '<button onclick="event.stopPropagation();MNProjects.share(\''+p.id+'\')" title="Share"><i class="fas fa-share-alt"></i></button>';
      return '<div class="mn-row" onclick="MNProjects.detail(\''+p.id+'\')"><div class="mn-row-icon"><i class="fas fa-folder"></i></div><div class="mn-row-main"><div class="mn-row-title">'+esc(p.name)+sharedBadge+'</div><div class="mn-row-sub">'+esc(sub)+'</div></div><div class="mn-row-actions"><button onclick="event.stopPropagation();MNProjects.activate(\''+p.id+'\')" title="Activate"><i class="fas fa-play"></i></button>'+shareBtn+delBtn+'</div></div>';
    },
    
    close: function(){ $('mn-projects-back').classList.remove('open'); },
    
    newProject: async function(){
      await sbcInit();
      const name = prompt('Project name:');
      if(!name || !name.trim()) return;
      const desc = prompt('Description (optional):') || '';
      const u = curUser(); if(!u){ alert('Please sign in.'); return; }
      const center = (getLeafletMap()||window.map) ? (getLeafletMap()||window.map).getCenter() : null;
      const view = (getLeafletMap()||window.map) && center ? { lat: center.lat, lng: center.lng, zoom: (getLeafletMap()||window.map).getZoom() } : null;
      try {
        const { data, error } = await sbc().from('projects').insert({ user_id: u.id, name: name.trim(), description: desc, county: window.currentCounty||null, view_state: view }).select().single();
        if(error) throw error;
        toast('Project created.');
        MNProjects.activate(data.id);
        MNProjects.detail(data.id);
      } catch(e){ alert('Failed: '+e.message); }
    },
    
    detail: async function(id){
      await sbcInit();
      $('mn-projects-title').textContent = 'Project Details';
      $('mn-projects-new-btn').style.display = 'none';
      $('mn-projects-body').innerHTML = '<div class="mn-empty">Loading&</div>';
      try {
        const { data: p, error } = await sbc().from('projects').select('*').eq('id', id).single();
        if(error) throw error;
        const { data: feats } = await sbc().from('project_features').select('*').eq('project_id', id).order('created_at',{ascending:true});
        const u = curUser();
        const isOwner = p.user_id === (u&&u.id);
        let featsHtml = '';
        if(!feats || feats.length === 0){
          featsHtml = '<div class="mn-empty" style="padding:24px;">No features yet. Activate this project then use the map drawing tools.</div>';
        } else {
          featsHtml = feats.map(f => {
            const v = f.properties && f.properties.value ? f.properties.value : '';
            const labelHtml = '<input class="mn-input" style="padding:4px 8px;font-size:12px;flex:1;" value="'+esc(f.label||'')+'" onchange="MNProjects.relabel(\''+f.id+'\', this.value)" placeholder="Label this feature">';
            return '<div class="mn-feature-row"><span class="ftype">'+esc(f.feature_type)+'</span>'+labelHtml+'<span class="fvalue">'+esc(v)+'</span><button onclick="MNProjects.flyToFeature(\''+f.id+'\')" style="background:none;border:1px solid #2b3a52;color:#67e8f9;padding:3px 8px;border-radius:4px;font-size:10px;cursor:pointer;"><i class="fas fa-location-arrow"></i></button><button onclick="MNProjects.delFeature(\''+f.id+'\')" style="background:none;border:1px solid #7f1d1d;color:#fca5a5;padding:3px 6px;border-radius:4px;font-size:10px;cursor:pointer;"><i class="fas fa-times"></i></button></div>';
          }).join('');
        }
        const editBtn = isOwner ? '<button class="mn-btn" onclick="MNProjects.rename(\''+p.id+'\')"><i class="fas fa-edit"></i> Rename</button>' : '';
        const shareBtn = isOwner ? '<button class="mn-btn" onclick="MNProjects.share(\''+p.id+'\')"><i class="fas fa-share-alt"></i> Share</button>' : '';
        const delBtn = isOwner ? '<button class="mn-btn mn-btn-danger" onclick="MNProjects.del(\''+p.id+'\')"><i class="fas fa-trash"></i> Delete</button>' : '';
        $('mn-projects-body').innerHTML =
          '<div class="mn-proj-detail-head">'+
            '<div class="mn-row-icon" style="width:48px;height:48px;font-size:20px;"><i class="fas fa-folder-open"></i></div>'+
            '<div style="flex:1;"><h3>'+esc(p.name)+'</h3><div class="desc">'+esc(p.description||'No description')+'</div><div class="desc" style="margin-top:4px;font-size:11px;">'+(p.county?esc(p.county)+' " ':'')+'Updated '+fmtDate(p.updated_at)+'</div></div>'+
          '</div>'+
          '<div style="display:flex;gap:8px;margin-bottom:14px;flex-wrap:wrap;">'+
            '<button class="mn-btn mn-btn-primary" onclick="MNProjects.activate(\''+p.id+'\');MNProjects.close();"><i class="fas fa-play"></i> Activate & View on Map</button>'+
            '<button class="mn-btn" onclick="MNProjects.open()"><i class="fas fa-arrow-left"></i> Back</button>'+
            editBtn+shareBtn+delBtn+
          '</div>'+
          '<div class="mn-label">Features ('+(feats?feats.length:0)+')</div>'+
          '<div style="margin-top:6px;">'+featsHtml+'</div>'+
          (isOwner ? '<div class="mn-label" style="margin-top:18px;">Add Features</div><div style="font-size:12px;color:#9ca8bd;margin-top:4px;">After activating, use the toolbar above the map to draw shapes, measure distances, or select parcels  they\'ll auto-save to this project.</div>' : '');
      } catch(e){
        $('mn-projects-body').innerHTML = '<div class="mn-empty" style="color:#fca5a5;">Error: '+esc(e.message||e)+'</div>';
      }
    },
    
    rename: async function(id){
      await sbcInit();
      const name = prompt('New name:');
      if(!name||!name.trim()) return;
      const desc = prompt('New description (leave blank to keep):');
      const upd = { name: name.trim(), updated_at: new Date().toISOString() };
      if(desc !== null && desc !== '') upd.description = desc;
      try { await sbc().from('projects').update(upd).eq('id', id); toast('Saved.'); MNProjects.detail(id); } catch(e){ alert(e.message); }
    },
    
    del: async function(id){
      await sbcInit();
      if(!confirm('Delete this project and all its features? This cannot be undone.')) return;
      try { await sbc().from('projects').delete().eq('id', id); toast('Project deleted.'); if(MNProjects.state.current===id) MNProjects.deactivate(); MNProjects.open(); } catch(e){ alert(e.message); }
    },
    
    share: async function(id){
      await sbcInit();
      const email = prompt('Share with email:');
      if(!email||!email.trim()) return;
      const perm = confirm('Allow this user to EDIT? Click OK for edit, Cancel for read-only.') ? 'edit' : 'read';
      const u = curUser();
      try {
        const { error } = await sbc().from('project_shares').insert({ project_id: id, shared_with_email: email.trim().toLowerCase(), shared_by: u.id, permission: perm });
        if(error) throw error;
        toast('Shared with '+email+' ('+perm+').');
      } catch(e){ alert('Share failed: '+e.message); }
    },
    
    activate: async function(id){
      try {
        await sbcInit();
        const { data: p, error } = await sbc().from('projects').select('*').eq('id', id).single();
        if(error) throw error;
        const { data: feats } = await sbc().from('project_features').select('*').eq('project_id', id);
        MNProjects.state.current = id;
        $('mn-active-project-name').textContent = p.name;
        $('mn-active-project').classList.add('open');
        if((getLeafletMap()||window.map) && p.view_state && p.view_state.lat){
          (getLeafletMap()||window.map).setView([p.view_state.lat, p.view_state.lng], p.view_state.zoom||12);
        }
        MNProjects._renderFeatures(feats||[]);
        toast('Project activated. Drawn shapes and measurements will save here.');
      } catch(e){ alert('Activate failed: '+e.message); }
    },
    
    deactivate: function(){
      MNProjects.state.current = null;
      $('mn-active-project').classList.remove('open');
      MNProjects._clearLayer();
      toast('Project deactivated.');
    },
    
    openCurrent: function(){
      if(MNProjects.state.current){ MNProjects.detail(MNProjects.state.current); MNProjects.open(); }
    },
    
    _ensureLayer: function(){
      if(!(getLeafletMap()||window.map)) return null;
      if(!MNProjects.state.drawnLayer){
        MNProjects.state.drawnLayer = new L.FeatureGroup();
        (getLeafletMap()||window.map).addLayer(MNProjects.state.drawnLayer);
      }
      return MNProjects.state.drawnLayer;
    },
    
    _clearLayer: function(){
      if(MNProjects.state.drawnLayer) MNProjects.state.drawnLayer.clearLayers();
    },
    
    _renderFeatures: function(feats){
      const layer = MNProjects._ensureLayer(); if(!layer) return;
      layer.clearLayers();
      feats.forEach(f => {
        try {
          let geo = f.geom;
          if(typeof geo === 'string') geo = JSON.parse(geo);
          let l;
          const style = f.style || {};
          if(geo.type === 'circle' && geo.center){
            l = L.circle([geo.center[1], geo.center[0]], { radius: geo.radius, color: style.color||'#06b6d4', weight: style.weight||3, fillOpacity: 0.2 });
          } else if(geo.type === 'marker'){
            l = L.marker([geo.coordinates[1], geo.coordinates[0]]);
          } else {
            l = L.geoJSON(geo, { style: { color: style.color||'#06b6d4', weight: style.weight||3, fillOpacity: 0.2 }});
          }
          if(f.label) l.bindTooltip(f.label, { permanent: true, direction: 'center', className: 'mn-feature-label' });
          l._mnFeatureId = f.id;
          layer.addLayer(l);
        } catch(e){}
      });
      try { if(layer.getLayers().length){ (getLeafletMap()||window.map).fitBounds(layer.getBounds(), { padding: [40,40], maxZoom: 17 }); } } catch(e){}
    },
    
    flyToFeature: async function(featureId){
      await sbcInit();
      try {
        const { data: f } = await sbc().from('project_features').select('*').eq('id', featureId).single();
        if(!f) return;
        let geo = f.geom; if(typeof geo === 'string') geo = JSON.parse(geo);
        let bounds;
        if(geo.type === 'circle'){ bounds = L.latLng(geo.center[1], geo.center[0]).toBounds(geo.radius*2); }
        else { const tmp = L.geoJSON(geo); bounds = tmp.getBounds(); }
        if((getLeafletMap()||window.map) && bounds && bounds.isValid()){ (getLeafletMap()||window.map).fitBounds(bounds, { padding:[40,40], maxZoom: 18 }); MNProjects.close(); toast('Centered on feature.'); }
      } catch(e){ alert('Failed: '+e.message); }
    },
    
    delFeature: async function(featureId){
      await sbcInit();
      if(!confirm('Remove this feature from the project?')) return;
      try {
        await sbc().from('project_features').delete().eq('id', featureId);
        if(MNProjects.state.current){ MNProjects.detail(MNProjects.state.current); MNProjects._reloadCurrentLayer(); }
        toast('Feature removed.');
      } catch(e){ alert(e.message); }
    },
    
    relabel: async function(featureId, label){
      await sbcInit();
      try { await sbc().from('project_features').update({ label: label }).eq('id', featureId); toast('Label saved.'); MNProjects._reloadCurrentLayer(); } catch(e){ alert(e.message); }
    },
    
    _reloadCurrentLayer: async function(){
      await sbcInit();
      if(!MNProjects.state.current) return;
      try { const { data: feats } = await sbc().from('project_features').select('*').eq('project_id', MNProjects.state.current); MNProjects._renderFeatures(feats||[]); } catch(e){}
    },
    
    saveFeature: async function(featureType, geom, properties, label){
      await sbcInit();
      if(!MNProjects.state.current){ toast('No active project. Click Projects � Activate one first.', 3500); return null; }
      const u = curUser(); if(!u){ toast('Sign in to save.'); return null; }
      try {
        const { data, error } = await sbc().from('project_features').insert({ project_id: MNProjects.state.current, feature_type: featureType, label: label||null, geom: geom, properties: properties||{} }).select().single();
        if(error) throw error;
        await sbc().from('projects').update({ updated_at: new Date().toISOString() }).eq('id', MNProjects.state.current);
        toast('Saved to project.');
        MNProjects._reloadCurrentLayer();
        return data;
      } catch(e){ toast('Save failed: '+e.message, 3500); return null; }
    }
  };
  
  function initDrawHandlers(){
    if(!(getLeafletMap()||window.map) || !window.L || !L.Draw || !L.Draw.Event) { setTimeout(initDrawHandlers, 1000); return; }
    if(window.__mnDrawInited) return;
    (getLeafletMap()||window.map).on(L.Draw.Event.CREATED, function(e){
      const layer = e.layer;
      const type = e.layerType;
      let geom, properties = {}, ftype;
      try {
        if(type === 'circle'){
          const c = layer.getLatLng();
          geom = { type: 'circle', center: [c.lng, c.lat], radius: layer.getRadius() };
          properties.value = (layer.getRadius()).toFixed(0)+' m radius';
          ftype = 'circle';
        } else if(type === 'marker'){
          const c = layer.getLatLng();
          geom = { type: 'Point', coordinates: [c.lng, c.lat] };
          properties.value = c.lat.toFixed(6)+', '+c.lng.toFixed(6);
          ftype = 'marker';
        } else if(type === 'polyline'){
          geom = layer.toGeoJSON().geometry;
          let dist = 0; const ll = layer.getLatLngs();
          for(let i=1;i<ll.length;i++) dist += ll[i-1].distanceTo(ll[i]);
          properties.value = (dist*3.28084).toFixed(0)+' ft / '+(dist/1000).toFixed(2)+' km';
          ftype = 'measurement';
        } else if(type === 'polygon' || type === 'rectangle'){
          geom = layer.toGeoJSON().geometry;
          let area = 0;
          if(L.GeometryUtil && L.GeometryUtil.geodesicArea){
            const ll = layer.getLatLngs()[0];
            area = L.GeometryUtil.geodesicArea(ll);
          }
          properties.value = (area*10.7639).toFixed(0)+' sqft / '+(area/4046.86).toFixed(2)+' acres';
          ftype = type;
        }
        if(MNProjects.state.current){
          const labelGuess = ftype.charAt(0).toUpperCase()+ftype.slice(1);
          MNProjects.saveFeature(ftype, geom, properties, labelGuess);
          MNProjects._ensureLayer().addLayer(layer);
        } else {
          if(!window.__mnDrawHinted){ window.__mnDrawHinted = true; toast('Tip: Activate a Project to auto-save your drawings.', 4000); }
          (getLeafletMap()||window.map).addLayer(layer);
        }
      } catch(err){}
    });
    window.__mnDrawInited = true;
  }
  setTimeout(initDrawHandlers, 1500);
  
  window.MNSaveSelectedParcel = function(parcelId, lat, lng, props){
    if(!MNProjects.state.current){ toast('Activate a project first to save parcels.', 3500); return; }
    const geom = { type: 'Point', coordinates: [lng, lat] };
    const p = Object.assign({ value: 'Parcel '+parcelId }, props||{});
    MNProjects.saveFeature('parcel', geom, p, 'Parcel '+parcelId);
  };
  
  ['mn-history-back','mn-bookmarks-back','mn-projects-back'].forEach(id => {
    const el = document.getElementById(id);
    if(el) el.addEventListener('click', function(e){ if(e.target === el) el.classList.remove('open'); });
  });
})();
