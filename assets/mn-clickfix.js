/* =================================================================
 * Mapnova Click Precision Patch (DOM-level)
 * -------------------------------------------------------------------
 * Fixes the long-standing bug where clicking near a shared parcel
 * boundary selects the wrong parcel.
 *
 * Root cause: Leaflet's canvas renderer uses a 4 px tolerance buffer
 * when hit-testing polygons. At any shared border two adjacent parcels
 * BOTH pass the tolerance test, and the LAST one in the draw list
 * wins, which is rarely the parcel the user is actually pointing at.
 *
 * Fix: replace the canvas DOM `click` handler with a precise picker
 * that:
 *   1. Collects all candidate layers (tolerance buffer + draw order).
 *   2. Prefers the one whose polygon STRICTLY contains the click
 *      (point-in-polygon, no tolerance).
 *   3. Among multiple strict matches (overlapping parcels) prefers
 *      the smallest area — the more specific selection.
 *   4. If no parcel strictly contains the click, falls back to the
 *      tolerance candidate whose nearest edge is closest to the
 *      click — the parcel the cursor is sitting on the boundary of.
 *
 * The DOM-level binding is intentional. `renderer._onClick` is bound
 * once at `_initContainer` time as a DOM event listener, so simply
 * reassigning `renderer._onClick` does NOT change the active handler.
 * We must remove the original DOM listener and install our own.
 *
 * Idempotent: every renderer carries a __mnPreciseClickHooked flag
 * so the patch is applied at most once per renderer instance.
 * ================================================================= */
