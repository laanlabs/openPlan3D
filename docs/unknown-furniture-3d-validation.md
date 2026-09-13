# Missing-catalog furniture in 3D — 2026-09-10

The main viewer now builds saved furniture through `createPlacedFurnitureModel`.
An unavailable catalog entry receives the existing procedural box with saved
width/depth/height and color, or the same 50 cm/neutral-gray defaults as the plan.
Catalog IDs and saved data remain unchanged. Known 2D-only symbols remain omitted.

The placement helper retains the plan-to-world position and rotation convention,
maps signed plan X/Y scale to world X/Z, and applies the saved height-scale
magnitude on world Y. This also fixes previously ignored height scale on known
catalog furniture. Models remain based 1.5 cm above the floor, as before.
Lazy catalog GLB loading, finishes and shadow behavior use the existing loader.

Unit coverage inspects actual Three.js bounds for rotated/mirrored/nonuniformly
scaled missing entries, with and without saved dimensions; it checks base height,
color, shadows, absence of a model request, unchanged source data, and the existing
2D-symbol exclusion. Browser tests import both a saved-size magenta object and a
50 cm green fallback, switch to 3D, and require rendered pixels of both colors in
the fitted top-down view on desktop and phone layouts.

Detailed catalog export symbols, opening-only group movement, annotation
alignment/visibility, physical qualification and broader native parity remain open.

All 839 unit tests, Svelte checks (zero errors/warnings), and the production build
passed. All four new desktop/phone Chromium/WebKit rendering workflows passed;
both viewport camera-preview resource workflows passed in each browser. Desktop
and phone screenshots show both unknown items fully visible in the fitted view.

The existing textured scene resource test initially exceeded Chromium's 10-second
first-frame wait. GPU diagnostics captured a subsequent draw on the live main
context. After allowing 30 seconds for first-frame compilation, its repeated
rebuild loop exceeded the old two-minute total budget. The test now allows four
minutes for software rendering, preserves every resource assertion and iteration,
and attaches final context diagnostics even when it fails. WebKit's scene resource
check passed throughout. These allowances are for correctness validation, not
performance qualification.

The final Chromium resource-retention rerun passed with the full rebuild loop and
unchanged resource-count assertions. All ten browser workflows therefore have
passing results, with the startup/total timeout reruns recorded above.
