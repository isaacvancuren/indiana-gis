# Hardcoded county GIS layer registry — no universal layer-fetcher

## Status

Accepted

## Context and Problem Statement

Indiana's 92 counties publish GIS layers through ArcGIS REST services, but the service URLs, layer IDs, naming conventions, and authentication requirements vary wildly county by county. Some counties host their own ArcGIS Server instances; others use shared regional servers or third-party providers like Greenwood GIS. Early prototypes attempted a universal layer-fetcher that queried each county's ArcGIS service directory at runtime and built the layer panel dynamically from the response.

The universal fetcher approach failed in practice: service directories are slow to respond, return inconsistent schemas, require CORS headers that many counties do not set, and produce hundreds of layers with cryptic machine-generated names that are useless to end users. The result was a panel full of noise that required the user to understand ArcGIS service structure to navigate. Manual curation of layer names, groupings, and display order was unavoidable regardless of approach.

## Decision

Hard-code each county's layer list as a structured `ArcGISCountyLayer` instance in `index.html`. The county layer panel is rebuilt from this static registry every time the user switches counties via `buildCountyLayerPanel()`. No runtime service-directory calls are made.

## Consequences

**Positive:**
- Layer lists are predictable, fast, and available offline — no runtime network calls to county services on panel load.
- Contributors can review, audit, and correct layer metadata (names, groupings, IDs) in a single well-known location.
- `buildCountyLayerPanel()` is simple and deterministic; it cannot fail due to a county server being slow or offline.
- Curator control over layer names means users see human-readable labels instead of machine identifiers.

**Negative:**
- Adding a new county requires a code change to `index.html`; there is no self-service path for county GIS administrators to publish their layers to Mapnova.
- Layer IDs go stale when counties republish or reorganize their ArcGIS services; the registry requires manual upkeep when this happens.
- The file grows with each county added (approximately 50–100 lines per county); Bartholomew has 74 layers, Johnson has 49 across multiple services.
- There is no automated validation that a hardcoded layer ID still resolves to a valid ArcGIS layer.
