# Furniture inventory and provenance work

The generated [manifest](furniture-manifest.json) records all current furniture
catalog entries and their mapped GLB assets. Run with Node 24:

```sh
npm run catalog:manifest
npm run catalog:check
```

The generator reads the real catalog and model mapping, rejects duplicate IDs,
invalid dimensions, missing mapped files and invalid GLB headers, then records
file sizes and SHA-256 hashes. Zero height is allowed for 2D symbols. CI checks
that the committed manifest matches these inputs. This is a catalog consistency
check, not a complete GLB parser or a licensing verifier.

Dimensions are the editor's defaults in centimetres, not manufacturer measurements.
The runtime fits GLBs to those dimensions, centers their footprint and puts their
bottom at zero; see [the loader](../src/lib/utils/furnitureModelLoader.ts).
Entries distinguish 2D-only symbols, procedural models and GLBs with a procedural
fallback. Native visual support is not inferred from a web mapping.

The [provenance record](furniture-provenance.json) now maps all 93 referenced
GLBs to exact byte matches in official Kenney archives: 29 Furniture Kit models
and 64 Nature Kit models. It records source/download URLs, archive hashes,
member paths and per-model hashes. Both official pack pages list CC0:
[Furniture Kit](https://kenney.nl/assets/furniture-kit) and
[Nature Kit](https://kenney.nl/assets/nature-kit). The downloaded notices are
included locally with whitespace normalized:
[Furniture Kit notice](../static/models/furniture-kit-License.txt) and
[Nature Kit notice](../static/models/nature-kit-License.txt). Original archive
notice hashes and included notice hashes are both recorded.

The generator rejects changed model bytes under an existing provenance record
and altered license notices. New unmapped provenance remains explicitly unverified
until source evidence is recorded. Embedded generator/copyright strings alone are
not attribution. Do not edit generated inventory JSON by hand; update source
records and regenerate it. Product measurements, asset orientation and native
representation still need independent qualification.

This inventory covers furniture catalog mappings only. It does not certify
unmapped files, textures, entourage, native assets, catalog completeness or release
readiness. Texture credits are separately recorded in
[the existing credits](../static/textures/CREDITS.md). Broader catalog curation
remains in [NEXT](../NEXT.md).

Initial check on September 10, 2026: 189 catalog entries and 93 distinct mapped
GLBs. Generation followed by check mode passed; an intentionally stale manifest
was rejected and the original regenerated output restored. No editor code changed.

Provenance verification on September 10, 2026 matched all 93 model hashes against
GLB members read directly from the official downloaded ZIPs. Repository import
commits `4c1589742e2bf1c718a2c98483dd9479767db31e` and
`927315f2db8e89c9be2f63b8a602cc9c39b093fa` independently name the two packs.
The archives were inspected locally, not executed. CI verifies the committed
evidence without downloading source packs.
