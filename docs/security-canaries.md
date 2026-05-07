# Security Canaries

Forensic markers planted in the codebase. **None of these strings should ever appear in any deployment, repo, or code corpus other than `mapnova.org` (live), `*.mapnova.pages.dev` (previews), or this private repo.**

If you encounter any of these strings in someone else's code, blog post, public repo, archived webpage, or competitor product, that is **proof of code theft** from this project.

## Active canaries

| ID | Location | String | Disguised as | Planted |
|---|---|---|---|---|
| C1 | `apps/web/index.html` (meta tag in `<head>`) | `d3b9c4a82f7e1a6c` | A `<meta name="mn-deploy-id">` value (looks like an analytics deploy identifier) | 2026-05-06 |
| C2 | `apps/web/css/app.css` (top-of-file comment) | `c8e2a4f97b1d6035` | An `asset-rev` comment (looks like a build-tool asset revision) | 2026-05-06 |
| C3 | `apps/web/assets/mn-bookmarks.js` (constant near top) | `7f4a3b2e9c8d6a1f` | A `__MN_BUILD_SIG` constant (looks like a build hash) | 2026-05-06 |

## How to verify they're still in the live site

Periodically (e.g. monthly):

```bash
curl -s https://mapnova.org/ | grep -F 'd3b9c4a82f7e1a6c'                              # C1
curl -s https://mapnova.org/css/app.css | grep -F 'c8e2a4f97b1d6035'                   # C2
curl -s https://mapnova.org/assets/mn-bookmarks.js | grep -F '7f4a3b2e9c8d6a1f'        # C3
```

All three should return one match. If any returns nothing, an over-zealous refactor or build optimization removed the canary — replant it from this list.

## How to detect leaks

If you suspect code theft, search any of these strings on:

- Google: `"d3b9c4a82f7e1a6c"` (with quotes)
- GitHub Code Search: `"7f4a3b2e9c8d6a1f"` across all public repos
- The Wayback Machine for any suspect URL
- Any product or site you suspect is a clone — view source / DevTools, search the page

A hit on any canary outside `mapnova.org` is forensic evidence. Capture the URL, the source HTML, the date, and a screenshot. That is what you would attach to a DMCA notice or legal complaint.

## Rotation policy

These canaries protect against future leaks. If you believe the canaries themselves have been observed by a bad actor (e.g., a contributor went rogue), rotate by:

1. Generate three new 16-char hex strings (`openssl rand -hex 8` × 3).
2. Replace the values in the three locations above.
3. Update this table with the new IDs and rotation date.
4. Old canaries can be deleted from the codebase once new ones are deployed and verified.

## Operational notes

- **Do not commit any change that removes a canary unless you are intentionally rotating it.** A code review (CODEOWNERS) on this file is required.
- **Do not mention canaries in commit messages, PR titles, or public issues.** The whole value depends on attackers not realizing the strings are markers.
- **The disguise matters.** Canaries that look like normal build/asset/version identifiers blend in. Canaries with names like "watermark", "canary", "tracking" defeat themselves.
- **MIT license caveat.** Even with proof of copying via canary, MIT-licensed code permits use as long as the copyright notice is preserved. See SECURITY.md and LICENSE for the legal posture; canaries help with attribution claims, not license enforcement.
