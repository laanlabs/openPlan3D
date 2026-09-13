# 2D PNG export source and feedback

Project PNG export now renders the full active floor without depending on an
on-screen canvas. Empty project floors return an explicit no-export result;
they never fall back to a 3D or unrelated viewport. Explicit viewport-only callers
without a project retain their existing capture option.

PNG encoding now returns a promise, rejects null blobs and thrown errors, and has
a thirty-second callback deadline. Toolbar and command-palette exports both catch
failures and show a dismissible export notice. Empty floors explain that walls
are needed. Complete exports clear prior notices.

Unit coverage includes blob/null/throw/timeout paths, empty project floors, shared
feedback, and existing plan geometry exports. Browser coverage exports the full
2D plan while 3D is open, then forces null blobs through both entry points and
verifies notices with no failed-attempt downloads. Curved wall/opening export
regressions are included in the browser run.

Remaining: asynchronous asset readiness, typography/bounds for all plan objects,
physical-device downloads, native parity and other export-format error handling.

Validation on 2026-09-09: all 21 targeted PNG/feedback/export/real-jsPDF tests
passed. Svelte checks reported zero errors/warnings and production build passed.
All six Chromium/WebKit production-download checks passed. This change does not
alter the plan's drawing/layout rules.
