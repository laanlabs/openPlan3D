# Preserve double-click targets across sidebar changes — 2026-09-09

A native double-click in Select mode now keeps the floor coordinates of its first
press. Selection may open a properties panel and resize the canvas between clicks;
previously the second press could select another element, and the double-click
handler then acted on the room now beneath that screen pixel.

The second native press in the same nearby click sequence skips ordinary selection.
The double-click uses the original point for text annotation editing, room rename
and wall splitting, then clears the saved point. It is scoped to Select mode,
the same floor and a nearby pointer position. Ruler guides retain their screen
behavior; drawing/panning modes and synthetic touch events keep their existing
paths. No arbitrary double-click timer is introduced.

## Verification

The preceding batch reproduced the failure in WebKit: a direct double-click on
Room 1,1 opened the name editor for Room 2,1 after the sidebar resized the canvas.
Its temporary test workaround selected first and clicked the updated label later.
That workaround is now removed. The regression uses one direct double-click at
the rendered label, expects the correct Room name input, renames independently
on two floors, and verifies the original name when returning to the first floor.

Physical-device double-tap qualification remains open; this change specifically
addresses native mouse click-count events and their selection/layout race.

Final validation passed **680 unit tests in 49 files**, Svelte checks with zero
errors and warnings, and the production build. All **eight Chromium/WebKit browser
checks** passed: direct rename across floors, idle/wakeup after tools, geometry,
history and display changes, delayed tracing images and simulated touch pan/pinch.
The two direct-double-click regressions also passed in the initial targeted run.
