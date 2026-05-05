# Contributing to Mapnova

## Branch naming

Always work on a feature branch:

```
issue-<number>-<short-slug>
```

Examples: `issue-3-search-bar`, `issue-42-basemap-toggle`

Never push directly to `main`.

## Commit style

Use conventional commits:

```
<type>: <short description>

feat:  new feature
fix:   bug fix
docs:  documentation only
chore: tooling, config, deps
refactor: code change with no behavior change
```

Keep the subject line under 72 characters. Add a body if the "why" isn't obvious.

## Pull requests

- Open against `main`
- Reference the issue: `Closes #N`
- Fill in the PR template (Summary / Risk / Test plan / Screenshots)
- Keep PRs focused — one issue per PR
- Request review from `@isaacvancuren`

## Architecture decisions

ADRs live in `docs/adr/` (added in #52). For any decision that affects the architecture of the platform — new dependencies, changes to the single-file constraint, data source swaps — write an ADR before or alongside the implementation.

## Hard constraints (don't relitigate)

- Single HTML file, no build step, no framework (see `CLAUDE.md`)
- County layer data is hardcoded; universal layer-fetching does not work reliably
- ElevateMaps SAS tokens require server-side auth
