# Canvas accessible-name qualification

The drawing canvas now exposes its accessible name in the selected language.
English remains “Floor plan editor canvas”; Portuguese is “Área de edição da
planta baixa”. The desktop/phone canvas-hint cases explicitly verify the Portuguese
name before drawing a wall and checking its JSON export. Seventeen affected test
files use bilingual selectors or drawing instrumentation.

All **141 affected browser cases, 47 per engine**, have passing evidence. Exact
project/file/test identity comparison against the original inventory found no
missing or extra cases. This is staged qualification across the builds below,
not one uninterrupted run of the whole browser suite.

## Runs and source versions

| Run | Runtime source | Result |
| --- | --- | --- |
| Initial affected-file run | `70b862b` canvas label | 19 Chromium passes; room-keyboard test exceeded 60 seconds; 121 unrun |
| Focused timeout reproduction | Same canvas build | Desktop timeout reproduced; remaining run interrupted |
| Bounded room-keyboard run | `1227165` panel cleanup | Six passes across three engines, 4.4 minutes |
| Exact remaining-case continuation | Same panel-cleanup build | 116 passes, 28.5 minutes |

The room-keyboard regression chains repeated JSON exports, edits, label reset,
deletion, material choices and Undo/Redo checks. Traces reached the deadline during
export after earlier assertions passed. Its bounded slow-test allowance retains
every assertion. Chromium desktop then passed in 1.4 minutes. The timeout change
is committed in `6ed74bd`.

During qualification, source review found four subscriptions in UndoHistoryPanel
and SettingsDialog that were not released when the components were destroyed.
They now register their unsubscribe callbacks with `onDestroy`. Svelte checking
reported zero errors/warnings and the production build passed before the focused
rerun and continuation. No direct memory profiling result is claimed.

## Coverage and limits

After the browser continuation finished, the current source passed all **1,025
unit tests in 94 files** with `npx vitest run --maxWorkers=1` (125.13 seconds).
Log: `/tmp/web-canvas-cleanup-full-unit.log`. Runtime source was unchanged during
that run. All browser and unit processes from this qualification are terminal.

Affected cases cover accessible naming, drawing, straight/curved wall splits,
opening placement, catalogs, symbols, property editing, keyboard focus, modal
cancellation, floor navigation, camera fitting, room templates and Undo behavior.
The 25 identities from the initial/focused runs were excluded from the 116-case
continuation; the final union exactly equals the 141-case inventory.

This does not qualify the entire browser suite against the latest source. It also
does not establish physical screen-reader usability, physical touch behavior,
device performance or completion of native/release requirements in NEXT.md.

## Local evidence

- `/tmp/web-canvas-label-inventory.log`: original 141-case inventory.
- `/tmp/web-canvas-label-browser.log`: initial run and timeout.
- `/tmp/web-canvas-room-keyboard-repro.log`: focused reproduction/interruption.
- `/tmp/web-canvas-room-keyboard-bounded.log`: six passing cases.
- `/tmp/web-canvas-label-remaining.txt`: selected continuation identities.
- `/tmp/web-canvas-label-continuation-inventory.log`: confirmed 116-case selection.
- `/tmp/web-canvas-label-browser-2.log`: 116 passing continuation cases.
- `/tmp/web-canvas-label-completed.txt`: exact final 141-identity union.
- `/tmp/web-panel-cleanup-check.log` and `/tmp/web-panel-cleanup-build.log`: final
  runtime application checking and build.
