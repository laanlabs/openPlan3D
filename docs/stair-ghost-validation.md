# Below-floor stair reference fidelity

September 9, 2026.

The below-floor reference previously represented every stair as a straight dashed
rectangle with three generic treads. It now uses the active-floor stair renderer
at reduced opacity, preserving L/U runs and landings, circular spirals, saved
rotation, tread counts, captions and direction arrows. Reference stairs remain
non-interactive and their rendering stays below active-floor walls.

Fallback Fit for an empty active floor now considers only the below-floor walls
and stairs actually displayed by the reference layer. Invisible furniture,
annotations, columns, entourage and tracing images no longer distort that frame.
The candidate fit scale is supplied to the reference bounds, so stair captions
are measured at the same screen size as other fitted text.

The browser regression imports all four stair types on a lower floor and an
empty upper floor, plus a distant lower-floor note that should not influence
framing. It checks reference captions/opacity, useful zoom, non-interaction,
visibility toggling, empty-floor Fit and JSON preservation at desktop/phone sizes.

Stair exports, multi-selection framing, physical device qualification and broader
native/geometry parity remain open.

Validation: all 780 unit tests, twelve delayed-image/fallback browser regressions
and four final reference-layer checks passed. Chromium and WebKit covered desktop
and phone layouts. Svelte checks reported zero errors/warnings and the production
build passed. Desktop and phone screenshots were visually reviewed.
