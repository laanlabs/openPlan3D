# Dependency and furniture interaction batch

Implemented September 5, 2026 on `codex/security-and-interactions`, based on the reliability batch in [PR #27](https://github.com/laanlabs/openPlan3D/pull/27). This is a review branch; the changes are not deployed.

## Changes

Integrated the original contributor commits from [#22](https://github.com/laanlabs/openPlan3D/pull/22), [#20](https://github.com/laanlabs/openPlan3D/pull/20), [#17](https://github.com/laanlabs/openPlan3D/pull/17), and [#26](https://github.com/laanlabs/openPlan3D/pull/26), retaining authorship and merge ancestry. These address lost mouse releases, foreground selection priority, per-item furniture dimensions, optional wall snapping, and anchored resize handles. The related issues are #21, #19, and #16; they remain open pending integration into `main`.

Review and regression testing identified additional corrections:

- Correct left-corner resize direction, preserve mirror signs, and clamp at 10 cm when crossing the opposite edge. Apply position and scale together so the store's older scale clamp cannot displace the anchored edge.
- Start a furniture undo group only after 3 pixels of movement; finish movement, rotation, or resize as one action. Handle release outside the canvas, window blur, Escape, tool changes, and returning with no mouse buttons pressed.
- Use the actual footprint for wall snapping and keep the distance to the wall exact after grid snapping. Skip curved walls and walls shorter than the furniture width.
- Synchronize the editor URL when an import replaces the active project. Previously importing through the toolbar left the old project ID in the URL, so reloading reopened the previous project. The editor subscription also covers replacement imports from the sidebar.

## Dependency remediation

A clean `npm ci` followed by `npm audit` reports **zero advisories**, down from 16 (including three critical) on the preceding branch. This is the audit database's result on September 5, not proof of absence of vulnerabilities.

Updated jsPDF to 4.2.1, SvelteKit to 2.70.3, the Node adapter to 5.5.7, Svelte to 5.57.0, Vite to 7.3.6, and Firebase to 12.18.0, plus affected transitive packages. These stay within the existing major versions. CI now fails on high/critical audit findings.

SvelteKit's `cookie` dependency still requests the vulnerable 0.6 line. A narrowly scoped override selects `cookie` 0.7.2. Compatibility tests cover valid parse/serialize behavior and rejection of injected name/path/domain fields. Remove the override when the framework's own dependency range includes a patched version. (Done in the SvelteKit 3 upgrade, November 2026: SvelteKit 3 depends on `cookie` 2, so the override and its test were removed.)

Relevant upstream advisories: [jsPDF](https://github.com/parallax/jsPDF/security/advisories/GHSA-7x6v-j9x4-qf24), [protobufjs](https://github.com/protobufjs/protobuf.js/security/advisories/GHSA-xq3m-2v4x-88gg), [websocket-driver](https://github.com/faye/websocket-driver-node/security/advisories/GHSA-mp7j-qc5w-4988), and [cookie](https://github.com/jshttp/cookie/security/advisories/GHSA-pxg6-pf52-xh8x). The app's PDF path uses drawing, text, and image embedding. The Firebase module imports app/analytics; this batch does not introduce database or Storage features.

## Verification

| Check | Result |
| --- | --- |
| Clean install and audit | Pass; zero advisories |
| Vitest | 82 tests in eight files pass |
| Svelte/type checks | Zero errors; 25 existing warnings |
| Production build | Pass; existing large-chunk warning remains |
| Existing Bun scripts | Furniture resize, RoomPlan furniture rotation, room polygons, and orthogonal import all pass |
| Real PDF encoder | Generates a two-page PDF containing an embedded PNG, title, and room schedule; only the file-download boundary is intercepted |
| Desktop in-app browser | JSON import, overlapping furniture selection, custom-size handles, top-left resize, undo/redo, off-canvas drag release, and 45-degree mirrored resize pass |
| Wall snapping in browser | Disabled setting permits near-wall placement; enabled setting makes the green sofa flush with the wall and rotates it to 180 degrees; grid snapping remains enabled |
| Persistence in browser | Imported project URL changes to its ID; reopening retains the plan, resized sofa, and snapped furniture; Save reports Saved |
| 3D | Synthetic plan renders in the in-app browser; top-down and transparency controls respond. Chrome renders the two-bedroom template. No console errors/warnings reported during these checks |
| Phone layout | At 390×844, Fit, tools drawer, selecting Measure and automatic drawer dismissal, and two-point measurement work with mouse-based browser automation |
| Browser exports | PDF invoked in both browsers and SVG in Chrome without reported console errors. Download events timed out, so completed file delivery was **not verified** |

The new furniture tests exercise all eight handles at five rotations, mirrored dimensions, minimum-size crossing, Shift aspect ratio, hit testing, handles, wall clearance on both sides and on a diagonal, short/curved walls, and multi-frame undo/redo. They are automated unit/integration tests, not an automated browser suite.

### Repeating the browser checks

1. Run `npm ci` and `npm run dev`. Open the local editor in a disposable project.
2. Use **Export → Import JSON** to load `tests/fixtures/interaction-plan.openplan.json`. Confirm the URL's ID becomes `qa-interactions-20260905`.
3. Click the orange table over the doorway. Dining Table Properties should open. Click the blue sofa and resize its top-left handle; the bottom-right corner must stay fixed. One Undo restores the size and position; Redo reapplies both.
4. Drag the sofa into the sidebar and release. It must stop following the pointer. Immediately Undo should restore the pre-drag position. Repeat with the purple mirrored chair at 45 degrees and verify its opposite resize corner remains fixed.
5. In **Settings → Dimensions**, toggle Wall snapping off and drag the green sofa near the bottom wall. Enable the setting and move its edge within 12 cm of the wall face. It should sit flush, facing into the room. Save, reopen, and verify edits.
6. Exercise 2D/3D, top-down view, and PDF/SVG exports. Independently verify the downloaded files before release. At phone width, open Tools, choose Measure, and select two points.

Chrome fixture upload was blocked by the extension's file-URL permission; the built-in two-bedroom template was used for Chrome testing. Temporary viewport overrides were reset and test tabs closed. Firefox, standalone Safari, actual touch/pinch input, physical iPhone testing, browser quota recovery, and end-to-end file delivery remain outside this run. Browser checks used the development server; the production bundle was built but not driven in the browser.

## Cost impact and next work

All changes operate on local geometry, browser persistence, or locally generated exports. No new Firebase Storage calls, uploads, retained media, or hosted services were added. No cloud settings changed and no iOS source changed. The deployed bucket's retention and costs remain unverified until the available Google Cloud credentials are refreshed.

Next priorities remain the reproducible opening hit region issue #18, accurate print scale, non-destructive IndexedDB migration and browser recovery coverage, faithful iPhone/web interchange, and live Firebase retention/cost verification. Continue evaluating #23, #13, and #14 separately after the reliability and interaction branches land. The full Milestone 1 exit gate is not yet met.
