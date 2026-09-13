# Complete selection duplication and deletion

September 10, 2026.

The canvas Duplicate button previously copied only the primary selected object.
It now copies selected walls, doors, windows, furniture, stairs, columns and
entourage in a single history action and selects the copies. The contextual
Duplicate/Delete toolbar is also available for stairs, columns and entourage.

Positioned objects and wall endpoints/control points move by 30 cm on each axis.
Openings on copied walls retain their wall-relative positions and point to the
new walls; carried openings are copied once even if also explicitly selected.
Standalone openings retain the existing same-wall +0.1 parameter behavior.
Copies preserve nested metadata without sharing references with originals.
Complete saved groups receive new IDs and copied member references. Partial
groups are not recreated. Deletion removes references to deleted objects and
carried openings, dropping groups with fewer than two remaining members.

Unit coverage checks a mixed curved-wall selection, carried openings, unique
IDs, custom entourage settings, metadata independence, complete/partial groups,
standalone opening behavior, missing IDs and wall-deletion group cleanup with
Undo. Browser coverage exercises mixed and entourage-only selections through
Duplicate, Undo, Redo, Delete and Undo, comparing exported geometry and groups.

Validation: the 785-test unit suite passed before the final group-deletion
cleanup; all three focused unit cases passed afterward. Final Svelte checks
reported zero errors/warnings and the production build passed. All four final
Chromium/WebKit mixed and entourage-only workflows passed, including exported
group data. The initial entourage tests encountered two Delete buttons; the
final locator explicitly targets the contextual canvas toolbar. Clipboard copy/paste still uses its
older ID-based paths; alignment/distribution, annotation selection, opening bounds,
physical gestures and export/native parity remain follow-up work.
