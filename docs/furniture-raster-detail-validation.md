# Furniture detail in PNG and PDF — 2026-09-10

PNG and PDF plan rendering now call the same furniture-symbol renderer as the
editor, replacing their independent generic rectangle loops. Catalog-specific
geometry, colors, signed scale, rotation and readable captions now agree with the
canvas. Unknown entries keep the shared fallback symbol. No selection handles are
exported, and project data is unchanged.

All 859 unit tests, six Chromium/WebKit workflows, Svelte checks (zero errors and
warnings), and the production build passed. Units verify detailed armchair paths
in both raster exports and the dimensions of unknown fallback paths. Browser
workflows download a gallery containing an armchair, mirrored/rotated bed, toilet,
dining table, mirrored sofa and unknown item, check unchanged exported project
data, and rerun oversized rotated/mirrored furniture export-bound regressions.
Visual review of the gallery PNG confirms detailed symbols, readable captions,
and complete framing. PDF uses the same raster plan path; its download was checked.

Detailed SVG/DXF furniture symbols, independent opening alignment, physical
qualification and broader native parity remain open.
