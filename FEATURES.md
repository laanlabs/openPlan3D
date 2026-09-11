# Capability reference

Updated September 11, 2026 for this checkout. This replaces the original UI
mockup checklist. “Implemented” means the capability has code and regression
coverage linked below; it does not assert that this branch is deployed or that
all devices have passed qualification. See [NEXT](NEXT.md) for remaining work,
release gates and dated validation reports, and [README](README.md#development-checks)
for the commands used to run checks.

## Web editor

| Capability | Current scope | Evidence and limits |
| --- | --- | --- |
| Walls and room geometry | Implemented: straight/curved boundaries, detected room polygons, labels and areas. | [Room tests](tests/rooms.test.ts), [crossing boundaries](tests/browser/crossing-rooms.spec.ts), [curved rooms](tests/browser/curved-rooms.spec.ts). Native and web area totals are not an established cross-platform guarantee. |
| Doors and windows | Implemented: wall-mounted openings, curved-wall placement and exported symbols. | [Curved openings](tests/curved-wall-openings.test.ts), [opening hit testing](tests/opening-hit-testing.test.ts), [browser coverage](tests/browser/curved-openings.spec.ts). Symbol/style support is not a photorealistic product catalog. |
| Wall splitting | Straight and quadratic walls split while retaining room/group references, sloped heights and opening positions. Splits crossing an opening are rejected. | [Curve and reference preservation](tests/wall-room-split.test.ts), [browser save/reopen](tests/browser/canvas-wall-actions-localization.spec.ts). Curves subdivide exactly; fixed rendering facets can change the approximation and estimated area. |
| Selection and history | Implemented: group/individual selection, geometry drag history, clipboard and fit selection. | [Drag Undo](tests/browser/geometry-drag-undo.spec.ts), [clipboard](tests/browser/selection-clipboard.spec.ts), [fit selection](tests/browser/fit-selection.spec.ts). These tests cover named interactions, not every touch/device combination. |
| Room deletion | Deletes the selected room's saved record and exclusive boundary in one undo operation. Walls and openings referenced by neighboring rooms remain; furniture remains. | [Saved/detected room deletion](tests/room-deletion.test.ts), [connected rooms and Undo/Redo](tests/browser/shared-room-deletion.spec.ts). Shared boundaries use wall IDs; coincident walls imported with separate IDs are not qualified by these tests. |
| Unchanged property edits | Reapplying saved room or furniture values preserves Undo/Redo; door/window scalar updates also skip unchanged values. | [Room history](tests/room-update-history.test.ts), [furniture interactions](tests/furniture-interactions.test.ts), [wall/opening updates](tests/wall-editing.test.ts). This does not assert equivalent handling for every item type or metadata path. |
| Canvas keyboard menus | Shift+F10/Menu opens the selection's menu. Arrow/Home/End navigation, Enter activation and Escape/Tab dismissal are supported. Explicit Properties/material actions focus their editing controls. | [Menu navigation](tests/browser/catalog-keyboard.spec.ts), [opening Properties](tests/browser/context-properties-keyboard.spec.ts), [room actions](tests/browser/context-room-keyboard.spec.ts). Physical assistive-technology qualification remains open. |
| Properties and annotations | Implemented: property drafts, multiline text, annotation visibility and dimension/text exports. | [Property drafts](tests/browser/property-drafts.spec.ts), [multiline notes](tests/browser/multiline-note-properties.spec.ts), [text exports](tests/browser/text-annotation-exports.spec.ts), [dimensions](tests/browser/dimension-exports.spec.ts). |
| Floors, slabs and stairs | Implemented: floor views/elevations, slab geometry/depth, floor openings and stair symbols. | [Floor views](tests/browser/floor-view.spec.ts), [slab geometry](tests/room-slab-geometry.test.ts), [floor openings](tests/floor-openings.test.ts), [stair geometry](tests/stair-plan-geometry.test.ts), [package values](tests/slab-package.test.ts). Common roof forms remain backlog work. |
| Furniture | Implemented: categorized catalog, placement/interactions, loaded 3D assets and fallback representations for unknown items. | [Catalog inventory](docs/furniture-inventory.md), [catalog source](src/lib/utils/furnitureCatalog.ts), [interaction tests](tests/furniture-interactions.test.ts), [model tests](tests/furniture-models.test.ts), [unknown items](tests/unknown-furniture.test.ts). Asset attribution/dimension curation and native visual fidelity remain work areas. |
| Interactive 3D | Implemented: Three.js preview and walkthrough; idle rendering stops when interaction settles. | [Walkthrough](tests/browser/walkthrough.spec.ts), [viewer idle](tests/browser/viewer-idle.spec.ts), [measured idle report](docs/reviews/2026-09-07-idle-rendering.md). Idle behavior does not establish active FPS, battery or physical-device memory budgets. |
| Plan exports | Implemented: PNG, PDF, SVG and DXF paths, including annotations and object-only plans. | [Object-only exports](tests/browser/object-only-exports.spec.ts), [text exports](tests/browser/text-annotation-exports.spec.ts), [furniture DXF](tests/furniture-dxf.test.ts), [3D PNG capture](tests/capture-main-3d.test.ts). Formats represent different views; none implies lossless editable CAD round trips. |
| Local project storage | Implemented: IndexedDB-backed storage, legacy localStorage migration, save feedback and recovery paths. | [Storage implementation](src/lib/services/localDatabase.ts), [save status](tests/saveStatus.test.ts), [library restore](tests/libraryRestore.test.ts), [project opening](tests/browser/project-opening.spec.ts). Browser storage can fail or be cleared; exported backups remain useful. |
| Project and scan import | Implemented: saved project JSON, Apple RoomPlan conversion and versioned project-package ZIP exchange. | [RoomPlan tests](tests/roomplan-import.test.ts), [package tests](tests/projectPackage.test.ts), [browser package workflow](tests/browser/project-package.spec.ts). Use the [package contract](docs/project-package-v1.md) for assets, preservation rules and limits. |
| English/Portuguese interface | Typed translation dictionaries cover Settings, library/recovery, editor controls and properties, and major 3D controls. Stored names, catalog identifiers and provider prompt values retain their original meaning. | [Key/token parity](tests/localization.test.ts), [dated verification and limits](docs/reviews/2026-09-10-localization.md). Remaining catalog text, service errors and device accessibility need further review; complete interface translation is not claimed. |

## Companion and cross-platform scope

The native companion has its own source, tests and release process. Project-package
exchange carries edited geometry and supported attachments between platforms;
retained data is not necessarily editable or rendered identically on both sides.
The [package contract](docs/project-package-v1.md) is the format reference. Native
validation and hardware/release requirements are tracked in [NEXT](NEXT.md).

The Mac Blender render workflow and portable render experiments are separate
from the interactive web preview. Their current handoff and validation are linked
from [NEXT](NEXT.md#computer-switch-handoff); this matrix does not describe them
as generally released browser features.

## Still open

- Physical iPhone/iPad interaction, capture, storage/share-sheet and performance qualification.
- Native/web area agreement and broader native geometry/material fidelity.
- Common roof forms, complete catalog provenance/dimensions and curated room sets.
- Remaining English/Portuguese strings and first-room usability/accessibility qualification.
- Controlled custom model import and reviewable recognition/layout assistance.
- Account-backed sync, collaboration and read-only sharing, subject to the release/cost gates.

These are work areas, not assertions that every associated interaction is broken.
[NEXT](NEXT.md) remains the authoritative backlog. The old
[comparison review](COMPARISON_REVIEW.md) is historical and must not be used as a
current release checklist.
