# Fractional window clearance in elevation

Reproduced a window extending above a fractional wall top after an elevation
drag: a 250.25 cm wall exported a 250.5 cm window top (Chromium session `50371`,
exit 1, 5.8 seconds; `/tmp/web-elevation-clearance-before.log`). Rounding the
already-clamped sill height caused the 0.25 cm overrun. Elevation dragging now
rounds the requested sill first, then clamps it to the exact lower wall height
across the opening, retaining fractional limits on flat and sloped walls.

All 15 focused browser cases passed in two minutes (session `92103`, terminal
exit 0; `/tmp/web-elevation-clearance-browser.log`): flat, rising and falling
wall limits plus Escape/Undo drag workflows in Chromium, Firefox and WebKit.
Exports verify the opening reaches but does not cross the wall top, other fields
remain exact, and Undo/Redo restores the full original/moved floor. Type checking
reports zero errors and warnings; the production build passed (session `28955`,
exit 0; `/tmp/web-elevation-clearance-{check,build}.log`). No browser process is
active. Earlier full-suite qualifications remain historical; broader NEXT
requirements and the intermittent nested-room Undo investigation remain open.
