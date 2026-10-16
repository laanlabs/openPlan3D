---
name: openplan3d-plan-authoring
description: Create or edit OpenPlan3D floor-plan files for the web editor at app.openplan3d.com. Use when a user wants a floor plan, house layout or room arrangement they can open in OpenPlan3D, when turning a written description or sketch into a plan file, or when editing an exported OpenPlan3D project or a prepared RoomPlan interchange file. Covers both accepted formats (web project JSON in centimetres; prepared RoomPlan JSON in metres), the requirements to confirm before writing (floors, dimensions, wall thickness, ceiling height, openings, furniture), the authoring rules that make rooms detect correctly, the validator's error messages and how to deliver the file.
---

# OpenPlan3D plan authoring

Everything below is derived from the editor's own validators and importers (`readProject`, `validateRoomPlan`,
`createProjectFromRoomPlan`, `resolveRooms`). Where this text and the code differ, the code wins.

## 1. The two accepted formats

| | Web project JSON | Prepared RoomPlan JSON (interchange) |
| --- | --- | --- |
| Produced by | Export → Download JSON (`<name>.openplan.json`) | Export → Download interchange JSON (`<Project-Name>-openplan3d.json`) and the Open in OpenLandscape3D / OpenKitchen3D / OpenCatio3D links; iPhone app Export Editable Plan (JSON) / Open in OpenPlan3D; what those three planners read and write |
| Units | centimetres, plan x/y | metres, 4×4 column-major transforms; RoomPlan X → plan x, RoomPlan Z → plan y |
| Shape | `floors[]`, each with `walls`, `doors`, `windows`, `furniture`, `rooms`, `stairs`, `columns`, `textAnnotations`, `annotations`, `measurements` | flat `walls`, `doors`, `windows`, `openings`, `objects`, `sections`, `stories`; a `story` index per element |
| Imported by | Export → Import JSON; Welcome screen Import | Export → Import JSON, Build → Import RoomPlan, `POST https://app.openplan3d.com/api/handoffs` |
| Validated by | `readProject` (`src/lib/utils/projectValidation.ts`) | `validateRoomPlan` then `createProjectFromRoomPlan` (`src/lib/utils/roomplanValidation.ts`, `roomplanImport.ts`) |
| Use it when | you want the full editor model: stairs, columns, annotations, textures, floor elevations, notes | geometry + openings + furniture + room labels is enough, or the file must also suit the native apps or the handoff link service |

Import JSON tells them apart with `isRoomPlanJson`: a file is RoomPlan when it has `openplanPrepared: true`, an
`openplanHandoffVersion`, or any wall carrying a `dimensions` array; everything else goes through `readProject`.
Import JSON and Build → Import RoomPlan also accept a raw RoomPlan ZIP that contains exactly one `room.json`.

OpenKitchen3D, OpenLandscape3D and OpenCatio3D each add one top-level block named after themselves (`openkitchen3d`,
`openlandscape3d`, `opencatio3d`) plus per-object `attributes`, `defaults` and `planNotes`. OpenPlan3D does not read
the block: it keeps it on `project.interchange` and re-emits it verbatim from Export → Download interchange JSON, so
when editing such a file leave the block and the attributes untouched and change only the shared geometry.

## 2. Coordinates, units, floors

- Web coordinates are centimetres. x grows to the right, y grows **downwards** on the 2D canvas; put the origin at the
  top-left corner. Wall `start`/`end` are the wall **centreline**; `thickness` is split evenly to both sides. Heights
  are centimetres above the floor surface.
- The interchange is metres; the importer multiplies by 100 and keeps fractional centimetres (eight decimals). There is
  no imperial file format: convert feet and inches before writing (1 ft = 30.48 cm) and say that you did.
- Floors: `level` is an integer (0 ground, 1 first floor, −1 basement). `elevation` (cm above ground) is optional and
  defaults to `level × 300`; `slabThickness` defaults to 5. Floor names default to `Ground Floor` / `Floor n`. If
  `activeFloorId` names no floor, the first floor is used. Each floor has its own element arrays; a door or window can
  only reference a wall on its own floor.

## 3. Web project JSON reference (`readProject`)

Top level: `id` (nonempty text, required), `name` (default `Untitled Project`), `description?`, `floors` (at least
one), `activeFloorId`, `createdAt`/`updatedAt` (ISO strings, optional). Unknown keys are preserved. Every element `id`
must be nonempty text and unique **within its floor across all kinds** (a door and a wall may not share an id); floor
ids must be unique in the project. Every number must be finite. Missing element arrays default to `[]`, except
`walls`, which must be present.

