# Nested-room Undo reproduction — September 12, 2026

The intermittent failure at room-slabs.spec.ts:99 remains open. Production
sources match `7fd8570` (no src diff); the production build is the September 12
11:25 artifact. No runtime or test changes were made for this run.

Command: `npm run test:browser -- tests/browser/room-slabs.spec.ts --grep
'nested rooms export one slab' --project=chromium --repeat-each=3 --trace=on`.
Session `13571`, log `/tmp/web-nested-undo-sept12-repeat.log`, terminated with
exit 1: all three cases timed out at Area Summary before reaching Undo.

The first two cases timed out before reaching Undo, while opening Area Summary
at line 71. They do not reproduce the label failure. The first trace measures
15.94 seconds for navigation, 124.92 seconds for Export click (about 120 seconds
waiting for visible/enabled/stable), 19.91 seconds for Import JSON click, and
1.19 seconds to set the fixture. The 180-second case budget then expired.
The first trace and error context are preserved under
`/tmp/web-nested-undo-sept12-artifacts/first-run`.

At 14:44 local time, host load averages were 34.76/36.10/40.13; memory_pressure
reported 65 percent free. A two-second read-only sample of the third renderer
PID 4308 completed successfully in session `80147`, saved at
`/tmp/web-nested-undo-renderer-third-sample.txt`. All 1,485 main-thread samples
ended in mach_msg2_trap. This does not show sustained geometry/JavaScript work,
but does not prove the cause of the stability wait or exclude unsampled work.
The earlier attempt to sample second-renderer PID 4050 failed because that
process had already exited; no evidence is claimed from that attempt.

All three traces and error contexts are preserved under
`/tmp/web-nested-undo-sept12-artifacts/chromium-batch`. Each stopped at the same
line 71 action, so this batch gives no new pass/fail evidence for label Undo.

The first single Firefox comparison, session `42310`, terminated with exit 1.
Log: `/tmp/web-nested-undo-sept12-firefox.log`. It timed out creating a page in
the beforeEach fixture (60 seconds), before navigation to the application.
Its artifacts are preserved under
`/tmp/web-nested-undo-sept12-artifacts/firefox-setup`.

The workflow calls `test.setTimeout(180_000)` inside its body; that does not
extend the preceding page fixture/beforeEach budget. A diagnostic rerun applies
`--timeout=180000` at invocation so setup gets the same existing workflow
allowance, with every behavior assertion unchanged. Session `43577` terminated with exit 1, log
`/tmp/web-nested-undo-sept12-firefox-setup-budget.log`. It reached the first room
name editor (correct name assertion passed) but exhausted the total budget at
the area-visibility assertion, before Undo. The trace measures page creation
59.33 seconds, navigation 34.65, Export click 26.97, Import JSON click 13.04,
file input 3.77, and Area Summary click 26.16. These timeouts do not establish
an incorrect area. Artifacts are preserved under
`/tmp/web-nested-undo-sept12-artifacts/firefox-workflow`.

Do not interpret setup timeouts or passing reruns as proof that the original
Undo defect is fixed; retain the exact label restoration assertion.


## Setup timeout scope correction

Both workflows previously set their existing 180-second allowance inside the
test body (one directly, one via slow), leaving page fixtures under the default
60-second allowance. Moved that same 180-second value to file-level
`test.describe.configure` and removed the body overrides. The test titles,
geometry/Undo/export assertions and workflow allowance are unchanged. Collection
passed: six cases across three engines, log
`/tmp/web-room-slabs-timeout-collection.log`. Runtime behavior remains unmodified.
WebKit session `38782` terminated with exit 0: the full nested-room workflow
passed in 2.8 minutes (4.3 minutes including runner setup). Log:
`/tmp/web-nested-undo-sept12-webkit.log`; trace preserved under
`/tmp/web-nested-undo-sept12-artifacts/webkit-pass`.

The passing case retains area values, label editing and 40-pixel label drag/Undo,
PNG/SVG/PDF checks, floor-opening Undo/Redo, project-package/JSON persistence,
and active/stacked-floor slab ray checks. It qualifies this full workflow on
WebKit after the timeout-scope correction; it does not explain or close the
original intermittent Undo failure. Chromium and Firefox attempts above remain
failed setup/workflow-timeout observations, not current passing qualification.
All runs in this report are now terminal. No application source changed.

## Current-build repetitions and coordinate evidence

Session `65295` terminated with exit 0: two Chromium repetitions (2.5 and 2.2
minutes) and two Firefox repetitions (1.1 and 1.6 minutes) passed the entire
original nested-room workflow, including the exact label restoration assertion.
Total runner time was 8.5 minutes. Command: `npx playwright test
tests/browser/room-slabs.spec.ts --grep 'nested rooms export one slab'
--project=chromium --project=firefox --repeat-each=2 --trace=on`. Log:
`/tmp/web-nested-undo-current-repeat.log`; artifacts copied to
`/tmp/openplan-nested-undo-current-passing`. The runtime is the successful
opener-focus production build recorded in `7bc7556`; no room runtime fix was made.

Source inspection rules out the proposed assumption that room geometry only
refreshes on the next draw: `activeFloor.subscribe` synchronously invokes
`updateDetectedRooms()` when the restored project is published. The hash includes
saved rooms as well as walls. This is not a complete root-cause diagnosis.

The browser test now retains the last 90 label draw records (local coordinates,
canvas transform, CSS bounds, backing dimensions and screen anchors) and attaches
them with pre-drag and moved anchors after the Undo assertion, including on failure.
This lets a future failure distinguish viewport movement from unchanged drawing
coordinates. The exact assertion, timeout and full workflow remain unchanged.
Validation session `68614` terminated with exit 0: Chromium (2.9 minutes),
Firefox (2.6 minutes) and WebKit (46.9 seconds) all passed; total 7.4 minutes.
Log: `/tmp/web-nested-undo-coordinate-diagnostics.log`; traces preserved in
`/tmp/openplan-nested-undo-coordinate-artifacts`. The Chromium and Firefox trace
attachments were inspected and contain 42 and 81 draw records respectively,
with exact pre-drag/restored screen-anchor equality and separate local/transform/
canvas data. The intermittent defect remains open; these passes do not prove a fix.

## September 13 — transient preview versus saved history

Added a focused state regression for both saved and newly detected rooms. It
starts the same undo group used by label dragging, updates only the detected-room
preview, verifies saved metadata is untouched, commits the label offset, then
performs two Undo/Redo cycles. On each Undo the saved room list exactly matches
its baseline, and resolving geometry with the stale moved preview does not
resurrect its offset. Stable room ID and exact redo metadata are retained.

All 16 history, room resolution and nesting tests passed in session `11923`,
exit 0, 769 ms. Log: `/tmp/web-room-label-state-history.log`. This rules out
preview-offset resurrection for the tested store/resolver sequence. It does not
cover browser event ordering, draw scheduling or viewport changes and does not
close the original intermittent browser defect. No runtime change was made.

Next useful failure evidence remains the existing browser coordinate attachment,
paired with pointer/history event order and saved project state if it recurs;
repeated green runs alone would not establish a fix.
