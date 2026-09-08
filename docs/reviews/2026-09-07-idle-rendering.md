# Idle 3D rendering and native Safari measurements

September 7, 2026 · [Issue #75](https://github.com/laanlabs/openPlan3D/issues/75)
· [PR #76](https://github.com/laanlabs/openPlan3D/pull/76)

## Measured problem and change

The existing dirty flag avoided unchanged WebGL draws, but the main viewer still
requested an animation callback and updated OrbitControls on every browser frame.
Native Safari recorded 1,500 fired callbacks and 1,500 new requests in a quiet
25-second interval with the small furnished-home fixture: 60 callbacks per second.

Dirty changes now request one coalesced frame. OrbitControls changes request the
next damping step; once damping settles, the viewer leaves no callback queued.
Lighting, textures, scene rebuilds, resizing, highlights and explicit camera views
wake it. Walkthrough resumes continuous frames. Leaving walkthrough returns to
demand-driven orbit updates. Teardown cancels queued work and prevents late model
callbacks from scheduling work on a disposed viewer. Furniture placement previews
also request redraws when they move, disappear or finish loading.

## Hardware evidence and limits

The baseline uses deployed main `9e5eee5`; the updated application uses `552c096`
served locally from a production build. Both use the same generated small-home
fixture: four rooms and 24 furniture instances. Hardware is an Apple M4 Max
(14 CPU cores, 36 GB RAM, Mac16,9), macOS 26.2 build 25C56, Safari 26.2. `pmset`
reported no recorded thermal or performance warning; actual chip temperatures
were not measured. Other ordinary desktop apps remained open.

Safari Web Inspector recorded Network, Layout & Rendering, JavaScript & Events,
Rendering Frames, CPU and Memory. Screenshots and JavaScript Allocations were
disabled. Inspector was docked below the app; the baseline document body measured
1,324 × 350 CSS pixels. Device pixel ratio was not recorded. Memory instrumentation itself has
overhead, and Safari's CPU samples describe the inspected page's threads; these
are not whole-device power or battery measurements. See the
[WebKit timeline reference](https://webkit.org/web-inspector/timelines-tab/).

The recorded JSON summary is in [idle-rendering-metrics.json](2026-09-07-idle-rendering-metrics.json).
For the matched interval from 10–35 seconds after recording started:

| Measurement | Baseline | Updated |
| --- | ---: | ---: |
| Animation callbacks | 1,500 | 0 |
| New animation requests | 1,500 | 0 |
| Safari mean CPU sample | 1.870% | 0.006% |
| Safari mean page-memory sample | 130.79 MB | 122.32 MB |

A separate warm recording started with two orbit drags and then no interaction.
The 10–35 second interval again contained zero callbacks, zero requests and zero
rendering frames. All 50 CPU samples were zero. Its mean page-memory sample was
176.30 MB, reinforcing that memory depends on allocation history and is not a
claimed improvement here.

The strict result is eliminated idle animation work, with later orbit/top-down
interactions still rendering. Do not turn these samples into a battery-life,
memory-saving or general FPS claim. The runs use different origins, resource-cache
histories and prior allocations. Inspector frame spans include elapsed frame time;
they are not isolated CPU work or GPU timer queries. Physical iPhone/iPad testing,
repeated medium/large-home calibration and agreed memory/frame-time budgets remain
open.

## Repeating the measurement

Generate ordinary local import files with `npm run benchmark:fixtures`. In native
Safari, import `small.openplan.json`, open Inspector's Timelines tab and select the
instruments above. Start recording, enter 3D, leave it untouched for at least 35
seconds, then orbit and use Top-Down to verify wakeups. Stop and export the timeline
locally. A separate recording after orbiting can check that damping returns to idle.

Run `node tooling/safari-timeline.mjs recording.json --from 10 --to 35` to produce
a numeric-only summary. The tool never copies network requests, cookies, headers,
project names, screenshots, source URLs or stacks into its output. Raw Inspector
exports stay local because they may contain browser data. Use a continuous
recording and choose a quiet interval with no interactions; do not compare a
paused interval with live execution.

Build preparation is sequential: finish `npm run check` before `npm run build`.
Both invoke SvelteKit generation, so running them concurrently can produce an HTML
bootstrap identifier that differs from its client bundle. Rebuild and restart the
local server if that happens. GitHub CI already runs these steps sequentially.

## Validation and next work

Local validation passes 591 unit tests, production build and type checking with
zero errors and the 23 existing Svelte warnings. The new browser workflow observes
requestAnimationFrame and WebGL at the browser boundary, asserts no idle callbacks
or draws, and verifies orbit/damping, top-down, furniture previews, lighting,
stacking, resize, walkthrough and remount. Existing geometry/history/preview tests
and all six furnished-home benchmarks remain required. The browser suite now has
66 workflows per engine, 198 across Chromium, Firefox and WebKit. See PR checks
for final CI and deployment results.

The first CI pass exposed two test corrections: software rendering needed more
than ten seconds to complete the remaining orbit damping frames, and the active
edit toggle is named Exit Edit Mode. The regression uses a smaller viewport and a
bounded settling wait while retaining the zero-callback requirement.

The full workflow also reproduced a pre-existing desktop hit-target collision:
Keyboard Shortcuts covered the Lighting Controls toggle. The lighting toggle and
panel now align with the unused middle slot between Help and Undo History on
desktop; phone placement stays at the left edge. The ordinary click in this
regression verifies that the control is reachable before changing the night preset.

Walkthrough still integrates a fixed 16 ms step per callback; frame-rate-independent
motion is the next focused follow-up in [#77](https://github.com/laanlabs/openPlan3D/issues/77).
Device calibration, native release and the
migration/billing gates in #30 remain open. This batch adds no Firebase writes,
uploads, new assets, dependencies or production profiling hooks.
