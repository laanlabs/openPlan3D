# Interior room label anchors

Default labels retain their centroid when it lies inside the visible room floor.
Otherwise, horizontal and vertical scanlines produce interior candidates; the
candidate with greatest boundary clearance is used. Nested room holes are
excluded. Explicit saved offsets continue to use the previous centroid-relative
coordinate convention, including a saved zero offset.

The 2D renderer, label hit testing, inline/context editing, Fit bounds, PNG/PDF/
SVG/DXF labels, and 3D label sprites use the same position helper. Dragging an
automatic label initializes its saved offset from the displayed position, so
movement does not jump to the centroid. Undo restores the automatic position.

Validation: all 923 unit tests and Svelte checks/build passed. The final targeted
seven-test nesting file passed after making the coincident-label test explicitly
use saved zero offsets. Eight initial Chromium/WebKit label/slab regressions
passed; two new nested interactions failed because the test reused coordinates
after the properties sidebar resized the canvas. Both passed on the corrected
rerun, which reads current rendered coordinates and verifies separated anchors,
editing each room, parent dragging, undo, and the existing export checks.

An interior anchor does not guarantee that an arbitrarily long label fits inside
a narrow room. Text collision/layout refinement, explicit courtyard/stair
openings, native nesting, and physical gestures remain open. The browser fixture
also exposed stale saved areas in Room Properties; Area Summary is already
correct, but that separate display path needs updating.
