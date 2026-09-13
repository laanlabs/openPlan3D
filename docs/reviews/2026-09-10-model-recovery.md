# Furniture model recovery after a failed download

The shared GLB cache stored a failed request as a null result for the page's
lifetime. This avoided repeated downloads on every scene edit but also prevented
later model requests from recovering after a transient failure.

A failed result now has a 30-second cooldown. Calls during that interval retain
the procedural fallback without another download. The first later call replaces
the failed cache entry, and concurrent callers share its pending promise. Successful
sources retain the existing page-session cache and per-consumer resource cloning.
There is no background retry loop. Existing fallback instances remain usable;
they receive recovered models when rebuilt/requested again, not via a new timer.

The added regression failed before the change because the second download never
started. It now checks cooldown suppression, a recovered shared download, distinct
instance geometry, reuse of the successful cache and retention of the original
fallback. All 14 focused furniture-model and texture-recovery tests pass, including
existing disposal, fitting, appearance and no-per-edit-retry coverage. Logs:
`/tmp/web-model-recovery-before.log` and `/tmp/web-model-recovery-after.log`.
Svelte check reports zero errors/warnings (`/tmp/web-model-recovery-check.log`).
These tests simulate loader failure and clock advancement; physical-network/browser
outage qualification is separate.

Production build, catalog consistency check and diff checks passed. Build log: `/tmp/web-model-recovery-build.log`.

## Full web unit integration

The complete `npm test` run passed against `faaa9cd`: 931 tests across 86 files,
zero failures, in 21.14 seconds. Process exit code was 0. Log:
`/tmp/web-full-asset-recovery.log`. This covers the current unit suite after both
texture and model retry changes; it does not claim a new full browser-suite run.
The separate 12-case texture browser result remains scoped to that workflow.
