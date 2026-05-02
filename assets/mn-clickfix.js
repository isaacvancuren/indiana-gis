/* =================================================================
 * Mapnova Click Precision Patch (canvas-renderer level)
 * -------------------------------------------------------------------
 * Fixes the long-standing bug where clicking near a shared parcel
 * boundary selects the wrong parcel.
 *
 * Selection pipeline (verified in DevTools):
 *   1. User clicks on canvas
 *   2. Canvas DOM 'click' listener calls Leaflet's renderer._onClick
 *   3. _onClick iterates _drawFirst list and uses _containsPoint
 *      (a 4 px tolerance buffer) to pick a layer. LAST hit wins.
 *   4. _onClick fires 'click' on that layer
 *   5. Layer's click handler calls window.selectParcelLive(props, layer)
 *
 * The bug is at step 3: at any shared border two adjacent parcels
 * BOTH pass the tolerance test, so the last drawn one wins, which is
 * rarely the parcel under the cursor. Bounding-box checks elsewhere
 * (in the map-level click handler) cannot fix it because by then
 * 'click' has already fired on the wrong layer.
 *
 * Fix: replace the canvas DOM click listener with one that uses
 * strict point-in-polygon to pick the layer:
 *   - Strict matches (point inside polygon, no tolerance)
 *   - Among multiple strict matches, prefer smallest polygon area
 *   - If no strict match (point exactly on an edge), fall back to
 *     the last tolerance-hit layer (Leaflet's default behavior)
 * Then fire the 'click' event on the chosen layer (so the existing
 * layer handler runs and selectParcelLive is invoked normally).
 * ================================================================= */
(function () {
  'use strict';

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
      var inside = false;
      for (var i = 0; i < ll.length; i++) {
        var ring = ll[i];
        if (Array.isArray(ring) && ring.length && typeof ring[0].lat === 'number') {
          if (ringContainsLatLng(ring, latlng.lat, latlng.lng)) inside = !inside;
        }
      }
      return inside;
    }
    for (var p = 0; p < ll.length; p++) {
      var poly = ll[p];
      if (!Array.isArray(poly)) continue;
      var pIn = false;
      for (var q = 0; q < poly.length; q++) {
        var r = poly[q];
        if (Array.isArray(r) && r.length && typeof r[0].lat === 'number') {
          if (ringContainsLatLng(r, latlng.lat, latlng.lng)) pIn = !pIn;
        }
      }
      if (pIn) return true;
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

  function makePreciseHandler(renderer) {
    return function preciseOnClick(t) {
      try {
        var map = renderer._map;
        if (!map) return;
        var layerPoint = map.mouseEventToLayerPoint(t);
        var latlng = map.layerPointToLatLng(layerPoint);
        var tolHits = [];
        var strictHits = [];
        var node = renderer._drawFirst;
        while (node) {
          var layer = node.layer;
          if (layer && layer.options && layer.options.interactive &&
              typeof layer._containsPoint === 'function') {
            try {
              if (layer._containsPoint(layerPoint)) {
                if ((t.type === 'click' || t.type === 'preclick') &&
                    map._draggableMoved && map._draggableMoved(layer)) {
                  // dragged — skip
                } else {
                  tolHits.push(layer);
                  if (strictContainsLatLng(layer, latlng)) strictHits.push(layer);
                }
              }
            } catch (_e) {}
          }
          node = node.next;
        }
        var chosen = null;
        if (strictHits.length) {
          chosen = strictHits[0];
          var bestA = approxArea(chosen);
          for (var k = 1; k < strictHits.length; k++) {
            var a = approxArea(strictHits[k]);
            if (a < bestA) { chosen = strictHits[k]; bestA = a; }
          }
        } else if (tolHits.length) {
          chosen = tolHits[tolHits.length - 1];
        }
        renderer._fireEvent(chosen ? [chosen] : false, t);
      } catch (_err) {}
    };
  }

  function patchRenderer(renderer) {
    if (!renderer || renderer.__mnPreciseClickPatched) return false;
    var canvas = renderer._container;
    if (!canvas || canvas.tagName !== 'CANVAS' || !canvas._leaflet_events) return false;
    var evs = canvas._leaflet_events;
    var clickKey = null;
    for (var k in evs) {
      if (k.indexOf('click') === 0) { clickKey = k; break; }
    }
    if (!clickKey) return false;
    var oldHandler = evs[clickKey];
    var newHandler = makePreciseHandler(renderer);
    try {
      canvas.removeEventListener('click', oldHandler, false);
    } catch (_e) {}
    delete evs[clickKey];
    canvas.addEventListener('click', newHandler, false);
    renderer.__mnPreciseClickPatched = true;
    renderer.__mnPreciseClickHandler = newHandler;
    return true;
  }

  function patchAllRenderers() {
    var map = window.__leafletMap || window.map;
    if (!map || typeof map.eachLayer !== 'function') return 0;
    var count = 0;
    map.eachLayer(function (layer) {
      if (layer && layer._container && layer._container.tagName === 'CANVAS') {
        if (patchRenderer(layer)) count++;
      }
    });
    if (map.options && map.options.renderer) {
      if (patchRenderer(map.options.renderer)) count++;
    }
    return count;
  }

  // Initial patch attempt
  patchAllRenderers();

  // Poll for late-loading renderers (county layers can take a while)
  var ticks = 0;
  var iv = setInterval(function () {
    ticks++;
    var map = window.__leafletMap || window.map;
    if (map) patchAllRenderers();
    if (ticks > 480) clearInterval(iv);
  }, 500);

  // Patch new renderers as they appear
  function bindLayerAdd() {
    var map = window.__leafletMap || window.map;
    if (!map || typeof map.on !== 'function') return;
    if (map.__mnPreciseLayerAddBound) return;
    map.__mnPreciseLayerAddBound = true;
    map.on('layeradd', function () { setTimeout(patchAllRenderers, 0); });
  }
  bindLayerAdd();
  setInterval(bindLayerAdd, 1000);

  window.__mnPreciseClickfixVersion = 4;
})();
