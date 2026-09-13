# Project-package import dismissal — September 12, 2026

Baseline source `adb5d34` left the Import Project Package sheet open after Cancel,
before choosing any file. Thus no import task or file-picker completion was needed
to reproduce this instance. The isolated app required Escape to return to the
library. Earlier runs also needed Escape after successful imports.

Project-package import now resolves dismissal in a button inside the presented
navigation content. The same implementation used by export is extracted into
`SheetDismissButton`; export keeps its action/state changes and onDismiss queue.
Titles use LocalizedStringKey. Import disabling during publication and the
Back to Library default keyboard shortcut remain in place.

## Live Catalyst comparison

Built `/tmp/OpenPlan3D-Import-Local-Dismiss-QA.app`, isolated bundle
`com.laan.labs.floorplan.underlayfloorqa`. On the existing synthetic library:

1. Initial Cancel returned to the library without Escape.
2. Imported `/tmp/openplan-underlay-floor-qa/native-return-floor-owned-underlay.zip`
   through Choose Project Package and Import as Copy. Back to Library returned
   immediately at the next AX observation, showing the new independent copy.
3. Repeated that import and used toolbar Done. It also returned to the library,
   now showing both independently imported copies and the original sample plan.

No debugger or timing instrumentation was attached. The QA app was quit after
inspection. The installed Development app was not used. These checks verify
observed transitions, not subsecond performance targets.

## Build and tests

Catalyst build passed, session `78670`, exit 0:
`/tmp/native-import-local-dismiss-build.log`.

iPhone 17 Pro simulator build and all 12 ProjectPackageTests passed, zero
failures; XCTest duration 1.464 seconds, session `50787`, exit 0:
`/tmp/native-import-local-dismiss-ios.log`.

Full-scan import dismissal, editor dismissal, physical iPhone/iPad UI, and longer
presentation stress remain open. Prior export UI checks apply to the same button
behavior before extraction; this run did not repeat all export formats.
