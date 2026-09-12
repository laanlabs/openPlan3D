# Native export sheet dismissal — September 12, 2026

## Reproduction and change

The baseline `9d7a8ea` Catalyst QA app repeatedly retained Export Options after
choosing a package export; Escape then revealed the queued Save dialog. Cancel
also left the options sheet visible. This reproduced without canvas editing.

A read-only LLDB inspection attached only to the isolated QA process. After
Cancel, the root UIHostingController still presented a
PresentationHostingController, with isBeingDismissed returning zero (displayed
as nil by LLDB's object-format output). Log:
`/tmp/native-export-cancel-controller.log`, session `13343`, exit 0. Attachment
paused the app and took about a minute, so this is not a dismissal latency
measurement and does not establish the underlying framework/input cause.

Export action buttons and Cancel now resolve SwiftUI's dismiss environment
inside the sheet. They retain their existing state updates; exports still start
only from the sheet's onDismiss callback. No timed delay, forced UIKit dismissal,
or diagnostic task was added to production. This addresses the reproduced export
workflow; it does not establish a fix for editor or import-sheet dismissal.

## Live verification

Built and launched `/tmp/OpenPlan3D-Export-Local-Dismiss-QA.app`, using the isolated
bundle `com.laan.labs.floorplan.underlayfloorqa` and its existing synthetic project.
The installed Development app was not touched. Without debugger attachment or
Escape between actions:

- Export Options → Cancel returned to review at the next AX/screenshot check.
- Reopening options → Export Project Package opened the native Save dialog.
- Saving returned to review. The package retained underlay level 3, angle pi/2,
  center (3,2), width 4 metres and the source PNG SHA-256
  `fae9c957805920000a8363cbb84d6bb929de39964a603503ff691d251b3ac80a`.
- Reopening options → Export Floor Plan PDF opened the native Save dialog.
- Cancelling that Save returned to review. The QA app was then quit.

The saved diagnostic package is
`/tmp/openplan-underlay-floor-qa/sheet-local-dismiss-return.zip.zip`; the double
extension came from typing a suffix while the native save panel retained its own.
The package was read and its image bytes verified directly.

## Build and test evidence

Catalyst build passed, session `77446`, exit 0:
`/tmp/native-export-local-dismiss-build.log`.

The iPhone 17 Pro simulator built and passed all 12 ProjectPackageTests, zero
failures, XCTest duration 1.114 seconds; session `27270`, exit 0:
`/tmp/native-export-local-dismiss-ios.log`.

This is focused build/package evidence plus live Catalyst presentation coverage.
iPhone/iPad share-sheet interaction, all other export formats, repeated long-run
presentation stress, editor/import-sheet delays and broader NEXT work remain open.
