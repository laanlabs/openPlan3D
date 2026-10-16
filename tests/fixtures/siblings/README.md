# Sibling planner fixtures

Prepared RoomPlan JSON files written by the sibling planners, copied unchanged on
2026-10-15 from their own test fixtures (all laanlabs repositories, synthetic data,
no personal information). `tests/sibling-interchange.test.ts` imports each one with
the real importer, checks the retained sibling block and object attributes, exports
the project back with `projectToPreparedRoomPlan` and imports that export again.

| File | Source | Exercises |
| --- | --- | --- |
| `ios-sample-kitchen.openplan3d.json` | `openkitchen3d-cloud/tests/fixtures/ios/` (Swift exporter, `producer: ios`) | Six scanned walls forming a room, a door and window, existing fixtures (`fridge`, `sink_k`, …) beside proposed cabinets (`base_cabinet`, `wall_cabinet`, `tall_cabinet`, `island`, `range_hood` → `imported_object`), `openkitchen3dRole`/`sku` attributes, `sections[0].displayName`, `defaults.ceilingHeight: 2.5` |
| `roundtrip-web-na-u-kitchen.openplan3d.json` | `openkitchen3d-cloud/tests/fixtures/ios/` (web → iOS → file) | North America U-kitchen with sixteen cabinets, a `web` sub-block iOS stored verbatim |
| `web-all-rules.openplan3d.json` | `openlandscape3d-cloud/tests/fixtures/web/` (TS exporter, `producer: web`) | House walls with four windows and a door, plants (`bush_large`, `tree_default`, `flower_red`, `grass_large`), a `deck_patio` area, a `shed`, `openlandscape3dKind`/`plantId` attributes, a `livingRoom` section named `House` |
| `roundtrip-web-all-rules.openplan3d.json` | `openlandscape3d-cloud/tests/fixtures/ios/` (web → iOS → file) | The same site after an iOS round trip: key-sorted, full-precision numbers |
| `sample-lean-to-window.openplan3d.json` | `opencatio3d-cloud/tests/fixtures/web/` | One house wall (centre line shifted indoors), a single door and a window with `sillHeight`, a lean-to catio as a `greenhouse` object with `opencatio3dKind`/`structureId` attributes, no sections |
| `tunnel-default.openplan3d.json` | `opencatio3d-cloud/tests/fixtures/web/` | A tunnel written as one `greenhouse_small` object per path segment (`segment` attribute), rotated 90° |

Regenerate from the sibling repositories' fixture scripts when their exporters change on
purpose: `openkitchen3d-ios/scripts/verify-openplan-import.sh`,
`openlandscape3d-cloud/tests/openplan.test.ts` / `openlandscape3d-ios/scripts/verify-web-interop.sh`,
and `opencatio3d-cloud/tests/` (parity fixtures in `tests/fixtures/web/`). Keep file names
unchanged; the test lists them explicitly with the block each must carry.
