# Detailed furniture symbols in SVG — 2026-09-10

SVG exports now use the shared furniture icon definitions through a small canvas-
command adapter. Straight segments, quadratic curves, circular/elliptical arcs,
rectangles and symbol text are emitted as SVG elements rather than embedded images.
Each item retains its world placement, scaled dimensions and signed mirror
transform. Captions sit outside the mirror transform and use the same positioning
and font sizing as the canvas renderer. Saved project data remains unchanged.

The adapter intentionally supports the command surface used by the icon registry;
unsupported methods throw rather than silently omitting drawing operations. Unit
coverage runs every catalog entry, rejects invalid-coordinate/raster output,
checks detailed and elliptical paths, and verifies escaping. Existing export
units cover unknown dimensions and identity preservation.

Browser coverage downloads a known/unknown furniture gallery, checks vector path
output, loads the actual SVG through the browser image decoder and produces a
preview for visual review. Oversized rotated/mirrored export-bound tests use the
item's exported bounds metadata and verify geometry stays inside the view box.

Detailed DXF furniture symbols, independent opening alignment, physical
qualification and broader native parity remain open.

All 861 unit tests, six Chromium/WebKit workflows, Svelte checks (zero errors/
warnings), and the production build passed. Visual review of the decoded SVG
gallery confirms detailed symbols, readable mirrored captions and complete framing.
