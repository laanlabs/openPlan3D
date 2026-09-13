# Curved wall geometry in plan exports — 2026-09-09

PNG and PDF plan drawing now use quadratic wall strokes, and SVG emits quadratic
paths instead of endpoint lines. DXF represents curved wall thickness with the
same 16 straight facets as the 3D viewer. Dimension labels use the faceted path
length and sit at its half-distance point; they no longer report the endpoint
chord as the curved wall's length. Curved dimensions are offset along the local
normal beyond half the wall thickness, keeping text out of the stroke.

PNG/SVG/PDF bounds include analytic quadratic extrema in both axes plus half the
wall thickness. This accounts for asymmetric curves whose extrema occur away
from the midpoint, and includes round-capped stroke extents. Straight wall bounds
also include thickness. Saved source geometry is unchanged. The existing raster
size cap remains in force.

This does not finish curved opening export fidelity: door/window symbols and gaps
still need their curve placement and clipping work. DXF facets retain unjoined
rectangular ends. Room polygons remain faceted, while PNG/PDF/SVG wall strokes are
quadratic. Native viewer/export fidelity and physical-device qualification remain
separate requirements.

## Verification

Unit coverage checks asymmetric analytic extrema and thickness against sampled
curve points, reversal, straight and constant-coordinate walls, source immutability,
SVG quadratic commands, PNG/PDF curve drawing calls, path-length labels and DXF
facet count. Existing export-label tests now include the wall stroke in their
expected framing offsets.

The browser fixture uses one 40 cm thick curved wall with no openings. PNG pixel
probes check dark ink on the actual curve and white space at the old chord. The
SVG viewBox and quadratic command include the stroke; DXF has 16 wall facets and
PDF serialization completes. The separate moved-label export regression checks
that label framing and the raster cap still work.

Final validation passed **685 unit tests in 50 files**, Svelte checks with zero
errors/warnings and the production build. All **four Chromium/WebKit browser
checks** passed for curved walls and moved labels. The final curve PNG was
visually inspected: the curved stroke is unclipped, the old chord is empty, and
the 688 cm dimension sits clearly outside the stroke. A first visual pass caught
the dimension inside the thick wall; the final SVG regression also checks its
outside position. PDF serialization and its shared drawing calls were checked;
PDF page layout was not separately visually qualified.
