# Large-plan fitting and zoom controls

September 9, 2026.

Fit previously clamped at 10%, so sufficiently large plans remained clipped.
The canvas controls and mobile overflow menu enforced the same hard floor,
which would also cause a jump when zooming from a smaller fitted scale.

Fit now uses the required scale and sets a per-floor minimum of one-quarter of
that scale (or 10%, whichever is smaller). Camera restoration retains this
minimum. Buttons, wheel/trackpad and pinch handlers use the same limit, and the
mobile overflow menu reads it through the shared camera store. Fit reserves a
40-pixel margin on each side in addition to its existing world-space padding.
Small zoom labels retain significant digits instead of showing zero percent.
Ruler steps extend by powers of ten to keep tick counts bounded at low scales.

A real-click phone regression also exposed the floating Tools button covering
Zoom Out. The zoom control row now sits beside that button on phones.

Caption/room-label bounds, selection framing and physical device qualification
remain open. Very small object details remain subject to renderer minimum pixel
sizes; fitting does not guarantee readable labels at every scale.

Validation: all 764 unit tests passed. Four final large-plan browser checks passed
in Chromium/WebKit at 1440px and 390px, using a 2,000,000 cm span. They verify
button/wheel ratios, mobile overflow zoom, the quarter-scale lower limit, small
percentage labels and margins. Eight floor-view/property regressions also passed
before the final margin adjustment. Svelte checks and the final production build
passed. The final phone screenshot was visually reviewed.
