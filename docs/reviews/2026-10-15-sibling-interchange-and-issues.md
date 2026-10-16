# Sibling planner interchange, handoff CORS and five GitHub issues

October 15, 2026. Web branch `fix/sibling-compat-and-open-issues`, uncommitted
at the time of writing; nothing here is pushed or deployed. The user-facing
behaviour is in the [user guide](../user-guide.md), the format in
[handoff format v1](../handoff-format-v1.md), and the capability rows in
[FEATURES.md](../../FEATURES.md).

## Changes and reproduced behaviour

### CORS on `POST /api/handoffs`

- Reproduced: the OpenLandscape3D and OpenCatio3D web planners POST the
  interchange JSON cross-origin from their **Open in OpenPlan3D** buttons. A
  live check on October 15 answered the browser preflight with `OPTIONS → 405`,
  so both planners always fell back to downloading a JSON file.
- `src/lib/server/handoffCors.ts` and `src/routes/api/handoffs/+server.ts`:
  `OPTIONS` answers 204 with `Cache-Control: no-store`; an allowed origin gets
  `Access-Control-Allow-Origin: <origin>`, `Vary: Origin`, `POST, OPTIONS`,
  `Content-Type, Accept`, `Access-Control-Expose-Headers: Retry-After` and a
  one-day max age, on the preflight and on every POST answer including errors.
  Allowed, as an exact list: apex and `app.` hosts of openplan3d.com,
  openlandscape3d.com, openkitchen3d.com and opencatio3d.com, plus
  `openkitchen3d-cloud.web.app` and `.firebaseapp.com`; `http://localhost` /
  `127.0.0.1` only with `HANDOFF_CORS_ALLOW_LOCAL=true`. Never a wildcard,
  never credentials; other origins get no CORS headers. Preflights touch
  neither the quota ledger nor the per-minute guard.

### Interchange export and retained sibling data

- `src/lib/utils/interchange.ts`: `projectToPreparedRoomPlan` writes the
  family's prepared RoomPlan JSON from a web project (metres, column-major
  transforms, `story` per element, `stories`, `sections`, `defaults`,
  `planNotes`, `openplanPrepared`, `openplanHandoffVersion: 1`, `version: 2`);
  `sortedJson` is the compact key-sorted form the siblings use;
  `interchangeFileName` gives `<Project-Name>-openplan3d.json`;
  `interchangeProjectName` reads a sibling block's `name`.
