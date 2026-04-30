/* ============================================================================
 * Mapnova Hot-Fixes (post-extraction)
 * ----------------------------------------------------------------------------
 * Addresses bugs identified after split-file refactor:
 *
 *   1. window.MNT alias - many index.html call-sites reference MNT.activeTool
 *      directly. Without this alias, those sites throw ReferenceError. The
 *      try/catch around them swallows the error, but the fallthrough behaviour
 *      bypasses tool-state checks. Aliasing MNT -> MNTools makes those checks
 *      work as intended.
 *
 *   2. activeTool global sync - MNTools.setMode updates this.activeTool but
 *      does not update the legacy top-level "activeTool" variable used by
 *      handleToolClick / map.on('click') in index.html. We patch setMode so
 *      both stay in sync, eliminating the dual-state desync.
 *
 *   3. INQ.add field-name coverage - the inquiry-list reader missed several
 *      real Marion / Tier-1 field names ("prop_add", "pid", "addr") and did
 *      not consult ownerCache for tier-1 enriched ownership. Re-wrap INQ.add
 *      to widen the field fallbacks and pull from ownerCache when available.
 * ========================================================================= */
(function(){
  'use strict';
  function whenReady(cb){
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', cb, {once:true});
    } else { cb(); }
  }

  whenReady(function(){
    var tries = 0;
    var t = setInterval(function(){
      tries++;
      if (window.MNTools && typeof window.MNTools === 'object') {
        clearInterval(t);
        applyFixes();
      } else if (tries > 200) {
        clearInterval(t);
      }
    }, 100);
  });

  function applyFixes(){
    /* Fix 1: alias MNT -> MNTools (idempotent) */
    if (!window.MNT) {
      try { window.MNT = window.MNTools; } catch(e){}
    }

    /* Fix 2: setMode sync of legacy activeTool global */
    try {
      var MNT = window.MNTools;
      if (MNT && typeof MNT.setMode === 'function' && !MNT.__legacySyncWrapped) {
        var origSetMode = MNT.setMode.bind(MNT);
        MNT.setMode = function(tool, btn){
          origSetMode(tool, btn);
          try { window.activeTool = tool || null; } catch(e){}
        };
        MNT.__legacySyncWrapped = true;
      }
    } catch(e){ console.warn('[mn-bugfixes] setMode wrap failed:', e); }

    /* Fix 3: widen INQ.add field-name fallbacks + ownerCache lookup */
    try {
      var INQ = window.MNInquiryList;
      if (INQ && typeof INQ.add === 'function' && !INQ.__fieldsPatched) {
        var origAdd = INQ.add.bind(INQ);
        INQ.add = function(parcelOrLayer, maybeLayer){
          var ret = origAdd(parcelOrLayer, maybeLayer);
          if (!ret) return ret;
          var item = INQ.items[INQ.items.length - 1];
          if (!item || !item.parcel) return ret;
          var p = item.parcel;
          var props = p.properties || p;
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
      }
    } catch(e){ console.warn('[mn-bugfixes] INQ.add patch failed:', e); }

    console.log('[Mapnova] Hot-fixes applied (MNT alias, activeTool sync, INQ field fallbacks)');
  }
})();
