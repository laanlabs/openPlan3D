# Curved-wall group translation — 2026-09-10

Group dragging now captures each curved wall's original control point and moves
it by the same snapped delta as both endpoints. The curve therefore retains its
shape instead of bending around a control point left behind in world space.

A dedicated wall-geometry drag update applies the endpoints and optional control
point together. It preserves unrelated wall metadata, including omitted optional
height fields. The general wall-property update would have normalized those
height fields during an otherwise geometric move. The new drag update validates
all supplied points before changing any geometry and uses the canvas's existing
Undo group.

## Coverage

Unit tests cover curved geometry, unchanged wall metadata, multiple drag updates
in one Undo/Redo step, and rejection of invalid geometry without partial mutation.

`tests/browser/curved-group-drag.spec.ts` drags a saved group from a curved wall
at desktop and phone widths. The fixture includes opposite curvatures, attached
door/window openings, a grouped note/dimension, locked entourage, and an
unselected curved wall. Exact floor comparisons verify common endpoint/control
point translation, unchanged opening positions and unrelated objects, and full
Undo/Redo restoration. Straight-wall group dragging and Ctrl/Cmd isolation
regressions run alongside it.

## Results

All 829 unit tests and all eight Chromium/WebKit workflows passed. Svelte checks
reported zero errors and warnings, and the production build passed.

## Remaining work

Opening-only group movement, unknown-catalog rendering/hit-testing, annotation
alignment/visibility, physical touch qualification and export/native parity
remain open. Native app code is unchanged.
