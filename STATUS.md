# OpenPlan3D status

Last verified: **September 13, 2026, 00:20 EDT**.

## Work paused by user

Implementation and validation are paused at the user's request until access to
the Asta 6 model is restored. The overall `NEXT.md` goal remains active and is
not marked complete. No build, test, browser, or native QA job is running.

## Goal and overall state

**Active goal: keep working on all outstanding issues in `NEXT.md`.**

The goal is not complete. Recent fixes are committed and pushed, but broader fidelity work,
physical-device testing, and release/cloud gates remain open.

This is the concise, maintained status page. Update it as implementation,
validation, blockers, or priorities change during the goal. Keep the full scope
in [NEXT.md](NEXT.md); do not treat a focused test pass as completion of the goal.

## Repository checkpoints

These are implementation checkpoints; later documentation commits may follow.
Remote state was checked when preparing this report.

| Repository | Branch | Latest implementation checkpoint | Delivery |
| --- | --- | --- | --- |
| Web app: `openPlan3D` | `codex/threejs-render-lab` | `5e09840` — phone status-bar scrollbar clearance | Committed and pushed; [PR #95](https://github.com/laanlabs/openPlan3D/pull/95) remains open |
| Native app: `openplan3d-ios` | `codex/local-floorplan-render` | `bdaad71` — area convention baseline | Committed and pushed |
| Website: `openplan3d-www` | `main` | `4802b01` — WebP image delivery and CDN caching | Committed and pushed; local checkout matches remote `main` |

All three working trees are clean and match their remotes at this pause. App work
remains on development branches; it has not been merged into `main`. Pushing the
website changes does not, by itself, verify a production deployment.

## Work completed with scoped verification

- **Website:** stronger links to the [OpenPlan3D App Store listing](https://apps.apple.com/us/app/openplan3d/id6759076170).
- **Furniture reflection:** actual local-axis mirroring, unchanged rotation,
  duplication, native glyph/SceneKit rendering, SVG export, neutral-export face
  winding, RoomPlan orientation, and web/native package handling. An actual native
  UI → web service → native UI round-trip retained reflection.
- **Imported-package reflection:** fixed the native merger that discarded new
  mirror edits on re-export. Native/web package import, save, and export regression
  passed, including true/false/removal and preservation of unrelated data.
- **Local custom-model import:** bounded GLB validation/import, retained original
  bytes, placement and storage handling, resource cleanup, and scoped desktop
  browser checks. Native retention is supported; native GLB rendering is not.
- **Editor and tracing-image work:** native action labels, dismissal fixes,
  floor ownership, rotation and fitting, with scoped native tests/UI checks.
- **Regression infrastructure:** separated Vitest benchmarks from Playwright
  collection. Both CI benchmark profiles subsequently ran and passed all three
  furnished-home cases. Browser CI now uses six shards per engine.
- **Raster export:** rounded PNG/PDF canvas dimensions up within the 4096-pixel
  cap to address Firefox exporting 4095 pixels instead of 4096. The moved-label
  export workflow now passes unchanged in all three browser engines.

## Validation state

| Check | Evidence and limits |
| --- | --- |
| Full native simulator suite | **265 passed, two optional integration skips, zero failures** on `2fc1dd9`, including the height properties UI source. Session `64276` exited 0; XCTest 130.573 seconds. |
| Full native Catalyst suite | **265 passed, two optional integration skips, zero failures** on `8fdd1bf`. Session `25783` exited 0; XCTest 142.046 seconds. |
| Later native package-merger regression | **Passed**, exit 0, 1.086 seconds, on `72906c0`. This is a focused regression, not a newer full native suite. |
| Full web unit suite | **1,142 passed in 119 files** in CI run `34735405519` on the status-bar/height implementation. Type check and production build also passed. The earlier local timeout results are superseded for this source. |
| Raster export unit tests and build | **27 tests passed**; production build passed. |
| Earlier local full browser run | 35 passed, five timeouts, 1,139 unrun. All five timed-out cases later passed unchanged on the current-at-that-time build. Full coverage was not achieved. |
| Earlier CI browser run | All engines exceeded the 12-minute suite limit; Firefox also exposed the raster-width assertion failure. This motivated sharding and the raster fix. |
| Current full browser CI | **All 18 shards passed** in run `34735405519`, including Linux Firefox shard 3: 74 passed in 5.6 minutes. |
| Shard inventory | All **1,179 cases** occur exactly once: 393 per engine, divided into groups of 71/61/74/58/64/65. This verifies collection, not execution. |
| Benchmark CI | Desktop: three passed; phone viewport: three passed. Software-rendered measurements do not qualify physical-phone performance. |

## Native height editing — scoped UI check passed

Native `2fc1dd9` adds decimal height entry in cm/in and an explicit category-height
reset. Catalyst build `64930` passed. Isolated native UI entered 48.5 in and saved
1.2318993347743592 m after Undo → Redo, with width/depth unchanged. Metric entry reopened as 213.7 cm; category reset displayed 90 cm and persisted
0.9 m after rejecting a zero entry, with neighboring furniture unchanged.
Other invalid input forms, intermediate undo value, and iOS/device checks remain
open. Full current simulator run `64276` passed: 265 passed, two optional skips,
zero failures; XCTest 130.573 seconds, exit 0. Log:
`/tmp/native-height-editor-full-simulator.log`. Actual native UI export bytes
also pass all 39 web package tests, retaining both edited heights and all 12
legacy furniture records. A subsequent stable-panel Save check created
`/Users/thelodgem1/Documents/native-ui-height-save-final.zip`; its plan bytes
exactly match the edited-height regression fixture. Selected-destination export
is now verified. Earlier missing-file attempts remain inconclusive.
The full Catalyst suite below predates the properties UI.
Native detail: `openplan3d-ios/docs/native-furniture-height-editor.md`.

## Furniture-height preservation verified in Catalyst handoff

Native `8fdd1bf` adds optional measured height in metres, preserves it through
RoomPlan import, saved plans, duplication, SceneKit preview, RoomPlan export,
and retained-package merging, and rejects invalid heights on decode/package
validation. Legacy plans retain category defaults. Both focused simulator tests
passed (exit 0; 0.022 and 0.057 seconds). Web `79633db` now imports/exports
physical height, preserves Z scale, retains heights omitted by older encoders,
and keeps flat catalog symbols valid. All 92 package/category tests and the web
type check passed. **Actual web service → Catalyst UI → web service package handoff passed**.
Native import/save/preview/export retained 3.125 m height; web return retained
125 cm at Z scale 2.5, reflection, rotation and attachment bytes. All 38 package
tests passed with the actual native export fixture. Both full native suites
passed. Physical-device handoff and richer furniture previews remain open.
See the [handoff record](docs/reviews/2026-09-12-furniture-height-handoff.md).

## Phone status-bar repair verified

The failed Linux Firefox screenshot shows the horizontal scrollbar covering the
status-button text. The workflow passed unchanged in local macOS Firefox, so a
local pass alone did not close the CI defect. Web `5e09840` gives the phone status
bar a 48 px minimum height and centers its controls, leaving room for a classic
scrollbar. Existing pointer/interaction assertions remain; the test also checks
that each button fits its text line and captures phone screenshots. The build
passed. All six local desktop/phone cases passed in 1.8 minutes. Linux Firefox
shard 3 subsequently passed all 74 tests in 5.6 minutes in CI run `34735405519`,
qualifying the repair in the original failing environment.

## Current validation and CI

- **Full native simulator completed:** `64276` completed 267 reported tests:
  265 passed, two optional skips, zero failures. Log: `/tmp/native-height-editor-full-simulator.log`.
- **Full native Catalyst completed:** `25783` exited 0: 265 passed, two optional
  skips, zero failures; XCTest 142.046 seconds. Log: `/tmp/native-height-full-catalyst.log`.
- **Implementation CI completed successfully:** [run 34735405519](https://github.com/laanlabs/openPlan3D/actions/runs/34735405519)
  passed all 1,142 unit tests, type check, build, all 18 browser shards and both
  benchmark profiles. This qualifies the implementation at `3020a65`; later
  changes through `0fcae31` were tests/documentation. Build log: `/tmp/openplan-statusbar-ci-build.log`.
- **Height handoff package generated:** passing fixture run `81629` produced
  `/tmp/web-height-return-package.zip`, with native height 3.125 m and web height
  125 cm at Z scale 2.5. Actual Catalyst import/save/export and web service return
  subsequently passed; regression session `25778` passed all 38 package tests.
- **Native furniture-height regression completed:** session `40396` exited 0;
  both tests passed. Log: `/tmp/native-furniture-height-regression.log`.
- **Raster browser regression completed:** session `26950` exited successfully;
  all three cases passed in 2.2 minutes (Chromium 39.5 s, Firefox 58.2 s, WebKit
  15.8 s). Log: `/tmp/web-raster-rounding-browser.log`.
- **Phone status-bar browser regression completed:** session `85538` exited 0;
  all six desktop/phone cases passed in 1.8 minutes. Log:
  `/tmp/web-mobile-statusbar-browser.log`. Build `35608` passed.
  Focused Firefox phone screenshot run `43494` also passed; the inspected image
  shows the full Grid label. Log: `/tmp/web-mobile-statusbar-visual.log`.
  Linux Firefox CI confirmation passed (74 tests in shard 3). See the
  [before/after record](docs/reviews/2026-09-12-mobile-statusbar.md).
- **Web height production build:** session `74745`, log
  `/tmp/web-package-height-production-build.log`; passed with exit 0.
- **Completed sharded CI:** [run 34734473227](https://github.com/laanlabs/openPlan3D/actions/runs/34734473227)
  passed its build, both benchmarks, and 17 of 18 browser shards. Firefox shard 3
  failed the Portuguese layers test at 390 px: a bottom overlay intercepts clicks
  on the Grid button. That defect was repaired and verified in the later successful run above. Log: `/tmp/openplan-ci-firefox-shard3-failure.log`.


## Next priorities

1. Continue furniture fidelity and height editing usability; complete physical
   iPhone/iPad handoff when a device is available. The Catalyst UI/package
   preservation check is complete, with its actual export retained as a fixture.
2. Continue the nested-room Undo investigation. New state coverage verifies
   grouped drag preview → saved edit → repeated Undo/Redo for saved and detected
   rooms: all 16 history/resolution/nesting tests passed. This excludes stale
   preview metadata for that sequence; browser event/draw ordering remains
   unproven and the original intermittent failure has no established root cause.
3. Continue area alignment: Area Summary now shows a separate interior total
   and explicitly describes the existing centerline breakdown. The new wall-
   footprint calculation matches native's 10.64 m² rectangle baseline; 18
   geometry tests and all three localized browser workflows passed, as did
   production build. Labels, schedules/exports and arbitrary native raster
   agreement remain open. See the [area record](docs/area-convention-baseline.md).
   Broader geometry, usability, performance and release work remains open.

## Remaining goal scope

- Native/web area conventions, room split/merge behavior, geometry agreement,
  curves, slopes, elevations, opening styles, annotations, roofs and stair voids.
- Catalog completeness, provenance, furniture/rendering fidelity, materials,
  framing, and device-based performance/memory/battery targets.
- Full English/Portuguese interface review, physical accessibility, and first-use
  usability sessions.
- Physical iPhone/iPad capture, denied permissions, interruptions, long scans,
  touch interactions, multi-floor/attachment-heavy projects, and file/share handoff.
  No physical device was connected at the last inventory check.
- TestFlight/App Store, distribution, Intel support and licensing/release checks.
- Firebase client migration, storage admission/rules cutover, enforceable quotas,
  billing/budget decisions, and later AI/collaboration work behind those cost gates.

These are open work areas, not a claim that every item is a reproduced defect.
Physical-device and administrative gates need their corresponding external
evidence, but there is still software work available; the overall goal is active.

## Supporting records

- [Detailed backlog and chronological evidence](NEXT.md)
- [Furniture reflection implementation and verification](docs/reviews/2026-09-12-furniture-reflection.md)
- [Project package contract](docs/project-package-v1.md)
- [Local custom-model work](docs/reviews/2026-09-12-local-model-import.md)
- [Nested-room Undo investigation](docs/reviews/2026-09-12-nested-room-undo-reproduction.md)

Local `/tmp` logs are diagnostic artifacts and may not survive machine cleanup;
the committed records and linked CI runs retain the summarized validation scope.
