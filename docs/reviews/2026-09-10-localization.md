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

## Full Layers/canvas integration checkpoint

At source `6efa2a7`, all 938 web unit tests across 87 files pass (3.41 seconds,
exit 0). Nine English browser cases pass across Chromium, Firefox and WebKit
(1.3 minutes, exit 0): large-plan framing/zoom at 1440px/390px and the existing
sloped-wall workflow covering height edits, undo/redo, reversal, elevation, reload,
export equality and stacked-view navigation. Logs:
`/tmp/web-canvas-integration-unit.log`, `/tmp/web-canvas-integration-english.log`.
These integration checks do not resolve the earlier intermittent WebKit grid
click or qualify the full browser suite, physical devices or deployment.

## Project navigation, rename and history toolbar labels

Translated project/back-navigation text, project-name input label, rename hint,
undo/redo accessibility labels and shortcut hints, plus import/package error
headings. Actual names, navigation/save guards and undo/redo handlers are unchanged;
raw service diagnostics remain separate untranslated work. Bilingual workflow
locators now recognize these controls, while the save-recovery test explicitly
asserts Portuguese names.

Five localization unit tests, zero-warning Svelte check and production build pass.
Six browser cases pass across three engines (36.4 seconds), covering literal-brace
renaming, failed-save backup, retry/persisted name, reactive saved tooltip and
Portuguese deployment/back-navigation protection and recovery. This run checks
undo/redo labels, not a new undo/redo behavioral qualification. Logs:
`/tmp/web-project-toolbar-unit.log`, `/tmp/web-project-toolbar-check.log`,
`/tmp/web-project-toolbar-build.log`, `/tmp/web-project-toolbar-browser.log`.

## Canvas guidance and inline editor labels

Translated empty-plan drawing guidance, desktop/phone elevation-picking hints,
room/text annotation input labels, dimension label/placeholder and minimap
accessibility label. Existing keyboard keys, editor handlers and stored user text
are unchanged.

Five localization unit tests, zero-warning Svelte check and production build pass.
Six browser cases pass across all engines at both widths (30.5 seconds), verifying
Portuguese empty guidance, entering/canceling elevation-pick mode, drawing a wall,
hiding empty guidance and downloading exactly one wall. Inline text-edit behavior
is not newly qualified by this focused run. Logs:
`/tmp/web-canvas-hints-unit.log`, `/tmp/web-canvas-hints-check.log`,
`/tmp/web-canvas-hints-build.log`, `/tmp/web-canvas-hints-browser.log`.

## Bilingual inline annotation editing verification

Extended the existing annotation/context-menu keyboard test to both languages.
It enters the text tool through the translated command palette, verifies focus in
the localized annotation field, enters literal-brace text, commits it, checks
context-menu viewport bounds, saves, downloads JSON, reopens the stored project
by ID and verifies identical annotation data after another download.

All six English/Portuguese cases pass across Chromium, Firefox and WebKit at the
existing 1440px desktop viewport (24.4 seconds, exit 0), using the production build
from `102537f`. Log: `/tmp/web-inline-text-integration.log`. This adds behavioral
evidence for the translated inline annotation field, without claiming phone
editing, room-name editing or dimension-label editing coverage. No runtime code
changed in this verification batch.

## Build tabs and primary tools

Translated the Build/Rooms/Objects tabs, primary drawing/selection, structural and
annotation tools, help text and import entry captions. Tool identifiers, placement
and import handlers remain unchanged. Door/window catalogs, room/object content
and import dialogs still need their remaining strings migrated.

Five localization unit tests, zero-warning Svelte check and production build pass.
Six browser cases pass across all engines at 1440px/390px (26.1 seconds), checking
translated tabs and drawing a real wall by selecting the translated tool. Phone
cases open the tools drawer and wait for its existing automatic dismissal after
selection. An initial test incorrectly clicked outside after the drawer had
automatically closed, starting an extra wall in Firefox; removing that redundant
click fixed the test without changing production drawer behavior. Other tool
operations are not newly qualified by this run. Logs:
`/tmp/web-build-tools-unit.log`, `/tmp/web-build-tools-check.log`,
`/tmp/web-build-tools-build.log`, `/tmp/web-build-tools-browser-final.log`.

## Door and window catalogs

Translated door/window headings, all opening names and door descriptions in the
Build panel. Catalog arrays derive their text reactively while retaining type IDs,
icons, numeric dimensions, drag payloads and placement handlers.

Five localization unit tests, zero-warning Svelte check and production build pass.
Three desktop browser cases pass across all engines (10.3 seconds), checking all
13 catalog labels and placing/exporting a single door (90cm) and fixed window
(100cm) on their original host wall. The first test used pre-fit coordinates and
missed the wall after automatic framing; it now explicitly fits and uses the
current canvas bounds. This is representative placement coverage, not every
opening type or phone placement qualification. Logs:
`/tmp/web-opening-catalog-unit.log`, `/tmp/web-opening-catalog-check-final.log`,
`/tmp/web-opening-catalog-build.log`, `/tmp/web-opening-catalog-browser-final.log`.

## Room shapes and furnished templates

Translated room-tab headings/help, four shape names, six furnished-template names
and item-count captions. Typed display-label maps preserve the original preset
IDs and template names used for placement and drag payloads, with original-name
fallbacks for unmapped entries. Factory geometry/furniture data is unchanged.

Five localization unit tests, zero-warning Svelte check and production build pass.
Six browser cases pass across all engines at 1440px/390px (36.5 seconds), placing
a rectangle and a furnished bedroom, verifying exported 400×300cm bounds and
original furniture IDs, and undoing each grouped addition. Other shapes/templates,
drag placement and physical devices are not newly qualified by this run. Logs:
`/tmp/web-room-choices-unit.log`, `/tmp/web-room-choices-check.log`,
`/tmp/web-room-choices-build.log`, `/tmp/web-room-choices-browser.log`.

## Full Build-panel integration checkpoint

At source `8b8e707`, all 938 unit tests across 87 files pass (5.03 seconds, exit 0).
Twelve English browser cases pass across all engines (1.1 minutes, exit 0):
catalog/recent favorite keyboard interactions, independent placement activation,
and RoomPlan/template cancellation/focus at desktop and phone widths with stored
records unchanged. Logs: `/tmp/web-build-panel-integration-unit.log`,
`/tmp/web-build-panel-integration-browser.log`. This supplements the focused
Portuguese placement checks; it does not qualify the full browser suite, physical
devices, or the earlier intermittent WebKit grid-click observation.

## Object search and favorites controls

Translated search/clear labels, result captions, All/Favorites/Recent controls and
item-specific favorite accessibility labels/tooltips. Search input now has an
explicit accessible name. Search logic, raw item/category names, favorites IDs and
placement handlers are unchanged; full catalog localization remains open.

Five localization unit tests, zero-warning Svelte check and production build pass.
Twelve English/Portuguese browser cases pass across three engines (1.2 minutes):
literal-brace zero-result search and clear, catalog/recent favorite keyboard
toggling and persistence, focus order and independent placement activation. This
uses the existing desktop viewport, not phone or physical-device qualification.
Logs: `/tmp/web-object-controls-unit.log`, `/tmp/web-object-controls-check.log`,
`/tmp/web-object-controls-build.log`, `/tmp/web-object-controls-browser.log`.

## Catalog category labels and search

Translated all 20 category filter/preview labels through a typed display map,
keeping category identifiers and colors unchanged. Search now matches original
item names, original categories and translated categories, ignoring accents and
case. Unknown categories retain their original label. Individual item names
remain untranslated work.

Five localization unit tests, zero-warning Svelte check and production build pass.
Three desktop browser cases pass across all engines (36.3 seconds), verifying
Elétrica/Cozinha filters, accent-free `eletrica` and original `Electrical` queries,
a one-result name search, clear/reset behavior and original `stove` recent-item ID
after placement activation. Logs: `/tmp/web-catalog-categories-unit.log`,
`/tmp/web-catalog-categories-check.log`, `/tmp/web-catalog-categories-build.log`,
`/tmp/web-catalog-categories-browser.log`. Physical-device/search usability review
and individual furniture-name localization remain open.

## RoomPlan import-options dialog

Translated dialog title, straightening/orthogonal help, merge-distance label and
confirmation/cancel buttons. Option bindings, numeric constraints, import pipeline
and cancellation handlers are unchanged.

Five localization unit tests, zero-warning Svelte check and production build pass.
Six Portuguese browser cases pass across three engines at 1440px/390px (39.4
seconds), editing the straightening/merge-distance options before cancellation,
verifying unchanged stored records, focus containment and template-dialog focus
restoration. Successful import geometry is not newly qualified by this run. Logs:
`/tmp/web-roomplan-dialog-unit.log`, `/tmp/web-roomplan-dialog-check.log`,
`/tmp/web-roomplan-dialog-build.log`, `/tmp/web-roomplan-dialog-browser.log`.

## Bilingual successful RoomPlan confirmation

Added end-to-end comparison of successful imports in English and Portuguese at
1440px/390px. The prepared handoff fixture retains disabled straightening and
orthogonal defaults plus zero merge distance; confirmation retains the literal
filename-derived project name. Downloaded wall and opening geometry is compared
across languages, normalizing generated object IDs while preserving wall linkage
by index. The source wall's 27.5cm thickness and 273.5cm height are asserted.

All six browser cases pass across three engines (43.6 seconds, exit 0) against
production source `9fd5922`. Log: `/tmp/web-roomplan-confirm-browser-final.log`.
Locale is set before each navigation without relying on startup-script ordering.
This verifies prepared RoomPlan confirmation, not all raw scans, import options,
physical devices or every retained metadata field. Runtime source is unchanged.

## Presentation-symbol labels

Translated the 12 built-in entourage symbols, four category captions, placement
hints, custom/upload captions and oversized-upload alert. The Layers item list
uses the same symbol display map; custom names, IDs, paths and dimensions remain
unchanged.

Five localization unit tests, zero-warning Svelte check and production build pass.
Three desktop browser cases pass across all engines (41.9 seconds), checking all
symbol labels, translated person-placement help, Layers naming, exported `person`
ID/55cm width and undo removal. Upload behavior and other symbol placements are
not newly qualified by this run. Logs: `/tmp/web-entourage-labels-unit.log`,
`/tmp/web-entourage-labels-check.log`, `/tmp/web-entourage-labels-build.log`,
`/tmp/web-entourage-labels-browser.log`.

## Symbol-upload error recovery

Corrected the upload caption to list PNG/JPEG/WebP, matching the existing accepted
types. Added reader/decode error handlers and translated inline alert state; the
existing 2MB size rejection now uses the same alert instead of a blocking browser
alert. Choosing another file clears the previous error.

Five localization unit tests, zero-warning Svelte check and production build pass.
Three browser cases pass across all engines (41.8 seconds), rejecting corrupt and
oversized PNG inputs, retaining prior floor/custom-definition data on failure,
and successfully retrying with exact original PNG bytes and literal-brace name.
Reader hardware failures, JPEG/WebP round trips and physical devices are not
newly qualified by this focused run. Logs: `/tmp/web-symbol-upload-unit.log`,
`/tmp/web-symbol-upload-check.log`, `/tmp/web-symbol-upload-build.log`,
`/tmp/web-symbol-upload-browser.log`.

