# Preserve room label placement in plan exports — 2026-09-09

PNG, SVG, PDF and DXF room labels now use the same saved anchor as the 2D editor.
Room name and area text move together; room geometry and dimensions do not move.
DXF keeps its existing flipped Y coordinate convention.

PNG/SVG/PDF framing now includes measured label text bounds, including labels
moved outside the walls. The measurement reserves space for both the name and
area line. PNG output and the raster floor-plan image embedded in PDF prefer the
existing 2x resolution, but now cap their longest side at 4096 pixels. A distant
label or large plan therefore cannot request an arbitrarily large export canvas.
The complete plan is scaled to fit that cap; the editable project is unchanged.

## Verification

All **682 unit tests** passed. New coverage checks SVG coordinates, real DXF TEXT
entity coordinates, PNG/PDF drawing coordinates, source immutability, off-plan
label bounds and the raster limit. Svelte checks reported zero errors/warnings,
and the production build passed.

Two browser checks passed in Chromium and WebKit. Each imports a room label moved
2000 cm left, downloads all four formats, measures the SVG text bounding box in
the browser, checks the actual PNG header/dimensions and DXF coordinates, and
confirms PDF serialization produces a nonempty PDF. The downloaded PNG was
visually inspected: the moved label is visible to the left of the plan. PDF
page layout was not separately visually qualified in this batch.

Other renderer differences (including curved wall/opening export fidelity),
physical-device downloads, font/device variation, and native label conventions
remain open. This change does not establish general print-layout or device
performance qualification.
