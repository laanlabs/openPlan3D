# Ctrl/Cmd-click group isolation — 2026-09-10

Ctrl/Cmd-click now isolates furniture, columns, stairs, entourage, doors, windows
and walls from saved groups consistently. The group bounding-box drag path no
longer consumes that modifier, and every object selection path receives it.
Wall endpoint/midpoint, furniture transform, and entourage resize handles also
yield to this explicit selection action.

Selecting one member does not dissolve or modify the saved group. Normal object
selection and movement continue through their existing paths. Annotation
Ctrl/Cmd-click keeps its existing behavior.

## Coverage

`tests/browser/object-group-isolation.spec.ts` creates a two-object saved group
for each of the seven object kinds. It Ctrl/Cmd-clicks a member while the group
is selected, then repeats after deselection. Each case verifies that selection
leaves the complete exported floor unchanged, Delete removes only that member,
and Undo restores the complete floor and saved group. Door/window fixtures also
verify that their host walls remain unchanged. The wall case hits its midpoint,
where an existing selection handle previously intercepted the click.

Saved annotation group and modifier-selection browser regressions run alongside
the new cases.

## Results

All 18 Chromium/WebKit workflows passed. Svelte checks reported zero errors and
warnings, and the production build passed.

## Remaining work

Saved-object group drag initiation, unknown-catalog rendering/hit-testing,
annotation alignment and visibility, physical touch qualification, and
export/native parity remain open. Native app code is unchanged.
