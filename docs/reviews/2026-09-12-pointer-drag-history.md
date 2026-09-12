# History shortcuts during pointer drags

A new Chromium reproduction confirms that pressing Undo while a room-label
press is still held leaves the label displaced by 60 pixels after mouseup.
The pending label offset was committed after history replay. The canvas now
finishes its active pointer gesture before applying Undo/Redo shortcuts, so
mouseup cannot overwrite the restored state. This is a separate reproduced
failure; it does not establish the cause of the earlier intermittent nested-room
Undo failure after a completed mouse release.

The new regression covers interrupted label dragging and Redo. Seven geometry
workflows also exercise Undo while pressed, exact exported geometry restoration,
Redo, and subsequent Undo/Redo. Existing mouse-release cases remain intact.
The pre-fix Chromium case failed in 15.6 seconds (session `35372`, exit 1;
`/tmp/web-label-mid-drag-undo-before.log`). Type checking reports zero errors
and warnings; the production build passed (session `31291`, exit 0).
The pre-change full unit checkpoint passed 1,037 tests in 99 files in 3.42 seconds
(session `92756`, exit 0; `/tmp/web-sept12-full-unit.log`). The same full suite
also passed on `df4dfa4`: 1,037 tests in 99 files, 30.12 seconds (session `66523`,
exit 0; `/tmp/web-mid-drag-history-unit.log`).

Elevation uses its own `endDrag` handler; its capture-phase keyboard listener
currently handles Escape only. A separate elevation Undo-while-held regression
is prepared in `tests/browser/elevation-drag.spec.ts` for execution after the
active suite. It has not yet been run and is not evidence of a confirmed defect.

The 48 focused browser cases are active in session `26654`, log
`/tmp/web-mid-drag-history-browser.log`. Poll that process before another browser
run or rebuild. The 1,116-case qualification below applies to runtime `03e0ae1`,
not this new source change. Broader NEXT requirements remain open.

