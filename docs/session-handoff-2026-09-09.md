# OpenPlan3D session archive handoff — September 9, 2026

Read this first when resuming the archived scan/render/video conversation. This
records completed work, deployment state and local artifacts; it is not a claim
that all experiments have merged or that an App Store release has shipped.

## Repository and release state

- Web checkout: `/Users/thelodgem1/projects/open-source-projects/openPlan3D`.
  Branch `codex/threejs-render-lab`, implementation baseline `96d3330`.
  [PR #95](https://github.com/laanlabs/openPlan3D/pull/95) is OPEN as checked
  September 9. Local `main` / last observed `origin/main`: `511ff08`.
- Native checkout: `/Users/thelodgem1/projects/open-source-projects/openplan3d-ios`.
  Branch `codex/local-floorplan-render`, implementation baseline `16a16cb`.
  [PR #12](https://github.com/laanlabs/openplan3d-ios/pull/12) is OPEN as checked
  September 9. Local `main` / last observed `origin/main`: `83378ee`.
- Both worktrees were clean before writing these archive notes. The implementation
  branch tips matched their locally recorded remote tracking refs. Refresh remote
  refs before starting new work; this snapshot does not assert future GitHub state.
- Native full-scan v1 was merged through PR #10; desktop export Save dialogs
  through PR #11. The earlier WIP commit `cbe0e4787b87e4529fe4acf06d85c3f5749b0903`
  was continued and hardened, not recreated from main.
- No TestFlight/App Store submission or release was performed in this session.
  Clean/committed source and a deployed web site do not mean the native app is
  distributed. Earlier conversational statements that no app update was needed
  applied only to the web-model change; the accumulated native improvements do
  warrant release preparation and physical-device QA.

## Native work completed before the rendering experiment

Full-scan v1 includes backward-compatible image/camera metadata, streamed stored-ZIP
export/import, SHA-256 and CRC validation, bounded extraction, path-traversal and
archive-corruption coverage, atomic independent-copy import and coordinate metadata.
The normative contract and validation report are in native `docs/full-scan-v1.md`
and `docs/full-scan-v1-validation.md`.

Recorded validation: 82 tests passed on Mac Catalyst and 82 on the iPhone simulator.
The user supplied a real legacy scan in Downloads. Its 394 files and 194 image/
metadata pairs survived export, independent import and re-export with matching
bytes/hashes. This validates transfer, not calibrated camera accuracy. The synthetic
projection fixture is not physical-device validation.

Desktop export now uses native Save dialogs, including a direct full-dataset save
action. The real archive was saved through the dialog; cancellation/retry was
exercised. iPhone/iPad retain share sheets. Earlier batches also implemented project
packages, metadata editing/clearing, attachment retention, furniture category
continuity and native/web interchange fixes. Catalyst targets and local commands
are implemented. See native `NEXT.md` for current scope and tests.

## Blender scene and web preview

Rendering direction remains local Blender Cycles for finished renders and Three.js
for interactive browser previews, with shared geometry/texture preparation. The
native branch contains an initial local geometry renderer (nine geometry tests),
not an integrated production app render queue or photo reconstruction pipeline.

The photo-guided study was revised to add shower details, doors, wall art and
furnishings. Contradictory shower details were reviewed, and the cut-down wall
mistake was corrected in v4. Remaining scan alignment, proportions, materials and
fine details are approximate. Never call this an exact or measured reconstruction.

Authoritative latest local study files:

- Blender: `/Users/thelodgem1/Downloads/OpenPlan3D-Renders/floorplan-full-walls-v4.blend`
- GLB: `/Users/thelodgem1/Downloads/OpenPlan3D-Renders/floorplan-full-walls-v4.glb`
- GLB SHA-256: `cf74c27ece38ed61c7969b7367f81adc12bda2fcc51a4e7455f11130762477aa`

Use v4 rather than the older `floorplan-web-test.glb` alias (which contains v3).
The corrected v4 file was left open in desktop Blender and last verified there
during video work; reopen that exact file if the application has since closed.
Earlier versions and desktop backups remain in the same Downloads folder.

## Live Firebase render lab

Site: https://openplan3d-render-lab.web.app/

Firebase project `openplan3d`, separate Hosting site `openplan3d-render-lab`.
The main app/default Hosting site was not changed by this deployment.

On September 9 the user explicitly asked for the latest GLB to load automatically.
The deployed build now loads `/floorplan-full-walls-v4.glb` at startup; visitors
can still open their own local GLB. The public model is downloadable. This specific
derived-model publication was authorized; it does not authorize uploading raw
capture archives, full scan photographs or render jobs. Rendering runs on each
visitor's GPU. Local-file selection does not upload the selected file.

The live GLB was downloaded for hashing on September 9 and matched the local hash
above. The served HTML referenced `assets/index-DC3E8PXc.js`, which includes the
startup model path. The production build succeeded. No new interactive browser
QA was performed for the default-model redeploy.

Deployment was built from the existing environment-variable support, with no
source-code modification or model committed to Git:

```sh
NODE_ENV=production VITE_RENDER_LAB_MODEL=/floorplan-full-walls-v4.glb \
  RENDER_LAB_OUTPUT=/tmp/openplan3d-render-site-v4-20260909 npm run build:render-lab
```

The approved GLB was copied into that output directory. An isolated Firebase
configuration selected `site: openplan3d-render-lab` and that `public` directory;
`firebase deploy --only hosting --project openplan3d --config <isolated-config>`
published five files. The temporary config/cache were removed afterward. Recreate
an isolated config for redeployment; the root `firebase.json` does not select this
site. A plain viewer build without the model environment variable and copied GLB
will remove the automatic demo on the next deployment. `/tmp` output is disposable.

Recorded web baseline: 653 unit tests, successful production build, zero type errors
and seven existing warnings. Broader GPU/mobile qualification, material baking and
shared preparation integration remain. GitHub and Firebase authentication worked
on this computer; recheck them when needed and never copy old authentication codes.

## Video deliverables and creative decisions

Latest approved export:
`/Users/thelodgem1/Downloads/OpenPlan3D-Comparison-Video/OpenPlan3D-Moving-Comparisons-30s.mp4`

Verified output: 30.000 seconds, 1920×1080, 24fps H.264 with AAC audio. It preserves
the opening “Let’s see what Astra 6 can do with an OpenPlan3D capture…” and uses
understated humor about scan/reconstruction mistakes. User preference: experimental
and enjoyable, less whimsical, actual moving video rather than presentation cards.
Comparisons use native 2D/3D screenshots and real capture photos alongside the
improved Blender model. Labels were enlarged from 22px to bold 36px.

Timeline: opening 0–5, bedroom 5–9, bathroom 9–12, shower 12–15, native 3D 15–19,
model rotation/light study 19–25, finish 25–30 seconds. Music is an original
procedurally synthesized electronic ambient score: warm pads, playful plucks and a
restrained 120 BPM groove. This latest cut uses no external track or audio samples.

Editable project:
`/Users/thelodgem1/Downloads/OpenPlan3D-Comparison-Video/motion-cut/`

- `index.html`, `compositions/`, `assets/`: Hyperframes edit and media.
- `synth_playful_ambient.py`, `.media/audio/bgm/`: score, stems and provenance.
- `render_motion.py`: Blender overview/bedroom/bath camera source.
- `render_light_turntable.py`, `Blender-Turntable-Lighting.blend`: real model
  rotation and animated cool-to-warm directional lighting; geometry retained.
- `review-30s/encoded.jpg`, `video-probe-30s.json`, `audio-levels-30s.txt`:
  exported-video checks. All 144 frames of the final turntable segment differ.
- `revisions/46-second-v2/`: prior edit source. Previous MP4 exports remain in
  the parent directory. Their Kevin MacLeod music credits still apply to those
  older versions, not the new original score.
- `LINKEDIN-POST.md`: draft post. Nothing was posted to LinkedIn or YouTube.

Standalone Blender footage:
`/Users/thelodgem1/Downloads/OpenPlan3D-Comparison-Video/Blender-Turntable-Lighting.mp4`
(8 seconds; the final cut uses it at 4/3 speed). Overview and bedroom were rendered
with EEVEE; bathroom used denoised Cycles samples with optical-flow interpolation.
Animated lighting is illustrative, not captured lighting.

Hyperframes source was installed at
`/Users/thelodgem1/projects/open-source-projects/hyperframes`.
The video project remains pinned to 0.8.31. A 0.8.32 probe still reported the known
DOM-motion false positive for a fixed video element containing moving footage;
the pin was reverted. Lint/runtime/layout/contrast passed; encoded pixel motion
and snapshots were checked separately. Do not add pointless CSS movement to hide
that tooling limitation. Prior preview URL was
`http://127.0.0.1:4571/#project/motion-cut`; check/restart the background preview
before assuming it is still running. Use `HYPERFRAMES_NO_TELEMETRY=1`.

YouTube title drafted: “From OpenPlan3D Scan to Blender Render — An Astra 6 Experiment”.
The description explains the 30-second experiment, photo references, imperfect
scan alignment and interpreted details. “Astra 6” is the user's chosen naming in
the video; this is not an independently verified model product announcement.

## Local data and next steps

Original user archive:
`/Users/thelodgem1/Downloads/openPlan3d_4CFCA968_20260211_195745.zip`.
Preserve original bytes, geometry, photos, calibration and interchange formats.
Downloads media, Blender files, render frames and video projects are not backed up
by the app repositories. Archive/copy those folders separately before changing
computers. Temporary QA directories are not durable backups.

For native release work, read native `NEXT.md`, `docs/new-computer-handoff.md`,
the rendering plan, full-scan contract/validation report and issue #8. The older
handoff contains historical statements superseded by the full-scan implementation;
use its dated sections together with the current NEXT and validation report.

Prepare a signed device/TestFlight build for the intended target and verify which
App Store version is actually live before choosing release notes/version numbers.
This session did not query App Store Connect. Check real capture with new metadata,
Files/AirDrop round trips, camera denial, interruptions/backgrounding, long scans,
multi-floor editing and attachment-heavy saves. Physical-device capture and measured
reprojection remain pending; synthetic/legacy-transfer results do not close them.
Review older handoff client compatibility before any Storage-rules cutover (web
issue #30). Do not bundle the Blender experiment into a release as a finished app
feature. Review PR #95 and native PR #12 before deciding to merge their experiments.
