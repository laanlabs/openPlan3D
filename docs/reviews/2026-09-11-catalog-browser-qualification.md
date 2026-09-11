# Catalog localization browser qualification — in progress

Runtime source: `87d3c8658ea7ce877354a3353d6c5503091fe428`. The working tree was
clean at launch. Inventory: 1,107 cases in 139 files, across Chromium, Firefox
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

## Resume the running process

- Command: `npx playwright test --test-list /tmp/web-localization-remaining.txt --max-failures=1`
- Unified execution session: `36898`; poll this handle before assuming it ended.
- Active log: `/tmp/web-localization-full-browser-17.log`
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

This is a live checkpoint, not completion evidence. Do not run another competing
browser suite, rebuild production assets, or restart this run while it is live.
On terminal failure, inspect the exact failure before choosing a correction and
continuation inventory. On success, verify the pass count against the inventory
and replace this report's in-progress status with the actual outcome.

Physical-device, native, release, fluent-language review and other NEXT gates
remain separate. Earlier full browser evidence applies to its named earlier
runtime, not automatically to this source.
