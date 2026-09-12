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

Do not change native source or rebuild until the active full-scan simulator
session `50299` terminates. Log: `/tmp/native-scan-local-dismiss-ios.log`.
