# Recover failed wall and floor texture requests

Both photo-texture loaders added IDs to loadingSet but never handled Image errors.
A transient failed request therefore left the texture permanently marked loading
for that page session. Wall rendering kept its procedural fallback; floor rendering
kept returning no photo texture. Subsequent draws could not start another request.

The loaders now clear pending state on error and allow another attempt on a draw
at least 30 seconds later. Repeated draws during the cooldown keep their existing
fallback without issuing more requests. Success clears pending/retry state, caches
the image and uses the existing texture-load notification to wake rendering.
There is no retry timer and no background request loop: an otherwise idle view
waits for a later draw. The cooldown is per resolved texture ID, including legacy
floor aliases.

The new wall/floor regressions failed before the change. Afterward they exercise
one in-flight request, error, repeated cooldown draws, a later retry, successful
notification and reuse of the correctly sized photo canvas. All three focused
texture-recovery/catalog-asset tests pass. Logs: `/tmp/web-texture-recovery-before.log`
and `/tmp/web-texture-recovery-after.log`. Svelte check reports zero errors and
warnings (`/tmp/web-texture-recovery-check.log`). These tests use controlled image
load/error events; they are not a real-network outage or physical-device run.

Production build, catalog inventory check and `git diff --check` passed. Build log: `/tmp/web-texture-recovery-build.log`.
