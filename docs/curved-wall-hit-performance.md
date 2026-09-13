# Curved-wall hit-testing measurement

September 11, 2026. Local arm64 Mac, Node v24.19.0.

The continuous curve projection introduced in `38174b2` solved distances for every
curved wall examined by a pointer lookup. A conservative bounds check now rejects
points outside the rectangle containing the endpoints and control point, expanded
by the hit radius. A quadratic curve lies inside that rectangle, so nearby
candidates still receive the same exact-path projection and hit test.

The synthetic benchmark uses grids of 40 or 400 curved walls, measuring an empty
point and a point on the last wall. Each case checks the returned wall, warms up
with 100 calls, then records 50 batches of 20 calls. Values below are medians of
the batch-average milliseconds per lookup; they exclude drawing and browser events.

| Walls | Pointer | Before (ms) | After (ms) |
| --- | --- | ---: | ---: |
| 40 | Empty space | 0.06583 | 0.00088 |
| 40 | Last wall | 0.05137 | 0.00398 |
| 400 | Empty space | 0.74279 | 0.00245 |
| 400 | Last wall | 0.75350 | 0.00594 |

These are local samples, not release performance budgets or end-to-end frame
rates. Overlapping curve bounds will reject fewer candidates. Physical phone
input, drawing cost, memory and battery remain unmeasured by this benchmark.

Run from the web repository:

```sh
OPENPLAN_BENCHMARK_OUTPUT=/tmp/wall-hit npx vitest bench tests/benchmarks/wall-hit.bench.ts --run
```

The optional output prefix writes one JSON file per case, including median/p95
batch-average timings and runtime architecture. Original samples are in
`/tmp/wall-hit-before-*.json` and `/tmp/wall-hit-after-*.json` on the measurement host.

Validation: all 983 unit tests pass (3.68 seconds), check/build pass with zero Svelte
diagnostics, and 21 browser cases pass across Chromium, Firefox and WebKit
(1.4 minutes). These cover curved opening click/drop, automatic dimension framing
and canvas idle/wakeup behavior. The idle run exposed duplicate Dimensions
checkbox labels; the automatic control now has a distinct EN/PT label.
Browser log: `/tmp/web-curve-hit-bounds-browser.log`.
