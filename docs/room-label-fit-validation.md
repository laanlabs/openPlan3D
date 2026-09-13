# Fit moved room labels

September 9, 2026.

Room labels moved outside the wall outline were omitted from interactive Fit.
Shared content bounds now include the rendered name-and-area label at its saved
anchor, using the detected room polygon and selected units. Hidden room labels
are excluded. The minimap receives the same world bounds.

Fit accounts for the label renderer's minimum 11-pixel font. A bounded search
finds a scale whose measured label ink and geometry fit the available viewport;
ordinary geometry-only fits stop after the first check. Label offsets and room
geometry are not changed.

A single-line label wider than the available viewport at its minimum font size
cannot fit completely; the search retains the initial fit in that case. Further
wrapping/layout work, measurement/dimension captions, selection framing and
physical device qualification remain open.

Validation: the 765-test unit suite passed. After the final screen-space
measurement refinement, all eight bounds tests and four room-label browser
checks passed. Eight large-plan/property browser regressions also passed. Browser
coverage uses Chromium/WebKit at desktop and phone widths, including a longer
phone label, hidden-label fitting and saved-offset preservation. Final Svelte
checks and build passed; the phone screenshot was visually reviewed.
