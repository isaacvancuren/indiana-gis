# Incident Response Runbook

Lightweight playbook for security incidents on this project. Captured 2026-05-06 after the first real incident response so the playbook isn't reinvented next time.

## Triage decision tree

When something feels wrong, walk this in order:

1. **Is real-time damage happening?** (data loss, money, defacement, ongoing exploitation)
   → If yes, **flip the repo to private immediately** (https://github.com/isaacvancuren/indiana-gis/settings → Danger Zone → Change visibility) and revoke ALL credentials. Then triage. Containment first; understanding second.
   → If no, proceed to step 2.

2. **What's the actual attack surface?** Read carefully before acting.
   - Public repo + comment from stranger → almost always opportunistic, not targeted (Pull Shark farming, scrapers, etc.). Block + close, don't panic.
   - Anomalous commit on `main` from unknown author → check `git log --pretty="%an <%ae>" main` against the trusted-actor list (you, `claude[bot]`, `dependabot[bot]`, `github-actions[bot]`). Anything else is the real signal.
   - Failing deploys with auth errors → token rotation issue or scope mismatch, not breach.
   - Public CI logs leaking values → real exposure; rotate the leaked credential.

3. **What credentials could the actor have touched?** Even if they had no write access:
   - Public repo content (always — by design)
   - Public Actions logs (until repo went private)
   - Anything in Cloudflare account if Cloudflare API token was ever leaked

## Standard containment steps (in order)

Every step is reversible except deletion. Do them all even when you think you don't need them; the point is to remove uncertainty.

### 1. Block the bad actor (~2 min)

- Repo level: https://github.com/isaacvancuren/indiana-gis/settings → Moderation options → Blocked users → add `<username>`
- Account level: https://github.com/settings/blocked_users → Block user → `<username>`
- Hide their comments: open each comment they posted → `…` menu → Hide → mark Spam or Off-topic
- Lock the issue/PR they touched: `…` menu at top of issue → Lock conversation → Off-topic

### 2. Audit blast radius (~5 min)

```bash
# Authors of every commit on main in the last 6 months — should only show owner + trusted bots.
git log origin/main --since="6 months ago" --pretty="%an <%ae>" | sort -u

# Full history secret scan (run from repo root).
git log --all -p | grep -aEi '(eyJ[A-Za-z0-9_-]{20,}|sk_(live|test)_[A-Za-z0-9]{20,}|AIza[A-Za-z0-9]{30,}|AKIA[A-Z0-9]{16}|gh[ps]_[A-Za-z0-9]{36}|github_pat_[A-Za-z0-9_]{82}|xox[baprs]-[A-Za-z0-9-]{10,}|-----BEGIN.*PRIVATE KEY-----)'

# Authorship of any commits matching the actor's email patterns.
git log --all --author="<bad-actor-email-or-name>"
```

If those return clean, no malicious code is in the repo.

### 3. Rotate exposed credentials (~10 min)

Even if there's no proof of leak, rotate any credential the actor could plausibly have observed in public CI logs or scraped from public repo content.

- **Cloudflare API token** — https://dash.cloudflare.com/profile/api-tokens → click the active "Edit Cloudflare Workers" token → **Roll** → copy new value → update `CLOUDFLARE_API_TOKEN` in https://github.com/isaacvancuren/indiana-gis/settings/secrets/actions
- **Anthropic Claude Code OAuth token** — https://console.anthropic.com/ → regenerate → update `CLAUDE_CODE_OAUTH_TOKEN` GitHub secret
- **Worker secrets** (Sentry DSN, future Clerk secret) — `cd apps/api && npx wrangler secret put <NAME>`
- **Supabase service role key** — Supabase dashboard → Settings → API → roll service_role (anon key is public by design, no rotation needed)

After any rotation: trigger a no-op deploy to verify (https://github.com/isaacvancuren/indiana-gis/actions/workflows/deploy-api.yml → Run workflow). Look for `wrangler whoami` success in the log.

### 4. Verify deploys still work

- Worker: https://api.mapnova.org/health → `{"ok":true}`
- Frontend: https://mapnova.org → loads, map renders, search works

### 5. Document the incident

Add a row to the incident log table in `SECURITY.md`. Include date, what happened, what you did. Future-you will thank present-you.

## Hard rules

- **Never `git push --force` to `main`.** Rewriting history during incident response loses the audit trail and breaks Cloudflare Pages.
- **Never delete a tag/branch you don't recognize without inspecting it first.** It might be your in-progress work or a legitimate bot's branch.
- **Never bypass branch protection or hooks during incident response.** They exist for this exact moment.
- **Don't make the codebase "more defensive" reactively in panic.** Code hardening is a thoughtful long-term effort, not a stress response. Use the SECURITY.md follow-ups list, not surprise refactors.

## What is NOT an incident

These look scary but are routine:

- Dependabot opening many PRs at once — that's its job; merge or ignore.
- Cloudflare Pages preview URLs being public — the URLs are unguessable; preview content is not sensitive.
- A CI run failing with a token error after you intentionally rotated — that's the rotation working as designed; just update the secret.
- Random GitHub users starring the repo — public stargazing is not access.
- Forks remaining after a public→private flip — GitHub's intended behavior; you cannot remove them.

## After containment: the long-term review

Within a week of any incident, do these once:

1. Review GitHub repo Settings → Security tab. Are vulnerability alerts enabled? Dependency graph?
2. Review Cloudflare → Audit logs (last 30 days) for any unexpected API token use.
3. Run a fresh `git log --all` author audit; confirm the trusted-actor list still matches reality.
4. Check whether `SECURITY.md` and this runbook still describe the actual posture. Update both if not.
