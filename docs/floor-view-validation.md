# Floor-specific camera views

September 9, 2026.

A single initial-fit flag previously persisted across floor switches, leaving a
new floor off-screen when its content was far from the previous floor. Camera
views now belong to a project/floor pair for the mounted editor session.

Leaving a floor remembers its camera center, zoom and initial-fit state. Visiting
an unseen floor resets that state and schedules framing using shared bounds;
returning restores the prior view. The queued fit reads the latest active floor,
and tracing-image source checks continue to reject stale loads. Same-floor
geometry edits retain the camera.

Camera views are transient UI state and are not written to project geometry or
persisted across reloads. Selection-driven reframing, caption/room-label bounds,
extreme zoom limits and physical device qualification remain open.

Validation: fourteen Chromium/WebKit checks passed at desktop/phone widths,
covering distant floor switches, restored pan positions, exported geometry,
initial note/image framing, same-floor edits and stale image loads. Svelte checks
reported zero errors/warnings and the production build passed.
