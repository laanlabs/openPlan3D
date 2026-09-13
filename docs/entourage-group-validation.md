# Entourage group selection and movement

September 10, 2026.

Select All already included entourage, but group bounds and drag positions omitted
it, and marquee selection did not include it. Group selection now encloses rotated
built-in and custom entourage rectangles using the same geometry as Fit. Marquee
selection includes entourage centers, matching the existing furniture behavior.
Unlocked entourage moves by the group's shared snapped delta. Locked furniture
and entourage stay stationary; a selection containing only locked movable items
does not start a group drag. Existing gesture history supplies one Undo.

Validation: all 783 unit tests passed, including a rotated custom symbol with a
4:1 aspect ratio, locked symbol bounds, and exclusion of unselected objects.
Svelte checks reported zero errors/warnings and the production build passed.
Chromium and WebKit passed the final four desktop/phone-width cases: marquee
selection finds five objects, group movement applies equal deltas to a stair,
column and rotated entourage, locked furniture and entourage retain their
positions, and one Undo restores moved data. An earlier four-case run also
passed before the direct marquee assertion was added. Phone screenshot review
confirmed the expanded selection frame fits above the properties panel.

This does not complete all group operations. Entourage alignment, distribution,
rotation, duplication and deletion need further auditing, along with annotation
selection, opening symbol bounds, physical gestures and export/native parity.
Native application code is unchanged.
