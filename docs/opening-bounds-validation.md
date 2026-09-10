# Door and window symbol bounds

September 10, 2026.

Fit previously considered wall geometry but omitted opening symbols. Multi-selection
bounds used only opening anchors. Both now include conservative symbol envelopes
at the opening's wall position and tangent, including curved walls. Door envelopes
cover swings, pocket extensions, folding panels and garage tracks; window envelopes
cover bay/casement projections and sliding arrows. Screen-sized thickness, strokes,
hinges and arrow details scale with the candidate zoom during Fit refinement.
Bounds deliberately allow some spare space, particularly on the unused swing side.

Renderer-based unit checks cover all eight door and five window styles at three
zoom levels, two widths (including tiny openings), straight/curved walls and both
swing/flip configurations. Captured line/arc path points must lie inside the bounds.
Browser checks use large pocket and bay symbols extending beyond a short wall,
then verify painted symbol points are inside the desktop/phone canvas after Fit.
All 818 unit tests passed, Svelte checks reported zero errors/warnings and the
production build passed. All eight Chromium/WebKit desktop/phone framing checks
passed. Phone screenshots for both symbols were reviewed and show unclipped ends.
The first unit run exposed missing opening arrays in older minimal floors; empty
array handling fixed those regressions before final validation.

Fit Selection itself remains to be implemented using these bounds. Selected-opening
dimension labels, annotation group operations, physical gestures and export/native
parity remain follow-up work. Native application code is unchanged.
