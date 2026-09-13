# Fit-to-view with a mobile properties sheet

September 9, 2026.

The presentation-property browser test exposed a phone layout problem: Fit
centered the plan in the entire canvas while the open properties sheet covered
its lower portion. A note inside the fitted plan could only be selected after
panning it above the sheet.

Fit now measures overlap with the properties panel. When it covers the bottom of
the canvas, fitting uses the remaining visible height and shifts the camera to
center the fitted content in that area. The desktop panel occupies separate
layout space and does not reduce the canvas a second time. Existing content
bounds, padding, zoom limits and manual panning behavior are retained.

The browser regression removes its panning workaround, asserts the painted text
anchor is above the phone sheet, and selects it directly after fitting. It also
exercises desktop fitting and subsequent numeric editing/save/reload.

This does not automatically reframe on every selection, and does not address
all-object fit bounds or physical touch qualification.

Validation: eight production-browser checks passed in Chromium and WebKit at
1440px and 390px, including direct note selection, structural/property draft
regressions and save/reload. The phone screenshot was visually reviewed. Svelte
check reported zero errors/warnings and the production build passed.
