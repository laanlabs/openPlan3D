# iPhone → web geometry handoff, version 1

The iPhone app's **Export Editable Plan (JSON)** and **Open in OpenPlan3D** use the
same geometry payload. Local JSON exchange needs no Firebase upload. Import it
using the web toolbar's **Export → Import JSON** or **Build → Import RoomPlan**.

Since October 15, 2026 the web editor also writes this format (**Export →
Download interchange JSON**, and the **Open in OpenLandscape3D / OpenKitchen3D /
OpenCatio3D** links), and the OpenKitchen3D, OpenLandscape3D and OpenCatio3D
planners read and write it with one extra block each. See
[Browser callers (CORS)](#browser-callers-cors) and
[Sibling producers and retained blocks](#sibling-producers-and-retained-blocks)
at the end of this document.

This is a documented extension of RoomPlan JSON for one-way geometry exchange,
not the complete bidirectional project/attachment format proposed in the roadmap.
Apple's `version` field remains independent of `openplanHandoffVersion: 1`.
Unversioned Apple captures and older `openplanPrepared` exports remain accepted.
An unknown handoff version is rejected before replacing the current project.

## Coordinates and identity

- Lengths are metres in the payload and centimetres in the web model. Fractional
  centimetres are retained, with conversion rounded to eight decimal places.
- Transforms are column-major 4×4 matrices. Translation is at indices 12–14.
  The local X direction is `(transform[0], transform[2])` on the ground plane.
  RoomPlan X maps to web X; RoomPlan Z maps to web Y. Furniture headings use
  `atan2(transform[2], transform[0])`, converted from radians to degrees.
- Surface/object `identifier` values survive import. They must be unique.
  Openings reference a wall via `parentIdentifier` on the same `story`.
- Integer `story` values select floors; absent values mean zero. `stories` carries
  `{ index, name }` records, including intentionally empty floors. Gaps and negative
  levels are retained. This does not introduce configurable physical floor heights.

## Supported geometry and presentation fields

| Payload | Web result |
| --- | --- |
| Wall `dimensions: [length, height, thickness]` and transform | Independent start/end coordinates, height and thickness; zero/missing raw-scan thickness falls back to 15 cm |
| Door `style: single/double/sliding/patio` | Single/double/sliding; patio uses the existing sliding-door representation |
| Door `hingeLeft` | True places the hinge at the wall-start jamb, web `swingDirection: right`; false uses the wall-end jamb |
| Door `opensInward` | True opens toward the left-hand wall normal `(-dy, dx)`; web `flipSide: false` |
| Window `style: fixed/sliding` | Fixed/sliding window |
| Window `sillHeight` | Explicit height above its floor in metres; absent values derive from opening and parent-wall vertical transforms |
| Apple `openings` | Doorway passages, with no door leaf |
| Object dimensions and transform | Size, position and rotation; existing category-to-catalog mapping remains in use |
| Section `center`, `label`, `displayName`, `color` | Detected room association, custom room name and color |

The iPhone exporter sends resolved opening styles and orientation, including the
defaults. Older prepared exports omitted the default hinge: the importer treats
that as the iOS wall-start hinge. Raw Apple captures without orientation extensions
retain the existing default. `openplanPrepared: true` disables automatic geometry
straightening by default; explicit `openplanImportOptions` or dialog choices win.

Photos, tracing images, per-object notes, costs, wall materials and room ceiling
overrides are not imported into equivalent editable web fields in this batch.
Keep the iPhone session/full dataset for these. Patio-specific glazing is not
modeled. Geometry JSON contains no media uploads or new persistent cloud state.

## Validation and recovery

All RoomPlan surfaces are validated before building/loading a project: finite
dimensions/transforms, valid identifiers and parent references, integral floors,
room anchors, supported styles and typed import choices. A malformed element
rejects the whole import with a visible error, leaving the current project open.

A raw-capture ZIP must contain exactly one `room.json`. A dataset with `plan.json`
is rejected with instructions to export Editable Plan JSON: importing its raw
`room.json` would silently discard the iPhone edits. Full dataset archives remain
useful as local backups; they are not a supported edited-project web import yet.

iOS accepts missing legacy optional fields but rejects damaged present arrays or
wrongly typed fields. A valid empty edited plan remains empty. Existing unreadable
edited files block editing/export/handoff instead of falling back to an older scan.
The editor offers Retry, Export Original File and, when a scan exists, Recover
Original Scan. Recovery must first copy the exact edited bytes to
`plan-recovery-<UUID>.json` beside the original. The original is replaced only when
the user later saves the recovered plan. Unknown material/style strings survive
native save/reload; an unsupported opening style is rejected by the web importer.

## Contract fixtures

`tests/fixtures/handoff-plan.json` is a synthetic native document and
`tests/fixtures/handoff-roomplan.json` its expected handoff. Identical copies live
in the iOS test bundle. Swift tests compare the actual exporter against every
fixture key/value; web tests assert the resulting geometry, floor names, empty
floor, opening appearance, room metadata and furniture orientation. Any future
format change must update both repositories' fixtures and compatibility tests.

## Browser callers (CORS)

The OpenLandscape3D and OpenCatio3D web planners call `POST /api/handoffs`
from their **Open in OpenPlan3D** buttons with `fetch` and a JSON body, which
browsers preflight. The endpoint therefore answers `OPTIONS` with `204`,
`Cache-Control: no-store` and, for an allowed `Origin`, these headers
(`src/lib/server/handoffCors.ts`):

| Header | Value |
| --- | --- |
| `Access-Control-Allow-Origin` | the request's own origin, never `*` |
| `Vary` | `Origin` |
| `Access-Control-Allow-Methods` | `POST, OPTIONS` |
| `Access-Control-Allow-Headers` | `Content-Type, Accept` |
| `Access-Control-Expose-Headers` | `Retry-After` |
| `Access-Control-Max-Age` | `86400` |

Allowed origins are the family's deployed hosts, as an exact list:
`https://app.openplan3d.com`, `https://openplan3d.com`,
`https://app.openlandscape3d.com`, `https://openlandscape3d.com`,
`https://app.openkitchen3d.com`, `https://openkitchen3d.com`,
`https://openkitchen3d-cloud.web.app`,
`https://openkitchen3d-cloud.firebaseapp.com`, `https://app.opencatio3d.com`
and `https://opencatio3d.com`. No hostname pattern is used: Firebase site ids
are global and first come, so a pattern would trust ids nobody has reserved.
`http://localhost` / `http://127.0.0.1` (any port) are admitted only while the
server runs with `HANDOFF_CORS_ALLOW_LOCAL=true`, never by default. Adding a
sibling host means editing `ORIGINS` in `src/lib/server/handoffCors.ts`. Any
other origin, a missing `Origin` header or
`null` gets no CORS headers at all: the request is still processed with its
ordinary status, but the browser withholds the response from the page. No
`Access-Control-Allow-Credentials` header is ever sent; the endpoint uses no
cookies. The same headers go on every `POST` answer, including `413`, `422`,
`429` (with `Retry-After`) and `503`, so a caller can read the error and the
retry delay. Preflights touch neither the quota ledger nor the per-minute
guard. `tests/handoff-cors.test.ts` covers the allow-list, denied look-alike
hosts and the route.

Why: on October 15, 2026 the live endpoint answered the preflight with `405`,
so both planners silently fell back to downloading a JSON file. The change is
not deployed yet. After deployment, confirm with

```sh
curl -i -X OPTIONS https://app.openplan3d.com/api/handoffs \
  -H 'Origin: https://app.openlandscape3d.com' \
  -H 'Access-Control-Request-Method: POST' \
  -H 'Access-Control-Request-Headers: content-type'
```

which must return `HTTP/2 204` with
`access-control-allow-origin: https://app.openlandscape3d.com`; the same
request with `Origin: https://example.com` must return `204` without any
`access-control-*` header. Then run a real **Open in OpenPlan3D** from each
planner and check that the editor opens with the design instead of the
planner falling back to a file download.

## Sibling producers and retained blocks

OpenKitchen3D, OpenLandscape3D and OpenCatio3D (web and iOS) read and write
this format and call it "OpenPlan3D JSON". Each adds exactly one top-level
block named after itself, `openkitchen3d`, `openlandscape3d` or `opencatio3d`,
holding what its own model needs (cabinet runs and SKUs; plants, areas and
lines; catio structures and the site), and marks its objects with
`attributes` (`openkitchen3dRole`, `sku`, `openlandscape3dKind`, `plantId`,
`opencatio3dKind`, `structureId`, `segment`, …). Their files also carry
`defaults` (`ceilingHeight`, `interiorWallThickness`,
`exteriorWallThickness`, in metres) and `planNotes` beside the shared
geometry. Each planner documents its block in its own repository's
`docs/EXPORT_FORMAT.md` (`openkitchen3d-cloud`, `openlandscape3d-cloud`,
`opencatio3d-cloud`); the web editor never interprets a block.

### What import keeps

`createProjectFromRoomPlan` stores the data the web model cannot hold on
`project.interchange` (`InterchangeState` in `src/lib/models/types.ts`):

| Field | Content |
| --- | --- |
| `version` | `1` |
| `blocks` | the top-level `openkitchen3d` / `openlandscape3d` / `opencatio3d` objects, deep-copied; Apple keys never qualify |
| `attributes` | object `identifier` → that object's `attributes`, for the objects that have any |
| `defaults` | the file's `defaults` object |
| `planNotes` | the file's `planNotes` |

Nothing is retained for a file without a block or object attributes, so plain
iPhone captures import exactly as before. `readProject` validates the shape
(`interchange.version` must be `1`, blocks and attributes must be objects,
`planNotes` text), and the state travels in **Download JSON** and library
backups. It is **not** carried by the project package ZIP, whose native plan
has no slot for it: a sibling file that goes web → package → iPhone → web
loses its block. A sibling's `<block>.name` is the title that planner gave the
project; `interchangeProjectName` reads it so an imported sibling plan can keep
that name.

**Add to this plan** (the stitching path in Build → Import RoomPlan) keeps the
same data: the file's block, attributes, `defaults` and `planNotes` are merged
into `project.interchange` by `mergeInterchangeState`. Attributes follow the
ids that the merge re-issues; a block the plan already holds for the same
planner wins, so a second file of that planner adds geometry only; the plan's
own defaults and notes are kept. One Undo removes the merged state with the
scan.

### What export writes

`projectToPreparedRoomPlan` (`src/lib/utils/interchange.ts`) writes
`openplanPrepared: true`, `openplanHandoffVersion: 1`, `version: 2`, the five
element lists, `sections`, `stories`, `floors: []`, `defaults`, `planNotes`
and the retained blocks:

- Each retained block is written back at the top level with three
  adjustments, so the receiving planner reads the edited geometry rather than
  its own old snapshot: a `webProject` copy is never written back (the
  siblings' importers prefer it over the top-level arrays, so re-emitting it
  would discard every edit made here); a non-null `building` (the siblings'
  verbatim copy of these arrays) is replaced by the arrays being written; and
  the retained `defaults.ceilingHeight` follows the current walls. Everything
  else in a block is verbatim: OpenPlan3D edits are not merged into a block,
  so a wall moved here moves in `walls` while the kitchen block still
  describes the cabinets as imported. What the receiver does with that
  differs: OpenKitchen3D and OpenLandscape3D read the top-level walls, doors,
  windows and objects, so wall edits made here arrive; OpenCatio3D rebuilds
  its house from `site.walls` inside its own block whenever the block is
  present, so wall edits made here reach only the refreshed `building` (its
  copy for the trip back to OpenPlan3D), not its host walls.
- A section's `center` is an interior point of the room polygon, never the
  dragged label position, so names and colours re-import onto the right rooms.
- An object's retained `attributes` are written back on the object with the
  same identifier; objects deleted in the editor take their attributes with
  them, objects added here have none.
- `defaults` keeps the retained object's other fields when there is one; in
  both cases `ceilingHeight` is the most common wall height (the retained
  value for a plan without walls, 2.4 m without either) with
  `interiorWallThickness: 0.12` and `exteriorWallThickness: 0.2` as the
  fallbacks.
- `planNotes` is the project description when it is not blank, else the
  retained notes, else `Created with OpenPlan3D (web editor).`.
- Geometry follows the conventions above: metres rounded to eight decimals;
  a wall at its midpoint with `y = height / 2`, heading start → end; openings
  on their wall at `position`, windows with `sillHeight`; furniture at its
  footprint centre with the catalog or override size, a mirrored item
  negating the local Z column; a section at each detected room's label
  position with `label` from the room's native type or a name that matches a
  type (else `room`), `displayName` and `color`; `stories` from every floor,
  bumping floors that share a level like the native package. Identifiers are
  unique per file: a web id repeated on a later floor becomes `<id>-s<level>`
  and parent references follow.
- Lossy or unrepresented: curved walls export their straight chord; sloped
  walls their taller end; door types french and garage → `double`, pocket →
  `sliding`, bifold → `single`; an `opening` carries no hinge or swing; window
  types other than sliding → `fixed`; custom models export as their catalog
  box; stairs, columns, dimension and text annotations, measurements, guides,
  entourage, background images, colours, textures and item details are not
  exported. Floor openings (**Open to floor below**) and floor elevations and
  slab thicknesses are not represented either: a section has no opening flag
  and a `stories` entry is only `{ index, name }`, so on import the room has
  its slab again and each floor stands at level × 300 cm on a 5 cm slab. An
  incoming section's `label` key is not retained, so a `livingRoom` section
  comes back as `room` unless the room is named after the type.

The output passes `validateRoomPlan` and shares no references with the
project. `tests/sibling-interchange.test.ts` imports six files copied
unchanged from the three siblings' own test suites
([tests/fixtures/siblings/README.md](../tests/fixtures/siblings/README.md)),
checks the retained block and attributes through save and reload, exports the
project and imports that export again; `tests/interchange.test.ts` covers the
web → file → web mapping of every element kind.

### Links and files

- **Transfer link:** `<origin>/#/import/v1/<payload>`, where `<payload>` is
  the unpadded base64url encoding of the raw-DEFLATE (RFC 1951) compression of
  the compact, key-sorted JSON (`sortedJson`). The plan travels in the URL
  fragment, which never reaches a server; nothing is uploaded. Links are built
  with `forLink`, which applies the family's link rules to the retained
  blocks: `site.location` is rounded to two decimals and marked `coarse`,
  observations lose `lat`, `lon`, `headingDeg` and `photoFile`, and
  `ios.geoOrigin` is dropped; the downloaded file keeps them. OpenLandscape3D
  and OpenCatio3D refuse payloads over 262,144 characters (OpenKitchen3D's web
  decoder has no cap today), so `siblingImportUrl` applies that limit to every
  planner and refuses with `TransferLinkError` (`reason: 'too-large'`; the
  editor then downloads the file instead), and with `reason: 'unsupported'`
  when the browser has no `CompressionStream`. Decoding stops at 16 MiB
  inflated.
  Origins: `https://app.openlandscape3d.com`,
  `https://openkitchen3d-cloud.web.app` (app.openkitchen3d.com was not live on
  October 15, 2026; switch `OPENKITCHEN3D_WEB_ORIGIN` when it is) and
  `https://app.opencatio3d.com` (`src/lib/utils/transferLink.ts`,
  `tests/transfer-link.test.ts`).
- **File name:** `<Project-Name>-openplan3d.json`: runs of characters other
  than ASCII letters and digits become one `-`, and an empty name becomes
  `plan` (`interchangeFileName`). The siblings and the iPhone app accept the
  file through their import actions; the web editor reads it back with
  **Export → Import JSON** or **Build → Import RoomPlan**.
- **Handoff link:** the siblings' **Open in OpenPlan3D** posts the same JSON
  to `/api/handoffs` (above) and falls back to the file when the request is
  refused.
