# Stair and column dimension input validation

September 9, 2026.

The production browser regression reproduced a cleared stair width becoming
zero. Stair width/depth, riser count/rotation and column diameter/height previously
wrote numeric drafts directly, including blanks and values outside displayed
limits. These fields now retain saved values for invalid drafts and restore the
value on blur. Valid edits continue to update the preview immediately.

Stair dimensions must be positive. Risers honor the existing integer range 3–30;
rotation allows finite fractional degrees. Columns honor their existing physical
ranges of 10–200 cm diameter and 50–1000 cm height; their input limits now convert
to inches with the display preference. Fractional dimensions are accepted and
unchanged rounded displays preserve stored precision.

This is property-editor validation. It does not introduce structural engineering
constraints, sanitize imported projects or change native editing.

Validation:

- The pre-fix Chromium test failed because clearing stair width saved zero.
- Four final Chromium/WebKit checks at 1440px and 390px passed: invalid drafts,
  fractional/range rules, exported geometry, undo, imperial precision, converted
  column limits and save/reload. The test awaits the actual saved status before
  reload; its initial Chromium failure exposed that missing synchronization.
- Four existing wall/opening dimension browser regressions passed on the same
  production build.
- Svelte check reported zero errors and warnings; production build passed.

Other property editors, native parity and physical device checks remain open.