## Symbol FileReader error-path verification

Extended upload recovery coverage with an asynchronous FileReader error event at
the readAsDataURL boundary. The test verifies the translated read-failure message,
restores the native reader, compares prior floor/custom-definition data, and then
retries the valid PNG successfully with its original bytes and name.

All three desktop browser cases pass (33.4 seconds, exit 0), including the existing
corrupt-image and oversized-file checks, against production source `950fc36`.
Log: `/tmp/web-symbol-reader-recovery-browser.log`. This tests the browser error
handler contract using fault injection; it does not simulate hardware failure or
qualify physical devices. Runtime source is unchanged.

## Symbol-export integration checkpoint

At `dae6421` (runtime source `950fc36`), all 938 unit tests across 87 files pass
(7.02 seconds, exit 0). Twelve existing English browser cases pass across all
engines (1.2 minutes, exit 0), checking PNG custom-image readiness and framing,
SVG image embedding/rotated-symbol framing, and PDF image readiness/failure
handling. Logs: `/tmp/web-symbol-integration-unit.log`,
`/tmp/web-symbol-integration-browser.log`. No runtime changes in this checkpoint;
full-browser, physical-device and deployment qualification remain open.

## Door and window Properties panel

Translated opening headings, dimensions, endpoint distances, type options, hinge
side and opening direction. Unit suffixes, numeric handlers and stored type IDs
remain unchanged. The opening catalog browser scenario now edits door width to
95.25 cm, selects French/right/outward, edits window sill height to 85.5 cm and
selects casement, then compares exported objects and unchanged host walls.

Production check reports zero errors/warnings; production build and all five
localization unit tests pass. Three desktop browser cases pass across Chromium,
Firefox and WebKit (12.2 seconds, exit 0). Logs:
`/tmp/web-opening-properties-check.log`, `/tmp/web-opening-properties-build.log`,
`/tmp/web-opening-properties-unit.log`, `/tmp/web-opening-properties-browser.log`.
Other Properties sections, physical-device editing and broader release gates
remain open.

## Furniture Properties localization

Translated furniture appearance/dimension/rotation/flip/reset controls, lock
hints, imported-object explanations and eight finish display names. Catalog names,
unknown material names and stored finish values remain original; the custom color
input now has an accessible label. Numeric and appearance handlers are unchanged.

Production check reports zero errors/warnings, production build and five
localization unit tests pass. Three desktop browser cases pass (25.8 seconds,
exit 0): Portuguese Tecido stores Fabric, tint/depth/rotation/flip edits round-trip,
reset clears appearance overrides but retains placement, and other furniture
remains unchanged. An initial heading locator omitted the existing icon/lock
text; correcting the test selector resolved it without a runtime change.
Logs: `/tmp/web-furniture-properties-check.log`,
`/tmp/web-furniture-properties-build.log`, `/tmp/web-furniture-properties-unit.log`,
`/tmp/web-furniture-properties-browser-final.log`. This does not qualify 3D visual
appearance, every control, physical touch editing or remaining Properties sections.

## Room Properties localization

Translated room controls, room-type choices, category labels, color presets and
floor material/group names. Display mappings retain original type names and
material IDs; choosing Bedroom still writes the existing Bedroom preset name,
while user-entered names remain literal. Added an accessible custom-color label.
No geometry, room-detection or floor-opening handler changes.

Production check has zero errors/warnings; production build and all five
localization unit tests pass. Three desktop browser cases pass (35.6 seconds,
exit 0), verifying literal-brace names, type selection, outdoor category, light-oak
material, sage color and reversible floor-opening edits. Export comparisons retain
room wall references and unchanged walls/openings/furniture. Logs:
`/tmp/web-room-properties-check.log`, `/tmp/web-room-properties-build.log`,
`/tmp/web-room-properties-unit.log`, `/tmp/web-room-properties-browser.log`.
This does not qualify 3D slab rendering, physical touch editing, every material,
fluent-speaker review or the remaining Properties sections.

## Properties integration checkpoint

At `b671dfc`, all 938 unit tests across 87 files pass (4.74 seconds, exit 0).
Fifteen existing English browser integration cases pass across Chromium, Firefox
and WebKit (3.4 minutes, exit 0). Furniture checks cover 1440/390px tint/finish
editing, rendered color, reload persistence, rebuild resource reuse and delayed
model completion. Room slab checks exercise nested-room unique coverage,
floor-opening intent, recesses, disconnected rooms and active/stacked floor exports.
Logs: `/tmp/web-properties-integration-unit.log`,
`/tmp/web-properties-integration-browser.log`. No runtime changes in this checkpoint.
These tests complement the focused Portuguese Properties cases; they do not close
remaining localization, full-browser, physical-device or release requirements.

## Symbol Properties localization

Translated symbol labels, rotation/opacity/lock/delete controls and reused the
built-in symbol-name map already used in Build and Layers. Custom definitions
retain their source names. Numeric handlers and symbol IDs are unchanged.

Production check has zero errors/warnings; production build and five localization
unit tests pass. Extended browser coverage edits width/rotation/opacity, locks and
unlocks, deletes, then undoes deletion and compares the full saved symbol.
The first run passed Chromium/Firefox but WebKit retained the symbol after the
pre-existing placement undo assertion, before the new Properties edits. No runtime
fix is claimed: isolated WebKit passed unchanged (11.2 seconds), then the full
three-engine run passed (50.1 seconds, exit 0). Keep the intermittent undo observation
open for reproduction. Logs: `/tmp/web-symbol-properties-browser.log`,
`/tmp/web-symbol-properties-webkit-repro.log`,
`/tmp/web-symbol-properties-browser-final.log`, with check/build/unit logs under
`/tmp/web-symbol-properties-*.log`. Physical touch and remaining editor/release
requirements are still open.

## Save-status layout shift and intermittent Undo click

Repeated the unchanged WebKit symbol scenario at `b19055a`: the fourth run failed
at placement Undo (three passed, one failed, one not run). Its trace shows the save
label switching to Salvo during the Undo click and subsequent toolbar coordinates
moving by about 19px. This supports a moving-target cause rather than a symbol
history mutation defect. The toolbar now reserves the maximum width of all three
translated status labels using overlapping invisible CSS-generated measurement
text. The visible status and elapsed tooltip remain accessible without duplicate
status text. Undo/redo behavior itself is unchanged.

Added a browser assertion that Undo's bounding box is identical before saving and
after failed-save recovery. Check has zero errors/warnings; an isolated production
build passes. Six save/symbol cases pass across all engines (1.0 minute), followed
by five consecutive WebKit symbol cases (47.7 seconds). A first validation build
produced a startup data error before the editor loaded; rebuilding alone cleared
it. Keep Svelte sync/check and production build sequential to avoid shared output
races. No claim that this explains every prior intermittent canvas-control failure.

Logs: `/tmp/web-symbol-undo-repeated.log`, `/tmp/web-save-width-check-final.log`,
`/tmp/web-save-width-build-serial.log`, `/tmp/web-save-width-browser-final.log`,
`/tmp/web-save-width-webkit-repeat.log`. Physical-device and broader gates remain open.

## Stair Properties localization

Translated stair heading, layout choices, dimensions, riser count, direction and
rotation labels. Stored layout IDs and all editing handlers remain unchanged.
Production check has zero errors/warnings, build and five localization unit tests
pass. Three desktop browser cases pass (18.5 seconds, exit 0): place a stair,
select Em U/u-shaped, edit width/depth/risers/rotation/direction, compare exported
stair data and unchanged other elements, then undo direction. The first test run
was stopped after identifying an exact placement-button locator that omitted its
existing help text; corrected selector only, no runtime workaround.
Logs: `/tmp/web-stair-properties-check.log`, `/tmp/web-stair-properties-build.log`,
`/tmp/web-stair-properties-unit.log`, `/tmp/web-stair-properties-browser-final.log`.
Other Properties sections, rendered stair geometry and physical touch/release
qualification remain open.

## Column Properties localization and shape accessibility

Translated column heading, shape/dimension/rotation controls and ten color presets.
The browser check exposed an existing label wrapping two buttons: Chromium exposed
the round button as Formato plus the square button text. Replaced that form label
with a named group and added aria-pressed to each shape button. This preserves
handlers while giving both buttons stable accessible names and selected states.

Final production check reports zero errors/warnings; production build and five
localization unit tests pass. Three desktop browser cases pass (29.4 seconds,
exit 0), checking round-to-square-to-round changes, dimension retention, height,
rotation, navy color, pressed states and unchanged other exported elements.
The square-only rotation field disappears on round selection without erasing data.
Logs: `/tmp/web-column-properties-check-final.log`,
`/tmp/web-column-properties-build-final.log`, `/tmp/web-column-properties-unit.log`,
`/tmp/web-column-properties-browser-final.log`; initial accessibility failure in
`/tmp/web-column-properties-browser.log`. Other grouped controls, rendered geometry,
physical touch and remaining release requirements need separate qualification.

## Door and stair button-group accessibility

At `b484f63`, added checks reproduced missing accessible names for the first door
hinge button (Esquerda) and stair direction button (Subir). Both were inside form
labels wrapping two buttons, like the column issue. Door hinge/opening direction
and stair direction now use named groups with aria-pressed on each button.
Handlers and saved values are unchanged.

Production check reports zero errors/warnings; production build passes. Six browser
cases pass across all engines (51.2 seconds, exit 0), verifying names, pressed states,
stair undo and the existing door/window/stair export comparisons. Reproduction log:
`/tmp/web-properties-groups-repro.log`; final logs:
`/tmp/web-properties-groups-check.log`, `/tmp/web-properties-groups-build.log`,
`/tmp/web-properties-groups-browser.log`. Screen-reader hardware, physical touch
and the remaining editor/release scope still require separate qualification.

## Text annotation Properties localization

Translated annotation heading/text/font-size labels and reused translated color
and rotation labels. Text, coordinates and numeric handlers remain unchanged.
The existing bilingual inline-annotation test now reselects the saved annotation
through Layers after reopening, edits multiline text with literal braces plus
font size/rotation/X/Y, then compares its full exported object.

Production check reports zero errors/warnings; build and five localization unit
tests pass. Six English/Portuguese browser cases pass across all engines
(53.2 seconds, exit 0), retaining the existing focus/context-menu/persistence checks.
Logs: `/tmp/web-annotation-properties-check.log`,
`/tmp/web-annotation-properties-build.log`, `/tmp/web-annotation-properties-unit.log`,
`/tmp/web-annotation-properties-browser.log`. Physical touch, rendered multiline
layout, remaining Properties sections and release requirements stay open.

## Background-image Properties localization

Translated heading, opacity/scale/rotation, lock state, calibration entry and remove
controls. Existing image/calibration handlers remain unchanged. Production check
reports zero errors/warnings; build and five localization unit tests pass. Three
desktop browser cases pass (31.1 seconds, exit 0), comparing original image bytes,
position, scale/opacity/rotation/lock edits, unchanged plan geometry and complete
restoration after removal/undo. The first browser run caught a partial Set Scale
translation; the full label was corrected before the final passing build/run.
Logs: `/tmp/web-background-properties-check.log`,
`/tmp/web-background-properties-build-final.log`, `/tmp/web-background-properties-unit.log`,
`/tmp/web-background-properties-browser-final.log`. Calibration execution, physical
touch and remaining editor/release requirements remain open.

