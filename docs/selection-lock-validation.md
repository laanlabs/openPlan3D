# Atomic selection locking

September 10, 2026.

Ctrl/Cmd+L previously toggled furniture one item at a time, ignored entourage and
created multiple Undo entries for a selection. It now locks selected furniture
and entourage together if any supported item is unlocked; when all are locked,
it unlocks them together. Unselected objects and unsupported element types are
unchanged. The operation owns one history snapshot, and unsupported selections
create none. The R shortcut no longer rotates locked furniture or adds a rotation
history entry for it.

Unit coverage checks mixed initial lock states, entourage participation, unchanged
unselected objects, ignored IDs and Undo/Redo. Browser coverage at desktop and
phone widths checks lock-all, blocked R rotation, one-step Undo, Redo, unlock-all
and undoing unlock using exported furniture/entourage data.
Validation: all 799 unit tests passed, and the focused case passed again after
adding the required scale field to its fixture. Final Svelte checks reported zero
errors/warnings, the production build passed, and all four desktop/phone-width
Chromium/WebKit shortcut workflows passed.

This does not change explicit property editing or add a lock property to walls,
stairs, columns or annotations. Broader rotation/group transforms, annotation
selection, opening bounds, physical gestures and export/native parity remain open.
