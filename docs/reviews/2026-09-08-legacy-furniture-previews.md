# Legacy saved furniture previews

Issue [#86](https://github.com/laanlabs/openPlan3D/issues/86) closes the remaining
old-project display gap after the furniture category batch. Saved iPhone package
projects could reopen with chair placeholders even though retained native data
identified a bed, sink, washer/dryer, stairs or an unknown category. Export and
re-import already repaired those previews; opening a saved project now does too.

## Preservation and scope

`readProject` refreshes a validated clone using retained UUID mappings, source
categories and original bed width. It changes only the identifiable chair fallback
and the existing `furnitureCategoriesVersion: 1` marker. Edited dimensions,
rotation, mirroring, explicit different catalog choices, native metadata, local
notes/costs/photos and unknown fields remain intact. Later deliberate chair choices
remain explicit after normal save/reload. Reading does not rewrite stored projects
or archived history, and optimistic save comparisons still use the raw revision.

Identity checks complete before any changes. Ambiguous mappings, missing source
items, invalid widths and unsupported markers remain untouched on ordinary local
read; package export rejects unresolved retained data with recovery guidance.
Deleted furniture is not recreated. Old RoomPlan chair imports without retained
source data remain unchanged. Package format version and native contract stay at 1;
no iOS code or fixtures require changes. Existing bundled previews are reused, with
no cloud writes, additional catalog assets, services or dependencies.

## Validation

The committed `legacy-furniture-previews.openplan.json` fixture retains an edited,
mirrored bed, a deliberate desk replacement, a real local photo and future fields.
Before the fix, its read regression returned six chair placeholders. The 17 new
unit tests cover independent/idempotent reads, raw persistence/history retention,
native identity export, fractional footprints, exact photo bytes, explicit later
chair choices, moved/deleted objects, malformed identities, unsupported markers,
quota failures and concurrent-tab conflict detection.

Local validation: **645 unit tests pass**, production build passes and type checks
report zero errors with 22 pre-existing Svelte warnings. Native baseline remains
53 XCTest tests from the prior category work; it was not rerun for this web-only
read normalization.

Three browser workflows run in Chromium, Firefox and WebKit CI. Desktop and
390-pixel tests open raw legacy storage, verify refreshed labels/details without
rewriting its recovery records, edit/save/reload/export, compare native identities
and photo bytes, then render the five shared bundled GLBs. Quota recovery verifies
the old saved record survives while the normalized edited draft stays downloadable.
Each workflow rejects page errors and external network requests.

Native Safari on the pre-change production release reproduced all six chair
placeholders. That saved QA project is retained for the deployment reload check.
On the updated local production build, Safari displayed the corrected labels,
retained the edited bed's dimensions/rotation, note, cost and photo, and preserved
a real keyboard width edit from 121.875 to 119.125 cm through save/reload.
The 3D top-down view rendered the bed, procedural stairs, sink, washer/dryers,
deliberate desk and neutral unknown object.
Final browser CI and production deployment results are recorded on
the linked issue and pull request; merge is conditional on passing checks.

Remaining work is active-navigation measurement on representative hardware,
physical iPhone/iPad release checks and the Firebase cost gates in #30. This batch
does not claim physical-device validation or full Planner 5D feature parity.