## Properties and background-framing integration checkpoint

At `31b7486`, all 938 unit tests across 87 files pass (20.85 seconds, exit 0).
Eighteen existing English browser cases pass (1.1 minutes, exit 0) across
Chromium/Firefox/WebKit at 1440/390px: initial framing waits for image dimensions,
delayed images take priority over the floor below, and failed images fall back.
These supplement the focused translated-control checks after the symbol, stair,
column, annotation, background and accessibility changes. No runtime edits here.
Logs: `/tmp/web-properties-second-integration-unit.log`,
`/tmp/web-properties-second-integration-browser.log`. Remaining wall Properties,
broader localization, physical-device and release requirements remain open.

## Wall length and endpoint localization

Translated wall heading, length/thickness, fixed-endpoint choices, unit-entry and
connected-corner help. Minimum-length validation now stores its invalid-draft state
separately from resize diagnostics, allowing its message to translate reactively.
Parsing, connected resize and undo handlers remain unchanged; detailed resize
service diagnostics and other wall controls remain untranslated.

Production check has zero errors/warnings, build and five localization unit tests
pass. Three desktop browser cases pass (33.0 seconds, exit 0), covering explicit
meter input, both fixed endpoints, connected corners, retained opening values,
invalid drafts leaving walls unchanged and undo not consumed by invalid input.
Logs: `/tmp/web-wall-length-localization-check.log`,
`/tmp/web-wall-length-localization-build.log`, `/tmp/web-wall-length-localization-unit.log`,
`/tmp/web-wall-length-localization-browser.log`. Other wall controls, diagnostics,
physical touch and remaining release requirements stay open.

## Wall height and direction localization

Translated endpoint heights, clipped-opening warning, equalize label and reverse
label/hint. Geometry and opening handlers are unchanged. Production check reports
zero errors/warnings; build and five localization unit tests pass. Three desktop
browser cases pass (40.0 seconds, exit 0), extending the connected-wall scenario
with a low sloped wall, warning visibility, unchanged opening dimensions, endpoint
and height reversal, then equalized heights. This is saved-data/UI evidence, not a
new visual rendering qualification.
Logs: `/tmp/web-wall-height-localization-check.log`,
`/tmp/web-wall-height-localization-build.log`, `/tmp/web-wall-height-localization-unit.log`,
`/tmp/web-wall-height-localization-browser.log`. Wall material/curve/elevation labels,
service diagnostics and broader device/release requirements remain open.

## Wall curve control and elevation-entry localization

Translated the curve caption/states and elevation entry/hint. The curve toggle now
has an explicit accessible name and aria-pressed state; its geometry handler is
unchanged. Production check reports zero errors/warnings; build and five
localization unit tests pass. Three browser cases pass (47.5 seconds, exit 0),
verifying the saved 60cm perpendicular midpoint control point, unchanged openings
and complete straight-wall restoration after toggling off. This verifies stored
geometry and control semantics, not rendered curve/elevation fidelity.
Logs: `/tmp/web-wall-curve-localization-check.log`,
`/tmp/web-wall-curve-localization-build.log`, `/tmp/web-wall-curve-localization-unit.log`,
`/tmp/web-wall-curve-localization-browser.log`. Wall material labels, service
messages, broader localization and physical-device/release requirements remain open.

## Wall material label localization

Translated wall color/texture display names, side selectors and None/custom labels.
A typed map keeps all 21 catalog IDs and source material definitions unchanged.
Production check has zero errors/warnings, build and five localization unit tests
pass. Three desktop browser cases pass (53.2 seconds, exit 0), selecting red-brick
interior and wood-panel exterior finishes, comparing full saved wall data, then
removing only exterior texture while retaining interior/color/opening values.
The test distinguishes texture buttons from same-named color swatches by visible
text. This does not qualify every material's rendering or physical touch.
Logs: `/tmp/web-wall-materials-check.log`, `/tmp/web-wall-materials-build.log`,
`/tmp/web-wall-materials-unit.log`, `/tmp/web-wall-materials-browser.log`.
Service diagnostics, child detail panels, broader localization and release gates
remain open.

## Wall Properties integration checkpoint

At `4cc7a2c`, all 938 unit tests across 87 files pass (24.53 seconds, exit 0).
Six existing English wall-dimension cases pass across all engines at 1440/390px
(2.6 minutes, exit 0). Coverage includes joined-wall topology, opening numeric
validation, invalid drafts not consuming undo, imperial focus preserving precision,
explicit-unit overrides, full-precision undo, save/reload and opening the 3D viewer.
Logs: `/tmp/web-wall-properties-integration-unit.log`,
`/tmp/web-wall-properties-integration-browser.log`. No runtime changes here.
These complement focused Portuguese controls tests; they do not qualify remaining
service diagnostics, detail panels, full-browser or physical-device/release work.

## Item metadata field localization

Translated detail-section heading, notes/cost fields and help, construction material,
room use and ceiling-height labels/help, unspecified/default and retained-value text.
A typed display map retains six construction-material IDs and twelve room-use IDs.
Photo workflows and validation/service diagnostics are still untranslated.

Production check reports zero errors/warnings; build and five localization unit
tests pass. Six desktop browser cases pass (56.1 seconds, exit 0), extending room
and furniture checks with pantry ID, 275.5cm ceiling override, literal multiline
notes and 123.456 cost, while retaining wall geometry and neighboring furniture.
Logs: `/tmp/web-item-detail-labels-check.log`, `/tmp/web-item-detail-labels-build.log`,
`/tmp/web-item-detail-labels-unit.log`, `/tmp/web-item-detail-labels-browser.log`.
Construction-material editing/native round-trip, photo localization, physical touch
and broader release requirements remain open.

## Bilingual native metadata package verification

Extended the actual Swift-return fixture scenario to both English and Portuguese.
Six cases pass across all engines (54.6 seconds), preserving native follow-up data,
editing room notes/use/ceiling, choosing Madeira/wood construction material and
opening cost, then checking native plan.json identifiers, meter conversion and
price precision. Runtime source remains `488a648`; no new Swift execution occurred.

The existing test file initially could not load because importing the production
photo service pulled in browser-only virtual modules. Removed that test dependency:
exported JPEG signature and 512KiB contract are checked directly, and the browser
image decoder checks 1600x800 dimensions. Six existing photo/metadata cases pass at
1440/390px across all engines (1.6 minutes), including undo/save/export and attachment
retention. Logs: `/tmp/web-detail-native-localization-browser-final.log`,
`/tmp/web-detail-photo-decoder-browser.log`. Photo/control diagnostic translation,
physical devices and remaining NEXT requirements stay open.

## Item-photo control localization

Translated photo count, preview alt text/fallback, add/preparing/choose controls,
download/removal labels and format/retention guidance. File names, attachment
handlers and saved references remain unchanged. Retained-file management and
status/error diagnostics still need translation.

Production check reports zero errors/warnings; build and five localization unit
tests pass. Three desktop browser cases pass (33.8 seconds, exit 0): add a small
PNG, verify the named preview and exact downloaded bytes, remove the item reference,
compare retained assets, then undo to restore references. Logs:
`/tmp/web-item-photos-labels-check.log`, `/tmp/web-item-photos-labels-build.log`,
`/tmp/web-item-photos-labels-unit.log`, `/tmp/web-item-photos-labels-browser.log`.
Large-photo conversion, physical touch and broader release gates remain separately
qualified by their own checks; this batch does not close those requirements.

## Retained-attachment controls

Translated retained count/size summary, budget guidance, previews, reuse/download/
delete controls and deletion confirmation. Original filenames remain literal;
attachment/reference and confirmation handlers are unchanged.
Production check reports zero errors/warnings, build and five localization unit
tests pass. Three browser cases pass (41.9 seconds, exit 0), extending the photo
workflow with retained reuse, cancellation preserving asset bytes and confirmed
unused-file deletion removing only the current project's asset entry. Older-version
retention and used-reference rejection retain their separate existing coverage.
Logs: `/tmp/web-retained-labels-check.log`, `/tmp/web-retained-labels-build.log`,
`/tmp/web-retained-labels-unit.log`, `/tmp/web-retained-labels-browser.log`.
Status/error diagnostics, physical touch and remaining NEXT requirements stay open.

## Item-detail status and validation messages

Added a typed display map for twelve known panel-owned messages, translating at
render time so locale changes do not freeze existing notices. Unknown service
errors retain their original diagnostics. Handlers, validation limits and stored
values are unchanged.
Production check reports zero errors/warnings; build and five localization unit
tests pass. Six browser cases pass (1.0 minute, exit 0), checking invalid cost
restores its precise prior value, attachment/reuse/deletion success notices and
used-file deletion rejection, alongside prior exported-data comparisons.
Logs: `/tmp/web-detail-messages-check.log`, `/tmp/web-detail-messages-build.log`,
`/tmp/web-detail-messages-unit.log`, `/tmp/web-detail-messages-browser.log`.
Not every fallback branch was fault-injected; service diagnostics, physical-device
and remaining NEXT requirements stay open.

## Detail-panel failure and cancellation integration checkpoint

At `82aa35f`, all 938 unit tests across 87 files pass (20.05 seconds, exit 0).
Six existing English attachment failure/selection-change cases pass across all
engines (1.1 minutes, exit 0). They cover bad photo rejection, injected project-write
failure preserving saved state and an exportable draft, successful retry, and
changing selection during delayed decode without attaching to another item.
Logs: `/tmp/web-detail-integration-unit.log`, `/tmp/web-detail-integration-browser.log`.
No runtime changes here. Full-browser, physical-device and remaining localization/
release requirements remain open.

## Calibration prompt and finite-scale protection

Reproduced Infinity input at `6eb26f2`: the exported background scale became null
from a non-finite calculated value. Calibration now requires finite positive entered
and measured distances plus a finite positive resulting scale before updating the
image. The native browser prompt is translated; no change to the cm input contract.

Production check reports zero errors/warnings; build and five localization unit
tests pass. Three browser cases pass (46.8 seconds, exit 0), checking Infinity,
zero, negative and cancelled input preserve original image data; at 100% zoom,
200px between points with a 400cm answer doubles scale while retaining other fields.
Logs: `/tmp/web-calibration-infinity-repro.log`, `/tmp/web-calibration-check.log`,
`/tmp/web-calibration-build.log`, `/tmp/web-calibration-unit.log`,
`/tmp/web-calibration-browser.log`. Physical touch calibration and remaining native/
localization/release requirements stay open.

## Escape cancels unfinished calibration

Reproduced at `c49d67d`: after choosing one calibration point and pressing Escape,
the next canvas click still opened the distance prompt. Canvas Escape now clears
calibration mode and points alongside other transient interactions. Three browser
cases pass (51.8 seconds, exit 0): Escape produces no later prompt and preserves the
image, followed by invalid/cancelled inputs and successful fresh calibration.
Production check has zero errors/warnings and build passes.
Logs: `/tmp/web-calibration-escape-repro.log`, `/tmp/web-calibration-escape-check.log`,
`/tmp/web-calibration-escape-build.log`, `/tmp/web-calibration-escape-browser.log`.
This does not qualify physical touch or all project/floor-change cancellation paths;
remaining NEXT requirements stay open.

## Floor transitions cancel unfinished calibration

