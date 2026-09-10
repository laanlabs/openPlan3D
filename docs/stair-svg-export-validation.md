# Editable stair symbols in SVG — 2026-09-10

SVG plans now include straight, L-shaped, U-shaped and spiral stairs using the
same drawing routine as the editor and PNG/PDF. Treads, arrows, direction labels,
rotation and position become editable paths, rectangles, arcs and text. Stair-only
plans are accepted, with shared footprint and caption bounds at a fixed zoom of
one. The output contains no rasterized stair images or selection handles.

The existing furniture SVG adapter is now a shared canvas-symbol adapter, adding
saved styles and translation/rotation transforms for the stair renderer. The
adapter covers these consumers' drawing commands; it is not a general-purpose
Canvas implementation. Current consumers establish transforms before paths.
Unsupported commands still throw, exposing future renderer/API incompatibility.
Furniture retains the same wrapper and vector behavior.

Unit coverage checks all four stair shapes in both directions, clockwise and
counterclockwise spiral arrows, style/transform restoration, stair-only exports,
unchanged data and every existing catalog furniture symbol. Browser gallery
coverage downloads SVG, decodes it through the browser's SVG renderer, and
attaches a raster preview for visual review alongside existing PNG/PDF checks.
The furniture gallery also checks SVG/DXF/PNG/PDF regressions.

DXF stairs, physical qualification and broader native parity remain open.

## Results

All 884 unit tests and four Chromium/WebKit workflows passed. Production Svelte
checks reported zero errors and warnings; the production build passed. Visual
review of the browser-decoded downloaded SVG passed for all four stair shapes,
rotated treads, directional arrows, labels and framing. Furniture export
regressions passed across all four formats.
