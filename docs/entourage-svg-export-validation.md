# Entourage symbols in SVG exports — 2026-09-10

SVG exports now include built-in entourage as editable catalog paths and custom
entourage as embedded images. Placement, rotation, opacity, width and definition
aspect ratio are preserved. The custom image is embedded directly from saved
project data, without depending on the editor's image cache. Images stretch to the
saved aspect ratio, matching canvas behavior. Built-in symbols preserve their
stroke scale, rounded joins/caps and drawing order beneath openings/furniture.

Entourage-only SVG exports are accepted when a built-in or custom definition can
be resolved. Unknown definitions remain omitted, matching the editor. Rotated
bounds include the definition aspect ratio and stroke margin. The source project
is unchanged. PNG/PDF entourage framing and custom image readiness, and DXF
entourage support, remain separate outstanding work.

Unit coverage verifies an entourage-only plan with rotated built-in/custom
symbols, opacity, embedded data, unknown-definition handling and unchanged source.
Browser coverage imports a plan with sedan/tree paths and a custom two-color PNG,
downloads SVG, checks all rotated symbol bounds against its viewBox, decodes the
SVG and checks half-opacity custom-image pixels. The preview is attached for
visual inspection. Existing stair and furniture export workflows are regressions.

## Results

All 890 unit tests and six Chromium/WebKit workflows passed. Production Svelte
checks reported zero errors and warnings; the production build passed. Visual
review of the browser-decoded SVG passed for built-in linework, embedded custom
image, rotation, opacity and framing. Stair/furniture regressions passed.

PNG/PDF entourage framing/readiness, DXF entourage, physical qualification and
broader native parity remain open.
