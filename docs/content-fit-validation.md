# Fit bounds for object-only floors

September 9, 2026.

Fit previously rejected floors without walls or furniture, skipped unknown
furniture definitions, and omitted annotations, entourage and tracing images.
It also treated stair footprints as unrotated rectangles.

The new shared `planContentBounds` calculation includes wall stroke/curve bounds,
furniture overrides and fallback footprints, rotated stairs/square columns,
entourage with catalog/custom aspect ratios, measurement endpoints, offset
annotation geometry, measured rotated text and loaded tracing images. Fit uses
the current floor when it contains any of these objects, retaining the visible
floor-below fallback for an empty current floor. Saved geometry is untouched.

Validation:

- 763 unit tests across 61 files passed, including six new bounds tests for
  empty floors, rotated stairs, unknown furniture, entourage, annotations,
  text-only floors and tracing images.
- Svelte checks reported zero errors/warnings; production build passed.

Remaining: minimap uses its older bounds; room-label offsets and screen-sized
measurement/dimension captions need further framing coverage. Image fitting
requires loaded image dimensions. The existing zoom limits can prevent very
large drawings from fitting entirely. Physical device checks remain open.
- Four final note-only browser checks passed in Chromium/WebKit at desktop and
  phone widths, as did four property-editor regressions on the same build. The
  note-only test waits for the imported note to paint before invoking Fit; its
  initial phone failure was an import/Fit synchronization race.

The initial automatic-fit trigger still requires walls; this batch improves the
Fit operation itself. Extending automatic initial framing remains open.
