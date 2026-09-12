# Scan count wording — September 12, 2026

Native source `56be55b` corrects singular count labels in Home and the full-scan
preview, including agreement of calibration verbs. Catalyst build session
`58073` remains active in `/tmp/native-scan-count-wording-build.log`. Do not copy
the product or change native source until this build terminates.

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
  ZIP SHA-256: `1e193cec4d484674019642142477e47bcf849295b4598bc22ace523d8c705bc2`.
- `synthetic-count-legacy-one.zip`: one legacy frame, four files.
  Expected preview: 1 frame pair; 0 frames have; 1 legacy frame is.
  ZIP SHA-256: `ef9bc77588a9ad2d1fb59837645939ef4dd3a0d74a2fe639c316eef64347cb80`.

Variants derive from the synthetic fixture, retain geometry and JPEG bytes,
remove imageMetadata/cameraMetadata from legacy frames, keep frame indices
consistent, update session photoCount/title, and recompute all payload size/hash
records. Python verified ZIP CRCs and every declared payload byte count/SHA-256.
This is fixture-integrity evidence only; native preview/import and live UI
validation remain pending. Check existing one-frame library cards and the
imported two-frame card for singular/plural captions after the build passes.
