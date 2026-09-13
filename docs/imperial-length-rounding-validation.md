# Imperial length rounding

Imperial formatting previously split feet from unrounded inches, then rounded
the remaining inches. Values near a foot boundary could display 12 inches, such
as `1'12"`, instead of carrying into the next foot. Precise labels had the same
problem when rounded to tenths.

Both formatters now round the total magnitude first, then split it into feet and
inches. Negative values use a single leading sign; values that round to zero do
not display negative zero. Existing metric formatting is unchanged.

Coverage checks representative boundaries and negative values, scans repeated
boundaries to require inch remainders below twelve, and checks a carried
measurement label in PNG, PDF, SVG and DXF export paths.

Scope: display rounding, not measurement geometry, input parsing, physical PDF
scale, or native unit conventions.

Validation on 2026-09-09: all 738 tests across 59 files passed. Svelte checks
reported zero errors/warnings and production build passed. Export integration
checks cover exact-foot and rounded-carry measurement labels in all four plan
formats. No visual layout or saved geometry changed in this batch.
