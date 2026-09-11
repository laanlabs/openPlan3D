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

GLB generator/copyright strings are copied as embedded metadata. Provenance is
explicitly **unverified**: a generator name does not identify the original author,
source pack or redistribution license. Do not apply the repository's code license
to an asset merely because the asset is committed here. Before marking provenance
complete, add durable source/author/license evidence and any attribution text to
a reviewed source record consumed by the generator. Also verify product dimensions,
asset orientation and native representation independently. Do not edit the generated
JSON by hand; a regeneration would discard those edits.

This inventory covers furniture catalog mappings only. It does not certify
unmapped files, textures, entourage, native assets, catalog completeness or release
readiness. Texture credits are separately recorded in
[the existing credits](../static/textures/CREDITS.md). Broader catalog curation
remains in [NEXT](../NEXT.md).

Initial check on September 10, 2026: 189 catalog entries and 93 distinct mapped
GLBs. Generation followed by check mode passed; an intentionally stale manifest
was rejected and the original regenerated output restored. No editor code changed.
