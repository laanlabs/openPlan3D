# Editor dismissal after a menu edit — September 12, 2026

Source baseline `aaafdbe`, app `/tmp/OpenPlan3D-Scan-Local-Dismiss-QA.app`, isolated
bundle `com.laan.labs.floorplan.underlayfloorqa`. This is a fresh reproduction,
not a claim that the separate editor dismissal issue is fixed.

Opened synthetic session `CBED6B12-F123-4944-AF81-B76ADF7976EA` through review →
Plan → Edit Plan. Done without edits returned to review at the next AX check.
Reopened the editor, chose Add → Living → Chair, clicked Rotate Right, then Done.
The editor remained visible at both subsequent AX and screenshot checks. No
canvas drag was used in this reproduction.

The saved plan file already contained four walls and one chair, ID
`B5599360-54BF-4668-9F56-CC68C3F842B3`, center (2,1.5), width/depth 0.5 metres,
angle 0.2617993877991494 radians. This separates successful persistence from the
pending dismissal. File modification epoch: 1789231607.4898024. Escape was used
to leave the editor, and the isolated QA app was quit. No installed Development
app was used and no production source changed during the running simulator test.

## Next experiment

Test dismissal resolved inside the editor button, as verified for the separate
import/export sheets. Preserve the existing close callback and dismiss only if
save succeeds: an unconditional dismiss after save would lose the editor on a
write failure. Verify no-edit Done, edited Done, Close, and a safely induced save
failure in an isolated disposable session. Retain the change only with evidence.

The input/framework cause remains unseparated; one successful no-edit close does
not overturn earlier intermittent failures. Prior gesture-reset and timed/async
close experiments in `docs/native-editor-dismissal.md` did not establish a fix.

The full-scan simulator session `50299` subsequently terminated successfully.
Log: `/tmp/native-scan-local-dismiss-ios.log`.

## Save failure and recovery baseline

Using the same isolated session, added a table in memory, recorded the existing
plan SHA-256, and temporarily removed directory write permissions (0755 → 0555).
Done showed Couldn't Save with a permission error. Restored 0755 immediately and
verified the original plan bytes were unchanged. After acknowledging the alert,
the selected table and Undo remained in the editor. Retrying Done saved both
chair and table and returned to review. The QA app was quit; directory mode 0755
and both saved categories were verified. Restoration metadata is in
`/tmp/openplan-editor-save-failure-state.json`.

The next experiment uses a button-local dismiss environment gated by a Bool
save result. It retains existing callbacks and returns false on unloaded/error
paths. Catalyst build session `95232` finished with exit 0 (`BUILD SUCCEEDED`)
in `/tmp/native-editor-local-dismiss-build.log`.

## Button-local candidate validation

Runtime `8ed0b20`, isolated app
`/tmp/OpenPlan3D-Editor-Local-Dismiss-Sept12-QA.app`, same synthetic session.
The installed Development app was not used.

- Added a sofa through the menu, rotated right, and pressed Done. Review appeared
  at the next AX check; the file contained the sofa at angle 0.2617993877991494.
- Added a television, recorded the saved hash, and temporarily changed only the
  synthetic session directory from 0755 to 0555. Done showed Couldn't Save.
  Restored 0755 immediately; the saved hash was unchanged. Acknowledging the
  alert retained the selected television and Undo. Retrying Done saved it and
  returned to review, with four objects (chair, table, sofa, television).
- Added an unsaved fireplace and clicked Close. Review appeared with four objects.
  The saved file SHA-256 stayed
  `c630a18efaf494c7ea6560119ed8a531adb5de22627d11fa332e7161ca507366`,
  matching `/tmp/openplan-editor-before-discard.sha256`. Directory mode was 0755.
- Reopened with no edits and clicked Done. Review appeared at the next AX check.
  The QA app was quit. No Escape or debugger assisted these candidate checks.

These checks qualify the review-to-editor menu-edit, discard, no-edit, and
save-failure/retry paths on Catalyst. They do not establish physical-device,
Home-to-editor, load-error, canvas-gesture, or long-run intermittent behavior.
Simulator `PlanRecoveryTests` session `37936` remains live at this checkpoint,
log `/tmp/native-editor-local-dismiss-ios.log`; no test result is claimed yet.
