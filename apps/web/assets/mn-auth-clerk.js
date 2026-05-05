/* =============================================================================
 * Mapnova – Clerk auth + project store (v1)
 * ---------------------------------------------------------------------------
 * Replaces the Supabase-backed window.MNProjects with a new implementation:
 *   - Signed out  → localStorage (key: mn_projects_v2)
 *   - Signed in   → Cloudflare D1 via api.mapnova.org/api/projects
 *
 * On first Clerk sign-in, existing localStorage projects are uploaded via
 * POST /api/projects/bulk, then mn_projects_migrated is set.
 *
 * Requires: Clerk JS loaded from CDN (window.Clerk), publishable key injected
 * as window.__CLERK_PK by the Cloudflare Pages _middleware.js.
 * =========================================================================== */
(function () {
  'use strict'

  var API_BASE = 'https://api.mapnova.org'
  var LS_PROJECTS = 'mn_projects_v2'
  var LS_ACTIVE = 'mn_active_project_v2'
  var LS_MIGRATED = 'mn_projects_migrated'

  // ── localStorage helpers ─────────────────────────────────────────────────
  function lsGet(key, fallback) {
    try {
      var v = localStorage.getItem(key)
      return v ? JSON.parse(v) : fallback
    } catch (e) {
      return fallback
    }
  }
  function lsSet(key, val) {
    try { localStorage.setItem(key, JSON.stringify(val)) } catch (e) {}
  }

  // ── Clerk state ──────────────────────────────────────────────────────────
  var _clerk = null
  function isSignedIn() {
    return !!(_clerk && _clerk.user)
  }
  async function getToken() {
    if (!_clerk || !_clerk.session) throw new Error('Not signed in')
    return _clerk.session.getToken()
  }

  // ── API helper ───────────────────────────────────────────────────────────
  async function apiReq(path, opts) {
    var token = await getToken()
    var res = await fetch(API_BASE + path, Object.assign({}, opts, {
      headers: Object.assign({
        Authorization: 'Bearer ' + token,
        'Content-Type': 'application/json',
      }, (opts && opts.headers) || {}),
    }))
    if (!res.ok) {
      var text = await res.text()
      throw new Error(text || ('HTTP ' + res.status))
    }
    return res.json()
  }

  // ── Toast helper ─────────────────────────────────────────────────────────
  function toast(msg, ms) {
    var el = document.getElementById('mn-toast')
    if (!el) return
    el.textContent = msg
    el.classList.add('open')
    clearTimeout(window.__mnClerkToastT)
    window.__mnClerkToastT = setTimeout(function () { el.classList.remove('open') }, ms || 2400)
  }

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
    })
  }

  function fmtDate(ts) {
    try {
      var d = typeof ts === 'number' ? new Date(ts * 1000) : new Date(ts)
      return d.toLocaleString()
    } catch (e) { return '' }
  }

  function getLeafletMap() {
    return (typeof window.getLeafletMap === 'function' && window.getLeafletMap()) || window.map
  }

  function $(id) { return document.getElementById(id) }

  // ── localStorage store ───────────────────────────────────────────────────
  var lsStore = {
    list: function () { return Promise.resolve(lsGet(LS_PROJECTS, [])) },
    get: function (id) {
      return Promise.resolve(lsGet(LS_PROJECTS, []).find(function (p) { return p.id === id }) || null)
    },
    create: function (name, data) {
      var id = crypto.randomUUID()
      var now = Math.floor(Date.now() / 1000)
      var p = { id: id, name: name, data: Object.assign({ features: [], notes: '', settings: {} }, data || {}), created_at: now, updated_at: now }
      var ps = lsGet(LS_PROJECTS, [])
      ps.unshift(p)
      lsSet(LS_PROJECTS, ps)
      return Promise.resolve(p)
    },
    update: function (id, updates) {
      var ps = lsGet(LS_PROJECTS, [])
      var idx = ps.findIndex(function (p) { return p.id === id })
      if (idx === -1) return Promise.resolve(null)
      if (updates.name !== undefined) ps[idx].name = updates.name
      if (updates.data !== undefined) ps[idx].data = Object.assign({}, ps[idx].data, updates.data)
      ps[idx].updated_at = Math.floor(Date.now() / 1000)
      lsSet(LS_PROJECTS, ps)
      return Promise.resolve(ps[idx])
    },
    delete: function (id) {
      lsSet(LS_PROJECTS, lsGet(LS_PROJECTS, []).filter(function (p) { return p.id !== id }))
      return Promise.resolve()
    },
  }

  // ── API store ────────────────────────────────────────────────────────────
  var apiStore = {
    list: async function () {
      var r = await apiReq('/api/projects')
      return r.projects.map(function (p) {
        return Object.assign({}, p, { data: typeof p.data === 'string' ? JSON.parse(p.data) : p.data })
      })
    },
    get: async function (id) {
      var r = await apiReq('/api/projects/' + id)
      var p = r.project
      return Object.assign({}, p, { data: typeof p.data === 'string' ? JSON.parse(p.data) : p.data })
    },
    create: async function (name, data) {
      var r = await apiReq('/api/projects', {
        method: 'POST',
        body: JSON.stringify({ name: name, data: data || { features: [], notes: '', settings: {} } }),
      })
      var p = r.project
      return Object.assign({}, p, { data: typeof p.data === 'string' ? JSON.parse(p.data) : p.data })
    },
    update: async function (id, updates) {
      var r = await apiReq('/api/projects/' + id, {
        method: 'PATCH',
        body: JSON.stringify(updates),
      })
      var p = r.project
      return Object.assign({}, p, { data: typeof p.data === 'string' ? JSON.parse(p.data) : p.data })
    },
    delete: async function (id) {
      await apiReq('/api/projects/' + id, { method: 'DELETE' })
    },
  }

  function getStore() { return isSignedIn() ? apiStore : lsStore }

  // ── Migration: localStorage → D1 on first sign-in ───────────────────────
  async function maybeMigrate() {
    if (!isSignedIn() || localStorage.getItem(LS_MIGRATED)) return
    var local = lsGet(LS_PROJECTS, [])
    if (!local.length) { localStorage.setItem(LS_MIGRATED, '1'); return }

    try {
      var token = await getToken()
      var body = local.map(function (p) { return { id: p.id, name: p.name, data: p.data } })
      var res = await fetch(API_BASE + '/api/projects/bulk', {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (res.ok) {
        localStorage.setItem(LS_MIGRATED, '1')
        toast(local.length + ' project' + (local.length !== 1 ? 's' : '') + ' synced to your account.', 3500)
      }
    } catch (e) {
      console.warn('[Mapnova] Project migration failed:', e)
    }
  }

  // ── MNProjects implementation ────────────────────────────────────────────
  window.MNProjects = {
    state: { current: null, drawnLayer: null, view: 'list' },

    open: async function () {
      $('mn-projects-back').classList.add('open')
      this.state.view = 'list'
      $('mn-projects-title').textContent = 'My Projects'
      $('mn-projects-new-btn').style.display = ''
      $('mn-projects-body').innerHTML = '<div class="mn-empty">Loading&hellip;</div>'
      try {
        var ps = await getStore().list()
        if (!ps.length) {
          var hint = !isSignedIn()
            ? '<br><small style="color:#64748b;">Sign in to sync projects across devices.</small>'
            : ''
          $('mn-projects-body').innerHTML =
            '<div class="mn-empty"><i class="fas fa-folder-open" style="font-size:32px;color:#3b82f6;margin-bottom:12px;display:block;"></i>' +
            'No projects yet.<br><br>Click <strong>+ New Project</strong> to start.' + hint + '</div>'
          return
        }
        var self = this
        $('mn-projects-body').innerHTML =
          '<div class="mn-list">' + ps.map(function (p) { return self._rowHtml(p) }).join('') + '</div>'
      } catch (e) {
        $('mn-projects-body').innerHTML =
          '<div class="mn-empty" style="color:#fca5a5;">Error loading projects: ' + esc(e.message || e) + '</div>'
      }
    },

    _rowHtml: function (p) {
      var badge = isSignedIn()
        ? '<span style="font-size:10px;background:#10b981;color:#fff;padding:2px 6px;border-radius:3px;margin-left:6px;">SYNCED</span>'
        : '<span style="font-size:10px;background:#475569;color:#e2e8f0;padding:2px 6px;border-radius:3px;margin-left:6px;">LOCAL</span>'
      return (
        '<div class="mn-row" onclick="MNProjects.detail(\'' + p.id + '\')">' +
        '<div class="mn-row-icon"><i class="fas fa-folder"></i></div>' +
        '<div class="mn-row-main">' +
        '<div class="mn-row-title">' + esc(p.name) + badge + '</div>' +
        '<div class="mn-row-sub">Updated ' + esc(fmtDate(p.updated_at)) + '</div>' +
        '</div>' +
        '<div class="mn-row-actions">' +
        '<button onclick="event.stopPropagation();MNProjects.activate(\'' + p.id + '\')" title="Activate"><i class="fas fa-play"></i></button>' +
        '<button onclick="event.stopPropagation();MNProjects.del(\'' + p.id + '\')" title="Delete"><i class="fas fa-trash"></i></button>' +
        '</div></div>'
      )
    },

    close: function () { $('mn-projects-back').classList.remove('open') },

    newProject: async function () {
      var name = prompt('Project name:')
      if (!name || !name.trim()) return
      try {
        var p = await getStore().create(name.trim())
        toast('Project created.')
        this.activate(p.id)
        this.detail(p.id)
      } catch (e) { alert('Failed: ' + e.message) }
    },

    detail: async function (id) {
      $('mn-projects-title').textContent = 'Project Details'
      $('mn-projects-new-btn').style.display = 'none'
      $('mn-projects-body').innerHTML = '<div class="mn-empty">Loading&hellip;</div>'
      try {
        var p = await getStore().get(id)
        if (!p) { $('mn-projects-body').innerHTML = '<div class="mn-empty">Project not found.</div>'; return }
        var feats = (p.data && p.data.features) || []
        var featsHtml = feats.length
          ? feats.map(function (f) {
              var v = f.properties && f.properties.value ? esc(f.properties.value) : ''
              return (
                '<div class="mn-feature-row">' +
                '<span class="ftype">' + esc(f.feature_type) + '</span>' +
                '<input class="mn-input" style="padding:4px 8px;font-size:12px;flex:1;" value="' + esc(f.label || '') + '"' +
                ' onchange="MNProjects.relabel(\'' + p.id + '\',\'' + f.id + '\',this.value)"' +
                ' placeholder="Label this feature">' +
                '<span class="fvalue">' + v + '</span>' +
                '<button onclick="MNProjects.flyToFeature(\'' + p.id + '\',\'' + f.id + '\')" style="background:none;border:1px solid #2b3a52;color:#67e8f9;padding:3px 8px;border-radius:4px;font-size:10px;cursor:pointer;"><i class="fas fa-location-arrow"></i></button>' +
                '<button onclick="MNProjects.delFeature(\'' + p.id + '\',\'' + f.id + '\')" style="background:none;border:1px solid #7f1d1d;color:#fca5a5;padding:3px 6px;border-radius:4px;font-size:10px;cursor:pointer;"><i class="fas fa-times"></i></button>' +
                '</div>'
              )
            }).join('')
          : '<div class="mn-empty" style="padding:24px;">No features yet. Activate this project then use the map tools.</div>'

        $('mn-projects-body').innerHTML =
          '<div class="mn-proj-detail-head">' +
          '<div class="mn-row-icon" style="width:48px;height:48px;font-size:20px;"><i class="fas fa-folder-open"></i></div>' +
          '<div style="flex:1;"><h3>' + esc(p.name) + '</h3><div class="desc">Updated ' + esc(fmtDate(p.updated_at)) + '</div></div>' +
          '</div>' +
          '<div style="display:flex;gap:8px;margin-bottom:14px;flex-wrap:wrap;">' +
          '<button class="mn-btn mn-btn-primary" onclick="MNProjects.activate(\'' + p.id + '\');MNProjects.close();"><i class="fas fa-play"></i> Activate &amp; View on Map</button>' +
          '<button class="mn-btn" onclick="MNProjects.open()"><i class="fas fa-arrow-left"></i> Back</button>' +
          '<button class="mn-btn" onclick="MNProjects.rename(\'' + p.id + '\')"><i class="fas fa-edit"></i> Rename</button>' +
          '<button class="mn-btn mn-btn-danger" onclick="MNProjects.del(\'' + p.id + '\')"><i class="fas fa-trash"></i> Delete</button>' +
          '</div>' +
          '<div class="mn-label">Features (' + feats.length + ')</div>' +
          '<div style="margin-top:6px;">' + featsHtml + '</div>'
      } catch (e) {
        $('mn-projects-body').innerHTML =
          '<div class="mn-empty" style="color:#fca5a5;">Error: ' + esc(e.message || e) + '</div>'
      }
    },

    rename: async function (id) {
      var name = prompt('New name:')
      if (!name || !name.trim()) return
      try { await getStore().update(id, { name: name.trim() }); toast('Saved.'); this.detail(id) } catch (e) { alert(e.message) }
    },

    del: async function (id) {
      if (!confirm('Delete this project and all its features? This cannot be undone.')) return
      try {
        await getStore().delete(id)
        toast('Project deleted.')
        if (this.state.current === id) this.deactivate()
        this.open()
      } catch (e) { alert(e.message) }
    },

    activate: async function (id) {
      try {
        var p = await getStore().get(id)
        if (!p) return
        this.state.current = id
        $('mn-active-project-name').textContent = p.name
        $('mn-active-project').classList.add('open')
        this._renderFeatures((p.data && p.data.features) || [])
        toast('Project activated. Features will auto-save here.')
      } catch (e) { alert('Activate failed: ' + e.message) }
    },

    deactivate: function () {
      this.state.current = null
      var el = $('mn-active-project')
      if (el) el.classList.remove('open')
      this._clearLayer()
      toast('Project deactivated.')
    },

    openCurrent: function () {
      if (this.state.current) { this.detail(this.state.current); $('mn-projects-back').classList.add('open') }
    },

    _ensureLayer: function () {
      var m = getLeafletMap()
      if (!m) return null
      if (!this.state.drawnLayer) {
        this.state.drawnLayer = new L.FeatureGroup()
        m.addLayer(this.state.drawnLayer)
      }
      return this.state.drawnLayer
    },

    _clearLayer: function () {
      if (this.state.drawnLayer) this.state.drawnLayer.clearLayers()
    },

    _renderFeatures: function (feats) {
      var layer = this._ensureLayer()
      if (!layer) return
      layer.clearLayers()
      feats.forEach(function (f) {
        try {
          var geo = typeof f.geom === 'string' ? JSON.parse(f.geom) : f.geom
          if (!geo) return
          var style = (f.properties && f.properties.style) || {}
          var l
          if (geo.type === 'circle' && geo.center) {
            l = L.circle([geo.center[1], geo.center[0]], { radius: geo.radius, color: style.color || '#06b6d4', weight: style.weight || 3, fillOpacity: 0.2 })
          } else if (geo.type === 'marker') {
            l = L.marker([geo.coordinates[1], geo.coordinates[0]])
          } else {
            l = L.geoJSON(geo, { style: { color: style.color || '#06b6d4', weight: style.weight || 3, fillOpacity: 0.2 } })
          }
          if (f.label) l.bindTooltip(f.label, { permanent: true, direction: 'center', className: 'mn-feature-label' })
          l._mnFeatureId = f.id
          layer.addLayer(l)
        } catch (e) {}
      })
      try {
        var m = getLeafletMap()
        if (m && layer.getLayers().length) m.fitBounds(layer.getBounds(), { padding: [40, 40], maxZoom: 17 })
      } catch (e) {}
    },

    flyToFeature: async function (projectId, featureId) {
      try {
        var p = await getStore().get(projectId)
        if (!p) return
        var f = (p.data.features || []).find(function (x) { return x.id === featureId })
        if (!f) return
        var geo = typeof f.geom === 'string' ? JSON.parse(f.geom) : f.geom
        var m = getLeafletMap()
        if (!m) return
        var bounds
        if (geo.type === 'circle') bounds = L.latLng(geo.center[1], geo.center[0]).toBounds(geo.radius * 2)
        else { var tmp = L.geoJSON(geo); bounds = tmp.getBounds() }
        if (bounds && bounds.isValid()) { m.fitBounds(bounds, { padding: [40, 40], maxZoom: 18 }); this.close(); toast('Centered on feature.') }
      } catch (e) { alert('Failed: ' + e.message) }
    },

    delFeature: async function (projectId, featureId) {
      if (!confirm('Remove this feature from the project?')) return
      try {
        var p = await getStore().get(projectId)
        if (!p) return
        var newData = Object.assign({}, p.data, {
          features: (p.data.features || []).filter(function (f) { return f.id !== featureId }),
        })
        await getStore().update(projectId, { data: newData })
        if (this.state.current === projectId) {
          this.detail(projectId)
          var updated = await getStore().get(projectId)
          if (updated) this._renderFeatures(updated.data.features || [])
        }
        toast('Feature removed.')
      } catch (e) { alert(e.message) }
    },

    relabel: async function (projectId, featureId, label) {
      try {
        var p = await getStore().get(projectId)
        if (!p) return
        var newFeatures = (p.data.features || []).map(function (f) {
          return f.id === featureId ? Object.assign({}, f, { label: label }) : f
        })
        await getStore().update(projectId, { data: Object.assign({}, p.data, { features: newFeatures }) })
        if (this.state.drawnLayer) {
          this.state.drawnLayer.eachLayer(function (l) {
            if (l._mnFeatureId === featureId) {
              l.unbindTooltip()
              if (label) l.bindTooltip(label, { permanent: true, direction: 'center', className: 'mn-feature-label' })
            }
          })
        }
        toast('Label saved.')
      } catch (e) { alert(e.message) }
    },

    saveFeature: async function (featureType, geom, properties, label) {
      if (!this.state.current) {
        toast('No active project. Click Projects → Activate one first.', 3500)
        return null
      }
      try {
        var p = await getStore().get(this.state.current)
        if (!p) return null
        var fid = crypto.randomUUID()
        var newFeature = { id: fid, feature_type: featureType, geom: geom, properties: properties || {}, label: label || null }
        var newData = Object.assign({}, p.data, { features: (p.data.features || []).concat([newFeature]) })
        await getStore().update(this.state.current, { data: newData })
        toast('Saved to project.')
        // Add to map layer immediately
        var layer = this._ensureLayer()
        if (layer) {
          try {
            var geo = typeof geom === 'string' ? JSON.parse(geom) : geom
            var style = (properties && properties.style) || {}
            var l
            if (geo.type === 'circle' && geo.center) {
              l = L.circle([geo.center[1], geo.center[0]], { radius: geo.radius, color: style.color || '#06b6d4', weight: 3, fillOpacity: 0.2 })
            } else if (geo.type === 'marker') {
              l = L.marker([geo.coordinates[1], geo.coordinates[0]])
            } else {
              l = L.geoJSON(geo, { style: { color: style.color || '#06b6d4', weight: 3, fillOpacity: 0.2 } })
            }
            if (label) l.bindTooltip(label, { permanent: true, direction: 'center', className: 'mn-feature-label' })
            l._mnFeatureId = fid
            layer.addLayer(l)
          } catch (e) {}
        }
        return { id: fid }
      } catch (e) {
        toast('Save failed: ' + e.message, 3500)
        return null
      }
    },
  }

  // ── Clerk UI ─────────────────────────────────────────────────────────────
  function addClerkButton() {
    if ($('mn-clerk-btn')) return
    var btn = document.createElement('button')
    btn.id = 'mn-clerk-btn'
    btn.title = 'Sign in to sync projects'
    btn.onclick = function () {
      if (isSignedIn()) {
        if (confirm('Sign out of Mapnova?')) _clerk.signOut()
      } else {
        _clerk.openSignIn()
      }
    }

    var style = document.createElement('style')
    style.textContent = [
      '#mn-clerk-btn{',
      'position:fixed;top:8px;right:10px;z-index:9950;',
      'background:#1e293b;color:#e2e8f0;border:1px solid #334155;',
      'border-radius:8px;padding:5px 13px;font-size:13px;font-weight:600;',
      'cursor:pointer;display:flex;align-items:center;gap:7px;',
      'box-shadow:0 2px 8px rgba(0,0,0,.4);}',
      '#mn-clerk-btn:hover{background:#334155;}',
      '#mn-clerk-btn.signed-in{border-color:#10b981;color:#34d399;}',
    ].join('')
    document.head.appendChild(style)

    // Insert before the Supabase badge (top-right area)
    var badge = $('mn-user-badge')
    if (badge && badge.parentNode) {
      badge.parentNode.insertBefore(btn, badge)
    } else {
      document.body.appendChild(btn)
    }

    updateBtn(btn, null)
    return btn
  }

  function updateBtn(btn, user) {
    if (!btn) btn = $('mn-clerk-btn')
    if (!btn) return
    if (user) {
      var email = (user.primaryEmailAddress && user.primaryEmailAddress.emailAddress) || ''
      var name = email.split('@')[0] || 'Account'
      btn.innerHTML = '<i class="fas fa-user-check"></i> ' + esc(name)
      btn.classList.add('signed-in')
    } else {
      btn.innerHTML = '<i class="fas fa-user"></i> Sign in'
      btn.classList.remove('signed-in')
    }
  }

  // ── Bootstrap ─────────────────────────────────────────────────────────────
  async function init() {
    var pk = window.__CLERK_PK
    if (!pk) {
      console.log('[Mapnova] Clerk not configured (window.__CLERK_PK not set) — using localStorage for projects.')
      return // MNProjects already set above using anonymous store
    }

    if (!window.Clerk) {
      console.warn('[Mapnova] Clerk SDK not loaded — using localStorage for projects.')
      return
    }

    try {
      _clerk = new window.Clerk(pk)
      await _clerk.load()
      window.__clerkInstance = _clerk

      var btn = addClerkButton()

      _clerk.addListener(function (state) {
        updateBtn(btn, state.user)
        if (state.user && state.session) {
          maybeMigrate()
        }
      })

      updateBtn(btn, _clerk.user)
      if (_clerk.user && _clerk.session) {
        await maybeMigrate()
      }

      console.log('[Mapnova] Clerk auth ready. Signed in:', !!_clerk.user)
    } catch (e) {
      console.error('[Mapnova] Clerk init error:', e)
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init)
  } else {
    init()
  }
})()
