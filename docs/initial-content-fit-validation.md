# Initial framing for object-only floors

September 9, 2026.

The initial framing trigger previously required walls, even though manual Fit
could frame object-only floors. It now schedules one initial fit when the shared
content bounds become available. It evaluates the current floor and visible
floor-below fallback on the animation frame, after layout and subscriptions have
settled. Repeated notifications coalesce into one pending frame.

For an image-only floor, image loading schedules another attempt once dimensions
are known. The existing source-identity and mounted checks reject stale image
callbacks. After initial framing succeeds, later geometry edits do not trigger
another automatic fit. Explicit Fit remains available.

The behavior remains once per mounted editor, matching the existing wall-plan
behavior. Automatic reframing on every floor switch or selection is separate
scope. Caption/room-label fit bounds, minimap parity, extreme zoom limits and
physical device qualification remain open.

Validation: 12 production-browser checks passed in Chromium/WebKit at 1440px
and 390px. These cover image-only loading, distant note selection without Fit,
subsequent edits retaining the camera, undo/source preservation and existing
property editing/save/reload. Svelte checks reported zero errors/warnings and
the production build passed.
