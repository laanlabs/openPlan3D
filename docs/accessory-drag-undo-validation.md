# Opening, guide and entourage drag history

September 10, 2026.

Door, window and guide mutations previously added history snapshots during a
drag. Entourage movement and resizing took a snapshot on pointer-down, including
selection clicks. These paths now share the existing geometry gesture undo group:
three screen pixels of movement begin the group before mutation, and release
commits it once. Entourage lock checks remain in place.

The browser regression imports a local fixture, drags each of the five affected
paths, verifies changed data, checks that one Undo restores the imported state,
and checks that Redo restores the moved data. It compares exported plan data,
including unaffected geometry. Tips are marked seen in the isolated test profile
to avoid racing their automatic dismissal. The baseline is exported after import
because importing doors supplies a missing `flipSide: false` default.

Validation: 782 unit tests passed; Svelte checks reported zero errors/warnings;
the production build passed. Eight browser checks passed for windows, guides,
entourage movement and resizing. The final door rerun passed in both Chromium
and WebKit after correcting the import baseline and waiting two animation frames
after painted Fit. Earlier attempts exposed test setup races with auto-dismissed
tips and canvas layout, plus the omitted door import default. Physical touch and pen gestures,
opening symbol bounds, entourage group operations, and export/native parity
remain follow-up work. Native application code is unchanged.
