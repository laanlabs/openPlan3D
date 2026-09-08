# OpenPlan3D: current state and improvement roadmap

**Current handoff:** [NEXT.md](../../NEXT.md) records the remaining work as of
September 7, 2026. The initial findings and older “next” sections below are
historical; implementation progress is recorded in the subsequent batch log.

Reviewed September 5, 2026. Local working review of the web and iOS repositories, community issues and PRs, and Planner 5D's current advertised capabilities.

**Recommendation:** make the existing product dependable, establish faithful project exchange between iPhone and web, then expand design and presentation features. There is already enough functionality to support a useful free floor planner. The immediate gap is consistency and trust in the result.

**Owner constraint, added September 5:** keep Firebase Storage costs low. Apply this to every milestone, including storage capacity, downloads, request volume, and retention. Local editing, backups, and file exchange must remain useful without generating cloud-storage traffic.

## Firebase cost constraints

- **Store projects locally by default.** Use IndexedDB on web and session files on iOS. Keep autosave, undo history, and recovery snapshots local; upload only for explicit sharing or an enabled sync feature.
- **Keep the default handoff small and temporary.** Transfer compact geometry and editable metadata. Photos, video, USDZ/raw capture bundles, high-resolution renders, and custom models remain local unless the user explicitly includes them. Full-fidelity file/Files/AirDrop packages can carry all attachments. Clearly show which assets are included in a cloud handoff.
- **Avoid duplicate bytes and requests.** Reference bundled catalog models by stable IDs; serve common models/textures as cacheable static assets rather than copying them into each project. Cache imported data locally, reuse unchanged uploads during their valid lifetime, and bound retries. Future sync should batch changes and upload only changed assets, not a full project or image on every drag.
- **Bound hosted usage.** The current public create rule limits each JSON file to 10 MB but does not impose an aggregate upload budget. Set measured per-transfer/attachment limits and enforce upload admission/rate quotas before expanding the public service. Client-side limits alone are insufficient. Offer local file exchange when a hosted limit is reached.
- **Budget before adding durable cloud features.** Measure bytes per handoff, retained bytes including old/deleted versions, downloads per transfer, request counts, and monthly cost. Set a monthly dollar target with the owner before launching sync or persistent sharing. Include any supporting database/functions/hosting costs so savings in Storage are not simply shifted elsewhere. Firebase budget alerts notify; they do not cap spending. [Firebase billing guidance](https://firebase.google.com/docs/projects/billing/avoid-surprise-bills).

Verify the deployed inbox lifecycle, soft-delete, and versioning configuration early. A one-day delete rule does not necessarily mean only one day of billed storage: soft-deleted copies can remain billable, and lifecycle deletion is asynchronous. Inspect actual bucket settings rather than assuming the defaults. [Cloud Storage lifecycle](https://docs.cloud.google.com/storage/docs/lifecycle), [soft-delete cost guidance](https://docs.cloud.google.com/storage/docs/soft-delete).

If the inbox needs a different retention policy from durable user files, isolate temporary transfers in a dedicated bucket. Consider disabling soft delete/versioning only for those reproducible temporary copies, after confirming the original is safely stored on the user's device; retain appropriate recovery for durable project data. This is a design proposal, not a change to the live bucket.

**Cost acceptance gate:** ordinary editing generates zero Storage requests; default handoff excludes heavy media; expiry/retained-byte behavior and retry limits are verified; and each new hosted feature has a usage model and enforceable quotas consistent with the agreed budget.

## Evidence and limits

| Area | Reviewed state | Result |
| --- | --- | --- |
| Web | `abb5267581d4ca8d4df00f23c94fb55954de9d40`, also the current GitHub `main`; package version `0.9.0` | Clean starting checkout. Production build passes. |
| Web diagnostics | Fresh `npm ci`, `npm run check`, `npm run build` | **6 errors and 25 warnings** from type/Svelte checks; build still succeeds. |
| Existing web checks | `test-room-polygons.ts`, `test-orthogonal.ts`, `test-furniture-rotation.ts`, executed with Bun | All report passing. These are limited script checks, not a comprehensive regression suite. |
| Web browser | Local development build; two-bedroom template, dimension activation, 2D and 3D | Template reports **7 rooms / 80.0 m²**. 3D loads. Sidebar Dimension fails to activate; keyboard `N` works. |
| Additional web probes | Real source functions with disposable, in-memory storage and a stubbed SVG download | Confirmed destructive quota fallback, swallowed save failure, exported room-name loss, and closed issue #18's oversized hit region. No user projects were used. |
| iOS | `40cf059`, latest local commit dated August 21 | `openPlan3d` simulator build passes with Xcode 26.6. Initial package resolution stalled; retry succeeded after caching the official Realm binary, verified against the manifest checksum. |
| iOS tests | `FloorPlan` scheme / `FloorPlanTests`, iPhone 17 Pro simulator, iOS 26.5 | **27 tests passed, zero failures.** Coverage concentrates on legacy conversion/migration and persistence. |
| Native UI and capture | Source review; app installed/launched in a separate review simulator | Live UI inspection was blocked by pending macOS computer-use permissions. LiDAR, AR tracking, real-device performance, and actual cloud handoff were not exercised. |
| GitHub | All 15 web issues and 11 PRs, including descriptions, comments, and open PR diffs | **5 open issues, 7 open PRs.** First-pass PR triage, not approval to merge. |

During the initial review, no application source changes, PR merges, GitHub comments, deployments, or repository visibility changes were made. Subsequent implementation is recorded below. Temporary logs and probes are in `/tmp/openplan3d-review`; that directory is local scratch evidence, not durable project documentation.

## What exists today

### Web

The web app is a substantial SvelteKit/Svelte 5, TypeScript, Canvas 2D, and Three.js editor. Implemented capabilities include wall drawing and numeric properties, curves, snapping, room detection, several door/window styles, stairs and columns, furniture placement, multi-floor projects, layers, annotations, undo/history, image tracing, RoomPlan import, and PNG/SVG/PDF/DXF/JSON exports. The 3D viewer includes material editing, object interaction, interior cameras, walkthrough, screenshots, and optional AI rendering using the user's API key.

The current catalog contains **189 entries: 176 objects and 13 drawing symbols across 19 categories**. There are 204 GLB files on disk; asset-file count is not the same as distinct usable catalog items. Outdoor content, garage doors, spiral/L/U stairs, columns, and other features marked absent in older comparison files now exist.

Projects primarily live in browser `localStorage`. The `DataStore` interface is a useful starting point for replacing persistence without rewriting the editor. The Firebase implementation found in `main` is analytics plus the capture-inbox handoff; there is no implemented account-backed project synchronization or multiplayer editing. README wording about optional cloud sync overstates the current implementation.

Visual observations: the 1280×720 editor is dense, the project name becomes heavily compressed in the 2D toolbar, tool affordances are duplicated, and the default 3D view frames the house quite small against a large ground plane. Improve fit/framing, hierarchy, readable labels, and contextual controls as a focused usability pass.

### iPhone and iPad

This app has grown beyond the original Scan + Shoot requirements. It supports LiDAR RoomPlan capture, a guided AR measuring fallback, manual drawing, editable walls/openings/furniture, room labels, floors, elevation views, undo/redo, tracing images, notes/photos, plan statistics and entered costs, PDF/PNG/SVG output, dataset bundles, and a QR/link handoff to the web editor.

Its native stack is SwiftUI, ARKit/RoomPlan, SceneKit, and local session files. Edited plans use `PlanDocument` in metres. The manual furniture menu has **16 generic categories**, and edited-plan 3D furniture is represented with category-sized boxes. This is useful for measuring and documenting space, but it is a much smaller furnishing/presentation system than the web app.

Two targets share the code: `openPlan3d` and `FloorPlan`. Legacy Realm migration is important to the second target and already has meaningful tests. The project currently sets a minimum OS of **iOS 26.2**; review whether that is intentional before expanding distribution. Lowering it requires an API-availability audit and device testing, not just changing a setting.

The iOS GitHub repository is **private**, has no detected license, and has no issues or PRs. There is no root contributor README. Public open-source iOS distribution therefore needs an explicit publication/licensing decision and contributor setup work. This review does not change its visibility.

## Problems to address first

| Priority | Finding and evidence | Required outcome |
| --- | --- | --- |
| P0 | **A save can remove other projects.** The quota handler replaces the entire project map with only the current project. An in-memory quota probe confirmed loss of the other project. If the retry also fails, `save()` still resolves, allowing the UI to report success. [datastore.ts](/Users/thelodgestudio/projects/openPlan3D/src/lib/services/datastore.ts:24), [saveStatus.ts](/Users/thelodgestudio/projects/openPlan3D/src/lib/stores/saveStatus.ts:54) | Never delete unrelated projects to save one. Propagate errors, retain unsaved work, offer an immediate backup export, then migrate to transactional IndexedDB storage. |
| P1 | **Dimension/Measure buttons are disconnected from the canvas modes.** BuildPanel sets `annotate`/`measure` as tools, but the Tool union omits them and the canvas uses separate booleans toggled by `N`/`M`. Browser reproduction and the six type errors support [issue #24](https://github.com/laanlabs/openPlan3D/issues/24). [BuildPanel](/Users/thelodgestudio/projects/openPlan3D/src/lib/components/sidebar/BuildPanel.svelte:432) | One tool state shared by sidebar, keyboard, touch, and canvas; no type errors; visible mode and cancel behavior. Adding union members alone is insufficient. |
| P1 | **Exports discard edited room names.** PNG, SVG, PDF, and DXF paths re-detect rooms and use generated names rather than merged saved metadata. A direct SVG probe changed `Review Kitchen` back to `Room 1`, supporting [issue #25](https://github.com/laanlabs/openPlan3D/issues/25). [export.ts](/Users/thelodgestudio/projects/openPlan3D/src/lib/utils/export.ts:109), [cadExport.ts](/Users/thelodgestudio/projects/openPlan3D/src/lib/utils/cadExport.ts:44) | Room labels, units, materials, dimensions, and object bounds agree between editing and exports. Use a shared resolved floor representation across renderers. |
| P1 | **Selection and dragging are unreliable.** [#16](https://github.com/laanlabs/openPlan3D/issues/16), [#19](https://github.com/laanlabs/openPlan3D/issues/19), and [#21](https://github.com/laanlabs/openPlan3D/issues/21) have focused contributor fixes. **Closed [#18](https://github.com/laanlabs/openPlan3D/issues/18) still reproduces:** a 300 cm doorway captures a point 140 cm off the wall at 100% zoom, but not at 200%. [hitTesting.ts](/Users/thelodgestudio/projects/openPlan3D/src/lib/utils/hitTesting.ts:148) | Shared hit priority, opening-shaped hit regions, consistent zoom tolerance, size-aware snapping/handles, and reliable gesture completion/cancellation. Re-triage #18. |
| P1 | **iOS → web handoff loses information.** Web import hardcodes wall thickness to 15 cm, default door swing/side, and reads category rather than the iOS opening-style extension. iOS export itself omits hinge/swing fields and per-object photos/notes. [web import](/Users/thelodgestudio/projects/openPlan3D/src/lib/utils/roomplanImport.ts:630), [iOS export](/Users/thelodgestudio/projects/openplan3d-ios/openPlan3d/Models/PlanDocument+Export.swift:37) | Preserve every supported field and attached asset; report unsupported fields. Use a versioned native interchange format, with RoomPlan retained as a capture import adapter. |
| P1 | **Printed scale is currently a label, not a physical-scale calculation.** PrintLayout fits geometry to available canvas size independently of the chosen `1:50` etc. [PrintLayout](/Users/thelodgestudio/projects/openPlan3D/src/lib/components/editor/PrintLayout.svelte:65) | Either calculate and verify true output scale or label the output fit-to-page. Verify a known-length line in the generated PDF. This is a code finding, not a physical print test. |
| P2 | **iOS decoding can hide malformed data.** Entire element arrays use `try? decode… ?? []`; a failed array decode can appear as an empty successful plan. [PlanDocument](/Users/thelodgestudio/projects/openplan3d-ios/openPlan3d/Models/PlanDocument.swift:238) | Distinguish absent legacy fields from corrupted/unsupported content, retain the original file, and surface recovery options before saving a degraded document. Add targeted corruption fixtures. |

These defects share a theme: geometry, presentation metadata, and interaction state are calculated in several places. The 2D canvas component is 4,072 lines and the 3D viewer 2,659 lines. Extract tested tool/gesture, resolved-room, geometry, and export modules gradually while addressing real failures; retain the existing UI frameworks.

There are also two autosave paths (500 ms in the editor route and 5 seconds in `saveStatus.ts`). Consolidate them so the saved indicator describes the actual persistence operation.

## Community requests and PR handling

The strongest demand is for precise, predictable planning. Previous reports covered room detection, exact wall lengths, inner-face dimensions, floor colors, door styles, and exports. The current issues repeat that reliability theme. Some early comments explicitly describe abandoning the tool after geometry failures; rebuilding confidence should guide release order.

All seven open PRs currently report mergeable/clean in GitHub, but **none has reported status checks**. This is not evidence that they have passed integration testing.

| PR | First-pass assessment | Recommended handling / acceptance gate |
| --- | --- | --- |
| [#22: finish off-canvas drags](https://github.com/laanlabs/openPlan3D/pull/22) | Small, relevant fix for #21. Window move/up forwarding addresses the toolbar swallowing mouse-up. Patched component compiled in isolation. | First review batch. Reproduce toolbar overlap, sidebar release, and release outside the window. Follow up with pointer capture and cancel/blur handling as needed; the patch alone does not establish all those cases. |
| [#20: hit-test priority](https://github.com/laanlabs/openPlan3D/pull/20) | Small ordering correction for #19; moves selected handles ahead of overlapping objects. | First review batch. Verify selection against paint order and context-click at overlapping openings/objects. Handle #18's hit geometry separately. |
| [#17: effective furniture dimensions](https://github.com/laanlabs/openPlan3D/pull/17) | Useful shared size helper; corrects override-aware snap/hit testing and keeps the perpendicular wall offset exact. | First review batch. Test resized/mirrored/rotated items, diagonal walls, grid on/off, and furniture wider than a wall segment. |
| [#26: optional wall snap and anchored resizing](https://github.com/laanlabs/openPlan3D/pull/26) | **Stacked on #17**, including its baseline commit. Adds an independent setting and fixes opposite-edge anchoring. | Review after #17; rebase/update the diff to isolate the remaining change and preserve both authors' credit. Test the setting plus all handles at multiple rotations. |
| [#23: copy exterior walls / ghost floor](https://github.com/laanlabs/openPlan3D/pull/23) | Good multi-floor improvement with envelope tests and desktop seed choices. Also adds a Vercel adapter and a 3,008-line pnpm lockfile alongside npm's existing lockfile. | Next feature batch. Separate deployment/package-manager changes from floor behavior. Check envelope detection, partitions, empty floors, copied IDs/openings, level order, ghost visibility, and undo. |
| [#13: variable-height walls](https://github.com/laanlabs/openPlan3D/pull/13) | Valuable for slopes/gables, with changes across model, store, elevation, and 3D. A new Bun lockfile is bundled too. | Building-model milestone after interchange rules are defined. Verify opening clearance across the whole opening width, split/reverse operations, curved walls, stacked floors, old JSON, and export/import retention. It does not supply a complete roof system. |
| [#14: custom AI endpoints/proxy](https://github.com/laanlabs/openPlan3D/pull/14) | Useful provider configuration, but the proposed route fetches arbitrary HTTP(S) endpoints with caller-provided method/headers, without authentication, target restrictions, timeouts, or response limits. | **Do not merge the proxy as written.** Separate configuration from transport. Prefer direct requests or a user-controlled local service; a hosted proxy needs constrained destinations, redirect/DNS checks, access and resource limits. Hosted `localhost` refers to the server, not the user's laptop. See [OWASP SSRF guidance](https://cheatsheetseries.owasp.org/cheatsheets/Server_Side_Request_Forgery_Prevention_Cheat_Sheet.html). |

Closed contribution context:

- [#15](https://github.com/laanlabs/openPlan3D/pull/15) was closed by its author to split a broad English/Portuguese localization and interaction release. Preserve the translation, click-threshold, and numeric-input ideas as focused follow-ups; no replacement PRs appear in the current list.
- [#10](https://github.com/laanlabs/openPlan3D/pull/10) was closed after review for missing files/build failures and demo-only collaboration. It is not an implemented multiplayer backend. Some entourage/3D interaction ideas were subsequently implemented in `main`.
- [#2](https://github.com/laanlabs/openPlan3D/pull/2) was closed after base-path support was implemented separately. Newly added handoff URL replacements still hardcode `/editor`; add them to subdirectory regression checks.
- [#12](https://github.com/laanlabs/openPlan3D/pull/12), undo coalescing, is merged. Preserve it when changing numeric-input behavior.
- Closed [#4](https://github.com/laanlabs/openPlan3D/issues/4)/[#5](https://github.com/laanlabs/openPlan3D/issues/5) room-detection reports have fixes and a passing template smoke check. Keep their historical layouts as fixtures, alongside [#3](https://github.com/laanlabs/openPlan3D/issues/3)/[#6](https://github.com/laanlabs/openPlan3D/issues/6), [#7](https://github.com/laanlabs/openPlan3D/issues/7), [#8](https://github.com/laanlabs/openPlan3D/issues/8), [#9](https://github.com/laanlabs/openPlan3D/issues/9), and [#11](https://github.com/laanlabs/openPlan3D/issues/11). [#1](https://github.com/laanlabs/openPlan3D/issues/1) is self-hosting documentation feedback.

## Planner 5D comparison

This is a comparison against official advertised features, not a hands-on audit of its paid tiers. Its homepage lists 8,000+ objects while its pricing page lists 10,000+; the relevant gap is a catalog of thousands versus OpenPlan3D's hundreds, rather than a precise parity percentage. [Planner 5D homepage](https://planner5d.com/), [pricing/features](https://planner5d.com/pricing).

| Workflow | OpenPlan3D web | OpenPlan3D iOS | Improvement needed |
| --- | --- | --- | --- |
| Draw and dimension a floor plan | Broad functionality; current reliability defects | Useful native drawing and correction tools | Accurate joins, stable rooms, consistent dimensions, predictable gestures |
| Furnish and decorate | 176 object entries plus symbols, GLB/procedural models, materials | 16 generic manual categories, box-based edited previews | Shared catalog IDs, better assets/thumbnails, material controls, equivalent placement semantics |
| Multi-storey building | Floor tabs and stacked 3D; stairs | Per-level editing and exports | Floor elevations, slabs/stair voids, connected editing, roofs/slopes, cross-platform preservation |
| Capture an existing space | RoomPlan import and scaled image tracing | LiDAR/AR/manual capture plus photos | Reliable scan repair and handoff; later editable floor-plan recognition |
| Visualize | Interactive 3D, walkthrough, cameras, screenshots, optional AI images | SceneKit preview and scan models | Better lighting/materials/framing, reusable cameras, deterministic high-quality render output |
| Continue on another device | Local files and one-way capture inbox | Outbound handoff | Portable project package first; bidirectional exchange and optional sync next |
| Share and collaborate | File exports; no multiplayer implementation | Share sheet and handoff | Read-only project links, then comments/roles and concurrent editing |
| Organize a renovation | Floor plans and browser history | Notes/photos and basic entered-cost totals | Consistent attachments, room schedules, budget quantities, shopping lists/moodboards |
| Self-host and contribute | Public MIT repository, Node adapter | Private repository and two branded targets | Documented setup, configurable service URLs, clear license/distribution, release checks |

Planner 5D advertises editable mobile scan/import workflows and project/document organization. It also advertises live shared editing with view/comment/edit permissions, available including on its free plan. These are meaningful product gaps, not merely premium rendering extras. [iOS capabilities](https://planner5d.com/mobile/ios), [collaboration](https://planner5d.com/collaboration-tool).

Full feature matching therefore includes advanced rendering, custom model import, recognition/layout assistance, device continuity, and collaboration. Keep those in the long-term scope, while delivering a reliable free drawing → furnishing → viewing → exporting workflow first.

## Proposed delivery sequence

### Milestone 1 — Protect projects and repair everyday editing

1. Remove destructive storage fallback and propagate failure. Preserve a last-known-good copy; offer export recovery.
2. Add CI for `npm ci`, type checks, production build, core geometry/store tests, and a small browser workflow suite. Standardize the package manager and Node version.
3. Unify Dimension/Measure tool state and fix #24 plus the six type errors.
4. Review #22, #20, #17, then #26; repair #18 and add reproducible fixtures.
5. Resolve saved room metadata once for canvas/export, fix #25, validate units and bounds, and correct print-scale behavior.
6. Add iOS corruption/recovery tests while preserving the existing 27 migration/persistence checks.

**Exit gate:** no existing project is removed by quota/retry; failed writes never show Saved; named rooms and dimensions survive reload/export; clicks do not move objects unintentionally; drags finish/cancel reliably; all supported tool entry points work; CI is green. Run browser smoke checks on Chromium, Firefox, and WebKit, plus a real touch device.

### Milestone 2 — One project that travels between devices

Define a documented versioned interchange format, optionally zipped with assets. Include explicit units/coordinate conventions, stable IDs, floor levels/elevations, wall dimensions, opening type/orientation, room names/materials, furniture dimensions/catalog IDs, annotations, and attachments. Preserve unsupported extension fields and offer explicit migrations. Supporting attachments in the format does not imply uploading all attachments to Firebase: the default hosted handoff carries geometry/metadata, and complete packages can travel by local file exchange.

Keep Swift and TypeScript implementations, connected through schema fixtures and adapters. Retain Apple RoomPlan as an input format rather than making it carry every native editing feature. First preserve today's outbound data; then support web → iOS → web without silent loss. Move browser projects/assets to IndexedDB with a non-destructive migration from localStorage.

Make the hosted handoff service configurable for self-hosters. Check expiry/CORS and documented recovery with synthetic captures; the README's one-day lifecycle instruction does not prove it is deployed. Offer a file/Files/AirDrop path that works without the hosted inbox.

**Exit gate:** a two-storey fixture with a custom-named room, thick wall, flipped double door, resized/rotated furniture, note, and photo retains all supported properties through full-package file exchange. The default cloud handoff preserves geometry/metadata and explicitly identifies excluded attachments; attachment-inclusive cloud sharing is opt-in and size-limited. Meet the Firebase cost acceptance gate above. Define comparable area conventions: iOS currently uses raster-based enclosed area, while web uses detected polygons; do not promise matching totals without agreeing how wall faces are measured.

### Milestone 3 — Improve the building model and usability

Land the focused part of #23, then #13 with compatible interchange fields. Prioritize connected numeric wall edits, room split/merge identity, explicit floor heights, stair openings/slabs, and common roof forms. Use the same geometry validation in edit/import/export paths.

Improve the editor's first five minutes: clear draw/measure/furnish modes, touch-friendly controls, focused properties, deliberate click-versus-drag behavior, readable labels, and better 3D framing. Start with a few furnished templates that exercise real workflows. Follow up on #15's localization with a string system and English/Portuguese coverage.

For iOS, continue supporting its useful manual editing/correction features while prioritizing scan quality and interoperability. Run physical-device checks for LiDAR, non-LiDAR AR, denied camera access, interruption/backgrounding, long scans, multi-floor work, and attachment-heavy saves. Decide minimum OS and publication/license as explicit product choices.

**Exit gate:** a furnished multi-floor home can be drawn, revised, transferred, and exported without repairing broken joins or missing metadata. Complete a first-room usability check on desktop and iPhone with people unfamiliar with the app.

### Milestone 4 — Close furnishing and presentation gaps

Create one catalog manifest with license/source attribution, real dimensions, model scale/origin, preview image, and platform support. Curate complete kitchen, bathroom, bedroom, and living-room sets before pursuing raw item count. Add controlled custom GLB import and texture uploads, then broaden format conversion as needed.

Improve PBR materials, lighting, cutaway/dollhouse views, saved cameras, and image/export quality. Benchmark representative small, medium, and large homes; update changed objects instead of rebuilding the whole scene for every property edit. Add mobile quality settings based on measured performance.

**Exit gate:** repeatable before/after comparisons show materially improved rendering; catalog items keep consistent dimensions and appearance across views; a documented reference scene meets agreed desktop and phone frame-time/memory targets.

### Milestone 5 — Advanced Planner 5D workflows

Add shareable read-only projects, followed by optional account-backed synchronization, comments/permissions, and concurrent editing with defined conflict and offline behavior. Reuse the interchange and persistence work from Milestone 2. Gate hosted expansion on an agreed operating budget: use bounded retention and storage quotas, limit stored revisions, batch updates, and consider user-supplied storage or self-hosting for large libraries and long-lived media. Full hosted backup of every capture is outside the default free workflow.

Develop editable floor-plan recognition and layout assistance with user-reviewable results. Treat AI image generation separately from authoritative geometry and dimensional exports. Rework #14 around safe provider configuration and optional user-controlled compute. Add moodboards, shopping lists, and project budgets once catalog/attachment data is consistent.

**Exit gate:** versioned acceptance scenarios exist for each promised parity capability, including offline behavior, restoration, export fidelity, access controls, and compute costs. Keep core editing and file ownership available without an account; optional hosted/local AI and sync can have separate operating models.

## Suggested first implementation batch

Start with **storage safety, a green type-check/CI baseline, Dimension/Measure activation, and exported room names**. Include a read-only audit of the live inbox's retention settings and storage/download usage so future design starts from measured Firebase costs. In the same release cycle, review the four focused interaction PRs in dependency order. This batch directly addresses today's user reports and the most serious newly discovered issue, while creating the tests needed to accept larger contributions safely.

Replace the stale `FEATURES.md`/comparison checklists with a maintained capability matrix that distinguishes implemented, tested, partial, and planned. Add `CONTRIBUTING.md`, issue/PR templates requesting a minimal project fixture, and a release checklist built around the workflows above. Retain historical QA reports as dated history.

No calendar commitment is proposed until maintainer capacity and iOS scope are settled. The milestones are ordered by dependency and risk; full advertised Planner 5D parity is a program of work, not one release.

## Implementation progress — September 5, 2026

The first web reliability batch is implemented on `codex/reliability-baseline`.
The findings above describe the reviewed baseline; this section records subsequent changes.

| Work | Result |
| --- | --- |
| Storage safety | Removed quota-driven deletion of unrelated projects. A failed write preserves the existing library bytes and propagates failure. Invalid library JSON is never treated as an empty library during writes/deletes. |
| Save feedback and recovery | One debounced local autosave path, shared with Save and Cmd/Ctrl+S. Failed saves remain Unsaved and expose Retry/Download JSON. Library loading failures expose a raw library backup. Initial/template/imported projects remain in memory if saving fails; an iOS capture save failure no longer discards the downloaded capture. |
| Save lifecycle | Dispose autosave/history timers on editor exit; attempt saving on visibility loss and warn before closing with unsaved changes. Completed writes cannot mark newer edits as saved. |
| Dimension / Measure | Shared sidebar and keyboard activation, cancellation of conflicting placement modes, two-click/tap measurement, and corrected right-click endpoint handling. Dimension labels use an inline field instead of a blocking browser prompt. |
| Room exports | One room resolver combines freshly detected geometry with saved metadata by boundary wall IDs. Canvas, PNG, SVG, DXF, and PDF use it; same-name rooms keep distinct PDF schedule metadata. |
| Regression baseline | Vitest and 30 tests; Node 24/npm documented; GitHub Actions configured for install, type checks, tests, and build. Consult the pull request checks for current remote CI results. |

Validation: the 30 new tests pass; `npm run check` reports **zero errors and 25 existing warnings**;
the production build passes. Existing room-polygon, orthogonal-import, and furniture-rotation
scripts also pass. An in-app browser smoke check confirmed sidebar activation, an inline-labeled
dimension, a two-point measurement, and a renamed room surviving save/reload on a two-bedroom
template. Storage failures are covered by tests; a full browser quota/recovery test and the
Chromium/Firefox/real-device matrix remain to be added. No iOS source changed in this batch.

Firebase: all new persistence remains local and adds no Firebase Storage requests. The read-only
bucket audit could not proceed because the available `gcloud` account requires reauthentication.
Actual lifecycle, soft-delete, versioning, retained bytes, download volume, and monthly cost are
still unverified. No bucket configuration or cloud content was changed.

Dependency audit at completion of the first batch: the original lockfile reported 17 advisories (3 critical); this batch
reports 16 (3 critical). Critical entries for `jspdf`, `protobufjs`, and `websocket-driver` predate
this batch. Audit severity is not an exploitability assessment. Review supported upgrades and
affected runtime paths before the next public release; no broad automatic dependency fix was applied.

Next in Milestone 1: dependency remediation and focused interaction PR review (#22, #20, #17,
then #26), the door hitbox fix (#18), explicit print scale, browser workflow automation, and iOS
corruption/recovery coverage. Complete the live Firebase audit after credentials are refreshed.
The full milestone exit gate is not yet met.

### Second batch — dependencies and furniture interactions

Implemented on `codex/security-and-interactions`, based on the first batch. The original commits
from #22, #20, #17, and #26 are integrated with additional corner/mirror/minimum-size fixes,
single-action furniture undo, safer gesture completion, wall-snap geometry checks, and imported
project URL persistence. A clean audit now reports **zero advisories**. All **82 tests** pass,
type checks report **zero errors and 25 existing warnings**, and the production build passes.

Desktop interaction checks, phone-width tools/measurement, save/reopen, and 3D smoke checks were
performed in browsers. Download completion and the Firefox/real-device matrix remain unverified.
See the [batch report and repeatable browser checklist](2026-09-05-security-and-interactions.md)
for exact coverage, dependency details, cost impact, and remaining work. These changes were
subsequently merged and deployed, as recorded below. No new Firebase Storage traffic is introduced.

### Release and live Firebase audit

PRs [#27](https://github.com/laanlabs/openPlan3D/pull/27) and
[#28](https://github.com/laanlabs/openPlan3D/pull/28) are merged. The contributor
commits from #17, #20, #22, and #26 are preserved and those PRs are also marked
merged. Issues #16, #19, #21, #24, and #25 are closed. The merged implementation
branches have been removed. Main CI passed all 82 tests, type checks, audit, and
build; live browser checks covered import, furniture selection/resizing,
Undo/Redo, Save/reload, and 3D.

Firebase confirms successful deployment of `5d530e2`. A browser left open across
a rollout encountered a stale dynamic module; reloading recovered the editor.
[Issue #29](https://github.com/laanlabs/openPlan3D/issues/29) tracks production-build
and navigation hardening. Download completion and physical-device coverage remain
outstanding.

The previously blocked read-only Firebase audit now confirms the one-day inbox
lifecycle, seven-day soft delete, disabled versioning, and deployed rules matching
the repository. App Hosting accounts for most currently reported project cost,
so prioritize asset transfer and caching alongside temporary-file retention.
Budget settings remain inaccessible to the available account. See the
[live audit and prioritized cost follow-up](2026-09-05-firebase-cost-audit.md) for
evidence, measurement limits, and the proposed retention decision. No cloud policy
or capture content was changed.

### Third batch — deployment, downloads, printing and opening selection

The next web batch implements production-mode build enforcement, recovery from
stale deployment assets with local-save guards, SvelteKit URL synchronization,
visible-only furniture thumbnails, content-hashed model/texture URLs, physical
print scaling, and wall-aligned door/window selection. See the
[implementation and browser evidence](2026-09-05-web-reliability-and-costs.md).
The implementation passes 110 tests, type checks, build and dependency audit.
Cloud retention, upload quotas and billing-administrator work from #30 remain
outstanding; no iOS or live bucket policy changed in this batch.

### Fourth batch — multi-floor reliability and view cleanup

The feature work from #23 is integrated with independent wall copies, partial
exterior boundaries, unique floor levels, a floor-below reference, compact floor
controls, and correct stacked 3D elevations. Floor changes clear stale editing
context. Browser testing also led to cleanup of duplicate/unmounted 2D animation
loops and view subscriptions. All 135 tests pass with zero type errors and zero
dependency advisories. See the [batch evidence and limitations](2026-09-05-multifloor-reliability.md).
The remaining cloud cost controls in #30 are unchanged.

### Fifth batch — iPhone handoff and damaged-file recovery

Web imports retain iPhone wall/opening dimensions, styles and orientation, named
floors, empty floors and intentional angles. All RoomPlan import paths share
validation and defaults. iOS adds geometry JSON file sharing and explicit damaged
plan recovery with a preserved backup; unreadable edits cannot fall back silently
to the original scan. The suites pass 162 web and 37 iOS tests. See the
[batch report](2026-09-05-iphone-handoff-and-recovery.md) and
[versioned handoff contract](../handoff-format-v1.md). Full attachment exchange,
bidirectional editing and the remaining Firebase cost controls are still open.


### Sixth batch — cost controls and browser CI

Bundled textures are 84.7% smaller at unchanged pixel dimensions. Production
browser workflows now run in CI, with asset-transfer/caching checks and zero
external requests during local editing. The web and companion implement a staged
quota endpoint and reuse unchanged iPhone shares. Validation: 180 web unit tests,
three browser checks, 43 iOS tests and seven candidate-rule cases pass.

The legacy direct-upload rule remains for distributed iPhone compatibility, so
full aggregate enforcement still requires client release and rule cutover.
Keep the current recovery policy based on the measured retained bytes. A billing
administrator and monthly budget target remain outstanding. See
[the sixth-batch report](2026-09-05-cost-controls-and-browser-ci.md).

### Seventh batch — variable-height walls

Integrates community PR #13 with tested sloped mesh generation, opening-span
clipping and warnings, reversal that preserves door orientation, interpolated
split/exterior-copy heights, per-room ceiling decisions and consistent curved
walls in stacked views. The suite has 207 unit tests and a fourth browser
workflow. This work adds no Firebase Storage traffic. See the
[implementation and validation report](2026-09-05-variable-height-walls.md).

### Eighth batch — configurable floor elevations

Issue #42 adds independent floor elevations with legacy 300 cm defaults, local
persistence and undo/redo. Stacked geometry, placement and cameras follow the
same elevations, including basements. Settings supports compact screens. The
suite has 220 unit tests and adds desktop/390 px browser workflows without new
Firebase Storage operations. See the
[floor elevation report](2026-09-05-floor-elevations.md).

## Ninth batch: direct AI providers

Community PR #14 is integrated with browser-direct provider settings and model
refresh, manual model IDs, a corrected Responses model default, request
cancellation, and bounded error handling. Its unrestricted hosted proxy is removed;
no AI image storage or proxy bandwidth is added to Firebase. See
[direct AI provider review](2026-09-06-direct-ai-providers.md) for the transport
contract, compatibility limitations, contributor credit and validation.

## Tenth batch: connected wall dimensions

Issue #45 repairs numeric wall resizing so joined corners and room metadata survive
length changes. It adds fixed-endpoint selection, invalid/blank dimension recovery,
fractional lengths, consistent undo/redo, and simultaneous access to layers and
properties on desktop. See [the batch report](2026-09-06-connected-wall-dimensions.md).
No Firebase Storage or iPhone schema changes are introduced.

## Eleventh batch: native project validation and recovery

Issue #47 validates native JSON before replacing the active plan, supports older
files with missing arrays, and protects reopening/duplicate/version-restoration
paths from malformed geometry. Damaged files and history retain raw-backup paths.
See [the batch report](2026-09-06-native-project-validation.md). All processing
remains local with no added Firebase Storage usage.

## Twelfth batch: preserve work when opening projects

Issue #49 protects pending edits before valid imports, templates and New Project
replace the active plan. Duplicate imported IDs open as separate local copies;
failed saves retain backup/retry paths, and superseded file reads cannot replace
newer work. See [the batch report](2026-09-06-safe-project-opening.md). There are
no new Firebase Storage operations or iPhone schema changes.

## Thirteenth batch: local save conflicts

Issue #51 prevents older tabs from silently overwriting newer saved edits or
recreating deleted projects. Current tabs coordinate library writes, retain
conflicting work for backup and offer Save as copy. Recovery preserves later
edits and failed-copy paths. See [the batch report](2026-09-06-local-save-conflicts.md)
for browser compatibility limits and validation. All processing remains local.

## Fourteenth batch — IndexedDB local library

Projects, previews and ten-version histories move into separate IndexedDB stores with atomic migration, retained legacy recovery bytes, transaction-complete save status and old-tab recovery copies. Full-library backups are available from the library. This removes localStorage's project-size bottleneck without adding Firebase storage. See [implementation and verification](2026-09-06-indexeddb-library.md). Whole-library restore UI, image deduplication and complete two-way iPhone file exchange remain follow-up work; issue #30 still covers the device release, quota cutover and billing controls.

## Fifteenth batch — complete local library restoration

Current and legacy library backups can be previewed and restored as independent copies, with valid history rebound to each new project ID. Damaged bytes remain in future recovery backups. The whole restore, including destination migration, commits atomically; cancellation and failed writes retain existing data and allow retry. See [implementation and verification](2026-09-06-library-backup-restore.md). Complete iPhone ↔ web file/attachment exchange and image deduplication remain next engineering priorities; issue #30 still covers the iPhone release and Firebase cost controls.

## Sixteenth batch: local iPhone ↔ web project packages

A versioned ZIP carries the current edited plan, referenced attachments and retained native/web data. Both clients preview imports and add independent local copies atomically. Baseline comparisons apply cross-platform edits without flattening untouched web-only fields; actual Swift return fixtures and browser regressions cover both directions. See [package format and fidelity limits](../project-package-v1.md). Equivalent web photo/notes/cost controls and catalog fidelity remain follow-ups; native distribution and Firebase cost controls remain in #30.


## Seventeenth batch: local item details and photos

Issue #59 adds web editing for retained item notes, furniture/opening costs, room photos/classification/ceiling metadata and wall construction materials. Local photo import resizes and reuses bytes, with explicit detach/delete behavior and project/history budgets. Saved versions share attachment bytes and retain backup/quota recovery; both old array histories and the new pooled format can be restored. Actual Swift metadata returns, desktop/mobile browser workflows and failure paths verify preservation. See [package and local-storage details](../project-package-v1.md). Catalog/rendering fidelity and native distribution remain further work; Firebase migration/billing gates remain in #30.

## Eighteenth batch: consistent furniture rendering

Issue #61 preserves chosen furniture colors/finishes and translucent placement previews after GLB loading, isolates disposable instance resources, and shares lazy model requests with catalog thumbnails. Late completions cannot revive removed scenes; failed files retain procedural fallbacks without repeated downloads. A fireplace no longer renders as a toaster, and wall transparency leaves furniture finishes intact. See [rendering behavior and verification](2026-09-06-furniture-rendering.md). Broader catalog parity, native rendering/distribution and the cost gates in #30 remain follow-up work.


## Nineteenth batch: furniture category continuity

Issue #63 adds shared display mappings for native/web furniture, neutral unknown
previews, procedural imported stairs and native alias-aware glyphs/icons/heights.
Original categories and dimensions survive actual Swift return packages and
legacy chair fallbacks remain protected on export. Local validation passes 537
web unit tests and 53 XCTest tests. See [the category report](2026-09-07-furniture-categories.md)
for compatibility details and PR verification. Browser coverage, native release
and Firebase cost gates remain the next priorities.

## Twentieth batch: browser coverage and field keyboard editing

Issue #65 adds full production-browser CI for Chromium, Firefox and WebKit with
one shared build and an aggregate status gate. Interactive Safari QA reproduced
canvas shortcuts stealing text-field input; keyboard regressions also exposed
empty furniture dimensions being committed as 1 cm. Both editing paths are
repaired, with fractional values, text clipboard/undo and local recovery retained.
See [the browser report](2026-09-07-cross-browser-editing.md) for validation and
remaining device coverage. Measured 3D resource work is the next engineering batch;
native distribution and the Firebase release/billing gates remain in #30.


## Twenty-first batch: camera previews and measured 3D resource cleanup

Issue #67 reproduces blank reopened previews, retained WebGL contexts and texture
allocation growth across scene rebuilds. Camera canvases and renderers now share a
lifecycle; scene-generated textures have explicit ownership, and wall highlights
restore/dispose their materials before rebuilds and reapply the selection. Local
validation passes 544 unit tests. See [the resource report](2026-09-07-viewer-resources.md)
for measurements, browser checks and their limits. Broader hardware performance
benchmarks, physical-device coverage and the release/cost gates in #30 remain.


## Twenty-second batch: furnished-home benchmarks and metadata editing

Issue #69 adds deterministic small/medium/large local projects and a separate
Chromium benchmark job with desktop/phone-viewport measurements. Project names
and item metadata no longer rebuild the 3D scene or reset its camera; geometry,
finishes, history and area units still refresh. Local validation passes 562 unit
tests. See [the benchmark report](2026-09-07-rendering-benchmarks.md) for results,
measurement limits and browser validation. Hardware calibration, further visual
edit performance, physical-device coverage and the #30 release/cost gates remain.


## Twenty-third batch: responsive top-down camera framing

Issue #71 fixes outside rooms being cropped at phone width and corners covered by
the toolbar in landscape. The shared camera fit now handles a stable top-down
orientation, overlay clearance and distant/stacked bounds. Top-Down clears pending
orbit motion and exits walkthrough. Local validation passes 582 unit tests;
rendered corner pixels are checked across three viewports and all CI engines.
See [the framing report](2026-09-07-top-down-framing.md). Hardware calibration,
physical-device coverage and the #30 release/cost gates remain.


## Twenty-fourth batch: onboarding hints after viewport changes

Issue #73 fixes hints retaining desktop coordinates after the screen narrows.
Measured placement keeps the bubble inside the viewport and Got it visible in
short layouts; animation and dismissal timers have cleanup and resizing preserves
their deadline. Local validation passes 582 unit tests; two browser workflows add
viewport, hit-testing, timeout and saved-dismissal checks across all three engines.
See [the hint report](2026-09-07-onboarding-hints.md). Hardware calibration,
physical-device coverage and the #30 release/cost gates remain.

## Twenty-fifth batch: idle 3D rendering and native Safari calibration

Issue #75 stops continuous animation callbacks after orbit damping settles, wakes
the viewer for dirty changes and furniture previews, and cancels work on teardown.
Native Safari on M4 Max measured 1,500 callbacks before and zero after in matched
25-second quiet intervals; a warm post-orbit repeat also returned to zero. Local
validation passes 591 unit tests, with one new workflow across all three browser
engines. See [the report and numeric metrics](2026-09-07-idle-rendering.md) for
measurement limits and PR validation. Frame-rate-independent walkthrough motion
is tracked in #77. Broader hardware budgets, physical devices and the #30
release/cost gates remain; this batch adds no cloud writes or assets.

## Twenty-sixth batch: walkthrough timing and input recovery

Issue #77 replaces fixed per-callback movement with elapsed-time integration,
consistent drag/coasting and short camera-motion substeps. It preserves the
existing speed calibration, horizontal movement and floor-relative eye height.
Blur, visibility and mode transitions clear held input and momentum; slider
arrows and both Shift keys behave independently. Local validation passes 607 unit
tests, with two new browser workflows for controlled cadence, rendered motion,
pause recovery and field input. See [the timing report](2026-09-07-walkthrough-timing.md)
for limits and PR validation. Hardware calibration, physical devices, native
release and the #30 cost gates remain; this batch adds no cloud writes or assets.

## Twenty-seventh batch: stationary walkthrough and larger Safari fixtures

Issue #80 stops walkthrough callbacks after input and coasting settle, wakes on
fresh keyboard/mouse/field/scene changes, and excludes elapsed idle time on wake.
Native Safari on M4 Max measured 1,500 callbacks and rendering frames before and
zero after in matched 25-second stationary medium/large-home intervals. Local
validation passes 614 unit tests. The browser suite adds idle/wakeup assertions
and retains cadence, pause and real-frame movement coverage. See
[the report and sanitized metrics](2026-09-08-walkthrough-idle.md) for measurement
limits and final PR/CI status. A repeated production update notice with a likely
cache-validator collision is tracked separately in #81. Active-navigation/device
budgets, native release and #30 cost gates remain; no cloud writes or assets are added.
