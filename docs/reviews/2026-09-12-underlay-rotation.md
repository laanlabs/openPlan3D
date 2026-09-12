## Rotated tracing-image package support — September 12

The first web floor's PNG/JPEG/GIF tracing image now maps to the native underlay
at arbitrary rotation using optional clockwise-radian `angle` metadata. The native
canvas rotates the image around its existing center. Save/reopen and package
return retain the angle and original image bytes. Omitted legacy angles remain
omitted; native angle changes and explicit resets update web rotation without
resetting opacity or locking. Both readers validate optional angles consistently.

Validation: 24 web package tests passed after four new cases failed on the old
implementation; web type checking reports zero errors/warnings and production
build passed. Native package tests passed on Mac Catalyst (11 tests, session
`58398`, exit 0) and iPhone 17 Pro simulator (12 tests including invalid-angle
and explicit-reset coverage, session `75363`, exit 0). Rotated PNG/JPEG save,
reopen, import and re-export preserve exact asset bytes. Logs are
`/tmp/web-underlay-rotation-{before,unit,check,build}.log` and
`/tmp/native-underlay-rotation-{catalyst,ios}.log`.

Native visual inspection and a live native export returned through all three
browser engines now pass; see [the UI report](2026-09-12-underlay-rotation-ui.md).
Native fitting still excludes the rotated image extent and remains follow-up work.
No build or test process remains active. Device, release and broader NEXT work
remain open.
