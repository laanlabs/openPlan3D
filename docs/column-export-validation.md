# Column plan exports

September 9, 2026.

PNG and PDF now draw columns with the editor's shared column renderer. SVG draws
the same circle or rotated square, fill color and diagonal marker. DXF includes
a COLUMNS layer with circles or rotated closed outlines and diagonal marker lines;
it uses the CAD layer color rather than the canvas fill color.

Shared column bounds include rotated square corners and stroke width. Round
columns ignore rotation, matching the editor, and their bounds include the marker
endpoints. Columns extend export framing on mixed floors and qualify a column-only
floor for PNG, PDF, SVG and DXF. The DWG-to-DXF fallback shares that eligibility.

The browser regression adds separate round-only and rotated-square-only floors
at distant coordinates. It checks SVG shape/rotation, DXF column primitives,
colored PNG pixels and PDF downloads. Existing object-only export cases remain
in the same run. Unit tests cover rotation, marker extents and source preservation.

Tracing images, stairs and entourage still need consistent export coverage.
CAD fill styling, broader layout, physical-scale and native parity work remain open.

Validation: the 770-test suite and two new column-geometry tests passed. All twelve
object-only browser checks passed in Chromium/WebKit, including four column cases.
Svelte checks reported zero errors/warnings and the production build passed.
Both column PDFs contained one page with colored plan content; their full pages
were rendered with Poppler and visually reviewed for shape, rotation and clipping.