(function () {
  'use strict';

  function pointInRing(point, ring) {
    var inside = false, x = point.x, y = point.y;
    for (var i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      var xi = ring[i].x, yi = ring[i].y;
      var xj = ring[j].x, yj = ring[j].y;
      var denom = (yj - yi) || 1e-12;
      var intersect = ((yi > y) !== (yj > y)) &&
        (x < (xj - xi) * (y - yi) / denom + xi);
      if (intersect) inside = !inside;
    }
    return inside;
  }

  function strictContains(layer, lp) {
    if (!layer || !layer._parts || !layer._parts.length) return false;
    var inside = false;
    for (var i = 0; i < layer._parts.length; i++) {
      if (pointInRing(lp, layer._parts[i])) inside = !inside;
    }
    return inside;
  }

  function polyArea(layer) {
    if (!layer || !layer._parts || !layer._parts[0]) return Infinity;
    var ring = layer._parts[0], a = 0;
    for (var i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      a += (ring[j].x + ring[i].x) * (ring[j].y - ring[i].y);
    }
    return Math.abs(a / 2);
  }

  function distSqToSegment(px, py, x1, y1, x2, y2) {
    var dx = x2 - x1, dy = y2 - y1;
    var len2 = dx * dx + dy * dy;
    var t = len2 ? ((px - x1) * dx + (py - y1) * dy) / len2 : 0;
    if (t < 0) t = 0; else if (t > 1) t = 1;
    var ex = x1 + t * dx, ey = y1 + t * dy;
    var ddx = px - ex, ddy = py - ey;
    return ddx * ddx + ddy * ddy;
  }

  function nearestEdgeDistSq(layer, lp) {
    if (!layer || !layer._parts || !layer._parts.length) return Infinity;
    var best = Infinity;
    for (var k = 0; k < layer._parts.length; k++) {
      var ring = layer._parts[k];
      for (var i = 0, j = ring.length - 1; i < ring.length; j = i++) {
        var d = distSqToSegment(lp.x, lp.y,
          ring[j].x, ring[j].y, ring[i].x, ring[i].y);
        if (d < best) best = d;
      }
    }
    return best;
  }

  function pickBestLayer(renderer, lp) {
    var strict = [], tol = [];
    var node = renderer._drawFirst;
    while (node) {
      var layer = node.layer;
      if (layer && layer.options && layer.options.interactive &&
          typeof layer._containsPoint === 'function') {
        try {
          if (layer._containsPoint(lp)) {
            tol.push(layer);
            if (strictContains(layer, lp)) strict.push(layer);
          }
        } catch (e) {}
      }
      node = node.next;
    }
    if (strict.length === 1) return strict[0];
    if (strict.length > 1) {
      var bestS = strict[0], bestA = polyArea(bestS);
      for (var i = 1; i < strict.length; i++) {
        var a = polyArea(strict[i]);
        if (a < bestA) { bestS = strict[i]; bestA = a; }
      }
      return bestS;
    }
    if (tol.length === 1) return tol[0];
    if (tol.length > 1) {
      var bestT = tol[0], bestD = nearestEdgeDistSq(bestT, lp);
      for (var k = 1; k < tol.length; k++) {
        var d = nearestEdgeDistSq(tol[k], lp);
        if (d < bestD) { bestT = tol[k]; bestD = d; }
      }
      return bestT;
    }
    return null;
  }

  function makeHandler(renderer) {
    return function (e) {
      try {
        var map = renderer._map;
        if (!map) return;
        var lp = map.mouseEventToLayerPoint(e);
        var picked = pickBestLayer(renderer, lp);
        if (picked && typeof renderer._fireEvent === 'function') {
          renderer._fireEvent([picked], e);
        }
        // If nothing matches, do not fire — the click was on the map
        // background and Leaflet's other handlers (map click) will run.
      } catch (err) {
        try { console.warn('[Mapnova] precise click failed:', err); } catch (_) {}
      }
    };
  }

  function patchRenderer(renderer) {
    if (!renderer || renderer.__mnPreciseClickHooked) return false;
    var c = renderer._container;
    if (!c || c.tagName !== 'CANVAS') return false;
    var evs = c._leaflet_events;
    if (!evs) return false;

    // Find the original click listener key (Leaflet stores it as
    // "click<eventId>_<targetId>"). Remove it so our handler is the
    // sole click responder for this canvas.
    var clickKey = null;
    for (var k in evs) {
      if (k.indexOf('click') === 0 && typeof evs[k] === 'function') {
        clickKey = k;
        break;
      }
    }
    if (!clickKey) return false;

    var original = evs[clickKey];
    try { c.removeEventListener('click', original, false); } catch (e) {}
    delete evs[clickKey];

    var handler = makeHandler(renderer);
    c.addEventListener('click', handler, false);

    renderer.__mnPreciseClickHooked = true;
    renderer.__mnPreciseHandler = handler;
    return true;
  }

  function findCanvasRenderers(map) {
    var seen = new Set(), out = [];
    if (!map || typeof map.eachLayer !== 'function') return out;
    map.eachLayer(function (l) {
      var r = l && l.options && l.options.renderer;
      if (!r || seen.has(r)) return;
      var c = r._container;
      if (c && c.tagName === 'CANVAS') {
        seen.add(r);
        out.push(r);
      }
    });
    return out;
  }

  function patchAll(map) {
    if (!map) return 0;
    var rs = findCanvasRenderers(map), n = 0;
    for (var i = 0; i < rs.length; i++) if (patchRenderer(rs[i])) n++;
    return n;
  }

  function attachLayerAddListener(map) {
    if (!map || map.__mnPreciseClickListener) return;
    map.__mnPreciseClickListener = true;
    map.on('layeradd', function () { patchAll(map); });
  }

  // Bootstrap with a polling tick that survives slow page loads.
  // Runs for up to 4 minutes (480 ticks at 500 ms) so that county
  // GIS layers loaded after the initial map are also patched.
  var tries = 0, maxTries = 480;
  var timer = setInterval(function () {
    tries++;
    var map = window.__leafletMap;
    if (map) {
      attachLayerAddListener(map);
      patchAll(map);
    }
    if (tries >= maxTries) clearInterval(timer);
  }, 500);
})();