At `2dae36a`, the new floor-store regression failed because calibration remained
active after adding a floor. The shared floor-context reset now clears calibration
mode and points. All 11 floor unit tests pass, including switching, adding,
removing the active floor, and floor-changing undo/redo. Production check reports
zero errors/warnings and build passes. Three browser cases pass (59.2 seconds,
exit 0), verifying a point chosen on one floor does not prompt after switching,
both background images retain their original data, and fresh calibration still
works. Logs: `/tmp/web-calibration-floor-repro.log`,
`/tmp/web-calibration-floor-unit.log`, `/tmp/web-calibration-floor-check.log`,
`/tmp/web-calibration-floor-build.log`, `/tmp/web-calibration-floor-browser.log`.
Physical touch, other project/tool cancellation paths and the remaining NEXT
requirements remain open.

## Elevation navigation localization

Translated previous/next wall buttons, wall counter and drag/Escape guidance,
and added a translated accessible name to the elevation canvas. Wall geometry,
opening drag handlers and dimensional formatting are unchanged. Production check
has zero errors/warnings, build and five localization unit tests pass. Three
browser cases pass (51.3 seconds, exit 0), checking Portuguese navigation in both
directions, wraparound, Escape returning to plan and unchanged exported floor
data. Logs: `/tmp/web-elevation-labels-check.log`,
`/tmp/web-elevation-labels-build.log`, `/tmp/web-elevation-labels-unit.log`,
`/tmp/web-elevation-labels-browser.log`. This navigation test does not qualify
opening drag interactions or physical touch; remaining NEXT scope stays open.

## Elevation teardown closes drag undo groups

At `155bb92`, a browser regression reproduced dragging a window then pressing
Escape before pointer release: the window moved, but Undo did not restore it.
Elevation teardown now finalizes its pending drag through the same handler used
for pointer release, closing the undo group when the canvas disappears.
Production check reports zero errors/warnings and build passes. Three browser
cases pass (41.3 seconds, exit 0), verifying horizontal/sill movement, preserved
window dimensions, and exact whole-floor Undo/Redo restoration. Pointer movement
allows one screen pixel of rounding (Firefox produced a 19cm rather than 20cm
rise); saved-data restoration assertions remain exact.
Logs: `/tmp/web-elevation-drag-repro.log`, `/tmp/web-elevation-drag-check.log`,
`/tmp/web-elevation-drag-build.log`, `/tmp/web-elevation-drag-browser-final.log`.
This covers desktop Escape during a window drag, not all gesture exits or physical
touch. Remaining NEXT requirements stay open.

## Elevation and calibration integration checkpoint

At `97e7b2b`, all 939 unit tests across 87 files pass (22.56 seconds, exit 0).
Six existing English integration cases pass across Chromium, Firefox and WebKit
(1.8 minutes, exit 0). Coverage includes sloped wall heights, invalid drafts,
reversal and opening preservation, elevation display, save/reload and 3D viewing;
modal dismissal preserves elevation/3D editing modes and PDF print stays usable.
Logs: `/tmp/web-elevation-integration-unit.log`,
`/tmp/web-elevation-integration-browser.log`. No runtime changes in this checkpoint.
Full-browser, physical-device, remaining localization and release work stay open.

## Keyboard shortcut reference localization

Translated shortcut dialog headings, action descriptions, pointer gesture names,
copy/close labels and footer, sharing translation keys with the copied reference.
Keyboard bindings are unchanged. The 3D viewer loading message is translated too.
Production check reports zero errors/warnings; build and five localization unit
tests pass. Three browser cases pass (22.6 seconds, exit 0), checking Portuguese
help opened by ?, translated clipboard payload, button close/reopen and Escape.
The test intercepts clipboard.writeText to inspect its payload; OS clipboard
permissions and every documented command are not qualified by this test.
Logs: `/tmp/web-shortcuts-check.log`, `/tmp/web-shortcuts-build.log`,
`/tmp/web-shortcuts-unit.log`, `/tmp/web-shortcuts-browser.log`.
Remaining editor loading/error actions, viewer UI, physical-device and release
requirements remain open.

## Editor loading and recovery controls

Translated editor retry/backup controls using existing library keys, return-to-
projects link, loading/importing labels and capture-error heading/dismiss action.
Underlying service diagnostics remain unchanged. Production check reports zero
errors/warnings; build and five localization unit tests pass. Three browser cases
pass (22.3 seconds, exit 0), injecting a migration quota failure on direct editor
load, downloading identical legacy bytes, then retrying successfully with one
project whose saved data exactly matches the source. Original legacy bytes remain
available afterward. Logs: `/tmp/web-editor-recovery-check.log`,
`/tmp/web-editor-recovery-build.log`, `/tmp/web-editor-recovery-unit.log`,
`/tmp/web-editor-recovery-browser.log`. Capture-network branches, physical-device
recovery and remaining NEXT requirements stay open.

## Capture import diagnostics localization

Known capture-import failures now retain typed translation keys and parameters
for rendering; their Error.message remains English and unexpected errors retain
the original diagnostic. Stored project names and import recovery flow are
unchanged. Production check reports zero errors/warnings; build and five
localization unit tests pass. Three browser cases pass (35.8 seconds, exit 0),
each exercising invalid code, network failure, 404, HTTP 503, malformed JSON and
invalid RoomPlan content. Invalid codes make no capture request; routed failures
show the expected Portuguese message, dismiss cleanly and leave Save visible.
No live cloud download was used. Logs: `/tmp/web-capture-errors-check.log`,
`/tmp/web-capture-errors-build.log`, `/tmp/web-capture-errors-unit.log`,
`/tmp/web-capture-errors-browser.log`. Generic fallback/unknown-error branches,
live handoff, physical-device and remaining NEXT requirements stay open.

## Successful capture download with failed initial save

At `1700d1e`, three new browser cases pass (29.6 seconds, exit 0), routing the
prepared multi-floor RoomPlan fixture through the capture URL and injecting
QuotaExceededError at project writes. The capture stays in memory with a backup
action; the backup contains all three floors and every source wall identifier.
After removing the injected failure, retry persists one project with exactly the
backup's floor data. Reload opens that project without a second capture request.
No runtime change was needed. The initial test incorrectly counted all source
walls against only floor zero; corrected assertions cover every floor and wall ID.
Log: `/tmp/web-capture-save-recovery-browser-final.log`. This uses a routed fixture,
not live cloud capture or physical-device storage pressure. Those and remaining
NEXT requirements stay open.

## Editor panel toggles

Translated tools, layers and undo-history toggle labels/titles and exposed panel
state through aria-expanded. Updated six affected localized browser workflows.
Production check reports zero errors/warnings; build and five localization unit
tests pass. All 30 affected browser cases have passing results: nine Chromium
cases passed before stopping the first run to correct the bilingual narrow
RoomPlan test's locale-dependent selector; that remaining Chromium case passed
separately (17.4 seconds), then all 20 Firefox/WebKit cases passed (1.8 minutes).
Coverage includes tools/layers expanded state, narrow layouts, drawing, symbols,
opening catalog, room choices and bilingual RoomPlan import data preservation.
History's new expanded attribute has type-check coverage but no new interaction
assertion in this batch. Logs: `/tmp/web-panel-labels-check.log`,
`/tmp/web-panel-labels-build.log`, `/tmp/web-panel-labels-unit.log`,
`/tmp/web-panel-labels-browser.log`, `/tmp/web-panel-labels-chromium-final.log`,
`/tmp/web-panel-labels-other-engines.log`. Physical touch and remaining NEXT
requirements stay open.

## Main 3D navigation localization

Translated viewer region, floor stacking, top-down, transparency, edit, camera
placement, screenshot and walkthrough control labels, plus camera/walkthrough
guidance. Renderer behavior and stored values are unchanged. Production check
reports zero errors/warnings; build and five localization unit tests pass. Three
browser cases pass (47.0 seconds, exit 0), exercising stacking/transparency/edit
toggles, top-down entry, camera placement cancellation, PNG download signature
and unchanged exported floors/settings. This is not a pixel-quality screenshot
audit or a walkthrough movement test. Logs: `/tmp/web-viewer-nav-check.log`,
`/tmp/web-viewer-nav-build.log`, `/tmp/web-viewer-nav-unit.log`,
`/tmp/web-viewer-nav-browser.log`. Camera preview/AI/lighting/furniture UI and
physical-device/release requirements remain open.

## 3D lighting panel localization

Translated lighting panel labels and four time-of-day presets. The toggle exposes
expanded state and presets expose pressed state, including clearing that state
after manual adjustment. Existing preset IDs and lighting math are unchanged.
Production check reports zero errors/warnings; build and five localization unit
tests pass. Three browser cases pass (57.5 seconds, exit 0), checking all four
presets' azimuth/elevation/ambient values, keyboard ambient adjustment and cleared
selection, panel close, plus prior navigation/export/data preservation coverage.
Logs: `/tmp/web-viewer-lighting-check.log`, `/tmp/web-viewer-lighting-build.log`,
`/tmp/web-viewer-lighting-unit.log`, `/tmp/web-viewer-lighting-browser.log`.
This checks UI state, not physical lighting accuracy or visual render quality.
Remaining viewer panels, physical-device and release requirements stay open.

## Portuguese walkthrough interaction verification

At `9cf4ec2`, three Portuguese walkthrough cases pass (35.0 seconds, exit 0).
With simulated mouse-lock denial and controlled animation timestamps, rendered
view-matrix observation confirms arrow movement and an eye-height adjustment
without lateral movement. Translated fallback guidance and speed labels are
visible; Top-Down exits walkthrough. Existing English pause/exit/field tests also
pass across all engines (39.2 seconds), covering held-input cleanup and sprint
reset through the shared setup helper. No runtime changes were needed.
Logs: `/tmp/web-walkthrough-portuguese.log`,
`/tmp/web-walkthrough-english-integration.log`. This does not qualify physical
mouse-lock permission, touch navigation, active FPS or battery. Remaining NEXT
requirements stay open.

## Interior camera preview localization

Translated camera preview heading, canvas name, guidance, movement, FOV/height,
x-ray, capture/reposition and close controls. Movement arrows now have explicit
accessible names matching their tooltips. Production check reports zero errors/
warnings; build and five localization unit tests pass. Three browser cases pass
(58.6 seconds, exit 0), opening a rendering preview, clicking movement controls,
keyboard-adjusting FOV/height, toggling x-ray, downloading a 1920×1080 PNG, then
repositioning/reopening and closing with preview WebGL context release.
Logs: `/tmp/web-camera-labels-check.log`, `/tmp/web-camera-labels-build.log`,
`/tmp/web-camera-labels-unit.log`, `/tmp/web-camera-labels-browser.log`.
Movement displacement and visual image quality are not measured in this test;
AI panel, physical touch and remaining NEXT requirements stay open.

## Viewer localization resource integration checkpoint

At `6026e66`, all 939 unit tests across 87 files pass (21.12 seconds, exit 0).
Six existing English camera resource cases pass across Chromium, Firefox and
WebKit at 1440px and 390px (2.6 minutes, exit 0). Repeated preview open/close,
reposition, full-size capture and 2D/3D transitions retain context release and
resource allocation invariants. No runtime changes in this checkpoint.
Logs: `/tmp/web-viewer-localization-integration-unit.log`,
`/tmp/web-viewer-localization-integration-browser.log`. Browser viewport coverage
is not physical-touch, memory/battery or full-browser qualification. Remaining
NEXT requirements stay open.

