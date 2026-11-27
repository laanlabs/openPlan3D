# Contributing

Start with the [capability reference](FEATURES.md) and [current backlog](NEXT.md).
This repository contains the web editor; native companion development and release
requirements are tracked separately in NEXT.

## Local setup

Use Node.js 24, as specified in [.nvmrc](.nvmrc), and npm:

```sh
npm ci
npm run dev
```

The local editor does not require Firebase credentials or an account. Keep secrets,
private scans and generated build/test artifacts out of commits. Prefer synthetic
plans and images when reporting or testing a problem; remove personal information
from screenshots and logs before sharing them.

## Reproduce and fix a problem

Describe the trigger, expected result and observed result. Include the commit or
release, browser/OS, viewport and input method when relevant. Reduce the problem
to a small importable JSON/package fixture or a short sequence from a new project.
The [bug template](.github/ISSUE_TEMPLATE/bug_report.md) provides this structure.

For geometry and data behavior, start with helpers such as
[roomProject](tests/fixtures/project.ts) and the existing tests in `tests/`.
For editor interactions, add a focused Playwright regression in `tests/browser/`
that imports the fixture and checks the user-visible result. Cover save/reload,
Undo/Redo or exported values when those are part of the reported failure. A test
should distinguish the intended behavior from the defect, not just repeat the
implementation. Include the fixture's origin and permission to redistribute it
when it is not synthetic.

For package changes, read the [v1 contract](docs/project-package-v1.md). Preserve
unsupported fields and attachments through round trips unless the format explicitly
requires otherwise. For performance changes, record the workload, hardware,
measurement method and before/after result; a phone viewport is not a physical
phone benchmark.

## Validation

Run focused tests while developing, for example:

```sh
npm test -- tests/rooms.test.ts
npm run check
npm run build
npx playwright install --with-deps chromium firefox webkit
npm run test:browser -- tests/browser/selection-clipboard.spec.ts --project=chromium
```

Playwright uses the production `build/` and starts two servers of its own. Every
spec uses the one on port 4188, with analytics and cloud uploads disabled. The one
on port 4189 has production's settings (sharing on, against a bucket that does not
exist; analytics not turned off) and is used only by
`tests/browser/server-environment.spec.ts`, which refuses requests to other hosts.
Rebuild after code changes before browser tests, and keep both ports free. Engine
names are `chromium`, `firefox` and `webkit`. See
[playwright.config.ts](playwright.config.ts) for current settings.

SvelteKit's generated types live in `node_modules/$app`. `npm install <package>`,
`npm uninstall` and `npm prune` delete that folder. `npm run check`, `npm test`,
`npm run dev` and `npm run build` recreate it; before anything else that reads
`tsconfig.json` (an editor, `npx vitest run <file>`), run `npx svelte-kit sync`.

Before review, report the checks appropriate to the change and any failures,
skips or untested environments. Documentation-only changes normally need link
and diff checks rather than a repeated application suite. CI runs the broader
unit/type/build, browser and benchmark checks in
[ci.yml](.github/workflows/ci.yml); do not treat a focused local pass as that full
result. Linux WebKit coverage does not replace Safari or physical iPhone/iPad QA.

## Pull requests

Explain the concrete problem and resulting behavior. Include a small before/after
example or fixture, the validation results, and any compatibility or data
preservation implications. Use the [PR template](.github/pull_request_template.md).
Keep unrelated refactors out of the change. Update the capability reference or
backlog when behavior or remaining work changes; do not label a feature shipped
solely because a local test passed.

Maintainers should use the [release checklist](docs/release-checklist.md) for
release evidence and the existing deployment/cost gates.
