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

  // 4. Map size sync: when the map container resizes (sidebar/popup opens),
  //    Leaflet`s internal pixel origin can drift from the DOM, causing clicks
  //    to land on parcels offset from where the user clicked. We observe the
  //    container with ResizeObserver and force a full view reset on each change.
  function patchMapSizeSync(){
    var m = window.__leafletMap;
    if (!m || typeof m.invalidateSize !== "function" || typeof m._resetView !== "function") return false;
    if (m.__sizeSyncInstalled) return true;
    var container = m.getContainer && m.getContainer();
    if (!container) return false;
    if (typeof ResizeObserver === "undefined") {
      // No ResizeObserver — fallback to window resize only (no improvement).
      m.__sizeSyncInstalled = true;
      return true;
    }
    var lastW = container.clientWidth;
    var lastH = container.clientHeight;
    var debounceTimer = null;
    function resync(){
      try {
        var c = m.getCenter();
        var z = m.getZoom();
        m.invalidateSize({pan: false, animate: false});
        // Force pixel origin and pane re-projection.
        m._resetView(c, z, true);
      } catch(e){ /* ignore */ }
    }
    var ro = new ResizeObserver(function(entries){
      var w = container.clientWidth, h = container.clientHeight;
      if (w === lastW && h === lastH) return;
      lastW = w; lastH = h;
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(resync, 80);
    });
        // Run an initial resync — handles the case where Leaflet`s internal size
    // has already drifted from DOM before this patch installed.
    function checkAndResync(){
      var w = container.clientWidth, h = container.clientHeight;
      var sz = m.getSize();
      if (w > 0 && h > 0 && (Math.abs(sz.x - w) > 1 || Math.abs(sz.y - h) > 1)) {
        resync();
      }
    }
    checkAndResync();
    // Also re-check periodically as a safety net for the first 30s after install,
    // since some app code may resize without our observer firing (e.g. mid-frame).
    var driftTicks = 0;
    var driftTimer = setInterval(function(){
      driftTicks++;
      checkAndResync();
      if (driftTicks >= 60) clearInterval(driftTimer);
    }, 500);
    ro.observe(container);
    m.__sizeSyncInstalled = true;
    m.__sizeSyncObserver = ro;
    return true;
  }

  var done = { mnt: false, setMode: false, inq: false, sizeSync: false };
  var tries = 0;
  var maxTries = 300; // 60s at 200ms

  function tick(){
    tries++;
    if (!done.mnt) done.mnt = aliasMNT();
    if (!done.setMode) done.setMode = wrapSetMode();
    if (!done.inq) done.inq = patchINQ();
    if (!done.sizeSync) done.sizeSync = patchMapSizeSync();
    if (done.mnt && done.setMode && done.inq && done.sizeSync) {
      console.log('[Mapnova] Hot-fixes applied: MNT, activeTool, INQ, map-size-sync (' + tries + ' ticks)');
      clearInterval(timer);
    } else if (tries >= maxTries) {
      console.warn('[Mapnova] Hot-fixes timeout. State: mnt=' + done.mnt + ' setMode=' + done.setMode + ' inq=' + done.inq + ' sizeSync=' + done.sizeSync);
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