## AI render panel localization

Translated panel/control labels, provider disclosure, result/error shell and
24 style/lighting/mood choices through a typed display map. Option values, model
IDs, prompt generation and literal extra instructions are unchanged. Production
check reports zero errors/warnings; build and five localization unit tests pass.
Three browser cases pass (37.8 seconds, exit 0), choosing Portuguese options and
checking their original English prompt values, literal braces in extra text,
provider disclosure and panel dismissal. No external requests occurred.
Logs: `/tmp/web-ai-panel-check.log`, `/tmp/web-ai-panel-build.log`,
`/tmp/web-ai-panel-unit.log`, `/tmp/web-ai-panel-browser.log`.
This did not invoke rendering or qualify result/error handlers. Model descriptions,
service diagnostics, physical-device and remaining NEXT requirements stay open.

## AI render execution integration checkpoint

At `edd0846`, six existing English local-provider browser cases pass across all
engines at 1440px and 390px (2.1 minutes, exit 0). They check provider settings,
request construction, image display, byte-identical download, missing-image
feedback, cancellation, retry-button availability and setting removal. Render
requests go to the loopback test provider; no live AI service was used. The
retired hosting proxy still returns 404. No runtime changes in this checkpoint.
Log: `/tmp/web-ai-render-integration-browser.log`. This preserves execution
coverage after panel localization; Portuguese execution, live providers, physical
devices and remaining NEXT requirements stay open.

## 3D furniture placement localization

Translated furniture placement/exit, picker heading/close and placement/material
guidance, reusing catalog category translations. Category buttons now expose
pressed state. Original catalog item names and IDs are unchanged. Production
check reports zero errors/warnings; build and five localization unit tests pass.
Three browser cases pass (46.1 seconds, exit 0), changing categories, placing an
Armchair with catalog ID `chair`, retaining wall data and exactly restoring floor
data through Undo/Redo. Logs: `/tmp/web-3d-furniture-check.log`,
`/tmp/web-3d-furniture-build.log`, `/tmp/web-3d-furniture-unit.log`,
`/tmp/web-3d-furniture-browser.log`. Individual item names, other remaining viewer
text, physical-device and release requirements stay open.

## Shortcut clipboard failure recovery

At `6bfa007`, injected clipboard denial reproduced missing user feedback. Shortcut
copy now awaits and catches clipboard errors, reports translated pending/success/
failure status, disables duplicate pending copies and ignores results from a
closed dialog generation. Production check reports zero errors/warnings; build
and five localization unit tests pass. Six browser cases pass (28.6 seconds,
exit 0), checking copied contents, denial without page errors, successful retry,
status reset on reopen and delayed completion after close/reopen.
Logs: `/tmp/web-shortcut-copy-repro.log`, `/tmp/web-shortcut-copy-check.log`,
`/tmp/web-shortcut-copy-build.log`, `/tmp/web-shortcut-copy-unit.log`,
`/tmp/web-shortcut-copy-browser.log`. Clipboard permission is simulated; actual
OS clipboard permissions and remaining NEXT requirements stay open.

## Blender scene export localization

Translated export action/help, known status messages and stacked-floor elevation
label. Original errors not owned by this view remain unchanged. Production check
reports zero errors/warnings; build and five localization unit tests pass. Six
Portuguese browser cases pass at desktop/narrow widths across all engines
(52.0 seconds, exit 0), verifying schema/coordinates, wall and floor meshes,
expected heights, identical repeated downloads, stacked-floor expansion and
ordinary project backup heights. The existing test retains its English cases.
Logs: `/tmp/web-viewer-export-check.log`, `/tmp/web-viewer-export-build.log`,
`/tmp/web-viewer-export-unit.log`, `/tmp/web-viewer-export-browser.log`.
Export failure branches and external Blender rendering were not requalified here;
physical-device and remaining NEXT requirements stay open.

## Known AI render error localization

Added a display map for five known app-owned render messages: cancellation, model
storage failure, generic render failure, missing Gemini key and empty image
response. Unknown provider diagnostics and copied raw diagnostic text remain
unchanged. Production check reports zero errors/warnings; build and five
localization unit tests pass. Three browser cases pass (35.8 seconds, exit 0),
including a missing-key render attempt with Portuguese guidance, enabled retry
button and no external request, alongside previous prompt-preservation checks.
Logs: `/tmp/web-ai-errors-check.log`, `/tmp/web-ai-errors-build.log`,
`/tmp/web-ai-errors-unit.log`, `/tmp/web-ai-errors-browser.log`.
Other mapped failure branches were not newly fault-injected; physical-device,
provider and remaining NEXT qualification stay open.

## Canvas status count localization

Translated singular/plural room, wall, door, window and object counts, selection
summary and zoom text. Geometry and count calculations are unchanged. Production
check reports zero errors/warnings; build and five localization unit tests pass.
Twelve browser cases pass (1.3 minutes, exit 0), including desktop/narrow layers
with four walls and singular room/door/window counts, preserved exported data,
welcome import recovery, template creation and tour persistence.
Logs: `/tmp/web-canvas-status-check.log`, `/tmp/web-canvas-status-build.log`,
`/tmp/web-canvas-status-unit.log`, `/tmp/web-canvas-status-browser.log`.
Object/multiselection counts and every plural combination were not newly exercised;
remaining UI, physical-device and release requirements stay open.

## Canvas contextual action localization

Translated duplicate/delete using existing keys and added swing-flip/midpoint
split labels. Action handlers are unchanged. Production check reports zero
errors/warnings; build and five localization unit tests pass. Six Portuguese
browser cases pass (56.3 seconds, exit 0), duplicating/deleting mixed and symbol
selections, checking unique IDs and copied wall-opening references, then exact
Undo/Redo restoration of the tested object collections. The test retains its
English cases. Logs: `/tmp/web-canvas-actions-check.log`,
`/tmp/web-canvas-actions-build.log`, `/tmp/web-canvas-actions-unit.log`,
`/tmp/web-canvas-actions-browser.log`. Swing/split actions were not exercised
in this batch; physical-device and remaining NEXT requirements stay open.

## Contextual editor integration checkpoint

At `85f42dc`, all 939 unit tests across 87 files pass (4.48 seconds, exit 0).
Six existing English wall-dimension browser cases pass across three engines at
1440px/390px (2.3 minutes, exit 0), covering joined-room geometry, valid opening
values, invalid drafts, imperial input, Undo precision, persistence and 3D entry.
Logs: `/tmp/web-context-integration-unit.log`,
`/tmp/web-context-integration-browser.log`. No runtime changes in this checkpoint.
Full-browser, physical-device and remaining NEXT requirements stay open.

## Contextual swing and midpoint split verification

At `2c620e9`, three Portuguese browser cases pass (24.2 seconds, exit 0).
The swing action changes the saved opening swingDirection only; Undo restores
the exact floor. Splitting a 600.5cm sloped wall at its midpoint produces matching
300.25cm endpoints and 250/300/350cm interpolated heights. A door at one quarter
and a window at three quarters retain dimensions and their along-wall centers
through updated wall references/positions. Undo restores the exact original floor.
The first run used an incorrect layer name; the fixture's actual name is
“Porta aberta 1”. Log: `/tmp/web-canvas-wall-actions-browser-final.log`.
No runtime changes were needed. This does not cover an opening spanning the split
point, curved-wall splitting or physical gestures; remaining NEXT scope stays open.

## Opening-safe wall split — 2026-09-11

A failing unit reproduction at c6fc1d3 showed splits through doors/windows changed
their owning wall. The store now rejects crossing splits before snapshot/mutation;
edge-touching splits remain valid. Toolbar, context menu and double-click use a
shared wrapper showing a dismissible translated explanation (also cleared by
Escape). The schema still associates each opening with one wall.

Check/build pass with no Svelte diagnostics. All 943 tests in 87 unit files pass
(5.06 seconds), including unchanged data on rejection and center/width preservation
at either edge. Nine browser cases pass on Chromium, Firefox and WebKit (52.9
seconds): safe split and swing Undo, crossing door/window exact floor preservation,
Portuguese feedback and dismissal. Browser coverage exercises the floating toolbar;
context-menu/double-click entry points share the wrapper but were not separately
driven in this batch. Curved splitting and physical-device qualification remain.
Logs: `/tmp/web-split-opening-repro.log`, `/tmp/web-split-opening-check.log`,
`/tmp/web-split-opening-build.log`, `/tmp/web-split-opening-all-unit.log`,
`/tmp/web-split-opening-browser.log`.

## Context-menu keyboard focus — 2026-09-11

A Chromium regression at 394cf14 failed because the first menu action was not
focused after opening. ContextMenu now focuses its first enabled action; handles
wrapping ArrowUp/ArrowDown, Home and End; restores prior focus on Escape and action
activation; closes on Tab; and stops menu key propagation into editor shortcuts.
Focus-visible styling accompanies the existing hover style. Unused store imports
were removed.

Check/build pass with zero Svelte diagnostics. Six English/Portuguese cases pass
across Chromium, Firefox and WebKit (52.4 seconds), exercising focus, arrow wrapping,
Home/End, Escape restoration, Enter activation, menu viewport bounds and existing
annotation save/reload/edit preservation. Tab and native keyboard invocation were
not independently exercised here. Full unit baseline remains the preceding 943
passing tests; no new full unit run was needed for this component-only change.
Logs: `/tmp/web-context-keyboard-repro.log`, `/tmp/web-context-keyboard-check.log`,
`/tmp/web-context-keyboard-build.log`, `/tmp/web-context-keyboard-browser.log`.

## Keyboard invocation of context menus — 2026-09-11

At 211fb0f, Shift+F10 did not open the selected wall menu. FloorPlanCanvas now
handles Shift+F10 and ContextMenu only when the canvas owns focus. It uses the
selected furniture/wall/opening/room context, with a canvas fallback for groups
or unsupported selection types, and clamps the anchor to canvas bounds. Unlike
pointer measurement handling, keyboard invocation does not add a measurement.

Check/build pass with zero Svelte diagnostics. Twelve browser cases pass across
Chromium, Firefox and WebKit (1.4 minutes). Selected-wall tests exercise both keys,
menu Delete isolation, keyboard activation of blocked splits and exact exported
floor preservation. English/Portuguese canvas cases cover keyboard invocation,
Enter activation and Escape/Tab dismissal alongside annotation save/reload/edit.
Furniture/opening/room target branches and physical accessibility were not driven
in this batch. Logs: `/tmp/web-context-invoke-repro.log`,
`/tmp/web-context-invoke-check.log`, `/tmp/web-context-invoke-build.log`,
`/tmp/web-context-invoke-browser.log`.

## Properties action focus — 2026-09-11

A failing browser reproduction at a879f53 found zero focused controls inside the
Properties panel after keyboard activation of Properties. The action now waits
for Svelte's update and focuses the first enabled form control, provided the
canvas remains connected and the requested selection is still current. Ordinary
selection does not invoke this explicit focus transfer.

