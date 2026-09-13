# Unknown-catalog furniture in the 2D editor — 2026-09-10

Furniture whose catalog entry is unavailable now renders as a generic plan
symbol labeled Unknown furniture. Its saved catalog ID, dimensions, scale,
rotation and color are retained. The renderer no longer drops it before reaching
the existing fallback icon.

Body and handle hit testing now use saved/fallback dimensions without requiring
a catalog entry. Drawing, selection bounds and minimap use the shared furniture
size helper, including scale and mirror magnitudes. Missing width/depth/height
use the existing 50 cm helper default; property input defaults now agree with it.
This does not materialize default dimensions into the saved item.

Furniture captions now cancel the symbol mirror transform while retaining its
rotation, keeping both known and unknown labels readable on mirrored items.

## Coverage

Unit coverage checks fallback rendering, selected outlines, rotated/mirrored hit
tests and handles, default dimensions, readable captions on both mirror axes,
and unchanged source data. Existing bounds
coverage now expects the shared 50 cm default rather than its previous independent
30 cm fallback.

`tests/browser/unknown-furniture.spec.ts` imports a missing catalog ID with saved
rotated/mirrored dimensions and with dimensions omitted. It finds the rendered
fallback, selects it, moves it, rotates it, resizes it, deletes it, and verifies
Undo/Redo through exact exported-floor comparisons. Catalog identity and unrelated
metadata remain intact. The known-catalog furniture Shift-click/pan workflow is
also rerun.

## Results

All 834 unit tests and six Chromium/WebKit workflows passed. Svelte check reported
zero errors and warnings, and the production build passed. Phone screenshots
confirm both fallback sizes remain visible above the properties sheet and the
mirrored item caption is readable.

## Remaining work

Unknown-catalog 3D and export parity, opening-only group movement, annotation
alignment/visibility, physical qualification and broader native parity remain
open. Native app code is unchanged.
