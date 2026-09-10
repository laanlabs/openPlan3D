# Enclosed floor openings

Room Properties exposes **Open to floor below** for any detected enclosed room.
The optional `floorOpening` flag is saved as room metadata and matched by wall
boundary identity. Legacy rooms keep their floors. Opening rooms contribute zero
usable area; surrounding rooms continue to deduct the enclosed footprint once.

The active and stacked 3D paths omit the opening's slab and floor finish. Parent
slabs retain their existing nested hole, leaving a real opening rather than an
overlapping or invisible plate. Scene exports omit that geometry as well. The
2D editor leaves the opening unfilled and outlines its boundary; PNG/PDF room
fills and SVG exclude its fill. Room walls, names, and stored finishes remain
available when the opening is turned off.

Unit coverage checks undo/redo, recovered area, unchanged walls, strict boolean
validation, JSON preservation, and retention through a native package return
that changes the room name. Browser coverage toggles the setting, undoes/redoes,
checks SVG fill removal, downloads and reimports JSON, and probes exported active
and stacked scenes. Only the edited floor loses its inner slab.

All 926 unit tests, Svelte checks (zero errors/warnings), production build, and
four final Chromium/WebKit workflows passed. The first browser run passed three
cases but the existing Chromium floor-switching case waited on an onboarding
hint that auto-dismissed between its visibility check and click. Geometry tests
now seed the supported seen-tip state; the complete rerun passed in 3.2 minutes.

This is enclosed room-boundary authoring. Arbitrary openings crossing room walls,
automatic holes derived from stair placement, ceiling coordination between
floors, native opening rendering/editing, and physical qualification remain open.
Native-only JSON does not yet represent the opening; project packages retain the
web flag for the return trip without implying native rendering support.
