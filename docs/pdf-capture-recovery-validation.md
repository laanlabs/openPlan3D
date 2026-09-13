# Optional PDF capture failure recovery

The optional 3D page is added before jsPDF embeds its image. Previously, an image
encoding exception was swallowed after that page had already been created,
leaving an empty perspective page in the saved PDF.

The exporter now checkpoints the completed page count and removes unfinished
optional pages if capture or encoding throws. Completed plan and schedule pages
remain available in the download.

The real-jsPDF regression covers absent 3D, a tainted-canvas exception before
page creation, and invalid PNG data that fails after page creation. It verifies
that the saved PDF contains two completed pages, its plan image and schedule,
and no unfinished 3D heading. Browser coverage exercises successful capture and
then forces invalid image data in the main canvas, verifying that the recovered
PDF has the original page count and schedule.

Scope: recovery of optional 3D capture/encoding failures. Required plan-image
failures, blank-frame detection, export error messaging and native behavior remain
separate work.

Validation on 2026-09-09: all 13 targeted export/real-jsPDF tests passed, Svelte
checks reported zero errors/warnings, and production build passed. Chromium and
WebKit production-download checks passed for successful capture followed by
forced encoding failure. No page-layout changes were made in this batch.
