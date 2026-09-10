# Annotation layer visibility — 2026-09-10

Text notes now have visibility controls in Layers and the canvas layer menu.
The canvas menu also exposes offset dimensions. Notes, measurements and dimensions
respect their visibility during drawing, hit testing, marquee selection and Select
All. Hiding an annotation layer clears its current primary/auxiliary and multi-
selection membership, preventing Delete from removing an invisible selected item.
Choosing an item explicitly in Layers reveals its category before selecting it.

Hidden notes are excluded from Fit bounds and minimap markers, matching the
existing measurement/dimension behavior. Visibility remains a transient editor
setting; saved annotations and default export content remain intact. Existing
saved-group operations retain their group membership semantics.

A bounds test verifies hidden notes produce no Fit extent while default bounds and
source data stay unchanged. Phone Chromium/WebKit workflows cover each annotation
type: hide a selected item, Delete, click its former location, verify no annotation
drawing, Select All/Delete only the visible furniture, Undo, and reveal the item
through Layers. Exact exported floors verify preservation throughout. Existing
auxiliary selection/Escape/Delete workflows are rerun as regressions.

Walls/openings alignment, opening-only group movement, detailed furniture exports,
physical qualification and broader native parity remain open.

All 848 unit tests and 14 Chromium/WebKit workflows passed. Svelte checks reported
zero errors/warnings and the production build passed.
