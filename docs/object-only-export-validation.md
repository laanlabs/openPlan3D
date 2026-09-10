# Object-only plan exports

September 9, 2026.

PNG, PDF, SVG and DXF export entry checks previously required at least one wall,
even though each exporter could already render furniture, notes, measurements and
dimension annotations. A shared eligibility helper now recognizes that supported
content independently of walls. Existing bounds accumulation starts from the
objects on wall-free floors, preserving distant coordinates and rotated content.
The DWG-to-DXF fallback uses the same eligibility check.

Empty floors, blank-only notes and degenerate dimension-only floors remain
ineligible. PNG/PDF feedback now names supported content rather than requiring
walls. Project PNG export still never substitutes the current viewport when the
active floor is empty.

Browser coverage uses separate furniture-only, note-only, measurement-only and
dimension-only plans at distant coordinates. Each case downloads PNG, PDF, SVG
and DXF, checks finite vector output and visible PNG color, and attaches PNG/PDF
artifacts for inspection. The unit check covers empty and degenerate content.

Tracing images, stairs, columns and entourage do not yet have consistent export
coverage across formats; this change does not claim support for those object-only
floors. Existing mixed-plan handling remains unchanged. Broader export layout,
physical scale and native parity work remain open.

Validation: all 769 existing unit tests and the new eligibility test passed.
Ten Chromium/WebKit browser checks passed, including eight object-only cases
and two existing measurement-export regressions. Svelte checks reported zero
errors/warnings and the production build passed. All four WebKit PDF artifacts
had one page and a colored embedded plan image; each full page was rendered with
Poppler and visually reviewed for clipping and title-block placement.
