# Local project packages, version 1

Choose **Download project package** from the web editor's Export menu, or **Export Project Package (ZIP)** in the iPhone review screen. Import using **Import project package** in the web library/welcome screen or **Import Project Package** on iPhone's Home screen. A preview appears before an independent copy is added. Files can be transferred through Files, AirDrop, local downloads or other user-selected file transport; the app never uploads a package to Firebase.

This format carries the current edited plan and its attachments. Full-library backups remain the separate format for all web projects and version histories. Raw iPhone capture datasets remain separate; a dataset with an edited `plan.json` cannot silently reopen the older `room.json`.

## Contents

A flat, versioned package has these entries:

| Path | Meaning |
| --- | --- |
| `manifest.json` | `{ "format": "openplan3d-project", "version": 1, "producer": "web" or "ios", "title": "…" }` |
| `plan.json` | Current native iPhone `PlanDocument`, in metres; original unknown fields retained |
| `web.json` | Optional original web project, in centimetres, with its native IDs/unknown fields; never embeds `projectPackage` recursively |
| `baseline.json` | Required with `web.json`: the native projection at the last web export, plus optional tracing-image floor/checksum metadata |
| `mapping.json` | Required with `web.json`: `entries` maps native UUIDs to the original web element/floor IDs |
| `assets/<relative filename>` | Referenced photos/tracing image and retained original attachment bytes |

All three web-return files must occur together. Web exports always include them. Native exports preserve them byte-for-byte while replacing `plan.json` with the current edits. Native import retains the original JSON separately from normal editor saves, so unknown fields survive; recognized fields that the user clears are removed when exporting again.

Web elements can have a `details` object for shared item metadata. Explicit `null` values clear retained optional native values; an empty `photos` array detaches all item photos. `attachmentNames` on the project retains readable labels for web-added files. Native output uses the existing PlanDocument fields and photo filenames, so the package format remains version 1.

The web stores a flat `projectPackage` extension on the imported project containing the latest native source, identity map and base64 attachment bytes. Local project JSON and full-library backups retain it. The next package export removes this extension from `web.json`, preventing recursive snapshots. Native storage keeps retained files under the session's `.openplan-package` directory. Retained original attachments may include files no longer shown by the receiving editor; both export interfaces disclose this.

## Fidelity and editing limits

Shared edits include wall endpoints, thickness and uniform height; door/window geometry and common styles/orientation; furniture placement, angle and footprint; floor names; room names/label positions/colors; plan notes and placed text; and the first floor's supported tracing image. Element mappings preserve identities across moves and IDs that are not native UUIDs. Unit conversion retains fractional dimensions.

New web exports mark `baseline.json` with `openplanItemDetailsVersion: 1`. For legacy exports without that marker, the current native metadata overrides stale detail fields retained by older web clients. Unknown marker versions are rejected before persistence.

Web returns compare the current native projection with its saved baseline and apply only changed shared properties to `web.json`. Unchanged web fields therefore survive, including floor elevations, curves, sloped wall heights, textures, stairs, columns, dimensions, groups, custom imagery, mirrored/scaled furniture and unknown extensions. A changed native wall height sets both endpoint heights on return. Furniture footprint changes account for existing web scale/mirroring. Unknown native materials/styles and other fields remain in the native source. Unchanged native defaults and pin-vs-styled-label choices remain unchanged on web return exports.

The catalogs and feature sets are not yet identical. iPhone displays straight, uniform-height walls and simplified furniture; it does not edit web floor elevations, wall curves/slopes, arbitrary web opening styles or web-only annotations. Unsupported furniture uses a basic web preview while retaining its original native category. Room labels without a detected enclosure remain preserved, though the web cannot draw an enclosed room fill for them. Photos, per-item notes, furniture/opening prices, room ceiling overrides/classification and wall construction materials are editable in the web Item details panel and on iPhone. Rooms can be selected from Layers, including retained native labels without a detected enclosure. Construction material and room ceiling metadata travel to iPhone; web wall colors, textures and endpoint heights remain separately editable. The import previews disclose these limits. Use the current web release to edit these fields; older releases retain them but do not provide their editing controls.

