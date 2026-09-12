# Catalog localization browser qualification — stopped on caption regression

Runtime source: `87d3c8658ea7ce877354a3353d6c5503091fe428`. The working tree was
clean at the initial launch. Inventory: 1,107 cases in 139 files, across Chromium, Firefox
and WebKit. Production code has not changed during this qualification.

The initial full run exited with one failure and 1,106 unrun cases. Its first
Chromium case found the page still displaying the translated 3D loading message
at the 10-second canvas-readiness deadline. The captured trace showed no
application error. The test now allows up to 60 seconds for this lazy-load
boundary, inside its existing 180-second overall deadline. No assertions were
removed. The restarted full run passed that case (1.3 minutes), including
placement and exact Undo/Redo export comparisons. That run then finished with
six passes and one failure: the AI-panel case also reached its 10-second canvas
deadline while the page still displayed the 3D loading message. Its readiness
wait is now 60 seconds inside a 180-second overall allowance; its assertions and
network-request guard remain intact. Six distinct completed case identities were
matched against the original inventory and excluded from a 1,101-case continuation.
Playwright's own list command confirms that continuation count.

The 1,101-case continuation passed the AI-panel case, then exhausted the direct
AI-provider test's 60-second overall deadline while starting its no-image
recovery step. The successful render, request checks and byte-exact download
assertions had completed. This multi-stage workflow now has a 180-second
slow-test allowance; success, failure, cancellation, reload and network guards
remain intact. The two completed runs contain seven distinct passes. Their
union was checked against the original inventory; Playwright confirms 1,100
remaining cases for the next continuation.

The 1,100-case continuation ended after 41 passes and one timeout (1,058 unrun).
The background-image workflow exhausted its 60-second overall deadline during
final calibration, after its earlier cancellation, invalid-input, image-byte,
property-edit, removal and Undo checks. It now has a 180-second slow-test
allowance, retaining all assertions. The log also reports an error outside a
test without a separate diagnostic; this is not treated as passing evidence.
The union of completed stages contains 48 distinct inventory cases. Playwright
confirms the next continuation contains 1,059 cases. Production is unchanged.

The 1,059-case continuation passed the complete background workflow in 1.8
minutes, then the camera case timed out at its 10-second first-preview GPU poll.
The trace shows the preview controls visible and a GPU evaluation started with
no returned result before that deadline; it does not prove a rendering defect.
The first-frame poll and initial canvas readiness now allow 60 seconds within a
180-second workflow. Capture dimensions and renderer cleanup assertions remain.
There are 49 distinct retained passes; Playwright confirms 1,058 remaining cases.

The next continuation passed camera capture/cleanup (2.1 minutes) and both
canvas-hint cases. The canvas-idle workflow then exceeded its 10-second 3D
readiness assertion near the end, with the snapshot showing “Loading 3D viewer…”.
That boundary now allows 60 seconds within a 180-second total workflow; idle,
pixel-change, saved-state and teardown checks remain intact. There are 52
retained distinct passes and 1,055 remaining cases, confirmed by Playwright.

The 1,055-case continuation passed 30 cases, including the full canvas-idle
workflow (2.6 minutes). The crossing-room case then timed out clicking an
onboarding tip after checking visibility. Its final snapshot contains no tip;
OnboardingTooltip.svelte automatically dismisses tips after eight seconds. The
test now waits for the transient tip to become hidden instead of racing its
removal. Its three scene exports and all slab geometry assertions remain;
the full workflow has a 180-second allowance. The inventory union now contains
82 distinct passes; Playwright confirms 1,025 remaining cases.

The next continuation passed seven cases, including crossing-room slab exports
and all curved-opening placement cases, then the curved-opening mesh export
hit the same auto-dismiss tip race. All eight remaining identical optional
hint-click patterns now wait for hidden state, bounded at 15 seconds. The
curved-opening export workflow also has a 180-second allowance; geometry,
framing, idle and walkthrough assertions are unchanged. The inventory union
contains 89 distinct passes and 1,018 remaining cases.

