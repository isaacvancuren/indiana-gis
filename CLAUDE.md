# Mapnova / IndianaGIS — Claude Code Instructions

## Project Overview
Mapnova is a universal GIS mapping platform covering all 92 Indiana counties (and growing). Single-page app built on Leaflet.js, deployed as a static site to mapnova.org via Netlify (auto-deploys from GitHub `main`).

The product directive is: give users a single fast tool to inquire on any parcel, run measurements, draw annotations, and group everything into named projects that persist per user.

## File Layout (current reality, 2026-04)

The codebase has NOT been split out yet. Almost everything still lives in `index.html`.

- `index.html` (~553 KB, 9,084 lines) — entire app: HTML shell, inline `<style>`, all inline `<script>` blocks (Leaflet bootstrap, county configs, parcel layer engine, owner data tier resolution, Supabase auth, projects/bookmarks/history, MNTools/MNSelect/MNProjects modules, MNToolsImpl tool engine).
- `assets/mn-multiselect-projects.js` — extracted patch script that augments the inline modules. Loaded via `<script src="assets/mn-multiselect-projects.js" defer>` just before `</body>`. All future small additions/fixes should land here (or in similarly small extracted files) instead of growing `index.html`.
- `css/` — empty placeholder folder. All styles are still inline in `index.html`.
- `js/` — empty placeholder folder.
- `netlify.toml`, `CNAME` — deploy config.
- No build step. Files are served as-is.

The earlier version of this file claimed a clean `js/app.js` + `css/app.css` split. **That split does not exist yet.** When making changes, assume everything is in `index.html` unless you've grepped and confirmed otherwise.

## Editing index.html
At 553 KB, GitHub's web CodeMirror 6 editor virtualizes the file. `textContent` only shows the viewport (~1-2 KB). To edit reliably from the GitHub UI:

1. Navigate to `https://github.com/isaacvancuren/indiana-gis/edit/main/index.html`.
2. Wait for `.cm-editor` to appear.
3. Locate the EditorView via DOM probing (`view.state.doc`, `view.dispatch`).
4. Use `view.dispatch({changes: {from, to, insert}})` for surgical edits or full replacement.
5. Click the `Commit changes...` button (use `scrollIntoView()` first — it can be offscreen at negative y).

Do NOT rely on `document.execCommand('selectAll')` + paste — it leaves residue when CM6 hasn't materialized the full doc.

## Architecture (current globals)

### Top-level data
- `COUNTIES` — county key → `{lat, lng, zoom, fips, name, em?}`
- `EM_LAYER92` — ElevateMaps county → MapServer service name (Tier 1 owner data)
- `COUNTY_PARCEL_APIS` — county → ArcGIS REST endpoint config (Tier 2)
- `WTH_GIS` — county → WTH MapDotNet host (Tier 3)
- `BEACON_APPS` / `BEACON_IDS` — county → Beacon App config for PRC links

### Core functions
- `selectParcelLive(p, layer)` — primary entry point when a parcel is clicked in inquire mode. Updates `selectedParcel`, `selectedLayer`, `window._selectedLiveParcel`, then calls `loadLiveParcelPanel(p)`.
- `loadLiveParcelPanel(p)` — renders the right-hand parcel detail panel (PRC card, owner, address, etc.).
- `_buildParcelLayer(feature)` — builds a Leaflet layer with click + tooltip handlers for one parcel. The click handler reads the **legacy global** `activeTool` (NOT `MNTools.activeTool`) and only short-circuits for `select`, `select-rect`, `select-poly`. Anything else falls through to `selectParcelLive`.

### Modules (window globals)
- `MNTools` — tool registry. Public: `activeTool`, `measurements`, `annotations`, `selection`, `setMode(tool, btn)`, `returnToInquire()`, `start_meas_line`, `finish_meas_line`, `start_meas_area`, `finish_meas_area`, `start_draw_polygon`, `finish_draw_polygon`, `start_draw_polyline`, `finish_draw_polyline`, `start_sel_click`, `start_sel_box`, `start_sel_line`, `start_sel_poly`, `clearAllDrawings`, `clearSelection`, `deleteSelection`, `_addToSelection(layer)`, `_removeFromSelection(layer)`, `_handleMapClick`, `_handleMapDblClick`, `_findFeaturesInBounds`, `_findFeaturesIntersectingPolygon`, `_pointInPolygon`.
- `MNToolsImpl` — sentinel boolean signaling MNTools real impl was loaded.
- `MNSelect` — selection state. Public: `selected` (Map), `counter`, `keyFor(props, latlng)`, `add(layer, props, latlng)`, `remove(key)`, `toggle(layer, props, latlng)`, `clear()`, `deleteSelected()`, `updateBadge()`.
- `MNProjects` — Supabase-backed projects. Public: `state {current, drawnLayer, view}`, `open()`, `close()`, `newProject()`, `detail(id)`, `rename(id)`, `del(id)`, `share(id)`, `activate(id)`, `deactivate()`, `openCurrent()`, `flyToFeature(id)`, `delFeature(id)`, `relabel(id)`, `saveFeature(featureType, geom, properties, label)`, `_renderFeatures(feats)`, `_reloadCurrentLayer()`, `_ensureLayer()`, `_clearLayer()`.
- `MNHistory`, `MNBookmarks`, `MNNatFilter` — Supabase-backed user history, bookmarks, and national parcel filter.
- `MNInquiryList` (added by `assets/mn-multiselect-projects.js`) — multi-parcel inquiry list. Public: `items[]`, `add(parcel, layer)`, `remove(key)`, `clear()`, `flyTo(key)`, `openDetail(key)`, `addAllToProject()`, `openPanel()`, `closePanel()`, `render()`.

