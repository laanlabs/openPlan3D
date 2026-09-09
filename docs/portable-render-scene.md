# Portable web render scene

The 3D viewer's **Export Blender Scene** button downloads the displayed floor
geometry in the same `openplan3d-render-scene` v1 format used by the native local
worker. Active-floor mode exports that floor; stacked mode includes the displayed
stack at its current elevations. The project backup remains the editable source.

The adapter reads existing Three.js mesh buffers and world transforms, converting
centimetres to metres in the shared Y-up coordinate frame. It supports indexed
and nonindexed triangles, draw ranges, nested transforms and mirrored instances
represented by ordinary transformed meshes. Reflected transforms reverse triangle
winding. It does not reconstruct a second version of walls, openings, curved
spans, slopes, stairs, columns or loaded furniture geometry.

Materials become neutral wall/floor/proxy roles. Window panes, ceilings, labels,
camera markers and other excluded helpers are omitted; the decorative ground is
replaced by a rectangular support slab around exported bounds with a 20 cm margin.
No images, URLs, arbitrary source metadata or captured-photo camera are exported.
The file is labelled `edited-web-preview` and records its display scope and limits.

This is a snapshot of the viewer's current geometry, including currently loaded
furniture or its displayed fallback. Viewer limitations remain, including curved
wall openings and simplified inactive floors. It is not a material bake, a
structural slab model or an alignment of edited geometry to captured photos.
Skinned, actively morphed and instanced meshes are rejected explicitly. Invalid
coordinates/indices and exports beyond 10,000 meshes, 300,000 vertices, 300,000
triangles or 64 MiB fail with a visible message. Inputs are not mutated.

## Render locally

From the native `openplan3d-ios` repository, with Blender 5.2.1 LTS installed:

```sh
python3 tooling/rendering/render_jobs.py --queue /tmp/web-render-queue init
python3 tooling/rendering/render_jobs.py --queue /tmp/web-render-queue submit /path/to/openplan3d-render-scene.json --quality preview --view isometric
python3 tooling/rendering/render_jobs.py --queue /tmp/web-render-queue run --blender /Applications/Blender.app/Contents/MacOS/Blender
```

The existing worker validates the scene, freezes its bytes and verifies the output
PNG under its normal local budgets. Direct browser-to-native queue handoff remains
open; this path uses an explicit downloaded file and the local CLI.

## Verification

Unit tests cover transforms and units, metadata omission, stable repeated output,
reflected winding, support bounds, hidden/excluded subtrees, nonindexed draw ranges,
sloped opening geometry, and rejection of invalid/deformed/oversized inputs.
The browser regression exercises a sloped-room fixture, repeated downloads and
the unchanged editable project backup. The existing framing regression checks
that the added control does not cover the rendered corner markers.

On 2026-09-09, all **660 unit tests** passed; Svelte reported zero errors and
warnings, and the production build passed. Five browser checks passed: desktop
and 390-pixel exports in Chromium and WebKit, plus Chromium's existing framing
regression across viewport/orbit/stack changes. An initial browser failure caught
an overlap with Undo History; the export control now sits above the footer.
Active and stacked downloads were byte-identical across both engines and widths.

Both actual browser downloads were accepted and rendered by pinned Blender 5.2.1
LTS in an isolated queue. The scene and PNG receipt hashes were verified, and both
PNGs were visually inspected for sloped walls, open window panes, curved spans and
stacked elevations. The existing inactive-floor simplifications remain visible.

| Fixture | Meshes / vertices / triangles | Scene bytes | PNG bytes | Runtime / sampled peak memory |
| --- | --- | ---: | ---: | --- |
| Active sloped room | 27 / 683 / 414 | 23,701 | 185,982 | 2.75 s / 485,277,696 bytes |
| Stacked curved upper floor | 44 / 1,091 / 618 | 43,658 | 198,272 | 2.63 s / 526,729,216 bytes |

Both PNGs are 512×512 previews. These are synthetic local runs, not hardware
performance or physical-device qualification.

- Active scene SHA-256: `e3fbe9a0ac6d8bc12a2696549495a2191084854808926d15f311e5865948a802`
- Active PNG SHA-256: `7ec11591208bc782a5e246ab030764fbc1d80b5e7655c8d2888b918f8c5dd1b9`
- Stacked scene SHA-256: `22612bd579a92a3184933af8b7377c33ceba8d9dfdf71664014c20f16c191c86`
- Stacked PNG SHA-256: `36a9c0ab2d033c2b2a42d077db3500038da0266214bde59dd707e82b131b5564`
