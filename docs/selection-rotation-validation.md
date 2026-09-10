# Group rotation shortcut

September 10, 2026.

R previously rotated only the primary furniture item. It now rotates unlocked
selected furniture, stairs, columns and entourage by 15 degrees around the center
of their collective plan bounds. Those bounds include scale, rotation, asymmetric
stairs and custom entourage aspect ratios. Locked objects are excluded from both
the transform and the pivot calculation. A single movable item rotates in place.
Placing furniture retains its existing placement-angle shortcut.

The operation rotates object positions and orientations rigidly, normalizes angles
to [0,360), and creates one history entry. Invalid angles, full turns and selections
with no movable supported objects create no history entry.

Unit coverage checks a known group pivot, locked/unselected exclusions, single
rotation for all four types, negative angles and Undo/Redo with no-op calls.
Browser coverage checks a mixed group on a phone-width viewport and a single
entourage item on desktop, including the 15-degree transformation of relative
position vectors, unchanged locked objects and exported Undo/Redo states. The
existing lock shortcut regressions run alongside. All 805 unit tests passed;
Svelte checks reported zero errors/warnings and the production build passed.
All eight Chromium/WebKit rotation and lock workflows passed.

Walls/openings and annotations are excluded from this positioned-object rotation.
Their constraint handling, cross-project assets, opening bounds, physical gestures
and export/native parity remain follow-up work.
