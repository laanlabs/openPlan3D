# Native stacked floor preview

The edited-plan native preview now builds each populated storey separately and
places it at its saved elevation. Native levels store optional metre elevations;
legacy levels use index × 3 m, matching the web's level spacing. Each storey's
rectangular slab uses its own saved thickness. Empty storeys do not create phantom
slabs. Per-floor node names preserve the prefixes used for materials and furniture
visibility, and the existing camera fits the whole stack.

Web packages convert elevation centimetres to native metres and back. Native edits
and resetting an elevation to its default merge back into the retained web floor.
Native decoding and both package validators reject invalid elevations. The native
import notice now describes floor elevations as supported by the stacked preview.

Single-storey previews retain their local view. Selected-floor portable exports
explicitly disable stacking: their surface stays at local zero, including when
exporting an upper floor with a saved global elevation.

Validation covers three populated floors and one empty level, a negative ground
elevation, an explicit upper elevation, legacy spacing, slab depths, wall placement,
source immutability, invalid elevations and single-floor portable mesh coordinates.
The existing furniture fidelity test now requests an unstacked scene; the separate
stack test checks the new per-floor node naming and transforms.

All 916 web unit tests passed. Svelte check reported no errors or warnings and the
production build passed. Chromium and WebKit verified that an elevation edit of
−52.5 cm downloads as −0.525 m in the native package. The native Catalyst scene,
package and furniture suites passed 21 tests. Manual native UI import and visual
review passed for a synthetic three-storey plan at −0.5, 4.25 and 7.5 m; all storeys
were separated and framed in the preview.

Native elevation editing controls, room-shaped native slabs, stair/courtyard
openings, curved/sloped native walls and physical-device qualification remain open.
