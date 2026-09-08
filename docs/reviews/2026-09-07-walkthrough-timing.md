# Walkthrough timing and input recovery

September 7, 2026 · [Issue #77](https://github.com/laanlabs/openPlan3D/issues/77)

## Problem and resulting behavior

The viewer integrated a fixed 16 ms on every animation callback. A one-second
forward input therefore traveled different distances at 30, 60 and 120 callbacks
per second. Keyboard turning and momentum had the same dependency. The extracted
old calculation failed 11 of the initial 14 motion regressions, including every
30/120 Hz comparison against 60 Hz. These are controlled simulation results, not
measurements of three physical displays.

Walkthrough now consumes the RAF timestamp. Exponential velocity decay and its
displacement integral make acceleration, coasting and sprint changes independent
of callback cadence. Camera motion uses short substeps (at most 1/120 second) so
simultaneous turning and movement follow a consistent path. Only the final pose
is rendered once per callback. Uneven callback intervals retain elapsed time;
there is no fixed-tick accumulator or extra rendering loop.

The existing slider calibration stays intact: the default 800 setting approaches
80 cm/s under the existing drag factor of 10. From rest, one second now covers
about 72 cm at each tested cadence. This removes the old approximate-clock error
without interpreting the slider as a ten-times-faster travel speed. Keyboard look
turns at two radians per second. Mouse look still uses PointerLockControls; both
paths use its YXZ yaw/pitch convention. Movement remains horizontal and eye height
is relative to the active floor elevation.

## Pauses and input ownership

A single delayed frame consumes at most 250 ms, limiting catch-up after a stall.
Below four callbacks per second this deliberately limits traveled time. Actual
blur, visibility changes, entry, exit and teardown reset elapsed time, momentum
and all held keys. A user returning to the page starts movement with a fresh key
press; OS key repeats cannot revive cleared movement. Both Shift keys are tracked independently, and releasing Shift outside
walkthrough cannot leave sprint enabled on the next entry.

Focused inputs, selects, text areas and editable content retain their keyboard
behavior. Focusing one clears movement; arrows adjust the eye-height slider
without also walking the camera. Modified browser shortcuts and composition input
are not treated as movement. Denied pointer lock keeps keyboard movement/look
available. Orbit idle scheduling from #75 and top-down exit behavior remain.

## Verification

Local validation: **607 unit tests**, zero type-check errors with 23 existing
Svelte warnings, and the production build. Sixteen motion tests cover 30/60/120 Hz,
uneven timing, diagonal normalization, simultaneous turning/movement, release
momentum, speed calibration, pause limits, duplicate timestamps, input reset,
key-repeat recovery, both Shift keys, pitch limits and floor-relative height.

Two production-browser workflows control RAF timestamps and observe WebGL view
uniforms at the browser boundary in CI. They compare actual rendered camera views
after equal-duration input at 30/60/120 Hz and verify changed canvas pixels. They
also exercise simulated blur/visibility events with held keys, input-field arrows,
denied pointer lock and leaving/re-entering while Shift is released outside the
mode. No application camera references or production debug hooks are exposed.
The suite now has 68 workflows per engine (204 across Chromium, Firefox and
WebKit), plus six furnished-home rendering benchmarks. See the linked GitHub issue
and PR checks for final CI, native Safari and deployment verification.

The first CI run retried the existing Chromium phone-width field-editing test:
it reloaded immediately after clicking an asynchronous Save and read the previous
note. That test now waits for the expected IndexedDB record before reloading,
then retains its full editor and saved-document assertions. The walkthrough
workflows passed their first attempts in Chromium and Firefox in that run.

The controlled cadence tests establish integration behavior, not a hardware FPS
budget. Actual iPhone/iPad touch and backgrounding checks, medium/large-home device
calibration, native distribution and the #30 migration/billing gates remain.
This change adds no Firebase writes, uploads, model assets or dependencies.
