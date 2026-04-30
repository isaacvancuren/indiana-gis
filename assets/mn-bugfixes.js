/* ============================================================================
 * Mapnova Hot-Fixes (post-extraction)
 * ----------------------------------------------------------------------------
 * Addresses bugs identified after split-file refactor:
 *
 *   1. window.MNT alias - many index.html call-sites reference MNT.activeTool
 *      directly. Without this alias, those sites throw ReferenceError.
 *
 *   2. activeTool global sync - MNTools.setMode updates this.activeTool but
 *      not the legacy top-level "activeTool" variable used by handleToolClick
 *      / map.on('click') in index.html. We patch setMode so both stay in sync.
 *
 *   3. INQ.add field-name coverage - widen field fallbacks for parcel address
 *      and parcel id, and consult ownerCache for tier-1 enriched ownership.
 * ========================================================================= */
(function(){
  'use strict';

  function whenReady(cb){
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', cb, {once:true});
    } else { cb(); }
  }

  function applyMNTAlias(){
    if (!window.MNT && window.MNTools) {
      try { window.MNT = window.MNTools; } catch(e){}
    }
  }

  function applySetModeSync(){
    try {
      var MNT = window.MNTools;
      if (!MNT || typeof MNT.setMode !== 'function' || MNT.__legacySyncWrapped) return;
      var origSetMode = MNT.setMode.bind(MNT);
      MNT.setMode = function(tool, btn){
        origSetMode(tool, btn);
        try { window.activeTool = tool || null; } catch(e){}
      };
      MNT.__legacySyncWrapped = true;
    } catch(e){ console.warn('[mn-bugfixes] setMode wrap failed:', e); }
  }

  function applyINQPatch(){
    try {
      var INQ = window.MNInquiryList;
      if (!INQ || typeof INQ.add !== 'function' || INQ.__fieldsPatched) return false;
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
      return true;
    } catch(e){
      console.warn('[mn-bugfixes] INQ.add patch failed:', e);
      return false;
    }
  }

  whenReady(function(){
    var tries = 0;
    var t = setInterval(function(){
      tries++;
      var mntReady = window.MNTools && typeof window.MNTools === 'object';
      var inqReady = window.MNInquiryList && typeof window.MNInquiryList.add === 'function';
      if (mntReady) {
        applyMNTAlias();
        applySetModeSync();
      }
      if (inqReady) {
        applyINQPatch();
      }
      if (mntReady && (inqReady || window.MNInquiryList && window.MNInquiryList.__fieldsPatched)) {
        clearInterval(t);
        console.log('[Mapnova] Hot-fixes applied (MNT alias, activeTool sync, INQ field fallbacks)');
      } else if (tries > 400) {
        // Apply whatever we got
        if (mntReady) console.log('[Mapnova] Hot-fixes partial (MNT alias + setMode only — INQ never appeared)');
        clearInterval(t);
      }
    }, 100);
  });
})();