- `src/lib/utils/transferLink.ts`: `siblingImportUrl` builds
  `<origin>/#/import/v1/<payload>` (unpadded base64url of raw-DEFLATE compact
  JSON) with the 262,144-character cap OpenLandscape3D and OpenCatio3D enforce
  (applied to every planner; OpenKitchen3D's web decoder has no cap today) and
  a 16 MiB inflate cap on decode, and link privacy for retained blocks
  (coarse location, no observation coordinates or photo names); `TransferLinkError.reason` is `too-large` or `unsupported`. The
  OpenKitchen3D origin is `https://openkitchen3d-cloud.web.app` because
  app.openkitchen3d.com was not live on October 15.
- Import (`roomplanImport.ts`, `models/types.ts`, `projectValidation.ts`) keeps
  the `openkitchen3d` / `openlandscape3d` / `opencatio3d` block, object
  `attributes`, `defaults` and `planNotes` on `project.interchange`
  (`version: 1`), validated by `readProject`, saved in project JSON and library
  backups, not in the native project package. Nothing is retained for plain
  captures, so earlier imports stay byte-identical. Export writes it back
  without a `webProject` snapshot (the siblings' importers would prefer that
  over the edited geometry), with a refreshed `building` and a ceiling default
  that follows the walls, so OpenKitchen3D → OpenPlan3D → OpenKitchen3D keeps cabinets and
  SKUs, OpenLandscape3D keeps plants, areas and lines, and OpenCatio3D keeps
  structures and the site. Checked against six fixtures copied unchanged from
  the siblings' own test suites (`tests/fixtures/siblings/README.md`).
- Export menu (wired by a second agent while this record was written):
  **Other planners** → **Open in OpenLandscape3D**, **Open in OpenKitchen3D**,
  **Open in OpenCatio3D** open a new tab with the plan in the link fragment
  (nothing uploaded) and fall back to downloading the interchange JSON when the
  plan exceeds the link size; **Download interchange JSON** saves the file
  ("For OpenKitchen3D, OpenLandscape3D, OpenCatio3D and the iPhone app. Opening
  another planner puts the whole plan in the link; nothing is uploaded.").
  Failures show **Couldn't open the other planner** with a too-large,
  unsupported-browser or pop-up-blocked message.

### Issue #106 — export dimensions ignored Measure walls

`src/lib/utils/wallDimensionLabel.ts` gives PNG, SVG, DXF and PDF the wall
length the canvas shows: the clear span between abutting wall faces in
**Edge to edge** mode (label centred on that span), the centreline otherwise;
curved walls keep their faceted centreline length in both modes.

### Issue #104 — endpoint drag jumped

`angleSnapWithin` in `src/lib/utils/canvasInteraction.ts` replaces the 10°
angular threshold for dragged wall ends, which moved a 5 m wall by about 87 cm
in one step. The 45° rays now attract only within the magnet's reach
(`MAGNETIC_SNAP / zoom`, about 15 screen px at any zoom), keeping the projected
length rather than the hypotenuse. In `FloorPlanCanvas.svelte`, Alt/Option
moves the end freely (no magnet, grid or angle snap), Shift forces the nearest
45° ray, and a magnet join to another wall is kept instead of being overridden.

### Issue #103 — stitching scans

Build → Import RoomPlan gained **Where to put it**: **Open as a new project**
(default) or **Add to this plan**. `src/lib/utils/roomplanMerge.ts` is pure:
`placeFloorBeside` sets the scan 100 cm right of the floor's content with top
edges aligned, `uniqueFloorIds` re-issues only ids the project already uses and
rewrites opening, room and group references, and `mergeRoomPlanFloors` matches
storeys by level and creates missing floors. `addRoomPlanFloorsToProject` in
`stores/project.ts` commits one undo step, "Added RoomPlan scan";
`importFloorIntoCurrentProject` now reuses the same placement. The new elements
are selected afterwards with a clean editing context and the view fits plan
and scan together; R rotates a multi-selection including walls when the
selected walls form a closed group, so a scan can be turned into place
without tearing a corner. The scan's sibling block and attributes are merged
into `project.interchange`. Door-to-door alignment followed in the next
change: right-click a door, **Join to another door…**, click the matching
door, and the scan's wall group is carried to the far side of that wall
(`src/lib/utils/scanAlignment.ts`, `tests/scan-alignment.test.ts`,
`tests/browser/scan-door-join.spec.ts`).

### Issues #101 and #102 — documentation

`docs/user-guide.md` (linked from the editor as **User guide**, opening in a
new tab) and `docs/skills/openplan3d-plan-authoring/SKILL.md` with two example
files that `tests/skill-examples.test.ts` imports through the real validators
and compares with each other. The website repository (`openplan3d-www`) lists
the three planners and gained an FAQ entry on the exchange; those edits are
also uncommitted.

## Adversarial review

After the implementation, a 44-agent review (four finders with different
lenses, two refuters per finding who ran the real modules) raised 20 findings
and confirmed 17. All were addressed in this tree:

- Retained sibling blocks were re-emitted verbatim, including a `webProject`
  snapshot that all three sibling importers prefer over the top-level arrays,
  so every edit made here was silently discarded on the way back; links also
  bypassed the family's link-privacy rules. Export now drops `webProject`,
  refreshes a non-null `building` with the written arrays, makes the ceiling
  default follow the walls, and applies the link rules for links
  (`exportedBlock` in `interchange.ts`). Verified against each sibling's real
  importer with a web export that embedded `webProject`.
- Section anchors used the dragged label position; they are interior points.
- **Add to this plan** dropped the file's block and attributes; they are now
  merged (`mergeInterchangeState`), attributes following re-issued ids.
- The post-import selection left the wall tool or a placing mode active;
  `selectImportedElements` resets the context.
- R with one wall of a room selected tore both corners; walls now rotate only
  as a closed group.
- The Export menu outgrew short viewports; it scrolls.
- The CORS allow-list trusted 24 unreserved Firebase hostnames and localhost
  in production; it is an exact list with local origins behind
  `HANDOFF_CORS_ALLOW_LOCAL`.
- The DXF export still printed centreline lengths; it follows Measure walls.
- Documentation and test corrections: stale verification numbers, the
  "centres on them" wording, the link-size cap wording, OpenKitchen3D's web
  planner credited with a handoff button it does not have, the naming rule
  for sibling plans, decorative `-0` assertions.

Three findings were refuted (a spec expectation already updated, a
pre-existing magnet-flag wart outside the change, and fixture loops that the
fixtures do exercise).

## Validation

Local, this working tree, October 15, after the review fixes:

- `npm test`: **1,325 tests passed in 134 files**, zero failures.
  `npm run check`: 0 errors, 0 warnings. Production build: passed.
- Browser, chromium, on the production build: 20 related specs (67 tests)
  passed before the review fixes; the 11 specs (38 tests) most affected by them passed
  again afterwards, including `tests/browser/roomplan-add-to-plan.spec.ts` and
  `tests/browser/interchange-export.spec.ts`.
- The nine new regression files, 147 tests: `tests/handoff-cors.test.ts` 39
  (exact allow-list, denied look-alike and unreserved hosts, local origins
  only with the flag, preflight, 503/201/429/422 headers),
  `tests/sibling-interchange.test.ts` 36 (six real sibling fixtures:
  recognition, import, retention through save and reload, export, re-import),
  `tests/interchange.test.ts` 18 (web → file → web mapping of every element
  kind, identifiers across floors, defaults and notes, `webProject` and
  `building` handling, link privacy, interior anchors),
  `tests/endpoint-drag-snap.test.ts` 13 (jump bound for 1 m / 5 m / 50 m
  walls, diagonal rays, zoom-scaled tolerance, Shift),
  `tests/roomplan-merge.test.ts` 15 (bounds, offsets, placement, id re-issue,
  storey matching, single undo step, sibling data on merge, context reset),
  `tests/interchange-ui.test.ts` 8 (download and planner-tab helper),
  `tests/export-wall-measure-mode.test.ts` 6 (SVG, PNG, PDF and DXF labels in
  both modes, curved walls, label position), `tests/transfer-link.test.ts` 6
  (codec, link form per planner, size caps, unsupported browser),
  `tests/skill-examples.test.ts` 6.
- Sibling parity suites against this checkout: OpenLandscape3D 6,
  OpenCatio3D 22, OpenKitchen3D Swift fixtures 4, all passing. A session
  scratch harness feeding this editor's export to each sibling's real
  `fromOpenPlan` and `decodePayload`: 4 cases per planner, passing.
- Not run on this tree: Firefox and WebKit, full browser CI and physical
  devices.

## Limits and remaining work

- Lossy export mappings: curved walls → chord, sloped walls → taller end,
  french/garage → double, pocket → sliding, bifold → single, window types →
  fixed/sliding; stairs, columns, annotations, measurements, guides,
  entourage, background images, colours, textures and item details are not
  exported. An incoming section `label` is not retained (export derives it
  from the room type or name).
- OpenPlan3D edits are not written back into a retained sibling block, and the
  format has no project-name slot beyond `<block>.name`; both are contract
  questions for the sibling repositories.
- `project.interchange` is not carried by the native project package; decide
  whether it should be.
- Deploy, then verify the live preflight with the curl command in
  [handoff format v1](../handoff-format-v1.md#browser-callers-cors) and a real
  **Open in OpenPlan3D** from OpenLandscape3D and OpenCatio3D.
- Switch `OPENKITCHEN3D_WEB_ORIGIN` to app.openkitchen3d.com when it is live.
- Issue #105 (iOS repository not yet public) and #30 (App Hosting bandwidth
  and temporary handoff storage) are not code changes in this batch.
