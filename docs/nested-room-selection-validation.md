# Nested room selection

Room hit testing now chooses the smallest enclosing polygon, independent of room
array order. It uses the gross footprint rather than the reported net floor area:
an enclosing ring may have less usable area than its contained room. Furniture
room-distance guides use the same resolver instead of the first enclosing room.

Room label hit testing prefers the closest label anchor and breaks coincident
anchor ties using the smallest footprint. Explicit label offsets remain honored.
This makes the innermost room accessible when default labels share a centroid;
it does not yet reposition those overlapping labels visually.

Unit coverage exercises three nested boundaries in both room orders, cached and
uncached polygon paths, outside clicks, coincident anchors, and a moved parent
label. The browser workflow double-clicks the rendered nested label anchor and
checks that the inner room name editor opens. Existing label offset/reset/drag/
undo checks remain part of validation.

All 922 unit tests, six Chromium/WebKit label/slab workflows, Svelte checks
(zero errors/warnings), and production build passed.

Automatic nested label placement, explicit courtyard/stair openings, native
nesting, and physical gesture qualification remain open.
