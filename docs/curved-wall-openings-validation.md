# Curved wall openings — 2026-09-09

The web viewer now cuts doors and windows into its existing 16-facet quadratic
wall path on active and inactive stacked floors. Saved opening positions remain
quadratic parameters; physical widths are measured along that path. Overlapping
openings are subtracted as a union, end openings are clipped, and sloped wall
heights cap a shared level aperture head. Stored dimensions are unchanged.

Active-floor frames, mullions, glazing and sills follow the curve. Rigid door
leaves span the chord between the actual jamb positions. Curved baseboards use
the same cuts so they do not cross doorways. Neutral scene downloads inherit the
cut meshes and continue to omit glazing.

A browser ray test found that reconstructing facet-local openings through a
position/width pair could round an endpoint inward, creating a near-zero-width
wall with a full blocking face. The shared profile builder now consumes explicit
opening edges and preserves exact facet endpoints. A dedicated unit regression
and exported-triangle ray checks cover this failure.

## Validation

- All **665 unit tests in 44 files** passed, including five curved-opening tests.
- Svelte checks: zero errors and warnings. Production build passed.
- All **six browser checks** passed: curved openings on active/stacked floors and
  after active-floor switching in Chromium and WebKit, plus the existing portable
  export checks at 1440 and 390 pixels in each engine. Tests probe actual exported
  triangles through doors, windows and a solid control; doorway checks include
  baseboards and trim. Trim bounds also reject the former endpoint-chord placement.
- Browser exports have matching topology across engines; curve vertex arithmetic
  differs by at most 4.45e-16 metres. Cross-engine byte identity is not promised.
- The actual Chromium active/stacked downloads completed in Blender 5.2.1 LTS in
  an isolated local queue. Independent checks verified input and PNG receipt
  hashes, byte counts and 512×512 dimensions. Both renders were visually inspected.

| Scene | Meshes | Scene bytes | PNG bytes | Runtime / sampled peak memory |
| --- | ---: | ---: | ---: | --- |
| Active curve | 69 | 89,107 | 170,750 | 2.62 s / 495,271,936 bytes |
| Stacked curves | 94 | 119,672 | 170,045 | 2.23 s / 579,158,016 bytes |

Active scene SHA-256: `862d853225be80f16962e730033283a6f00f6f82987385e04028a2b4b6642bbb`.
Active PNG SHA-256: `1f7f24859cd4aa8d5affd5f2138156749bbe6497946eb21ae692209c28715605`.
Stacked scene SHA-256: `9437614520c66ca1e8d27de7da4fdc6ac63e4c92284159c4694ae80244fc2abd`.
Stacked PNG SHA-256: `a8fcda0a1bf3d83a1288b62199e582f933ce9a0e3eb8df008906069a51c96dbf`.

These are synthetic correctness checks, not physical-device or performance
qualification. The curve remains faceted with unjoined rectangular span ends.
Inactive floors still simplify slabs and omit opening trim; native curve fidelity,
material baking, camera alignment and browser-to-native queue handoff remain open.
