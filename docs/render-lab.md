# Local Three.js rendering lab

`/render-lab` is an isolated experiment for photo-informed Blender scenes. It
keeps the existing editor/viewer intact and loads its rendering dependencies only
on this route. It is not a replacement for the native renderer or a production
release of the photo reconstruction pipeline.

## Run

```sh
npm ci
PUBLIC_ENABLE_ANALYTICS=false npm run dev -- --host 127.0.0.1
```

Open `/render-lab` and choose a self-contained GLB. Files are decoded in browser
memory; there is no upload, persistence or Firebase integration. External image
and buffer URLs are rejected before loading. Inputs are limited to 128 MiB, 16 MiB
of JSON metadata and two million mesh vertices. This remains a developer preview,
not a hardened loader for arbitrarily hostile assets.

For a private local startup model, explicitly set
`OPENPLAN3D_RENDER_LAB_ASSET=/absolute/path/to/model.glb` on the dev command. The
Vite middleware serves that one file only to loopback clients, with no-store and
same-origin resource headers. It is disabled in builds and never copies the
asset into `static`, Git, a deployment or Firebase. Without this opt-in, the page
starts empty and the local file picker works in production too. The route does
not initialize the app's analytics when opened directly.

## Rendering

- Three.js physically based GLB materials, AgX tone mapping, environment lighting,
  area lights and an interactive shadow-map preview.
- Pinned `three-gpu-pathtracer` 0.0.24 / WebGL 2, six light bounces, 1024-pixel
  material textures, 3×3 render tiles and progressive accumulation to 512 samples.
- Edge-aware spatial noise reduction after four samples. This is not Cycles'
  learned denoiser and can soften fine texture details.
- Orbit/pan/zoom, overview/top/reverse cameras, exposure, pause/resume and PNG
  download. Camera/exposure changes reset accumulation. Rendering pauses in a
  hidden document; buffers, controls, textures and animation callbacks are
  released on teardown. Pixel ratio is capped at 1.5.
- Interactive preview remains available when path tracing fails. GPU support,
  memory use and performance still need broader browser/device qualification.

The material/geometry contract is standard GLB, shared with Blender. Apply mesh
modifiers and explicitly export UV texture maps. Blender procedural nodes are not
automatically portable: bake micro-normal, roughness and tile patterns before
claiming equal material fidelity. The local study exports its captured wood
sample, modeled cloth geometry and a tile image; procedural textile bump remains
unbaked. Furniture is photo-guided modeling, not photogrammetry. Camera alignment
has only qualitative inspection; measured reprojection remains pending.

## Verified on September 8, 2026

- Production build succeeds. Type check: zero errors, seven existing warnings.
- 653 unit tests pass, including six new GLB preflight tests.
- Desktop in-app Chromium browser: a private 4.3 MB / approximately 123k-triangle
  scene loaded and path traced successfully. Overview/top/reverse, interactive
  mode, pause and PNG export exercised; the exported PNG was visually reviewed.
- A floor slab normal/offset error in the derived GLB was corrected so the
  bathroom tile and hall runner remain visible. Original scan files are unchanged.
- No private model, source photo, derived texture or render is stored in this repo.

Remaining: bake all material maps, compare matching Blender/browser cameras and
lighting quantitatively, exercise touch/mobile/other GPUs and context loss, add
browser regression coverage, tune adaptive resolution/denoising, and connect to
the shared geometry preparation and app jobs. The upstream WebGL path tracer has
announced a future WebGPU migration; this pinned prototype does not precommit the
production renderer to either backend.

References: [path tracer API](https://github.com/gkjohnson/three-gpu-pathtracer),
[planned WebGPU migration](https://github.com/gkjohnson/three-gpu-pathtracer/issues/779).

## Standalone static hosting

The same viewer can be published without SvelteKit's server or the main app:

```sh
NODE_ENV=production npm run build:render-lab
```

The default output is `/tmp/openplan3d-render-site`; set `RENDER_LAB_OUTPUT` to
choose another build directory. This build includes no Firebase SDK, analytics,
server routes, private files or models. It opens with the local GLB picker.

Only after the model owner explicitly authorizes public distribution, set
`VITE_RENDER_LAB_MODEL=/demo.glb` during the build and copy the approved derived
GLB to the output directory as `demo.glb`. The hosted model is downloadable;
a hard-to-guess preview URL is not access control. Full original scan bundles and
capture photos must not be included. Hosting the viewer does not move rendering
to Firebase: rendering still runs on each visitor's GPU.
