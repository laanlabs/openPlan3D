# Geometry-aware alignment and distribution

September 10, 2026.

Alignment previously acted only on furniture, used unrotated dimensions and moved
locked items. It now supports furniture, stairs, columns and entourage using their
plan bounds, including rotated/asymmetric stair footprints and custom entourage
aspect ratios. Shared furniture bounds now include mirrored/nonuniform scale.
Edges align to the selection's outer bounds; center alignment uses visual centers.
Locked objects contribute reference bounds but remain stationary.

Distribution retains center-spacing semantics. The first and last visual centers
and any locked objects act as fixed anchors; unlocked centers are evenly spaced
within each interval. Each operation owns one Undo group. Insufficient selections,
fully locked selections and already-satisfied operations add no history entry.
The toolbar disables operations without enough supported objects or any movable
object, and its selection subscriptions now follow component lifetime.

Unit coverage exercises all eight operations, rotated/scaled furniture, asymmetric
stairs, custom symbols, locked distribution anchors, immutable planning, and
Undo/Redo with repeated and insufficient operations. Browser coverage verifies
left alignment and horizontal distribution at desktop and phone widths using
rotated/scaled furniture, entourage and a locked anchor, then exported positions
and Undo/Redo. All 798 unit tests passed, plus the final ten-case alignment
rerun with a repeated-operation history assertion. All eight Chromium/WebKit
browser checks passed. Svelte checks reported zero errors/warnings and the
production build passed.

Walls/openings and annotations are not included in these object alignment tools.
Their constraint handling, cross-project clipboard assets, opening bounds, physical
gestures and export/native parity remain follow-up work.
