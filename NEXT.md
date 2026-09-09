# Next work and pause handoff

Updated September 9, 2026. This is the current backlog for the web app and iPhone
companion. It supersedes the historical “next” sections in the
[original review and batch log](docs/reviews/2026-09-05-current-state-and-roadmap.md).
Priorities below are proposed order, not release dates or a claim of complete
Planner 5D parity.

## Computer-switch handoff

For the archived September 8–9 scan/render/video session, start with the
[session handoff](docs/session-handoff-2026-09-09.md). It records the final video
and Blender files, public default-model deployment, open experimental PRs and
native release work that remains.

Start the next session with the native
[new-computer handoff and copyable prompt](https://github.com/laanlabs/openplan3d-ios/blob/main/docs/new-computer-handoff.md).
It records setup, tested state, local data that does not transfer through Git,
and the next bounded implementation batch. The native repository is private and
requires an authorized GitHub account.

Rendering direction: **Blender Cycles on the Mac for finished renders; Three.js
for interactive web previews/editing/walkthroughs**. Share the geometry, camera
and texture preparation pipeline. Start with the full scan dataset and calibration
validator, then the Blender path; keep the existing native preview and web
renderer during that work. Browser path tracing is optional future scope. See
[the rendering plan](https://github.com/laanlabs/openplan3d-ios/blob/main/docs/universal-app-and-rendering-plan.md).
Keep full scans, photo textures, render jobs and outputs local by default.

## Native full-scan v1 dataset slice

The native continuation adds a normative v1 contract, bounded streamed local
scan import/export, corruption/path-traversal regression coverage and explicit
calibration/coordinate metadata. Complete Mac Catalyst and iPhone simulator
suites each pass **82 tests**, including a transferred legacy real scan: all
394 original files / 194 frame pairs retain identical bytes and hashes through
export, independent import and re-export. Private scan content stays out of Git.
See [the native validation report](https://github.com/laanlabs/openplan3d-ios/blob/main/docs/full-scan-v1-validation.md)
and [contract](https://github.com/laanlabs/openplan3d-ios/blob/main/docs/full-scan-v1.md).

All transferred frames remain `legacy-incomplete`. Physical capture with the new
metadata and measured reprojection are still pending. Native issue #8 remains
open for physical calibration, captured-camera rendering and photo texturing.
The native original-scan queue now includes status/cleanup/limits UI, verified
image previews and save dialogs, plus submit/list/cancel/remove/export local
commands. A separate pinned Blender worker supports continuous queue processing,
immutable RoomPlan preparation, cancellation and crash recovery. **91 native tests
ran on each platform with one optional skip and zero failures; 40 renderer checks
and three CLI checks passed**, including real Blender and Swift/Python handoff.
See `docs/native-render-queue-validation.md` in the native checkout. Full-scan
exports also handle macOS ancestor path aliases correctly. Signed worker
packaging, edited-plan adapters and measured photo projection remain open.
Rendering stays local: Blender Cycles for finished renders and Three.js for web
previews with shared preparation. This batch changes no web runtime, Firebase
storage/quotas, project-package format or rendering engine.

## Current implementation baseline

The user's new priority is a **universal iPhone/iPad/Mac app with local commands
and eventual photo-based RoomPlan rendering**. The native implementation plan is
tracked in [native issue #8](https://github.com/laanlabs/openplan3d-ios/issues/8)
and [the detailed roadmap](https://github.com/laanlabs/openplan3d-ios/blob/main/docs/universal-app-and-rendering-plan.md).
Start with Catalyst and local saved-plan commands, then a portable full scan
dataset with calibrated photographs, a separate local Blender worker, and
measured photo projection/texturing. Native source is in the currently private
companion repository; this is separate from web delivery or an App Store release.
Keep scan photos, intermediate assets and rendering off Firebase by default.
The existing 64 MiB project ZIP is not the full scan dataset format.

The furniture category batch for [#63](https://github.com/laanlabs/openPlan3D/issues/63)
is implemented in both repositories. Package/RoomPlan imports share category
rules, native display aliases recognize web IDs, unknown categories remain
identifiable, and imported stairs have a procedural preview. Source categories,
IDs, fractional dimensions and metadata survive actual native return packages.
See [the batch report](docs/reviews/2026-09-07-furniture-categories.md) and GitHub
PR checks for merge/release status and final browser CI results.

The browser compatibility batch for [#65](https://github.com/laanlabs/openPlan3D/issues/65)
adds the full CI suite to Chromium, Firefox and WebKit, fixes canvas shortcuts
intercepting field editing, and preserves furniture dimensions while replacing
empty/invalid drafts. See [the browser report](docs/reviews/2026-09-07-cross-browser-editing.md)
and PR checks for final engine results and merge/release status.

Local validation: **654 web unit tests**; native dataset work passes **82 XCTest
tests on Mac and 82 on the iPhone simulator**. Production web build and audit pass; type checks report zero
errors and zero Svelte warnings.
Desktop and phone-width browser checks cover labels, editing, persistence and
3D. Native source availability remains separate from TestFlight/App Store release.

Already delivered: storage safety and recovery; connected editing and numeric
dimensions; named-room exports and physical PDF scale; dependency remediation;
floor elevations and sloped walls; direct AI provider configuration; safe imports
and project switching; local tab conflict recovery; IndexedDB migration; full
library backup/restore; two-way local iPhone/web packages; editable item
notes/photos/costs and pooled attachment history; furniture appearance fixes;
category continuity; field keyboard editing and browser-engine CI; camera preview
and 3D resource cleanup; repeatable furnished-home benchmarks and preservation of
3D views during metadata edits; responsive top-down camera framing; onboarding
hints that stay within resized viewports; idle 3D animation cleanup measured in
native Safari; walkthrough timing, held-input recovery and stationary rendering cleanup;
2D drawing on demand with explicit display/image wakeups; modal keyboard protection;
keyboard-accessible library actions with explicit, recoverable rename/delete dialogs.
See [the library actions report](docs/reviews/2026-09-08-library-actions.md) and PR checks
for final browser CI and deployment verification. Earlier batches and pause hashes are recorded
in the dated review log and git history.

## 1. Next engineering batch: device measurements and measured editor work

The deployment check for [#81](https://github.com/laanlabs/openPlan3D/issues/81)
bypasses stale size/mtime validators when reading the version file. Native Safari
confirmed the stale cached response and the fixed editor's unconditional request.
The same polling limits, immutable asset caching and save-before-reload recovery
remain. Real HTTP-cache regressions cover equal-size version replacements and
recovery. See [the report](docs/reviews/2026-09-08-deployment-version-cache.md) and
[#83](https://github.com/laanlabs/openPlan3D/pull/83) for final CI, native Safari
and deployment verification.

The measured resource batch for [#67](https://github.com/laanlabs/openPlan3D/issues/67)
repairs blank reopened camera previews, releases renderer contexts and replaced
scene textures, and disposes/reapplies wall highlights through rebuilds. The
pre-fix browser measurements confirmed retained contexts and texture growth. See
[the resource report](docs/reviews/2026-09-07-viewer-resources.md) and PR checks for
final validation and merge/release status.

The furnished-home batch for [#69](https://github.com/laanlabs/openPlan3D/issues/69)
adds deterministic small/medium/large fixtures, desktop/DPR-2 phone-viewport CI
measurements, and a scene snapshot that avoids rebuilding on project names and
item notes/costs/photos. Geometry, finishes, history and area-unit changes still
refresh. See [the benchmark report](docs/reviews/2026-09-07-rendering-benchmarks.md)
for results and measurement limits; CI software rendering is not a device budget.

The [top-down framing batch (#71)](https://github.com/laanlabs/openPlan3D/issues/71)
fits both screen axes, reserves vertical overlay space, clears pending orbit
motion and includes distant/stacked geometry in the visible depth range. Corner
projection and browser pixel checks cover portrait, desktop and landscape layouts.
See [the framing report](docs/reviews/2026-09-07-top-down-framing.md) and PR checks
for validation and release status.

The [onboarding hint batch (#73)](https://github.com/laanlabs/openPlan3D/issues/73)
tracks viewport changes and measured hint bounds, keeps the dismissal button
visible on short screens, and cleans up animation/timer callbacks. Resizing does
not restart the eight-second timeout; manual and automatic dismissal still retain
seen-tip behavior. See [the hint report](docs/reviews/2026-09-07-onboarding-hints.md)
and PR checks for browser validation and release status.

The [idle-rendering batch (#75)](https://github.com/laanlabs/openPlan3D/issues/75)
replaces continuous orbit polling with requested frames that stop after damping.
Native Safari on M4 Max recorded 1,500 idle callbacks before the change and zero
after it in matched 25-second intervals; a post-orbit repeat also returned to zero.
See [the report and sanitized metrics](docs/reviews/2026-09-07-idle-rendering.md).
The regression checks controls, scene changes, placement previews and teardown in
all three engines. It also fixes the desktop Help button covering Lighting Controls.
These results establish idle behavior, not general FPS or
battery-life targets.

The [walkthrough timing batch (#77)](https://github.com/laanlabs/openPlan3D/issues/77)
uses elapsed animation time and consistent acceleration/coasting, bounds stall
catch-up, and clears input on blur, visibility changes and mode transitions.
Field arrows and both Shift keys have independent behavior. Controlled tests
compare equal-duration movement/look at 30/60/120 Hz and preserve floor-relative
eye height. See [the timing report](docs/reviews/2026-09-07-walkthrough-timing.md)
and PR checks for final browser, native Safari and deployment verification.

The [stationary walkthrough batch (#80)](https://github.com/laanlabs/openPlan3D/issues/80)
stops frame requests after input/coasting settles and wakes for keyboard, mouse,
eye-height and scene changes. Native Safari recorded zero callbacks and rendering
frames in medium/large 25-second stationary samples, down from 1,500 each. See
[the report and numerical measurements](docs/reviews/2026-09-08-walkthrough-idle.md)
for provenance, limits and final PR/CI verification.

The [2D drawing batch (#84)](https://github.com/laanlabs/openPlan3D/issues/84)
replaces idle dirty-flag polling with coalesced redraw requests. Local display,
camera/minimap controls and image completions wake the canvas; late underlays
cannot replace another floor's image. See [the report](docs/reviews/2026-09-08-2d-idle.md)
and [PR #85](https://github.com/laanlabs/openPlan3D/pull/85) for native measurements,
browser regressions and final deployment status.

Next, measure active orbit, stacking and editing on representative desktop/phone hardware and agree
frame-time and memory targets. Use those results to choose shared geometry,
object-level visual updates or mobile quality controls. Extend desktop Safari
checks to actual iPhone/iPad touch devices. The initial small-home native Safari
calibration and initial medium/large stationary walkthrough samples are complete;
repeated active-navigation measurements and physical phones remain. Keep category contract
fixtures in both repositories synchronized when extending the catalog.

The [legacy preview batch (#86)](https://github.com/laanlabs/openPlan3D/issues/86)
refreshes identifiable old chair fallbacks on opening saved projects, JSON and
history copies. Retained native categories determine presentation; edited geometry,
explicit replacements, photos and unknown fields stay intact. Reading leaves raw
library/history recovery bytes untouched, and normal saves retain the existing
category marker. Unsupported or ambiguous retained data remains recoverable;
RoomPlan chairs without a retained source are not guessed. See
[the report](docs/reviews/2026-09-08-legacy-furniture-previews.md) and PR checks for
final browser and deployment verification.

The [modal keyboard batch (#88)](https://github.com/laanlabs/openPlan3D/issues/88)
prevents editing shortcuts from changing a selected object behind an open dialog.
Native dialogs provide focus and background inertness; keyboard guards also cover
window/document listeners, elevation Escape and 3D input. Command actions execute
after their palette closes. Area Summary safely includes imported room categories
it does not recognize and releases its subscriptions when closed.
See [the report](docs/reviews/2026-09-08-modal-keyboard-safety.md)
and PR checks for final browser, Safari and deployment verification.

## 2. Release and Firebase cost gates

Keep [#30](https://github.com/laanlabs/openPlan3D/issues/30) open until all three
remaining gates are verified:

1. **Ship and test the updated iPhone client.** Prepare TestFlight/App Store
   distribution; exercise Files/AirDrop package exchange and real LiDAR/AR
   capture on physical devices; establish older-client compatibility requirements.
2. **Migrate clients, then cut over Storage rules.** Legacy public direct creates
   are still enabled. The staged admission endpoint has quotas, but this bypass
   means there is **no aggregate bucket cap yet**. After migration, deploy the
   reviewed candidate and verify anonymous creates/private ledger access are
   denied while admitted writes, valid links and local file exchange work.
   Candidate rule tests passed; active rules have not been cut over. Follow
   [the migration procedure](docs/handoff-quotas.md), including updating committed
   `storage.rules` so later deployments cannot reopen the bypass.
3. **Agree a monthly budget with a billing administrator.** Include Storage,
   both App Hosting backends and supporting services. Configure/verify alerts;
   the audit account lacks billing-account access and the Budget API was disabled
   at the audit. Alerts notify; they do not enforce a spending cap. Recheck current
   telemetry and retained bytes before changing quotas or retention.

Preserve the low-cost design: ordinary editing, history, backups, photos and full
project-package exchange stay local. Reuse bundled, cacheable catalog assets and
unchanged temporary shares; keep downloads lazy. The endpoint currently bounds
captures to 1 MiB, 100 reservations or 25 MiB per UTC day, and 10 reservations per
minute. Failed writes retain reservations. These limits do not cap downloads or
total spending. Keep the audited one-day inbox lifecycle and seven-day soft delete
unless new measurements justify a reviewed change. Avoid adding a database,
durable cloud copies, sync or media uploads without a cost model and enforceable
quotas. See the [cost audit](docs/reviews/2026-09-05-firebase-cost-audit.md) and
[cost/browser report](docs/reviews/2026-09-05-cost-controls-and-browser-ci.md).

## 3. Remaining quality and fidelity work

These are follow-up work areas, not claims that every item is a reproduced bug.

- **Browser and device coverage:** keep all three CI engines passing; broaden
  the bounded desktop Safari pass and test actual iPhone/iPad touch, gestures,
  downloads/share sheets and storage/quota recovery. Exercise native denied camera access,
  interruption/backgrounding, long scans, multi-floor work and attachment-heavy
  saves. Run a first-room usability session with unfamiliar desktop/iPhone users.
- **3D performance:** keep the measured preview-context and scene-allocation
  regressions passing. The confirmed cleanup defects are addressed in #67/#68.
  Use the new furnished-home benchmarks to agree desktop/phone frame-time and
  memory targets on real hardware. Metadata edits now preserve the scene; visual
  edits still rebuild it. Measure shared geometry, object-level updates and mobile
  quality settings before choosing the next optimization. Stationary walkthrough
  now stops drawing after coasting; preserve mouse, keyboard and scene wakeup
  coverage when changing scheduling. The medium/large stationary Safari samples
  do not establish active-navigation FPS, memory or battery targets. The 2D
  canvas now also sleeps between changes. Preserve tool, touch, image and display
  wakeups when extending the editor; measure active editing cost before selecting
  another rendering optimization.
- **Area/geometry agreement:** define whether area is measured at interior wall
  faces or another boundary, reconcile native raster-based areas with web polygons,
  and test room split/merge identity and schedules. Matching area totals are not
  yet an established cross-platform guarantee.
- **Building completeness:** implement slabs, stair voids and common roof forms.
  Floor elevations and variable endpoint wall heights already exist. Extend native
  editing/preview fidelity for curves, slopes, elevations, opening styles and
  annotations while retaining unsupported data through package returns.
- **Known package presentation limits:** native previews still use straight,
  uniform-height walls and simplified furniture; only one unrotated first-floor
  embedded PNG/JPEG/GIF tracing image maps to the native underlay. Other imagery
  settings remain retained. Unenclosed native room labels are preserved without
  web room fill. Room ceiling overrides travel as metadata; web wall heights
  continue to govern 3D geometry. Broaden these capabilities deliberately with
  preservation tests. Original unsupported attachment formats remain downloadable;
  web photo previews are bounded JPG/PNG. See the package contract for exact limits.
- **Catalog and rendering quality:** maintain a catalog manifest with source/license
  attribution, real dimensions, scale/origin and platform support. Curate complete
  room sets, improve native furniture visuals, and refine materials, lighting,
  cutaway/dollhouse views, framing, saved cameras and deterministic render/export
  quality. Current finishes are visual controls, not physical material simulation.
- **Localization and usability:** revive English/Portuguese localization from
  closed community [PR #15](https://github.com/laanlabs/openPlan3D/pull/15) as a
  focused string-system change. Recheck first-use navigation, dense toolbars,
  readable labels, accessibility and touch property editing. Earlier interaction
  fixes are already merged; reproduce any remaining problem before changing them.

## 4. Longer-term Planner 5D parity

- Controlled local custom GLB/model import and bounded texture assets, then other
  formats as justified; retain provenance, size limits and safe failure behavior.
- Editable floor-plan recognition, scan repair and layout assistance with results
  users can review. AI images remain separate from authoritative measured geometry.
  Direct AI providers already exist; do not revive the unrestricted hosted proxy
  from the original community proposal.
- Read-only sharing, optional account-backed sync, comments/permissions and
  concurrent editing with explicit offline/conflict/recovery behavior. These are
  not implemented cloud features. Start only after the cost gates above; consider
  self-hosting/user-supplied storage for durable large libraries.
- Consistent room schedules, quantity budgets, shopping lists and moodboards.
  Existing item notes/photos and entered costs provide the starting data.

## 5. Repository and release maintenance

- Replace stale `FEATURES.md` and comparison checklists with a tested capability
  matrix. Refresh README counts/import features and add contributor guidance,
  fixture-oriented issue/PR templates and a release checklist. Historical review
  findings and original package metadata are not authoritative current status.
- The seven remaining Svelte warnings are resolved in the local keyboard/component
  cleanup batch: native favorite buttons, protected control activation/Tab, explicit
  inline-editor focus, reactive menu bounds and removal of the retired material
  picker. See [the validation report](docs/reviews/2026-09-09-editor-keyboard-cleanup.md).
  Keep zero-warning type checks passing. The local WebKit modal failures were
  traced to default Backspace navigation on buttons and are fixed; text deletion
  remains native in editable fields. The CI artifact actions use pinned Node 24
  releases; continue dependency auditing.
- Decide whether to publish/license the currently private iOS repository, add a
  root contributor README, and clarify the two native targets/release branding.
  Review the current iOS 26.2 minimum before distribution; lowering it requires
  an API-availability audit and device testing. These are product/release decisions.

## Resume checklist

1. Fetch both repositories and confirm clean `main` against `origin/main`; reread
   open GitHub issues and #30 for release updates. Start a focused `codex/…` branch
   from current main after checking the browser batch merge status.
2. Broaden furnished-home hardware calibration and device coverage; measure active
   orbit, stacking and editing before selecting another rendering optimization. Preserve unknown fields,
   explicit clears, independent import copies, fractional transforms and pooled
   local attachments. Do not rely on temporary QA directories as source artifacts.
3. Web baseline: Node 24/npm; run `NODE_ENV=production npm run check`,
   `NODE_ENV=production npm test` and `NODE_ENV=production npm run build`.
   Finish check before starting build; both regenerate SvelteKit artifacts.
   Production browser workflows run in GitHub CI with cloud uploads/analytics
   disabled. Use the approved browser-control tools for local interactive QA.
4. Native baseline: `openPlan3d.xcodeproj`, scheme `FloorPlan`, Debug simulator
   tests with `CODE_SIGNING_ALLOWED=NO`. Select an available simulator; rerun
   actual native return-package fixtures when the contract changes. Complete
   physical-device release checks separately.
5. Keep documentation/issues aligned with results, merge only after relevant
   checks, verify deployment for application changes and remove merged branches.
   Browser QA projects are local browser data, not source-controlled project files.

## Local Three.js render test

An isolated `/render-lab` route now supports local GLB loading, interactive
preview and progressive GPU path tracing with spatial noise reduction. A private
Blender photo-study scene was exercised locally; its model and media remain out
of this repository. See [setup, verified results and limits](docs/render-lab.md).
The render-lab batch passed 653 unit tests and a production build. The subsequent
keyboard cleanup passes 654 unit tests with zero type errors or Svelte warnings.
Desktop camera presets, mode switching, pause and PNG export were exercised.
This remains a test branch: finish material baking, browser/device qualification
and shared scene integration before replacing
any viewer. Physical-device capture and measured reprojection remain pending.
