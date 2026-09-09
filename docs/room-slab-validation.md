# Room-shaped preview slabs — 2026-09-09

Active and inactive stacked floors now share a closed, 5 cm thick slab geometry
under each detected room polygon. Its top is at the floor elevation and its
thickness extends downward. Concave recesses and gaps between disconnected rooms
remain open; the previous inactive-floor bounding rectangle filled those spaces.
Unenclosed walls no longer imply a rectangular upper-floor slab. Active-floor
finish surfaces remain above the slab and retain their existing textures.

This uses the same resolved room polygons as the existing room finishes and
preserves the source project. It is a preview improvement toward building
completeness, not a finished slab authoring system. Room boundaries still use the
existing wall-centreline convention and curve handling; curved room boundaries,
stair voids, nested courtyard holes, configurable thickness, wall-face offsets,
and native structural slab support remain open. The neutral export still includes
its separate rectangular ground support below the entire scene.

## Verification

The geometry regression checks both polygon windings, a closed two-manifold
triangle surface, positive signed volume, downward thickness, immutable inputs,
and clear rays through an L-shaped recess. Invalid outlines and thicknesses are
rejected. Browser tests inspect the actual exported triangles for two disconnected
rooms, including a concave room, on both floors before and after switching the
active floor. Both room interiors remain supported; their recess and the gap
between rooms remain empty at each floor elevation.

All **667 unit tests in 45 files** passed. Svelte reported zero errors and warnings,
and the production build passed. All **eight Chromium/WebKit browser checks**
passed, including the new slab fixture plus curved openings and desktop/phone
portable exports. The new stacked slab fixture was byte-identical across engines.

The actual browser download completed in an isolated Blender 5.2.1 LTS queue.
Independent verification matched the scene and PNG receipt hashes, byte counts
and 512×512 dimensions. Visual inspection confirmed that the upper floor follows
the L-shaped footprint and remains separate from the detached room.

- Scene: 37 meshes, 26,409 bytes; SHA-256 `c129f6857e4c2ba4e079bc6f300ffe50234f7f60d7759c77dadfba65270dc63b`.
- PNG: 205,887 bytes; SHA-256 `db00b069d45ce9ef935a660562b4aab4f270ab9bab9be628e5672e9619f5cf44`.
- Local preview runtime: 2.42 seconds; sampled peak memory: 525,762,560 bytes.

These synthetic checks establish geometry correctness for the tested outlines,
not physical-device qualification or a performance budget.
