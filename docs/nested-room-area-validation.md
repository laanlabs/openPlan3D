# Nested room area accounting

Detected room areas now subtract the unrounded footprint of each immediate
contained room before converting square centimetres to square metres and rounding.
A 6 × 6 m outer room, 4 × 4 m middle room, and 2 × 2 m inner room therefore report
20, 12, and 4 m², for a total of 36 m². Descendants are not subtracted twice.

The shared room resolver retains boundary-matched names, categories, and finishes
while replacing stale saved areas. Area Summary now uses that resolver rather
than prioritizing saved room values over current geometry. Moving an inner room
outside its parent restores the parent's area on the next resolution. Existing
room-label export paths already use the shared resolver.

Unit coverage includes all three nested rings, stale saved values, metadata
preservation, a moved child, source immutability, and rounding after subtraction.
The browser fixture imports deliberately stale 999 m² saved room areas and checks
the corrected summary alongside the active/stacked scene exports.

All 921 unit tests, 18 Chromium/WebKit slab and modal keyboard workflows, Svelte
checks (zero errors/warnings), and production build passed. The browser checks
also retain the existing historical-category summary and phone dialog coverage.

Nested 2D fills, explicit courtyard/stair opening authoring, native nesting,
interior-wall-face areas, and physical measurement qualification remain open.
