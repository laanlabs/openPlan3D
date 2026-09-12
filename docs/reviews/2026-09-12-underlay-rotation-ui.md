# Rotated underlay: native UI and browser return verification

Verified native source `a22c24c` in a fresh sandboxed Catalyst QA copy:
`/tmp/OpenPlan3D-Rotated-Underlay-QA.app`, bundle identifier
`com.laan.labs.floorplan.rotatedunderlayqa`. The installed development app was
not used. The QA app was closed after export.

The web fixture generator (`OPENPLAN_PACKAGE_FIXTURES=<directory> npx vitest run
 tests/projectPackage.test.ts`) now emits `rotated-underlay-project-package.zip`.
It uses the committed asymmetric `tests/fixtures/underlay-orientation.png`:
red left, blue right, green top, yellow bottom and a black top-left marker.
The fixture requests 90 degrees clockwise, center (300, 200) cm and 400 cm width.

## Native observations

Imported through Choose Project Package and Import as Copy, opened Plan/Edit Plan,
and visually inspected the canvas. Red appeared above blue, green on the right,
yellow on the left and the black marker at top-right, confirming clockwise
rotation. The saved plan retains center (3, 2) m, width 4 m and angle pi/2 radians.
The imported image SHA-256 matches the original exactly:
`fae9c957805920000a8363cbb84d6bb929de39964a603503ff691d251b3ac80a`.
The synthetic native session is `7302AA05-C31E-4A90-97E1-0D138E62B7F9`.

Exported through Export Options / Export Project Package (ZIP), saving the native
return locally. The actual output is committed in the web repository as
`tests/fixtures/native-return-rotated-underlay.zip` (5,418 bytes), SHA-256
`0b2879be25d5a221553b9cec6bafafabcb6d0b9a4077277e111c9c3594e3b920`.
It contains manifest, native plan, retained web/baseline/mapping and original PNG.

## Web return verification

All three browser cases passed in four minutes (session `94934`, terminal exit 0;
`/tmp/web-native-underlay-return-browser-verified.log`). They import the actual
native output, check the rendered 90-degree canvas transform and visible red/blue
pixels, then re-export and verify angle, center, width and exact original bytes.
The fixture-generation unit run also passed all 24 package tests (session `90899`,
exit 0; `/tmp/web-underlay-qa-fixtures.log`). Production source is unchanged.

Initial test attempts exposed an ambiguous thumbnail/title selector, a 60-second
workflow budget exhausted during navigation, float32 canvas-transform precision
in Firefox, and a pixel sample beneath the room texture. The final test uses the
exact title link, a 180-second workflow budget, six-decimal angle precision and
an unobscured blue sample. The original byte and geometry checks remain exact.

## Remaining observations

The native initial fit crops the bottom of this tall rotated underlay. Code review
confirms editor `planBounds` comes from document geometry, which excludes the
tracing image. The subsequent `5838f4b` change includes that extent; selected tests now pass
on Catalyst and simulator, and the same native QA plan visibly fits completely.
Escape was used to dismiss completed sheets after button attempts left them
visible; the existing native dismissal investigation remains open. Physical-device
capture, touch, resource budgets and the broader NEXT/release requirements remain
unverified by this bounded Catalyst and browser check.