| Record | Required | Defaults applied | Constraints |
| --- | --- | --- | --- |
| `walls[]` | `id`, `start{x,y}`, `end{x,y}`, `thickness` | `height` = max(`startHeight` ?? 280, `endHeight` ?? 280), `color` `#444444` | `thickness` > 0; `height`, `startHeight`, `endHeight` ≥ 0; optional `curvePoint{x,y}` (quadratic bezier control), `texture`, `interiorColor`, `exteriorColor`, `interiorTexture`, `exteriorTexture` text |
| `doors[]` | `id`, `wallId`, `position`, `width` | `height` 210, `type` `single`, `swingDirection` `left`, `flipSide` false | `wallId` must exist on the same floor; `position` 0–1 along the wall from `start`; `width`, `height` > 0; `type` ∈ single, double, sliding, french, pocket, bifold, opening, garage; `swingDirection` ∈ left, right; `flipSide` boolean |
| `windows[]` | `id`, `wallId`, `position`, `width` | `height` 120, `type` `standard`, `sillHeight` 90 | same wall and position rules; `sillHeight` ≥ 0; `type` ∈ standard, fixed, casement, sliding, bay |
| `furniture[]` | `id`, `catalogId`, `position{x,y}` (footprint centre) | `rotation` 0, `scale` `{x:1,y:1,z:1}` | `width`/`depth`/`height` overrides > 0 (cm); negative `scale` mirrors; `catalogId` is not checked against the catalog, an unknown id draws a 50×50×50 "Unknown furniture" box; `sourceCategory`, `color`, `material` text; `locked` boolean |
| `rooms[]` | `id`, `walls` (array of wall ids) | `name` "", `floorTexture` `light-oak`, `area` 0 | metadata keyed by wall set, see §5; `roomType` text (`indoor`, `outdoor`, `garage`, `utility`); `color` text; `labelOffset{x,y}`; `floorOpening` boolean; `area` ≥ 0 and recomputed by the editor |
| `stairs[]` | `id`, `position`, `width`, `depth`, `riserCount` | `rotation` 0, `stairType` `straight`, `direction` `up` | `width`, `depth` > 0; `riserCount` positive integer; `stairType` ∈ straight, l-shaped, u-shaped, spiral; typical 100 × 300 cm, 14 risers |
| `columns[]` | `id`, `position`, `diameter`, `height`, `shape` | `rotation` 0, `color` `#cccccc` | `diameter` > 0; `height` ≥ 0; `shape` ∈ round, square (no default) |
| `textAnnotations[]` | `id`, `x`, `y`, `text` | `fontSize` 16, `color` `#1e293b`, `rotation` 0 | `fontSize` > 0 |
| `annotations[]` (dimension lines) | `id`, `x1`, `y1`, `x2`, `y2` | `offset` 40 | optional `label` text |
| `measurements[]` | `id`, `x1`, `y1`, `x2`, `y2` | | |
| `guides[]`, `groups[]`, `entourage[]`, `backgroundImage` | see `src/lib/models/types.ts` | | omit unless needed |

Optional `details` objects are validated separately (`Invalid item details. Check notes, costs, room metadata and photo
references.`): walls take `note` and `material` (wood, brick, stone, drywall, concrete, glass); doors and windows
`price` ≥ 0; furniture `note`, `price`, `photos`; rooms `note`, `photos`, `roomType` (livingRoom, bedroom, kitchen,
bathroom, diningRoom, laundryRoom, office, hallway, garage, closet, pantry, entryway) and `ceilingHeight` in cm.
Floor textures: `none`, `light-oak`, `walnut`, `bamboo`, `laminate`, `ceramic-white`, `ceramic-gray`, `porcelain`,
`marble-white`, `marble-dark`, `carpet-beige`, `carpet-gray`, `concrete`, `slate`, `vinyl` (legacy `hardwood`, `tile`,
`carpet`, `marble` still render).

### Door swing and furniture rotation

