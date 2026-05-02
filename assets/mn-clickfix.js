/* Mapnova Click Precision Patch v5
 * Replaces canvas DOM click listener with strict point-in-polygon picker.
 * Falls back to closest-centroid when click is in a gap (no strict hit). */
(function() {
  if (window.__mnPreciseClickfixVersion === 5) return;
  window.__mnPreciseClickfixVersion = 5;

  function ringContainsLatLng(ring, lat, lng) {
    var inside = false;
    for (var i=0, j=ring.length-1; i<ring.length; j=i++) {
      var xi=ring[i].lng, yi=ring[i].lat, xj=ring[j].lng, yj=ring[j].lat;
      if (((yi>lat) !== (yj>lat)) && (lng < (xj-xi)*(lat-yi)/(yj-yi+1e-12) + xi)) inside = !inside;
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
      for (var i=0; i<ll.length; i++) {
        if (ringContainsLatLng(ll[i], latlng.lat, latlng.lng)) inside = !inside;
      }
      return inside;
    }
    for (var p=0; p<ll.length; p++) {
      var poly = ll[p];
      if (!Array.isArray(poly)) continue;
      var pIn = false;
      for (var q=0; q<poly.length; q++) {
        var r = poly[q];
        if (Array.isArray(r) && r.length && typeof r[0].lat === 'number') {
          if (ringContainsLatLng(r, latlng.lat, latlng.lng)) pIn = !pIn;
        }
      }
      if (pIn) return true;
    }
    return false;
  }

  function approxArea(layer) {
    if (!layer || !layer._bounds) return Infinity;
    var b = layer._bounds;
    return (b._northEast.lat - b._southWest.lat) * (b._northEast.lng - b._southWest.lng);
  }

  function makeListener(renderer) {
    var map = renderer._map;
    return function(t) {
      try {
        if (!map || !renderer._drawFirst) return;
        var containerPt = map.mouseEventToContainerPoint(t);
        var layerPt = map.containerPointToLayerPoint(containerPt);
        var latlng = map.layerPointToLatLng(layerPt);
        var tolHits = [], strictHits = [];
        var node = renderer._drawFirst;
        while (node) {
          var layer = node.layer;
          if (layer && layer.options && layer.options.interactive &&
              typeof layer._containsPoint === 'function' &&
              !(map._draggableMoved && map._draggableMoved(layer))) {
            try {
              if (layer._containsPoint(layerPt)) tolHits.push(layer);
              if (strictContainsLatLng(layer, latlng)) strictHits.push(layer);
            } catch(_e) {}
          }
          node = node.next;
        }
        var chosen = null;
        if (strictHits.length === 1) {
          chosen = strictHits[0];
        } else if (strictHits.length > 1) {
          chosen = strictHits[0];
          var bestA = approxArea(chosen);
          for (var k=1; k<strictHits.length; k++) {
            var a = approxArea(strictHits[k]);
            if (a < bestA) { chosen = strictHits[k]; bestA = a; }
          }
        } else if (tolHits.length > 0) {
          var bestL = null, bestD = Infinity;
          for (var m=0; m<tolHits.length; m++) {
            var lyr = tolHits[m];
            if (!lyr._bounds) continue;
            var c = lyr._bounds.getCenter();
            var cp = map.latLngToLayerPoint(c);
            var dx = cp.x - layerPt.x, dy = cp.y - layerPt.y;
            var d = dx*dx + dy*dy;
            if (d < bestD) { bestD = d; bestL = lyr; }
          }
          chosen = bestL;
        }
        if (t.type === 'click' || t.type === 'preclick') {
          renderer._fireEvent(chosen ? [chosen] : false, t);
        }
      } catch(_err) {}
    };
  }

  function patchRenderer(renderer) {
    if (!renderer || !renderer._container || !renderer._ctx) return false;
    if (renderer.__mnPreciseClickPatched === 5) return false;
    var canvas = renderer._container;
    if (renderer.__mnPreciseListener) {
      try { canvas.removeEventListener('click', renderer.__mnPreciseListener); } catch(_e){}
    }
    if (renderer.__mnOriginalClickRemoved !== true) {
      try {
        var old = renderer._onClick;
        if (old && typeof old === 'function') {
          canvas.removeEventListener('click', old);
        }
      } catch(_e){}
      renderer.__mnOriginalClickRemoved = true;
    }
    var fn = makeListener(renderer);
    canvas.addEventListener('click', fn, false);
    renderer.__mnPreciseListener = fn;
    renderer.__mnPreciseClickPatched = 5;
    return true;
  }

  function patchAll() {
    try {
      var maps = [];
      if (window.__leafletMap) maps.push(window.__leafletMap);
      for (var k in window) {
        try {
          var v = window[k];
          if (v && v._renderer && v._renderer._ctx && v.eachLayer) maps.push(v);
        } catch(_e){}
      }
      var seenR = new Set();
      for (var i=0; i<maps.length; i++) {
        var m = maps[i];
        if (!m || !m.eachLayer) continue;
        m.eachLayer(function(l) {
          if (l._renderer && l._renderer._ctx && !seenR.has(l._renderer)) {
            seenR.add(l._renderer);
            patchRenderer(l._renderer);
          }
        });
      }
    } catch(_e){}
  }

  function start() {
    patchAll();
    setInterval(patchAll, 700);
    try {
      if (window.__leafletMap && window.__leafletMap.on) {
        window.__leafletMap.on('layeradd', function(){ setTimeout(patchAll, 30); });
      }
    } catch(_e){}
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
