# Furniture reflection — September 12, 2026

The native Mirror action previously negated rotation. Native `450b913` uses
optional local-axis reflection fields, preserves rotation and duplication state,
and applies reflection to plan glyphs, SceneKit geometry, neutral mesh exports
and RoomPlan transforms. Web package edits retain scale magnitudes and independent
reflection signs; older native omissions fall back to the package baseline.
RoomPlan import preserves equivalent orientation through matrix decomposition.
See [the package contract](../project-package-v1.md#furniture-reflection).

Verified native evidence:

- Combined run `85762` passed all three coding/transform, RoomPlan round-trip and
  outward-face tests; xcresult summary confirms zero failures or skips.
- Pixel run `12787` passed `testRefrigeratorHandleReflectsAcrossLocalX`, using the
  actual `PlanRenderer` and an off-centre refrigerator handle. The check requires
  visible pixel changes and horizontal reflection equality. Its two retained
  images were exported and visually inspected: the handle moves from right to
  left, with the body unchanged. This qualifies the renderer, not the live button.

Original:

![Original refrigerator](assets/native-reflection-original.png)

Reflected:

![Reflected refrigerator](assets/native-reflection-mirrored.png)

All 31 package and 28 web RoomPlan tests passed. Both type checks passed without
diagnostics. Current full unit run `32001` passed 1,135/1,136: its sole failure
was an exact old-fixture expectation omitting the newly exported `mirrorX: true`.
The expectation now explicitly includes that field for every mirrored fixture
item while retaining exact comparisons of all other fields. All 55 category
cases passed in `58515`. Current production build `69534` passed.

Five previously timed-out browser workflows passed on the earlier package-only
reflection build (`67115`); their assertions were retained and whole-workflow
budgets increased using traced action durations. They do not qualify the newer
RoomPlan build. Full browser run `96834` and fresh Catalyst build `11694` are active
at this checkpoint. Live Mirror/Undo/Redo, an actual reflected package return and
physical-device checks remain open. No release or full-browser pass is claimed.

## Live Catalyst verification

Build `11694` passed. A copied, independently signed app at
`/tmp/OpenPlan3D-Reflection-Sept12-QA.app` uses bundle identifier
`com.laan.labs.floorplan.reflectionsept12qa`; the Development app was not used.
In a fresh drawn plan, a refrigerator was added and rotated right 15 degrees.
Live screenshots before/after Mirror showed the handle moving from right to left
without changing the angle. Undo returned the handle to the right; Redo moved it
left again. Selection dismissal changes available canvas space, so those history
screenshots are not used as exact screen-position comparisons.

Done saved isolated session `11CD2155-A6F3-43B7-8BBE-CB028C770C6C`. Its sole
furniture record has `mirrorX: true`, angle `0.2617993877991494`, center `(2.5, 2)`
and width/depth `0.7` metres. This verifies the live command and persisted state.
An actual reflected package export/import remains the next interoperability check.

Review also found that the new package reflection type validation was applying to
non-furniture records. It now validates the flags only on furniture, preserving
unrelated native extension fields with the same names on walls/rooms. All 32
package tests passed (`21070`, `/tmp/web-reflection-extension-scope-tests.log`).
The active full browser run `96834` uses the production build before this narrow
validator correction; its results must retain that source provenance.

## Actual native UI package fixture

The isolated app exported the saved reflected plan via Export → Export Options
→ Export Project Package. A first Save/Go-to-folder attempt dismissed without a
file; retrying with the Save dialog's Documents destination succeeded. The actual
1,197-byte ZIP is committed as `tests/fixtures/native-ui-reflection-package.zip`.
It contains the native refrigerator record with `mirrorX: true` and the original
15-degree angle, 0.7-metre dimensions and `(2.5, 2)` center.

Web package tests import that exact file, verify the `fridge` identity, signed
scale, centimetre dimensions and rotation, re-export it, compare every furniture
field with the original (UUID letter case normalized), and import the web return
again to check retained reflection. All 33 package tests passed in `43006`, log
`/tmp/web-native-ui-reflection-package-tests-final.log`. The first run `61310`
failed an exact 15-degree expectation because radians conversion yielded
14.999999999999998; the angle now uses a ten-decimal-place tolerance. No runtime
change was needed. This is actual native UI export plus web service import/return,
not a fresh native UI import of that web return or a physical-device handoff.

## Native UI return completed

The actual-fixture test can emit its verified web return when explicitly run with
`OPENPLAN_REFLECTION_RETURN_PATH`. Run `17631` passed and wrote
`/tmp/web-return-reflection-package.zip` (5,375 bytes). The isolated native app
selected that exact file, displayed one floor/four walls/zero attachments, and
imported it as an independent copy. Its Plan preview visibly retains the handle
on the left at the same orientation.

Imported native session `8D5A3A46-3D1F-4FDD-8934-43DFCFBC2EE4` has the same complete
furniture record as original session `11CD2155-A6F3-43B7-8BBE-CB028C770C6C`, allowing
only UUID letter-case normalization: category, identity, reflection, angle, center
and both dimensions match. This completes the scoped native UI → web service →
native UI package round-trip. It does not substitute for the browser import UI,
physical-device delivery, every furniture category or full-project regression QA.


## SVG export follow-up

Native `3d076a9` repairs a remaining export path: `PlanSVGExporter` now applies
local reflection to both glyph paths after translation/rotation. Unit-magnitude
reflection preserves physical stroke widths. The regression checks X/Y/both
reflection, both outline/detail transforms and exact unchanged SVG content after
removing only the reflection transform. Run `1018` passed (test 0.013 seconds),
log `/tmp/openplan3d-reflection-svg-tests.log`. PNG/PDF use the already qualified
`PlanRenderer` path. Full simulator `FloorPlanTests` now runs in `17153`, log
`/tmp/openplan3d-reflection-full-native-tests.log`; it is not yet a claimed pass.

## Full simulator regression

Session `17153` completed with exit 0 and TEST SUCCEEDED on native source
`3d076a9`: 264 reported, 262 passed, two opt-in integration skips, zero failures.
XCTest duration was 198.775 seconds. The skipped cases require an external
worker result and an enabled synthetic renderer handoff; neither is counted as
a pass. Log: `/tmp/openplan3d-reflection-full-native-tests.log`. Result bundle:
`/tmp/openplan3d-render-ios-build/Logs/Test/Test-FloorPlan-2026.09.12_22-25-05--0400.xcresult`.

Full Mac Catalyst regression on the same production source is now running in
session `68783`, log `/tmp/openplan3d-reflection-full-catalyst-tests.log`. The
full browser run remains pending; physical-device and release gates remain open.

## Full Catalyst regression

Session `68783` completed with exit 0 and TEST SUCCEEDED on the same native
production source `3d076a9`: 264 reported, 262 passed, two opt-in worker
integration skips, zero failures; XCTest duration 193.429 seconds. Both full
native destinations now pass. Log: `/tmp/openplan3d-reflection-full-catalyst-tests.log`.
Result bundle: `/tmp/openplan3d-render-ui-build/Logs/Test/Test-FloorPlan-2026.09.12_22-32-07--0400.xcresult`.

Latest web unit run `34034` had 1,135 passes and three five-second timeouts; all
nine tests in those three files passed unchanged in single-worker rerun `91966`
(16.80 seconds). Full browser `96834` stopped at five timeouts after 35 passes,
leaving 1,139 unrun. Traces are preserved under
`/tmp/openplan-reflection-full-browser-failures`; browser qualification remains
open. See NEXT for reproduction state.

## Imported-package edit merger

The earlier live round-trip retained existing reflection but did not exercise a
new mirror edit after importing a package. The native retained-field merger
omitted both reflection keys, losing those edits on export. Native `72906c0`
adds the keys. New regression `94702` passed through actual session storage
with native and web package fixtures, four edited flag states (including false
and removal), preserved angle/unknown metadata, and exact retained return
documents. Exit 0, 1.086 seconds; log
`/tmp/native-reflection-package-merge-regression.log`. Full-suite passes above
predate this repair; this is scoped package-path evidence.
