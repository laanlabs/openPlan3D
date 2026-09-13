# Fit Selection

September 10, 2026.

The zoom toolbar now offers Fit Selection, also available with Shift+F. F continues
to fit the full plan. Selection fitting reuses the bounded zoom search and accounts
for the phone properties sheet. It does not change geometry or history, and an
empty/non-geometric selection leaves the camera unchanged. Zoom controls move
above an overlapping properties sheet using its measured height. Choosing one
Layers item clears the old multi-selection.

The bounds filter includes selected walls (with attached symbols), furniture,
stairs, columns, entourage, text, measurements and dimensions. Selected rooms
include their walls even when room labels are hidden, and their visible labels
and internal dimensions participate in framing. Selected openings use their host
wall for position/tangent without including that wall's full extent. Distant
unselected objects and background images do not influence selection framing.

Unit coverage checks exclusion of distant objects, selection immutability, empty
selection, host-wall isolation and hidden-label room framing. Browser coverage
starts with Select All, then selects a distant rotated L stair through Layers
while a wall lies far away,
checks both the button and Shift+F after full-plan Fit, verifies the rendered stair
fits above properties, and compares exported geometry. Full-plan opening framing
regressions run alongside. All 821 unit tests passed, with the three selection
cases passing again after a fixture type correction. Final Svelte checks reported
zero errors/warnings and the production build passed. All twelve final Chromium/
WebKit selection and full-plan framing checks passed. Phone screenshot review
confirmed the geometry and controls sit above the sheet. The initial phone run
caught the covered button; measured control positioning fixed it before rerunning.

Selected-opening dimension labels, annotation group editing, physical gestures,
and export/native parity remain follow-up work. Guide lines have no finite
selection bounds. Native application code is unchanged.
