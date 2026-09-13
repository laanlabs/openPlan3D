# Consistent 2D room label placement — 2026-09-09

The 2D room renderer now applies the saved label offset, using the same anchor as
label hit testing and inline rename placement. Room geometry and dimension
annotations remain at their geometric positions. Previously hit testing used the
offset but rendering did not, so dragging a label moved its hit target while the
text stayed at the room centre.

An explicit **Reset Label Position** room context-menu command replaces an
invisible reset hit region in the label. Room rename and context-menu detection
also recognize an offset label outside its original room polygon.

Browser testing exposed a related drag defect: mouse-up always committed a label
offset using the last world pointer position, even when no drag occurred. This
could move a label during a click and add unwanted history entries. Label dragging
now starts after three pixels of actual movement, uses screen deltas and the zoom
at press time, and commits only an actual drag. Each drag has its own undo group,
so a rapid reset followed by a drag remains two independently undoable actions. Sidebar layout changes cannot
create world-space displacement on their own.

## Verification

The new browser regression imports a known 100×50 cm saved offset and checks the
rendered text coordinates against other room labels. It invokes the reset menu,
drags the label 60×40 screen pixels, checks the updated drawing, opens rename at
the moved anchor, cancels, and undoes the drag back to the centre. The existing
direct-double-click rename test checks independent names across floor switches.

Physical-device touch/long-press qualification, other export/viewer label
conventions and active-editing performance targets remain separate work.

The browser tests explicitly fit the imported plan and wait for redraw before
sampling label coordinates. Initial attempts could otherwise sample positions
before the import's first fit completed. Direct double-click testing retains its
single gesture and does not preselect the room.

Validation passed **680 unit tests**, Svelte checks with zero errors and warnings,
and the production build. All **ten Chromium/WebKit browser checks** passed:
four label-placement/direct-rename checks and six existing canvas idle/wakeup,
tracing-image and simulated touch tests. The rapid-reset/drag regression initially
caught undo coalescing in WebKit; explicit drag grouping resolves it without
adding artificial test delays.
