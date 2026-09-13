# Native editor action labels — September 12, 2026

Native commit `43fd94f` adds explicit action names and desktop tooltips to the
editor's history and contextual icon buttons, and selected traits to tools.
Actions, dimensions and layout are unchanged. Previously these controls relied
on system-symbol descriptions to communicate their purpose.

Catalyst build session `33064` exited 0 (`BUILD SUCCEEDED`), log
`/tmp/openplan3d-editor-action-labels-build.log`, using derived data
`/tmp/openplan3d-render-ui-build`. Its output was copied to
`/tmp/OpenPlan3D-Action-Labels-Sept12-QA.app`, assigned bundle identifier
`com.laan.labs.floorplan.actionlabelssept12qa`, ad-hoc signed with the existing
isolated sandbox entitlements and verified with deep/strict codesign validation.
The Development app was not used.

Live accessibility-tree checks in this fresh app verified:

- Undo/Redo have their explicit names and initially expose disabled state.
- Select initially exposes selected state; choosing Wall transfers that state.
- Adding a Chair selects it and exposes Edit selection properties, Rotate
  furniture left/right 15 degrees, Duplicate furniture, Mirror furniture and
  Delete selection as named buttons.
- Right rotation and properties activation work through those accessibility
  elements. Setting width to 24 inches changes the subtitle to 2′ 0″ × 1′ 8″.
- Undo, Redo and Done activate successfully. The saved chair has angle
  `0.2617993877991494` radians and width `0.6095996708161777` metres, confirming
  the 15-degree rotation and redone 24-inch edit.

Saved QA session: `F7BEF6F4-7595-4CB1-8F49-BAC07A1082FE`, under the isolated
app container's `Data/Documents/Sessions`. Duplicate, mirror and delete labels
were inspected, but those actions were not exercised in this pass. This is an
accessibility-tree and selected-action check, not a full VoiceOver or touch pass.
`xcrun devicectl list devices` exited 0 and reported no devices (log
`/tmp/openplan-connected-device-inventory.txt`). Physical-device work remains open.

The concurrent web full-browser run `5924` remains active. Its guide-drag case
exceeded the 90-second total budget despite completed, successful geometry Undo
and Redo assertions. Trace/error context are preserved in
`/tmp/openplan-full-browser-guide-timeout`. This does not establish a guide Undo
defect. Investigate other failures and adjust timing only after the active run.

## Follow-up action inspection

In a second fresh drawn plan, the labeled left rotation, duplicate, Mirror,
delete, Undo and Done actions were exercised. Saved isolated session
`E4039C6D-324F-4A00-BC2C-BCC2B85C2B51` contains two distinct chair IDs with the
expected duplicate offset of 0.3 metres on both axes. Deletion Undo retained
the second chair. Original and duplicate angles are -15 and +15 degrees.

The initial verification expected both angles to stay -15 degrees and failed.
Source inspection established that `mirrorSelectedFurniture()` only negates
the angle; `PlanDocument.Furniture` has no mirror state. Corrected checks confirm
the observed angle-negation behavior, duplication and retained deletion Undo.
This does **not** qualify true shape mirroring. That behavior and its renderer/
package propagation remain an open native fidelity issue.

The concurrent browser entourage-drag failure also exhausted its 90-second
budget. Every Undo equality assertion completed successfully, but the final
Redo JSON download did not complete. Preserved artifacts:
`/tmp/openplan-full-browser-entourage-timeout`. This does not establish incorrect
Undo geometry or a passing Redo round-trip. The full run `5924` remains active.
