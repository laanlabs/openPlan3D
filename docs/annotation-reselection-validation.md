# Saved annotation groups and Shift-click — 2026-09-10

Clicking a note, measurement or dimension belonging to a saved group now selects
that group's members. The same press can begin a group drag using the shared
position capture and existing Undo gesture. Ctrl/Cmd-click targets one annotation
without expanding its saved group.

Shift-click adds or removes an individual annotation. The clicked member is
removed from primary selection when toggled off, and a single remaining member
uses normal single-selection state. Deleting it therefore clears selection fully.
Annotation Shift-click is handled before the existing Shift-pan path; Space,
explicit pan mode, and Shift on empty canvas retain their pan behavior.

## Browser coverage

`tests/browser/annotation-reselection.spec.ts` runs at desktop and phone widths.
It creates a group through Ctrl/Cmd+G, deselects it, and reopens it by clicking each
of the three annotation types. Exact exported floor comparisons prove selection
alone leaves geometry and group membership unchanged. Dragging from a deselected
note translates the group's measurement and dimension endpoints by the same
delta; one Undo restores the complete floor.

The test then selects a single note with Ctrl/Cmd-click, adds a measurement and
dimension with Shift-click, removes members again, and deletes the remaining
measurement. The other annotations remain unchanged, Fit Selection becomes
disabled, and Undo restores the complete floor including its saved group.

Existing annotation group drag and auxiliary selection regressions also run.

## Results

All 16 Chromium/WebKit workflows passed. Svelte checks completed with zero
errors and warnings, and the production build passed. Checks and build were run
sequentially to keep SvelteKit's generated server/client assets consistent.

## Remaining work

Annotation rotation/alignment, independent note visibility, wider consistency of
object modifier selection, physical touch qualification, and export/native parity
remain open. Native app code is unchanged.
