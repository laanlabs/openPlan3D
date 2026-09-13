# Multi-selection geometry bounds

September 9, 2026.

The group-selection box previously used furniture/stair/column centers and wall
endpoints, plus a fixed margin. Visible geometry could lie outside the group drag
region. In particular, clicking an L stair's outer arm could manipulate only that
stair instead of the selected group.

The box now uses wall curve/stroke bounds, rotated furniture bounds, shape-aware
stair footprints and rotated column bounds. It excludes unselected items and
retains the existing 20cm margin. Opening anchors now follow curved walls, while
opening symbol extents and broader group-operation support remain follow-up work.
The box used for drawing and the group-drag hit region share the same helper.
Group dragging also no longer takes a second history snapshot at pointer-up: the
existing pointer-down snapshot now lets one Undo restore the pre-drag state.

The browser regression selects an L stair and a rotated column, verifies that
the group box contains the stair's painted regions, drags from the outer arm,
checks identical movement for both objects and verifies a single Undo restores
both. Unit coverage includes curved walls and distant unselected objects.

Dedicated Fit Selection, opening symbol extents, entourage/annotation group
operations, stair exports and physical/native qualification remain open.

Validation: all 782 unit tests passed. Eight stair-footprint regressions and four
final group-drag/Undo checks passed across Chromium and WebKit at desktop/phone
sizes. The browser regression exposed the duplicate pointer-up snapshot; final
checks verify one-step Undo after its removal. Final Svelte checks reported zero
errors/warnings and the production build passed. The fitted phone group-selection
screenshot was visually reviewed.
