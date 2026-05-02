# Mapnova Dropdown Audit

Last updated: 2026-05-02T16:10:34.204Z (autonomous run)

## Status of each dropdown found on the live page

Inventoried by walking document.querySelectorAll('select') on mapnova.org.

### country-sel
- 5 options: 'Select Country', United States (active), Canada/Mexico/International (disabled, coming soon)
- Status: OK; flag emojis render correctly

### state-sel
- 51 options: 'Select State' + 50 states + Indiana pinned at top
- Status: OK after my session 1 fixes (em dashes restored)
- Inconsistency by design: states with statewide ESRI parcel source show no suffix; states with per-county fallback only show '— county data' suffix; states with neither show '(coming soon)'. Logic in mn-state-ui.js refreshLabels()
- States with no suffix (have statewide ESRI source): Indiana, Ohio (others tbd from mn-state-sources.js)
- States with '— county data': Alabama, Delaware, Georgia, Illinois, Kansas, Kentucky, Louisiana, Michigan, Minnesota, Missouri, Nebraska, New Mexico, Oklahoma, Oregon, South Carolina, South Dakota
- States showing '(coming soon)': Alaska, Arizona, Arkansas, California, Colorado, Connecticut, Florida, Hawaii, Idaho, Iowa, Maine, Maryland, Massachusetts, Mississippi, Montana, Nevada, New Hampshire, New Jersey, New York, North Carolina, North Dakota, Pennsylvania, Rhode Island, Tennessee, Texas, Utah, Vermont, Virginia, Washington, West Virginia, Wisconsin, Wyoming

### county-sel
- Variable count depending on selected state
- Indiana: 92 options, organized into optgroups (Central, North, East, Southeast, South, West)
- Ohio: 88 options, no optgroups
- Status: OK after session 1+3 fixes (em dashes + optgroup labels cleaned)

### mn-dist-unit (parcel measurement distance unit)
- 5 options: Feet, Miles, Meters, Kilometers, Yards
- Status: OK

### mn-area-unit (parcel measurement area unit)
- 6 options: Acres, Sq Feet, Sq Meters, Hectares, Sq Miles, Sq Kilometers
- Status: OK

### stype (Search By type)
- 6 options: Street Address, Parcel Number, Owner Name, Lat/Lon Coordinates, Section-Township-Range, Subdivision Name
- Status: OK after session 1 emoji restoration

### scounty (Search County filter)
- 60 options after session 1 expansion: All Indiana + 59 configured Indiana counties
- Status: OK

### Various 'fsel' tool dropdowns
- Multiple smaller dropdowns in Tools panels (Address Search, Section-Township-Range, Drainage)
- Each has only 3 hardcoded counties: Bartholomew, Marion, Hamilton
- Status: TODO — should be expanded but NOT done autonomously because the underlying tool implementation may only handle these specific counties
- Recommended: Read mn-tools-impl.js to determine if each tool can handle arbitrary counties. If yes, expand.

### Other 'fsel' utility dropdowns (paper size, scale, dpi, etc.)
- Print dialog: paper size (4 options), orientation (2), scale (6), dpi (3)
- Buffer/proximity unit dropdowns: 4 unit options each
- Query Builder: layer (1), field (8 fields), operator (6 operators)
- Status: All OK after session 1 character fixes

## Issues for human follow-up

1. The fsel triplet (3-county) tool dropdowns: needs review of mn-tools-impl.js to determine safe expansion scope.
2. State dropdown label inconsistency is intentional but UX-confusing for new users. Recommend either:
   a. Drop the suffix entirely (label clarity > info)
   b. Add visual hints (icon, color) for data-availability tier
   c. Group into optgroups by tier
3. Country dropdown could auto-set to USA when state is selected (one-line fix to state-sel change handler).
