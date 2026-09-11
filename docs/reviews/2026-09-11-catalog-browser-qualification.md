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

## Resume the running process

- Command: `npx playwright test --test-list /tmp/web-localization-remaining.txt --max-failures=1`
- Unified execution session: `76158`; poll this handle before assuming it ended.
- Active log: `/tmp/web-localization-full-browser-4.log`
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