`swingDirection` picks the hinge jamb: `left` = the jamb nearer the wall's `end`, `right` = the jamb nearer `start`.
`flipSide` picks the side of the wall the leaf swings to: with wall direction `(dx, dy) = end − start`, `false` swings
towards the normal `(-dy, dx)` and `true` towards `(dy, -dx)`. Example: the top wall of a room drawn left to right,
`(0,0)→(800,0)`, has normal `(0, 800)`, which points down into the room, so `flipSide: false` opens into it; the same
wall drawn right to left needs `flipSide: true`. `opening` is a leafless passage; `sliding`, `pocket` and `bifold`
draw no swing arc. Furniture `rotation` is in degrees: 0 puts `width` along +x and `depth` along +y, positive
angles turn clockwise on screen. `position` is the centre of the footprint.

## 4. Prepared RoomPlan JSON reference (`validateRoomPlan`, `createProjectFromRoomPlan`)

Top level: `openplanPrepared: true`, `openplanHandoffVersion: 1` (the only accepted version), `walls` (array, required
even when empty), optional `doors`, `windows`, `openings`, `objects`, `sections`, `stories`, `openplanImportOptions`.
Other Apple keys (`version`, `floors`) are ignored; `defaults`, `planNotes`, object `attributes` and a sibling block
are retained for re-export (§1) but never change the imported geometry.

- Every entry of `walls`, `doors`, `windows`, `openings` and `objects` needs a nonempty `identifier` that is unique
  across all five lists (it becomes the web id), `dimensions: [width, height, depth]` in metres (width and height > 0,
  depth ≥ 0, objects need depth > 0) and `transform`: exactly 16 finite numbers, column-major, translation at indices
  12–14, and a nonzero ground direction `(transform[0], transform[2])`. `story` is an optional integer, default 0.
- Walls: centre = translation (x, z); direction = `(t[0], t[2])` normalised; length = `dimensions[0]`;
  `start = centre - dir*len/2`, `end = centre + dir*len/2`. Height = `dimensions[1]`; thickness = `dimensions[2]`
  (0 → 15 cm). For a wall from `(x1,z1)` to `(x2,z2)` with unit direction `(dx,dz)` write
  `transform = [dx,0,dz,0, 0,1,0,0, -dz,0,dx,0, cx,h/2,cz,1]`.
- Doors, windows, openings: `parentIdentifier` must name a wall on the same `story`; the web `position` is the
  translation projected onto that wall (clamped to 0–1). Door `style` ∈ single, double, sliding, patio (patio → web
  sliding); without `style` the `category` decides (`door` → single, `doubleDoor`/`french` → double, `slidingDoor` →
  sliding, `foldingDoor` → bifold). Entries in `openings` become `type: "opening"`; give them no `style`.
  `hingeLeft: true` → `swingDirection: "right"` (hinge at the wall-start jamb), `false` → `"left"`, omitted → `right`
  in prepared files. `opensInward: true` → `flipSide: false`, `false` → `flipSide: true`, omitted → `false`.
- Windows: `style` ∈ fixed, sliding; omitted → `standard` (`slidingWindow` → sliding, `bayWindow` → bay by category).
  `sillHeight` in metres (≥ 0) is used as written; when absent it is derived from the window's and wall's vertical
  transforms, so always write it.
- Objects: `dimensions = [width, height, depth]` become the web `width`, `height`, `depth` overrides in cm; position =
  translation (x, z); `rotation = atan2(t[2], t[0])` in degrees; a mirrored ground-plane transform sets `scale.y = -1`.
  `category` is a string or `{ "name": {} }`. A web catalog id is used as is; Apple names map (`bed` → `bed_queen` when
  width > 140 cm else `bed_twin`, `refrigerator` → `fridge`, `sink` → `sink_b`, `washerDryer` → `washer_dryer`, and
  `sofa`, `chair`, `table`, `storage`, `stove`, `oven`, `dishwasher`, `toilet`, `bathtub`, `fireplace`, `television`,
  `stairs` are catalog ids already); anything else becomes `imported_object` with the name kept in `sourceCategory`.
- Sections are room labels: `{ "center": [x, y, z], "label": "livingRoom", "displayName": "Living Room",
  "color": "#aaccdd", "story": 0 }`. Each section claims the detected room whose polygon contains `(x, z)`, else the
  nearest unclaimed room, and becomes one room record named `displayName` or the mapped label (livingRoom → Living
  Room, diningRoom → Dining Room, laundryRoom → Laundry, entryway → Entryway …). A section that matches no room keeps
  its name with an empty wall list.