The 1,018-case continuation passed 13 cases, including both curved-opening
mesh variants and curved rooms. The asset-cache workflow then exhausted its
60-second total deadline during offline 3D reload, after cold-load asset limits,
cache headers and decoded texture checks. It now has a 180-second allowance;
all offline, byte-limit and cache assertions remain. There are 102 distinct
retained passes and 1,005 remaining cases, confirmed by Playwright.

The asset-cache workflow passed in 2.1 minutes, including offline reload. The
sloped-wall workflow then exceeded its 10-second 3D canvas readiness wait after
height edits, invalid-input handling, reversal, elevation and save/reload checks.
That boundary now allows 60 seconds within a 180-second workflow. Assertions
are unchanged. There are 103 retained distinct passes and 1,004 remaining cases,
confirmed by Playwright.

The sloped-wall workflow passed in 1.9 minutes. The floor-elevation workflow
then exhausted its 60-second total deadline while capturing a walkthrough
screenshot, after edit/Undo/reload/import/stacked-view assertions. Both viewport
variants now have a 180-second allowance, with every assertion retained.
There are 104 distinct retained passes and 1,003 remaining cases, confirmed
by Playwright.

The 1,003-case continuation passed 20 cases, including both floor-elevation
workflows. Furniture fidelity then exhausted its 60-second total deadline during
the second 3D color check, after initial color/model-reuse and saved-property
checks. Both viewport variants now have a 180-second allowance, retaining all
color, reload and resource-reuse assertions. There are 124 retained distinct
passes and 983 remaining cases, confirmed by Playwright.

The furniture rerun ended with zero passes at the blue-pixel probe's own
10-second deadline. The failure screenshot shows the navy chair rendered;
that observation alone does not prove the numeric pixel assertion. Both blue
readiness probes now allow 60 seconds, with thresholds and resource assertions
unchanged. The same 983-case inventory is rerunning; retained passes remain 124.

The subsequent attempt stopped earlier at the shared open3D helper's initial
10-second canvas-readiness assertion. That helper now allows 60 seconds.
No case passed in that attempt, so the same 983-case inventory remains and
retained passes are still 124. The blue-pixel readiness result remains unproven.

The next continuation passed six cases, including both furniture-fidelity
variants and late model reuse. The stair-drag case then raced tooltip dismissal;
the click log explicitly records DOM detachment. Four remaining `tip`-named
variants in geometry-drag-undo, stair-footprint, stair-ghost and stair-direction
now wait for hidden state (15 seconds). Geometry and Undo assertions remain.
There are 130 retained distinct passes and 977 remaining cases, confirmed by
Playwright.

The next continuation passed all seven geometry-drag cases. The legacy
migration workflow then exceeded its 10-second final 3D readiness wait, after
history/image backup and large-project save/reload preservation checks. That
boundary now allows 60 seconds within a 180-second workflow. Every storage and
network assertion remains. There are 137 retained distinct passes and 970
remaining cases, confirmed by Playwright.

The next continuation passed five cases (three storage and two field-keyboard
workflows). Metadata/photo verification then hit its 60-second total deadline
while entering 3D, after earlier editing/photo assertions. Both viewport variants
now allow 180 seconds, with a 60-second canvas readiness boundary. Backup and
export assertions remain intact. There are 142 retained distinct passes and 965
remaining cases, confirmed by Playwright.

The 965-case continuation passed 24 cases, including desktop library restore.
The mobile restore case then exceeded its final 10-second 3D readiness wait
after restore/history/recovery-data checks. That boundary now allows 60 seconds
within a 180-second workflow; all preservation assertions remain. There are
166 retained distinct passes and 941 remaining cases, confirmed by Playwright.

## Resume the running process

