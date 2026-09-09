# Reuse room polygons in the 2D editor — 2026-09-09

The 2D editor now retains the polygons produced by its existing floor/geometry
change detection. Room fills, labels, hit testing, rename placement and selected
furniture room dimensions read the same polygon map. Previously these paths
reconstructed the full intersection graph repeatedly while drawing or handling
pointer input.

The existing hash includes floor ID, walls and saved room metadata. Active-floor
updates refresh rooms and polygons together before interaction; clearing the floor
clears both. Transient room IDs are preserved through the shared geometry API.
Local name/label updates can use the same geometry without changing those IDs.
Renderer and hit-test helpers still support callers without a supplied map.

## Verification

All **680 unit tests** passed; a final targeted run also exercised the optional
benchmark callback after the shared API gained its previous-room parameter.
Svelte checks reported zero errors and warnings, and the production build passed.
The new unit regression confirms stable transient room IDs and correct hit tests
in the newly included bulge after an in-place curve edit.

All **ten browser checks** passed across Chromium and WebKit: eight existing
checks for canvas idle/wakeup, display/tools/history, floor switches, late tracing
images, simulated touch pan/pinch and overlapping-room exports, plus two room
selection/rename checks. The rename test verifies independent names on two floors
and restoration when switching back. It locates rendered labels and interacts
with the actual Room name input.

The initial direct-double-click variant revealed a separate layout interaction:
selection can open the properties panel, moving the canvas before the second
click. In WebKit the second click reached the adjacent room. The final test first
selects, waits for the redraw and then double-clicks the updated label position.
Direct-double-click behavior during sidebar layout changes remains an open
usability issue; this batch does not claim to fix it.

This removes repeated geometry work from these paths, but no new browser FPS,
active-editing latency or physical-device budget is claimed. See the earlier
[room computation measurements](room-geometry-reuse-validation.md) for the cost
of repeated graph construction in local Node fixtures.
