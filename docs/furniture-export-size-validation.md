# Furniture export size and orientation — 2026-09-10

PNG, PDF, SVG and DXF furniture rectangles now use the same scaled dimensions as
the editor and Fit bounds. Missing catalog entries use the shared 50 cm fallback
and an Unknown furniture label; raster/SVG fallback color matches the editor.
Saved dimensions and catalog identity remain unchanged. Mirror signs affect the
symbol's orientation, while rectangular export footprints use their magnitudes.

DXF now inverts each rotated corner's vertical coordinate after rotation, matching
the plan-to-CAD axis conversion used for the item position. Previously the rotated
rectangle leaned the opposite way from its plan representation.

Unit coverage checks saved and omitted dimensions with negative/nonuniform scale,
all four export paths, exact DXF corner coordinates at 30 degrees, labels, and
unchanged source data. Browser coverage downloads SVG/PNG/PDF for an oversized
45-degree item with unit scale and mirrored/nonuniform scale, checks SVG corners
against export bounds, and verifies PNG dimensions and PDF download signatures.

Unknown-catalog 3D rendering remains open. Furniture exports still use generic
rectangular symbols; detailed catalog symbol/model export parity remains separate.

All 836 unit tests, four Chromium/WebKit download workflows, Svelte checks
(zero errors/warnings), and the production build passed. Visual review of the
scaled PNG confirms the full footprint and label remain within the export.
