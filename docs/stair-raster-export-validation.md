# Stair geometry in PNG/PDF exports — 2026-09-10

PNG/PDF exports previously omitted stairs, rejected stair-only plans as empty,
and did not include stairs in their export-specific bounds. Both formats now use
the shared stair renderer and the editor's footprint/caption bounds. Straight,
L-shaped, U-shaped and spiral stairs retain rotation, tread count, direction
arrows and labels, without selection handles or source-data changes. The empty
floor notices now list stairs as supported content.

The bounds include the asymmetric L/U footprints and the rotated external spiral
caption, preserving the existing 4096-pixel raster limit. Stair-only PNG/PDF plans
are accepted. SVG/DXF stair drawing is still outstanding; their content checks
continue to reflect their existing supported categories.

Unit tests cover each stair shape on a wall-free plan in both formats and compare
source data after export. Browser tests download the PNG and PDF from a four-shape
stair-only gallery, verify ink in every image quadrant, capture the actual plan
image passed to PDF encoding, check all direction labels and compare exported
project data before/after. Furniture gallery tests provide a regression check for
the surrounding export drawing order.

The batch also supplies the required default scale in the mixed-selection
alignment test fixture, which the next complete Svelte check caught after that
fixture was added late in the previous batch.

## Results

All 879 unit tests and four Chromium/WebKit browser workflows passed. Production
Svelte checks reported zero errors and warnings; the production build passed.
Visual review of the downloaded PNG and actual PDF plan-image source passed for
all four shapes, tread patterns, arrows, labels and rotated framing. This review
checks stair content, not physical printing or every PDF page-layout scenario.

SVG/DXF stair symbols, physical qualification and broader native parity remain open.
