# Text annotation bounds at low zoom

September 9, 2026.

Text-note fit bounds previously measured the saved font size in world units,
while the editor rendered at least eight screen pixels. At small scales this
underestimated note ink, especially for longer notes near the viewport edges.

The shared text bounds helper now accepts an optional zoom, measures the actual
screen font and multiline spacing, rotates the measured corners, then converts
them back to world coordinates. Interactive Fit supplies its candidate scale.
The default zoom is one, preserving the existing export bounds behavior. Saved
text, coordinates, rotation and size remain unchanged.

The large-plan regression now uses longer boundary notes and checks their ink
edges, as well as button/wheel/overflow zoom and lower limits. A unit regression
covers the minimum screen font and rotated bounds without mutating the note.

Overwide text, measurement/dimension captions, selection framing and physical
device qualification remain open.

Validation: all 766 unit tests passed, along with ten Chromium/WebKit browser
checks for large-plan note ink, room-label framing and rotated multiline plan
exports. Svelte checks reported zero errors/warnings and the production build
passed. The phone screenshot was visually reviewed.
