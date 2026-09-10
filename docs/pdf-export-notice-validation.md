# PDF export feedback

PDF export now reports its outcome through a shared notice used by the toolbar
and command palette. Required preparation failures are caught at these entry
points and produce a dismissible message with retry/JSON-copy guidance. An
active floor without walls explains what is needed before export.

When the optional main 3D capture is omitted, the notice explains that the floor
plan was exported and suggests reopening 3D before retrying. Complete exports
clear any prior notice. Projects without an open 3D viewer do not get a warning.
Raw exception details are not shown to the user.

Coverage includes shared feedback state, required failures, empty floors and
clearing notices. The browser regression checks omitted-3D feedback and forces a
required plan-image failure through both toolbar and command palette, asserting
that neither failed attempt starts a download.

Remaining: blank-frame detection, further PDF typography/layout, native export
feedback and failures in non-PDF export formats.

Validation on 2026-09-09: all 15 targeted feedback/export/real-jsPDF tests passed.
Svelte checks reported zero errors/warnings and production build passed. Chromium
and WebKit production checks passed for dismissing the omitted-3D notice and
reporting required export failures through both entry points without downloads.
