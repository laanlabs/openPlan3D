# Complete entourage PDF exports — 2026-09-10

PDF exports now accept entourage-only plans, frame rotated built-in/custom symbols
using saved aspect ratios, and await custom image loading before constructing the
document. Prepared image references belong to an immutable export snapshot.
Failure or the shared 30-second timeout produces the existing PDF error notice
without downloading placeholder content. Both toolbar and command-palette entry
points use the asynchronous feedback path.

The optional main 3D canvas is captured before the asset wait, so later view/edit
changes cannot substitute a different perspective. Lost/tainted/unavailable
captures still omit only that optional page; invalid image encoding still rolls
back an unfinished page and saves the completed plan/schedule.

Unit coverage includes asynchronous failure/empty-floor notices, real-jsPDF
optional-capture recovery, plan/source snapshots and pre-wait 3D capture. Browser
coverage deliberately blocks custom image loading, verifies no early download,
then either releases valid pixels or injects an image error. The success case
checks the PDF signature and its actual embedded plan-image source for custom
opacity-adjusted pixels and built-in linework; the failure case checks the visible
notice and absence of a download. Existing optional 3D/PDF and stair exports are
regressions.

DXF entourage, physical printing/device qualification and broader native parity
remain open.

## Results

The full 894-test unit suite passed, followed by the expanded 32-test PDF/export
suite including snapshot/capture verification. Final production Svelte checks
reported zero errors and warnings; the production build passed. All eight
Chromium/WebKit workflows passed. Visual review of the actual PDF plan-image
source passed for built-in linework, custom image, opacity, rotation and framing.
This does not establish physical printing or all PDF page-layout scenarios.