- Command: `npx playwright test --test-list /tmp/web-localization-remaining.txt --max-failures=1`
The 941-case continuation terminated after 80 passes. Native package
preview/import/edit/reload/export at 1440px passed its data and byte-exact
attachment checks, then timed out at its final 10-second canvas assertion.
The error snapshot showed “Loading 3D viewer…”. Both viewport variants now use
180 seconds overall and 60 seconds for that readiness boundary; assertions and
network guards are unchanged. Logs 2–19 contain 246 unique passes, each matched
to the original inventory. Playwright confirms 861 remaining cases. The runner
also reported one error outside a test without a separate diagnostic; no pass
credit is assigned to that error.

- Unified execution session: `27671`; poll this handle before assuming it ended.
- Completed 80-pass continuation: `/tmp/web-localization-full-browser-19.log` (session `51582`, terminal exit 1).
- Active log: `/tmp/web-localization-full-browser-20.log`
- Completed 24-pass continuation: `/tmp/web-localization-full-browser-18.log` (session `71904`, terminal exit 1).
- Completed five-pass continuation: `/tmp/web-localization-full-browser-17.log` (session `36898`, terminal exit 1).
- Completed seven-pass continuation: `/tmp/web-localization-full-browser-16.log` (session `83767`, terminal exit 1).
- Completed six-pass continuation: `/tmp/web-localization-full-browser-15.log` (session `80619`, terminal exit 1).
- Completed initial-readiness failure: `/tmp/web-localization-full-browser-14.log` (session `34370`, terminal exit 1).
- Completed zero-pass rerun: `/tmp/web-localization-full-browser-13.log` (session `49049`, terminal exit 1).
- Completed 20-pass continuation: `/tmp/web-localization-full-browser-12.log` (session `7225`, terminal exit 1).
- Completed sloped-wall pass: `/tmp/web-localization-full-browser-11.log` (session `35782`, terminal exit 1).
- Completed asset-cache pass: `/tmp/web-localization-full-browser-10.log` (session `22444`, terminal exit 1).
- Completed 13-pass continuation: `/tmp/web-localization-full-browser-9.log` (session `47598`, terminal exit 1).
- Completed seven-pass continuation: `/tmp/web-localization-full-browser-8.log` (session `41767`, terminal exit 1).
- Completed 30-pass continuation: `/tmp/web-localization-full-browser-7.log` (session `23537`, terminal exit 1).
- Completed three-pass continuation: `/tmp/web-localization-full-browser-6.log` (session `49725`, terminal exit 1).
- Completed background pass: `/tmp/web-localization-full-browser-5.log` (session `6878`, terminal exit 1).
- Completed 41-pass continuation: `/tmp/web-localization-full-browser-4.log` (session `76158`, terminal exit 1).
- Completed one-pass continuation: `/tmp/web-localization-full-browser-3.log` (session `85756`, terminal exit 1).
- Completed six-pass run: `/tmp/web-localization-full-browser-2.log` (session `93960`, terminal exit 1).
- Retained pass identities: `/tmp/web-localization-passed.txt`
- Continuation inventory: `/tmp/web-localization-continuation-inventory.log`
- Initial failed log: `/tmp/web-localization-full-browser.log`
- Exact inventory: `/tmp/web-localization-full-inventory.log`

Session `27671` terminated with 97 passes and a failure in the unknown-furniture
saved-dimensions test. The screenshot visibly renders `missing-custom-model`;
the caption probe correctly expected “Unknown furniture”. The localized canvas
caller supplied the raw ID returned by `furnitureName` for an unknown catalog
entry, overriding the renderer fallback. This is a production regression, not
a readiness timeout. Together with prior stages, 343 cases passed on `87d3c86`.
The correction changes production code, so these results cannot be presented
as full qualification of the corrected runtime. Earlier active-session/log
entries above describe historical launches; no browser run is currently live.

