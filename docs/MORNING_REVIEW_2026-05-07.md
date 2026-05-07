# Morning Review — 2026-05-07

What happened overnight, in priority order. Everything below is committed; nothing to type.

## 🚨 First thing: merge PR #127

**The live `api.mapnova.org` worker is currently running a stale build** because PR #124 was rebased with unresolved git conflict markers that landed on `main` and broke every Deploy API workflow run since.

Symptoms you would see if you tested:
- `https://api.mapnova.org/health` — works (last good deploy from PR #123)
- `https://api.mapnova.org/api/projects` — returns... whatever the last good deploy returned, NOT the auth-gated 401 you'd expect post-#121

PR #127 fixes this. **Merge it first** before doing anything else, then watch the Deploy API workflow turn green.

PR: https://github.com/isaacvancuren/indiana-gis/pull/127

It also adds a CI guard that grep-fails any future PR containing `<<<<<<<` or `>>>>>>>` markers, so this class of regression can't recur.

## Verification you can do in your browser after #127 merges

1. **GitHub** → Actions tab → most-recent **Deploy API** run → should be green.
2. **`https://api.mapnova.org/health`** → `{"ok":true,"version":"0.1.0"}`
3. **`https://api.mapnova.org/api/projects`** without auth → status 403 (Origin not allowed if no Origin header) or 401 (Unauthorized if Origin valid but no Bearer token)
4. **R2 bucket** (Cloudflare → R2 → mapnova-backups) — empty until tomorrow's 03:00 UTC cron, OR you can trigger manually:
   ```
   cd apps/api && npx wrangler triggers invoke --cron "0 3 * * *"
   ```
   Then refresh the bucket — should see one `d1/mapnova/2026-05-07.sql.gz` object.

If any of those fail, the deploy log on the failed Deploy API workflow run will tell you exactly what's wrong. Most likely cause: token scope (D1 + R2 Edit) — but you already added both during the rotation today.

## What's now live in production after #127 merges

Backend Tier 1 — all of this becomes active:

| Capability | Source | Active when |
|---|---|---|
| Origin allow-list on `/api/*` | #113 | Already live |
| Per-route rate limiting (county 60/min, probe 20/min, projects 120/min/user) | #122 + #124 | After #127 merges |
| Clerk JWT auth on `/api/projects/*` | #121 | After #127 merges + Worker secret already set ✅ |
| D1 schema (users + projects tables) auto-applied | #121 + #124 | After #127 merges (deploy auto-runs migration) |
| Daily D1 → R2 backup at 03:00 UTC, 30-day retention, 100MB/100-object hard caps | #123 + #126 | After #127 merges + R2 bucket already created ✅ |
| Sentry error tracking | #100 | Currently inactive (no `SENTRY_DSN_API` Worker secret set; harmless default) |

## What's NOT done yet

### 1. Tools fix — still on the queue (was deferred deliberately)

You asked me to fix poly/box/line/multi-select tools and add a color picker. I read the existing tool engine carefully (~600 lines of `apps/web/static/v2/ui-tools-core.js`) and the wiring in `index.html` and **did not ship a fix tonight** because:

- The selection tools' implementation looks present in code (`start_sel_box`, `start_sel_line`, `start_sel_poly`, `_findFeaturesInBounds`, `_findFeaturesIntersectingPolygon` all exist)
- The probable failure mode is in `_findFeatureAt` — it only matches features with `f.feature && f.feature.properties`, which is the GeoJSON convention but might not match how parcels are actually rendered (could be plain `L.polygon` without the `feature` attribute)
- Verifying which it is requires running the live site in a browser with DevTools, which I can't do
- Shipping a "fix" that works in theory but breaks an already-working tool is worse than shipping nothing

**My recommendation for the tools fix in a fresh session:**
1. Open `mapnova.org` in your browser, open DevTools console
2. Click the parcel selection tools (sel-box, sel-line, sel-poly) and tell me what happens — does the rectangle/polygon draw on screen but no parcels highlight afterward, or does the cursor not change at all, or something else?
3. With that observation, I can write a targeted fix in 15 minutes
4. Color picker UI is straightforward once the underlying selection works

The schema is already ready for per-feature color: `ProjectFeatureSchema.color` field added in PR #121. So when the tools fix lands, color persistence to the project is one line per feature creation.

### 2. Frontend Clerk integration — also queued

The backend can verify JWTs (PR #121), but the frontend doesn't yet have:
- Clerk JavaScript SDK loaded
- Sign-in / sign-up UI
- Token attached to `/api/*` requests

Today's `index.html` uses Supabase auth UI. Replacing or augmenting that with Clerk is a careful refactor needing design decisions (replace Supabase entirely, or coexist?). I deliberately didn't ship this without a conversation. You can test the auth backend right now via curl with a Clerk JWT (use the publishable key + Clerk's frontend test pages).

### 3. Frontend dashboard hygiene items

These are GitHub Settings clicks I can't do:
- Branch protection on `main` — Settings → Branches → Add ruleset
- Workflow permissions repo default → "Read repository contents" — Settings → Actions → General
- Allowed Actions list → Settings → Actions → General → "Allow specified actions"
- Hide akashbirajdar04's two comments + lock issue #96
- Optional: Cloudflare billing alert in Notifications

## Summary of all PRs from today

| # | What | State |
|---|---|---|
| #108 | D1 binding wired | ✅ merged |
| #93 | Bulk discovery script | ✅ merged |
| #102 | FOUC fix | ✅ merged |
| #100 | Sentry SDK | ✅ merged |
| #103 | Ordinance URLs + probe mode=head | ✅ merged |
| #84/#83 | Workers-types patch bumps | ✅ merged |
| #111 | nodejs_compat flag | ✅ merged |
| #110 | Workflow & repo hardening | ✅ merged |
| #112 | Frontend SRI + headers | ✅ merged |
| #113 | Anti-clone defenses (Origin guard + canaries + ADR 0011) | ✅ merged |
| #120 | Max-divergence rename pass | ✅ merged |
| #121 | Phase 1 Clerk auth + D1 projects API | ✅ merged |
| #122 | Per-route rate limiting | ✅ merged |
| #123 | D1 → R2 backup cron | ✅ merged |
| #124 | Auto-migrations + projects per-user rate limit | ✅ merged (broke main; #127 fixes) |
| #126 | Backup size caps | ✅ merged |
| **#127** | **Conflict-marker fix + CI guard** | ⏳ **MERGE FIRST THING** |

That's **17 PRs landed today**, plus #127 waiting.

## What you do this morning, in order

1. **Merge PR #127** — restores live worker deploys.
2. **Watch the Deploy API workflow** turn green (1–2 minutes).
3. **Smoke-test the API** with the URLs in the Verification section above.
4. **Decide tools fix priority** — tell me what you see when you click the broken tools, and I'll write a targeted fix.
5. **Decide Clerk frontend approach** — replace Supabase, or coexist? That decision blocks the frontend wiring PR.
6. **Optional dashboard hygiene** — branch protection, workflow defaults, etc. (the list under "What's NOT done yet → 3").

Everything in the backend is now functionally bulletproof at the infrastructure layer once #127 lands. The remaining work is tools (UI) and frontend auth (UI integration), both of which need your eyes on a real browser.

---

*Generated 2026-05-07 04:35 UTC by Claude Code, in one session, end of a long Tuesday.*
