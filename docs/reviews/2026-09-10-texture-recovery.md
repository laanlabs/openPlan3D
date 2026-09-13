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

## Production-browser recovery checks

Added separate wall/floor Playwright cases against the production build. Each
aborts the first actual texture request, imports a synthetic room, verifies
repeated redraws do not issue extra requests, advances only the Date.now offset
past the cooldown, and triggers a later draw. The retry is held until the fallback
canvas is recorded, then fulfilled with the actual bundled WebP. Canvas pixels
change without subsequent pointer movement/UI input, verifying the texture-load
notification wakes rendering. Each case sees exactly two requests.

All six cases passed: two in Chromium (22.1 seconds total) and four across Firefox
and WebKit (23.8 seconds total). Logs: `/tmp/web-texture-recovery-browser.log` and
`/tmp/web-texture-recovery-other-engines.log`. These are controlled network-error
tests with a clock offset, not physical-device or elapsed-30-second outage tests.
No production source changed in this validation batch.

## 3D recovery and settled-view qualification

The same test now covers switching to 3D after the failed request/cooldown.
It waits for actual WebGL draws to settle before fulfilling the held retry, then
compares canvas hashes without another UI action. Wall cases use the default
view; floor cases use Top-Down View so the affected room surface is visible.
The initial floor cases failed because the default camera obscured that surface;
the top-down Chromium control passed before the final run. Hash comparisons also
avoid embedding full base64 screenshots in assertion errors.

The final complete test file passes all 12 cases (wall/floor × 2D/3D ×
Chromium/Firefox/WebKit) in 1.5 minutes. Log:
`/tmp/web-texture-recovery-all-views.log`. This confirms scene rebuild/redraw for
3D texture arrival using the shared loader; no separate production 3D fix was
needed. Controlled time/network conditions and device limits above still apply.
