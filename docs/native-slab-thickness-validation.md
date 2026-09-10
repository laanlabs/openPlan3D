# Slab thickness across project packages and native renders

The web package bridge converts each floor's slab thickness from centimetres to
metres on its native level. Native-to-web conversion and the native-edit merge
carry subsequent thickness changes back to the correct floor. Native plans with
no override retain their historical 10 cm depth; web plans with no override send
an explicit 5 cm depth. Unchanged legacy native defaults remain omitted on export.

The native Level model now retains and validates the optional metre value. Native
package merging recognizes the field, including removal of an override. Extracting
a floor preserves its level metadata, so the edited-floor render scene uses its
saved slab depth. The slab top remains at zero and its bottom is at minus the depth.
The same SceneKit builder applies the override for a single-storey preview.

Validation includes a web/native/edit/web conversion test, invalid package values,
legacy defaults, a browser import/settings/package-download workflow, native
Codable validation and actual native portable mesh coordinates.

Remaining work: native thickness editing controls, room-shaped native slabs,
stair/courtyard openings, stacked native preview/elevation support and physical
qualification. The full native preview still overlays multiple storeys and uses
its legacy depth when more than one level is present; the floor-specific render
export uses the selected level's saved depth.

## Results

- Native Catalyst build and 16 selected tests passed (edited scene and package suites).
- The 915-test web run passed 914 tests; one existing geometry stress test exceeded
  its five-second timeout during concurrent native compilation. All six tests in
  that file passed on an isolated rerun, with no timeout or production-code change.
- Svelte check passed with zero errors/warnings; production build passed.
- Chromium and WebKit passed the settings-to-native-package workflow.

Native test result: `/tmp/openplan3d-build/Logs/Test/Test-FloorPlan-2026.09.10_06-41-52--0400.xcresult`.