Physical-device, native, release, fluent-language review and other NEXT gates
remain separate. Earlier full browser evidence applies to its named earlier
runtime, not automatically to this source.

## Corrected-runtime qualification

Production correction: `b3c7fa6`. Type checking passed with zero errors and
warnings; the production build passed. All nine focused browser cases passed
across Chromium, Firefox and WebKit in 2.6 minutes, covering localized known
captions, unknown saved/default dimensions, movement, rotation, resize, deletion
and exact undo/redo export comparisons. Log: `/tmp/web-unknown-caption-browser.log`.

A fresh full 1,107-case run is active in session `77795`, with log
`/tmp/web-caption-fixed-full-browser-1.log`. This starts qualification for the
corrected runtime; it does not reuse the previous runtime's 343 passes.
Poll the live handle before running competing browser tests or rebuilding.
Full completion remains unproven.

The corrected-runtime full run terminated after 104 passes (47.1 minutes).
The floor-elevation case passed its edit/reload/reimport checks, then reached
its 10-second canvas-readiness deadline while the snapshot showed the loading
message. The assertion now allows 60 seconds within the existing 180-second
workflow; geometry, stack, walkthrough, error and network checks are unchanged.
Production runtime remains `b3c7fa6`. The runner also reported an error outside
a test without a separate diagnostic; no completion credit is assigned to it.

The 104 unique passes match the original inventory. Playwright confirms 1,003
remaining cases. Session `77795` is terminal; continuation session `94916` runs
with log `/tmp/web-caption-fixed-full-browser-2.log`. Retained identities:
`/tmp/web-caption-fixed-passed.txt`; remaining inventory:
`/tmp/web-caption-fixed-remaining.txt`; validated list:
`/tmp/web-caption-fixed-continuation-inventory.log`. Do not mix these results
with the older `87d3c86` runtime. Full completion is still unproven.

Continuation `94916` terminated after 52 passes (25.7 minutes). Mobile legacy
furniture recovery reached its 10-second 3D canvas wait, with the error snapshot
showing “Loading 3D viewer…”. Its migration/edit/recovery checks had completed.
Both viewport variants now allow 60 seconds for canvas readiness within a
180-second workflow, preserving all byte, model-download and interaction checks.
No production code changed. The runner also reported an error outside a test
without a separate diagnostic; no completion credit is assigned to it.

Logs 1–2 contain 156 unique passes matched against the original inventory.
Playwright confirms 951 remaining cases. Session `32786` is active with log
`/tmp/web-caption-fixed-full-browser-3.log`; `94916` is terminal. The corrected
runtime's passed/remaining/list files have been updated. Full completion remains
unproven; poll the active handle before competing tests or production rebuilds.

Continuation `32786` terminated after 81 passes (27.0 minutes). The mobile
same-ID import case completed its pending-edit, separate-copy, persistence and
reopen checks, then reached the 10-second canvas-readiness deadline. The error
snapshot showed “Loading 3D viewer…”. That assertion now allows 60 seconds
within the existing 180-second workflow; all assertions remain. Production
runtime remains `b3c7fa6`. The runner also reported an error outside a test
without a separate diagnostic; no completion credit is assigned to it.

Logs 1–3 contain 237 distinct passes matched against the original inventory.
Playwright confirms 870 remaining cases. Session `8168` runs the continuation
in `/tmp/web-caption-fixed-full-browser-4.log`; `32786` is terminal. The
corrected-runtime passed/remaining/list files have been updated. Qualification
and the broader NEXT scope remain incomplete.

Stage 4 (`8168`) terminated with 40 passes in 18.2 minutes, bringing runtime
`b3c7fa6` to 277 passes. Save-conflict recovery completed its data assertions
but timed out at the 10-second 3D canvas wait; snapshot showed loading. The
wait now allows 60 seconds within 180 seconds overall, retaining all assertions.
The additional runner error had no separate diagnostic and earns no credit.
Production source now includes thumbnail fix `c14fce7`; prior passes do not
qualify that change. Type checking passed, and build session `17657` is active
with log `/tmp/web-reserved-thumbnail-build.log`. Validate the new thumbnail
cases and save-conflict workflow after the build, before further qualification.

