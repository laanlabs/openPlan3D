# AGENTS.md

Guidance for AI agents working in this repository. Keep it concise; link to the
existing docs instead of duplicating them.

## Project

openPlan3D — a free, browser-based 2D/3D floor plan editor. No account or server
dependency; projects stay on the device. The hosted app is at
[app.openplan3d.com](https://app.openplan3d.com/).

Stack: SvelteKit 2, Svelte 5 (runes), Three.js, Tailwind CSS 4, TypeScript
(strict), Vite 7. Node 24 per [.nvmrc](.nvmrc) (`engine-strict` is on).

## Setup

```sh
npm ci
npm run dev
```

The local editor needs no Firebase credentials or account.

## Commands

| Command | Purpose |
| --- | --- |
| `npm run check` | Svelte/TypeScript diagnostics |
| `npm test` | Vitest unit suite (`tests/**/*.test.ts`) |
| `npm run build` | Production build (required by browser tests) |
| `npm run test:browser -- <spec> --project=chromium\|firefox\|webkit` | Playwright regressions |
| `npm run catalog:check` | Furniture catalog manifest check |
| `npm run benchmark:viewer` / `benchmark:fixtures` | Rendering benchmarks |

## Workflow rules

- Browser tests run against the production `build/` — **rebuild after code
  changes** before running them. Playwright starts its own server on **port
  4188**; never start a second server on it.
- If WebKit fails to launch locally, run `chromium`/`firefox`; WebKit CI coverage
  does not replace Safari or physical iPhone/iPad checks.
- Use synthetic plans, images and fixtures. Never commit secrets, private scans,
  or generated build/test artifacts.
- Keep changes focused; unrelated refactors do not belong in the same change.

## Architecture map

- `src/lib/stores/project.ts` — central project state, selection, undo/redo.
- `src/lib/models/types.ts` — the data model (`Floor`, `Wall`, `Room`, …).
- `src/lib/utils/` — geometry, detection, rendering and export helpers.
- `src/lib/components/editor/` — 2D canvas and interaction.
- `src/lib/components/viewer3d/` — Three.js viewer (`ThreeViewer.svelte`).
- `src/lib/components/sidebar/` — shared Properties panel.
- `src/lib/services/` — persistence, packages, custom models.
- `src/lib/i18n/` — typed translation dictionaries.
- `src/lib/server/` and `src/lib/skills/` — handoff/MCP server code and the
  assistant skill ports (unrelated to this file).
- `src/routes/` — SvelteKit pages and API endpoints.

## Conventions

- Svelte 5 runes (`$state`, `$derived`, `$props`); wrap store subscriptions in
  `onDestroy(store.subscribe(...))`.
- i18n: add keys to `src/lib/i18n/locales/en.ts` **and** `pt.ts`; a parity test
  enforces matching keys. Never translate stored names, catalog IDs or provider
  values.
- Undo/redo: group related edits with `beginUndoGroup`/`endUndoGroup`; live
  drags use the existing `*DuringDrag` helpers.
- Read the relevant contract before touching a format: e.g.
  [project package v1](docs/project-package-v1.md),
  [local custom models](docs/local-custom-models.md).

## Validation and docs

- Run the checks appropriate to the change and report skips/failures. A focused
  local pass is not full CI.
- Add a unit test for logic and a focused Playwright regression in
  `tests/browser/` for user-visible behavior.
- Update [FEATURES.md](FEATURES.md) when capability scope changes and
  [NEXT.md](NEXT.md) when remaining work changes. Do not mark a feature shipped
  just because a local test passed.
- Record detailed evidence in `docs/<feature>-validation.md`.
- Commit messages use `feat:`, `fix:`, `docs:`, `chore:`, or `ops:` prefixes.

## Definition of done

- [ ] Behavior matches the stated problem and expected result.
- [ ] Unit test added/updated for the logic; browser regression for the interaction.
- [ ] `npm test`, `npm run check`, `npm run build` pass (rebuild before browser tests).
- [ ] Relevant browser spec passes on the affected engines.
- [ ] `FEATURES.md`/`NEXT.md` and a validation record updated when scope or remaining work changed.
- [ ] No secrets, private data, or generated artifacts committed.

See [CONTRIBUTING.md](CONTRIBUTING.md) for the full contribution process.
