# Explicit wall-length input validation

September 9, 2026.

The shared length parser previously interpreted `12"` as twelve feet and accepted
trailing junk through the metric fallback. It now matches the full input, rejects
nonfinite values and supports explicit mm/cm/m, inches, and feet with optional
inches. Smart prime quotes are normalized. Bare values use the selected display
units: centimetres or inches.

The wall-length properties field now uses this parser and shows syntax examples.
Invalid or sub-centimetre lengths restore the saved value without consuming undo
history. Focusing and leaving an unchanged rounded display preserves stored
precision. Other dimension fields keep their existing numeric entry behavior.
Fractional notation such as `5 1/2"` is not supported.

Validation:

- 757 unit tests across 60 files passed, including explicit units, malformed
  inputs, signs, unit defaults and precise formatter round trips.
- Svelte check: zero errors and warnings. Production build passed.
- Four production-browser checks passed in Chromium and WebKit at 1440px and
  390px. Exported JSON verifies explicit unit conversion, connected endpoints,
  undo restoration, precision on unchanged blur, save/reload and existing opening
  dimensions. Malformed metric drafts preserve the prior length and undo history.

Native unit handling, fractional entry and other property fields remain outside
this batch. Physical device qualification remains open.
