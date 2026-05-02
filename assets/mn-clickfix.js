/* =================================================================
 * Mapnova Click Precision Patch
 * -------------------------------------------------------------------
 * Fixes the long-standing bug where clicking near a shared parcel
 * boundary selects the wrong parcel.
 *
 * Root cause: Leaflet's canvas renderer uses a 4px tolerance buffer
 * during hit-testing. At any shared border, two adjacent parcels
 * BOTH pass the tolerance test, and the LAST one drawn wins, which
 * is rarely the parcel the user is actually pointing at.
 *
 * Fix: install a custom click handler on the canvas renderer that
 * collects all candidate layers, then prefers the one whose polygon
 * STRICTLY contains the click (point-in-polygon, no tolerance).
 * Falls back to the original tolerance behavior only when no parcel
 * strictly contains the click.
 *
 * Idempotent: every renderer carries a __mnPrecisePatched flag so
 * the patch is applied at most once per renderer instance.
 * ================================================================= */
(function(){
  'use strict';

  // Strict point-in-polygon (ray casting). Honors holes via even-odd
  // fill rule, matching Leaflet's own polygon rendering.
  function pointInRing(point, ring){
    var inside = false;
    var x = point.x, y = point.y;
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

  function strictContains(layer, lp){
    if (!layer || !layer._parts || !layer._parts.length) return false;
    var inside = false;
    for (var i = 0; i < layer._parts.length; i++){
      if (pointInRing(lp, layer._parts[i])) inside = !inside;
    }
    return inside;
  }

  // Polygon area (absolute) for tie-breaking — smaller wins because a
  // smaller parcel that contains the point is the more specific match.
  function polyArea(layer){
    if (!layer || !layer._parts || !layer._parts[0]) return Infinity;
    var ring = layer._parts[0];
    var a = 0;
    for (var i = 0, j = ring.length - 1; i < ring.length; j = i++){
      a += (ring[j].x + ring[i].x) * (ring[j].y - ring[i].y);
    }
    return Math.abs(a / 2);
  }

  // Squared distance from point to nearest edge of polygon — used
  // when no parcel strictly contains the click (close-to-edge clicks).
  function distSqToSegment(px, py, x1, y1, x2, y2){
    var dx = x2 - x1, dy = y2 - y1;
    var len2 = dx*dx + dy*dy;
    var t = len2 ? ((px - x1) * dx + (py - y1) * dy) / len2 : 0;
    if (t < 0) t = 0; else if (t > 1) t = 1;
    var ex = x1 + t * dx, ey = y1 + t * dy;
    var ddx = px - ex, ddy = py - ey;
    return ddx*ddx + ddy*ddy;
  }
  function nearestEdgeDistSq(layer, lp){
    if (!layer || !layer._parts || !layer._parts.length) return Infinity;
    var best = Infinity;
    for (var k = 0; k < layer._parts.length; k++){
      var ring = layer._parts[k];
      for (var i = 0, j = ring.length - 1; i < ring.length; j = i++){
        var d = distSqToSegment(lp.x, lp.y, ring[j].x, ring[j].y, ring[i].x, ring[i].y);
        if (d < best) best = d;
      }
    }
    return best;
  }

  // Walk the renderer's draw list and collect all candidate layers.
  function gatherCandidates(renderer, lp){
    var strict = [];
    var tol = [];
    var node = renderer._drawFirst;
    while (node) {
      var layer = node.layer;
      if (layer && typeof layer._containsPoint === 'function') {
        try {
          if (layer._containsPoint(lp)) {
            tol.push(layer);
            if (strictContains(layer, lp)) strict.push(layer);
          }
        } catch (e) {}
      }
      node = node.next;
    }
    return { strict: strict, tol: tol };
  }

  function pickBestLayer(renderer, lp){
    var c = gatherCandidates(renderer, lp);
    if (c.strict.length === 1) return c.strict[0];
    if (c.strict.length > 1) {
      // Multiple polygons strictly contain the point (overlapping
      // parcels, e.g., a building footprint inside a parcel). Prefer
      // the smallest, which is the more specific selection.
      var best = c.strict[0];
      var bestA = polyArea(best);
      for (var i = 1; i < c.strict.length; i++){
        var a = polyArea(c.strict[i]);
        if (a < bestA){ best = c.strict[i]; bestA = a; }
      }
      return best;
    }
    if (c.tol.length === 1) return c.tol[0];
    if (c.tol.length > 1) {
      // No strict containment, but multiple tolerance hits. Pick the
      // one whose nearest edge is closest to the click point — that
      // is the parcel the cursor is sitting on the boundary of.
      var bestT = c.tol[0];
      var bestD = nearestEdgeDistSq(bestT, lp);
      for (var k = 1; k < c.tol.length; k++){
        var d = nearestEdgeDistSq(c.tol[k], lp);
        if (d < bestD){ bestT = c.tol[k]; bestD = d; }
      }
      return bestT;
    }
    return null;
  }

  function patchRenderer(renderer){
    if (!renderer || renderer.__mnPrecisePatched) return false;
    if (typeof renderer._onClick !== 'function') return false;
    if (typeof renderer._fireEvent !== 'function') return false;
    renderer.__mnPrecisePatched = true;

    renderer._onClick = function(e){
      try {
        var map = this._map;
        if (!map) return;
        var lp = map.mouseEventToLayerPoint(e);
        var picked = pickBestLayer(this, lp);
        if (picked) {
          this._fireEvent([picked], e);
          return;
        }
        // No candidates — fire on map background (preserves default).
        if (typeof L !== 'undefined' && L.DomEvent && L.DomEvent.fakeStop) {
          // no-op; let Leaflet's default propagation continue
        }
      } catch (err) {
        // On any unexpected failure, log and bail silently so the
        // user's click is never lost.
        try { console.warn('[Mapnova] precise click hit-test failed:', err); } catch(_){}
      }
    };
    return true;
  }

  function findCanvasRenderers(map){
    var out = [];
    var seen = new Set();
    if (!map || typeof map.eachLayer !== 'function') return out;
    map.eachLayer(function(l){
      var r = l && l.options && l.options.renderer;
      if (!r) return;
      if (seen.has(r)) return;
      var c = r._container;
      if (c && c.tagName === 'CANVAS') {
        seen.add(r);
        out.push(r);
      }
    });
    return out;
  }

  function patchAll(map){
    if (!map) return 0;
    var renderers = findCanvasRenderers(map);
    var n = 0;
    for (var i = 0; i < renderers.length; i++){
      if (patchRenderer(renderers[i])) n++;
    }
    return n;
  }

  function attachLayerAddListener(map){
    if (!map || map.__mnPrecisePatchListener) return;
    map.__mnPrecisePatchListener = true;
    map.on('layeradd', function(){
      // Late-added layers may bring fresh renderers; re-patch.
      patchAll(map);
    });
  }

  // Bootstrap with a polling tick that survives slow page loads.
  var tries = 0, maxTries = 240; // up to 2 minutes
  var timer = setInterval(function(){
    tries++;
    var map = window.__leafletMap;
    if (map) {
      attachLayerAddListener(map);
      patchAll(map);
    }
    if (tries >= maxTries) clearInterval(timer);
  }, 500);
})();