Check/build pass with zero Svelte diagnostics. Twelve Portuguese browser cases
pass across Chromium, Firefox and WebKit at 1440px and 390px (1.1 minutes). They
select doors/windows through Layers, open their context menu with Shift+F10,
activate Properties, assert panel focus, edit width and verify that only width
changes in the exported floor. Undo restores the entire original floor exactly.
Furniture/room action coverage and physical accessibility remain open.
Logs: `/tmp/web-context-properties-repro.log`, `/tmp/web-context-properties-check.log`,
`/tmp/web-context-properties-build.log`, `/tmp/web-context-properties-browser.log`.

## Room rename completion focus — 2026-09-11

At 57ac949, room menu keyboard targeting and initial rename focus worked, but
Escape left the canvas inactive after removing the field. Enter/Escape now
prevent default and focus the canvas after committing/cancelling. The blur path
retains normal focus movement to other controls.

Check/build pass with zero Svelte diagnostics. Six Portuguese browser cases pass
on Chromium, Firefox and WebKit at 1440px/390px (48.5 seconds), covering room
selection through Layers, keyboard menu rename, focus transfer, cancellation
without data changes, blur to Save without stealing focus, literal-token name
preservation and exact Undo restoration. Room material/reset/delete keyboard
flows and physical assistive-technology qualification remain open.
Logs: `/tmp/web-context-room-repro.log`, `/tmp/web-context-room-check.log`,
`/tmp/web-context-room-build.log`, `/tmp/web-context-room-browser.log`.

## Keyboard integration checkpoint — 2026-09-11

At `6a59c00`, all 943 unit tests across 87 files pass (5.66 seconds). Nine existing
English browser cases pass across Chromium, Firefox and WebKit (1.4 minutes).
Six modal cases at 1440px/390px exercise Settings, Version History, Area Summary,
Keyboard Shortcuts and Print Preview: modal focus stays contained, editor keys
preserve selected geometry and stored records, and deletion/Undo resume after
dismissal. Three room-label cases verify saved offsets, reset, drag, inline editor
anchoring and Undo after the recent rename focus change.

Logs: `/tmp/web-keyboard-integration-unit.log` and
`/tmp/web-keyboard-integration-browser.log`. No runtime changes were needed in this
checkpoint. These checks do not establish full browser, physical accessibility,
native release or Firebase migration completion.

## Room floor-material keyboard access — 2026-09-11

The existing Change Floor Texture action only selected the room. It now clears
other element selection, waits for the room panel, and focuses the selected
material with a first-choice fallback. A named material group and aria-pressed
values make the section and current choice accessible. Deferred focus checks
that the canvas and requested room are still active.

The prior-build regression found no focused control in a named material group.
Check/build pass with zero Svelte diagnostics. Six Portuguese browser cases pass
on Chromium, Firefox and WebKit at 1440px/390px (20.8 seconds), verifying keyboard
menu activation, material focus, Enter selection of light oak from no texture,
material-only floor changes and exact Undo restoration. Existing room rename,
cancel and focus cases remain in the same tests. Room reset/delete and physical
assistive-technology qualification remain open.
Logs: `/tmp/web-room-material-repro.log`, `/tmp/web-room-material-check.log`,
`/tmp/web-room-material-build.log`, `/tmp/web-room-material-browser.log`.

## Room reset/delete keyboard verification — 2026-09-11

At 87c0ea3, the browser regression found a saved room record still referencing
walls removed by Delete Room. The new store operation groups boundary removal,
opening cascades and saved metadata removal into one undo entry and clears the
deleted detected-room entry. Unrelated saved data stays intact.

Check/build pass with zero Svelte diagnostics. All 945 tests across 88 unit files
pass (3.20 seconds), including saved/detected room deletion and exact Undo/Redo.
Six Portuguese browser cases pass at 1440px/390px across Chromium, Firefox and
WebKit (24.6 seconds), checking label-offset reset, deletion of the complete
single-room fixture and exact Undo, alongside rename and material actions.
The initial deletion failure is in `/tmp/web-room-actions-browser.log`; final
logs are `/tmp/web-room-delete-unit.log`, `/tmp/web-room-delete-check.log`,
`/tmp/web-room-delete-build.log`, `/tmp/web-room-delete-browser.log`.
This does not qualify shared-boundary deletion semantics or physical accessibility.

## Preserve shared room boundaries — 2026-09-11

Two unit regressions at 20ec82b reproduced removal of walls needed by neighboring
saved/detected rooms. removeRoom now collects walls referenced by other rooms
before mutation and removes only the target's exclusive boundary. Openings on
retained walls stay intact. The existing grouped metadata deletion and Undo remain.

All four room-deletion unit cases pass. Check/build pass with zero Svelte
diagnostics. Six English browser cases pass at 1440px/390px across Chromium,
Firefox and WebKit (17.0 seconds). A connected four-room grid loses only the target
corner's two exclusive walls; the three neighboring records, shared openings and
furniture remain byte-for-byte equivalent in the exported floor. One Undo/Redo
restores each exact floor state, and neighboring rooms remain selectable in Layers.
Imported coincident/duplicate topology and physical qualification remain open.
Logs: `/tmp/web-shared-room-repro.log`, `/tmp/web-shared-room-unit.log`,
`/tmp/web-shared-room-check.log`, `/tmp/web-shared-room-build.log`,
`/tmp/web-shared-room-browser.log`.

## Unchanged room updates preserve history — 2026-09-11

A unit regression at c52980a reproduced redundant room updates consuming Undo
and clearing Redo. updateRoom now skips unchanged saved fields, equivalent label
offset coordinates, empty patches and nonexistent IDs before mutation. Newly
detected room metadata still persists when an explicit field update first saves it.

Check/build pass with zero Svelte diagnostics; all 949 tests in 89 files pass
(3.62 seconds). Six Portuguese browser cases at 1440px/390px pass across Chromium,
Firefox and WebKit (26.8 seconds). They rename, Undo, accept the unchanged original
name, then Redo the real rename and verify the exact exported floor. Existing
room reset/delete/material/focus checks remain in the same cases.
Logs: `/tmp/web-room-noop-repro.log`, `/tmp/web-room-noop-all-unit.log`,
`/tmp/web-room-noop-check.log`, `/tmp/web-room-noop-build.log`,
`/tmp/web-room-noop-browser.log`. Remaining NEXT requirements stay open.

## Unchanged furniture updates preserve history — 2026-09-11

A unit regression at ffc1923 reproduced redundant furniture updates consuming
Undo and clearing Redo. updateFurniture now skips missing IDs, empty patches,
unchanged scalars and equal position/scale coordinates before mutation. Metadata
continues through the separate item-details workflow.

All 50 furniture-interaction unit cases pass; check/build report zero Svelte
diagnostics. Three Portuguese browser cases pass across Chromium, Firefox and
WebKit (13.1 seconds). They Undo a mirror, reapply its existing color, Redo the
mirror, and verify the exact floor. Existing material IDs, dimension overrides,
rotation, appearance reset and note/cost validation also pass. This focused run
does not replace the preceding full unit checkpoint or physical qualification.
Logs: `/tmp/web-furniture-noop-repro.log`, `/tmp/web-furniture-noop-unit.log`,
`/tmp/web-furniture-noop-check.log`, `/tmp/web-furniture-noop-build.log`,
`/tmp/web-furniture-noop-browser.log`.

## Wall splitting retains room identity — 2026-09-11

A unit regression at 6698700 reproduced a wall split leaving saved room references
out of date, so room resolution lost custom identity and finishes. The split now
examines the original room boundary and substitutes the child wall IDs that
actually overlap it. This handles rooms using only part of a long wall. Historical
rooms without a resolvable boundary retain both child references as a fallback.

Check/build pass with zero Svelte diagnostics. Twenty-three focused room/wall unit
cases pass, including custom metadata, exact area and Undo for whole and partial
boundaries. Nine wall-action browser cases pass (21.8 seconds), preserving opening
guards and saved room references. Three extended save/reopen cases pass across
Chromium, Firefox and WebKit (14.5 seconds). The first reopen attempt navigated
before saving completed; the final test verifies Redo state and waits for the saved
indicator before reopening. Original floor data returns exactly with Undo.
Logs: `/tmp/web-wall-room-split-repro.log`, `/tmp/web-wall-room-split-unit.log`,
`/tmp/web-wall-room-split-check.log`, `/tmp/web-wall-room-split-build.log`,
`/tmp/web-wall-room-split-browser.log`, `/tmp/web-wall-room-reopen-browser-final.log`.
Room partition/merge identity, curved-wall splitting and physical qualification
remain open.

## Room geometry integration checkpoint — 2026-09-11

At 9620cb2, all 952 unit tests across 90 files pass (3.60 seconds). Six existing
English crossing/curved-room browser cases pass across Chromium, Firefox and
WebKit (25.0 seconds). They check exported Blender-scene slab geometry on the
active floor, both stacked floors, and after switching the active floor. No page
errors were observed. No runtime changes were needed for this checkpoint.
Logs: `/tmp/web-room-geometry-integration-unit.log` and
`/tmp/web-room-geometry-integration-browser.log`. This integrates recent saved-room
reference/history work; it does not establish native area equality, physical-device
qualification or completion of the remaining NEXT requirements.

## Wall splits preserve group membership — 2026-09-11

A unit regression at 35008de found that a split's new wall segment had no group.
The split now substitutes both child IDs at the original membership position,
inside the existing split undo entry. Three focused wall-split unit cases pass,
including copying all group members and exact Undo/Redo restoration.

Check/build pass with zero Svelte diagnostics. Three Portuguese browser cases
pass across Chromium, Firefox and WebKit (14.1 seconds), checking saved membership,
room references, slope/opening geometry, Undo/Redo and save/reopen. Physical group
gestures and broader NEXT qualification remain open.
Logs: `/tmp/web-wall-group-split-repro.log`, `/tmp/web-wall-group-split-unit.log`,
`/tmp/web-wall-group-split-check.log`, `/tmp/web-wall-group-split-build.log`,
`/tmp/web-wall-group-split-browser.log`.

## Wall coordinate history and uniform-height intent — 2026-09-11

Two unit regressions at 389aca0 reproduced redundant endpoint snapshots and a
uniform-height update being skipped when its scalar matched the sloped wall's
maximum. Wall update equality now compares point coordinates. A uniform-height
request remains an actual edit whenever either endpoint height differs.

All 43 focused wall-editing/profile unit cases pass, including exact Undo/Redo for
unchanged endpoints and Undo of flattening. Check/build pass with zero Svelte
diagnostics. Three existing Portuguese wall-control cases pass across Chromium,
Firefox and WebKit (16.3 seconds), exercising connected length edits, invalid
drafts, height controls, reversal and curve toggling. Broader device/release
qualification remains open.
Logs: `/tmp/web-wall-noop-repro.log`, `/tmp/web-wall-noop-unit.log`,
`/tmp/web-wall-noop-check.log`, `/tmp/web-wall-noop-build.log`,
`/tmp/web-wall-noop-browser.log`.

## Wall-height integration checkpoint — 2026-09-11

At f54d739, all 955 unit tests across 90 files pass (3.63 seconds). Three existing
English sloped-wall browser cases pass across Chromium, Firefox and WebKit (22.3
seconds). They cover valid/invalid endpoint height edits, Undo/Redo, reversed wall
and opening values, elevation labels, exact floor preservation after save/reload,
stacked-3D entry and active-floor switching. No page errors or external requests
were observed. The 3D portion checks workflow entry, not pixel-perfect geometry.
No runtime changes were needed. Logs: `/tmp/web-wall-height-integration-unit.log`
and `/tmp/web-wall-height-integration-browser.log`. Remaining NEXT requirements,
including physical-device and native release qualification, remain open.

