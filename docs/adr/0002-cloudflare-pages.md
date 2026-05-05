# Cloudflare Pages for static hosting

## Status

Accepted

## Context and Problem Statement

The public app is a single static HTML file. It needs global CDN delivery, HTTPS by default, automatic preview deployments for every pull request, and ideally zero cost at current traffic levels. The alternatives considered were GitHub Pages, Netlify, and Vercel.

GitHub Pages is free but does not generate per-PR preview URLs without additional configuration. Netlify and Vercel both offer preview deployments but impose bandwidth limits on the free tier that could become a concern as map tile traffic grows. Cloudflare Pages integrates natively with the Cloudflare network where the Worker API also runs, reducing cross-origin complexity.

## Decision

Deploy `index.html` to Cloudflare Pages, connected to the `main` branch of the GitHub repository. Every commit to `main` deploys automatically to `mapnova.org`. Every PR branch receives a preview URL at `<branch-slug>.mapnova.pages.dev`.

## Consequences

**Positive:**
- Automatic preview URLs for every PR branch with no extra CI configuration.
- Global CDN with 200+ points of presence; no origin server to manage or scale.
- Free tier covers unlimited sites and 500 builds per month — sufficient for current volume.
- Co-located with the Cloudflare Worker API, so same-network requests avoid public internet hops.

**Negative:**
- Tied to the Cloudflare ecosystem; migrating to a different host requires re-wiring DNS, removing the Pages project, and updating CI secrets.
- Build minutes are shared across all Pages projects on the account; adding more projects consumes the same budget.
- Pages Functions (serverless compute co-deployed with the site) were evaluated and ultimately replaced by standalone Workers (see ADR-0007).
