# OpenPlan3D status

Last verified: **September 12, 2026, 23:29 EDT**.

## Goal and overall state

**Active goal: keep working on all outstanding issues in `NEXT.md`.**

The goal is not complete. Recent fixes are committed and pushed, but full browser
qualification, native furniture-height preservation, broader fidelity work,
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
| Native app: `openplan3d-ios` | `codex/local-floorplan-render` | `8fdd1bf` — native measured furniture height | Committed and pushed |
| Website: `openplan3d-www` | `main` | `520f86e` — App Store links | Committed and pushed; local checkout is one commit behind remote `main` |

All three working trees were clean before creating this status document. App work
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
| Full native simulator suite | **265 passed, two optional integration skips, zero failures** on `8fdd1bf`, covering height and package-merger changes. Session `72751` exited 0; XCTest 93.611 seconds. |
| Full native Catalyst suite | Earlier `3d076a9` baseline: 262 passed, two skips, zero failures. Current-source full run `25783` is active. |
| Later native package-merger regression | **Passed**, exit 0, 1.086 seconds, on `72906c0`. This is a focused regression, not a newer full native suite. |
| Full web unit suite | **1,142 passed in 119 files** in CI run `34735405519` on the status-bar/height implementation. Type check and production build also passed. The earlier local timeout results are superseded for this source. |
| Raster export unit tests and build | **27 tests passed**; production build passed. |
| Earlier local full browser run | 35 passed, five timeouts, 1,139 unrun. All five timed-out cases later passed unchanged on the current-at-that-time build. Full coverage was not achieved. |
| Earlier CI browser run | All engines exceeded the 12-minute suite limit; Firefox also exposed the raster-width assertion failure. This motivated sharding and the raster fix. |
| Shard inventory | All **1,179 cases** occur exactly once: 393 per engine, divided into groups of 71/61/74/58/64/65. This verifies collection, not execution. |
| Benchmark CI | Desktop: three passed; phone viewport: three passed. Software-rendered measurements do not qualify physical-phone performance. |

## Furniture-height implementation in progress

Native `8fdd1bf` adds optional measured height in metres, preserves it through
RoomPlan import, saved plans, duplication, SceneKit preview, RoomPlan export,
and retained-package merging, and rejects invalid heights on decode/package
validation. Legacy plans retain category defaults. Both focused simulator tests
passed (exit 0; 0.022 and 0.057 seconds). Web `79633db` now imports/exports
physical height, preserves Z scale, retains heights omitted by older encoders,
and keeps flat catalog symbols valid. All 92 package/category tests and the web
type check passed. **Actual cross-platform UI/package height qualification remains
open**. The current full simulator suite now covers these changes; Catalyst is running.

## Phone status-bar repair in progress

The failed Linux Firefox screenshot shows the horizontal scrollbar covering the
status-button text. The workflow passed unchanged in local macOS Firefox, so a
local pass alone did not close the CI defect. Web `5e09840` gives the phone status
bar a 48 px minimum height and centers its controls, leaving room for a classic
scrollbar. Existing pointer/interaction assertions remain; the test also checks
that each button fits its text line and captures phone screenshots. The build
passed. All six desktop/phone cases passed in 1.8 minutes; Linux CI confirmation
remains open.

## Current validation and CI

- **Full native simulator completed:** `72751` passed all 267 reported tests
  with two optional skips and zero failures. Log: `/tmp/native-height-full-simulator.log`.
- **Full native Catalyst active:** `25783`, log `/tmp/native-height-full-catalyst.log`.
  Poll before other native work in `/tmp/openplan3d-render-ui-build`.
- **Current CI active:** [run 34735405519](https://github.com/laanlabs/openPlan3D/actions/runs/34735405519)
  passed all 1,142 unit tests, type check, and build; browser shards and benchmarks
  are running. Build log: `/tmp/openplan-statusbar-ci-build.log`.
- **Height handoff package generated:** passing fixture run `81629` produced
  `/tmp/web-height-return-package.zip`, with native height 3.125 m and web height
  125 cm at Z scale 2.5. Native file/UI exchange is the next qualification step.
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
  Linux CI confirmation is still pending. See the
  [before/after record](docs/reviews/2026-09-12-mobile-statusbar.md).
- **Web height production build:** session `74745`, log
  `/tmp/web-package-height-production-build.log`; passed with exit 0.
- **Completed sharded CI:** [run 34734473227](https://github.com/laanlabs/openPlan3D/actions/runs/34734473227)
  passed its build, both benchmarks, and 17 of 18 browser shards. Firefox shard 3
  failed the Portuguese layers test at 390 px: a bottom overlay intercepts clicks
  on the Grid button. This is an outstanding UI defect, not a suite-capacity
  timeout. Log: `/tmp/openplan-ci-firefox-shard3-failure.log`.


## Next priorities

1. Verify the phone status-bar repair locally and in Linux Firefox CI, then
   complete current full CI qualification. The repair is committed; the CI
   defect remains open until its failing environment passes.
2. Finish **furniture height** qualification: verify
   actual cross-platform package/UI round trips. Both implementations and focused
   native/web tests are committed; the full feature is not yet qualified.
3. Continue the nested-room Undo investigation. Repeated scoped checks passed,
   but the original intermittent failure has no established root cause.
4. Continue the remaining geometry, usability, performance, and release work in
   `NEXT.md` after these immediate issues.

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
