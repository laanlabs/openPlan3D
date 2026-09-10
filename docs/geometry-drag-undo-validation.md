# One-step geometry drag history

September 9, 2026.

Several geometry drag paths took snapshots at both pointer-down and pointer-up,
so the first Undo restored the already-moved state. Whole-room dragging took only
the final snapshot, while curve edits could add mutation snapshots during the drag.

Wall endpoint/parallel/curve, room, stair, column, text and group drags now share
a gesture-owned undo group. It starts after three screen pixels of movement,
captures the original project before mutation, and commits once on release.
Simple selection clicks do not begin a geometry history group. Existing furniture
and room-label gesture history remain separate.

The browser regression drags each affected individual geometry type, checks that
the target changed, verifies that one Undo restores the original wall/object data,
and verifies that Redo restores the moved data. Group-drag coverage remains in
the same validation run.

Opening/guide/entourage gesture history, cross-platform physical gestures and the
broader export/native backlog remain follow-up work.

Validation: all 782 unit tests passed. Chromium and WebKit passed checks for all
seven individual drag types and desktop/phone group dragging. The initial
Chromium stair attempt did not move its target while framing was settling; the
test now waits for a painted Fit, and the final stair rerun passed in both engines.
Svelte checks reported zero errors/warnings and the production build passed.