Only one unrotated PNG/JPEG/GIF tracing image (the first web floor) is mapped to the native underlay. Other floor images, rotation, opacity and locking remain in the web source. Changed native placement/width updates the corresponding web image while preserving its presentation settings. Unsupported native image formats remain attached for iPhone without a web preview. Active web images must be embedded raster data; external/blob/SVG references are rejected before package import/export rather than fetched. No model or attachment is uploaded as part of exchange.

## Validation and persistence

The ZIP profile follows [PKWARE's ZIP specification](https://pkware.cachefly.net/webdocs/casestudies/APPNOTE.TXT), using stored regular files with CRC32, one disk, UTF-8 names, and no data descriptors, extra fields, ZIP64, comments, encryption or compression. This intentionally narrow profile is generated by both clients without adding a production dependency. General third-party ZIP repackaging is unsupported; export a new package from OpenPlan3D.

Both readers enforce 64 MiB total, at most 512 entries, 32 MiB per JSON document and bounded nesting. They reject duplicate JSON keys (including escaped spellings), case-insensitive duplicate paths, traversal, file/directory collisions, symlinks, reserved session filenames, inconsistent local/central headers, bad CRCs, unsupported versions and missing required attachments. Native plans need finite valid dimensions, unique identities and valid opening parents. Coordinates and dimensions are bounded to 10,000 metres, wall thickness to 10 metres, floor indices to ±1000 and angles to ±100,000 radians before drawing; the plan contains at most 5000 mapped elements/floors. Identity maps cannot contain duplicate native or target identities. Broken web-return data is never silently treated as a fresh native capture.

Web preview performs no persistence or editor changes. Import uses the existing atomic multi-store restore transaction, with a fresh project ID and an Imported copy name; quota failure/cancellation rolls the batch back. Native import stages all session files under a hidden temporary directory, then publishes the complete session by renaming it. Cancellation or write failure removes staging and leaves existing sessions intact. Success is recorded before a later library refresh, so a refresh failure does not offer to duplicate the import.

## Local photos and saved versions

Add JPG/PNG photos from Item details. Inputs are limited to 8 MiB, 24 megapixels and 12,000 pixels per side before decode. Already small valid photos retain their original bytes; larger photos become JPEG copies at most 1600 pixels on their longest side and 512 KiB. Matching bytes reuse an existing attachment, including aliases in imported packages. Existing imported formats remain retained; previews are offered for bounded JPG/PNG data and originals can be downloaded locally. No external image URL is fetched.

Removing a photo from an item detaches its reference but keeps the original file. Retained attachments can be reused on another item. Explicit **Delete file from project** requires an unused file, discloses that original features may refer to it, removes the current asset and stale recognized native references, and omits it from future exports. Other projects, older saved versions and already downloaded packages retain their copies. Undo restores the removal while the undo step is available.

New photos are admitted against a 64 MiB budget covering the current project and the larger of its existing history or ten future versions; available browser quota is also checked when estimates are available. These are preflight estimates, not a replacement for atomic saves. On quota failure the saved plan and versions remain intact, while the current draft can be downloaded as JSON and saving retried.

Version-history records with package attachments now use `{format: "openplan3d-history", version: 2, snapshots, assets}` internally. A snapshot wrapper holds the original snapshot fields and optional filename-to-pool references. Identical immutable bytes share one entry across versions. Readers hydrate standalone project JSON for restoration; missing references or expansion over 128 MiB are rejected before allocating all copies. Unused pooled bytes disappear only as their last saved version expires. Legacy array records remain readable, and the next successful version save converts histories that contain attachments. Ordinary histories without attachments keep the array representation. Full-library backup version 1 carries the history record intact, and current restoration rebinds project IDs and rebuilds the pool atomically. Older web releases cannot read the new history record and retain it as recovery data; refresh those tabs before using version history. Damaged histories remain available in backups and are never replaced by a pruning retry.

Undo/redo retains at most 50 steps and approximately 32 MiB of serialized strings per direction, always keeping the latest step for an existing oversized project. Large projects may therefore have fewer undo steps. Saved versions remain separate from undo history.

## Contract fixtures and release verification

Matching `native-project-package.zip` and `web-project-package.zip` fixtures live in both test suites. Native XCTest imports the real web package, edits it, and exports a `swift-return-project-package.zip` attachment. The web suite imports that actual Swift output and asserts both edits and retained web-only data. Additional tests cover unknown fields, attachments, deleted metadata, cross-floor moves, tracing placement, quota retry, cancellation, corrupt archives and independent copies. Browser CI covers desktop/390 px import, metadata edits, optimized/reused photos, undo/redo, item detachment and explicit file deletion, save/reload, ZIP and library exports, quota recovery, stale image decoding and 3D with no external network requests. `web-metadata-package.zip` is imported and edited in XCTest; the actual `swift-metadata-return.zip` verifies native edits and cleared metadata in the web suite.

Simulator builds/tests validate code and local persistence. Physical-device Files/AirDrop delivery, LiDAR capture, and App Store/TestFlight distribution remain explicit release work in [issue #30](https://github.com/laanlabs/openPlan3D/issues/30). This format does not change upload quotas, Storage rules, billing configuration or native distribution status.

## Furniture category display contract

Both web import paths share display aliases; exact web catalog IDs win over
size heuristics. Native `bed` uses a twin/queen preview by footprint width,
`refrigerator` maps to `fridge`, `sink` to `sink_b`, and `washerDryer`/`washerdryer`
to `washer_dryer`. Unknown categories get a neutral `imported_object` preview
with the original string in `sourceCategory`; stairs get a procedural stair
preview, separate from editable building stairs. No extra models are downloaded.
iPhone display aliases resolve the supported web bed/appliance/sofa and
chair/table/storage variants without changing the saved category.

New `baseline.json` includes `openplanFurnitureCategoriesVersion: 1`; local web
package state includes `furnitureCategoriesVersion: 1`. Unknown versions are
rejected on package import/export. Legacy unmarked chair fallbacks are upgraded
on package re-import and when reading saved projects, JSON or history copies.
The retained source category and original width choose the preview, preserving
edited footprints and explicitly different catalog choices. Reads and exports
work on copies; raw library/history recovery bytes remain intact. Normal saves
persist the existing category marker so later chair replacements remain explicit.
Unsupported markers and ambiguous retained identities are left unchanged on local
read; package export rejects them with recovery guidance. Old RoomPlan chairs
without retained source categories cannot be reconstructed. Existing native categories, IDs and unknown
fields survive unchanged returns. A deliberate catalog replacement changes the
category; original unknown names are used only for the neutral preview.

The shared `furniture-categories.json` fixtures and actual
`swift-native-categories-return.zip`/`swift-web-categories-return.zip` outputs
verify this contract. Package format version remains 1. Native 3D remains a
simplified category-sized preview rather than the web's full model catalog.

## Room boundaries and floor openings

Native room records may include `boundaryWallIDs` (an array of native wall UUIDs)
and `floorOpening` (an optional boolean). Web exports use existing wall mappings
for the boundary references. Explicit boundaries take precedence over label-point
matching, so nested rooms can share a label center without exchanging metadata.
Unmatched explicit boundaries remain unassociated; old point-only labels use the
smallest enclosing footprint. Both optional fields can be cleared on export.

Native Codable documents and package merges retain these fields through edits.
Web and native edited-plan 3D geometry honor the opening flag. Native authoring
controls and 2D/area display support are still pending. These additive optional
fields do not change package format version 1.
