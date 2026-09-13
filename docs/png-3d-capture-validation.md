# Main-view 3D PNG capture

Toolbar 3D PNG export previously waited 500 milliseconds, then used a broad CSS
canvas selector. That could capture the wrong canvas or run before the main
viewer had rendered, and null/failed encodings were silent.

The main viewer now marks completed renders. The toolbar waits for that marked
canvas, checks its WebGL context and encodes a PNG. Capture has a ten-second
readiness deadline followed by a separate thirty-second encoding deadline and is cancelled when the toolbar is destroyed.
Duplicate requests are disabled while capture is pending. A failed capture shows
a dismissible export notice. Automatic switches from 2D return to 2D after either
success or failure. A project/floor switch prevents a stale named download.

Unit coverage includes delayed readiness beyond the former 500 ms delay, lost
contexts, null blobs, thrown errors, timeout and cancellation, with timer cleanup.
Browser coverage inserts a decoy canvas, verifies the main rendered canvas is
captured, checks PNG dimensions, and exercises null-blob failure with view
restoration and no download.

Scope limits: first rendered frame does not mean all asynchronous furniture or
photo textures have loaded. Blank-frame checks, camera-quality qualification and
all-device/browser coverage remain open.

Validation on 2026-09-09: all eight capture tests passed; Svelte checks reported
zero errors/warnings and production build passed. Final Chromium/WebKit browser
checks passed for successful capture and failed encoding with view restoration.
The actual exported PNG was visually inspected. An initial shared ten-second
wait rejected a valid slow Chromium encoding; readiness and encoding now have
separate deadlines, with explicit regression coverage for that case.
