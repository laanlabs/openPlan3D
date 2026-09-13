# Annotation alignment and distribution — 2026-09-10

Saved text notes, measurements and offset dimensions now participate in the
existing alignment toolbar alongside positioned objects. All six align operations
and both center-distribution operations use measured annotation bounds, including
multiline/rotated note text, dimension captions and offset geometry. Measurement
uses one pixel per world unit, independent of the current view zoom; screen-only
minimum-font enlargement does not change saved alignment results.

Notes translate their anchors. Measurements and dimensions translate both
endpoints equally, preserving direction, length, offset, labels and other fields.
Existing locked objects remain fixed anchors. The full operation stays one
Undo/Redo action, and repeating an already satisfied operation adds no history.

Unit tests cover all eight operations on a rotated multiline note, slanted
measurement and labeled offset dimension, checking aligned bounds or equally
spaced centers, metadata, endpoint vectors, Undo/Redo and repeated-operation no-ops.
Browser tests exercise Align Left and Distribute Horizontally on annotation-only
selections on desktop and phone, compare exported data, and verify Undo/Redo.
Existing object/lock browser workflows are rerun as regressions.

Walls/openings remain outside alignment support. Annotation visibility controls,
opening-only group movement, detailed furniture exports, physical qualification
and broader native parity remain open.

Validation: the full unit run passed 845 of 847 tests, with two unrelated five-
second timeouts in furniture-category package roundtrips and portable-render input
validation. Both complete files passed on an isolated rerun. Svelte checks reported
zero errors/warnings and the production build passed. All 16 final Chromium/WebKit
workflows passed, and phone visual review confirmed usable controls and visible
annotations. An initial screenshot step targeted an obscured footer Fit button;
it was corrected to use the supported F shortcut before the final browser run.
