# Full-scan import dismissal — September 12, 2026

Production change: native `aaafdbe`, following shared SheetDismissButton in
`734a302`. The baseline left the initial Import Full Scan sheet visible after
Cancel, before any file selection; Escape returned to the library. The change
uses SheetDismissButton for Cancel/Done and Back to Library, retaining import
protection and the dataset pipeline.

## Catalyst automated result

Session `82197` finished with exit 0. All 21 selected tests passed, zero failures,
201.764 seconds of XCTest time: 20 ScanDatasetTests and one opt-in
LocalScanDatasetValidationTests case. The real local fixture preserved 394 files
and 194 frame pairs through export/import/re-export. Its calibration metadata
remains legacy-incomplete; this is not physical reprojection validation.
Log: `/tmp/native-scan-local-dismiss-catalyst.log`.

The build was slow under heavy host load but advanced through dependency
resolution, app compilation, test compilation and signing. Read-only compiler
sampling showed active type checking; the run was not restarted. Diagnostic
samples: `/tmp/swiftbuild-fullscan-sample.txt` and
`/tmp/fullscan-swift-compiler-sample.txt`.

## Live Catalyst verification

Created `/tmp/OpenPlan3D-Scan-Local-Dismiss-QA.app` after the app build completed,
while the byte-preservation tests ran in their separate test host. QA bundle:
`com.laan.labs.floorplan.underlayfloorqa`. No installed Development app was used.

- Initial Cancel returned to the library without Escape.
- Imported `/tmp/openplan3d-ui-qa/synthetic-full-scan.zip`: one frame pair, four
  files, complete synthetic calibration metadata, physical-device status pending.
  Back to Library returned to the library with the independent scan copy.
- Repeated the import and used toolbar Done; it returned to the library with
  both independent copies present. The QA app was quit after inspection.

All manifest sizes and SHA-256 values matched the source archive before import.
Both imported sessions retained all four original source hashes, including the
original session metadata under `.openplan-scan/original-session.json`:
`DA41A204-1086-4583-8013-27FC3AE4FDE3` and
`F6CCA1B5-BBE0-4C84-A3B6-0AC6D057E99D`.

## Simulator result and remaining work

The equivalent iPhone 17 Pro simulator selection finished with exit 0 in session
`50299`. All 21 tests passed, zero failures, 168.733 seconds of XCTest time,
including the real 194-frame/394-file preservation check. Log:
`/tmp/native-scan-local-dismiss-ios.log`. No skip was counted as a pass.

Physical UI, long-run presentation stress and editor dismissal stay open. The
live preview/library also exposes singular-count wording such as “1 frame pairs”
and “1 frames”; correct that in a later verified UI change.