### Tool name conventions (IMPORTANT)
There are TWO active-tool variables and they use DIFFERENT name conventions:

- **Legacy global** `window.activeTool` — set by older measurement code. Values: `'distance'`, `'area'`, `'bearing'`, `'select'`, `'select-rect'`, `'select-poly'`, or null.
- **Modern** `MNTools.activeTool` — set by MNToolsImpl. Values: `'meas-line'`, `'meas-area'`, `'draw-polygon'`, `'draw-polyline'`, `'draw-rect'`, `'draw-circle'`, `'draw-text'`, `'sel-click'`, `'sel-box'`, `'sel-line'`, `'sel-poly'`, `'inquire'`, or null.

When gating "is a tool active?" you MUST check both. The legacy parcel click handler still uses the global. MNTools dispatch uses `MNTools.activeTool`.

## Owner Data Tiers
1. **Tier 1 ElevateMaps** — 19 counties — `getOwnershipConfig()` returns tier:1.
2. **Tier 2 ArcGIS REST** — 18 counties — `getOwnershipConfig()` returns tier:2.
3. **Tier 3 WTH MapDotNet** — additional counties.

## Supabase
- Client: `window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, ...)` — but the resulting client is held in a local `sb` const inside an IIFE, NOT exposed on window. Use the existing `MNProjects`/`MNBookmarks`/`MNHistory` APIs instead of trying to access the client directly.
- Tables in use:
  - `profiles` — user profiles
  - `avatars` — uploaded avatars
  - `user_history` — recent searches
  - `bookmarks` — saved bookmarks
  - `projects` — user-named projects (id, user_id, name, ...)
  - `project_features` — features in a project: `{id, project_id, user_id, feature_type, geom, properties, label, created_at}`. Common `feature_type` values: `parcel`, `measure_line`, `measure_area`, `shape_polygon`, `shape_line`.
  - `project_shares` — sharing config
  - `layer_preferences` — per-user layer toggles

## Active Issues (rolling)
1. `index.html` is 553 KB monolithic — every IDE/editor struggles. Progressive extraction recommended (next: split MNToolsImpl block into `assets/mn-tools-impl.js`).
2. IGIO returning null parcel IDs for some counties — spatial fallback needed.
3. PRC links — only Bartholomew has confirmed AppID (1130/28606). Others fall back to Beacon search page.

## Adding a New County
1. Add to `COUNTIES` map with lat/lng/zoom/fips/name.
2. Add to the appropriate tier (`EM_LAYER92`, `COUNTY_PARCEL_APIS`, or `WTH_GIS`).
3. Add to `BEACON_APPS` for PRC links.
4. Test: select county, zoom in, click a parcel, verify owner data loads.

## Deployment
- Netlify auto-deploys from GitHub `main`.
- Static files only, no build step.
- Cache-bust by appending `?v=...` to the page URL when testing manually.
- After committing, hard-reload the live site (`Ctrl+Shift+R`) or use a query string to bypass Netlify/browser cache.

## Conventions for future Claude work
- **Prefer extending `assets/mn-multiselect-projects.js` (or new sibling files in `assets/`) over editing `index.html`** for new features. Keep `index.html` edits to the minimum needed (e.g., adding a new `<script src>` tag).
- Wrap existing module methods rather than replacing them. Use `var orig = MNX.method.bind(MNX); MNX.method = function(...) { ...orig(...) }`.
- Always check both `window.activeTool` and `MNTools.activeTool` when gating behavior on "tool is active."
- Never try to call `MNProjects.saveFeature` without an active project — it will toast and return null.
- When adding a feature that touches Supabase, route through the existing `MNProjects` / `MNBookmarks` / `MNHistory` APIs; do not try to instantiate a new `createClient` call.
