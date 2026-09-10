# Editable stair geometry in DXF — 2026-09-10

DXF now draws straight, L-shaped, U-shaped and spiral stairs on a dedicated STAIRS
layer. The shared editor renderer produces native CAD lines, exact rational
quadratic splines for circular arcs, and text. Rotation, placement, treads and
direction arrows are preserved with the CAD vertical-axis inversion. Filled
shapes contribute outlines; this monochrome linework does not add hatches.

The furniture CAD adapter is generalized into a shared symbol adapter with saved
styles and translation/rotation/scale transforms. Furniture retains its existing
signed-scale and readable symbol-text behavior. Current consumers establish
transforms before creating paths; this is a bounded symbol adapter, not a general
Canvas implementation. Unsupported commands continue to fail explicitly.

Stairs now satisfy the common export-content predicate: stair-only plans work in
PNG, PDF, SVG and DXF (including the existing DWG-to-DXF fallback). Saved plan data
is unchanged. No stair voids or new native stair geometry are introduced here.

Unit coverage checks all four shapes and both directions, exact native curve
weights, source preservation, saved transforms and text orientation, stair-only
exports and furniture regression cases. Browser tests download the actual DXF
and render its exported line/spline coordinates into a QA preview. Preview curves
are sampled for inspection only; delivered DXF curves retain exact spline data.
Existing stair PNG/PDF/SVG and furniture export workflows run alongside the CAD
checks.

Physical qualification, stair voids and broader native parity remain open.

## Results

All 889 unit tests and four Chromium/WebKit workflows passed. Production Svelte
checks reported zero errors and warnings; the production build passed. Visual
review of the downloaded DXF geometry preview passed for all four footprints,
treads, rotations and direction arrows. The preview omits text; text entities
and direction labels are verified by tests. Furniture regressions passed.
