# Opening-only group movement — 2026-09-10

Multi-selection dragging now captures doors/windows whose host walls are outside
the selection. Each original opening center receives the drag delta, then projects
back onto its own host using the same endpoint constraints and curve projection
as individual opening drags. The opening stays on its original wall and retains
its dimensions, type, swing and other metadata. Its initial grab offset is retained.

Openings whose hosts are selected are omitted from the independent movement map;
they follow the translated host exactly once. The shared gesture remains one
Undo/Redo step. Zero or non-finite deltas preserve the initial position.

This is wall-constrained movement: perpendicular drag on a straight host does not
move its openings, and curves/differently oriented hosts can produce different
projected distances. The existing 0.1–0.9 position limits and sampled curved-wall
projection remain unchanged. This does not rehost openings or add collision rules.

Unit tests cover same-host spacing, perpendicular motion, reversed hosts, endpoint
limits, curved projection, no-op deltas and unchanged wall data. Desktop/phone
browser tests drag a saved door/window-only group on straight and curved hosts,
verify both members move, preserve exact host/metadata data, and check Undo/Redo.
Existing hosted-opening group workflows are rerun to check against double movement.

Independent opening alignment, detailed furniture exports, physical qualification
and broader native parity remain open.

All 858 unit tests, 12 Chromium/WebKit workflows, Svelte checks (zero errors/
warnings), and the production build passed. Two additional curved-host phone
runs passed after adding Fit to the screenshot step; visual review confirms the
moved openings remain visible above the properties sheet in the fitted view.
