# Granular filter UI over LLM-backed AI search

## Status

Accepted

## Context and Problem Statement

Issues #32 and #8 proposed replacing or augmenting the parcel search bar with an LLM-backed natural-language query interface ("find parcels over 10 acres zoned commercial near a school"). This AI search epic was captured in issue #4 and broken into reviewable slices: search-bar mode toggle, LLM-backed parcel filter API, results-list UI, multi-select map navigation, and save-to-project. The epic is scoped and tracked but has not shipped.

In parallel, issue #3 required fixing the existing search bar to query across the full geographic filter using the IGIO statewide parcel dataset, not just visible parcels. Blocking this fix on the AI epic landing would delay a useful, working feature in favor of a speculative one. The AI approach also carries costs: LLM API calls add per-query latency and expense, results are non-deterministic, and the infrastructure (API key management, prompt engineering, result parsing) requires significant work before it is production-ready.

## Decision

Ship a granular filter UI (owner name, address, parcel ID) backed by structured IGIO statewide parcel queries. Treat LLM-backed AI search as a planned future enhancement tracked in issue #4, not a prerequisite for shipping the search feature.

## Consequences

**Positive:**
- Structured filters are fast, cheap (no LLM API call per query), and fully deterministic — the same query always returns the same results.
- IGIO statewide coverage means search results are consistent regardless of which county is currently selected on the map.
- Unblocks issue #3 without waiting for the AI epic; users get a working, reliable search immediately.
- No new API keys, prompt engineering, or LLM infrastructure required to ship.

**Negative:**
- Natural-language queries ("find all parcels with a barn near a creek," "show me parcels owned by out-of-state investors") are not supported by structured filters.
- Users must know the specific field name and value they want to filter on; there is no fuzzy matching or semantic understanding.
- When AI search (issue #4) eventually ships, it must integrate alongside the existing filter UI without breaking it; the integration surface will require design attention.
- The granular filter UI may feel dated compared to natural-language interfaces users encounter elsewhere; this is a known UX trade-off.
