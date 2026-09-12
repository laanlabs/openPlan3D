# Floor-owned tracing image validation — September 12, 2026

Production source: web `7fd8570`, native `9d7a8ea`.

## Automated checks

- Web package tests: 28 passed; `/tmp/web-underlay-floor-unit-fixed.log`.
- Svelte check: zero errors and warnings; `/tmp/web-underlay-floor-check.log`.
- Production build: exit 0, session `92806`; `/tmp/web-underlay-floor-build.log`.
- Catalyst: 16 selected tests passed; `/tmp/native-underlay-floor-catalyst.log`.
- iPhone 17 Pro simulator: 16 selected tests passed, zero failures, 1.345 seconds;
  session `48699`, exit 0; `/tmp/native-underlay-floor-ios.log`.

Native selection covers UnderlayFloorTests, UnderlayFitTests and
ProjectPackageTests. These are focused checks, not a new full-suite qualification.

## Live Catalyst check

Created `/tmp/OpenPlan3D-Underlay-Floor-QA.app` from the tested Catalyst build,
with isolated bundle `com.laan.labs.floorplan.underlayfloorqa`. The installed
Development app was not used. Imported the stored ZIP fixture
`tests/fixtures/native-floor-owned-underlay.zip` from the web repository through
Choose Project Package and Import as Copy. The initial hand-built fixture used
compressed ZIP entries and was rejected by the existing stored-only contract;
regenerating the same contents as stored entries allowed preview/import.

The sample contains four ground-floor walls and a 90-degree rotated image on
level 3, named Trace Floor. Visual and accessibility inspection confirmed:

1. Ground Floor opens with walls and no tracing image.
2. Add names Trace Floor as the image owner and does not offer removal there.
3. Selecting Trace Floor displays the whole image above the bottom toolbar,
   red above blue, green on the right, yellow on the left. Ground-floor walls
   remain faint context geometry; they are not active-floor walls.
4. Add offers Remove Trace Image on Trace Floor.
5. Switching back restores ground-floor framing and hides the image again.

Imported session `CBED6B12-F123-4944-AF81-B76ADF7976EA` retained level 3,
angle pi/2, center (3,2) and width 4 metres. Its PNG SHA-256 is
`fae9c957805920000a8363cbb84d6bb929de39964a603503ff691d251b3ac80a`,
matching the source image. The QA app was quit after inspection.

Actual native re-export/browser UI qualification for this new floor-owned
fixture remains to be done. Earlier legacy rotated-image return coverage remains
historical evidence; physical-device and broader NEXT requirements stay open.
