# Native/web area convention baseline

Verified September 13, 2026 with matching runtime geometry: wall centerlines
(0,0), (4,0), (4,3), (0,3) metres; all four walls 0.20 m thick, no openings,
furniture, labels, or nested rooms required for measurement.

| Measurement | Result |
| --- | --- |
| Web `resolveRooms` centerline polygon | 12.00 m² |
| Native `enclosedArea` free interior raster | 10.64 m² |
| Native `detectRooms` area | 10.64 m² |
| Analytical interior `(4−0.2) × (3−0.2)` | 10.64 m² |

The 1.36 m² discrepancy is 11.33% of the centerline area. This example has no
curves, scan noise, boundary ambiguity or raster quantization error; the boundary
convention alone causes the difference. Native raster approximation can add
further error for other geometry.

Evidence: native `testAreaConventionRectangleBaseline` passed in simulator
session `75624`, exit 0, 0.027 seconds; all six web room tests passed in 404 ms.
Logs: `/tmp/native-area-convention-baseline.log` and
`/tmp/web-area-convention-baseline.log`. Matching tests are maintained in native
`FloorPlanTests/PlanRoomSlabsTests.swift` and web `tests/rooms.test.ts`.

These are explicit current-behavior baselines, not the desired final parity gate.
When alignment is implemented, update them to the selected common convention.

## Remaining implementation decisions and work

Use an explicit boundary convention for displayed area and schedules. Interior
usable area is a reasonable default candidate; centerline area remains useful
for structural footprints. Do not silently treat one as the other or change
stored geometry to compensate. Package geometry can remain unchanged while
measurement semantics become explicit.

A complete implementation must align labels, room/total schedules and exports,
then cover unequal wall thickness, concave and nested rooms, shared walls,
curves, floor openings, split/merge identity, and native raster error bounds.
The current fixture proves the mismatch; cross-platform area agreement remains
open. This work does not establish a jurisdiction-specific survey standard.
