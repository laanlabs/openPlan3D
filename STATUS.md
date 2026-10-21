# OpenPlan3D status

Last verified: **October 21, 2026** (UTC): the App Hosting rollout of #120; a
production check of link sharing from October 20, 08:00 UTC, to October 21,
22:06 UTC; and, for #124, `npm audit`, the type check, the unit suite, the
production build and ten browser specs on three engines. On October 20: a
production check of link sharing since the Storage cutover; the local unit
suite, type check, sibling parity suites and three-engine import specs on #120;
and CI and the App Hosting rollouts for the merges of #115 and #119. Earlier,
on October 16: full three-engine browser CI on PRs #107–#112; production
rollout, CORS preflight and the Storage rules cutover checked; see below.

## Current delivery — October 16–21

All October 15–16 web work is **merged and live**. The owner merged the stack
in order at 13:16 UTC: #107 (`318575c`), #108 (`86373ba`), #109 (`d40e729`),
#110 (`9111859`) and #112 (`7a10d82`). Each merge got its own App Hosting
rollout, and all five reported success. The live app serves build
`1792156652723`, and its bundle contains strings from both #107 and #112.

| PR | Content |
| --- | --- |
| #107 | Sibling-planner interchange, handoff CORS, issues #102, #104 and #106 |
| #108 | Join stitched scans at a shared door (#103) |
| #109 | Six editor defects |
| #110 | Fifteen bug-hunt defects |
| #112 | Eighteen more hunt defects, thirteen review fixes, the six problems in the issue #101 comment |

Post-deploy check: `OPTIONS https://app.openplan3d.com/api/handoffs` from
`https://app.openlandscape3d.com` returns **204** with the origin echoed back and
the CORS headers. A foreign origin gets no CORS grant. Issues #101–#104 and
#106 closed on merge.

PR #111, an outside contributor's Docker image built in CI, is a feature
awaiting the owner's review. It also relaxes the dev-dependency audit gate.

### Link sharing capacity and the Storage rules cutover (issue #30)

Later on October 16 the owner merged #114 (`4e66c60`). It raises the daily
share limits from 100 shares and 25 MiB to 1,000 shares and 250 MiB. Production
logs had shown the old cap refusing 140–180 shares a day from midday UTC. Its
rollout succeeded, and the same day's ledger passed 100 admissions.