- Stories: `[{ "index": 0, "name": "Ground Floor" }]`. Every distinct `story` used by an element, plus every listed
  story, becomes a floor with `level` = index (gaps, negatives and empty floors are kept). The project opens on
  level 0. Unnamed levels get `Ground Floor`, `Floor n`, `Basement`, `Basement n`.
- `openplanPrepared: true` turns off automatic wall straightening and 15 cm corner merging; keep it set and write exact
  coordinates. `openplanImportOptions: { "straighten": bool, "orthogonal": bool }` overrides that choice.
- Not carried by this format: wall colours and textures, stairs, columns, annotations, notes, prices, photos.

## 5. How rooms are detected

Rooms are never drawn directly; the editor **detects closed loops of wall centrelines** on every render and export
(`src/lib/utils/roomDetection.ts`):

- Two walls connect where endpoints coincide (the matcher tolerates under 5 cm; write identical coordinates anyway).
  A wall whose endpoint lands on the interior of another wall, more than 5 cm from that wall's ends, is a T-junction:
  the long wall is split there automatically. Crossing walls are split at the crossing. You may instead split the long
  wall yourself into collinear pieces that share the junction point; both are detected.
- Each minimal enclosed face becomes a room whose `walls` lists the ids of every wall touching the loop (a split wall
  contributes its original id), with `area` in m² of the centreline polygon (two decimals; immediately nested rooms
  are subtracted) and the name `Room n`. Faces under 0.1 m² and the outside face are ignored; there is no maximum size.
- Saved `rooms[]` records are **metadata keyed by wall-id set**: a detected loop takes the record whose `walls`
  contains the same ids (order irrelevant) and shows its `name`, `floorTexture`, `color`, `roomType`, `labelOffset`,
  `details` and `floorOpening`. A record that matches no loop stays in the file but shows nothing; two records with
  the same set cancel each other. Write one record per room with exactly the ids that bound it, and update the set
  whenever you move a partition.
- The plan label shows the centreline area; the Area Summary also reports an interior area without wall footprints.
  A 4 × 3 m room drawn centreline to centreline with 20 cm walls reads 12.00 m² (10.64 m² interior).

## 6. Furniture catalog ids (default W×D×H in cm)

The full list is `src/lib/utils/furnitureCatalog.ts` (`furnitureCatalog` plus the `imported_object` and `stairs`
import previews). `tests/skill-examples.test.ts` checks the rows between the markers: every backticked token must be
a catalog id and a following `W×D×H` must equal the catalog's default size.

