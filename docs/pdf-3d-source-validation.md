# PDF main 3D view selection

The PDF exporter previously probed every DOM canvas for WebGL, then fell back to
the last canvas when none matched. Probing could initialize an unrelated context;
the fallback could add a mislabeled 2D canvas as a 3D perspective page.

The main ThreeViewer canvas now carries an explicit marker. PDF export selects
only that canvas, checks that its existing WebGL context is available, and skips
the optional page if the context is lost. Thumbnail, camera preview and 2D
canvases cannot become the optional 3D page merely because of their DOM order.

Unit coverage checks that unrelated canvases are never probed and that lost
contexts are not serialized. Browser coverage introduces decoy canvases that
throw if probed/captured, exports in 2D, then opens 3D and checks that the main
canvas is captured exactly once and adds exactly one PDF page.

Remaining: camera/lighting visual fidelity, blank-frame detection, arbitrary
canvas serialization failures, extreme aspect ratios and physical printing.

Validation on 2026-09-09: the full unit run passed 693 tests; its one failure was
a document stub missing the new selector. After updating the stub, that real-PDF
test passed separately (694 tests covered across runs). Svelte checks had zero
errors/warnings and the production build passed. Four Chromium/WebKit production
checks passed, covering main-canvas selection and schedule pagination. The actual
exported 3D page was rendered with CoreGraphics and visually checked for the main
scene, heading and footer clearance.
