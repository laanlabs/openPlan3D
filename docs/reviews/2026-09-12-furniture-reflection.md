# Furniture reflection — September 12, 2026

The native Mirror action previously negated rotation. Native `450b913` uses
optional local-axis reflection fields, preserves rotation and duplication state,
and applies reflection to plan glyphs, SceneKit geometry, neutral mesh exports
and RoomPlan transforms. Web package edits retain scale magnitudes and independent
reflection signs; older native omissions fall back to the package baseline.
RoomPlan import preserves equivalent orientation through matrix decomposition.
See [the package contract](../project-package-v1.md#furniture-reflection).

Verified native evidence:

- Combined run `85762` passed all three coding/transform, RoomPlan round-trip and
  outward-face tests; xcresult summary confirms zero failures or skips.
- Pixel run `12787` passed `testRefrigeratorHandleReflectsAcrossLocalX`, using the
  actual `PlanRenderer` and an off-centre refrigerator handle. The check requires
  visible pixel changes and horizontal reflection equality. Its two retained
  images were exported and visually inspected: the handle moves from right to
  left, with the body unchanged. This qualifies the renderer, not the live button.

Original:

![Original refrigerator](assets/native-reflection-original.png)

Reflected:

![Reflected refrigerator](assets/native-reflection-mirrored.png)

All 31 package and 28 web RoomPlan tests passed. Both type checks passed without
diagnostics. Current full unit run `32001` passed 1,135/1,136: its sole failure
was an exact old-fixture expectation omitting the newly exported `mirrorX: true`.
The expectation now explicitly includes that field for every mirrored fixture
item while retaining exact comparisons of all other fields. All 55 category
cases passed in `58515`. Current production build `69534` passed.

Five previously timed-out browser workflows passed on the earlier package-only
reflection build (`67115`); their assertions were retained and whole-workflow
budgets increased using traced action durations. They do not qualify the newer
RoomPlan build. Full browser run `96834` and fresh Catalyst build `11694` are active
at this checkpoint. Live Mirror/Undo/Redo, an actual reflected package return and
physical-device checks remain open. No release or full-browser pass is claimed.