<!-- catalog-ids:start -->
| Category | Ids |
| --- | --- |
| Living Room | `sofa` 200×90×80, `loveseat` 140×85×80, `chair` 80×80×90, `coffee_table` 120×60×45, `tv_stand` 150×45×50, `bookshelf` 80×30×180, `side_table` 50×50×55, `fireplace` 120×40×120, `television` 120×8×70, `storage` 100×50×120, `table` 100×60×75 |
| Bedroom | `bed_queen` 200×150×50, `bed_twin` 190×100×50, `nightstand` 50×40×55, `dresser` 120×50×80, `wardrobe` 120×60×200 |
| Kitchen | `stove` 60×60×85, `fridge` 70×70×180, `sink_k` 60×45×85, `counter` 120×60×85, `dishwasher` 60×60×85, `oven` 60×60×85 |
| Bathroom | `toilet` 40×65×40, `bathtub` 170×75×60, `shower` 90×90×210, `sink_b` 60×45×85, `washer_dryer` 60×65×85 |
| Office, Dining | `desk` 140×70×75, `office_chair` 45×45×90, `dining_table` 120×80×75, `dining_chair` 45×45×90 |
| Decor | `rug` 200×300×1, `round_rug` 200×200×1, `runner_rug` 80×250×1, `potted_plant` 40×40×60, `floor_plant` 50×50×120, `curtain` 120×10×260, `wall_art` 80×5×60, `mirror` 60×5×90 |
| Lighting | `ceiling_light` 40×40×15, `chandelier` 60×60×50, `floor_lamp` 40×40×160, `table_lamp` 25×25×45, `pendant_light` 30×30×30, `wall_sconce` 15×10×20 |
| Outdoor Furniture | `patio_table` 120×120×75, `patio_chair` 55×55×85, `bench_outdoor` 150×50×80, `lounger` 70×190×35, `umbrella` 200×200×230, `bbq_grill` 80×50×100, `fire_pit` 90×90×40, `picnic_table` 180×140×75 |
| Landscaping | `tree_oak` 300×300×500, `tree_default` 250×250×450, `tree_pine` 150×150×500, `tree_palm` 200×200×500, `tree_small` 120×120×250, `bush` 80×80×60, `bush_large` 120×120×90, `hedge_row` 200×60×120, `flower_bed` 100×40×20, `rock_large` 100×80×60, `boulder` 150×120×100 |
| Fencing | `fence_simple` 200×10×100, `fence_planks` 200×10×120, `fence_gate` 100×10×100, `picket_fence` 200×10×90, `metal_fence` 200×10×120 |
| Structures | `pergola` 300×300×250, `deck_patio` 400×300×15, `raised_garden_bed` 120×60×40, `shed` 200×250×230, `gazebo` 300×300×280, `planter_box` 80×30×30 |
| Pool & Spa | `pool_rectangular` 500×300×15, `pool_round` 300×300×15, `pool_lshaped` 600×400×15, `pool_kidney` 500×280×15, `hot_tub` 200×200×80 |
| Garage | `car_sedan` 180×450×150, `car_suv` 190×480×170, `garage_door_single` 280×10×220, `garage_door_double` 500×10×220, `workbench` 180×60×90 |
| Paths & Lawns | `lawn_rect` 400×300×3, `lawn_large` 600×400×3, `path_straight` 100×300×3, `patio_stone` 300×300×5, `driveway` 300×600×3 |
| Outdoor Lighting, Garden Structures | `lamp_post` 30×30×300, `bollard_light` 15×15×80, `string_lights` 300×10×250, `greenhouse` 300×400×250, `trellis` 150×10×200, `arbor` 150×60×230, `fountain` 120×120×150, `mailbox` 30×20×110 |
| 2D symbols (no 3D body) | `sym_outlet`, `sym_switch`, `sym_ceiling_light`, `sym_smoke`, `sym_water_supply`, `sym_drain`, `sym_water_heater` |
| Import previews | `imported_object` 50×50×50 (unknown category; keep its name in sourceCategory), `stairs` 90×300×200 |
<!-- catalog-ids:end -->

## 7. Requirements checklist: confirm before writing

