# Standalone measurement exports

PNG/PDF now render saved measurement lines with the existing dashed-line,
endpoint and label renderer. SVG labels follow the selected units and include
endpoint dots. DXF includes dashed measurement lines, endpoint circles and
labels on dedicated layers. Framed exports include endpoints and label extents.

Tests cover metric and imperial labels in all four formats, inclusion in
PNG/PDF drawing and outside-wall bounds. The browser fixture places a measurement
outside the walls and checks SVG endpoint margins, native-resolution red PNG
pixels and DXF/PDF downloads. Dimension-callout regressions are also exercised.

Remaining: all-object framing, universal font metrics, native parity and physical
scale/device qualification. DXF measurements use drawing primitives rather than
editable CAD DIMENSION entities. Existing floors-with-walls export requirements
remain in place.

Validation on 2026-09-09: all 19 targeted export/real-jsPDF tests passed, including
imperial labels. Svelte checks reported zero errors/warnings and production build
passed. All four Chromium/WebKit measurement/dimension browser checks passed.
The actual exported PNG was visually inspected for its line, endpoints, label
and margins.
