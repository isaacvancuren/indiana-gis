/* Mapnova tool/inquire mode discipline v1
 *
 * Goal: the app is in inquire mode by default. Inquire mode = grab cursor,
 * click parcel to view info. Crosshair only when an explicit tool is active.
 *
 * This patch:
 *   1. Wraps window.selectParcelLive so it is a no-op while a tool is active.
 *      Prevents parcel popup from stealing clicks meant for measure/draw/select.
 *   2. Wraps legacy window.activateTool / window.clearMeasure to toggle the
 *      same #map.mn-tool-active class that MNT.setMode uses, so the cursor
 *      and CSS state stay consistent across legacy and modern tool engines.
 *   3. On boot, ensures the map starts in inquire mode (no class).
 */
(function(){
  if (window.__mnToolCursorVersion === 2) return;
  window.__mnToolCursorVersion = 2;

  function isToolActive() {
    try {
      if (window.MNTools && window.MNTools.activeTool) return true;
      if (window.activeTool) return true;
    } catch(_e){}
    return false;
  }
  function mapEl() { return document.getElementById('map'); }
  function setToolClass(on) {
    var el = mapEl();
    if (!el) return;
    if (on) el.classList.add('mn-tool-active');
    else el.classList.remove('mn-tool-active');
  }

  function wrapSelectParcel() {
    var orig = window.selectParcelLive;
    if (typeof orig !== 'function' || orig.__mnGated) return false;
    var gated = function(p, layer) {
      if (isToolActive()) return; // tool mode owns the click
      return orig.apply(this, arguments);
    };
    gated.__mnGated = true;
    window.selectParcelLive = gated;
    if (typeof window.selectParcel === 'function' && !window.selectParcel.__mnGated) {
      var origSel = window.selectParcel;
      var gatedSel = function(){ if (isToolActive()) return; return origSel.apply(this, arguments); };
      gatedSel.__mnGated = true;
      window.selectParcel = gatedSel;
    }
    return true;
  }

  function wrapLegacyActivate() {
    var orig = window.activateTool;
    if (typeof orig !== 'function' || orig.__mnClassToggled) return false;
    var wrapped = function(name, btn) {
      var r = orig.apply(this, arguments);
      setToolClass(!!name);
      return r;
    };
    wrapped.__mnClassToggled = true;
    window.activateTool = wrapped;

    if (typeof window.clearMeasure === 'function' && !window.clearMeasure.__mnClassToggled) {
      var origCM = window.clearMeasure;
      var wrappedCM = function(){
        var r = origCM.apply(this, arguments);
        setToolClass(false);
        return r;
      };
      wrappedCM.__mnClassToggled = true;
      window.clearMeasure = wrappedCM;
    }
    return true;
  }

  // Drift watchdog: keep #map class in sync with actual tool state. Also
  // strips stale inline cursor and pointer-events left behind by legacy code
  // paths (e.g. setBasemap variants, _cancelDraw forgetting a step). Self-
  // healing — runs 4x/sec, mutates only when state diverges.
  function syncDrift() {
    var el = mapEl();
    if (!el) return;
    var active = isToolActive();
    var have = el.classList.contains('mn-tool-active');
    if (active !== have) {
      if (active) el.classList.add('mn-tool-active');
      else el.classList.remove('mn-tool-active');
    }
    if (!active) {
      // Inline cursor wins over CSS — kill any stale tool-cursor.
      var cur = el.style.cursor;
      if (cur && (cur === 'crosshair' || cur === 'text' || cur === 'cell')) {
        el.style.cursor = '';
      }
      // Overlay pane must accept pointer events when no tool is running,
      // otherwise the parcel canvas (which lives in this pane) goes deaf.
      try {
        var op = document.querySelector('.leaflet-overlay-pane');
        if (op && op.style.pointerEvents === 'none') {
          op.style.pointerEvents = '';
        }
      } catch (_e) {}
    }
  }

  function start() {
    var tries = 0;
    var iv = setInterval(function(){
      tries++;
      var ok1 = wrapSelectParcel();
      var ok2 = wrapLegacyActivate();
      if ((ok1 && ok2) || tries > 60) clearInterval(iv);
    }, 250);
    setToolClass(false);
    setInterval(syncDrift, 250);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
