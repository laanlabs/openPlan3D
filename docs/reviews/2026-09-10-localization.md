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

## Command palette migration

Tool/action names, categories, search labels and keyboard hints now follow the
selected language. Reactive item lists update the displayed and searchable names.
Search normalizes combining accents, so `configuracoes` finds `Configurações` and
`acao` finds the action category. Execution still closes the modal before sending
editor commands. Catalog furniture names/categories remain the original catalog
text pending catalog localization; their identifiers and placement actions are
unchanged.

Palette validation: five localization unit tests pass, Svelte check has zero
errors/warnings and production build exits 0. Three Portuguese browser cases pass
across Chromium, Firefox and WebKit (24.6 seconds), exercising accent-free name
and category searches, no-result active-descendant clearing, Enter execution into
Settings and wall mode, grid dispatch after closing, and Escape focus restoration.
The initial test's unscoped option selector matched the floor dropdown; the final
assertion targets the command listbox. Logs: `/tmp/web-palette-localization-unit.log`,
`/tmp/web-palette-localization-check.log`, `/tmp/web-palette-localization-build.log`
and `/tmp/web-palette-localization-browser-final.log`.

## Full unit and English palette integration checkpoint

At source commit `31e263d`, the complete web unit suite passes: 936 tests across
87 files, zero failures, in 21.68 seconds (exit 0). This covers the current unit
suite after the localized Settings, welcome, library, transfer, selection and
palette changes. Log: `/tmp/web-full-localization-integration.log`.

The pre-existing English command-palette/modal-field regression also passes in
all three engines at 1440 and 390 pixels: six cases, 46.4 seconds, exit 0. It checks
keyboard selection, Settings field editing, editor shortcut dispatch after modal
closure and focus restoration. Log: `/tmp/web-english-palette-integration.log`.
These are a full-unit and targeted-browser baseline, not a full-browser, physical
device or deployment qualification. Remaining localization and NEXT release gates
are unchanged.

## Saved version-history migration

The saved version panel, toolbar/overflow entry points, relative times, empty
state, restore/clear confirmations and panel-owned errors now use Portuguese or
English. Snapshot descriptions and snapshot contents remain unchanged. Service
validation messages remain original diagnostics pending their own migration.

Validation: five localization unit tests pass, Svelte check has zero errors and
warnings, and production build exits 0. Three 390-pixel browser cases pass across
Chromium, Firefox and WebKit (24.5 seconds). They verify translated confirmation
text, identical saved history after cancelling restore and clear, and actual
restoration of the selected snapshot's project name and wall height through JSON
export. Logs: `/tmp/web-versions-localization-unit.log`,
`/tmp/web-versions-localization-check.log`, `/tmp/web-versions-localization-build.log`
and `/tmp/web-versions-localization-browser.log`.

## Area summary migration

Area-summary entry points, dialog controls, category names, room/stat headings and
empty-state guidance now follow the selected language. Door/window abbreviations
use P/J in Portuguese. Saved room names, unknown imported categories, geometry,
area/length calculations and measurement units are unchanged. Category labels are
reactive, including the uncategorized fallback; the original room category remains
in project data.

Area-summary validation: five localization unit tests pass, Svelte check has zero
errors/warnings and production build exits 0. Three 390-pixel browser cases pass
across Chromium, Firefox and WebKit (26.7 seconds). They compare displayed area,
wall-length and percentage values before/after changing language, retain a room
name containing literal braces, show an imported unknown category under the
translated fallback, and verify Portuguese door/window abbreviations. The initial
test needed the mobile overflow menu to reach Settings; the final test follows
that navigation. Logs: `/tmp/web-area-localization-unit.log`,
`/tmp/web-area-localization-check.log`, `/tmp/web-area-localization-build.log` and
`/tmp/web-area-localization-browser-final.log`.

## Print-layout control migration

Print-layout entry, paper/orientation/scale controls, preview label, fit warnings
and dialog-owned fallback errors now follow the selected language. Paper IDs,
orientation values, scale denominators, geometry and download filenames are
unchanged. The rendered sheet and generated room-schedule text are still separate
localization work; translating the controls does not claim a localized PDF body.

Print-control validation: five localization unit tests pass, Svelte check has zero
errors/warnings and production build exits 0. Three 390-pixel browser cases pass
across Chromium, Firefox and WebKit (53.6 seconds). They select A4 portrait, verify
that 1:25 overflow disables download, recover with Fit to page, check the canvas
paper aspect ratio and download a nonempty PDF with a valid PDF header. This does
not verify physical printer output or every PDF page's visual layout. Logs:
`/tmp/web-print-localization-unit.log`, `/tmp/web-print-localization-check.log`,
`/tmp/web-print-localization-build.log`, `/tmp/web-print-localization-browser.log`.

