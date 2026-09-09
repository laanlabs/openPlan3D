# Editor keyboard and component cleanup

September 9, 2026. Local continuation of the maintenance backlog in `NEXT.md`.

## Changes and reproduced behavior

- Context-menu element binding is reactive, so the positioning effect measures
  the mounted menu and keeps its right/bottom edges within the viewport.
- Catalog and Recent favorites are native buttons beside the placement button,
  with an item-specific accessible name and pressed state. This removes nested
  interactive controls and obsolete Svelte suppression comments.
- Browser regression checks reproduced the canvas Space-pan handler cancelling
  native favorite activation. Focused buttons/links/menu items now retain Space,
  Enter and Tab behavior. Canvas keyboard shortcuts remain available on the canvas;
  the existing field and modal protections remain in place.
- Room names and text annotations have named inline fields with explicit focus
  after the initiating mouse event. Immediate focus during annotation placement
  was reclaimed by the canvas's default mousedown action, closing the field.
  A cancellable animation-frame action fixes this and avoids focus after unmount
  or while a modal is open. Dimension-label editing uses the same action.
- Removed the unused MaterialPicker component and its stale ThreeViewer state.
  The current UI edits wall materials through Properties. Its hidden state could
  consume Escape after wall selection before leaving edit mode.

## Validation

- `NODE_ENV=production npm run check`: zero errors and zero warnings (previously
  seven warnings in four components).
- `NODE_ENV=production npm test`: 654 tests pass across 42 files.
- `NODE_ENV=production npm run build`: passes.
- New browser tests exercise catalog/Recent favorite activation, persistence and
  placement isolation, keyboard focus traversal, annotation focus/commit and
  context-menu viewport bounds: all nine engine/scenario combinations pass.
  macOS WebKit uses Option+Tab to include buttons when full keyboard access is off;
  the test follows that native convention instead of asserting a different preference.
- The combined new/existing modal suites pass all 30 scenarios in Chromium,
  Firefox and WebKit, including desktop/phone widths, field Backspace deletion,
  modal shortcut isolation and editor deletion/undo.

## Follow-up: WebKit Backspace navigation

The two modal failures initially attributed to Tab reproduced on unchanged
`2ddec7a`. Per-key navigation instrumentation subsequently showed that Backspace
on the Settings close button navigated WebKit to `about:blank`; the old test only
noticed on the following Tab check. The `web-inspector://bootstrap.js` security
error was emitted after navigation, not evidence of a dialog or Tab root cause.
The dialog action now prevents Backspace's default navigation outside editable
fields; the editor's handled deletion also prevents the browser default. Tests
assert dialog/URL state after each key and verify ordinary field text deletion.
Installed runtime: Playwright 1.63.0, WebKit 26.6 build 2359 on macOS.

The canvas keyup handler also always releases held Space after focus moves to a
control; its new keydown protection must not suppress input release.

The initial browser run could not launch because this computer lacked the pinned
Playwright browsers; they were installed locally. Subsequent behavioral failures
exposed the Space and immediate-focus defects above and were fixed before reruns.

This is local source work on the existing render-lab branch, without merge or
production deployment. Browser-engine checks do not establish physical iPhone/iPad
qualification, active-rendering hardware budgets or native capture calibration.
