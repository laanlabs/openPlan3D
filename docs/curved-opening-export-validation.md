# Curved opening plan export validation

Validated locally on 2026-09-09.

PNG, PDF and SVG now clear the quadratic wall segment beneath each curved door
or window. Symbols span the exact quadratic jamb points; stored opening width is
measured along the same 16-facet path used by the viewer, then clipped to wall
ends. Rigid symbols use the chord between those jambs. Saved geometry and opening
dimensions are unchanged. Export framing follows the relocated door symbol.

DXF now subtracts the union of door/window intervals from wall outlines, including
straight walls. Curved outlines remain faceted; glyphs use the curved jamb frame.

Validation:

- 688 unit tests across 51 files passed, including exact jamb/subcurve geometry,
  endpoint clipping, invalid widths, source immutability, and overlapping CAD cuts.
- Svelte checks passed with zero errors/warnings; production build passed.
- Six production-download checks passed across Chromium and WebKit, covering
  curved walls, curved doors/windows, and moved room labels.
- Browser checks verify two SVG curve masks, white PNG pixels in the doorway,
  preserved adjacent wall pixels, and successful DXF/PDF serialization.
- The actual exported PNG was visually inspected for door swing, window alignment,
  clear wall gaps and framing.

Limits: DXF facet joins and the small facet-to-exact-jamb discrepancy remain.
PDF uses the verified canvas plan renderer, but PDF page layout has not been
visually qualified. Physical-device downloads, native curved export parity,
all opening types and overlapping-symbol appearance need further qualification.
