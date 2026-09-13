# Guide and annotation selection state

September 10, 2026.

Guide, measurement, dimension and text clicks now clear the previous group/room
and other auxiliary selection states before selecting their target. Selecting an
item through Layers updates the canvas's corresponding auxiliary selection, so
Delete routes to the correct object type. Deletion clears the primary selection
as well. Selecting another primary object clears old auxiliary targets.

Escape now clears guide, measurement, dimension, text and room selection state.
This prevents an invisible annotation remaining as the next Delete target and
keeps Fit Selection from including a previously selected annotation.

Browser coverage on phone-width viewports starts from Select All, selects a guide,
measurement or dimension in Layers, presses Escape then Delete and verifies the
entire exported floor is unchanged. It then reselects, deletes only that item,
checks all unrelated collections and undoes the deletion. Existing opening, guide
and entourage drag/Undo regressions run alongside. All sixteen Chromium/WebKit checks passed. Svelte checks reported
zero errors/warnings and the production build passed. This batch changed canvas
selection handling; validation used the browser workflows rather than new unit
mocks of the component's private state.

Broader annotation group transforms and clipboard support, selected-opening
labels, physical gestures and export/native parity remain follow-up work.
Native application code is unchanged.
