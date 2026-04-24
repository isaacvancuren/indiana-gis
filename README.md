# Mapnova — Universal Mapping Platform

A comprehensive GIS mapping platform covering all 92 Indiana counties with parcel data, owner information, and property record cards.

## Features

- **92 Indiana Counties** — full parcel boundary coverage via IGIO statewide dataset
- **Owner Data** — 57 counties with live owner/assessment data across 3 tiers:
  - Tier 1: ElevateMaps ArcGIS (19 counties)
  - Tier 2: County/Schneider ArcGIS REST (18 counties)
  - Tier 3: WTH GIS coordinate-based (21 counties)
- **Property Record Cards** — direct links to official Beacon assessor PRCs
- **GIS Layers** — zoning, flood, hydrology, roads, imagery, and 70+ county-specific layers
- **Tools** — measure distance/area, buffer analysis, parcel search, export

## Tech Stack

- [Leaflet.js](https://leafletjs.com/) — mapping
- [ElevateMaps ArcGIS](https://elb.elevatemaps.io/) — county GIS tile services
- [Indiana IGIO](https://gisdata.in.gov/) — statewide parcel boundaries
- [Beacon by Schneider](https://beacon.schneidercorp.com/) — property records

## Project Structure

```
indiana-gis/
├── index.html        # App shell
├── css/
│   └── app.css       # All styles
├── js/
│   └── app.js        # All application logic
└── README.md
```

## Development

```bash
# Serve locally
python -m http.server 8080
# Open http://localhost:8080
```

## Deployment

Deployed via [Netlify](https://netlify.com) — auto-deploys on every push to `main`.

## Status

Active development. Currently working on:
- [ ] Fix IGIO parcel ID null field issue
- [ ] Verify owner data for all 57 covered counties
- [ ] Add remaining 35 counties
- [ ] Mobile layout improvements
- [ ] Custom domain setup