## Printed sheet and schedule migration

The rendered sheet now translates its fallback title, scale caption, Fit to page
label, date locale and print instructions. The PDF room-schedule heading and
print-owned validation errors are translated too. Rendering and PDF construction
accept an explicit locale (English by default); the preview tracks locale changes
and redraws before allowing download. Footer text is constrained to the existing
page margins. Project/floor/room names, measurement strings, calibration bar,
layout math and filenames remain unchanged. Other shared canvas-generated labels
and general export paths remain separate localization work.

Printed-sheet validation: all 15 print-scale/localization unit tests pass, including
identical English/Portuguese layout objects, unchanged project data, margin-bounded
footer text and translated PDF schedule text. The Node fixture uses a solid floor
because it does not provide browser Image decoding. Svelte check reports zero
errors/warnings and production build exits 0. Three browser cases pass across all
engines at 390 pixels (53.0 seconds), verifying actual canvas scale/footer labels,
Portuguese schedule heading in downloaded PDF bytes, fit validation and A4 portrait
proportions. Physical print and complete visual/pagination qualification remain
open. Logs: `/tmp/web-printed-sheet-localization-unit-final.log`,
`/tmp/web-printed-sheet-localization-check.log`,
`/tmp/web-printed-sheet-localization-build.log`,
`/tmp/web-printed-sheet-localization-browser.log`.

## Export outcome notices

PDF, 2D PNG and 3D PNG outcome notices now hold typed translation keys, and the
notice component resolves them reactively. This preserves language switching for
an already-visible notice and keeps implementation-error details out of the
message. Empty-floor guidance, partial-PDF guidance, retry text and dismissal are
translated. The export menu itself and deployment notices remain separate work.

Export-notice validation: nine unit tests pass, covering partial/failed/empty PDF,
asynchronous PNG failure, clearing successful outcomes, and English/Portuguese
resolution of the same stored notice. Svelte check has zero errors/warnings and
production build exits 0. Three Portuguese browser cases pass across all engines
(42.7 seconds): a real 2D PNG downloads while the editor is in 3D mode, then forced
encoding failure reports the localized notice from both menu and palette without
an additional download. This batch does not claim new browser coverage of every
PDF/3D failure path. Logs: `/tmp/web-export-notice-localization-unit.log`,
`/tmp/web-export-notice-localization-check.log`,
`/tmp/web-export-notice-localization-build.log`,
`/tmp/web-export-notice-localization-browser.log`.

## Update and reload notices

Update availability, loading failure, save-before-navigation/reload failure,
recovery-download and keep-editing controls now use typed, reactive translations.
The existing save guards, update polling, target URL tracking and JSON backup path
are unchanged. No live deployment or remote configuration is changed by this work.

Reload-notice validation: 21 deployment/version/localization unit tests pass,
Svelte check has zero errors/warnings, and production build exits 0. Three
Portuguese browser cases pass across Chromium, Firefox and WebKit (28.0 seconds)
against an isolated deployment server. They verify update detection, blocked reload
and navigation on failed writes, JSON recovery of the unsaved name, Keep editing,
and successful save/reload to the chosen destination after storage recovery.
Logs: `/tmp/web-deployment-localization-unit.log`,
`/tmp/web-deployment-localization-check.log`,
`/tmp/web-deployment-localization-build.log`,
`/tmp/web-deployment-localization-browser.log`.

## Full unit and English reload integration checkpoint

At source `e12cff4`, all 938 web unit tests across 87 files pass in 11.98 seconds
(exit 0), including the printed-sheet and typed-notice changes. The existing
English failed-save/recovery/reload flow also passes in Chromium, Firefox and
WebKit: three cases, 26.6 seconds, exit 0, against the isolated deployment server.
Logs: `/tmp/web-full-print-notice-integration.log` and
`/tmp/web-english-reload-integration.log`. This supplements the focused Portuguese
checks; it is not a full-browser, deployed-release or physical-device claim.

## Singular model-discovery result

A one-result model list now reports “1 model found” / “1 modelo encontrado”;
zero and multiple results retain their existing messages. Five localization unit
tests, zero-warning Svelte check and production build pass. The provider browser
flow passes across all three engines with the singular response assertion (three
cases, 25.8 seconds). Logs: `/tmp/web-model-count-unit.log`,
`/tmp/web-model-count-check.log`, `/tmp/web-model-count-build.log`,
`/tmp/web-model-count-browser.log`.

## Export menu

