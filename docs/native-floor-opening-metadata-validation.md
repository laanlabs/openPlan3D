# Native floor-opening metadata — 2026-09-10

Room package records now carry optional `boundaryWallIDs` and `floorOpening`.
The native Codable model retains both through ordinary edits; package merges
support true, false, and explicit removal. Web exports reference existing native
wall IDs instead of allocating new identities for boundary references.

Web imports match explicit boundary sets before considering label positions.
This preserves nested room identity when label centers coincide. Unmatched
explicit boundaries remain unassociated; legacy point-only labels choose the
smallest enclosing footprint. Native package validation caps boundary lists at
5,000 entries; the web also validates UUIDs and optional boolean values.

Validation:

- All 927 web unit tests passed, including nested native JSON round trips,
  opening reset, invalid payloads, and resulting net areas.
- Svelte diagnostics reported zero errors and warnings; production build passed.
- Catalyst build and all 33 selected package, slab, render-scene, and furniture
  tests passed, including Codable retention and package merge reset behavior.
- Four Chromium/WebKit package and nested-slab workflows passed. Downloaded
  packages contain the opening flag and four boundary IDs referencing real walls;
  existing slab thickness/elevation export assertions also passed.

An initial focused test exposed allocation of new wall identities for references.
The exporter now uses its existing wall map; the full unit suite passed after
that correction.

Native opening geometry and authoring remain pending. These fields preserve
intent across native edits; they do not make native floors display openings.
Arbitrary/stair-derived holes and inter-floor ceiling coordination remain open.
