# Agent Rulebook — Mapnova

> **Read this first** before doing any task. This synthesizes `CLAUDE.md`,
> `PRODUCT_VISION.md`, `STYLE_GUIDE.md`, `INCIDENT_RESPONSE.md`, and the ADRs
> into a single agent-context document.
>
> Order of precedence when documents conflict:
> 1. `PRODUCT_VISION.md` — what the app IS
> 2. `CLAUDE.md` — architecture invariants
> 3. ADRs in `docs/adr/` — locked-in decisions
> 4. `STYLE_GUIDE.md` — visual + interaction patterns
> 5. This document — operational rules + escalation

## Operational rules every agent run must follow

1. **Branch naming:** `issue-<n>-<slug>` for issue work, `fix/<slug>` for bug fixes,
   `feat/<slug>` for features, `docs/<slug>` for docs-only changes.
2. **Open a draft PR FIRST**, before writing implementation code. PR title
   includes `(#<issue-num>)`. PR body references the issue with `Closes #<n>`.
3. **Plan-first protocol** — post a plan as the first PR comment with:
   - Files to modify or create
   - Architecture decisions and alternatives considered
   - External dependencies (URLs, APIs, secrets)
   - Acceptance criteria
   Wait for the owner's "approved" / "go" / "ship it" comment unless:
   - The issue body says `skip plan-first` or `implement directly`
   - The issue is labeled `claude:trivial`
4. **Never push to `main`.** Always work on a feature branch. Branch protection
   enforces this anyway.
5. **One concern per PR.** Don't bundle a bug fix with a feature with a refactor.
6. **No new dependencies** without owner approval. Adding to `package.json` is
   an escalation event.
7. **Don't bump version numbers** unless explicitly asked.
8. **Don't edit `CLAUDE.md` or `PRODUCT_VISION.md` autonomously.** Propose
   changes via PR like anything else; owner reviews.

## Escalation triggers

Stop and post a comment on the issue (don't write code) if any of these are true:

- The task touches **auth, billing, the database schema, or canary tokens**
- The task requires **adding a new dependency**
- The task requires **changing the pricing or monetization model**
- The task requires **a third-party API key or new external service**
- There are **two reasonable approaches** and the issue body doesn't pick one
- The task **could affect data integrity** (DELETE, UPDATE WHERE without specific id, schema migration that drops columns)
- The task references **`PRODUCT_VISION.md` § 9 out-of-scope decisions**

When escalating, format:

> ## Escalation
> This task requires owner direction because: **[specific reason]**.
>
> Options I'd consider:
> 1. **Option A:** [description, trade-offs]
> 2. **Option B:** [description, trade-offs]
>
> My recommendation: **A**, because [reasoning].
>
> Pausing until you reply with "approved: A" / "approved: B" / "different: [...]".

## Quality gate before marking PR ready for review

- `node --check` passes on every JS file you touched and on inline `<script>` blocks
- All vitest tests pass for the workspace you touched
- No literal merge-conflict markers (`<<<<<<<`, `=======`, `>>>>>>>`) anywhere — the CI grep blocks this but catch it yourself first
- No smart quotes (`U+2018`, `U+2019`, `U+201C`, `U+201D`) in JS string literals — use ASCII `'` and `"` only
- Visual changes look correct on mobile (375px width) AND desktop (1440px)
- Style guide compliance — colors from the token list, spacing from the scale, no new font families

## Definition of done for a PR

- [ ] Branch named per convention
- [ ] Draft PR opened with plan as first comment
- [ ] Owner approved the plan (unless skip plan-first applies)
- [ ] All quality gate items above pass
- [ ] PR description has Summary + Test Plan
- [ ] If touching the API or D1, includes a curl-based smoke test in the PR description
- [ ] If touching the frontend, includes a "visual check" item the owner can perform
- [ ] PR is marked Ready for Review (out of draft)
- [ ] Owner merged it

## Style guide enforcement (most-violated rules)

Reading the existing codebase, the most common style drift to watch for:

1. **Random spacing** — agents often pick `7px` or `15px` instead of the scale (`4·6·8·10·12·14·16·20·24·32`)
2. **New colors** — adding hex values that aren't in `STYLE_GUIDE.md`. Use existing tokens or propose a new token via PR.
3. **Inconsistent button styling** — every modal ends up with a slightly different button. Use the four variants in the style guide.
4. **Mixed font weights** — Barlow has 6 weights; pick from the 4 documented sizes.

When in doubt about styling: copy the existing pattern from the closest existing component. If no pattern exists, add one to `STYLE_GUIDE.md` first, then implement.

## Never do these

- ❌ Force-push to a branch that isn't your own working branch
- ❌ Force-push to `main` (CI rejects this anyway)
- ❌ Skip git hooks with `--no-verify` unless explicitly told
- ❌ Rebase a PR that someone has already reviewed without telling them
- ❌ Resolve a merge conflict by accepting "theirs" without reading both sides
- ❌ Run `wrangler d1 execute mapnova-db --remote` with a destructive query without owner approval
- ❌ Introduce a third selection system (we have two too many already; consolidate, don't add)

## Useful context for any task

- This repo is **private** as of 2026-05-06. Don't assume external contributors will see issues/PRs.
- Frontend is **single-file HTML** (`apps/web/index.html`) plus modular JS in `apps/web/static/v2/`. No build step.
- API is a **Cloudflare Worker** (`apps/api/`) using Hono + Drizzle + D1.
- Auth migration in progress: **Clerk replaces Supabase**. New code should use `MNClerk` and `mnAuthFetch`. Don't add new code that uses the legacy Supabase auth path.
- The selection tools have been broken multiple times — see PRs #128 / #130 / #132 / #137 / #139. If you touch them, run `MNT._diagnose()` after your change and verify halos appear on selected parcels.
- Per-route rate limits exist (PR #122). Don't add new public API routes without thinking about which limit applies.

---

**TL;DR:** read PRODUCT_VISION.md, follow plan-first, escalate when in doubt, ship one thing per PR.
