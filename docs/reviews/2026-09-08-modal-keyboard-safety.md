# Modal keyboard safety

Issue [#88](https://github.com/laanlabs/openPlan3D/issues/88) fixes a reproduced
background-editing bug. In native Safari on production commit `8426776`, selecting
the QA bed, opening Version History and pressing Delete removed the bed behind
the still-open panel. Closing the panel and undoing restored the QA object.

## Behavior

Settings, Version History, Area Summary, Print Preview, Keyboard Shortcuts,
Command Palette, RoomPlan options and Floor Plan Templates now use native modal
dialogs. Opening moves focus inside, the browser makes the background inert, and
closing restores available prior focus. Escape, close buttons and existing
backdrop dismissal update component state consistently. RoomPlan and template
cards remain scrollable within short viewports.
A shared Tab/Shift+Tab loop keeps visible enabled controls reachable even when
Safari's keyboard preference skips buttons. Existing package and library-restore
dialogs use the same lifecycle and retain their busy-state cancellation rules.

Native inertness alone does not disable window/document listeners. Editor keyboard
handlers now check for an open dialog before modifying the plan, switching views,
starting tools or processing Escape. This also protects the existing native
package and library-restore dialogs. Elevation's capture-phase Escape handler
and 3D input follow the same rule; modal focus clears held walkthrough input.
Closing a modal leaves those view modes intact. Key releases still clear held input.
Opening a modal also releases any captured mouse; the existing unlock handler
ends a locked walkthrough session so dialog controls remain usable. A controlled
browser regression verifies movement stops and a fresh walkthrough has no held keys.

The command palette uses a named search combobox and result list with an active
option. Its commands execute after the dialog closes, preserving actions such as
Toggle Grid and opening Settings. Print preview keeps its existing PDF/export
behavior, and its bound canvas is reactive. No data format, cloud service, asset
or dependency changes are introduced.
The Settings command's previously missing listener is also connected and cleaned
up with the toolbar lifecycle.

## Validation

Local unit suite: **647 pass**. Production build passes; type checks report zero
errors and **nine remaining Svelte warnings**, down from 22. Two unit regressions
cover shortcut isolation even with a background event target and resumption after
closing the dialog.

Eight new browser workflows run across Chromium, Firefox and WebKit. They cover
desktop and 390-pixel dialog focus, Tab/Shift+Tab, selected-wall preservation,
deletion/undo after closing, field edits, command search/execution, cancelled
RoomPlan import, template focus restoration, elevation/3D mode preservation,
PDF download, print-media canvas visibility and walkthrough mouse release. Each
rejects page errors; the dialog, command and import workflows also reject external
requests. Existing import/recovery and rendering workflows remain in the
full suite. Final CI, native Safari and deployment results are recorded on the
issue and pull request; merge requires passing checks.

Local native Safari confirmed the selected wall survived Delete while history
was open, Tab reached Restore, Shift+Tab returned to Close, and Escape retained
the wall selection and dimensions. The command palette's Settings and Toggle Grid
actions passed, and Print Preview focused its page control with PDF export enabled.
The Settings modal layout was visually inspected on the local production build.
Safari also retained elevation and 3D edit modes after Settings was closed with
Escape. With a real captured walkthrough mouse, opening the palette released the
mouse, focused command search and ended the locked walkthrough session as intended.

Physical iPhone/iPad keyboard, touch and share-sheet testing remains part of the
release backlog. This batch does not change the Firebase cost gates in #30.
