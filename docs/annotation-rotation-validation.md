# Annotation rotation — 2026-09-10

The R shortcut now rotates notes, measurements and dimensions, including
canvas-local measurement/dimension selections that have no primary element ID.
A note rotates around its anchor. A single measurement or dimension rotates
around the midpoint of its endpoints. Text, font, color, dimension offset and
custom labels are preserved.

Mixed selections rotate all supported movable objects and annotation geometry
around one pivot. Object extents, note anchors, measurement endpoints and offset
dimension lines determine the group pivot; screen-sized captions do not change
it with zoom. Locked furniture and entourage remain fixed and do not influence
the pivot. Walls and openings retain their existing unsupported rotation status.

The rotation plan transforms both dimension endpoints, preserving length and
relative positions. Applying the plan updates only model-supported fields and
uses one Undo snapshot for the entire selection. No-op angles and empty selections
retain their previous history behavior.

## Coverage

Unit tests cover midpoint rotation, note styling and angle normalization, rigid
mixed-object/annotation transforms, locked exclusions, and complete Undo/Redo.
Browser cases select each annotation directly on the canvas and press R, then
compare exported geometry, metadata, preserved single-item centers, and exact
Undo/Redo state. A mixed case also checks locked entourage. Existing object-only
rotation workflows run alongside the new cases.

The existing image-storage quota test repeatedly exceeded its default five-second
limit while serializing multi-megabyte input. It now has a targeted 15-second
limit with every quota assertion retained; no application storage limit changed.

## Results

All 827 unit tests and all 12 Chromium/WebKit rotation workflows passed. Svelte
checks reported zero errors and warnings; the production build passed. Phone
screenshot review confirmed the rotated dimension, extension lines and caption
render correctly after Fit.

## Remaining work

Annotation alignment/distribution, independent note visibility, wall/opening
rotation, physical touch qualification and export/native parity remain open.
Native app code is unchanged.
