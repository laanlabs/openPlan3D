# Overlapping room boundaries — 2026-09-09

Room graph construction now consolidates coincident split segments into one edge
carrying every contributing source wall ID. Endpoint splitting partitions partial
collinear overlaps first. The source walls are retained unchanged; this does not
merge or delete editable walls or their viewer meshes.

Previously, adjacency traversal selected one contributing wall ID, dropping the
other aliases. Reordering duplicate boundaries could therefore change room
identity. The initial regressions reproduced the lost duplicate-boundary and
divider IDs. Detection and polygon reconstruction now share the consolidated
graph. Saved metadata matching expands coincident aliases, so adding a duplicate
or partial overlap preserves the existing room name and finish. Multiple saved
rooms with the same expanded boundary remain unmatched rather than choosing one.

The implementation retains the existing endpoint tolerance and faceted curve
approximation. It is not a general repair tool for overlapping wall solids.
Ambiguous faces with identical source-boundary sets, nested courtyard/stair voids,
wall-face area conventions and native topology agreement remain open.

## Verification

Three unit tests cover duplicate reversed boundaries, partial collinear overlaps,
duplicate dividers, room and polygon areas, source immutability, reversed input
order, retention of every source ID, metadata after adding overlaps, and rejection
of ambiguous saved metadata matches. Browser tests inspect four separate 3×2 m
slabs on each floor after importing duplicate and partially overlapping walls,
including switching the active floor and checking that overhangs have no slab.

All **677 unit tests in 48 files** passed. Svelte reported zero errors and warnings,
and the production build passed. All **six Chromium/WebKit browser checks**
passed: overlapping boundaries, crossing rooms and curved rooms, each including
active-floor switching and checks of actual exported geometry. The shared graph
is constructed once per room-resolution call and reused for alias matching and
face tracing. These synthetic checks do not establish physical-device or active
navigation performance targets.
