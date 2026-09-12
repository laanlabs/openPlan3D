# Scan count wording — September 12, 2026

Native source `56be55b` corrects singular count labels in Home and the full-scan
preview, including agreement of calibration verbs. Catalyst build session
`58073` finished with exit 0 and BUILD SUCCEEDED in
`/tmp/native-scan-count-wording-build.log`.

## Prepared live checks

Use `tooling/create-sandbox-qa.sh` after build completion with source
`/tmp/openplan3d-autolabel-qa/Build/Products/Debug-maccatalyst/FloorPlan.app`,
a new destination `/tmp/OpenPlan3D-Scan-Counts-Sept12-QA.app`, and isolated bundle
`com.laan.labs.floorplan.underlayfloorqa`. Prior QA app was quit.

Fixtures under `/tmp/openplan3d-ui-qa`:

- `synthetic-full-scan.zip`: existing one calibrated frame, four files.
  Expected preview: 1 frame pair; 1 frame has; 0 legacy frames are.
- `synthetic-count-mixed-two.zip`: two frame pairs, one complete and one legacy,
  six files. Expected preview: 2 frame pairs; 1 frame has; 1 legacy frame is.
  ZIP SHA-256: `ad9368b064e03b068447daa39e3cd0d635c1e2a3c33c0d6e325cf7d8916c8472`.
- `synthetic-count-legacy-one.zip`: one legacy frame, four files.
  Expected preview: 1 frame pair; 0 frames have; 1 legacy frame is.
  ZIP SHA-256: `dbca883828d5c26aad76b5a9418502dcfe32d37dc5393c20c4b128a60f04a4f0`.

Variants derive from the synthetic fixture, retain geometry and JPEG bytes,
remove imageMetadata/cameraMetadata from legacy frames, keep frame indices
consistent, update session photoCount/title, and recompute all payload size/hash
records. Python verified ZIP CRCs and every declared payload byte count/SHA-256.
This is fixture-integrity evidence only; native preview/import and live UI
validation remain pending. Check existing one-frame library cards and the
imported two-frame card for singular/plural captions after the build passes.


## Completed Catalyst UI checks

The sandbox helper completed (session `81721`, exit 0); the new QA app launched.
Existing single-frame library cards read “1 frame”. All three fixture previews
showed their expected labels listed above. The mixed two-frame fixture imported
successfully; Back to Library returned to Home, where its new card read
“QA Count mixed-two (Imported Scan), Nov 14, 2023 · 2 frames”. The other two
fixtures were previewed only. Cancel closed the final preview, and the QA app
was quit. These are Catalyst UI results; physical iOS UI remains unqualified.

Fixture correction: the first Python-generated mixed ZIP was properly rejected
for missing the format's required UTF-8 flag. Both variants were corrected in
local and central ZIP headers, CRCs rechecked, and their corrected hashes are
listed above. Payload bytes and declared payload hashes did not change. All
three corrected previews passed native validation; mixed import additionally
passed full native payload/image/camera validation. No runtime relaxation was
made in response to the invalid test fixture.
