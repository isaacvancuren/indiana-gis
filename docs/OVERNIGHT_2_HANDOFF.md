# Overnight Run #2 — Handoff

Generated: 2026-05-03 (early AM, ET)
Branch: `claude/overnight-1`
Base: `main` @ `80a5a7d` (the morning fix-batch you merged)
Status: 6 commits, branch pushed, **NOT merged to main**

## What's on this branch (read these in order)

| # | SHA | Title |
|---|-----|---|
| 1 | `93d2bcc` | Universal Clear + Save-to-Project buttons in every tool section |
| 2 | `5456463` | BEACON_APPS extended to all 92 IN counties via deterministic naming |
| 3 | `38cb1ac` | Direct Beacon button in parcel popup footer |
| 4 | `2c6f1e6` | Schneider WFS runtime auto-discovery for unconfigured IN counties |
| 5 | `febbaf2` | GDIT per-county catalog wired as fallback for non-IN states |
| 6 | (this doc) | Handoff |

## How to test

The branch needs Cloudflare Pages preview (or merge to main for production).

```bash
# Option A — local
git checkout claude/overnight-1
python -m http.server 8080
# open http://localhost:8080/

# Option B — merge to main when satisfied
git checkout main
git merge --ff-only claude/overnight-1
git push origin main
```

Or open PR https://github.com/isaacvancuren/indiana-gis/pull/new/claude/overnight-1
and use the Cloudflare Pages preview URL it generates.

## Per-commit detail

### 1. Universal Clear + Save-to-Project (`93d2bcc`)

Per your earlier feedback ("Universal actions that translate for each tool with similar options to clear them and save them to a project"), every tool section now has the same affordances laid out the same way:

- **Measurement**: `[Clear All]` + `[Save to Project]`
- **Draw & Annotate**: `[Clear All]` + `[Save to Project]`
- **Selection**: `[Clear]` + `[Save to Project]` + `[Delete (n)]`

Added `assets/mn-tool-actions.js` (idempotent, polls 1.5 s for late re-renders). The Save buttons reuse the existing project-features pipeline — they just bring saved actions out of buried per-row icons and into the tool toolbars.

Behavior: if no project is active, toasts "No active project. Open Projects (Saved tab) and Activate one first." If nothing is saveable, toasts "No measurements/drawings/parcels to save." Idempotent — items already saved (have `_projectFeatureId`) are skipped on subsequent saves.

### 2. BEACON_APPS expanded to all 92 IN counties (`5456463`)

`assets/county-metadata.js` previously had only 23 entries in `BEACON_APPS`. The other 69 counties got the DLGF fallback URL (search-by-PIN page) when you hit "Open in Beacon."

Schneider's Beacon URL is deterministic — `<CamelCaseCountyName>CountyIN`. Special cases: DeKalb, LaGrange, LaPorte, StJoseph (no spaces, mixed case). All 92 counties now have a Beacon entry. For counties Beacon doesn't actually publish, the link 404s gracefully — the existing Tier 1/2/3 fetch is unaffected.

### 3. Beacon button in parcel popup (`38cb1ac`)

The popup's footer used to have only PRC + Details + Close. Added a 4th button — Beacon (yellow) — that opens the Schneider Beacon property page in a new tab. Combined with #2, every county gets this affordance whether or not live owner data is wired.

### 4. Schneider WFS runtime auto-discovery (`2c6f1e6`)

`assets/mn-schneider-fallback.js` (new). Many IN counties on Beacon also expose a public parcels FeatureServer at the deterministic URL pattern:

```
https://wfs.schneidercorp.com/arcgis/rest/services/<CountyName>CountyIN_WFS/MapServer/<layer>/query
```

Without endpoint discovery I cannot pre-configure them all in `COUNTY_PARCEL_APIS`. So this module probes at runtime, in your browser, when you select a county that has no Tier 1/2/3 entry:

1. Compute camel-cased Beacon county name.
2. Fetch `<service>?f=json`. If 404, give up silently.
3. Walk candidate layers, prefer ones whose name contains "parcel".
4. For each candidate, fetch its layer schema. Match field names against known patterns (PIN_FIELDS, OWNER_FIELDS, etc.) — handles the half-dozen casing variants (pin_18, PARCEL_NUM, PARCEL_ID, PIN, PARCELID, etc.).
5. If a polygon layer with both PIN and Owner fields is found, build a `COUNTY_PARCEL_APIS`-shaped config and register it on `window`. The existing fetch pipeline picks it up immediately.
6. On success, toast "Live owner data activated for <County> (Schneider WFS)".
7. Cache result (positive or negative) in sessionStorage for 12 h.

