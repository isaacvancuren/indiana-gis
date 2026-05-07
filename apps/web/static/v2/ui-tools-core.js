/* Mapnova Tool Engine — extracted from index.html on 2026-04-30.
   This is the implementation for the MNTools facade declared inline in
   index.html. Loaded via <script src="static/v2/ui-tools-core.js" defer> in
   index.html. Do NOT inline this back into index.html. */

(function(){
  if(window.MNToolsImpl) return;
  window.MNToolsImpl = true;
  var waitMNT = setInterval(function(){
    if(!window.MNTools || typeof map === 'undefined') return;
    clearInterval(waitMNT);
    initMNT();
  }, 200);

  function initMNT(){
    var MNT = window.MNTools;
    var L_ = window.L;

    // ===== Unit conversions =====
    MNT.convertDist = function(meters, unit){
      switch(unit||MNT.distUnit){
        case 'ft': return {v: meters*3.28084, label:'ft'};
        case 'mi': return {v: meters/1609.344, label:'mi'};
        case 'm': return {v: meters, label:'m'};
        case 'km': return {v: meters/1000, label:'km'};
        case 'yd': return {v: meters*1.09361, label:'yd'};
        default: return {v: meters*3.28084, label:'ft'};
      }
    };
    MNT.convertArea = function(sqm, unit){
      switch(unit||MNT.areaUnit){
        case 'acres': return {v: sqm/4046.8564224, label:'ac'};
        case 'sqft': return {v: sqm*10.7639, label:'sq ft'};
        case 'sqm': return {v: sqm, label:'sq m'};
        case 'ha': return {v: sqm/10000, label:'ha'};
        case 'sqmi': return {v: sqm/2589988.110336, label:'sq mi'};
        case 'sqkm': return {v: sqm/1000000, label:'sq km'};
        default: return {v: sqm/4046.8564224, label:'ac'};
      }
    };
    MNT.fmtDist = function(meters, unit){
      var c = MNT.convertDist(meters, unit);
      var v = c.v;
      var prec = (v>=100?0:(v>=10?1:2));
      return v.toLocaleString(undefined,{maximumFractionDigits:prec, minimumFractionDigits:prec}) + ' ' + c.label;
    };
    MNT.fmtArea = function(sqm, unit){
      var c = MNT.convertArea(sqm, unit);
      var v = c.v;
      var prec = (v>=100?0:(v>=10?1:3));
      return v.toLocaleString(undefined,{maximumFractionDigits:prec, minimumFractionDigits:Math.min(prec,2)}) + ' ' + c.label;
    };

    // ===== Geodesic area calculation (accurate for any size polygon) =====
    MNT.geodesicArea = function(latlngs){
      // Spherical excess formula on WGS84 sphere approximation
      var R = 6378137; // WGS84 equatorial radius
      var rad = Math.PI/180;
      var area = 0;
      var n = latlngs.length;
      if(n < 3) return 0;
      for(var i=0;i<n;i++){
        var p1 = latlngs[i];
        var p2 = latlngs[(i+1)%n];
        var lng1 = (p1.lng||p1[1])*rad;
        var lng2 = (p2.lng||p2[1])*rad;
        var lat1 = (p1.lat||p1[0])*rad;
        var lat2 = (p2.lat||p2[0])*rad;
        area += (lng2 - lng1) * (2 + Math.sin(lat1) + Math.sin(lat2));
      }
      area = Math.abs(area * R * R / 2);
      return area; // sqm
    };
    MNT.lineLength = function(latlngs){
      var total = 0;
      for(var i=1;i<latlngs.length;i++){
        var p1 = L_.latLng(latlngs[i-1]);
        var p2 = L_.latLng(latlngs[i]);
        total += p1.distanceTo(p2);
      }
      return total; // meters
    };

    // ===== Drawing layer + per-tool state =====
    MNT.drawLayer = L_.featureGroup().addTo(map);
    MNT.measLayer = L_.featureGroup().addTo(map);
    MNT.selLayer = L_.featureGroup().addTo(map);
    MNT._tempLayer = null; // current in-progress tool layer
    MNT._tempPts = []; // current in-progress points
    MNT._tempLine = null; // moving guide line
    MNT._tempVertices = null; // markers for vertex points
    MNT._mouseMoveHandler = null;
    MNT._dragHandler = null;
    MNT._mouseDownHandler = null;
    MNT._mouseUpHandler = null;
    MNT._dragStart = null;
    MNT._isDrawing = false;

    MNT._cleanupTemp = function(){
      if(MNT._tempLayer && map.hasLayer(MNT._tempLayer)){ try{map.removeLayer(MNT._tempLayer);}catch(e){} }
      if(MNT._tempLine && map.hasLayer(MNT._tempLine)){ try{map.removeLayer(MNT._tempLine);}catch(e){} }
      if(MNT._tempVertices && map.hasLayer(MNT._tempVertices)){ try{map.removeLayer(MNT._tempVertices);}catch(e){} }
      MNT._tempLayer = null; MNT._tempLine = null; MNT._tempVertices = null;
      MNT._tempPts = [];
      MNT._isDrawing = false;
      if(MNT._mouseMoveHandler){ map.off('mousemove', MNT._mouseMoveHandler); MNT._mouseMoveHandler = null; }
      if(MNT._mouseDownHandler){ map.off('mousedown', MNT._mouseDownHandler); MNT._mouseDownHandler = null; }
      if(MNT._mouseUpHandler){ map.off('mouseup', MNT._mouseUpHandler); MNT._mouseUpHandler = null; }
      try { map.dragging.enable(); } catch(e){}
    };

    var origReturn = MNT.returnToInquire.bind(MNT);
    MNT.returnToInquire = function(){ MNT._cleanupTemp(); origReturn(); };

    var origSetMode = MNT.setMode.bind(MNT);
    MNT.setMode = function(tool, btn){
      MNT._cleanupTemp();
      origSetMode(tool, btn);
    };

    MNT._handleMapClick = function(e){
      var t = MNT.activeTool;
      if(!t) return;
      var fn = MNT['click_' + t.replace(/-/g,'_')];
      if(typeof fn === 'function') fn.call(MNT, e);
    };
    MNT._handleMapDblClick = function(e){
      var t = MNT.activeTool;
      if(!t) return;
      var fn = MNT['dblclick_' + t.replace(/-/g,'_')];
      if(typeof fn === 'function') fn.call(MNT, e);
      else MNT._finishCurrent();
    };
    map.on('click', MNT._handleMapClick);
    map.on('dblclick', MNT._handleMapDblClick);
    map.doubleClickZoom.disable();

    MNT._finishCurrent = function(){
      var t = MNT.activeTool;
      if(!t) return;
      var fn = MNT['finish_' + t.replace(/-/g,'_')];
      if(typeof fn === 'function') fn.call(MNT);
      MNT.returnToInquire();
    };

    // ===== Measure Line =====
    MNT.start_meas_line = function(){
      MNT._tempPts = [];
      MNT._tempLayer = L_.polyline([], {color:'#06b6d4',weight:3,dashArray:'4,6'}).addTo(map);
      MNT._tempVertices = L_.layerGroup().addTo(map);
      MNT._tempLine = L_.polyline([], {color:'#06b6d4',weight:1.5,opacity:0.5}).addTo(map);
      MNT._mouseMoveHandler = function(e){
        if(MNT._tempPts.length < 1) return;
        var last = MNT._tempPts[MNT._tempPts.length-1];
        MNT._tempLine.setLatLngs([last, e.latlng]);
      };
      map.on('mousemove', MNT._mouseMoveHandler);
    };
    MNT.click_meas_line = function(e){
      MNT._tempPts.push(e.latlng);
      MNT._tempLayer.setLatLngs(MNT._tempPts);
      L_.circleMarker(e.latlng, {radius:4, color:'#06b6d4', fillColor:'#0891b2', fillOpacity:1, weight:2}).addTo(MNT._tempVertices);
    };
    MNT.finish_meas_line = function(){
      if(MNT._tempPts.length < 2){ return; }
      var pts = MNT._tempPts.slice();
      var len = MNT.lineLength(pts);
      var poly = L_.polyline(pts, {color:'#06b6d4',weight:3}).addTo(MNT.measLayer);
      var item = {id:'m'+Date.now(), type:'line', pts:pts, lengthM:len, layer:poly};
      var midIdx = Math.floor(pts.length/2);
      var lblPos = pts[midIdx];
      item.label = L_.marker(lblPos, {icon:L_.divIcon({className:'mn2-meas-label',html:'<span style="background:#0891b2;color:#fff;padding:2px 6px;border-radius:4px;font-size:11px;font-weight:600;white-space:nowrap;">'+MNT.fmtDist(len)+'</span>'})}).addTo(MNT.measLayer);
      MNT.measurements.push(item);
      MNT.renderMeasList();
    };
    MNT.dblclick_meas_line = function(e){ MNT._finishCurrent(); };

    // ===== Measure Area =====
    MNT.start_meas_area = function(){
      MNT._tempPts = [];
      MNT._tempLayer = L_.polygon([], {color:'#06b6d4',weight:2,fillColor:'#06b6d4',fillOpacity:0.15,dashArray:'4,6'}).addTo(map);
      MNT._tempVertices = L_.layerGroup().addTo(map);
      MNT._tempLine = L_.polyline([], {color:'#06b6d4',weight:1.5,opacity:0.5}).addTo(map);
      MNT._mouseMoveHandler = function(e){
        if(MNT._tempPts.length < 1) return;
        var last = MNT._tempPts[MNT._tempPts.length-1];
        MNT._tempLine.setLatLngs([last, e.latlng]);
      };
      map.on('mousemove', MNT._mouseMoveHandler);
    };
    MNT.click_meas_area = function(e){
      MNT._tempPts.push(e.latlng);
      MNT._tempLayer.setLatLngs(MNT._tempPts);
      L_.circleMarker(e.latlng, {radius:4, color:'#06b6d4', fillColor:'#0891b2', fillOpacity:1, weight:2}).addTo(MNT._tempVertices);
    };
    MNT.finish_meas_area = function(){
      if(MNT._tempPts.length < 3){ return; }
      var pts = MNT._tempPts.slice();
      var sqm = MNT.geodesicArea(pts);
      var perim = MNT.lineLength(pts.concat([pts[0]]));
      var poly = L_.polygon(pts, {color:'#06b6d4',weight:2,fillColor:'#06b6d4',fillOpacity:0.15}).addTo(MNT.measLayer);
      var item = {id:'m'+Date.now(), type:'area', pts:pts, areaSqm:sqm, perimM:perim, layer:poly};
      var center = poly.getBounds().getCenter();
      item.label = L_.marker(center, {icon:L_.divIcon({className:'mn2-meas-label',html:'<span style="background:#0891b2;color:#fff;padding:2px 6px;border-radius:4px;font-size:11px;font-weight:600;white-space:nowrap;">'+MNT.fmtArea(sqm)+'</span>'})}).addTo(MNT.measLayer);
      MNT.measurements.push(item);
      MNT.renderMeasList();
    };
    MNT.dblclick_meas_area = function(e){ MNT._finishCurrent(); };

    MNT.renderMeasList = function(){
      var el = document.getElementById('mn2-meas-list');
      if(!el) return;
      if(MNT.measurements.length===0){ el.innerHTML=''; return; }
      var html = '<div style="font-size:11px;color:#aaa;margin-bottom:4px;font-weight:600;letter-spacing:.5px;">SAVED MEASUREMENTS ('+MNT.measurements.length+')</div>';
      MNT.measurements.forEach(function(m){
        var val = m.type==='line' ? MNT.fmtDist(m.lengthM) : MNT.fmtArea(m.areaSqm);
        var icon = m.type==='line' ? 'fa-route' : 'fa-draw-polygon';
        html += '<div style="display:flex;align-items:center;gap:5px;padding:4px 6px;background:rgba(255,255,255,0.04);border-radius:5px;margin-bottom:3px;">'
              + '<i class="fas '+icon+'" style="color:#06b6d4;font-size:11px;"></i>'
              + '<span style="flex:1;font-size:12px;color:#e2e8f0;">'+val+'</span>'
              + '<button data-mn2-meas-zoom="'+m.id+'" title="Zoom" style="background:none;border:none;color:#94a3b8;cursor:pointer;padding:2px;"><i class="fas fa-search-plus" style="font-size:11px;"></i></button>'
              + '<button data-mn2-meas-del="'+m.id+'" title="Delete" style="background:none;border:none;color:#f87171;cursor:pointer;padding:2px;"><i class="fas fa-times" style="font-size:11px;"></i></button>'
              + '</div>';
      });
      el.innerHTML = html;
    };
    document.addEventListener('click', function(ev){
      var z = ev.target.closest('[data-mn2-meas-zoom]');
      if(z){ var id = z.getAttribute('data-mn2-meas-zoom'); var m = MNT.measurements.find(function(x){return x.id===id;}); if(m && m.layer && m.layer.getBounds) map.fitBounds(m.layer.getBounds(), {padding:[40,40]}); return; }
      var d = ev.target.closest('[data-mn2-meas-del]');
      if(d){ var id2 = d.getAttribute('data-mn2-meas-del'); var idx = MNT.measurements.findIndex(function(x){return x.id===id2;}); if(idx>-1){ var m2 = MNT.measurements[idx]; try{MNT.measLayer.removeLayer(m2.layer);}catch(e){} try{MNT.measLayer.removeLayer(m2.label);}catch(e){} MNT.measurements.splice(idx,1); MNT.renderMeasList(); } }
    });

    var origRender = MNT.renderMeasList;
    MNT.renderMeasList = function(){
      origRender.call(MNT);
      // also update label markers
      MNT.measurements.forEach(function(m){
        var val = m.type==='line' ? MNT.fmtDist(m.lengthM) : MNT.fmtArea(m.areaSqm);
        if(m.label && m.label.setIcon){
          m.label.setIcon(L_.divIcon({className:'mn2-meas-label', html:'<span style="background:#0891b2;color:#fff;padding:2px 6px;border-radius:4px;font-size:11px;font-weight:600;white-space:nowrap;">'+val+'</span>'}));
        }
      });
    };

    // ===== Draw Polygon =====
    MNT.start_draw_polygon = function(){
      MNT._tempPts = [];
      MNT._tempLayer = L_.polygon([], {color:MNT.drawColor,weight:2,fillColor:MNT.drawColor,fillOpacity:0.2,dashArray:'4,6'}).addTo(map);
      MNT._tempVertices = L_.layerGroup().addTo(map);
      MNT._tempLine = L_.polyline([], {color:MNT.drawColor,weight:1.5,opacity:0.5}).addTo(map);
      MNT._mouseMoveHandler = function(e){
        if(MNT._tempPts.length < 1) return;
        var last = MNT._tempPts[MNT._tempPts.length-1];
        MNT._tempLine.setLatLngs([last, e.latlng]);
      };
      map.on('mousemove', MNT._mouseMoveHandler);
    };
    MNT.click_draw_polygon = function(e){
      MNT._tempPts.push(e.latlng);
      MNT._tempLayer.setLatLngs(MNT._tempPts);
      L_.circleMarker(e.latlng, {radius:4, color:MNT.drawColor, fillColor:MNT.drawColor, fillOpacity:1, weight:2}).addTo(MNT._tempVertices);
    };
    MNT.finish_draw_polygon = function(){
      if(MNT._tempPts.length < 3) return;
      var poly = L_.polygon(MNT._tempPts.slice(), {color:MNT.drawColor,weight:2,fillColor:MNT.drawColor,fillOpacity:0.2}).addTo(MNT.drawLayer);
      MNT.annotations.push({id:'a'+Date.now(), type:'polygon', layer:poly, color:MNT.drawColor});
    };

    // ===== Freehand =====
    MNT.start_draw_freehand = function(){
      MNT._tempPts = [];
      MNT._tempLayer = L_.polyline([], {color:MNT.drawColor,weight:3,smoothFactor:1.5}).addTo(map);
      try { map.dragging.disable(); } catch(e){}
      MNT._mouseDownHandler = function(e){
        MNT._isDrawing = true;
        MNT._tempPts = [e.latlng];
        MNT._tempLayer.setLatLngs(MNT._tempPts);
      };
      MNT._mouseMoveHandler = function(e){
        if(!MNT._isDrawing) return;
        MNT._tempPts.push(e.latlng);
        MNT._tempLayer.setLatLngs(MNT._tempPts);
      };
      MNT._mouseUpHandler = function(e){
        if(!MNT._isDrawing) return;
        MNT._isDrawing = false;
        if(MNT._tempPts.length > 2){
          // close to start with straight line and create polygon
          var pts = MNT._tempPts.slice();
          var poly = L_.polygon(pts, {color:MNT.drawColor,weight:2,fillColor:MNT.drawColor,fillOpacity:0.2}).addTo(MNT.drawLayer);
          MNT.annotations.push({id:'a'+Date.now(), type:'freehand', layer:poly, color:MNT.drawColor});
        }
        MNT.returnToInquire();
      };
      map.on('mousedown', MNT._mouseDownHandler);
      map.on('mousemove', MNT._mouseMoveHandler);
      map.on('mouseup', MNT._mouseUpHandler);
    };

    // ===== Rectangle (Shape) =====
    MNT.start_draw_rect = function(){
      try { map.dragging.disable(); } catch(e){}
      MNT._mouseDownHandler = function(e){
        MNT._dragStart = e.latlng;
        MNT._isDrawing = true;
        MNT._tempLayer = L_.rectangle([e.latlng, e.latlng], {color:MNT.drawColor,weight:2,fillColor:MNT.drawColor,fillOpacity:0.2,dashArray:'4,6'}).addTo(map);
      };
      MNT._mouseMoveHandler = function(e){
        if(!MNT._isDrawing || !MNT._tempLayer) return;
        MNT._tempLayer.setBounds([MNT._dragStart, e.latlng]);
      };
      MNT._mouseUpHandler = function(e){
        if(!MNT._isDrawing) return;
        MNT._isDrawing = false;
        var bounds = L_.latLngBounds(MNT._dragStart, e.latlng);
        if(MNT._tempLayer){ try{map.removeLayer(MNT._tempLayer);}catch(e){} MNT._tempLayer=null; }
        if(bounds.isValid() && Math.abs(bounds.getNorth()-bounds.getSouth())>1e-6){
          var r = L_.rectangle(bounds, {color:MNT.drawColor,weight:2,fillColor:MNT.drawColor,fillOpacity:0.2}).addTo(MNT.drawLayer);
          MNT.annotations.push({id:'a'+Date.now(), type:'rect', layer:r, color:MNT.drawColor});
        }
        MNT.returnToInquire();
      };
      map.on('mousedown', MNT._mouseDownHandler);
      map.on('mousemove', MNT._mouseMoveHandler);
      map.on('mouseup', MNT._mouseUpHandler);
    };

    // ===== Circle =====
    MNT.start_draw_circle = function(){
      try { map.dragging.disable(); } catch(e){}
      MNT._mouseDownHandler = function(e){
        MNT._dragStart = e.latlng;
        MNT._isDrawing = true;
        MNT._tempLayer = L_.circle(e.latlng, {radius:1, color:MNT.drawColor,weight:2,fillColor:MNT.drawColor,fillOpacity:0.2,dashArray:'4,6'}).addTo(map);
      };
      MNT._mouseMoveHandler = function(e){
        if(!MNT._isDrawing || !MNT._tempLayer) return;
        var r = MNT._dragStart.distanceTo(e.latlng);
        MNT._tempLayer.setRadius(r);
      };
      MNT._mouseUpHandler = function(e){
        if(!MNT._isDrawing) return;
        MNT._isDrawing = false;
        var r = MNT._dragStart.distanceTo(e.latlng);
        if(MNT._tempLayer){ try{map.removeLayer(MNT._tempLayer);}catch(e){} MNT._tempLayer=null; }
        if(r > 1){
          var c = L_.circle(MNT._dragStart, {radius:r, color:MNT.drawColor,weight:2,fillColor:MNT.drawColor,fillOpacity:0.2}).addTo(MNT.drawLayer);
          MNT.annotations.push({id:'a'+Date.now(), type:'circle', layer:c, color:MNT.drawColor, radius:r});
        }
        MNT.returnToInquire();
      };
      map.on('mousedown', MNT._mouseDownHandler);
      map.on('mousemove', MNT._mouseMoveHandler);
      map.on('mouseup', MNT._mouseUpHandler);
    };

    // ===== Polyline =====
    MNT.start_draw_polyline = function(){
      MNT._tempPts = [];
      MNT._tempLayer = L_.polyline([], {color:MNT.drawColor,weight:3,dashArray:'4,6'}).addTo(map);
      MNT._tempVertices = L_.layerGroup().addTo(map);
      MNT._tempLine = L_.polyline([], {color:MNT.drawColor,weight:1.5,opacity:0.5}).addTo(map);
      MNT._mouseMoveHandler = function(e){
        if(MNT._tempPts.length < 1) return;
        var last = MNT._tempPts[MNT._tempPts.length-1];
        MNT._tempLine.setLatLngs([last, e.latlng]);
      };
      map.on('mousemove', MNT._mouseMoveHandler);
    };
    MNT.click_draw_polyline = function(e){
      MNT._tempPts.push(e.latlng);
      MNT._tempLayer.setLatLngs(MNT._tempPts);
      L_.circleMarker(e.latlng, {radius:4, color:MNT.drawColor, fillColor:MNT.drawColor, fillOpacity:1, weight:2}).addTo(MNT._tempVertices);
    };
    MNT.finish_draw_polyline = function(){
      if(MNT._tempPts.length < 2) return;
      var poly = L_.polyline(MNT._tempPts.slice(), {color:MNT.drawColor,weight:3}).addTo(MNT.drawLayer);
      MNT.annotations.push({id:'a'+Date.now(), type:'polyline', layer:poly, color:MNT.drawColor});
    };

    // ===== Text Box =====
    MNT.start_draw_text = function(){};
    MNT.click_draw_text = function(e){
      var ti = document.getElementById('mn2-draw-textinput');
      var txt = (ti && ti.value && ti.value.trim()) || prompt('Label text:', '');
      if(!txt) { MNT.returnToInquire(); return; }
      var color = MNT.drawColor;
      var marker = L_.marker(e.latlng, {icon:L_.divIcon({className:'mn2-text-label',html:'<span style="background:rgba(0,0,0,0.7);color:'+color+';padding:3px 8px;border-radius:4px;font-size:13px;font-weight:600;border:1px solid '+color+';white-space:nowrap;">'+txt.replace(/[<>&]/g,function(c){return {"<":"&lt;",">":"&gt;","&":"&amp;"}[c];})+'</span>'})}).addTo(MNT.drawLayer);
      MNT.annotations.push({id:'a'+Date.now(), type:'text', layer:marker, color:color, text:txt});
      if(ti) ti.value = '';
      MNT.returnToInquire();
    };

    MNT.clearAllDrawings = function(){
      MNT.drawLayer.clearLayers();
      MNT.annotations = [];
    };

    // ===== Selection helpers =====
    MNT._highlightStyle = {color:'#fbbf24', weight:3, fillColor:'#fbbf24', fillOpacity:0.35};
    MNT._origStyles = {};
    MNT._addToSelection = function(featureLayer){
      var id = featureLayer._leaflet_id;
      if(MNT.selection.has(id)) return false;
      MNT.selection.add(id);
      try {
        var orig = {color:featureLayer.options.color, weight:featureLayer.options.weight, fillColor:featureLayer.options.fillColor, fillOpacity:featureLayer.options.fillOpacity};
        MNT._origStyles[id] = {layer: featureLayer, orig: orig};
        featureLayer.setStyle(MNT._highlightStyle);
        if(featureLayer.bringToFront) featureLayer.bringToFront();
      } catch(e){}
      MNT._updateSelBadge();
      return true;
    };
    MNT._removeFromSelection = function(featureLayer){
      var id = featureLayer._leaflet_id;
      if(!MNT.selection.has(id)) return false;
      MNT.selection.delete(id);
      try {
        var rec = MNT._origStyles[id];
        if(rec) featureLayer.setStyle(rec.orig);
        delete MNT._origStyles[id];
      } catch(e){}
      MNT._updateSelBadge();
      return true;
    };
    MNT._toggleSelection = function(featureLayer){
      if(MNT.selection.has(featureLayer._leaflet_id)) MNT._removeFromSelection(featureLayer);
      else MNT._addToSelection(featureLayer);
    };
    MNT._updateSelBadge = function(){
      var b = document.getElementById('sel-count-badge');
      if(b) b.textContent = MNT.selection.size;
    };
    MNT.clearSelection = function(){
      Object.keys(MNT._origStyles).forEach(function(id){
        var rec = MNT._origStyles[id];
        try { rec.layer.setStyle(rec.orig); } catch(e){}
      });
      MNT._origStyles = {};
      MNT.selection.clear();
      MNT._updateSelBadge();
    };
    MNT.deleteSelection = function(){
      // For parcels, 'delete' means remove from selection (not deleting from DB)
      MNT.clearSelection();
    };

    // Layers we should NEVER consider as selection candidates (the tool engine's
    // own scratch + output layers, plus tile layers).
    MNT._isToolOwnedLayer = function(layer){
      if (!layer) return true;
      if (layer === MNT.drawLayer || layer === MNT.measLayer || layer === MNT.selLayer) return true;
      if (layer === MNT._tempLayer || layer === MNT._tempLine || layer === MNT._tempVertices) return true;
      // Tile layers, basemaps, anything with a tilePattern URL — never selectable.
      if (typeof layer.getUrl === 'function' || layer instanceof L_.TileLayer) return true;
      return false;
    };

    // A feature is "selectable" if it has bounds + a setStyle method (so we can
    // visually highlight it). Previously we required f.feature.properties which
    // is the Leaflet GeoJSON convention — but parcels rendered as plain L.polygon
    // (not via L.geoJSON) lack that property, so they were silently invisible to
    // selection. Permissive matcher: accept any layer with bounds + setStyle.
    MNT._isSelectableFeature = function(f){
      if (!f) return false;
      if (typeof f.getBounds !== 'function') return false;
      if (typeof f.setStyle !== 'function') return false;
      return true;
    };

    // Recursive descent — Leaflet feature groups can be nested arbitrarily deep
    // (a county layer panel may render parcels inside a featureGroup inside
    // another featureGroup). The previous one-level traversal missed these.
    MNT._eachSelectableFeature = function(visit){
      var seen = new WeakSet();
      function walk(layer){
        if (!layer || seen.has(layer)) return;
        seen.add(layer);
        if (MNT._isToolOwnedLayer(layer)) return;
        // First check if the layer itself is selectable (a leaf polygon added directly)
        if (MNT._isSelectableFeature(layer)) {
          visit(layer);
          // A leaf with setStyle may still be a group (LayerGroup has eachLayer too).
          // Don't recurse further if it's a leaf shape — but L.FeatureGroup also has
          // setStyle, so we keep walking children below.
        }
        // Then recurse into children if it's a group-like
        if (layer._layers && typeof layer.eachLayer === 'function'){
          try {
            layer.eachLayer(function(child){ walk(child); });
          } catch(_e){}
        }
      }
      map.eachLayer(walk);
    };

    // Diagnostic: prints a one-line summary of what the matcher sees.
    // Toggle on from the browser console: MNT.debug = true; then click sel-* tools.
    MNT._diagnose = function(){
      var groupCount = 0, leafCount = 0, examples = [];
      map.eachLayer(function(layer){
        if (MNT._isToolOwnedLayer(layer)) return;
        if (layer && layer._layers && typeof layer.eachLayer === 'function') {
          groupCount++;
          if (examples.length < 3) examples.push(layer);
        }
      });
      MNT._eachSelectableFeature(function(){ leafCount++; });
      console.log('[MNT diag] map has ' + groupCount + ' non-tool groups, ' + leafCount + ' selectable features. Examples:', examples);
    };

    MNT._findFeatureAt = function(latlng){
      var hit = null;
      MNT._eachSelectableFeature(function(f){
        if (hit) return;
        try {
          if (f.getBounds().contains(latlng)) hit = f;
        } catch(_e){}
      });
      if (MNT.debug) console.log('[MNT] _findFeatureAt', latlng, 'hit=', !!hit);
      return hit;
    };

    MNT._findFeaturesInBounds = function(bounds){
      var hits = [];
      MNT._eachSelectableFeature(function(f){
        try {
          var fb = f.getBounds();
          // Use intersection — selects any feature that overlaps the box, even
          // partially. Standard GIS "intersect" semantics, more intuitive than
          // "fully contained" for box-select UX.
          if (bounds.intersects(fb)) hits.push(f);
        } catch(_e){}
      });
      if (MNT.debug) console.log('[MNT] _findFeaturesInBounds → ' + hits.length + ' hits');
      return hits;
    };

    MNT._findFeaturesIntersectingPolygon = function(polyLatLngs){
      var polyL = L_.polygon(polyLatLngs);
      var polyBnds = polyL.getBounds();
      var hits = [];
      MNT._eachSelectableFeature(function(f){
        try {
          var fb = f.getBounds();
          // Fast-skip: if even the bounding boxes don't intersect, no overlap possible.
          if (!polyBnds.intersects(fb)) return;
          // Permissive intersect: select if ANY of these is true —
          //   (a) parcel center is inside the polygon
          //   (b) any of parcel bounds' 4 corners is inside the polygon
          //   (c) any polygon vertex is inside parcel bounds
          // (a) handles parcels fully inside; (b) catches parcels with a corner
          // poking in even when the center is outside; (c) catches parcels that
          // are larger than the polygon (polygon vertex is inside parcel).
          var center = fb.getCenter();
          if (MNT._pointInPolygon(center, polyLatLngs)) { hits.push(f); return; }
          var corners = [fb.getNorthWest(), fb.getNorthEast(), fb.getSouthWest(), fb.getSouthEast()];
          for (var i = 0; i < corners.length; i++) {
            if (MNT._pointInPolygon(corners[i], polyLatLngs)) { hits.push(f); return; }
          }
          for (var j = 0; j < polyLatLngs.length; j++) {
            if (fb.contains(polyLatLngs[j])) { hits.push(f); return; }
          }
        } catch(_e){}
      });
      if (MNT.debug) console.log('[MNT] _findFeaturesIntersectingPolygon → ' + hits.length + ' hits');
      return hits;
    };
    MNT._pointInPolygon = function(pt, polyLatLngs){
      var x = pt.lng, y = pt.lat;
      var inside = false;
      for(var i=0,j=polyLatLngs.length-1;i<polyLatLngs.length;j=i++){
        var xi = polyLatLngs[i].lng, yi = polyLatLngs[i].lat;
        var xj = polyLatLngs[j].lng, yj = polyLatLngs[j].lat;
        var intersect = ((yi>y)!=(yj>y)) && (x < (xj-xi)*(y-yi)/(yj-yi)+xi);
        if(intersect) inside = !inside;
      }
      return inside;
    };
    MNT._findFeaturesIntersectingLine = function(lineLatLngs){
      var hits = [];
      var seen = {};
      // For each segment, sample intermediate points and check feature containment
      for(var i=1;i<lineLatLngs.length;i++){
        var p1 = lineLatLngs[i-1], p2 = lineLatLngs[i];
        var samples = 50;
        for(var s=0;s<=samples;s++){
          var t = s/samples;
          var pt = L_.latLng(p1.lat+(p2.lat-p1.lat)*t, p1.lng+(p2.lng-p1.lng)*t);
          var f = MNT._findFeatureAt(pt);
          if(f && !seen[f._leaflet_id]){ seen[f._leaflet_id]=true; hits.push(f); }
        }
      }
      return hits;
    };

    // ===== Click Select (multi) =====
    MNT.start_sel_click = function(){};
    MNT.click_sel_click = function(e){
      var f = MNT._findFeatureAt(e.latlng);
      if(f) MNT._toggleSelection(f);
    };

    // ===== Box Select =====
    MNT.start_sel_box = function(){
      try { map.dragging.disable(); } catch(e){}
      MNT._mouseDownHandler = function(e){
        MNT._dragStart = e.latlng;
        MNT._isDrawing = true;
        MNT._tempLayer = L_.rectangle([e.latlng, e.latlng], {color:'#fbbf24',weight:2,fillColor:'#fbbf24',fillOpacity:0.15,dashArray:'4,6'}).addTo(map);
      };
      MNT._mouseMoveHandler = function(e){
        if(!MNT._isDrawing || !MNT._tempLayer) return;
        MNT._tempLayer.setBounds([MNT._dragStart, e.latlng]);
      };
      MNT._mouseUpHandler = function(e){
        if(!MNT._isDrawing) return;
        MNT._isDrawing = false;
        var bounds = L_.latLngBounds(MNT._dragStart, e.latlng);
        if(MNT._tempLayer){ try{map.removeLayer(MNT._tempLayer);}catch(e){} MNT._tempLayer=null; }
        if(bounds.isValid()){
          var feats = MNT._findFeaturesInBounds(bounds);
          feats.forEach(function(f){ MNT._addToSelection(f); });
        }
        MNT.returnToInquire();
      };
      map.on('mousedown', MNT._mouseDownHandler);
      map.on('mousemove', MNT._mouseMoveHandler);
      map.on('mouseup', MNT._mouseUpHandler);
    };

    // ===== Line Select =====
    MNT.start_sel_line = function(){
      MNT._tempPts = [];
      MNT._tempLayer = L_.polyline([], {color:'#fbbf24',weight:3,dashArray:'6,4'}).addTo(map);
      MNT._tempVertices = L_.layerGroup().addTo(map);
      MNT._tempLine = L_.polyline([], {color:'#fbbf24',weight:1.5,opacity:0.5}).addTo(map);
      MNT._mouseMoveHandler = function(e){
        if(MNT._tempPts.length < 1) return;
        var last = MNT._tempPts[MNT._tempPts.length-1];
        MNT._tempLine.setLatLngs([last, e.latlng]);
      };
      map.on('mousemove', MNT._mouseMoveHandler);
    };
    MNT.click_sel_line = function(e){
      MNT._tempPts.push(e.latlng);
      MNT._tempLayer.setLatLngs(MNT._tempPts);
      L_.circleMarker(e.latlng, {radius:4, color:'#fbbf24', fillColor:'#fbbf24', fillOpacity:1, weight:2}).addTo(MNT._tempVertices);
    };
    MNT.finish_sel_line = function(){
      if(MNT._tempPts.length < 2) return;
      var feats = MNT._findFeaturesIntersectingLine(MNT._tempPts);
      feats.forEach(function(f){ MNT._addToSelection(f); });
    };

    // ===== Poly Select =====
    MNT.start_sel_poly = function(){
      MNT._tempPts = [];
      MNT._tempLayer = L_.polygon([], {color:'#fbbf24',weight:2,fillColor:'#fbbf24',fillOpacity:0.15,dashArray:'4,6'}).addTo(map);
      MNT._tempVertices = L_.layerGroup().addTo(map);
      MNT._tempLine = L_.polyline([], {color:'#fbbf24',weight:1.5,opacity:0.5}).addTo(map);
      MNT._mouseMoveHandler = function(e){
        if(MNT._tempPts.length < 1) return;
        var last = MNT._tempPts[MNT._tempPts.length-1];
        MNT._tempLine.setLatLngs([last, e.latlng]);
      };
      map.on('mousemove', MNT._mouseMoveHandler);
    };
    MNT.click_sel_poly = function(e){
      MNT._tempPts.push(e.latlng);
      MNT._tempLayer.setLatLngs(MNT._tempPts);
      L_.circleMarker(e.latlng, {radius:4, color:'#fbbf24', fillColor:'#fbbf24', fillOpacity:1, weight:2}).addTo(MNT._tempVertices);
    };
    MNT.finish_sel_poly = function(){
      if(MNT._tempPts.length < 3) return;
      var feats = MNT._findFeaturesIntersectingPolygon(MNT._tempPts);
      feats.forEach(function(f){ MNT._addToSelection(f); });
    };

    // Initial badge
    MNT._updateSelBadge();
    console.log('[MNT] Tool engine initialized');
  } // end initMNT
})();
