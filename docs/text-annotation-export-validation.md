# Saved text annotation exports

PNG and PDF previously omitted saved text annotations. SVG emitted a single text
node, collapsing line breaks, and annotations did not affect framed bounds. DXF
also omitted them.

PNG/PDF now use the existing canvas annotation renderer. SVG emits positioned
lines with preserved whitespace, saved size, rotation and color. DXF emits each
line at its rotated world position on a true-color layer (three/six-digit hex
colors; unsupported color syntax uses the standard fallback). Blank lines retain
their spacing. Framed exports include rotated measured text ink bounds.

Tests cover centered multiline spacing, rotated ink bounds, unchanged source
notes, PNG/PDF drawing, SVG escaping/lines and DXF text/color. The browser fixture
places a rotated three-line note outside the wall envelope, measures rendered
SVG line boxes, checks visible red pixels in PNG and verifies DXF/PDF downloads.

Remaining: embedded/universal font coverage, title-block text, dimension
annotations and other object categories, plus native/export parity. This batch
does not add native text authoring or alter saved annotations.

Validation on 2026-09-09: all 18 targeted layout/export/real-jsPDF tests passed,
Svelte checks reported zero errors/warnings, and production build passed. All six
Chromium/WebKit production export checks passed. The actual exported PNG was
visually inspected for multiline text, rotation, color and unclipped framing.
