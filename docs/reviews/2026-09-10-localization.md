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