The export dropdown now translates its toggle, format actions, project-package
explanation, JSON import and new-project entry. Export handlers, filenames and
file formats are unchanged. Existing bilingual workflow locators accept the
localized actions; the Portuguese welcome test explicitly checks every format
action and verifies the downloaded JSON retains original project/floor names.

Five localization unit tests, zero-warning Svelte check and production build pass.
Six browser cases pass across Chromium, Firefox and WebKit (27.9 seconds), covering
Portuguese menu labels, JSON export, real 2D PNG export and failure feedback.
Logs: `/tmp/web-export-menu-localization-check.log`, `/tmp/web-export-menu-build.log`,
`/tmp/web-export-menu-unit.log`, `/tmp/web-export-menu-browser.log`. This does not
qualify every export format or physical mobile devices.

## Desktop and compact view controls

Translated the overflow trigger, view section, zoom/pan/snap/furniture controls,
plan/elevation labels and descriptive tooltips. On/off and visibility states
remain reactive; numeric zoom calculations and action handlers are unchanged.
Existing area/history tests now locate the overflow control in either language.

Five localization unit tests, zero-warning Svelte check and production build pass.
Nine browser cases pass across Chromium, Firefox and WebKit (36.6 seconds):
Portuguese controls at 390px/1440px, reversible pan/snap indicators, furniture
visibility tooltip, zoom/reset percentages, and the existing area-summary flow
that switches language while retaining measurements and imported names. This is
not physical-device or elevation-rendering qualification. Logs:
`/tmp/web-toolbar-view-unit.log`, `/tmp/web-toolbar-view-check.log`,
`/tmp/web-toolbar-view-build.log`, `/tmp/web-toolbar-view-browser.log`.

## Floor controls

Translated desktop floor selector/accessibility labels and desktop/compact
add-floor seed descriptions, section headings and remove action. Stored names,
seed IDs and add/remove handlers are unchanged. The existing floor-view browser
flow now runs in both languages; Portuguese additionally checks seed labels.

Five localization and ten floor unit tests pass, along with zero-warning Svelte
check and production build. Six Portuguese browser cases pass across all three
engines at 1440px/390px (57.8 seconds), verifying floor framing, per-floor camera
restoration and exported floor-data equality. This run does not qualify physical
devices. Logs: `/tmp/web-floor-controls-unit.log`,
`/tmp/web-floor-controls-floor-unit.log`, `/tmp/web-floor-controls-check.log`,
`/tmp/web-floor-controls-build.log`, `/tmp/web-floor-controls-browser.log`.

## Save status and recovery controls

Translated Save, save-state labels, recovery actions and elapsed-time tooltips.
The tooltip derives translated text from elapsed seconds, so switching language
updates it immediately without waiting for the next timer. Save handlers and raw
storage diagnostics are unchanged; diagnostic localization remains open.

Five localization unit tests, zero-warning Svelte check and production build pass.
Six browser cases pass across all engines (35.2 seconds): injected IndexedDB write
failure, original-name JSON backup, successful retry and persisted name, elapsed
time tooltip and immediate language switch, plus the existing Portuguese
failed-save/deployment recovery flow. Copy-conflict and physical-device coverage
are not claimed by this run. Logs: `/tmp/web-save-controls-unit.log`,
`/tmp/web-save-controls-check.log`, `/tmp/web-save-controls-build.log`,
`/tmp/web-save-controls-browser.log`.

## Full toolbar integration checkpoint

At source `7809b06`, all 938 unit tests across 87 files pass (11.89 seconds,
exit 0). Nine English browser cases pass across Chromium, Firefox and WebKit
(1.2 minutes, exit 0), covering failed-save/deployment recovery, floor framing
and per-floor camera restoration at 1440px/390px, and exported floor equality.
These checks supplement the Portuguese coverage for the export/view/floor/save
controls. Logs: `/tmp/web-toolbar-full-unit.log` and
`/tmp/web-toolbar-english-integration.log`. Remaining panels, raw diagnostics,
fluent-speaker review and physical-device qualification remain open.

## Layers item list

Translated category headings, generated element descriptions (including opening
types, stair direction, column shape and guide orientation), visibility tooltips,
empty states and room selection labels. User room/note/annotation text and catalog
names remain intact; catalog-name localization remains open.

Five localization unit tests, zero-warning Svelte check and production build pass.
Six browser cases pass across all engines at 1440px/390px (59.1 seconds), opening
the item list through the existing L shortcut, toggling visibility by keyboard,
selecting a hidden wall to reveal it, selecting a literal-brace text note, and
verifying exported floor equality. Logs: `/tmp/web-layers-unit.log`,
`/tmp/web-layers-check.log`, `/tmp/web-layers-build.log`,
`/tmp/web-layers-browser-keyboard.log`.

