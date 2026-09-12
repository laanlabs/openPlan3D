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

The native re-export/browser UI check is completed below. Physical-device and
broader NEXT requirements stay open.

## Native return fixture and browser coverage

The same isolated Catalyst app exported the imported plan through Export →
Export Options → Export Project Package (ZIP). The options sheet needed Escape
to reveal the queued save panel; this does not resolve the existing dismissal
issue. The resulting `tests/fixtures/native-return-floor-owned-underlay.zip` in
the web repository is the unmodified native output: 2,030 bytes, SHA-256
`f793d5b81ce6afa2991295855dabefabeba0186a189844b4cd913a82ddf9fbdf`.
It retains level 3, angle pi/2, center (3,2), width 4 metres and the source PNG
bytes. The QA app was quit after export.

Browser cases import that actual native package, verify absence on Ground Floor,
switch to Trace Floor, inspect the canvas transform and red-above/blue-below
pixels, switch back and forth, then re-export and assert exact floor ownership,
placement, angle and original PNG bytes. The legacy unowned fixture runs beside
it to verify continued omission of ownership.

The first six-case run passed all three owned-floor cases and two legacy cases.
Chromium's legacy case sampled a zero color difference despite a correct later
screenshot. Sampling now polls the current frame for the expected orientation
and colors, accommodating image loading/initial framing without dropping the
visual assertions. The first run is recorded in
`/tmp/web-native-floor-underlay-browser.log` (session `75288`, exit 1).

The corrected run passed all six cases in 1.8 minutes, two each on Chromium,
Firefox and WebKit. Session `11838` terminated with exit 0; log:
`/tmp/web-native-floor-underlay-browser-fixed.log`. Runtime source remains web
`7fd8570` and native `9d7a8ea`; this follow-up adds fixtures, tests and records.

Reproduce with:

```sh
npx playwright test tests/browser/project-package.spec.ts --grep 'actual native .* underlay return'
```
