# Detailed CAD furniture linework — 2026-09-10

Known furniture symbols now reuse the icon registry in DXF exports. Straight
segments become LINE entities, quadratic curves become degree-two SPLINE entities,
and circular/elliptical arcs become exact rational quadratic spline segments.
These remain editable CAD geometry; the export does not flatten curves into a
raster image or sampled polylines. Repeated fill/stroke outlines are deduplicated.

The adapter emits monochrome linework on the existing FURNITURE layer, including
outlines of filled shapes; it does not add color hatches. Internal symbol text and
existing item captions remain text entities. Saved dimensions, nonuniform scale,
mirroring, rotation and the CAD vertical-axis inversion apply to geometry. Unknown
entries retain the existing rectangular CAD footprint. Saved data is unchanged.

The installed dxf-writer implements drawSpline but omits it from its declaration;
a local, narrowly scoped type describes its verified runtime signature.

Unit tests export every catalog symbol, check finite native entities, validate
rational weights, and verify spline-control transforms and unchanged source data.
Browser gallery tests download the actual DXF, inspect its entities, and render a
QA preview from exported LINE/SPLINE/LWPOLYLINE coordinates. That preview samples
curves only for visual inspection; the delivered DXF retains exact spline data.

Independent opening alignment, physical qualification and broader native parity
remain open.

## Results

All 864 unit tests and six Chromium/WebKit export workflows passed. Production
Svelte checks reported zero errors and warnings, and the production build passed.
Visual review of the downloaded DXF geometry preview passed, including the rotated
mirrored bed, rounded furniture, elliptical toilet and unknown-item rectangle.
Oversized scaled and unscaled export-bound regressions also passed.
