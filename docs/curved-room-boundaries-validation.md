# Curved room boundaries — 2026-09-09

Room detection and polygon reconstruction now use the same 16 quadratic facets
as the web 3D wall mesh. Previously they traced the straight endpoint chord, so
room fills, finishes, ceilings and preview slabs could stop inside an outward
curve or extend across an inward curve. Derived room area now follows the faceted
centreline polygon too. A room can be enclosed by one curved wall and one straight
wall; at least two source walls are still required.

Facets retain source wall IDs, preserving room metadata by boundary identity.
T-junction splitting uses the faceted path and existing endpoint snap tolerance.
Neither curve control points nor source wall dimensions are rewritten.

This is a polygonal approximation, not exact analytic curve area or a new
interior-wall-face area convention. The existing 5 cm endpoint tolerance remains;
arbitrary crossing-wall intersections, nested courtyard holes, stair voids,
editable slab thickness and native curved-room fidelity remain open.

## Verification

Four new unit tests cover boundary points and area, source immutability, metadata
retention after a curve edit, reversed wall order/direction, two-wall curved
closures, a divider landing at the curve midpoint, pruning unused curve spans
from each divided room, and actual slab ray intersections inside/outside a bulge.
The outward-curve fixture has faceted area 29.9765625 m² (displayed as 29.98 m²),
versus the former 24 m² endpoint rectangle. Its analytic area is 30 m².

All **671 unit tests in 46 files** passed; the expanded inward/outward slab test
also passed in a final targeted rerun. Svelte reported zero errors and warnings,
and the production build passed. All **six Chromium/WebKit browser checks**
passed: curved rooms, curved openings and concave/disconnected room slabs, each
including active-floor switching. Checks inspect the exported slab triangles at
both floor elevations. Inspection of both engine exports also confirmed that the
active floor finish reaches the curved boundary. Curve exports need not be byte
identical across engines because of floating-point vertex arithmetic.

The actual Chromium stacked download completed in isolated Blender 5.2.1 LTS.
Independent checks matched scene/PNG hashes, byte counts and 512×512 dimensions.
Visual inspection confirmed the upper room's curved floor footprint.

- Scene: 61 meshes, 83,013 bytes; SHA-256 `c16845eef33f70fe90f2d3fe8f40e6ccbb3e61c72e23f8b7f0f15d00b8cd8232`.
- PNG: 198,835 bytes; SHA-256 `57733758f8f70ed40b3c3e1585fbe886eb4b1398a298902077d95eab151dfda8`.
- Local preview runtime: 2.86 seconds; sampled peak memory: 457,392,128 bytes.

These synthetic checks do not establish physical-device or performance targets.
