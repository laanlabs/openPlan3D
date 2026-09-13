# Nested room fills

The 2D room renderer now constructs compound paths from each outer boundary and
its immediate nested boundaries. Even-odd fill and clipping rules keep parent
colors, generated floor textures, and fallback patterns out of child rooms.
Selection outlines reconstruct the compound boundary after texture rendering.

PNG and PDF plan images use the same compound-path helper. SVG exports retain
plain polygons for rooms without holes and use an even-odd path for nested rooms.
This avoids order-dependent alpha blending between parent and child fills while
preserving room coordinates and labels.

Validation: all 921 unit tests, Svelte checks (zero errors/warnings), and build
passed. Four Chromium/WebKit slab workflows passed. The nested workflow checks
actual downloaded PNG/SVG pixels and the image encoded for the downloaded PDF:
each of the three palette colors appears at its single-layer opacity over white.
The SVG also contains explicit even-odd paths. Existing nested area summary,
active/stacked export, floor switching, slab depth, recess, and gap checks pass.

Explicit courtyard/stair opening authoring, nested room label placement and
selection, native nested geometry, and interior-wall-face measurements remain
open. This validation does not claim physical print-scale qualification.
