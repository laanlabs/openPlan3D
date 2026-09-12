# Local custom furniture models

Open **Objects → My 3D models** and choose a local `.glb` file. Review its preview
and dimensions, give it a name, and optionally enter attribution, license text and
a public HTTP/HTTPS source URL. Choose **Add to project**, then use the saved
model's placement button to place furniture at the center of the current 2D view.
Save the project to persist the change. Cancellation leaves the project unchanged.

The preview supports pointer orbit/zoom and labeled rotation/zoom buttons. The
buttons can be focused with Tab and activated with Enter or Space; **Reset preview
view** restores the original framing. These newer keyboard controls are awaiting
browser and visual qualification. A device without WebGL can still add a valid
model after validation, but cannot display its preview.

Your model name appears in the canvas, Layers and Properties without translation.
Importing identical bytes reuses the existing model definition and its metadata.
To remove a definition, first delete its placed furniture on every floor, then
choose **Remove model**. An unused source is removed with its definition unless
another retained reference still needs it. Undo can restore the removal; older
saved versions and exported backups retain their copies.

## Supported files

- Static glTF 2.0 binary containers (`.glb`) up to 16 MiB, with nonzero width,
  depth and height. The glTF metre dimensions become project centimetres.
- Embedded PNG/JPEG textures, up to 32 images, 4096 pixels per side and a combined
  32 megapixels. Core materials and `KHR_materials_unlit` are supported.
- Bounded scene graphs, geometry and decoded resources. A file below the byte limit
  can still exceed these limits and be rejected with a diagnostic.

External buffers/images, animation, skins, cameras and other extensions are not
supported by this importer. Convert these to a supported static GLB in the source
application. The original file remains unchanged: internal geometry preparation
is used only for rendering. Import does not fetch the provenance URL or upload the
model. Opening a source link is a separate user action.

Projects support up to 64 model definitions. Admission also checks the shared
64 MiB project/history budget, history expansion and available browser quota.
Models share the attachment pool with photos and tracing images.

## Saving and exchanging models

Saved project JSON, library backups and project-package ZIPs retain the original
GLB bytes and SHA-256 digest. Web furniture keeps a `customModelId` reference to
its definition. Package exports store definitions in the retained web sidecar and
the original source under `assets/`; the native plan carries the furniture's shared
footprint and placement. Native furniture rendering remains simplified.

The web package test verifies that native-plan moves, rotation, resizing, floor
changes and instance deletion preserve the model reference and original bytes.
Actual Swift import/edit/export qualification is still running; this is not a
claim of native GLB rendering or physical-device qualification. See the
[package contract](project-package-v1.md), [verification record](reviews/2026-09-12-local-model-import.md)
and [remaining work](../NEXT.md) for the exact current evidence.
