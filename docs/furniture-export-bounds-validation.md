# Furniture footprint export bounds

PNG and PDF previously reserved fixed 50/60 cm extents around each furniture
position; SVG did not include furniture in its bounds. Oversized or rotated
symbols outside the walls could clip.

All three framed plan formats now use the rotated rectangular symbol bounds,
including the half-stroke width. Dimensions follow the existing renderer's
per-item overrides, catalog defaults and unknown-item fallback. Source furniture
is not changed. Raster size limits remain in place.

Geometry coverage checks all transformed stroke corners at multiple rotations,
negative positions, source immutability and fallback dimensions. Export coverage
checks consistent PNG/PDF framing. The browser fixture places an 800 x 300 cm
rotated item outside the wall envelope, verifies SVG corners and PNG bounds, and
serializes PDF. Curved wall/opening regression downloads remain covered.

Scope: rectangular furniture footprints currently drawn by the plan exporters.
This does not add new furniture geometry or change scale conventions. Long symbol
labels, other object categories, title text and native export parity remain open.

Validation on 2026-09-09: 14 final geometry/export tests passed, with three
real-jsPDF tests also passing in the initial run. Svelte checks reported zero
errors/warnings and production build passed. All six Chromium/WebKit browser
checks passed. The actual 4096 x 4096 PNG was visually inspected and contains
the full rotated symbol and floor plan with clear margins.
