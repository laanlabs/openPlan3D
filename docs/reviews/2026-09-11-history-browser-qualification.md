# Browser qualification after shared history fixes

## Firefox milestone

All **366 Firefox cases** now pass, including the focused recovery correction.
Completed identities exactly match both the Chromium and Firefox portions of
the original inventory: 732 cases across those two engines. WebKit already has
its focused recovery pass and the continuation is now entering its remaining
cases. Session `10120` remains active on the unchanged `ddf7d90` runtime. Full
browser qualification is still incomplete.

## Chromium milestone

All **366 Chromium cases** now pass across the initial run, focused recovery
correction and continuation. Completed identities exactly match the Chromium
portion of the 1,098-case inventory. At this checkpoint Firefox and WebKit each
also have their focused editor-recovery pass; the continuation has moved to
Firefox. This is staged coverage, not an uninterrupted full-suite pass. Session
`10120` remains the active continuation handle; runtime sources remain unchanged.

Runtime under test: `ddf7d9094bb9ae1b27596e6a69b0473c737cdc91`.

The current full unit suite passed 1,032 tests in 97 files (24.08 seconds),
Svelte check reported zero diagnostics, and the production build passed. Focused
geometry/elevation drag coverage passed 24 cases across all three engines.

The full Playwright inventory contains **1,098 cases in 136 files**. A fresh
`npx playwright test --max-failures=1` run started against that production build.
This report is a running checkpoint, **not a full-suite pass claim**. The first
run terminated after 98 Chromium passes and one failure (16.6 minutes); 999 cases
did not run. The Portuguese editor recovery test still expected an English
storage-full error although the UI correctly displayed Portuguese. Updating that
expectation retained the exact backup-byte, migration-retry and stored-project
assertions. The focused recovery test passed in all three engines (24 seconds).

There are now **101 distinct completed cases and 997 remaining**, matched against
the original inventory without duplicates or extra identities. Runtime remains
`ddf7d90`; only the stale test expectation and this report changed. Qualification
will continue with the explicit remaining-case list.

Local continuation evidence:

- Initial process session: `42176` (terminal, exit 1).
- Continuation process session: `10120` (active at launch; poll this handle).
- Continuation output: `/tmp/web-history-full-browser-2.log`.
- Inventory: `/tmp/web-history-current-browser-inventory.log`.
- Run output: `/tmp/web-history-full-browser.log`.
- Focused recovery output: `/tmp/web-history-editor-recovery.log` (3 passed).
- Completed identities: `/tmp/web-history-browser-completed.txt`.
- Remaining list: `/tmp/web-history-browser-remaining.txt`.
- Continuation inventory: `/tmp/web-history-browser-continuation-inventory.log`.
- Unit output: `/tmp/web-undo-groups-full-unit.log`.
- Check/build: `/tmp/web-undo-groups-check.log`, `/tmp/web-undo-groups-build.log`.

Keep runtime sources fixed while this run is active. If a failure terminates
the run, inspect its output and retained trace before starting another suite.
Record partial coverage explicitly; any staged continuation must account for
every inventory case and the runtime revision used. This automated run cannot
establish physical-device, assistive-technology or release qualification.
