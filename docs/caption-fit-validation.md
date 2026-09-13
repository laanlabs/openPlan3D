# Measurement and dimension caption fit bounds

September 9, 2026.

Fit previously bounded measurement endpoints and offset dimension lines without
accounting for their captions. At distant zoom levels, fixed screen-size text
could extend beyond the viewport even when the geometry was inside it.

Shared bounds now measure measurement captions with their bold 12-pixel font and
bottom baseline, and dimension captions with their minimum 10-pixel font. The
candidate fit scale converts actual text ink back to world coordinates. Bounds
also include measurement endpoint dots, dimension arrows and leader extensions.
Hidden measurement and annotation layers are excluded from these bounds and
minimap lines. Saved coordinates, labels and offsets are unchanged.

The browser regression imports a wall-free plan with a measurement and a custom
caption two million centimeters apart. It checks actual painted caption edges
inside desktop and phone canvases, verifies that hiding measurements changes Fit,
and confirms JSON preservation. Unit coverage includes hidden layers and the
minimum caption font at low zoom.

Overwide single-line text, automatic wall/internal room dimension labels,
selection framing and physical device qualification remain open.

Validation: all 767 unit tests passed. Twelve browser checks passed in Chromium
and WebKit, covering desktop/phone caption framing, hidden measurement layers,
object-only initial framing/minimap navigation, and measurement/dimension exports.
Final Svelte checks reported zero errors/warnings and the production build passed.
The phone screenshot was visually reviewed.