Ask for anything the request leaves out; do not silently invent 1, 3 or 6.
1. **Floors**: how many, their names, which one has the entrance, whether each needs a drawn plan.
2. **Units** of the brief (metric or feet and inches). The file is always metric; convert and say so.
3. **Overall footprint** (outer dimensions, or every room's interior dimensions) and whether sizes are interior or
   centreline (interior + one wall thickness = centreline for a room between two walls of that thickness).
4. **Wall thickness**: assume exterior 20 cm and interior 12 cm unless told otherwise, and state the assumption.
5. **Ceiling / wall height** per floor: 270 cm is a reasonable modern default (the editor's own default is 280).
6. **Doors and windows**: for each door its wall, distance along the wall, width (80–90 cm interior, 90–100 cm entry),
   type, hinge jamb and the room it swings into; for each window its wall, position, width, height (default 120) and
   sill (default 90).
7. **Furniture wishes** per room, and areas that must stay clear.
8. **Orientation**: which wall faces the street or north; where the entrance is; whether the plan is viewed from above
   with north up (y grows downwards, so the wall at y = 0 is the top edge of the drawing).
9. Room names and uses, stairs between floors, columns, floor openings, anything structural.
Reasonable defaults for 4, 5, 7 and 8 may be assumed once stated; floors, dimensions and openings must be asked.

## 8. Authoring workflow

1. Draw the exterior loop first, in cm, clockwise from the top-left corner: `(0,0)→(W,0)→(W,D)→(0,D)→(0,0)`. Write each
   corner once and reuse the identical numbers in the adjoining wall.
2. Add interior partitions. Each endpoint either equals an existing endpoint or sits on another wall's centreline
   (T-junction, more than 5 cm from that wall's ends). No gaps, no overshoots: a partition ending 10 cm short of a wall
   splits nothing, and the editor shows one large room instead of two. Keep partitions axis-aligned unless the brief asks for angles.
3. Give every element a short, stable, unique id (`w-north`, `d-entry`, `win-kitchen-1`) and keep it across edits;
   never reuse an id for another kind on the same floor.
4. Doors: set `position` as the fraction along the wall from `start`; keep the door centre at least `width/2 + 10 cm`
   from both wall ends and clear of other openings. Pick `swingDirection` and `flipSide` with the rule in §3 so doors
   open into the room they serve; entry doors open inwards.
5. Windows: same positioning; `sillHeight` 90 and `height` 120 unless told; keep `sillHeight + height` below the wall
   height.
6. Furniture: `position` is the footprint centre. Keep 60–90 cm walkways, the full door width clear in front of each
   door (the swing radius equals the width), and 60 cm beside beds. Rely on catalog sizes; set `width`/`depth` only
   when the brief gives them. Use `imported_object` with `sourceCategory` for things the catalog lacks.
7. Write one `rooms[]` record per room with its wall-id set, `name`, `floorTexture` and `roomType`.
8. Verify by importing (Export → Import JSON). Every room must show a fill, a name and an area; a missing label means an
   open loop or a wrong wall set. Compare areas with the brief, fix the JSON, import again. Export → Download JSON
   returns the editor's copy (same shape, with any defaults filled in) for further edits.
9. Multi-floor plans: repeat the exterior loop with identical coordinates on each floor so the storeys stack; give
   each floor its `level`, and `elevation` when storey heights differ from 300 cm.

## 9. Examples

Two rooms (Living Room 4.8 × 5 m, Bedroom 3.2 × 5 m centreline) sharing a partition with a door, an entry door, two
windows and three furniture pieces. Both files describe the same plan; the test suite imports both and checks that
they produce the same walls, openings, furniture and named rooms (24 m² and 16 m²).

<!-- example:examples/two-room-web-project.json -->
```json
{
  "id": "two-room-demo",
  "name": "Two-room demo",
  "activeFloorId": "ground",
  "createdAt": "2026-10-15T00:00:00.000Z",
  "updatedAt": "2026-10-15T00:00:00.000Z",
  "floors": [
    {
      "id": "ground", "name": "Ground Floor", "level": 0, "elevation": 0,
      "walls": [
        { "id": "w-north", "start": { "x": 0, "y": 0 }, "end": { "x": 800, "y": 0 }, "thickness": 20, "height": 270, "color": "#444444" },
        { "id": "w-east", "start": { "x": 800, "y": 0 }, "end": { "x": 800, "y": 500 }, "thickness": 20, "height": 270, "color": "#444444" },
        { "id": "w-south", "start": { "x": 800, "y": 500 }, "end": { "x": 0, "y": 500 }, "thickness": 20, "height": 270, "color": "#444444" },
        { "id": "w-west", "start": { "x": 0, "y": 500 }, "end": { "x": 0, "y": 0 }, "thickness": 20, "height": 270, "color": "#444444" },
        { "id": "w-partition", "start": { "x": 480, "y": 0 }, "end": { "x": 480, "y": 500 }, "thickness": 12, "height": 270, "color": "#444444" }
      ],
      "doors": [
        { "id": "d-entry", "wallId": "w-south", "position": 0.75, "width": 90, "height": 210, "type": "single", "swingDirection": "left", "flipSide": false },
        { "id": "d-bedroom", "wallId": "w-partition", "position": 0.8, "width": 80, "height": 210, "type": "single", "swingDirection": "right", "flipSide": true }
      ],
      "windows": [
        { "id": "win-living", "wallId": "w-north", "position": 0.3, "width": 150, "height": 120, "sillHeight": 90, "type": "sliding" },
        { "id": "win-bedroom", "wallId": "w-east", "position": 0.5, "width": 120, "height": 120, "sillHeight": 90, "type": "standard" }
      ],
      "furniture": [
        { "id": "f-sofa", "catalogId": "sofa", "position": { "x": 240, "y": 120 }, "rotation": 0, "scale": { "x": 1, "y": 1, "z": 1 } },
        { "id": "f-coffee-table", "catalogId": "coffee_table", "position": { "x": 240, "y": 260 }, "rotation": 0, "scale": { "x": 1, "y": 1, "z": 1 } },
        { "id": "f-bed", "catalogId": "bed_queen", "position": { "x": 640, "y": 170 }, "rotation": 90, "scale": { "x": 1, "y": 1, "z": 1 } }
      ],
      "rooms": [
        { "id": "r-living", "name": "Living Room", "walls": ["w-north", "w-west", "w-south", "w-partition"], "floorTexture": "light-oak", "area": 24, "roomType": "indoor" },
        { "id": "r-bedroom", "name": "Bedroom", "walls": ["w-north", "w-east", "w-south", "w-partition"], "floorTexture": "carpet-beige", "area": 16, "roomType": "indoor" }
      ],
      "stairs": [], "columns": [], "guides": [], "measurements": [], "annotations": [], "textAnnotations": [], "groups": []
    }
  ]
}
```

<!-- example:examples/two-room-interchange.openplan3d.json -->
```json
{
  "openplanPrepared": true,
  "openplanHandoffVersion": 1,
  "stories": [{ "index": 0, "name": "Ground Floor" }],
  "walls": [
    { "identifier": "w-north", "story": 0, "category": { "wall": {} }, "dimensions": [8, 2.7, 0.2],
      "transform": [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 4, 1.35, 0, 1] },
    { "identifier": "w-east", "story": 0, "category": { "wall": {} }, "dimensions": [5, 2.7, 0.2],
      "transform": [0, 0, 1, 0, 0, 1, 0, 0, -1, 0, 0, 0, 8, 1.35, 2.5, 1] },
    { "identifier": "w-south", "story": 0, "category": { "wall": {} }, "dimensions": [8, 2.7, 0.2],
      "transform": [-1, 0, 0, 0, 0, 1, 0, 0, 0, 0, -1, 0, 4, 1.35, 5, 1] },
    { "identifier": "w-west", "story": 0, "category": { "wall": {} }, "dimensions": [5, 2.7, 0.2],
      "transform": [0, 0, -1, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 1.35, 2.5, 1] },
    { "identifier": "w-partition", "story": 0, "category": { "wall": {} }, "dimensions": [5, 2.7, 0.12],
      "transform": [0, 0, 1, 0, 0, 1, 0, 0, -1, 0, 0, 0, 4.8, 1.35, 2.5, 1] }
  ],
  "doors": [
    { "identifier": "d-entry", "parentIdentifier": "w-south", "story": 0, "category": { "door": {} },
      "style": "single", "hingeLeft": false, "opensInward": true, "dimensions": [0.9, 2.1, 0.2],
      "transform": [-1, 0, 0, 0, 0, 1, 0, 0, 0, 0, -1, 0, 2, 1.05, 5, 1] },
    { "identifier": "d-bedroom", "parentIdentifier": "w-partition", "story": 0, "category": { "door": {} },
      "style": "single", "hingeLeft": true, "opensInward": false, "dimensions": [0.8, 2.1, 0.12],
      "transform": [0, 0, 1, 0, 0, 1, 0, 0, -1, 0, 0, 0, 4.8, 1.05, 4, 1] }
  ],
  "windows": [
    { "identifier": "win-living", "parentIdentifier": "w-north", "story": 0, "category": { "window": {} },
      "style": "sliding", "sillHeight": 0.9, "dimensions": [1.5, 1.2, 0.2],
      "transform": [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 2.4, 1.5, 0, 1] },
    { "identifier": "win-bedroom", "parentIdentifier": "w-east", "story": 0, "category": { "window": {} },
      "sillHeight": 0.9, "dimensions": [1.2, 1.2, 0.2],
      "transform": [0, 0, 1, 0, 0, 1, 0, 0, -1, 0, 0, 0, 8, 1.5, 2.5, 1] }
  ],
  "openings": [],
  "objects": [
    { "identifier": "f-sofa", "story": 0, "category": { "sofa": {} }, "dimensions": [2, 0.8, 0.9],
      "transform": [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 2.4, 0.4, 1.2, 1] },
    { "identifier": "f-coffee-table", "story": 0, "category": { "coffee_table": {} }, "dimensions": [1.2, 0.45, 0.6],
      "transform": [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 2.4, 0.225, 2.6, 1] },
    { "identifier": "f-bed", "story": 0, "category": { "bed": {} }, "dimensions": [2, 0.5, 1.5],
      "transform": [0, 0, 1, 0, 0, 1, 0, 0, -1, 0, 0, 0, 6.4, 0.25, 1.7, 1] }
  ],
  "sections": [
    { "label": "livingRoom", "displayName": "Living Room", "story": 0, "center": [2.4, 0, 2.5] },
    { "label": "bedroom", "displayName": "Bedroom", "story": 0, "center": [6.4, 0, 2.5] }
  ]
}
```

## 10. Common mistakes and what the validator says

Web files fail as `Invalid project: <path> <reason>.`; the Import dialog appends `No project was imported.` and the
current plan stays open. RoomPlan files fail as `Invalid RoomPlan file: <path> <reason>. No project was imported.`
Paths are JSON paths such as `floors[0].doors[1].wallId` or `doors[1].parentIdentifier`.

| Mistake | Message or symptom |
| --- | --- |
| Door or window on a wall from another floor, or a typo in `wallId` | `Invalid project: floors[0].doors[1].wallId must refer to a wall on the same floor.` |
| Same id used twice on a floor (even across kinds) | `Invalid project: floors[0].doors[0].id duplicates another element on this floor.` |
| `position` outside 0–1, NaN or missing | `Invalid project: floors[0].windows[0].position must be a finite number in range.` |
| Zero or negative `thickness`, `width`, `height`, `fontSize`, `diameter` | `Invalid project: floors[0].walls[0].thickness must be greater than zero.` |
| Unsupported enum (`type: "casement"` on a door, `shape` missing) | `Invalid project: floors[0].doors[0].type has an unsupported value.` |
| Missing `walls` array, `floors: []`, missing project `id` | `… floors[0].walls must be an array.`, `… floors must contain at least one floor.`, `… id must be nonempty text.` |
| Bad `details` (unknown `roomType`, negative price) | `Invalid item details. Check notes, costs, room metadata and photo references.` |
| Corners that do not meet, partitions short of the wall, duplicate wall sets | no error: the room has no fill, label or area, or a saved name does not appear |
| Metres written into the web format | an 8 × 5 "cm" house: walls under 0.1 m² are not rooms; everything looks like a dot |
| Interchange: `parentIdentifier` on another story or unknown | `Invalid RoomPlan file: doors[0].parentIdentifier must refer to a wall on the same floor. No project was imported.` |
| Interchange: repeated identifier anywhere in the five lists | `Invalid RoomPlan file: walls[1] has a duplicate identifier. No project was imported.` |
| Interchange: transform with 15 numbers, NaN, or zero ground direction | `Invalid RoomPlan file: walls[0].transform must be a finite 4×4 transform with a horizontal direction. No project was imported.` |
| Interchange: web type names (`casement`, `french`) in `style` | `Invalid RoomPlan file: windows[0].style is not supported for this opening. No project was imported.` |
| Interchange: `openplanHandoffVersion: 2` | `Invalid RoomPlan file: openplanHandoffVersion is not supported by this version of the editor. No project was imported.` |
| Interchange: centimetre numbers in `dimensions` | valid file: 800 m walls, 20 m thick, running hundreds of metres past every corner |
| Unknown `catalogId` such as `couch` | accepted, drawn as a 50×50×50 "Unknown furniture" box; use `sofa` or `imported_object` + `sourceCategory` |

## 11. Delivering the file

Save the web format as `<plan name>.openplan.json` (the editor's own naming) or any `.json`; the interchange as any
`.json`. The user opens https://app.openplan3d.com, Export → Import JSON (or Import on the Welcome screen), picks the
file, and the plan becomes a new local project (a RoomPlan file is named after the file, unless it carries an
`openkitchen3d` / `openlandscape3d` / `opencatio3d` block whose `name` becomes the title; a web file keeps its `name`,
and a clashing `id` gets a fresh one). Nothing is uploaded by a file import.

For a link instead of a file, `POST https://app.openplan3d.com/api/handoffs` with `Content-Type: application/json`
and the **interchange** JSON as the body (the web format is refused with 422; at most 1 MiB). A `201 { "code",
"reuseUntil" }` reply gives `https://app.openplan3d.com/editor?import=CODE`, which imports the capture as
`Room Capture CODE` (or as the sibling block's `name` when there is one). Captures expire after about a day, daily
quotas apply, and a 503 means sharing is disabled:
fall back to the file. This is the service behind the iPhone app's Open in OpenPlan3D link.

Reading an existing plan: when a user has chosen **Share with Assistant** (web Export menu or the iPhone, iPad or Mac
app) they hold an eight-character code and a secret; the OpenPlan3D connector at `https://app.openplan3d.com/mcp`
(`docs/assistant-shares.md`) offers read-only tools (`summarize_share`, `review_share_photos`, `handoff_share`,
`list_share_files`) that return floors, rooms with areas, openings, furniture, notes and photo coverage for seven
days. Use it to understand a plan before editing it; it cannot push a file into the editor, so deliver edits as above.
