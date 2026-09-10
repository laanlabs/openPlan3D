# PDF room schedule pagination

Room schedules previously used a fixed-height row loop on a single page, so large
plans could overlap the title block or run off the page. Names were truncated at
30 characters without considering column width.

The exporter now wraps cell text to measured column widths, chooses row height
from its content, and repeats the schedule heading and column labels on new
pages. It reserves space above the title block on every page. Exceptionally tall
rows can continue onto following pages; totals and the summary stay together.

Coverage includes a 32-room fixture with long room names, actual browser PDF
downloads, and a unit regression for row coordinates and repeated headings.

Scope: active-floor room schedule pagination and wrapping. This does not qualify
arbitrary Unicode fonts, long title-block metadata, extreme-plan readability,
physical printing, or optional 3D page layout.

Validation on 2026-09-09:

- The full unit run passed 690 tests with one unrelated image-details timeout.
  That file passed separately (19 tests); all eight export tests, including the
  new schedule regression, passed in the final targeted run.
- Svelte checks reported zero errors/warnings; production build passed.
- Chromium and WebKit production PDF checks passed for the 32-room fixture.
- pdfplumber verified all 32 complete names and schedule rectangles above the
  footer across four schedule pages. Totals may occupy a separate schedule page.
- All schedule pages were visually inspected using macOS CoreGraphics/PDFKit
  rendering. Bundled Poppler had a font-configuration problem and did not produce
  review images; its local render process was stopped after the fallback review.
