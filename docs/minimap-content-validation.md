# Minimap content coverage

September 9, 2026.

The minimap previously required walls, used separate incomplete bounds and drew
only walls plus known catalog furniture. Object-only plans could also display
the misleading empty-plan hint.

The minimap now uses the shared content bounds with its existing padding for both
rendering and click navigation. It appears on desktop for object-only floors;
the existing phone visibility rule is unchanged. The empty hint uses the same
content-presence predicate, including tracing images still loading.

Unknown furniture uses its explicit or fallback footprint. Stairs, columns,
entourage, text and tracing images have small colored navigation markers;
measurements and offset dimensions have lines. These are navigation symbols,
not detailed drawing/export representations.

Remaining: caption and room-label bounds, extreme zoom limits, automatic
floor-switch framing and physical device qualification. The blue viewport still
represents the full canvas area.

Validation: 764 unit tests across 61 files passed. Eight Chromium/WebKit
checks passed at desktop/phone widths, covering object-only initial framing,
image loading, absence of the empty hint, painted minimap markers and navigation
back to a note after panning away. Svelte checks reported zero errors/warnings;
production build passed.

All six canvas-idle regressions also passed in Chromium/WebKit, including
minimap changes, delayed tracing images and phone-width touch pan/pinch.
