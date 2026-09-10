# Delayed image framing with a floor below

September 9, 2026.

An image-only active floor could complete its initial fit using the visible floor
below before its image loaded. The later image then appeared off-screen because
the initial fit was already marked complete.

Initial framing now waits while the active floor's only bounded content is an
image still loading. When dimensions arrive, the active image takes precedence.
If loading fails, an error callback releases the wait and permits the existing
floor-below fallback. Both callbacks retain mounted/source-identity checks.
Floors with other bounded geometry continue to frame immediately.

The browser regression holds a local image request pending and confirms initial
framing has not completed, then verifies successful image framing or failed-load
fallback. No external service or private scan data is used.

Manual Fit remains available while loading. Caption/room-label bounds, selection
framing and physical device qualification remain open.

Validation: eighteen Chromium/WebKit checks passed at desktop/phone widths,
covering held image requests, load failure, ordinary image-only framing, stale
image rejection, camera restoration and source preservation. Svelte checks
reported zero errors/warnings and the production build passed.
