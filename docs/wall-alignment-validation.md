# Wall alignment and distribution — 2026-09-10

Straight and curved walls now participate in the existing six alignment and two
center-distribution operations. Bounds include wall thickness and exact quadratic
curve extrema. Moves translate the complete wall: both endpoints and, when
present, its control point. Height profiles, finishes and other metadata remain
unchanged. Hosted doors/windows retain their wall IDs and normalized positions,
so they follow the translated wall without independently changing their data.

Only selected walls move; alignment does not move unselected neighboring walls
or rebuild connectivity. As with other alignment targets, locked positioned
objects remain fixed anchors. All changes are grouped into one Undo/Redo action;
repeating a satisfied operation adds no history.

Unit coverage exercises all eight operations with a straight wall and opposite
curves of different thicknesses, including a sloped height profile and hosted
openings. Assertions check resulting bounds/spacing, equal translation of every
control point, unchanged metadata/opening data, no-op history and exact Undo/Redo.
Desktop/phone browser tests use Align Left and Distribute Horizontally and compare
exported floors; existing annotation workflows are rerun as regressions.

Independent opening alignment, opening-only group movement, detailed furniture
exports, physical qualification and broader native parity remain open.

All 856 unit tests, 16 Chromium/WebKit workflows, Svelte checks (zero errors/
warnings), and the production build passed. Phone screenshot review confirms
selected walls and hosted openings remain visible above the properties sheet.
