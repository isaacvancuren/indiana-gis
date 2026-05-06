# Backend Handoff — Bulletproof Backend Buildout

**Last updated:** 2026-05-06
**Current branch when written:** `claude/setup-github-action-QE7Ex` (even with `origin/main`)
**Audience:** any agent or contributor picking up backend work after the previous Claude Code web session crashed before producing its own handoff.

## North Star

Harden the Cloudflare-based backend under `apps/api/` into something durable enough to carry long-term feature growth (auth, parcel cache, owner-data proxy, AI parcel search) without re-litigating infrastructure decisions on every feature. Architecture decisions are locked in ADRs 0001–0010 — read those before proposing structural changes.

Stack (per ADRs):
- Cloudflare Workers + Hono (ADR 0003, 0007)
- Cloudflare D1 + Drizzle ORM (ADR 0004) — **not yet wired**
- Cloudflare KV for discovery cache — wired
- Clerk for auth (ADR 0005) — **not yet wired**
- pnpm + Turborepo monorepo (ADR 0006)
- Free-tier-first (ADR 0010)

## Status snapshot

### Done
- Monorepo restructure to `apps/web` + `apps/api` (#39)
- Worker scaffolding: Hono app with `/api/health` and `/api/discover/*` (#74)
- Auto-deploy on push to `main` via `.github/workflows/deploy-api.yml` (#41, #42, #44, #48)
- Custom domain `api.mapnova.org` routed via Cloudflare dashboard (zone-route in `wrangler.toml` was removed — see #42)
- KV namespace `mapnova-discovery-cache` created and ID wired in `wrangler.toml` (#107)
- Claude Code GitHub Action live (`@claude` mentions, overnight queue, label bootstrap)
- Cloudflare creds (`CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`) exposed to the Claude agent env so it can run wrangler diagnostics (#101)

### Loose ends (pick up here)
1. **D1 database — not yet created or bound.** Commit `9f8dd3f` says "D1 still pending." Next concrete action:
   - `npx wrangler d1 create mapnova-db` (the agent allow-list permits this)
   - Add the resulting `database_id` + binding to `apps/api/wrangler.toml`
   - Add `D1Database` to `apps/api/src/env.ts`
   - Decide initial schema (parcel cache? owner data? user/project tables for Clerk?). No schema designed yet.
   - Wire Drizzle per ADR 0004; create `apps/api/src/db/` with schema + migrations.
2. **No auth layer yet.** Clerk is the chosen vendor (ADR 0005) but not installed. Required before any user-scoped endpoint (saved projects, AI search history).
3. **Owner-data proxy spec exists but is not implemented.** See `docs/elevatemaps-proxy-spec.md`.
4. **Branch `claude/setup-github-action-QE7Ex`** is already even with `origin/main` and can be deleted once you confirm; the setup work merged via PRs #5, #6, #12, #46, #49, #98, #101, #107.

### Not started
- AI parcel search backend (Issue #4 epic, slice b: "LLM-backed parcel filter API")
- Parcel cache server-side persistence (currently client-side IndexedDB only — see #21)
- Observability beyond Sentry frontend (#70). No backend error tracking wired.
- Rate limiting / abuse protection on `/api/discover`.

## Required GitHub secrets

These must remain present for CI and the Claude agent to function. If a future setup loses them, restore via repo Settings → Secrets:

| Secret | Used by |
|---|---|
| `CLAUDE_CODE_OAUTH_TOKEN` | `.github/workflows/claude.yml` |
| `CLOUDFLARE_API_TOKEN` | `deploy-api.yml`, `claude.yml` (agent env) |
| `CLOUDFLARE_ACCOUNT_ID` | `deploy-api.yml`, `claude.yml` (agent env) |

The Cloudflare API token needs: Workers Scripts (edit), Workers KV Storage (edit), D1 (edit) — and **not** zone-level edit (we route the custom domain via dashboard, see `apps/api/wrangler.toml` comment).

## Agent allow-list

`.claude/settings.json` permits the agent to run read-only `gh` commands and most wrangler subcommands including `d1 create`, `kv namespace create`, `r2 bucket create`, `secret list`, and `migrations apply`. Anything outside this list will prompt the human. Add new entries via PR — do not silently expand permissions.

## Contingency: the "empty content blocks" API error

The previous Claude Code web session that drove the GitHub Action setup ended with repeated `400 messages: text content blocks must be non-empty` errors and could not be resumed. This is a transcript-corruption failure (a tool result returned an empty string and the malformed message persists in conversation history; every retry/resume re-sends it). If a future agent hits the same symptom: **abandon the session and start a new one** — there is no in-session recovery. Capture any unsaved context before reopening.

## Where to pick up

Suggested order, smallest reversible step first:

1. Read this file, the ten ADRs, and `apps/api/src/index.ts` (≈ 5 minutes).
2. Confirm with the human whether D1 schema should start with the parcel cache, the user/project tables, or both. **Do not pick unilaterally** — ADR 0004 fixes the ORM but not the schema, and the schema choice forks the next several PRs.
3. Open an issue describing the chosen schema, then a feature branch `issue-<n>-d1-bootstrap`, then a draft PR with the plan-first protocol from `.github/workflows/overnight-queue.yml`.

## Hard constraints (do not relitigate)

From `CLAUDE.md`:
- Single-file HTML for the frontend is non-negotiable.
- No new build step on the frontend.
- Don't push to `main`.
- Don't edit `CLAUDE.md` autonomously — propose changes via PR.
- Don't bump version numbers without explicit instruction.

From the ADRs:
- Workers, not Pages Functions, for backend logic (0007).
- Drizzle, not raw D1 SQL or Prisma (0004).
- Clerk, not roll-your-own auth (0005).
- Granular filter UI, not free-form AI parcel search as the primary UX (0009) — the AI search work in Issue #4 is additive, not a replacement.