## Curved wall splitting — 2026-09-11

The store previously rejected every curved-wall split. It now subdivides the
quadratic path exactly with interpolated control points, remaps opening parameters
and sloped endpoint heights, and preserves group and saved-room references. Room
reference matching uses the original wall facets, including partial boundaries.
Opening clearance is evaluated on the proposed child paths so width checks follow
curve distance rather than chord distance. Toolbar, context-menu and double-click
entry points share the supported store operation.

All 958 unit tests across 90 files pass (3.65 seconds). New cases compare sampled
points along the original and subdivided curves, heights, opening fields, metadata
and Undo; door/window guards distinguish chord distance from curve distance.
Check/build pass with zero Svelte diagnostics. Twelve Portuguese browser cases
pass across Chromium, Firefox and WebKit (54.4 seconds), including straight and
curved splits, control points, openings, room/group references, Undo/Redo and
save/reopen. Browser curved-split activation uses the floating toolbar; the shared
context-menu/double-click paths and physical gestures were not separately driven.

The analytic curve remains exact, but each child gets the viewer's fixed facet
count, so rendered approximation and calculated polygon area can become finer.
Pixel-level 3D and physical-device qualification remain open.
Logs: `/tmp/web-curve-split-repro.log`, `/tmp/web-curve-split-all-unit.log`,
`/tmp/web-curve-split-check.log`, `/tmp/web-curve-split-build.log`,
`/tmp/web-curve-split-browser.log`.

### 2026-09-11: Curved split keyboard integration

The Portuguese curved-split browser case now opens the selected wall's context
menu with Shift+F10, activates Split with Enter and verifies canvas focus returns.
Its existing geometry, opening, room/group, Undo/Redo and save/reopen checks pass
in Chromium, Firefox and WebKit. Together with the existing unsplit curved-opening
3D mesh checks, six cases pass (46.6 seconds).
Log: `/tmp/web-curve-split-integration-browser.log`.
Exported 3D meshes after a curved split and physical gestures remain unqualified.

### 2026-09-11: Exported geometry after curved splitting

The curved-opening mesh browser test now also splits the lower floor's curved
wall through the toolbar before entering 3D. Raycasts through the exported mesh
verify the sampled door aperture (including trim), window aperture and solid wall
at the split. Trim remains along the curve. The same aperture checks pass for the
split lower floor and unchanged upper floor while stacked and after switching the
active floor. Three cases pass across Chromium, Firefox and WebKit (17.1 seconds).
Log: `/tmp/web-curve-split-mesh-browser.log`.
This closes the preceding exported-mesh check; physical gestures and pixel-level
rendering remain unqualified. No runtime changes were required.

### 2026-09-11: Furniture context-menu mirroring and stacking history

A browser reproduction confirmed Flip Horizontal clamped negative scale to 0.2,
shrinking the furniture instead of mirroring it. Scaling now retains each axis's
sign, bounds its magnitude, rejects nonfinite values and uses the existing
unchanged-update guard. Bring to Front and Send to Back previously mutated the
array directly; both now use an undoable store operation. An unchanged end position
or missing item does not create history or discard Redo.

All 960 unit tests across 90 files pass (3.92 seconds); check/build pass with zero
Svelte diagnostics. Six browser cases pass across Chromium, Firefox and WebKit
(21.8 seconds), covering context-menu mirror data, front/back ordering, exact
Undo/Redo and the existing Portuguese furniture-properties workflow. Pixel-level
overlap appearance and physical-device interactions remain separate checks.
Logs: `/tmp/web-context-furniture-repro.log`, `/tmp/web-context-furniture-all-unit.log`,
`/tmp/web-context-furniture-check.log`, `/tmp/web-context-furniture-build.log`,
`/tmp/web-context-furniture-browser.log`.

### 2026-09-11: One-step Undo for rotated furniture placement

A Chromium reproduction placed a sofa at 30 degrees and showed that Undo left
the sofa at zero degrees. The canvas created the item and rotated it as separate
history mutations. The placement path now encloses creation, initial rotation and
selection in an Undo group, closed in finally. Zero-degree placement retains its
one-step behavior.

Six browser cases pass across Chromium, Firefox and WebKit (21.4 seconds), checking
zero/30-degree placement, exact pre-placement floor restoration on Undo and exact
placed state on Redo. Check/build pass with zero Svelte diagnostics. Wall-snapped
placement uses the same group but was not separately driven; physical-device
gestures remain unqualified.
Logs: `/tmp/web-rotated-placement-repro.log`, `/tmp/web-rotated-placement-check.log`,
`/tmp/web-rotated-placement-build.log`, `/tmp/web-rotated-placement-browser.log`.

### 2026-09-11: Wall-snapped placement and persistence

The placement browser test now also imports a vertical wall, starts a sofa preview
at 30 degrees and places it near the wall. The exported sofa aligns at 270 degrees
and its center is 55cm from the wall centerline: 10cm wall half-thickness plus
45cm sofa half-depth. One Undo restores the entire prior floor; one Redo restores
the final placement. All zero-degree, 30-degree and wall-snapped cases now save
and reopen the project, comparing all exported floors with the placed state.
Nine cases pass across Chromium, Firefox and WebKit (33.6 seconds).
Logs: `/tmp/web-wall-placement-browser.log`, `/tmp/web-placement-persistence-browser.log`.
No runtime change was required. This qualifies the sampled straight-wall case;
physical touch and broader visual/device behavior remain open.

### 2026-09-11: Furnished room-template drag placement

The room-template cards emitted `room-template` drag data, but the canvas only
handled empty room presets. A Chromium reproduction dragged a bedroom card and
exported zero walls. The canvas now resolves the template and its preset and
calls the same grouped placement function used by clicking the card.

Nine browser cases pass across Chromium, Firefox and WebKit (19.2 seconds).
The drag case checks four walls at the offset drop location, the five bedroom
catalog IDs, a furniture offset, exact Undo/Redo and saved/reopened floors. Existing
Portuguese room-choice click cases pass at desktop and phone widths. Check/build
pass with zero Svelte diagnostics. The drag case uses desktop mouse input;
physical touch dragging remains unqualified.
Logs: `/tmp/web-template-drop-repro.log`, `/tmp/web-template-drop-check.log`,
`/tmp/web-template-drop-build.log`, `/tmp/web-template-drop-browser.log`.

### 2026-09-11: Default furnished-room layout corrections

Catalog-footprint checks reproduced wall crossings in living/bedroom/office
templates and furniture overlap in kitchen/dining templates. Placement also
discarded every template rotation. Layout offsets and orientations now keep the
default 400×300cm rooms' furniture inside the wall faces without overlap.
Dining chairs face the table, office seating faces the desk, and wall storage
faces into the room. Placement applies rotations within the existing Undo group.

All 967 unit tests across 91 files pass (3.82 seconds), including each default
layout's footprint bounds/overlap and rotated placement with exact Undo/Redo.
Nine browser cases pass across Chromium, Firefox and WebKit (20.1 seconds),
including updated bedroom rotations in drag placement and save/reopen. Check/build
pass with zero Svelte diagnostics. These bounds checks do not qualify circulation,
arbitrary room dimensions, rendered-model fidelity or physical-device usability.
Logs: `/tmp/web-template-layout-repro.log`, `/tmp/web-template-layout-all-unit.log`,
`/tmp/web-template-layout-check.log`, `/tmp/web-template-layout-build.log`,
`/tmp/web-template-layout-browser.log`.

### 2026-09-11: Door/window drops follow curved walls

A Chromium reproduction dragged a door onto the middle of a bowed wall and
exported no door. The duplicated door/window handlers measured distance to the
endpoint chord, 300cm away in this fixture. Both now share a closest-path helper.
It considers endpoints and stationary points of squared distance to the quadratic,
isolating roots between derivative roots. Saved positions remain quadratic
parameters; the existing 5% endpoint margin and strict 100cm drop radius remain.

All 976 unit tests across 92 files pass (3.84 seconds), including off-grid curve
parameters, competing wall targets, straight/end-margin behavior, degenerate walls
and multiple minima. Nine browser cases pass across Chromium, Firefox and WebKit
(21.9 seconds), checking curved door/window drop IDs, positions, unchanged walls,
exact Undo/Redo and the existing Portuguese opening catalog workflow. Check/build
pass with zero Svelte diagnostics. This changes drag placement; physical touch and
broader geometry/render qualification remain separate.
Logs: `/tmp/web-curved-drop-repro.log`, `/tmp/web-curved-drop-all-unit.log`,
`/tmp/web-curved-drop-check.log`, `/tmp/web-curved-drop-build.log`,
`/tmp/web-curved-drop-browser.log`.

### 2026-09-11: Continuous curved-wall selection and opening positions

Unit reproductions showed clicks on long curves missed between the old 20 sample
points at normal/high zoom, while opening positions snapped to a 40-point grid.
The quadratic projection helper now serves hit testing, opening positioning and
drop placement. The original curve hit radius and placement endpoint limits remain.
Straight-wall hit testing retains its existing segment calculation.

All 983 unit tests across 93 files pass (3.82 seconds), including off-grid curve
points at two zoom levels, continuous parameters and hit-radius/endpoint limits.
Fifteen browser cases pass across Chromium, Firefox and WebKit (54.1 seconds),
covering door/window click/drop, exact Undo/Redo and the existing curved split
save/reopen workflow. Check/build pass with zero Svelte diagnostics. Physical
gestures and sustained editing performance remain separate qualification work.
Logs: `/tmp/web-curve-hit-repro.log`, `/tmp/web-curve-hit-all-unit.log`,
`/tmp/web-curve-hit-check.log`, `/tmp/web-curve-hit-build.log`,
`/tmp/web-curve-hit-browser.log`.

### 2026-09-11: Curve lookup cost and dimension-control naming

A synthetic 40/400-curve benchmark measured the new exact lookup before/after a
conservative bounds rejection. See the [measurement](../curved-wall-hit-performance.md)
for timings, command and exclusions. Nearby curves still use exact projection.

The broader idle browser run found two visibility checkboxes named Dimensions:
saved dimension annotations and automatic dimensions. The latter is now named
Automatic dimensions / Dimensões automáticas. Idle and fit tests select the
intended control explicitly. All 983 unit tests pass (3.68 seconds), check/build
pass with zero Svelte diagnostics, and 21 browser cases pass across all three
engines (1.4 minutes). Physical device/frame-time qualification remains open.
Logs: `/tmp/web-curve-hit-bounds-all-unit.log`, `/tmp/web-curve-hit-bounds-check.log`,
`/tmp/web-curve-hit-bounds-build.log`, `/tmp/web-curve-hit-bounds-browser.log`.

### 2026-09-11: Cancelled touches and drags are not taps

The canvas used the same completion handler for touchend and touchcancel. A
Chromium reproduction showed cancellation after a tap emitted another click and
a double-click. Cancellation now clears pinch/tap state and releases an active
mouse gesture without synthesizing clicks. Single-finger motion beyond 10 screen
pixels marks a drag and breaks the tap sequence even when it returns to the start.
Pinch initiation also breaks the sequence. Normal double-taps still emit dblclick.

