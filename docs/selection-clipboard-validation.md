# Snapshot-based plan clipboard

September 10, 2026.

Copy previously saved some data but Paste looked up the live source IDs and
supported only furniture, doors and windows. Pasting therefore changed with
source edits and failed after source deletion. Copy now captures an independent
floor snapshot and selected IDs. Paste uses the captured geometry for walls,
openings, furniture, stairs, columns, entourage and complete saved groups.

Each successful paste applies the next 30 cm offset on both axes, creates fresh
IDs, remaps carried openings/groups and owns one history action. Standalone
openings retain the existing incremental wall-relative position behavior when
their wall still exists. They are skipped if the destination has no matching
wall; no orphan opening or empty history action is created. The clipboard persists
across floors in the same project and clears when changing projects, preserving
project-local custom symbol references. Cross-project transfer remains future
work. The existing context-menu Paste uses the same keyboard handler.

Unit coverage checks saved geometry after source mutation/deletion, independent
successive offsets, absent host walls and the existing duplication/group cases.
Browser coverage copies mixed and entourage-only selections, deletes all source
objects, pastes twice, and checks positions, identity, carried openings, collection
counts and Undo/Redo through exported JSON. Duplicate regressions run alongside.
Validation: all 788 unit tests passed, along with final Svelte checks (zero
errors/warnings) and the production build. Four Duplicate regressions passed in
Chromium/WebKit. All four final clipboard workflows passed in those engines.
The initial browser run found that the canvas's Svelte reactive object could not
be structured-cloned; Copy now captures the plain active-floor store value.

Annotation clipboard support, cross-project custom assets, alignment/distribution,
opening bounds, physical gestures and export/native parity remain follow-up work.
