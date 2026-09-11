# English/Portuguese localization

The current Settings shell now uses a typed English/Portuguese string store and
an Appearance language selector. Translations are adapted from community
[PR #15](https://github.com/laanlabs/openPlan3D/pull/15), head
`10de0f64b3a1274e989bbc145f89a96e8257b2a9`. Only the relevant Settings dictionary
was brought forward. The old release, dependency and interaction changes were
not reapplied.

A derived Svelte store updates rendered strings without a keyed remount. The
existing native dialog, focus and active tab survive a language change. Locale
initialization runs after hydration, so SSR and the initial client render agree.
The preference is local to the browser, independent of project content and
measurement units; denied or full storage still permits in-memory changes.
Document language follows the selection. Unknown stored values fall back to
English. English remains the default while migration is incomplete.

This is the first migration batch, not full application localization. Main
navigation, welcome/library flows, editor tools, properties, canvas text, 3D,
export/print and error messages still need migration. The nested Settings
panels were migrated in the subsequent batch below. Keep project IDs, user content, serialized enum values, numeric
measurement parsing and package data independent of UI language. Portuguese
copy needs fluent-speaker review and narrow-screen qualification as coverage
expands.

Four unit tests cover dictionary key/token parity, reactive updates, persistence,
invalid preferences and unavailable storage. Svelte check reports zero errors
and warnings; production build succeeds. Logs: `/tmp/web-localization-unit.log`,
`/tmp/web-localization-check-final.log`, `/tmp/web-localization-build.log`.

The production-browser regression passed in Chromium, Firefox and WebKit (three
cases, 30.4 seconds, exit 0). It verifies the same dialog DOM node survives,
language-selector focus remains, translated labels appear, Escape closes the
modal, and reload restores Portuguese before switching back to English. Log:
`/tmp/web-localization-browser.log`. This does not establish complete translated
UI coverage or real-device accessibility.

## Nested Settings migration

Floor elevations, slab thickness, wall snapping, provider configuration and the
shared OpenAI model picker now use the same dictionaries. Desktop and overflow
Settings entry points follow the selected language. Floor names and model IDs
remain user content; interpolation preserves braces within those values and
numeric input continues to use the existing measurement logic. Provider-returned
errors and lower-level validation messages retain their original diagnostic text.
The broader interface migration and fluent Portuguese review remain open.

Validation for the nested batch: five localization unit tests pass; Svelte check
has zero errors/warnings and the production build exits 0. Language switching
passes in all three engines. The Portuguese floor/provider case passes in Firefox
and, after correcting the model-field locator and explicitly committing the
native datalist with Tab, Chromium and WebKit. The test edits and retains a floor
elevation, saves provider settings, loads mocked model IDs and removes settings.
No real provider call is made. Logs: `/tmp/web-localization-nested-unit.log`,
`/tmp/web-localization-nested-check.log`, `/tmp/web-localization-nested-build.log`,
`/tmp/web-localization-nested-browser.log`,
`/tmp/web-localization-nested-browser-corrected.log`,
`/tmp/web-localization-nested-chromium-final.log`, and
`/tmp/web-localization-nested-webkit-final.log`. Initial browser failures were test
interaction issues; they are retained in the earlier logs, not reported as passes.

## Welcome and onboarding migration

The welcome card, four-step quick tour, template cards, library/package entry
labels, import-error controls and contextual onboarding tips now use reactive
translations. Existing community welcome strings were reused and current controls
were added. Template display labels are mapped separately from factories: project
names, floor names, geometry and IDs are not translated or rewritten. Unknown
template labels fall back to their supplied text. Raw parser/import diagnostics
remain available; the welcome fallback messages and no-import notice are localized.
The library page, package/restore dialogs, and wider editor remain separate work.

Welcome validation: five dictionary/preference unit tests pass, Svelte check has
zero errors/warnings, and production build exits 0. Six browser cases pass across
Chromium, Firefox and WebKit at 390 × 900 (34.8 seconds, exit 0). They cover invalid
JSON recovery, translated template selection, actual JSON export with unchanged
project/floor names and nonempty geometry, and tour completion/dismissal after
reload. Logs: `/tmp/web-welcome-localization-unit.log`,
`/tmp/web-welcome-localization-check.log`, `/tmp/web-welcome-localization-build.log`
and `/tmp/web-welcome-localization-browser.log`. Contextual tooltip translations
are type checked; this batch does not claim a new interactive tooltip/device run.

## Project library migration

The library shell, empty/loading states, counts, relative dates, template picker,
project action menus and rename/delete dialogs now use the selected language.
Menu typeahead follows the translated visible labels; internal action values and
project data keep their existing meanings. The library header wraps on narrow
screens to accommodate the action labels. Backup/restore/package buttons are
translated; their separate dialogs and storage-layer diagnostic text remain open.

Library validation: five localization unit tests pass; Svelte check has zero
errors/warnings and the production build exits 0. Three browser cases pass in
Chromium, Firefox and WebKit at 390 × 900 (26.7 seconds). They verify no horizontal
page overflow, translated count/menu/typeahead, focus restoration, renaming with
literal braces in user content and unchanged floor geometry, cancellation of
deletion with identical saved records, and the translated template picker. The
fixture includes the current door flipSide default to avoid confusing a legacy
migration with the rename operation. Logs: `/tmp/web-library-localization-unit.log`,
`/tmp/web-library-localization-check.log`, `/tmp/web-library-localization-build.log`
and `/tmp/web-library-localization-browser-final.log`.

## Restore and package dialogs

Library restore and project-package dialogs now translate their controls, preview
summaries, confirmation labels, completion states and dialog-owned recovery
messages. Restore project/version counts distinguish singular and plural. Source
names, filenames and original downloaded data remain unchanged. Service-produced
validation, warning and storage diagnostics retain their original text and need a
separate structured-message migration; this batch does not claim those are fully
localized. File validation, cancellation, copy identities and atomic writes still
use the existing services.

Transfer validation: five localization unit tests pass, Svelte check has zero
errors/warnings, and production build exits 0. Six Portuguese browser cases pass
at 390 × 900 across Chromium, Firefox and WebKit (30.5 seconds). They verify no
library mutation during preview, byte-identical original backup/package downloads,
explicit confirmation before creating one copy, translated completion and removal
of the repeat-import action. Logs: `/tmp/web-transfer-localization-unit.log`,
`/tmp/web-transfer-localization-check.log`, `/tmp/web-transfer-localization-build.log`
and `/tmp/web-transfer-localization-browser.log`.

## Alignment and selection controls

Alignment/distribution labels, selection-toolbar actions, contextual menus and
Undo History controls now use English/Portuguese dictionaries adapted from the
community strings. Alignment button descriptors are reactive without recreating
the toolbar. Action identifiers, shortcuts and geometry operations are unchanged.
Saved history descriptions retain their existing text; structured history-message
translation remains open. Broader toolbars, properties, canvas and 3D still need
migration.

Selection-control validation: five localization unit tests pass, Svelte check
reports zero errors/warnings and production build exits 0. Twelve Portuguese
alignment cases pass across Chromium, Firefox and WebKit at 1440 and 390 pixels
(1.3 minutes). Actual exports verify alignment/distribution of scaled/rotated
items, locked-item preservation, Undo and Redo. Context-menu and history-label
changes are type checked; this run does not qualify every contextual operation.
Logs: `/tmp/web-editor-controls-localization-unit.log`,
`/tmp/web-editor-controls-localization-check.log`,
`/tmp/web-editor-controls-localization-build.log` and
`/tmp/web-editor-controls-localization-browser.log`.
