# Monorepo via pnpm + Turborepo

## Status

Accepted

## Context and Problem Statement

The project has at least two distinct deployable packages: the static frontend (`apps/web`) and the Cloudflare Worker API (`apps/api`). Keeping them in separate repositories would complicate cross-package changes, make it harder to share TypeScript types between the client and server, and require contributors to clone and coordinate multiple repos for a single feature.

A monorepo approach keeps all code in one place and allows shared packages (e.g., `packages/types` for API response shapes) to be consumed by both apps without publishing to npm. The two main monorepo toolchains evaluated were npm/yarn workspaces with a simple script runner, and pnpm workspaces with Turborepo for task orchestration.

pnpm was chosen over npm/yarn for its strict dependency isolation (no phantom dependencies) and its significantly faster install times via content-addressable storage. Turborepo was chosen over Nx for its simpler configuration model and its first-class support for Cloudflare Workers deployment pipelines.

## Decision

Manage the project as a monorepo using pnpm workspaces, with Turborepo orchestrating build, type-check, lint, and deploy tasks across packages via a dependency graph declared in `turbo.json`.

## Consequences

**Positive:**
- A single `git clone` gives any contributor everything they need to run the full stack.
- Turborepo's task graph caches build artifacts remotely; CI only rebuilds packages that have changed since the last run.
- Shared types and utilities in `packages/` are consumed by both apps without a publish step.
- pnpm's strict isolation catches phantom-dependency bugs that npm and yarn silently permit.

**Negative:**
- Contributors must use pnpm; running `npm install` or `yarn` at the repo root will produce incorrect results and is not supported.
- `turbo.json` pipeline definitions add configuration overhead; incorrect `inputs`/`outputs` declarations cause cache misses or incorrect caching.
- Monorepos accumulate complexity over time; without discipline around package boundaries, cross-package imports can turn the repo into a tangle.
- Turborepo remote caching (Vercel-hosted) requires an auth token; self-hosted caching is an alternative but requires additional setup.
