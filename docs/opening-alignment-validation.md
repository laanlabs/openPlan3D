# Independent opening alignment — 2026-09-10

Doors and windows now participate in all eight alignment/distribution operations
when selected independently of their hosts. The calculation uses the existing
opening symbol bounds at a fixed zoom of one, including door swing/pocket reach
and window decorations. Mixed object/opening selections use the same targets.

Each opening stays attached to its current host. A bounded numerical search finds
the host position that best matches the requested edge or center, accounting for
changes in the tangent on curved walls. The allowed interval is 0.1–0.9, matching
existing opening drag constraints. Equal solutions favor the nearest original
position; unreachable targets minimize the remaining error. This does not rehost
openings or prevent overlapping openings. Perpendicular movement on a straight
host is impossible and leaves the opening unchanged.

Selected host walls carry their openings once; their openings are excluded as
independent alignment targets. Orphan openings do not enable the toolbar. Wall
geometry, opening metadata and unrelated plan data remain intact. Actual changes
form one Undo/Redo step, and no-op operations do not add history.

Unit coverage checks all eight operations on slanted hosts, exact history and
metadata, curved-door edge fitting and nearest-branch selection, mixed locked anchors,
perpendicular/endpoint constraints, and
selected-host/orphan filtering. Browser coverage selects an opening-only saved
group and aligns a door/window pair on straight and curved hosts at desktop and
phone widths, checking downloaded project data and Undo/Redo. Existing wall
alignment workflows cover selections that include both hosts and openings.

## Results

The full 874-test unit suite passed, followed by the expanded 37-test alignment
suite (including the additional mixed-selection case and nearest-branch check).
All 16 Chromium/WebKit workflows passed. Production Svelte checks reported zero
errors and warnings, and the production build passed. Phone visual review verified
accessible alignment controls and the fitted host; exact downloaded data verifies
geometry because selection handles cover the overlapping aligned symbols.

Physical qualification and broader native editing/rendering parity remain open.
