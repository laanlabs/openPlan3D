# Joined DXF wall outlines

The DXF exporter previously emitted one rectangle per curve facet. Adjacent
rectangles left transverse seams and small wedges at bends. It now emits one
continuous outline per uninterrupted wall run, with openings splitting runs.

Each side intersects adjacent offset lines for a miter join. Miters longer than
four half-thicknesses use a bevel to prevent spikes near reversals. Ends remain
butt-capped. No saved wall or opening data changes.

Automated geometry coverage checks perpendicular thickness on every facet of a
quadratic curve, a single 34-vertex outline instead of 16 rectangles, disconnected
runs around openings, a straight-wall rectangle, fully removed walls, finite
sharp-reversal geometry, and source immutability. Export integration checks the
actual DXF polyline count for a curved room boundary. Production browser checks
cover downloaded DXF with no openings and with a door plus window.

Scope limits: curves retain the viewer's 16-facet approximation. This change joins
facets within a source wall; it does not union separate source walls at corners,
T junctions or crossings. Near-reversing/self-overlapping walls do not receive a
polygon union. Native CAD parity and third-party CAD application qualification
remain open.

Validation on 2026-09-09: all 691 unit tests across 52 files passed; Svelte checks
reported zero errors and warnings; production build passed. All four production
browser checks passed across Chromium and WebKit. This is geometry/download
validation, not a visual qualification inside a third-party CAD application.
