/* ============================================================================
 * Mapnova Hot-Fixes (post-extraction) - resilient edition
 * ----------------------------------------------------------------------------
 * Each fix is idempotent and applied independently. Polls every 200ms for up
 * to 60 seconds; stops once all three fixes succeed.
 *
 *   1. window.MNT alias - many index.html call-sites reference MNT directly.
 *   2. activeTool global sync - keep legacy activeTool var in sync with MNT.
 *   3. INQ.add field-name coverage - widen field fallbacks + ownerCache lookup.
 * ========================================================================= */
(function(){
  'use strict';

  function aliasMNT(){
    if (window.MNT) return true;
    if (window.MNTools) {
      try { window.MNT = window.MNTools; return true; } catch(e){ return false; }
    }
    return false;
  }

  function wrapSetMode(){
    var MNT = window.MNTools;
    if (!MNT || typeof MNT.setMode !== 'function') return false;
    if (MNT.__legacySyncWrapped) return true;
    try {
      var orig = MNT.setMode.bind(MNT);
      MNT.setMode = function(tool, btn){
        orig(tool, btn);
        try { window.activeTool = tool || null; } catch(e){}
      };
      MNT.__legacySyncWrapped = true;
      return true;
    } catch(e){
      console.warn('[mn-bugfixes] setMode wrap failed:', e);
      return false;
    }
  }

  function patchINQ(){
    var INQ = window.MNInquiryList;
    if (!INQ || typeof INQ.add !== 'function') return false;
    if (INQ.__fieldsPatched) return true;
    try {
      var origAdd = INQ.add.bind(INQ);
      INQ.add = function(parcelOrLayer, maybeLayer){
        var ret = origAdd(parcelOrLayer, maybeLayer);
        if (!ret) return ret;
        var item = INQ.items[INQ.items.length - 1];
        if (!item || !item.parcel) return ret;
        var p = item.parcel;
        var props = (p && p.properties) || p || {};
        if (item.addr === '—' || !item.addr) {
          item.addr = props.prop_add || p.addr ||
                      props.SITE_ADDR || props.site_addr ||
                      props.PROP_ADDR || props.PROPERTY_ADDRESS ||
                      props.address || '—';
        }
        if (item.parid === '—' || !item.parid) {
          item.parid = p.pid || props.parcel_id || props.state_parcel_id ||
                       props.PARCEL_ID || props.PARID || props.PARCELID || '—';
        }
        if ((item.owner === '—' || !item.owner || item.owner === '(see assessor)') &&
            window.ownerCache && item.parid) {
          var cacheKey = String(item.parid).replace(/[^a-zA-Z0-9]/g, '');
          var cached = window.ownerCache[cacheKey];
          if (cached) {
            item.owner = cached.owner_name_full || cached.owner_name ||
                         cached.OWNER || item.owner;
            if (cached.tot_assessed_value != null) {
              item.assessed_value = cached.tot_assessed_value;
            }
          }
        }
        if (typeof INQ.render === 'function') INQ.render();
        return ret;
      };
      INQ.__fieldsPatched = true;
      return true;
    } catch(e){
      console.warn('[mn-bugfixes] INQ patch failed:', e);
      return false;
    }
  }

  // 4. Canvas hit-test: prefer smallest parcel when multiple match a click.
  //    Fixes "click selects nearby parcel" caused by overlapping/adjacent
  //    polygons in shared canvas renderer (Leaflet picks last-drawn by default).
  //    Reaches renderers via window.__leafletMap and listens for new ones via layeradd
  //    (parcels often load AFTER the 60s polling window expires).
  function patchOneRenderer(r){
    if (!r || r.__hitTestPatched) return false;
    if (typeof r._onClick !== "function") return false;
    if (typeof r._fireEvent !== "function") return false;
    try {
      r._onClick = function(t){
        var n = this._map.mouseEventToLayerPoint(t);
        var matches = [];
        for (var o = this._drawFirst; o; o = o.next){
          var e = o.layer;
          if (e.options.interactive && e._containsPoint(n)){
            if (("click" === t.type || "preclick" === t.type) && this._map._draggableMoved(e)) continue;
            matches.push(e);
          }
        }
        var winner = null;
        if (matches.length === 1) {
          winner = matches[0];
        } else if (matches.length > 1) {
          var bestArea = Infinity;
          for (var i = 0; i < matches.length; i++){
            var b = matches[i].getBounds();
            var a = (b.getNorth()-b.getSouth()) * (b.getEast()-b.getWest());
            if (a < bestArea){ bestArea = a; winner = matches[i]; }
          }
        }
        this._fireEvent(!!winner && [winner], t);
      };
      r.__hitTestPatched = true;
      return true;
    } catch(e){ return false; }
  }
  function patchCanvasHitTest(){
    var m = window.__leafletMap;
    if (!m || typeof m.eachLayer !== "function" || typeof m.on !== "function") return false;
    if (m.__hitTestListenerInstalled) return true;
    // Patch any renderers already on the map.
    m.eachLayer(function(l){
      var r = l.options && l.options.renderer;
      if (r) patchOneRenderer(r);
    });
    // Patch any future renderers as layers are added.
    m.on("layeradd", function(ev){
      var l = ev && ev.layer;
      var r = l && l.options && l.options.renderer;
      if (r) patchOneRenderer(r);
    });
    m.__hitTestListenerInstalled = true;
    return true;
  }

  var done = { mnt: false, setMode: false, inq: false, canvas: false };
  var tries = 0;
  var maxTries = 300; // 60s at 200ms

  function tick(){
    tries++;
    if (!done.mnt) done.mnt = aliasMNT();
    if (!done.setMode) done.setMode = wrapSetMode();
    if (!done.inq) done.inq = patchINQ();
    if (!done.canvas) done.canvas = patchCanvasHitTest();
    if (done.mnt && done.setMode && done.inq && done.canvas) {
      console.log('[Mapnova] Hot-fixes applied: MNT, activeTool, INQ, canvas hit-test (' + tries + ' ticks)');
      clearInterval(timer);
    } else if (tries >= maxTries) {
      console.warn('[Mapnova] Hot-fixes timeout. State: mnt=' + done.mnt + ' setMode=' + done.setMode + ' inq=' + done.inq + ' canvas=' + done.canvas);
      clearInterval(timer);
    }
  }

  function start(){
    tick(); // immediate first attempt
    return setInterval(tick, 200);
  }

  var timer;
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function(){ timer = start(); }, {once:true});
  } else {
    timer = start();
  }
})();
