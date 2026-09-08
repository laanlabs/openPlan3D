# Stationary walkthrough rendering

September 8, 2026 · [Issue #80](https://github.com/laanlabs/openPlan3D/issues/80)
· [PR #82](https://github.com/laanlabs/openPlan3D/pull/82)

## Measured problem and resulting behavior

Walkthrough requested a new frame and rendered the scene on every callback,
including when the user stood still. Native Safari recorded 1,500 callbacks,
requests and rendering frames in each 25-second stationary interval with the
medium and large furnished-home fixtures.

The viewer now schedules frames while movement, keyboard look or coasting is
active. Once these stop, no frame remains queued. Fresh input starts the clock
at the input handler's monotonic timestamp, so time spent idle cannot become a
movement jump. Repeated input during motion does not restart that clock. Shift
alone and cancelling directions do not create animation demand.

The exponential coasting tail finishes once remaining travel is below 0.001 cm,
then velocity becomes zero. Straight-line travel includes that last tail rather
than dropping it. The existing speed calibration, elapsed-time integration,
independent Shift keys, floor-relative height and blur/repeat recovery remain.

PointerLockControls' change event wakes mouse look; the eye-height range wakes
on input. Existing dirty-scene paths wake lighting, geometry, textures, camera
views and resize. Unmount removes the pointer listener and cancels queued work.
Held look/movement keys still request motion frames; this change targets quiet
walkthroughs, not every case where the visible camera pose happens to be unchanged.

## Native Safari measurements

[Sanitized numerical measurements](2026-09-08-walkthrough-idle-metrics.json) compare
deployed main `d7aef95` (public version `1788839033092`) with a local production
build of implementation commit `107ef7e`. Both use the same deterministic imports
from `npm run benchmark:fixtures` and the first, unstacked active floor:

| Home | Project floors / furniture | Active-floor furniture | Callbacks, before → after | Rendering frames, before → after | Mean page CPU sample, before → after |
| --- | ---: | ---: | ---: | ---: | ---: |
| Medium | 2 / 108 | 54 | 1,500 → 0 | 1,500 → 0 | 6.252% → 0.028% |
| Large | 3 / 288 | 96 | 1,500 → 0 | 1,500 → 0 | 8.054% → 0.006% |

Each range is 10–35 seconds after recording started. The fixture had already
rendered before recording; walkthrough was entered immediately afterward. No
input occurred during the measured range. Recording continued through later
interaction attempts and exit; those later events are excluded from the range.

Hardware: M4 Max Mac Studio (Mac16,9), 14 CPU cores, 36 GB RAM, macOS 26.2 build
25C56 and Safari 26.2. No thermal/performance warning was recorded by `pmset`;
actual temperatures were not measured. Inspector was docked below. Before entering
walkthrough, the document measured 1,324 × 350 CSS pixels, canvas 1,324 × 302,
DPR 1. Safari's pointer-lock banner was present in all four stationary samples;
the reduced viewport during lock was not measured separately.

Instruments: Network Requests, Layout & Rendering, JavaScript & Events, CPU and
Memory. Screenshots, Media & Animations and JavaScript Allocations were disabled.
Safari also exported rendering-frame records. The raw exports stay outside the
repository; `tooling/safari-timeline.mjs` extracts numerical aggregates without
copying requests, cookies, headers, source URLs, stacks or project contents.

These are single samples per size/build with different origins, loading histories
and fixture order (baseline medium then large; updated large then medium). Other
desktop apps remained open. Memory instrumentation has overhead; mean page memory
was 193.32/193.09 MB for medium and 212.88/205.97 MB for large. Those values do not
establish a memory-saving claim. CPU samples support the idle-work result but are
not whole-device power or battery measurements. No general FPS budget, active
navigation performance target or physical-phone result is established here.

A repeated update notice appeared on the baseline production origin despite
current bootstrap scripts; its likely stale cache-validator cause is tracked in
[#81](https://github.com/laanlabs/openPlan3D/issues/81). The static notice is another
reason not to treat the CPU/memory differences as an isolated performance ratio.
The strict result is eliminated stationary callbacks and rendering frames.

## Functional verification and limits

Local validation passes **614 unit tests**, production build and type checking
with zero errors and 23 existing warnings. Seven additional motion tests cover
animation demand, cancelled directions, bounded coasting, fresh wake timing,
active-clock continuity, early first-frame timestamps and reset behavior. The existing 30/60/120 Hz and uneven
cadence tests remain unchanged and pass.

The browser suite now has 69 workflows per engine (207 across Chromium, Firefox
and WebKit), plus six furnished-home benchmarks. The new workflow controls RAF
and input-clock timestamps at the browser boundary, observes actual WebGL draws
and rendered matrices/pixels, and asserts silence after entry, Shift alone,
coasting, mouse look, eye-height changes, lighting, resizing and unmount. It mocks
browser pointer-lock permission/state and dispatches mouse movement through the
actual Three controls, without exposing application references or debug hooks.
The existing real-cadence idle workflow also checks renewed held-key movement.

The initial CI runs reached the final new-test teardown assertion: they counted
the newly mounted 2D canvas's startup callbacks and its separate animation loop
as 3D work. The corrected check queues a viewer redraw, verifies cancellation
of that exact request on unmount, and confirms no additional draws on the disposed
WebGL context while 2D runs. All earlier 3D silence and interaction checks remain.
Chromium also reproduced a dropped wakeup when the first RAF timestamp preceded
its input handler. A new unit regression first failed, then passed with the fix:
wait for a frame after the wake time without discarding held input. The controlled
browser workflow now exercises early/equal first-frame timestamps too. Animation
callbacks receive a shared timestamp from the browser's rendering update (see the
[HTML animation-frame algorithm](https://html.spec.whatwg.org/multipage/imagebitmap-and-animations.html#run-the-animation-frame-callbacks));
it is not a fresh clock read at each callback. This follow-up changes first-input
handling after the recorded stationary measurements. See PR checks for final
engine and deployment results.

Native Safari verified walkthrough entry and Escape exit during every recording,
and subsequent top-down rendering of the furnished medium home. Inspector
instruments and the developer-features toggle were restored after profiling.
Native automation did not change the locked eye-height slider, so that interaction
is not claimed as a native pass; the CI keyboard/field test supplies that coverage.
Physical iPhone/iPad input, active orbit/stacking measurements, repeated hardware
samples, native distribution and the #30 release/cost gates remain outstanding.

This batch adds no Firebase writes, uploads, catalog assets or dependencies.
