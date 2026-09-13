# Stair footprint framing and selection

September 9, 2026.

The L-shaped stair renderer extends its second run beyond the nominal centered
width, while the U-shaped renderer places a landing above its nominal depth.
Fit, single-stair selection outlines and hit testing previously used the nominal
rectangle. Parts of the actual drawing could be clipped or impossible to select.

Shared shape-aware regions now describe those runs and landings. Fit transforms
all region corners by the saved stair rotation, and single-stair selection outlines
use the local footprint bounds. Hit testing checks the filled regions rather than
the surrounding empty rectangle; the U void and empty L corners are excluded.
Spiral hit testing uses the actual circular footprint. Fit additionally measures
rotated stair captions at their minimum screen font size and allows room for the
spiral arrowhead. No saved dimensions or positions are changed.

Straight stair arrow shafts and heads now extend toward the interior from their
tip, keeping both UP and DN arrows inside the footprint.

Browser coverage imports distant rotated L/U stairs, checks their painted regions
inside desktop/phone canvases, and clicks the outer arm or landing to open stair
properties. Unit tests cover rotated hit testing, empty corners, the U void,
circular spirals, and both straight arrow directions using the real renderer.

Stair exports, multi-selection framing, below-floor ghost geometry, L/U direction
indicators, physical-device checks and broader native parity remain open.

Validation: all 772 existing unit tests and four new geometry tests passed.
Eight final Chromium/WebKit footprint checks, four structural-editing regressions
and two final WebKit phone screenshot checks passed. The initial footprint test
also counted an opaque gray ruler rectangle; its paint filter now selects only
the translucent stair fill. Svelte checks reported zero errors/warnings and the
production build passed. Both unobstructed phone screenshots were visually reviewed.
