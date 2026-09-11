# Browser audit checkpoint — September 11, 2026

Every case in the current Playwright inventory has a passing result from the
staged audit or its focused follow-ups: **1,059 distinct cases, 353 each in
Chromium, Firefox and WebKit**. The final continuation passed all 26 remaining
cases in 6.6 minutes.

## Evidence and scope

The final comparison used `npx playwright test --list`, normalized source line
numbers, and compared the complete set of project + relative spec path + test
title identities with the accumulated passing results. It found no missing or
extra identities. Repeated executions do not increase the count.

This is an aggregate qualification checkpoint, not a claim that one uninterrupted
full-suite run passed on one commit. The original 1,050-case audit began against
the `78d3ad0` runtime. Project-service diagnostic translation was subsequently
built and checked with 30 focused recovery/opening cases across all engines;
later audit continuations used that build. Six new translation cases and three
storage-observer cases increased the inventory to 1,059. Later changes adjusted
test synchronization, input-history assumptions, one workflow's time budget and
the storage-observation helper; they did not change app runtime behavior.

The latest source validation also includes 987 unit tests in 94 files, zero
Svelte errors/warnings and a successful Node production build. Two unit cases
timed out in a parallel run under load; the entire suite passed with one worker
and unchanged unit timeouts. These results are not hardware performance budgets.

## Corrections exposed by qualification

- Wait for completed saves/imports and settled camera fits before dependent input.
- Match localized controls and status counts in Portuguese tests.
- Frame phone drag targets above the properties sheet and verify hit targets.
- Verify native text Undo/Redo without assuming identical browser undo grouping;
  save/reload numeric drafts before the independent text-history check.
- Give the multi-stage same-ID import/reload/3D case a bounded slow-test budget,
  retaining all assertions and its final screenshot.
- Finish horizontal status-strip scrolling and verify the button hit target.
- Prevent the test storage observer from creating an empty schema before app
  hydration; reject errors, close connections and wait for library readiness.

Detailed reproductions, intermediate failures and focused results are recorded
in [the localization review](2026-09-10-localization.md). Local raw evidence is in
`/tmp/web-full-browser-audit.log`, continuations
`/tmp/web-full-browser-audit-2.log` through `-10.log`, and the focused logs named
in that review. The final inventory is
`/tmp/web-browser-final-inventory.txt`; the deduplicated passing list is
`/tmp/web-browser-audit-passed.txt`. These `/tmp` files are local artifacts and
are not included in Git.

## Work still open

This checkpoint does not qualify physical iPhone/iPad gestures, actual Safari
hardware performance, native capture/calibration, native rendering parity,
first-room usability, distribution/signing, deployment or Firebase cost/rule
cutover. It does not assert remote CI or release status. Continue the requirements
in [NEXT.md](../../NEXT.md), retaining these distinctions when reporting progress.
