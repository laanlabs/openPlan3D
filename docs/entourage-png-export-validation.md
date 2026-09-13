# Complete entourage PNG exports — 2026-09-10

PNG exports now accept entourage-only plans and include rotated built-in/custom
symbol bounds with their saved aspect ratios. Custom images finish loading before
the plan is drawn. A load failure or 30-second timeout rejects the export through
the existing PNG failure notice rather than downloading placeholder geometry.

The export takes a project snapshot before awaiting assets and passes its prepared
image objects directly to the renderer. Later edits/cache changes cannot replace
the images used by that export. The shared editor cache now refreshes when a
custom definition keeps its ID but changes image data, avoiding stale pixels.
Saved data and the existing raster size limit are preserved.

Unit coverage exercises loading, errors, timeouts, timer cleanup, ready/broken
images and same-ID content replacement. Browser coverage deliberately holds a
custom image pending, requests an entourage-only PNG, confirms no early download,
then releases the image and verifies both its opacity-adjusted pixels and vector
symbol ink in the downloaded PNG. Existing SVG and other plan exports remain
regression coverage. PDF entourage framing/readiness and DXF entourage support
remain outstanding, alongside physical qualification and native parity.

## Results

All 894 unit tests passed; the final focused export/image suite also passed after
the snapshot type fix. Production Svelte checks reported zero errors and warnings
and the production build passed. All six Chromium/WebKit workflows passed,
including the deliberately delayed image with no early download. Downloaded PNG
visual review passed for vector ink, custom image, rotation, opacity and framing.
