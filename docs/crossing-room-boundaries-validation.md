# Crossing room boundaries — 2026-09-09

Room graph construction now adds an intersection vertex to both crossing wall
segments before tracing faces. Endpoint T-junctions retain their existing snap
behavior. Curved walls use the viewer's facets, so a crossing need not coincide
with an existing curve vertex. The editable source walls are not split or moved;
subsegments retain their source IDs for room metadata matching.

Previously, two dividers crossing through a room could remain disconnected in
the graph, yielding incorrect room counts and polygons. The regression fixture
uses dividers that extend past the exterior walls and now resolves four separate
6 m² rooms, with no slab under the overhanging parts. Polygon reconstruction uses
the same split graph, preserving the room footprint in active and stacked views.

This handles nonparallel finite segment intersections. Collinear overlaps,
duplicate walls, ambiguous rooms sharing identical source-wall ID sets, nested
courtyard holes and a new interior-face area convention remain open. It retains
the existing endpoint tolerance and faceted curve approximation.

## Verification

Three unit tests cover orthogonal and diagonal intersections, overhanging wall
ends, summed areas and exact reconstructed polygons, immutable source geometry,
reversed directions/order, metadata preservation, parallel disjoint walls, and
a divider intersecting a curve between facet vertices. Browser tests inspect
actual exported slab triangles and bounds for four rooms on each of two floors,
before and after switching the active floor.

All **674 unit tests in 47 files** passed. Svelte reported zero errors and warnings,
and the production build passed. All **six Chromium/WebKit browser checks**
passed: crossing rooms, curved rooms and concave/disconnected slabs, including
active-floor switches. The crossing fixture's exports were byte-identical across
both engines.

The actual Chromium stacked download completed in an isolated Blender 5.2.1 LTS
queue. Independent verification matched input/PNG hashes, byte counts and 512×512
dimensions. Visual inspection confirmed four divided rooms on the upper floor.

- Scene: 31 meshes, 21,117 bytes; SHA-256 `4caee37090535a928f04310c254f5cf038ec0e25b0ab0359e1901bc5b54b431f`.
- PNG: 205,466 bytes; SHA-256 `0887b534a99882e06bd902fd81de69f5c449d82f1a4ce2620b26d4bfc5d8d310`.
- Local preview runtime: 2.62 seconds; sampled peak memory: 525,942,784 bytes.

These synthetic tests do not establish physical-device or performance budgets.
