# Architecture Decision Records

This directory contains the Architecture Decision Records (ADRs) for Mapnova (formerly IndianaGIS).

## What is an ADR?

An ADR is a short document that captures an important architectural decision: the context that drove it, the decision itself, and the consequences (good and bad). The goal is to give future contributors — and future-you — enough context to understand *why* the code is the way it is, so they don't have to rediscover it by archaeology.

## Format

We use the [MADR](https://adr.github.io/madr/) (Markdown Architectural Decision Records) template:

```
# [Title]

## Status
Accepted | Deprecated | Superseded by ADR-XXXX

## Context and Problem Statement
[What forced a decision? What problem are we solving?]

## Decision
[What was decided?]

## Consequences
[Positive and negative outcomes of the decision]
```

## How to add a new ADR

1. Pick the next number in sequence.
2. Create a file named `NNNN-short-slug.md` in this directory.
3. Fill in the MADR template (1–2 paragraphs of context, the decision, 3–5 consequences).
4. Add a row to the index table below.
5. Open a PR — ADR files are reviewed like any code change.

## Index

| Number | Title | Status |
|--------|-------|--------|
| [0001](0001-single-file-html.md) | Single-file HTML for the public app | Accepted |
| [0002](0002-cloudflare-pages.md) | Cloudflare Pages for static hosting | Accepted |
| [0003](0003-cloudflare-workers-hono.md) | Cloudflare Workers + Hono for the API | Accepted |
| [0004](0004-cloudflare-d1-drizzle.md) | Cloudflare D1 + Drizzle ORM for primary storage | Accepted |
| [0005](0005-clerk-authentication.md) | Clerk for authentication | Accepted |
| [0006](0006-monorepo-pnpm-turborepo.md) | Monorepo via pnpm + Turborepo | Accepted |
| [0007](0007-workers-over-pages-functions.md) | Pages Functions vs Workers — chose Workers | Accepted |
| [0008](0008-hardcoded-county-layer-registry.md) | Hardcoded county GIS layer registry | Accepted |
| [0009](0009-granular-filter-ui-over-ai-search.md) | Granular filter UI over LLM-backed AI search | Accepted |
| [0010](0010-free-tier-first-stack.md) | Free-tier-first stack | Accepted |
