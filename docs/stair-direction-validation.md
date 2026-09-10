# Stair direction indicators

September 9, 2026.

L-shaped, U-shaped and spiral stairs previously drew the same arrow geometry for
UP and DN, despite changing their label. L-shaped arrows now reverse within the
first run, both U-shaped run arrows reverse, and spiral arcs reverse travel with
the arrowhead at the corresponding endpoint. Spiral arrowhead bases now lie
behind the tip in the travel direction, correcting their previously backward
orientation. Straight direction behavior remains covered by regression tests.

No dimensions, positions, tread counts or rotations are changed. The Direction
property remains the saved source of truth and its existing undo/redo semantics
are preserved.

Unit tests inspect the actual renderer's filled arrow triangles for every stair
type and both directions, including the spiral tangent. Browser coverage changes
Direction on all four types, observes updated selected arrow geometry, undoes and
redoes the change, then verifies the JSON direction and untouched geometry.

Stair exports, below-floor ghost geometry, multi-selection framing, physical
device qualification and broader native parity remain open.

Validation: all 780 unit tests passed. Eight Chromium/WebKit behavior checks and
four final WebKit phone QA checks passed. Svelte checks reported zero
errors/warnings and the production build passed. L, U and spiral Down-direction
phone screenshots were visually reviewed with the Layers panel closed and Fit
applied above the properties sheet.
