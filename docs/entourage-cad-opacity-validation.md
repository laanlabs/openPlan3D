# Entourage CAD opacity — 2026-09-10

Built-in entourage now carries its saved partial opacity on each new DXF line or
spline. A 440 transparency tag is emitted inside the AcDbEntity subclass, using
explicit alpha mode and the nearest 8-bit opacity value. Opaque symbols keep the
normal default, and zero-opacity symbols remain omitted. Other objects and
previously emitted symbols are unchanged. Repeated serialization does not duplicate transparency tags.

The implementation decorates only the newly created symbol entities' tag writers;
no dependency source files or completed DXF text are rewritten. The encoding follows
[ezdxf's tag documentation](https://ezdxf.readthedocs.io/en/stable/dxfinternals/dxftags.html)
and [Autodesk's DXF group-code reference](https://help.autodesk.com/cloudhelp/2024/ENU/AutoCAD-DXF/files/GUID-3F0380A5-1C15-464D-BC66-2C5F094BCFB9.htm).

Tests parse DXF code/value pairs and check tag value/subclass location, unaffected
opaque geometry and repeat serialization. Browser gallery tests verify the actual
25%, 50% and 75% alpha values and render a preview using those exported attributes.
Furniture and stair export regressions run alongside the gallery.

Custom raster entourage in DXF remains open. CAD viewer/plotter display settings
can affect transparency presentation; physical/device qualification and broader
native parity are still outstanding.

## Results

All 911 unit tests and six Chromium/WebKit workflows passed. Final Svelte checks
reported zero errors and warnings; the production build passed. Visual review of
the downloaded DXF preview passed for opaque, 25%, 50% and 75% symbols. Furniture
and stair regressions passed.
