# SKILLS.md

Playbooks for common work in this repository. Each entry is **when → steps →
verify → record**. Keep them short and link to the authoritative docs rather than
copying them.

> Not the same as `src/lib/skills/`. That directory holds the app's assistant
> skill ports (summary/photos/handoff) exercised by `tests/skills-parity.test.ts`.
> This file is for agents working on the codebase.

Before any change, read [AGENTS.md](AGENTS.md) for commands, conventions and the
definition of done.

## 1. Add or change a 2D editor feature

**When:** new tool, canvas interaction, selection, or Properties-panel behavior.

1. Add the state/action in `src/lib/stores/project.ts`; group edits with
   `beginUndoGroup`/`endUndoGroup`, and use a `*DuringDrag` helper for live drags.
2. Implement in `src/lib/components/editor/` (canvas/interaction) and, if it is
   user-editable, in `src/lib/components/sidebar/PropertiesPanel.svelte`.
3. Add any user-facing strings to both `src/lib/i18n/locales/en.ts` and `pt.ts`.
4. **Verify:** unit test for the logic; Playwright regression in `tests/browser/`
   importing a small fixture and asserting the user-visible result.
5. **Record:** update [FEATURES.md](FEATURES.md) and [NEXT.md](NEXT.md) when scope
   or remaining work changes.

## 2. Add or change a 3D viewer feature

**When:** anything rendered or selected in `viewer3d/ThreeViewer.svelte`.

1. Register selectable meshes in `elementMeshMap` with an `{ id, kind }` ref;
   reuse `src/lib/utils/elementHighlight.ts` and `threeGizmo.ts`.
2. Rebuild via `rebuildScene(force, reframe)`; only re-frame the camera when the
   floor identity changes so editing does not reset the view.
3. **Verify:** top-down framing makes center-clicks hit the target. Add a
   `tests/browser/` spec that selects, edits, exports and asserts camera
   stability. Chromium drives the gizmo; Firefox/WebKit cover the rest.
4. **Record:** note selection/edit scope and any untagged elements as limits.

## 3. Change geometry or the data model

**When:** room/wall/opening math, or a new field on a model type.

1. Start from the helpers and fixtures in `tests/fixtures/project.ts` and the
   existing `tests/*.test.ts`.
2. Keep new model fields optional and validate them on read
   (`tests/project-validation.test.ts`).
3. **Verify:** unit tests for the geometry; a round-trip test for any persisted
   field; a browser test if it is visible.
4. **Record:** state conventions and known limits in a validation record.

## 4. Change an import/export format

**When:** JSON, project package, DXF/SVG/PDF/PNG, RoomPlan, or GLB.

1. Read the contract first: [project package v1](docs/project-package-v1.md) or
   [local custom models](docs/local-custom-models.md).
2. Preserve unsupported fields and attachments across round trips unless the
   contract says otherwise.
3. **Verify:** round-trip and preservation tests; a browser export/import spec.
4. **Record:** update the contract doc and a validation record when behavior
   changes.

## 5. Custom model (GLB) pipeline

**When:** local model import, textures, or geometry compression.

1. Extension/texture policy lives in `src/lib/utils/localGLB*.ts`; loading in
   `src/lib/services/customModelLoader.ts`. Draco decoder is vendored under
   `static/draco/` with its `NOTICE`.
2. **Verify:** the `tests/local-glb-*.test.ts` suite plus
   `tests/browser/custom-model-*.spec.ts`; `tooling/check-local-glb-*.mjs` for
   fixtures.
3. **Record:** update [local custom models](docs/local-custom-models.md).

## 6. i18n / localization

**When:** adding any user-facing text.

1. Add the key to **both** `src/lib/i18n/locales/en.ts` and `pt.ts`; the parity
   test fails if they diverge.
2. Never translate stored names, catalog IDs or provider values.
3. **Verify:** `npm test` (parity) and a localized browser spec where relevant.

## 7. Author a browser regression

**When:** any user-visible behavior change.

1. Add a small **synthetic** fixture under `tests/fixtures/` and import it in the
   spec.
2. `npm run build` first; the suite serves `build/` on port 4188.
3. Run one engine: `npm run test:browser -- tests/browser/<spec>.spec.ts
   --project=chromium`.
4. Assert the intended behavior, not the implementation; cover save/reload,
   Undo/Redo or exported values when the bug involves them.

## 8. Write a validation record

**When:** finishing a non-trivial change.

Create `docs/<feature>-validation.md` with: scope and what changed, exact
verification (commands, test counts, browsers/engines), any hashes/metrics, and
open items. Keep [FEATURES.md](FEATURES.md)/[NEXT.md](NEXT.md) honest — a local
test pass does not mean "shipped".

## 9. Release / operations

**When:** cutting a release or touching hosting/costs.

Use [docs/release-checklist.md](docs/release-checklist.md) and the existing cost
gates; deployment and quota changes live under `ops/` and are documented in
`docs/reviews/`. Use the `ops:` commit prefix for these.
