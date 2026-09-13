# Text notes in Layers validation — 2026-09-10

Text notes now appear in a collapsible Text notes category in Layers. Labels
include the note number and whitespace-normalized text, with an Empty note
fallback. Selecting an entry uses the shared selection path to clear previous
group and room selections and activate the canvas note target.

Notes retain their existing always-visible rendering behavior. The category
therefore has no visibility toggle; independent note visibility remains open.

Validation:

- Svelte checks: zero errors and warnings.
- Production build passed.
- Eight Chromium/WebKit browser workflows passed at a 390 × 900 viewport.
- A multiline note at (9000, -8000) is selected by its normalized Layers label.
  Fit Selection zooms above 50%, confirming it frames the note rather than the
  previously selected plan geometry. Escape followed by Delete leaves the
  exported floor unchanged; reselecting and deleting removes only the note;
  Undo restores the complete exported floor.
- Existing guide, measurement, and dimension selection workflows also pass
  with the distant note present, including exact exported-data comparisons.

The browser coverage is in `tests/browser/auxiliary-selection.spec.ts`.
Annotation multi-selection/group bounds and transforms, note visibility,
physical-device qualification, and export/native parity remain open.
