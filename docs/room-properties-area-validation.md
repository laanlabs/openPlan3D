# Current room areas in Properties

Room Properties now resolves its selected room against current walls, retaining
boundary-matched metadata while recalculating area. It previously preferred the
saved room object and could show an obsolete area even when canvas labels and
Area Summary were correct. Orphaned room metadata no longer produces properties
for a room that no longer has a detected boundary.

The nested browser fixture imports three saved 999 m² areas. Opening each room's
name editor now checks that Properties shows 20, 12, and 4 m² respectively, with
no stale 999 m² value. The workflow also checks the saved names, nested area
summary, label dragging/undo, and image/scene exports.

All 923 unit tests, Svelte checks (zero errors/warnings), and build passed. Five
of six Chromium/WebKit workflows passed initially, including the new Properties
checks in both browsers. The existing Chromium floor-switching workflow exceeded
its 60-second timeout while opening 3D during a slow local run. An isolated rerun
with a 180-second limit passed in about 78 seconds; no source change was needed.

Remaining building work includes explicit courtyard/stair openings, native nested
geometry, full label collision handling, and physical measurement qualification.