Nine browser cases pass across Chromium, Firefox and WebKit (26.6 seconds),
checking cancelled/dragged/completed tap event sequences, pinch/pan redraw and idle
behavior, and delayed tracing images across floor changes. Check/build pass with
zero Svelte diagnostics. Touch lists are synthetic; physical iPhone/iPad gestures
and OS interruption behavior remain unqualified. Cancellation releases the drag;
it does not roll back edits already made while the finger was down.
Logs: `/tmp/web-touch-cancel-repro.log`, `/tmp/web-touch-cancel-check.log`,
`/tmp/web-touch-cancel-build.log`, `/tmp/web-touch-cancel-browser.log`.

### 2026-09-11: Broader browser audit and room-coordinate synchronization

The 1,050-case browser run at `78d3ad0` stopped after 55 Chromium passes when the
floor-switch room-label case opened Room 3,3 while expecting Room 1,1. Newly
visited floors queue their initial camera fit before a subsequent draw. The test
now waits for that frame sequence before using recorded label coordinates and
attaches its observed coordinates for diagnosis. Exact room-name and cross-floor
rename checks remain unchanged. No persistent runtime geometry defect was
established by the subsequent checks, so no editor code was changed here.

The focused case passes across all three engines (12.6 seconds), followed by
three repetitions per engine: nine passes (37.2 seconds). The broader suite is
not yet qualified. Catalog manifest validation also passes.
Logs: `/tmp/web-full-browser-audit.log`, `/tmp/web-room-floor-hit-browser.log`,
`/tmp/web-room-floor-hit-repeat.log`, `/tmp/web-catalog-audit.log`.

### 2026-09-11: Save/import completion in slope and elevation qualification

The audit resumed with 995 cases after explicitly excluding the 55 verified
Chromium passes. It passed 47 more before the sloped-wall test reloaded during
Save and read an earlier saved wall state. The test now waits for Saved ✓ before
reload. The elevation test also waits for save completion (the status text is
hidden on phone layouts), and waits for the imported-copy project name before
selecting its upper floor. This prevents a floor selection on the outgoing plan
from racing the asynchronous import.

All nine slope/elevation cases pass across Chromium, Firefox and WebKit
(1.5 minutes), retaining exact exported-floor comparisons and stacked-view checks.
No editor runtime code changed. The full 1,050-case audit remains incomplete.
Logs: `/tmp/web-full-browser-audit-2.log`,
`/tmp/web-editor-save-confirmation-browser.log`.
The audit's first-pass exclusion list is `/tmp/web-browser-audit-passed.txt`;
it contains 55 cases and has not yet incorporated the second run's 47 passes.

### 2026-09-11: Geometry drag coordinates after panel/fit redraws

The third audit run excluded 111 verified cases and ran the remaining 939. It
passed 27 Chromium cases before the curve-handle drag made no geometry change.
A diagnostic screenshot before dragging showed the selected handle and allowed
the same drag to pass. The test now waits for the queued resize/fit redraws before
reading its canvas coordinate markers, rather than relying on the first frame
counter increment. Its geometry-change and exact Undo/Redo assertions remain.

All 21 geometry-drag cases pass across Chromium, Firefox and WebKit (46.1 seconds).
No persistent curve-handle runtime defect was established, and no editor code was
changed. The union of the three audit logs and completed slope/elevation and
geometry follow-ups contains 154 distinct passes; full qualification is unfinished.
Logs: `/tmp/web-full-browser-audit-3.log`, `/tmp/web-curve-handle-repro.log`,
`/tmp/web-geometry-drag-fit-browser.log`.
The current exclusion list has 111 entries; add the third run and geometry
follow-up passes before the next continuation.

### 2026-09-11: Localized panel selector in modal qualification

The fourth audit run excluded 154 verified cases. It passed 47 more Chromium
cases before the Portuguese phone RoomPlan/modal case searched for the English
Toggle tools panel name. The selector now uses Alternar painel de ferramentas
for Portuguese, matching the shipped interface. All 12 EN/PT desktop/phone-width
cases pass across three engines (20.9 seconds), retaining cancellation, saved-data
preservation and modal focus assertions. No runtime code changed.

The accumulated audit/follow-up logs now contain 210 distinct passes out of 1,050.
Logs: `/tmp/web-full-browser-audit-4.log`, `/tmp/web-modal-localized-panel-browser.log`.
The exclusion list still has 154 entries; add these two logs before resuming.

### 2026-09-11: Visible target for phone group dragging

The fifth audit run excluded 210 verified cases. Its desktop group case passed,
but the phone case attempted to drag the L stair under the open Properties sheet.
The failure screenshot showed the sheet covering the target. The test now uses
Fit selection after selecting the group and checks that elementFromPoint at the
drag origin is the canvas. Group bounds, equal movement of unlocked members,
unchanged locked members and exact Undo checks remain intact.

All six desktop/phone-width cases pass across Chromium, Firefox and WebKit
(16.3 seconds). No runtime code changed. Accumulated audit/follow-up coverage is
216 distinct cases out of 1,050; full qualification remains unfinished.
Logs: `/tmp/web-full-browser-audit-5.log`, `/tmp/web-group-visible-drag-browser.log`.
The exclusion list still has 210 entries; add these logs before resuming.

### 2026-09-11: Portuguese count in print qualification

The sixth audit run excluded 216 verified cases and passed 48 more Chromium
cases. The Portuguese print test then expected 1 room although the canvas now
correctly displays 1 ambiente. Updating that expectation lets the existing paper
ratio, invalid-scale blocking, PDF bytes/room schedule, translated captions and
dialog-close checks run. All three engines pass (34.2 seconds).

No runtime code changed. Accumulated audit/follow-up coverage is 267 distinct
cases out of 1,050; full qualification remains unfinished.
Logs: `/tmp/web-full-browser-audit-6.log`, `/tmp/web-print-count-localization-browser.log`.
The exclusion list still has 216 entries; add these logs before resuming.

### 2026-09-11: Complete Chromium audit checkpoint

The seventh continuation excludes the 267 previously verified cases and runs
the remaining 783. It completed all remaining Chromium cases and proceeded to
Firefox without a failure. Deduplicating project, relative spec path and test
title across the seven audit logs and the focused follow-ups verifies all 350
Chromium cases in the current 1,050-case inventory. Source line numbers are
excluded from identity because test synchronization edits shifted them.

The production runtime remains at `78d3ad0`; subsequent changes through
`d6e33d1` adjust test synchronization, visible input targets and translated
expectations. The seventh run remains active in
`/tmp/web-full-browser-audit-7.log`, using the 267-entry exclusion list at
`/tmp/web-browser-audit-passed.txt`. Firefox and WebKit are not yet fully
qualified. Physical-device and release gates remain open.

### 2026-09-11: Complete Firefox audit checkpoint

The same seventh continuation completed the remaining Firefox cases and moved
into WebKit. Deduplicating the audit and focused follow-up logs now verifies
350 Chromium and 350 Firefox cases. The seventh run itself reached 450 passes
before starting WebKit, with no failure. This includes Firefox's resource cleanup,
walkthrough timing/input release, storage recovery, exports and wall editing.

Later Firefox cases ran more slowly than earlier cases but completed within their
configured limits. These automated results do not establish hardware performance
budgets. The original run remains active; no restart or timeout increase was used.
Log: `/tmp/web-full-browser-audit-7.log`. The 267-entry exclusion list remains the
one used to start that run. WebKit, physical-device and release gates remain open.

### 2026-09-11: Project service diagnostic translation, browser validation pending

Known storage-full, unavailable-storage, save failure, cross-tab conflict and
project-opening failure messages now translate when rendered. The shared import
alert handles nested save-before-open causes and the no-import outcome. Save
banners, library errors/actions and editor load recovery use the same mapper.
English service messages remain unchanged, and unknown details are displayed
verbatim through Svelte text interpolation. Language subscriptions update these
messages without mutating projects, storage or the underlying diagnostics.

Four unit cases pass using actual storageErrorMessage/ProjectConflictError
outputs, composed opening failures, unknown details and either language's welcome
outcome suffix. Svelte checking reports zero errors and zero warnings. Logs:
`/tmp/web-project-service-messages-unit.log` and
`/tmp/web-project-service-messages-check.log`.

This batch has not yet been built or browser-qualified. The seventh browser audit
remains active against the unchanged production build from `78d3ad0`; its passes
must not be attributed to this new source change. After it finishes, build and
exercise Portuguese quota-blocked import/New Project, JSON backup/retry and live
language changes, together with the existing project-opening/save recovery cases
across all three engines. Keep the audit's 1,050-case inventory separate from any
new browser coverage added for this batch.

The separate `tests/browser/project-service-localization.spec.ts` is prepared and
collects six cases (desktop/phone widths in each engine). It checks the actual
IndexedDB quota boundary, exact retained library bytes, translated opening and
save alerts, language changes while Settings is open, backup geometry, successful
retry and a later separate imported copy. No existing audit spec was changed.
`/tmp/web-project-service-localization-inventory.log` proves collection only;
these six cases have not been executed. They increase the next full inventory to
1,056 while the already-running seventh audit retains its original inventory.

Full unit verification at `d8cbd54`: `npm test` completed with 985 passes and two
five-second timeouts (wall texture recovery's dynamic-import case and the crafted
pooled-history attachment expansion bound). No assertion mismatch was reported.
The complete retry, `npx vitest run --maxWorkers=1`, passed all 987 tests across
94 files in 232.60 seconds, using unchanged timeouts and assertions. This is
consistent with contention in the parallel run, rather than proof of a runtime
defect. No test or production code was changed to obtain the retry result.
Logs: `/tmp/web-project-service-messages-full-unit.log` and
`/tmp/web-project-service-messages-serial-unit.log`.
The production build and browser checks for the new translation batch remain
pending while the original WebKit audit runs.

### 2026-09-11: Native form-history boundaries in keyboard qualification

The seventh audit passed 577 cases in 52.8 minutes before WebKit's item-notes
test expected Undo to remove only its paste. Chromium/Firefox did so, but a plain
textarea showed WebKit grouping the newline differently. Adding the same prior
numeric typing and rejected drafts to a plain HTML form reproduced the exact
application result: the initial note returned and the width draft became blank.
This reproduction had no application scripts or keyboard handlers.

The test now saves and verifies the numeric edit, reloads, and then independently
tests clipboard/history behavior with fresh native form history. It asserts
native input historyUndo/historyRedo events and exact pasted-text restoration,
retains the width assertion, and retains full saved floors/settings comparisons.
All six cases pass across three engines (3.7 minutes) against the unchanged
`78d3ad0` production runtime. No editor runtime fix was made for this finding.

The first diagnostic follow-up passed four cases but reproduced WebKit's grouped
numeric draft undo in both widths. Logs:
`/tmp/web-full-browser-audit-7.log`,
`/tmp/web-item-notes-native-history-browser.log`, and
`/tmp/web-item-notes-isolated-history-browser.log`.
The seventh audit is terminal. Including its passes and the successful follow-up
gives 846 distinct cases in the original 1,050-case inventory, leaving 204.
The translation build/qualification is now the next batch; preserve the distinction
between the old runtime audit and the new source's six additional recovery cases.
