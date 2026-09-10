# Editable floor slab thickness

The web floor settings now accept a positive slab thickness in centimetres for each
floor. Omitted values retain the previous 5 cm default, and the default button
removes the override. Edits participate in undo/redo and reject zero, negative,
nonfinite and nonnumeric values. Invalid or empty UI input returns to the saved
value on blur.

Both active-floor and stacked-floor room meshes extrude by the saved thickness
below their existing surface elevation. Room footprints, wall heights and floor
elevations retain their existing values. JSON imports validate the optional
`slabThickness` field, and exports retain it.

Validation covers independent floor edits, history, invalid inputs, JSON retention,
custom geometry depth and the legacy default. The browser workflow edits an upper
floor to 32.5 cm, rejects zero, downloads and reimports JSON, then checks the actual
Blender scene mesh bounds before and after switching active floors. It also probes
the concave recess and disconnected-room gap to ensure neither is filled.

Stair/courtyard openings, wall-face offsets, native slab authoring/rendering and
physical construction qualification remain open.

## Results

- 913 unit tests passed across 81 files.
- Svelte check: zero errors and warnings; production build passed.
- Chromium and WebKit passed the JSON/settings/stacked-export workflow.
- Visual review of the stacked scene passed.

The first Chromium run reached its 60-second test limit during the final screenshot
after all geometry assertions passed. The isolated rerun passed without a timeout
change. WebKit passed on its first run.
