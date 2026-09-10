# Annotation clipboard support

September 10, 2026.

The plan clipboard now supports text notes, measurements and dimension annotations.
Copy recognizes canvas-local measurement/dimension selection as well as primary
and multi-selection IDs, and filters unsupported selections. Paste uses captured
data, generates fresh IDs and applies the existing 30 cm per-paste translation.
Notes retain text, font, color and rotation. Measurements and dimensions translate
both endpoints, preserving length, label and perpendicular offset. Complete saved
groups remap their copied annotation IDs.

Generic deletion now includes measurements and dimensions. Their specialized
removal functions, and text removal, delegate to shared deletion so group references
are cleaned consistently. Each paste and deletion remains undoable.

Unit coverage checks all annotation forms, successive offsets, preserved fields,
source immutability and saved-group references. Browser coverage on phone-width
viewports copies each type, deletes its original, pastes twice, checks saved fields
and unrelated geometry, then Undo/Redo. The text case selects a rendered note after
Select All. All 822 unit tests passed. Svelte checks reported zero errors/warnings,
the production build passed, and all six Chromium/WebKit clipboard workflows
passed.

Annotation multi-selection/group bounds and transforms, cross-project assets,
selected-opening labels, physical gestures and export/native parity remain open.
Native application code is unchanged.
