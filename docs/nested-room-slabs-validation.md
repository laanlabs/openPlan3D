# Nested room slabs

The web viewer now assigns each strictly contained room ring to its smallest
containing room. The outer room's slab and active floor finish exclude that
immediate child; the child supplies its own slab and finish. Three nested rooms
therefore cover their shared footprint once instead of overlapping. Active and
stacked floor construction use the same containment function, and portable scene
exports retain the resulting holes and inner side walls.

Containment rejects boundary contact, coincident rings, intersections, and edges
that cross the recess of a concave parent even when all child vertices lie
inside. Polygon coordinates, room metadata, and saved slab thickness are retained.

Validation:

- All 919 unit tests passed. Added tests cover immediate nesting, shuffled input,
  reversed rings, touching/crossing/concave cases, ray probes, watertight edges,
  signed total volume, and input immutability.
- All four Chromium/WebKit slab workflows passed. A three-ring fixture on two
  levels produces three slabs per floor and exactly one intersected slab at
  each nested probe location in the downloaded Blender scene, both active and
  stacked. Existing depth, floor switching, recess, and gap checks still pass.
- Svelte diagnostics reported zero errors and warnings; production build passed.
  Configuration discovery printed the existing NODE_ENV fallback message during
  the check command, then completed using svelte.config.js.

This fixes nested 3D overlap, not explicit void authoring: an inner room still
has its own floor. Courtyard/stair openings, nested 2D fill and area accounting,
native nesting, and interior wall-face area agreement remain open.
