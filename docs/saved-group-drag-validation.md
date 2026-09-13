# Saved-group drag initiation — 2026-09-10

The first press on a member of a deselected saved group now selects the group
and starts its shared drag gesture. Previously, object selection expanded the
group but then started a furniture/stair/column/entourage/opening drag for just
the clicked member; a wall press did not start a group drag at all.

The shared drag captures movable members, keeps locked furniture/entourage fixed,
and uses the existing movement threshold and one Undo group. Ctrl/Cmd-click
continues to isolate a member instead of starting the group gesture.

## Coverage

`tests/browser/saved-group-drag.spec.ts` begins with deselected saved groups and
drags from furniture, columns, stairs, entourage, doors, windows and straight
walls. Opening cases group the openings with their host walls. Every fixture
includes a grouped note, dimension and locked entourage member.

Exact exported-floor comparisons verify that movable positions/endpoints shift
by the same delta, the locked member and reference notes stay fixed, opening
positions on their moved walls remain unchanged, and metadata/group membership
is preserved. One Undo restores the entire floor; Redo restores the moved floor.
Furniture and wall Ctrl/Cmd-isolation regressions run alongside these cases.

## Results

All 18 Chromium/WebKit workflows passed. Svelte checks reported zero errors and
warnings, and the production build passed.

## Remaining work

Opening-only group movement without selected host walls, curved-wall group
translation, unknown-catalog rendering/hit-testing, annotation alignment and
visibility, physical touch qualification, and export/native parity remain open.
Native app code is unchanged.
