/* =================================================================
 * Mapnova Click Precision Patch (map-event-level)
 * -------------------------------------------------------------------
 * Fixes the long-standing bug where clicking near a shared parcel
 * boundary selects the wrong parcel.
 *
 * Root cause (real this time): The map-level click handler installed
 * by index.html does a coarse bounding-box hit test:
 *
 *   layer.eachLayer(function(f){
 *     if (f.getBounds().contains(clickPt)) hitFeature = f;
 *   });
 *
 * Because parcel bounding boxes overlap heavily, this picks whichever
 * parcel is iterated first whose bbox contains the click — almost
 * never the one the user is pointing at near boundaries.
 *
 * Fix: Replace that handler with one that does strict point-in-polygon
 * testing. Among multiple strict matches (overlapping polygons) it
 * prefers the smallest area. If no strict match (point exactly on
 * shared edge) it falls back to the bbox candidate whose nearest
 * vertex is closest to the click point.
 *
 * Earlier patches operated on the canvas-renderer DOM click — which
 * is NOT in the active selection pipeline. That work was ineffective.
 * This patch targets the actual handler that selects parcels.
 * ================================================================= */
(function () {
  'use strict';
  if (window.__mnPreciseMapClickInstalled) return;

  function ringContainsLatLng(ring, lat, lng) {
    var inside = false;
    var prev = ring[ring.length - 1];
    for (var i = 0; i < ring.length; i++) {
      var cur = ring[i];
      if (((cur.lat > lat) !== (prev.lat > lat)) &&
          (lng < (prev.lng - cur.lng) * (lat - cur.lat) / (prev.lat - cur.lat) + cur.lng)) {
        inside = !inside;
      }
      prev = cur;
    }
    return inside;
  }

  function strictContainsLatLng(layer, latlng) {
    if (!layer || !layer._latlngs) return false;
    var ll = layer._latlngs;
    if (!Array.isArray(ll) || !ll.length) return false;
    var first = ll[0];
    if (!Array.isArray(first) || !first.length) return false;
    if (typeof first[0].lat === 'number') {
      // Single polygon (possibly with holes): ll = [outerRing, hole1, ...]
      var inside = false;
      for (var i = 0; i < ll.length; i++) {
        var ring = ll[i];
        if (Array.isArray(ring) && ring.length && typeof ring[0].lat === 'number') {
          if (ringContainsLatLng(ring, latlng.lat, latlng.lng)) inside = !inside;
        }
      }
      return inside;
    }
    // Multi-polygon: ll = [[outer, hole...], [outer, hole...]]
    for (var p = 0; p < ll.length; p++) {
      var poly = ll[p];
      if (!Array.isArray(poly)) continue;
      var pInside = false;
      for (var q = 0; q < poly.length; q++) {
        var r = poly[q];
        if (Array.isArray(r) && r.length && typeof r[0].lat === 'number') {
          if (ringContainsLatLng(r, latlng.lat, latlng.lng)) pInside = !pInside;
        }
      }
      if (pInside) return true;
    }
    return false;
  }

  function getOuterRing(layer) {
    var ll = layer && layer._latlngs;
    if (!Array.isArray(ll) || !ll.length) return null;
    var first = ll[0];
    if (!Array.isArray(first) || !first.length) return null;
    if (typeof first[0].lat === 'number') return first;
    if (Array.isArray(first[0]) && first[0].length && typeof first[0][0].lat === 'number') return first[0];
    return null;
  }

  function approxArea(layer) {
    var ring = getOuterRing(layer);
    if (!ring) return Infinity;
    var a = 0;
    for (var i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      a += (ring[j].lng + ring[i].lng) * (ring[j].lat - ring[i].lat);
    }
    return Math.abs(a / 2);
  }

  function nearestVertexDistSq(layer, latlng) {
    var ring = getOuterRing(layer);
    if (!ring) return Infinity;
    var best = Infinity;
    for (var i = 0; i < ring.length; i++) {
      var dy = ring[i].lat - latlng.lat;
      var dx = ring[i].lng - latlng.lng;
      var d = dy * dy + dx * dx;
      if (d < best) best = d;
    }
    return best;
  }

  function makePreciseHandler(map) {
    return function preciseClickHandler(e) {
      try {
        if (window.activeTool) {
          if (typeof window.handleToolClick === 'function') {
            window.handleToolClick(e.latlng.lat, e.latlng.lng);
          }
          return;
        }
        var click = e.latlng;
        var strictHits = [];
        var bboxHits = [];
        map.eachLayer(function (layer) {
          if (!layer || !layer._layers || typeof layer.eachLayer !== 'function') return;
          layer.eachLayer(function (f) {
            if (!f || typeof f.getBounds !== 'function') return;
            try {
              var hasData = (f.feature && f.feature.properties) || f.parcelData;
              if (!hasData) return;
              var b = f.getBounds();
              if (!b.contains(click)) return;
              bboxHits.push(f);
              if (strictContainsLatLng(f, click)) strictHits.push(f);
            } catch (_e) {}
          });
        });

        var hit = null;
        if (strictHits.length) {
          hit = strictHits[0];
          var bestArea = approxArea(hit);
          for (var i = 1; i < strictHits.length; i++) {
            var a = approxArea(strictHits[i]);
            if (a < bestArea) { hit = strictHits[i]; bestArea = a; }
          }
        } else if (bboxHits.length) {
          hit = bboxHits[0];
          var bestD = nearestVertexDistSq(hit, click);
          for (var j = 1; j < bboxHits.length; j++) {
            var d = nearestVertexDistSq(bboxHits[j], click);
            if (d < bestD) { hit = bboxHits[j]; bestD = d; }
          }
        }

        if (hit && typeof window.selectParcelLive === 'function') {
          var p = (hit.feature && hit.feature.properties) || hit.parcelData || {};
          hit.parcelData = p;
          window.selectParcelLive(p, hit);
        }
      } catch (_err) {}
    };
  }

  function tryInstall() {
    var map = window.__leafletMap || window.map;
    if (!map || !map._events || !Array.isArray(map._events.click)) return false;
    var handlers = map._events.click;
    var replaced = 0;
    for (var i = 0; i < handlers.length; i++) {
      var src = '';
      try { src = (handlers[i].fn || function () {}).toString(); } catch (_e) {}
      if (src.indexOf('getBounds().contains(clickPt)') !== -1 ||
          src.indexOf('getBounds().contains(click') !== -1) {
        handlers[i].fn = makePreciseHandler(map);
        replaced++;
      }
    }
    if (replaced > 0) {
      window.__mnPreciseMapClickInstalled = true;
      window.__mnPreciseMapClickCount = replaced;
      return true;
    }
    return false;
  }

  // Try immediately, then poll for up to 4 minutes (handlers may register late).
  if (!tryInstall()) {
    var ticks = 0;
    var iv = setInterval(function () {
      ticks++;
      if (tryInstall() || ticks > 480) clearInterval(iv);
    }, 500);
  }

  // Also re-check on every map load/layer add in case the handler is
  // re-bound by some downstream code.
  function rebindCheck() {
    if (window.__mnPreciseMapClickInstalled) return;
    tryInstall();
  }
  document.addEventListener('DOMContentLoaded', rebindCheck);
  window.addEventListener('load', rebindCheck);
})();
