/* Mapnova Click Precision Patch v7
 * Pixel-space strict point-in-polygon, true polygon-area tiebreak,
 * nearest-edge distance for tolerance fallback. */
(function() {
  if (window.__mnPreciseClickfixVersion === 7) return;
  window.__mnPreciseClickfixVersion = 7;

  // Even-odd ray cast over all rings of a polygon (handles holes & multipolygon
  // because Leaflet's _parts is a flat list of pixel-projected rings).
  function pointInParts(parts, x, y) {
    var inside = false;
    for (var i = 0; i < parts.length; i++) {
      var ring = parts[i];
      if (!ring || ring.length < 3) continue;
      for (var a = 0, b = ring.length - 1; a < ring.length; b = a++) {
        var xa = ring[a].x, ya = ring[a].y;
        var xb = ring[b].x, yb = ring[b].y;
        if (((ya > y) !== (yb > y)) &&
            (x < (xb - xa) * (y - ya) / ((yb - ya) || 1e-12) + xa)) {
          inside = !inside;
        }
      }
    }
    return inside;
  }

  // Shoelace area in pixel-space; sum |ring areas| works for tiebreak even with
  // holes because outer >> hole in practice. Result is always >= 0.
  function ringSignedArea(ring) {
    var a = 0;
    for (var i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      a += (ring[j].x + ring[i].x) * (ring[j].y - ring[i].y);
    }
    return Math.abs(a * 0.5);
  }
  function partsArea(parts) {
    var t = 0;
    for (var i = 0; i < parts.length; i++) {
      if (parts[i] && parts[i].length >= 3) t += ringSignedArea(parts[i]);
    }
    return t || Infinity;
  }

  function distSqToSegment(px, py, ax, ay, bx, by) {
    var dx = bx - ax, dy = by - ay;
    var len2 = dx * dx + dy * dy;
    if (len2 < 1e-12) {
      var ux = px - ax, uy = py - ay;
      return ux * ux + uy * uy;
    }
    var t = ((px - ax) * dx + (py - ay) * dy) / len2;
    if (t < 0) t = 0; else if (t > 1) t = 1;
    var qx = ax + t * dx, qy = ay + t * dy;
    var ex = px - qx, ey = py - qy;
    return ex * ex + ey * ey;
  }
  function nearestEdgeDistSq(parts, x, y) {
    var min = Infinity;
    for (var i = 0; i < parts.length; i++) {
      var ring = parts[i];
      if (!ring || ring.length < 2) continue;
      for (var j = 0, k = ring.length - 1; j < ring.length; k = j++) {
        var d = distSqToSegment(x, y, ring[j].x, ring[j].y, ring[k].x, ring[k].y);
        if (d < min) min = d;
      }
    }
    return min;
  }

  function isPolygonish(layer) {
    // Polygons (and MultiPolygons) get pixel-projected into _parts as an array
    // of rings. Polylines also have _parts but their "area" is 0 — they'll
    // never strict-contain a point and naturally fall to the edge fallback.
    return layer && layer._parts && layer._parts.length > 0 && layer.options;
  }

  function makeListener(renderer) {
    return function(ev) {
      try {
        var map = renderer._map;
        if (!map || !renderer._drawFirst) return;
        if (map._draggableMoved && map._draggableMoved(map)) return;

        var containerPt = map.mouseEventToContainerPoint(ev);
        var layerPt = map.containerPointToLayerPoint(containerPt);
        var x = layerPt.x, y = layerPt.y;

        var strict = [];
        var tol = [];
        var node = renderer._drawFirst;
        while (node) {
          var layer = node.layer;
          if (layer && layer.options && layer.options.interactive && isPolygonish(layer)) {
            var parts = layer._parts;
            if (pointInParts(parts, x, y)) {
              strict.push(layer);
            } else if (typeof layer._containsPoint === 'function') {
              try { if (layer._containsPoint(layerPt)) tol.push(layer); } catch (_e) {}
            }
          }
          node = node.next;
        }

        var chosen = null;
        if (strict.length === 1) {
          chosen = strict[0];
        } else if (strict.length > 1) {
          // Pick the smallest TRUE polygon (most specific). Stable.
          chosen = strict[0];
          var bestA = partsArea(chosen._parts);
          for (var i = 1; i < strict.length; i++) {
            var ai = partsArea(strict[i]._parts);
            if (ai < bestA - 1e-6) { bestA = ai; chosen = strict[i]; }
          }
        } else if (tol.length > 0) {
          // Click landed in a sliver gap. Pick the polygon whose EDGE is
          // closest. Centroid distance was the old heuristic and was wrong
          // for elongated parcels.
          chosen = tol[0];
          var bestD = nearestEdgeDistSq(chosen._parts, x, y);
          for (var j = 1; j < tol.length; j++) {
            var dj = nearestEdgeDistSq(tol[j]._parts, x, y);
            if (dj < bestD) { bestD = dj; chosen = tol[j]; }
          }
        }

        // Bypass Leaflet's default canvas _onClick for this event.
        if (ev.stopImmediatePropagation) ev.stopImmediatePropagation();

        if (ev.type === 'click' || ev.type === 'preclick') {
          renderer._fireEvent(chosen ? [chosen] : false, ev);
        }
      } catch (_err) {}
    };
  }

  function patchRenderer(renderer) {
    if (!renderer || !renderer._container || !renderer._ctx) return false;
    if (renderer.__mnPreciseClickPatched === 7) return false;
    var canvas = renderer._container;
    if (renderer.__mnPreciseListener) {
      try {
        canvas.removeEventListener('click', renderer.__mnPreciseListener, true);
        canvas.removeEventListener('click', renderer.__mnPreciseListener, false);
      } catch (_e) {}
    }
    var fn = makeListener(renderer);
    canvas.addEventListener('click', fn, true);
    renderer.__mnPreciseListener = fn;
    renderer.__mnPreciseClickPatched = 7;
    return true;
  }

  function patchAll() {
    try {
      var m = window.__leafletMap;
      if (!m || !m.eachLayer) return;
      var seen = new Set();
      m.eachLayer(function(l) {
        var r = l && l._renderer;
        if (r && r._ctx && !seen.has(r)) { seen.add(r); patchRenderer(r); }
      });
    } catch (_e) {}
  }

  function start() {
    patchAll();
    setInterval(patchAll, 700);
    try {
      if (window.__leafletMap && window.__leafletMap.on) {
        window.__leafletMap.on('layeradd', function() { setTimeout(patchAll, 30); });
      }
    } catch (_e) {}
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
