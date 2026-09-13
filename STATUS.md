# OpenPlan3D status

Last verified: **September 12, 2026, 23:02 EDT**.

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
| Web app: `openPlan3D` | `codex/threejs-render-lab` | `ea84da1` — browser CI sharding and raster rounding | Committed and pushed; [PR #95](https://github.com/laanlabs/openPlan3D/pull/95) remains open |
| Native app: `openplan3d-ios` | `codex/local-floorplan-render` | `72906c0` — imported-package reflection edits | Committed and pushed |
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
  cap to address Firefox exporting 4095 pixels instead of 4096.

## Validation state

| Check | Evidence and limits |
| --- | --- |
| Full native simulator and Catalyst suites | Each reported 264 tests: **262 passed, two optional integration skips, zero failures**, on source `3d076a9`. These runs predate the later package-merger fix. |
| Later native package-merger regression | **Passed**, exit 0, 1.086 seconds, on `72906c0`. This is a focused regression, not a newer full native suite. |
| Full web unit suite before raster fix | 1,135 passed and three five-second timeouts out of 1,138 tests. All nine tests in the three affected files passed unchanged in a one-worker rerun. |
| Raster export unit tests and build | **27 tests passed**; production build passed. |
| Earlier local full browser run | 35 passed, five timeouts, 1,139 unrun. All five timed-out cases later passed unchanged on the current-at-that-time build. Full coverage was not achieved. |
| Earlier CI browser run | All engines exceeded the 12-minute suite limit; Firefox also exposed the raster-width assertion failure. This motivated sharding and the raster fix. |
| Shard inventory | All **1,179 cases** occur exactly once: 393 per engine, divided into groups of 71/61/74/58/64/65. This verifies collection, not execution. |
| Benchmark CI | Desktop: three passed; phone viewport: three passed. Software-rendered measurements do not qualify physical-phone performance. |

## Checks currently running

- **Raster export browser regression:** local session `26950`, all three engines.
  Chromium passed in 39.5 seconds; Firefox/WebKit completion is pending.
  Log: `/tmp/web-raster-rounding-browser.log`. Poll this session before starting
  another browser run against the same local server.
- **CI after sharding/raster fix:** [run 34734473227](https://github.com/laanlabs/openPlan3D/actions/runs/34734473227)
  was building at the latest observation. Require the full browser matrix and
  benchmark results before declaring current CI green. A later documentation push
  may create an additional run; check its head commit when interpreting results.

## Next priorities

1. Finish raster browser verification and inspect the complete sharded CI results;
   diagnose any remaining failures without dropping coverage or weakening assertions.
2. Preserve measured **furniture height**. Native RoomPlan import currently drops
   `dimensions[1]`; preview/export substitutes a category default. Carry measured
   height through the model, validation, preview/export, duplication, and package
   bridge, with legacy and round-trip coverage.
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
