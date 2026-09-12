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
A full unchanged nested-room workflow in WebKit is next; it is not yet qualified.
