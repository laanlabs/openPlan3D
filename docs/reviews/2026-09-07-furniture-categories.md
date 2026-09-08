# Furniture category continuity

Issue [#63](https://github.com/laanlabs/openPlan3D/issues/63) repairs native/web
display mappings without changing the source furniture identity.

Follow-up: [the September 8 legacy preview batch](2026-09-08-legacy-furniture-previews.md)
also refreshes old saved previews on opening, superseding the export/re-import
workaround described in this historical report.

## Behavior

The web package and RoomPlan importers now share category rules. Exact catalog
IDs take precedence over size heuristics. Native `bed` selects an existing twin
or queen preview by footprint width; `refrigerator`, `sink`, and both
`washerDryer`/`washerdryer` select the existing matching models. Measured dimensions
remain independent of catalog defaults. Generic `sofa` and `table` retain their
exact web IDs instead of being reclassified by dimensions.

Unknown categories use a neutral box with an “Unrecognized item” label and original
category in Properties. The original string is retained as `sourceCategory` when
needed, including for RoomPlan JSON. Imported stairs use procedural steps and a
2D stair glyph instead of a storage cabinet. These import previews are excluded
from the placement catalog; building stairs remain a separate editing feature.

On iPhone, one display-only alias resolver drives furniture glyphs, inventory
icons, preview heights and SceneKit node prefixes. Web beds, refrigerators,
sinks, washer/dryers, sofas and supported chair/table/storage variants get the
appropriate existing native presentation. Unknown categories retain a plain
footprint and an object prefix so the furniture visibility toggle still works.
No resolved display name is assigned back to the saved native category.

## Retention and compatibility

Unchanged package returns retain original categories, UUID identities, fractional
footprints, notes, prices, attachments and unknown fields. UUID text casing can
differ between Swift and JavaScript without changing identity. Native edits
continue to preserve web scale/mirroring, explicit catalog IDs and other retained
web-only properties. A deliberate web catalog replacement changes the category;
an unused `sourceCategory` never overrides a different selected catalog ID.

New baseline JSON marks `openplanFurnitureCategoriesVersion: 1`; local retained
package state marks `furnitureCategoriesVersion: 1`. Unknown marker versions fail
before import/export. Packages remain format version 1. For legacy unmarked
packages, the exact old chair fallback is upgraded while edits and explicitly
different catalog choices remain intact. Export also upgrades a serialization
copy of old local package projects so their retained native categories cannot
silently become chairs. Existing old local previews refresh by exporting and
reimporting that package; serialization does not mutate an already-open editor.
Legacy RoomPlan imports without retained source categories cannot reconstruct
their original category from a saved chair alone.

## Verification and costs

The shared JSON contract has 45 cases, copied into both repositories. Web tests
also check all exact catalog IDs, repeated local save/reload/package returns,
legacy migration, deliberate replacements, unknown marker rejection, procedural
bounds, and actual Swift-generated return ZIPs in both directions. Native tests
check glyphs/icons/heights, actual scene footprints and native import/edit/export
without changing category or UUID identity. Source fixtures and returned ZIPs are
committed so CI does not depend on a local simulator.

Local validation: **537 web unit tests and 53 XCTest tests pass**; web type checks
report zero errors and 23 pre-existing warnings; production build and dependency
audit pass with zero reported vulnerabilities. Interactive browser checks cover
desktop and 390px category labels, unknown-item explanation, fractional editing,
save/reload and 3D. Production browser CI adds desktop/390px package workflows,
downloaded native identity checks, model request reuse and an actual native return
with mirrored web geometry. See the PR checks for final remote results.

No Firebase uploads, new models, cloud service, rule, quota or billing changes.
Known aliases reuse existing lazy/cacheable GLBs; stairs and unknown previews
require no model downloads. The native fixture requests five unique models when
3D is opened, sharing one file for the two washer/dryer variants. Native release,
physical-device verification and Firebase migration/budget gates remain in #30.
