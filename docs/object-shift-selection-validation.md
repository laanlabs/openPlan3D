# Object Shift-click selection — 2026-09-10

Shift-click now toggles furniture, columns, stairs, entourage, doors, windows and
walls in the selection. Previously, the canvas entered its Shift-pan handler
before reaching object selection, making those modifier branches unreachable.

The early hit test follows the existing object priority: columns, stairs,
furniture, entourage, openings, then walls. It runs after annotation hit tests
and before pan/drag handles. A hit uses the same selection toggle as annotations,
which clears stale auxiliary/room state, chooses a remaining primary item when
necessary, and normalizes a single remaining member to single-selection state.

Shift on empty canvas retains pan behavior. Space and explicit pan mode still
take priority over modifier selection.

## Coverage

`tests/browser/object-shift-selection.spec.ts` exercises all seven object kinds.
Each workflow Shift-selects two objects, removes one, compares the complete
exported floor to prove selection has not changed geometry, deletes the remaining
member, and verifies exact Undo restoration. Door/window fixtures keep their
host walls, so selection priority is tested at overlapping opening/wall points.
The furniture case additionally pans empty canvas with Shift and verifies a
camera change without an exported geometry change.

Saved annotation group and Shift-click regressions run alongside these cases.

## Results

Svelte checks reported zero errors and warnings, and the production build passed.
All 18 Chromium/WebKit workflows passed across the main run and the focused
furniture rerun. The initial furniture fixture used an unknown catalog ID, which
the canvas neither renders nor hit-tests. Replacing it with the catalog armchair
made the fixture exercise actual furniture; both selection and empty-canvas pan
checks then passed. Application code was unchanged between browser runs.

## Remaining work

Unknown-catalog furniture rendering/hit-testing, broader Ctrl/Cmd-click group isolation consistency, annotation alignment,
independent note visibility, physical touch qualification and export/native
parity remain open. Native app code is unchanged.
