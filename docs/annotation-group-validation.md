# Annotation group selection and movement — 2026-09-10

Notes, measurements and dimension annotations now participate in marquee and
Select All selection. Keyboard and context-menu Select All share the same path,
including entourage. Marquee includes a note when its anchor is inside and a
measurement/dimension when both endpoints are inside.

Group bounds include rendered note and dimension captions using the current
canvas context, zoom and measurement units. Unselected annotations do not expand
the group. Clicking a selected annotation retains the group so it can be dragged.
Movement translates both endpoints of measurements/dimensions and note anchors
by the same snapped delta, preserving lengths, offsets, labels and styles.
The existing gesture threshold and Undo group keep the drag to one history step.

Group Delete reaches the shared deletion path even when the primary element is
an annotation. Deselect All clears auxiliary and room selections, preventing a
subsequent Delete from acting on an old note or dimension.

## Coverage

- Bounds unit coverage checks rotated text, offset dimensions, low zoom, omitted
  unselected annotations, and unchanged source data.
- `tests/browser/annotation-group.spec.ts` checks desktop and phone viewports:
  marquee, Select All, Deselect All followed by Delete, Fit Selection, dragging
  from a note, identical translation of all three annotation kinds, exact
  exported-data Undo/Redo, grouped Delete and Undo.
- Single-annotation clipboard and auxiliary selection workflows are retained.
  The note clipboard test explicitly deselects the group before clicking one
  note, since Select All now includes notes.
- Existing mixed object group tests cover furniture/entourage locks and movement.

## Results

Svelte checks completed with zero errors and warnings. The production build
passed. All 18 final Chromium/WebKit annotation selection, group and clipboard
workflows passed, and all four existing mixed-object group workflows passed in
the preceding run. The phone screenshot was reviewed: annotation content and
bounds fit above the properties sheet, with Fit controls accessible.

The 823-case unit suite passed 822 cases; one existing image-storage test hit its
five-second timeout while a build was also running. Its entire 19-case test file
passed on an isolated retry, including the timed-out case. The new bounds case
passed in the full suite.

Run Svelte checks and the production build sequentially. An overlapping run
produced different server/client SvelteKit identifiers and failed before editor
startup. Rebuilding after checks completed produced matching identifiers,
verified directly in the served HTML and client chunks before the final tests.

## Remaining work

Saved-group re-selection through annotation clicks, Shift-click annotation
selection, annotation rotation/alignment, independent note visibility, physical
touch qualification, and export/native parity remain open. Native app code is
unchanged.