At 16:30 UTC the Storage rules cutover was deployed through the Firebase Rules
API: ruleset `a1d5ef29…` replaced the legacy `4dd57b5d…`. Production checks
returned 403 for anonymous direct uploads, ledger reads and inbox listing. A
synthetic endpoint share returned 201, and reading its code returned 200. #115
put the same `storage.rules` on `main`; the owner merged it on October 20 at
01:48 UTC (`46aa9d2`), and its 23 checks and App Hosting rollout succeeded. See
the [cutover record](docs/handoff-quotas.md#cutover-record). Issue #30 is closed.
Budget alerts moved to #116, and physical-iPhone QA moved to
[openplan3d-ios#47](https://github.com/laanlabs/openplan3d-ios/issues/47).

### RoomPlan import from the Build tab (issue #118)

Reported October 17: Build > Import RoomPlan failed with "could not be cloned"
for any scan whose objects carry RoomPlan `attributes`, including the
repository's own `test-roomplan.json`, with either target. It was a regression
from the October 15 interchange work, which structured-clones those
attributes; the dialog held the parsed file in deep reactive state, and a proxy
cannot be cloned. #119 holds the file in `$state.raw` and adds a spec that
imports the sample both ways. Import JSON, the welcome screen and
`/editor?import=CODE` handoffs were not affected. The owner merged #119 on
October 20 at 02:23 UTC (`fdb9675`); its checks and rollout succeeded, and the
new spec passed against production.

### Shares refused for walls collapsed on the iPhone

A production check on October 20 covered the Storage cutover (October 16,
16:30 UTC) to 08:00 UTC that day. The live Storage rules still match `main`.
Link sharing accepted 785 captures and refused 23 (422), with no quota
refusals and no server errors. All but three shares came from the iPhone app:
one came from OpenCatio3D in a browser, and two were uploaded with curl. All 23
refusals were at `walls[N].dimensions`, from 9 clients, 8 of which got no share
through afterwards. 422s at 5–25 a day were also logged October 9–15, before
the server recorded why it refused a capture.

The cause is in the iPhone editor. Dragging a wall's end onto its other end, or
a corner that welds both ends of a short wall, leaves a wall of length 0, which
the exporter sends as `[0, height, thickness]`. The phone shows it as a dot and
does not draw its openings. #120 accepts walls of length 0, leaves them and
their openings out on import, and logs counts as `handoff_tolerated`, so
shipped iPhone builds share these plans without an update. The owner merged
#120 on October 21 at 21:20 UTC (`5b4a751`), and its rollout succeeded at
21:22. From October 20, 08:00 UTC, to the deploy, 7 of 353 shares were refused
the same way, all on October 21, from 3 clients that tried 2, 2 and 3 times.
From the deploy to 22:06 UTC the new build accepted all 16 shares and refused
none. No `handoff_tolerated` line had been logged by then, so the new path has
not yet been seen in production; see [NEXT.md](NEXT.md). The editor fix is
tracked in
[openplan3d-ios#49](https://github.com/laanlabs/openplan3d-ios/issues/49).

CI on `main` failed after the merge, at `npm audit --audit-level=high`:
advisories for vite and vitest were published October 20–21, after #120's own
checks passed, so the browser and benchmark jobs did not run. Both are
development tools, and production was not exposed. #124 updates them and
awaits merge; until it lands, every PR fails the same check.

## Goal and overall state

**Active goal: keep working on all outstanding issues in `NEXT.md`.**

The goal is not complete. The GitHub issues that are bugs (#104, #106) and the
documentation and stitching requests (#101–#103) are fixed, merged, deployed
and closed. #30 is closed as well: #114 raised the share limits, and the
Storage rules cutover was deployed and verified (#115). Its owner tasks moved
to #116 (billing budget alerts) and
[openplan3d-ios#47](https://github.com/laanlabs/openplan3d-ios/issues/47)
(physical-iPhone QA). #105 (publish the iOS repository) needs the owner.
#118, a Build-tab import regression reported on October 17, was fixed by #119
(merged October 20). Link shares refused for walls collapsed on the iPhone are
accepted since #120 (merged and deployed October 21); on the phone, Share with
Assistant and package export still fail for those plans
([openplan3d-ios#49](https://github.com/laanlabs/openplan3d-ios/issues/49)).
CI on `main` fails at a new `npm audit` advisory until #124 merges. Broader
fidelity work and physical-device testing remain open.

Web `main`'s latest implementation merge is `5b4a751` (#120); #124 awaits merge.

This is the concise, maintained status page. Update it as implementation,
validation, blockers, or priorities change during the goal. Keep the full scope
in [NEXT.md](NEXT.md); do not treat a focused test pass as completion of the goal.

## Repository checkpoints

These are implementation checkpoints; later documentation commits may follow.
Remote state was checked when preparing this report.

| Repository | Branch | Latest implementation checkpoint | Delivery |
| --- | --- | --- | --- |
| Web app: `openPlan3D` | `main` | `5b4a751` — merge of #120, after #107–#110, #112–#115 and #119 | **Merged and live** (App Hosting rollouts succeeded October 16, 20 and 21); CI on `main` needs #124 |
| Native app: `openplan3d-ios` | `marketing/youtube-shorts-drawing` | `f2c6ea1` — marketing Shorts; no native code change in this batch | Clean checkout; the earlier `codex/local-floorplan-render` work (`bdaad71`) is unchanged |
| Website: `openplan3d-www` | `main` | `dfdb9ec` — lists OpenLandscape3D, OpenKitchen3D and OpenCatio3D, with an FAQ entry on the exchange | **Pushed and live** on openplan3d.com |

## Work completed with scoped verification

- **Editor defects (October 16, PRs #109, #110, #112):** six small editor
  defects; fifteen from an adversarial bug hunt; eighteen more from the same
  hunt after two-verifier checks, then thirteen fixes from a seven-reviewer pass
  over them (3D viewer materials, colour and framing, snapping, dialogs and
  Escape, exports, blocked storage, room outlines with attached rooms, history
  and selection). Unit- and browser-tested; deployed October 16.
- **Issue #101 comment (October 16, PR #112):** the six problems an end user
  listed were reproduced against the version live then and fixed where still
  wrong: Duplicate dropping a queued save, exports ignoring hidden layers and
  dimensions, Print Layout cropping notes and stairs, no persistent-storage
  request or backup reminder, and JSON backups the library could not restore.
- **Sibling planner interchange (October 15):** export of the family's
  prepared RoomPlan JSON and `#/import/v1/` transfer links; the OpenKitchen3D /
  OpenLandscape3D / OpenCatio3D blocks, object attributes, defaults and notes
  survive import, save and re-export, verified against each sibling's real
  fixtures; CORS on `/api/handoffs` for their "Open in OpenPlan3D" buttons.
  Merged and deployed October 16 (#107); real shares from OpenCatio3D and
  OpenLandscape3D were accepted on October 20 and 21.
- **Issues #103, #104, #106 (October 15):** RoomPlan scans can be added to the
  open plan, endpoint dragging no longer jumps with wall length, and plan
  exports follow Measure walls. **Issues #101 and #102:** user guide and
  plan-authoring skill.
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
| Full web unit suite, October 16 (local) | **1,577 passed in 163 files** on `fix/editor-defects-3` (#112) with all its review and issue #101 fixes; `npm run check`: 0 errors, 0 warnings; production build passed. Chromium browser runs on that branch: every new or changed spec and the specs that depend on the changed code (about 170 spec files over three rounds), all passing after two fixes found by these runs; the elevation, storage-note, blocked-storage, save-conflict and library specs also in Firefox and WebKit. Full three-engine CI runs on the PR. PRs #107–#110: all 18 browser shards (Chromium, Firefox, WebKit) and both benchmark profiles passed in CI. |
| Full web unit suite, October 15 (local) | **1,325 passed in 134 files**, zero failures, on the uncommitted `fix/sibling-compat-and-open-issues` tree after the adversarial-review fixes, including the nine new regression files (147 tests). `npm run check`: 0 errors, 0 warnings. Production build: passed. Chromium browser subset on that build: 20 related specs (67 tests) passed before the review fixes and the 11 specs (38 tests) most affected passed again after them. Sibling parity suites (6/22/4) and the cross-planner scratch harness (4 per planner) pass. Firefox, WebKit, full browser CI and devices have not run on this tree. |
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

1. Merge #124 so CI on `main` passes again. The sibling-planner work shipped
   October 16, and real handoffs from OpenCatio3D and OpenLandscape3D have
   been accepted; still decide whether the native package should carry
   `project.interchange`.
2. Continue furniture fidelity and height editing usability; complete physical
   iPhone/iPad handoff when a device is available. The Catalyst UI/package
   preservation check is complete, with its actual export retained as a fixture.
3. Continue the nested-room Undo investigation. New state coverage verifies
   grouped drag preview → saved edit → repeated Undo/Redo for saved and detected
   rooms: all 16 history/resolution/nesting tests passed. This excludes stale
   preview metadata for that sequence; browser event/draw ordering remains
   unproven and the original intermittent failure has no established root cause.
4. Continue area alignment: Area Summary now shows a separate interior total
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
- Billing budget decisions (#116), and later AI/collaboration work behind that
  cost gate. Client migration, the Storage rules cutover and enforced upload
  quotas were completed on October 16 (#30).

These are open work areas, not a claim that every item is a reproduced defect.
Physical-device and administrative gates need their corresponding external
evidence, but there is still software work available; the overall goal is active.

## Supporting records

- [Detailed backlog and chronological evidence](NEXT.md)
- [Sibling interchange, CORS and issues #101–#104/#106](docs/reviews/2026-10-15-sibling-interchange-and-issues.md)
- [Furniture reflection implementation and verification](docs/reviews/2026-09-12-furniture-reflection.md)
- [Project package contract](docs/project-package-v1.md)
- [Local custom-model work](docs/reviews/2026-09-12-local-model-import.md)
- [Nested-room Undo investigation](docs/reviews/2026-09-12-nested-room-undo-reproduction.md)

Local `/tmp` logs are diagnostic artifacts and may not survive machine cleanup;
the committed records and linked CI runs retain the summarized validation scope.