Initial test entry points were incorrect: the desktop Layers button is hidden on
phones, and the canvas Layers control opens a separate visibility popover. The
second run additionally reproduced that canvas button being overlapped by the
zoom controls at 390px: the disabled Fit selection button intercepted clicks in
Chromium. Logs `/tmp/web-layers-browser.log` and
`/tmp/web-layers-browser-final.log` preserve those failures. The successful test
is keyboard/list coverage, not evidence of touch access. Fixing the overlap and
providing clear touch access to the item list remain open.

## Narrow-layout Layers access follow-up

Corrected the reproduced overlap: the phone canvas status/actions strip is
width-constrained and horizontally scrollable above the zoom controls, following
the existing visible-canvas bottom offset. Its visibility popover opens above the
actions strip. A compact TopBar menu entry now toggles the item list via a parent
callback, exposing its pressed state and closing the menu after activation.

The browser test now opens the list through actual UI buttons rather than L.
At 390px it also opens/closes the canvas visibility popover and toggles its Walls
checkbox with normal clicks. All six cases pass across three engines at both
widths (60.0 seconds), retaining the selection and exported-data assertions.
An intermediate run reproduced the popover covering its toggle; that run was
stopped (exit 130), the popover offset corrected, and the final build/run passed.
Logs: `/tmp/web-mobile-layers-build-final.log`,
`/tmp/web-mobile-layers-check-final.log`, `/tmp/web-mobile-layers-browser-final.log`.
This resolves the observed browser overlap and keyboard-only item-list entry,
without claiming physical-device qualification or all viewport combinations.

## Canvas layer-visibility popover

Translated the canvas visibility toggle/title and popover checkboxes, reusing
typed layer labels and interpolating the original lower-floor name. Visibility
keys, toggle handlers and room-label/dimension state are unchanged.

Five localization unit tests, zero-warning Svelte check and production build pass.
Six browser cases pass across all engines (57.5 seconds), retaining desktop/list
coverage and narrow-layout real clicks. The phone cases additionally verify
translated room-label toggling and the disabled lower-floor option with no lower
floor. A first run found an ambiguous test selector shared by the translated
button and heading; the heading assertion was scoped before the successful run.
Logs: `/tmp/web-visibility-localization-unit.log`,
`/tmp/web-visibility-localization-check.log`, `/tmp/web-visibility-localization-build.log`,
`/tmp/web-visibility-localization-browser-final.log`. Physical-device and the
remaining canvas/editor translation work remain open.

## Canvas zoom control labels

Translated zoom/reset/fit/selection accessibility labels and shortcut hints,
including the shared fit tooltip in the status strip. Camera calculations, zoom
limits, percentage formatting and keyboard shortcuts are unchanged. The existing
large-fit test now supports English and Portuguese.

Five localization unit tests, zero-warning Svelte check and production build pass.
Six Portuguese large-fit browser cases pass across three engines at 1440px/390px
(36.3 seconds), verifying nonzero tiny zoom percentages, visible plan extents,
zoom-button ratios, wheel zoom, fit restoration, compact-menu zoom and the minimum
zoom bound. Selection-fit behavior and physical devices are not qualified by this
run. Logs: `/tmp/web-canvas-zoom-unit.log`, `/tmp/web-canvas-zoom-check.log`,
`/tmp/web-canvas-zoom-build.log`, `/tmp/web-canvas-zoom-browser.log`.

## Canvas display toggles

Translated grid, snap, furniture, ruler, minimap and fit captions/tooltips. The
five display toggles now expose aria-pressed from their existing state (the
minimap previously used the same glyph for both states). No toggle handlers or
persistence behavior changed. The narrow-layout test clicks and restores all five
toggles and compares exported settings as well as floor data.

Five localization unit tests, zero-warning Svelte check and production build pass.
The final focused browser run passes nine cases across all engines (1.2 minutes),
including the existing Portuguese command-palette workflow. An earlier run had a
WebKit 390px grid click leave aria-pressed unchanged. The isolated WebKit rerun and
the full focused rerun both passed without code or test changes. Its cause remains
unproven; this is an intermittent observation, not a fixed WebKit defect or a
physical-device qualification. Logs: `/tmp/web-canvas-display-unit.log`,
`/tmp/web-canvas-display-check.log`, `/tmp/web-canvas-display-build.log`,
`/tmp/web-canvas-display-browser.log` (initial failure),
`/tmp/web-canvas-display-webkit-repro.log`, `/tmp/web-canvas-display-browser-final.log`.
