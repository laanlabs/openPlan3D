# Browser qualification after shared history fixes

All **1,098 distinct browser cases in 136 files pass** against runtime
`ddf7d9094bb9ae1b27596e6a69b0473c737cdc91`: 366 Chromium, 366 Firefox and
366 WebKit cases. The union of passing identities exactly equals the original
inventory, without missing, extra or duplicate cases across the three runs.
This is completed **staged qualification**, not one uninterrupted full-suite run.
All test processes are terminal; no browser continuation remains active.

## Validation sequence

1. The initial full run passed 98 Chromium cases, then stopped at a stale test
   expectation (16.6 minutes). The Portuguese editor recovery test expected an
   English storage-full message although the UI correctly displayed Portuguese.
   One test failed and 999 did not run.
2. The test expectation was corrected without changing runtime sources or
   weakening its exact backup-byte, migration-retry and stored-project assertions.
   The focused recovery case passed in all three engines (24 seconds).
3. An explicit list of the 997 remaining inventory cases passed in the
   continuation (1.8 hours). Its process exited successfully. Runtime sources
   and the production build remained unchanged throughout qualification.

The same runtime passed all 1,032 unit tests in 97 files (24.08 seconds), Svelte
check with zero diagnostics, and production build. The earlier focused geometry
and elevation drag suite also passed 24 browser cases across all three engines.

## Evidence

- Initial process `42176`: terminal, exit 1; `/tmp/web-history-full-browser.log`.
- Focused recovery: `/tmp/web-history-editor-recovery.log` (3 passed).
- Continuation process `10120`: terminal, exit 0;
  `/tmp/web-history-full-browser-2.log` (997 passed).
- Original inventory: `/tmp/web-history-current-browser-inventory.log`.
- Completed normalized identities: `/tmp/web-history-browser-completed.txt`.
- Historical continuation list: `/tmp/web-history-browser-remaining.txt`;
  inventory confirmation: `/tmp/web-history-browser-continuation-inventory.log`.
- Full unit output: `/tmp/web-undo-groups-full-unit.log`.
- Check/build: `/tmp/web-undo-groups-check.log`, `/tmp/web-undo-groups-build.log`.

The temporary remaining-case list is historical input, not evidence of outstanding
tests. No further rerun is required absent new changes or unresolved concerns.
This browser qualification does not establish physical-device performance,
assistive-technology usability, native rendering fidelity or release readiness.
The broader requirements in NEXT.md remain open.
