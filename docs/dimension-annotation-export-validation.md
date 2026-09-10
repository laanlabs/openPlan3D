# Saved dimension annotation exports

PNG/PDF now draw saved dimension annotations with the shared canvas renderer.
Framed PNG/SVG/PDF bounds include endpoints, offset lines, arrows and label width.
SVG default dimension labels now respect the selected units. DXF includes leader
lines, dimension lines, arrow strokes and custom/default labels.

A zero offset now remains zero in canvas/SVG rendering and hit testing. Canvas
extension lengths scale once with zoom; long-label gaps cannot run beyond the
dimension endpoints. Source annotations remain unchanged.

Tests cover signed/zero offsets, degenerate segments, source preservation,
zero-offset hit testing, canvas drawing at two zoom levels, long-label gaps and
labels in all four formats. Browser coverage places signed and zero-offset
callouts outside the wall envelope, verifies SVG offsets/framing and visible PNG
annotation pixels, and serializes DXF/PDF.

Remaining: standalone measurement objects, all-object bounds, universal font
support, title-block layout, physical scale/device checks and native parity.
DXF annotations are primitive drawing entities rather than editable CAD DIMENSION
objects. Existing format-specific label placement remains.

Validation on 2026-09-09: all 21 targeted geometry/canvas/hit/export/real-jsPDF tests
passed; Svelte checks reported zero errors/warnings and production build passed.
Six text/curved-wall browser regressions passed. Both final Chromium/WebKit
dimension checks passed after replacing a downsampled pixel threshold with
native-resolution pixel inspection. The exported PNG was visually reviewed.
