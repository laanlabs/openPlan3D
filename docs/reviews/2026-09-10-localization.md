# English/Portuguese localization

The current Settings shell now uses a typed English/Portuguese string store and
an Appearance language selector. Translations are adapted from community
[PR #15](https://github.com/laanlabs/openPlan3D/pull/15), head
`10de0f64b3a1274e989bbc145f89a96e8257b2a9`. Only the relevant Settings dictionary
was brought forward. The old release, dependency and interaction changes were
not reapplied.

A derived Svelte store updates rendered strings without a keyed remount. The
existing native dialog, focus and active tab survive a language change. Locale
initialization runs after hydration, so SSR and the initial client render agree.
The preference is local to the browser, independent of project content and
measurement units; denied or full storage still permits in-memory changes.
Document language follows the selection. Unknown stored values fall back to
English. English remains the default while migration is incomplete.

This is the first migration batch, not full application localization. Main
navigation, welcome/library flows, editor tools, properties, canvas text, 3D,
export/print, error messages, and nested floor-elevation/OpenAI settings still
need migration. Keep project IDs, user content, serialized enum values, numeric
measurement parsing and package data independent of UI language. Portuguese
copy needs fluent-speaker review and narrow-screen qualification as coverage
expands.

Four unit tests cover dictionary key/token parity, reactive updates, persistence,
invalid preferences and unavailable storage. Svelte check reports zero errors
and warnings; production build succeeds. Logs: `/tmp/web-localization-unit.log`,
`/tmp/web-localization-check-final.log`, `/tmp/web-localization-build.log`.

The production-browser regression passed in Chromium, Firefox and WebKit (three
cases, 30.4 seconds, exit 0). It verifies the same dialog DOM node survives,
language-selector focus remains, translated labels appear, Escape closes the
modal, and reload restores Portuguese before switching back to English. Log:
`/tmp/web-localization-browser.log`. This does not establish complete translated
UI coverage or real-device accessibility.
