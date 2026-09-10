# Multiline note properties — 2026-09-10

The text-annotation property field is now a three-row, vertically resizable
textarea. Imported line breaks and blank lines are shown faithfully, Enter adds a
line, and longer notes scroll within the field. The existing input handler and
history coalescing remain in use. Note position, rotation, font and color are
unchanged by text edits; native field shortcuts remain isolated from plan actions.

Four desktop/phone Chromium/WebKit workflows import multiline text, replace it
with blank lines intact, compare exact exported floors, verify Undo/Redo, then
exercise Enter, typing the plan rotation shortcut character, and Backspace inside
the field. Two existing browser export workflows verify rotated multiline notes
remain visible and framed. All six passed, along with 15 shortcut/layout unit
tests, Svelte checks (zero errors/warnings), and the production build. Phone visual
review confirms multiline text in the field and canvas.

Annotation visibility, walls/openings alignment, opening-only group movement,
detailed exports, physical qualification and native parity remain open.