Failure modes: silent. A county not on Schneider keeps showing IGIO-only data + the Beacon deep-link button.

**This is the highest-leverage commit on the branch.** Without testing each county individually, this unlocks live owner data for any IN county that publishes a Schneider WFS — automatically.

### 5. GDIT catalog wired as non-IN fallback (`febbaf2`)

Previously documented as missing in CLAUDE.md ("Per-county fetch router wiring. The mn-county-parcels.js exposes the catalog but the actual fetch interceptor in mn-states.js still uses Tier A logic only.") — now done.

When you pick a state with no statewide ESRI source AND a specific county is selected, the fetch interceptor in `mn-states.js` falls back to the per-county GDIT catalog (`window.MN_COUNTY_PARCELS`, populated by `mn-county-parcels.js`):

1. Look up county in catalog → get FeatureServer URL.
2. Probe layer schema (cached once per service).
3. Run an envelope query against the county's service.
4. Normalize response into the canonical feature shape.

Effect: any of the 16 Tier B states (AL, DE, GA, IL, KS, KY, LA, MI, MN, MO, NE, NM, OK, OR, SC, SD) can now display parcels for the active county without a per-county code update, as long as the county is in the GDIT catalog (1077 counties published nationwide).

**Border states this directly unlocks:** IL, KY, MI. (OH already has a statewide source.)

## What I deliberately did NOT do

- **Did not pre-add Schneider WFS configs for specific IN counties.** Without external network access I can't probe each one tonight. The runtime fallback in commit #4 is the safe path — fail-soft per county.
- **Did not push to main.** All work on `claude/overnight-1`. The morning-fix branch is still pristine on main. Merge when you're satisfied.
- **Did not touch unrelated code.** No refactors, no style consolidation, no dead-code cleanup. Each commit does one thing.
- **Did not work on tools beyond Save/Clear consistency.** The selection-tool fixes shipped this morning are correct per your "works for Bartholomew" confirmation. Touching the tool engine again without a specific complaint would risk regressing it.

## Known gaps to address in your morning review

1. **Verify Schneider auto-discovery on real Indiana counties.** Pick any county not in `COUNTY_PARCEL_APIS` — e.g., **Fayette, Huntington, Vigo, Delaware** — open the app on that county, click a parcel. If Schneider has a public WFS, you should see live owner data within ~3 s and a "Live owner data activated" toast. Console should log `[mn-schneider-fallback] auto-registered <county>`.
2. **Verify GDIT non-IN fallback on a border state.** Pick **IL**, then a county like **Cook**. Pan/zoom — parcels should render with owner data. (Caveat: GDIT catalog coverage isn't guaranteed per county.)
3. **Try the new Save-to-Project buttons.** Activate a project (Saved tab → Activate). Draw a polygon. Click "Save to Project" in the Draw section. Confirm the feature appears in the project's feature list (Saved tab) and persists across page refresh.
4. **Try the new Beacon button** on a county where the popup currently shows "see assessor" — the Beacon link should open the assessor record.

## Risk register

- **Schneider auto-discovery may match wrong layer.** If a county has multiple polygon layers with PIN+Owner fields (e.g., parcels + zoning + lots), the heuristic picks the first one with "parcel" in the name, else the first match. If a county selects the wrong layer, the workaround is an explicit override in `COUNTY_PARCEL_APIS`.
- **Schneider field-name detection is best-effort.** I included 14 PIN candidates and 9 owner candidates from the existing configs. A county with non-conforming field names will fail the probe (silent fallback to IGIO).
- **GDIT catalog probe runs at most once per service per session.** If a county's service is temporarily down on first probe, the negative result is cached for 12 h. Workaround: clear sessionStorage.
- **No automated tests.** Verify each batch manually before merging.

## Suggested next steps for tomorrow (you decide)

In rough priority order:

1. Merge `claude/overnight-1` to main if everything looks good.
2. For each Schneider auto-discovery success in real IN counties, copy the resolved config from `console.log` into `assets/county-parcel-apis.js` so it's deterministic instead of probed every session. Easy follow-up commits.
3. If border states (IL, KY, MI) work via GDIT, consider promoting common-use counties (e.g., Lake County IL, Jefferson County KY, Wayne County MI) to explicit `mn-state-sources.js` entries with verified field maps.
4. Consider whether to remove or polish the legacy `tool-active` / `select-active` CSS rules in `app.css` (lines 675-676). They're dead but defensive — `mn-tool-cursor.js` strips them as a safety net.
5. Consider strict CSP enforcement once `Content-Security-Policy-Report-Only` has collected enough field reports.
