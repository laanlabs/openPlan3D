# Built-in entourage DXF geometry — 2026-09-10

DXF now includes built-in entourage on an ENTOURAGE layer. Catalog SVG paths are
parsed into native CAD lines, quadratic/cubic splines and exact rational elliptical
arcs. Placement, width/aspect ratio, rotation and CAD vertical-axis inversion are
preserved. Fully transparent symbols are omitted. Other opacity values produce
ordinary monochrome layer linework; partial transparency is not added here.

Built-in entourage-only plans are accepted. Custom raster definitions remain
unsupported in DXF and are not replaced by invented vector shapes. This batch does
not claim complete entourage parity across formats. Source plan data stays intact.

The already installed svg-pathdata 6.0.3 parser is now an explicit pinned dependency,
so this feature does not depend on jsPDF's transitive dependency layout. A narrow
declaration bridge exposes its shipped types, which version 6.0.3 omits from its
package export map. Arc center
annotation feeds the existing exact conic adapter rather than approximating arcs
with cubic Beziers. The CAD adapter also preserves cubic control points as degree
three splines.

Unit coverage exports every built-in catalog entry, checks finite CAD entities,
exact ellipse weights/placement, cubic control points, unknown/invisible symbols
and source preservation. Browser coverage downloads an entourage-only DXF gallery,
checks its native entities and creates a visual preview from exported coordinates.
Only the QA preview samples curves; the DXF retains exact spline geometry.

Custom raster DXF entourage, partial CAD transparency, physical qualification and
broader native parity remain open.

## Results

All 910 unit tests and six Chromium/WebKit workflows passed. Final production
Svelte checks reported zero errors and warnings; the production build passed.
Visual review of the downloaded CAD preview passed for elliptical person symbols,
rotated vehicles, curved tree outlines and hedge linework. Furniture and stair
regressions passed.