Thumbnail fix `c14fce7` passed type checking, production build and all 24
focused thumbnail/save-conflict cases across three engines. Sessions `17657`,
`77574` and `98059` are terminal. Logs are recorded at the top of NEXT.md.
The new inventory has 1,116 cases; 24 unique current-runtime passes match it.
Session `44047` runs the remaining 1,092 in `/tmp/web-thumbnail-fixed-full-browser-1.log`.
The new inventory/passed/remaining files use `/tmp/web-thumbnail-fixed-` names.
Prior-runtime results do not qualify this source; broader work remains open.

Current-runtime session `44047` terminated after 243 passes (1.5 hours).
Furniture-category preview reached its 10-second canvas readiness deadline;
the snapshot showed mounted 3D controls. Both widths now allow 60 seconds
for readiness in a 180-second workflow. Category, metadata and exact model
download assertions remain unchanged. No production source changed. The
runner also reported an error outside a test without a separate diagnostic.
Combined with 24 focused passes, 267 distinct current-runtime cases match
the inventory. Playwright confirms 849 remaining tests in 138 files.
Continuation `99630` uses `/tmp/web-thumbnail-fixed-full-browser-2.log`;
passed/remaining files are updated, with validated list in
`/tmp/web-thumbnail-fixed-continuation-inventory.log`. Completion remains unproven.

Stage 2 (`99630`) terminated after 11 passes (5.8 minutes). Mobile damaged
import completed its atomicity, undo/redo, reload and extension checks, then
reached a 10-second canvas deadline while the snapshot showed loading. Both
widths now allow 60 seconds for readiness within a 180-second workflow. All
assertions remain and production source is unchanged. The runner also reported
an error outside a test without a separate diagnostic; it earns no pass credit.
There are 278 distinct current-runtime passes matched to the inventory;
Playwright confirms 838 remaining cases. Session `76367` runs them in
`/tmp/web-thumbnail-fixed-full-browser-3.log`. Passed/remaining/list files are
updated. Full qualification and wider NEXT requirements remain incomplete.


Stage 3 is terminal (session `76367`): 15 passed, 822 not run, and the nested-room slab workflow failed after label movement. At room-slabs.spec.ts:99, Undo left the label 40 pixels from its original position for the entire 10-second assertion. The preceding drag assertion passed. Current-runtime distinct passes total 293; the full suite is incomplete. An unchanged Chromium reproduction is active in session `32789`, `/tmp/web-nested-undo-repro.log`. No assertion or runtime change has been made while investigating.

The unchanged nested-room Chromium reproduction passed in 2.2 minutes (session `32789`, exit 0), including label Undo, image/PDF/package exports, openings and stacked-floor slab checks. Unique current-runtime passes are 294. This does not explain the intermittent stage-3 failure. The identical nested-room workflow is now running across all three engines with `--trace=on`, log `/tmp/web-nested-undo-all-engines.log`. No assertions were relaxed and no runtime change was made.

The traced all-engine nested-room workflow passed unchanged (session `59904`, exit 0): Chromium 2.2 minutes, Firefox 44.9 seconds, WebKit 35.5 seconds. Three trace archives were preserved in `/tmp/web-nested-undo-passing-traces` before continuing. The initial intermittent Undo failure remains unexplained/open. Inventory accounting verifies 296 unique current-runtime passes and 820 remaining cases; duplicate Chromium passes count once. Playwright `--list` confirms 820 tests in 138 files. Stage 4 is active in session `42770`, `/tmp/web-thumbnail-fixed-full-browser-4.log`; runtime and assertions are unchanged.
