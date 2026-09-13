# Automatic dimension fit bounds

September 9, 2026.

Fit now includes automatic wall dimension text and the internal room width/depth
caption at its actual screen font size. Straight wall dimensions include their
clear-span insets, fixed screen offset, ticks, extension reach and text-gap line
ends. Because the renderer can flip the display side near a viewport edge, bounds
conservatively include both sides. Curved walls use the same midpoint, tangent,
length and screen offset as the renderer.

Internal room dimension bounds are independent of room-name label visibility.
Their renderer now sets center alignment and middle baseline explicitly, including
when room-name labels are hidden. The Dimensions toggle and external/internal
settings control the added bounds. Saved wall geometry is unchanged.

The browser regression checks painted dimension ink on a curved wall and a distant
room at desktop and phone sizes, changes Fit through the Dimensions toggle, and
verifies exported JSON wall preservation. Unit tests cover both possible wall
label sides and internal room labels without room-name bounds.

Overwide single-line text, selection framing and selected-opening distance
annotations remain follow-up work. Physical device qualification and the broader
native, geometry and release backlog remain open.

Validation: the 767-test suite and all 11 final bounds tests passed. Eight
Chromium/WebKit framing checks passed, plus all four final wall-editing checks.
The initial Chromium wall checks timed out at the final lazy 3D viewer assertion;
traces showed WebGL initialization afterward. That assertion now allows 30 seconds
instead of the default 10; the focused rerun passed in both engines. Svelte checks
reported zero errors/warnings, the production build passed, and the phone
screenshot was visually reviewed.
