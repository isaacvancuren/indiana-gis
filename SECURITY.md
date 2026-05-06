# Security Policy

## Reporting a vulnerability

Please **do not** open a public GitHub issue for security vulnerabilities.

Instead, email: **isaacvancuren@gmail.com**

Include:
- A description of the vulnerability
- Steps to reproduce
- Potential impact

**Expected response time:** within 5 business days for acknowledgement, 30 days for a resolution or mitigation plan.

We appreciate responsible disclosure and will credit reporters in the changelog unless anonymity is requested.

## Repository hardening posture

This repository is **private**. Contributions are restricted to the project maintainer. Unsolicited PRs from external accounts will be closed without review.

Active hardening:
- Workflow `GITHUB_TOKEN` defaults to `contents: read` at workflow scope. Jobs elevate per-job only as needed (e.g., the overnight queue job elevates to `issues: write`).
- Branch protection on `main`: PR required, status checks required, force-push blocked.
- Secrets (`CLAUDE_CODE_OAUTH_TOKEN`, `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`) are repo-scoped, encrypted at rest, never echoed in logs.
- Dependabot is enabled for npm and GitHub Actions; patch-level updates are auto-merge candidates, majors require human review.
- Recommended next step: pin third-party Actions to commit SHAs (currently pinned by major-version tag). This is best done by enabling Dependabot's commit-SHA mode in repo settings.

## Incident log

| Date | Event | Resolution |
|---|---|---|
| 2026-05-06 | First-time external contributor `akashbirajdar04` opened unsolicited PR #109 on issue #96 (rate limiting). PR pattern matched Pull Shark badge farming (boilerplate body, file paths referencing nonexistent `src/index.js`). | PR closed without review. User blocked at repo and account level. Repo flipped from public to private. Workflow permissions hardened to least-privilege. No malicious code merged; full git history audit confirmed all commits authored by maintainer or trusted bots. |
