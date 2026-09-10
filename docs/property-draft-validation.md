# Presentation property draft validation

September 9, 2026.

The remaining direct numeric handlers in the properties panel wrote blank drafts
as zero (or clamped entourage width to 1 cm). These fields now use the existing
finite-number/dimension validation and restore the saved value on blur:

- Entourage width and rotation.
- Furniture and square-column rotation.
- Text annotation font size, rotation and X/Y coordinates.
- Background-image rotation.

Entourage width retains fractional centimetres and honors the 1 cm minimum in
both display units. Its rotation no longer rounds to whole degrees. Furniture
rotation and text coordinates display their stored fractional values. Font size
honors its existing 8–72 range and accepts fractions. Position and rotation can
be negative or zero. Text X/Y retain the existing world-centimetre convention.

Sliders retain their native bounded behavior. This batch does not change import
validation, native editing, or convert additional fields to explicit unit syntax.

Validation:

- Four Chromium/WebKit production-browser checks passed at 1440px and 390px.
  Actual exported JSON verifies blank/range rejection, fractional preservation,
  imperial width conversion, undo, signed text positions and save/reload.
- Text selection uses the actual painted anchor. At phone width the test pans
  that anchor above the properties sheet before selecting it. The initial run
  exposed that fit-to-view can leave content behind the open sheet; accounting
  for that occlusion in fit-to-view remains separate usability work.
- Svelte check reported zero errors/warnings; production build passed.

Physical touch/device qualification and native parity remain open.
