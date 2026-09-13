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

## Interior area comparison implemented

Area Summary now displays a separate interior-area total and labels the existing
centerline totals/breakdown explicitly, in English and Portuguese. It subtracts
the union of square-capped wall footprints from room polygons with immediate
nested holes; floor-opening rooms do not contribute. Overlapping walls count
once. Curved walls use the existing 16-span faceting. Door/window openings do
not remove wall floor footprints, consistent with native raster measurement.

The new integration splits horizontal bands at polygon vertices and edge
intersections; within a band scanline width is linear, so midpoint integration
is exact for those polygons. Invalid geometry or work beyond 600 edges / two
million band-edge operations returns unknown and the UI says Unavailable.

Validation: 18 interior-area/room/nesting tests passed (`35410`, 796 ms),
including the native rectangle match (10.64 m²), rotation/translation/winding,
duplicate walls, holes, internal walls, concave rooms and invalid/budgeted input.
Production build passed and all three mobile English/Portuguese browser workflows
passed (`8826`, 20.1 seconds). Logs: `/tmp/web-interior-area-regressions.log`,
`/tmp/web-interior-area-build-final.log`, `/tmp/web-interior-area-browser.log`.
Type check initially passed with zero diagnostics; final type check is recorded
in `/tmp/web-interior-area-check-final.log`.

This adds an explicit comparison; it does not yet migrate room labels, categories,
exports or native raster measurement to one universal convention. Tiny/thin walls,
curves, uneven thickness and raster error across arbitrary native plans still
need cross-platform qualification. No claim of general exact area parity is made.
