# Measured furniture height: native UI package handoff

## Actual handoff evidence

The web package service generated `/tmp/web-height-return-package.zip` from the
height-edit regression: physical native height 3.125 m, web height 125 cm and
Z scale 2.5, X scale -2, Y scale 1.5, rotation 37.5 degrees.

The isolated Catalyst app `/tmp/OpenPlan3D-Height-Sept12-QA.app`, bundle
`com.laan.labs.floorplan.heightsept12qa`, was copied from the current `8fdd1bf`
build and separately signed. The development app was not used. Through native
UI, Choose Project Package → Import as Copy created session
`75732360-B559-434E-B583-3704D3EB9F7C`. Its saved plan retained height 3.125 m.
The inspected 3D preview showed the tall furniture box extending above the walls.

Export Options → Export Project Package (ZIP) → Save produced
`/tmp/native-ui-height-package.zip`. The unmodified export is committed as
`tests/fixtures/native-ui-height-package.zip` (includes a synthetic one-pixel
tracing image, no personal scan data).

## Regression result

The web service imports this actual native output and asserts exact retained
web furniture, measured height, all three scale components, rotation, custom
metadata, native furniture on re-export and attachment bytes. Native UUIDs are
compared case-insensitively; the first run differed only in UUID letter case.
After correcting that comparison, all 38 package tests passed in 1.48 seconds,
exit 0, session `25778`. Log: `/tmp/web-native-ui-height-regression-final.log`.

Both full native suites already passed on the same runtime source: 265 passed,
two optional integration skips, zero failures per platform. Implementation CI
34735405519 also passed all 18 browser shards, build/type check/unit tests and
both benchmark profiles before this additional fixture regression.

## Limits and next work

This qualifies web service → actual Catalyst import/save/preview/export → web
service height preservation. It does not qualify physical iPhone/iPad Files or
AirDrop handoff, height editing controls, or furniture model fidelity: Catalyst
still previews a simplified box. Those remain part of the broader NEXT goal.
