# OpenPlan3D user guide

This guide describes the hosted editor at <https://app.openplan3d.com> as of
October 2026. Menu, button and tool names are written exactly as they appear in
the English interface (Settings → Appearance → Language switches the interface
to Português). Shortcuts are written with Ctrl; on a Mac, Cmd works the same
way.

Contents

1. [Getting started](#1-getting-started)
2. [Drawing walls](#2-drawing-walls)
3. [Rooms](#3-rooms)
4. [Doors and windows](#4-doors-and-windows)
5. [Floors](#5-floors)
6. [Furniture and custom 3D models](#6-furniture-and-custom-3d-models)
7. [Dimensions and annotations](#7-dimensions-and-annotations)
8. [3D view and walkthrough](#8-3d-view-and-walkthrough)
9. [Settings](#9-settings)
10. [Saving and the project library](#10-saving-and-the-project-library)
11. [Exporting and downloads](#11-exporting-and-downloads)
12. [Importing](#12-importing)
13. [iPhone app handoff](#13-iphone-app-handoff)
14. [Sharing with an assistant](#14-sharing-with-an-assistant)
15. [Keyboard shortcuts](#15-keyboard-shortcuts)
16. [Troubleshooting](#16-troubleshooting)
17. [Getting help](#17-getting-help)

## 1. Getting started

### The project library

Opening <https://app.openplan3d.com> shows the **Floor Plan Editor** library:
one card per project with a preview, its name and when it was last changed.
There is no account and nothing is uploaded; as the page says, "Projects and
version history are saved in this browser." (See
[section 10](#10-saving-and-the-project-library) for what that means.)

- **New Project** opens an empty project called "Untitled Project".
- **Templates** opens **Floor Plan Templates**, "Complete house layouts with
  walls, doors & windows": Studio Apartment (~30m²), 1-Bedroom Apartment
  (~50m²), 2-Bedroom House (~80m²), Open Concept Home (~100m²) and L-Shaped
  House (~120m²). Choosing one creates a new project from it.
- Each card has a menu ("Project actions for …") with **Open**, **Rename**,
  **Duplicate** and **Delete**. On a desktop the menu button appears when you
  point at a card. Deleting asks: "Delete “name” and its version history from
  this browser? This cannot be undone."
- **Duplicate** makes an independent copy named "… (Copy)", including the
  edits you just made if you came straight from the editor. The copy is listed
  first and outlined, and the line above the list reads "Duplicated as “…
  (Copy)”." Rename it to tell your variations apart, since their previews look
  alike. The editor itself has no duplicate command.
- Below the header: **Download library backup**, **Restore library backup**,
  **Import project package** (see sections 10 and 12) and **User guide**,
  which opens this page in a new tab.
- While the browser has not agreed to keep your projects (see "Persistent
  storage" in [section 10](#10-saving-and-the-project-library)), a note
  below those links reads "This browser may delete saved projects, for
  example when it runs low on space. Use “Download library backup” regularly
  to keep a copy." Its ✕ hides the note in this browser.

### First visit

With no projects yet, a **Welcome** screen offers **Start from Scratch**, **Use
a Template**, **Import a Plan** ("Load a JSON or RoomPlan file"; this button
accepts `.json` files only) and a four-step **Quick Tour**. Links at the bottom
let you **Restore a library backup** or **Import a project package** instead.
Both kinds of JSON backup load from here. **Import a Plan** opens a project
from **Download JSON** in the editor, and hands a file from **Download library
backup** to **Restore library backup**, which lists its projects before adding
them as copies. **Restore a library backup** also takes a project from
**Download JSON** and adds it as a copy.

### The editor at a glance

- **Top bar** (left to right): **Projects** (back to the library), the project
  name (click it to rename), the floor selector with **Add Floor** (+),
  **Undo** / **Redo**, **Snap to Grid**, **Select mode (V)** / **Pan mode (H)**,
  **Toggle Furniture**, **Plan** / **Elevation**, **2D** / **3D**,
  **Version History**, **Area Summary**, **Settings**, the **Export** menu, the
  save status ("Saved ✓", "Saving…" or "Unsaved •") and **Save**.
- **Left sidebar** with three tabs: **Build** (tools, stairs, columns, text,
  dimensions, measure, import, doors and windows), **Rooms** (room presets and
  templates) and **Objects** (furniture catalog, your own 3D models, 2D
  entourage symbols).
- **Canvas** in the middle. An empty project shows "Start building your floor
  plan — Draw walls with W or drag items from the sidebar". The status bar
  under the canvas counts rooms, walls, doors, windows and objects, shows
  "Zoom: …%", and has the **Fit**, **Grid**, **Snap**, **Furniture**,
  **Layers**, **Rulers** and **Map** toggles plus zoom buttons (**Zoom out**,
  **Zoom to 100%**, **Zoom in**, **Zoom to fit**, **Fit selection**).
- **Properties** panel on the right. It appears when something is selected and
  shows the settings for that wall, door, window, room, furniture item, stair,
  column, text note, symbol or background image.
- **Round buttons at the bottom left**: **?** (Keyboard Shortcuts), **Layers
  Panel (L)** and **Undo History**.
- **Command Palette**: press Ctrl+K or `/` and type to "Search furniture,
  tools, actions…".
- **Phones and small windows**: the sidebar becomes a drawer opened with the
  blue tools button at the bottom left, and the top bar folds secondary items
  into a **More** menu (floors, Zoom In / Zoom Out / Reset Zoom, Pan Mode, Snap
  to Grid, Show Furniture, Layers, Elevation View, Undo History, Version
  History, Area Summary, Settings, User guide). On a touch screen, drag with one finger to
  use the current tool, use two fingers to pinch-zoom and pan, and double-tap
  where the guide says double-click.

Short one-time tips appear the first time you draw a wall, place a door or
furniture, open 3D or export ("Got it" dismisses them).

## 2. Drawing walls

1. Press **W** or choose **Build → Draw Wall** ("Click to draw, dbl-click to
   finish").
2. Click where the wall starts. Move the mouse; the length and angle are shown
   next to the wall.
3. Each further click places a corner and starts the next wall.
4. To finish: double-click, press **Escape**, or close the loop. Clicking near
   the first point closes the loop automatically; pressing **C** closes it from
   wherever you are.

Useful while drawing:

- **Angles.** With **Snap to Grid** on, a wall within about 10° of a 45° step
  snaps to it. Hold **Shift** to force 0°, 45°, 90° or 135° (the angle label
  shows ⇧ while Shift is held).
- **Exact length.** After the first click, just type a number (for example
  `350`) and press **Enter**; the wall is placed at exactly that length in the
  direction of the mouse. The number is in centimetres when the unit is
  "m, cm" and in inches when the unit is "ft, inch". Backspace edits the
  number; Escape cancels.
- **Snapping.** Endpoints snap to nearby wall ends and walls. The top-bar
  **Snap to Grid** button turns all snapping (grid, angle and magnetic) on or
  off. The **Snap** button in the status bar (**S**) switches between the
  25 cm grid and a finer step; while Snap to Grid is off it reads **Snap off**.
  **G** shows or hides the grid.

### Editing walls

Press **V** (Select) and click a wall. The **Wall Properties** panel shows:

- **Length**, with the note "Enter cm, or include units such as 2.5 m, 12" or
  5'6"." Choose which end stays put under **Keep fixed**: **Start (A)** or
  **End (B)**. "Joined corners follow the moving endpoint. Openings keep their
  relative positions." The minimum is 1 cm.
- **Thickness**, **Start Height** and **End Height** (a sloping wall has
  different heights; **Equalize** makes them the same), **Reverse direction**.
- **Curved wall** (◆ On / ◇ Off).
- **Interior** / **Exterior** tabs with a colour and a **Texture** (None, Red
  Brick, Exposed Brick, Stone, Wood Panel, Concrete Block, Subway Tile) for the
  3D view.

On the canvas, with a wall selected:

- **Move a corner:** drag either end handle. Walls joined at that corner follow.
  With **Snap to Grid** on, the end snaps to nearby wall ends and walls and
  onto a 0°, 45° or 90° line from the wall's other end — but only while the
  pointer is within about 15 screen pixels of that line (at any zoom), so a
  long wall no longer jumps sideways as you drag. Hold **Alt** (Option on a
  Mac) to move the corner freely with no magnet, grid or angle snapping; hold
  **Shift** to keep the wall on the nearest 45° step.
- **Move a wall sideways (parallel move):** drag the handle in the middle of a
  straight wall.
- **Curve a wall:** hold **Alt** and drag the middle handle. A curved wall's
  middle handle always adjusts the curve. Right-click → **Curve** (or the
  **Curved wall** switch) turns a curve on or off.
- **Split a wall:** double-click the wall where you want the split, or
  right-click → **Split Wall** to split it at its midpoint. You cannot split
  through a door or window: "Choose a split point outside doors and windows.
  Splitting through an opening would change its geometry."
- **Delete:** Delete/Backspace, or right-click → **Delete Wall**.

### Elevation view

The **Plan** / **Elevation** switch in the top bar shows one wall face-on.
With a wall selected, **Elevation** opens that wall; otherwise it asks you to
"Click a wall to view its elevation — Esc to cancel". In the elevation you can
"Drag openings to move · drag windows up/down for sill · Esc for plan", and step
through walls with **Previous wall** / **Next wall**.

## 3. Rooms

Rooms are detected automatically wherever walls form a closed loop; the status
bar count updates as you draw. A room gets a label with its name and area.

- **Name a room:** double-click inside it and type, or select it and use **Room
  Properties → Room Name**. Right-click → **Rename Room** does the same.
- **Room Type** (Living Room, Bedroom, Kitchen, Bathroom, Dining Room, Office,
  Hallway, Closet, Laundry, Garage, Custom) fills in the matching **Room
  Name**; Custom keeps whatever you typed. **Category** (Indoor, Outdoor,
  Garage, Utility) groups the area totals.
- **Room Color** offers presets (White, Cream, Beige, Light Gray, Warm Gray,
  Sage Green, Light Blue, Blush Pink, Lavender, Butter Yellow) and a custom
  colour. **Floor Material** is grouped into Plain (Solid Color), Wood (Light
  Oak, Walnut, Bamboo, Laminate), Tile (White Tile, Gray Tile, Porcelain,
  Vinyl), Stone (White Marble, Dark Marble, Concrete, Slate) and Carpet (Beige
  Carpet, Gray Carpet). With Solid Color the room colour is "(used as floor
  color)" in 3D. Right-click → **Change Floor Texture** jumps there.
- **Open to floor below** "Removes the floor slab inside these walls and
  excludes it from floor area" (for stairwells and double-height spaces).
- **Area** is shown in the panel. Drag the label to move it; right-click →
  **Reset Label Position** puts it back.
- Right-click → **Delete Room** removes the room and the walls that belong only
  to that room; walls shared with a neighbouring room stay.

**Area Summary** (top bar) lists **Interior area** ("Interior area excludes
wall footprints. The totals and room breakdown below use wall centerlines."),
**Rooms**, **Total Area**, **Doors / Windows**, **Wall Length**, totals **By
Category** and a **Room Breakdown** with percentages. Areas follow the unit
chosen in Settings. If you see "No rooms detected yet. Draw walls to create
rooms.", a loop is not closed; check the corners.

Ready-made shapes live in the **Rooms** tab: **Room Presets** (Rectangle,
L-Shape, T-Shape, U-Shape — "Click to add a room shape to the canvas") and
**Room Templates** (Living Room, Bedroom, Kitchen, Bathroom, Office, Dining
Room — "Pre-furnished rooms — walls + furniture in one click"). Click one to
place it at the centre of the view, or drag it onto the canvas.

## 4. Doors and windows

The bottom of the **Build** tab lists **Doors** (Single 90cm swing, Double
150cm swing, Sliding 180cm slide, French 150cm glass, Pocket 90cm recess,
Bifold 180cm fold, Doorway 100cm open, Garage 240cm overhead) and **Windows**
(Standard 120×120cm, Fixed 100×100cm, Casement 80×130cm, Sliding 180×120cm,
Bay 200×150cm).

- Click a type, then click a wall. The tool returns to Select after placing.
  You can also drag a type from the sidebar onto a wall. **D** selects the door
  tool with the last chosen door type.
- Drag a door or window along its wall to reposition it. In **Elevation** view,
  drag windows up or down to change the sill.
- **Door Properties**: Width, Height, Distance from A, Distance from B, Type,
  Hinge Side (Left / Right), Opens (Inward / Outward) and "Doorway (no door)".
  **Window Properties**: Width, Height, Sill Height, Distance from A / B, Type.
- With a door selected, a small toolbar offers **Flip swing direction
  (left/right)** and **Flip opening side (inward/outward)**, plus Duplicate and
  Delete.
- If a wall is lower than its openings, the panel warns: "Some openings do not
  fit this wall. Elevation and 3D clip their preview; saved dimensions stay
  unchanged. Raise the wall or resize/reposition the openings."

## 5. Floors

- The top bar's floor list switches the **Current floor**. The **+** button
  (**Add Floor**) adds a new top floor seeded with **Exterior walls — current
  footprint**, **All walls — includes partitions** or an **Empty floor**.
  **Remove current floor** is available while there is more than one floor.
- Building on a layout you already drew:
  - For a variation of the whole plan (the shell, then the shell with doors
    and windows), **Duplicate** the project in the library and edit the copy.
  - For the next storey, **Add Floor** with **Exterior walls** or **All
    walls**. Only walls are copied, from the floor you are on; doors, windows,
    stairs, labels and room names stay on the floor where you placed them.
  - To bring more than walls, select everything (**Ctrl+A**), copy
    (**Ctrl+C**), switch floors and paste (**Ctrl+V**). Walls with their doors
    and windows, stairs, labels and dimensions are pasted 30 cm down and to the
    right of where they were, so drag the selection back into place. Room
    names are not copied. There is no one-step "duplicate floor".
- **Settings → Project → Floor elevations** sets each floor's "elevation (cm)"
  ("Set each floor's height above ground for stacked 3D. Use negative values
  for basements. Wall heights and other floors stay unchanged. Defaults are 300
  cm apart.") and "slab thickness (cm)" ("Extends below the floor surface in
  enclosed rooms.").
- The status bar's **Layers** popover can show **Floor Below** as a ghost
  while you draw the floor above.
- In 3D, **Show All Floors Stacked** / **Active Floor Only** switches between
  the whole building and one floor.
- Every 2D export (PNG, SVG, DXF, PDF, print) covers the **active floor only**.
  Switch floors and export again for the others. JSON, project packages and
  library backups always contain all floors.

## 6. Furniture and custom 3D models

### The catalog

**Objects** tab. Use **Search furniture...**, the **All** / **♥ Favorites** /
category chips (Living Room, Bedroom, Kitchen, Bathroom, Office, Dining, Decor,
Lighting, Outdoor Furniture, Landscaping, Fencing, Structures, Pool & Spa,
Garage, Paths & Lawns, Outdoor Lighting, Garden Structures, Electrical,
Plumbing, Imported) and the **Recent** row. Hovering an item shows its size
(width × depth × height in cm). The ♥ on a card adds it to Favorites.

### Placing and editing

- Click an item, then click on the canvas, or drag the item onto the canvas.
  While placing, **R** turns the preview in 15° steps. With **Wall snapping**
  on (Settings → Dimensions), "Furniture automatically aligns its back edge
  with nearby walls".
- Select an item (V) and drag to move. Drag the corner handles to resize; hold
  **Shift** to keep the proportions. **R** rotates the selection in 15° steps.
- Right-click an item: **Duplicate**, **Rotate 90°**, **Flip Horizontal**,
  **Bring to Front**, **Send to Back**, **Lock** / **Unlock** (also Ctrl+L),
  **Properties**, **Delete**.
- The **Properties** panel ("… Properties") has size fields, **Rotation
  (degrees)**, **Rotate 90° left** / **right**, **Flip H** / **Flip V**,
  **Color** (presets and a custom colour) and **Material** (Wood, Metal,
  Fabric, Leather, Glass, Plastic, Stone, Ceramic, or "Original materials").
  "Color tints the 3D model; materials adjust its finish. Reset to defaults
  restores the original appearance."
- **Toggle Furniture** in the top bar (or **Furniture** in the status bar)
  hides all furniture so you can work on walls.

### Selecting several things

- **Shift+click** adds or removes an item from the selection.
- Drag on empty canvas to draw a selection box around several items.
- **Ctrl+A** selects everything on the floor; **Ctrl+D** or Escape deselects.
- **Ctrl+G** groups the selection (right-click → **Group Selected**);
  **Ctrl+Shift+G** ungroups. Clicking a grouped item selects the whole group;
  Ctrl+click picks a single member.
- With two or more items selected, an alignment bar appears: **Align Left**,
  **Center Horizontal**, **Align Right**, **Align Top**, **Center Vertical**,
  **Align Bottom**, **Distribute Horizontally**, **Distribute Vertically**.
- **Ctrl+C** / **Ctrl+V** copy and paste the selection; **Delete** removes it.

### Stairs and columns

**Build → Add Stairs** ("Click to place stairs"), then set **Stair Properties**:
Straight, L-Shaped, U-Shaped or Spiral, **Risers**, and **Direction** (Up ↑ /
Down ↓). **Round Column** / **Square Column** place columns; **Column
Properties** has Shape, Diameter or Side Length, and colours.

### Entourage (2D symbols)

At the bottom of the Objects tab, **Entourage** holds flat symbols for plans:
People, Vehicles, Planting and Outdoor. Click one, then click the canvas to
place it ("Shift-click to stamp several"). **+ Upload symbol (PNG, JPEG,
WebP)** adds your own image (up to 2 MB); it appears under **Custom**. Symbols
have Rotation, Opacity and a lock; they show in 2D and in 2D exports.

### My 3D models (your own GLB files)

At the top of the Objects tab, **My 3D models → Import GLB model** ("Static
GLB files up to 16 MiB. Files stay in this project."):

1. Choose a `.glb` file. A preview shows its size as "Width … × depth … ×
   height … cm" (glTF metres become centimetres).
2. Enter a **Model name** and optionally **Attribution**, **License** and a
   **Source URL**, then **Add to project**.
3. Use **Place at view center** on the saved model to put a copy on the current
   floor; move and resize it like any furniture. Save the project to keep it.
4. **Remove model** deletes the definition once no placed copies remain
   ("Remove this model’s placed furniture before removing its definition.").

Only static glTF 2.0 binaries with embedded textures are accepted (no external
files, animations, skins or cameras); a project can hold up to 64 models. The
model bytes are stored inside the project, so they travel with JSON, library
backups and project packages. See
[Local custom furniture models](local-custom-models.md) for the full limits.

### Item details and photos

Below the properties of a wall, room, door, window or furniture item, **Item
details** stores **Item notes**, **Item cost**, **Construction material**,
**Room use**, **Room ceiling height** and **Item photos** (**Add photo**: "JPG
or PNG, up to 8 MiB and 24 megapixels. Large photos become resized copies up to
1600 pixels. No uploads."). These travel in project packages to the iPhone app
and to assistant shares. **Retained attachments** lists files kept from an
imported package; **Delete file…** removes one from future exports.

## 7. Dimensions and annotations

### Automatic dimensions

**Settings → Dimensions** turns automatic wall dimensions on or off
(**Dimensions**), and separately **External Dimensions**, **Internal
Dimensions**, **Extension Lines**, **Object Distance** (distances from
furniture to walls) and the **Line Color** (white or dark). **Measure walls**
chooses **Centerline** or **Edge to edge** ("Edge to edge shows the clear span
between adjoining wall faces"); the PNG, SVG, DXF and PDF exports print wall
lengths the same way, and a curved wall always shows its centreline length.
In the status bar's **Layers** popover, **Automatic dimensions** is the same
switch as **Settings → Dimensions → Dimensions**, and **Room Labels** hides room
names and areas until you turn it back on. The exports follow these switches:
with automatic dimensions or **External Dimensions** off, the PNG, SVG, DXF
and PDF exports leave the wall lengths out (see
[section 11](#what-the-2d-exports-show)).

### Dimension tool (N)

**Build → Dimension** ("Add dimension annotations (N)"). Click two points; a
box asks for a **Dimension label (optional)** — "Leave empty for measured
distance" — and Enter confirms. Dimensions appear in exports.

### Measure tool (M)

**Build → Measure** ("Measure distances (M)"). Click two points to leave a
measurement line with its distance. Select and press Delete to remove it.

### Text labels (T)

**Build → Text Label** ("Add text annotations (T)"). Click where the note goes,
type, and press Enter (Escape cancels). Double-click a note to edit it; the
**Text Annotation** panel sets **Text** and **Font Size**.

### Guides, rulers, grid and map

- **Rulers** (status bar) shows rulers; double-click a ruler to add a
  horizontal or vertical guide. Guides can be dragged and deleted.
- **Grid** (**G**) shows the grid. **Snap** (**S**) switches the snap step
  between the 25 cm grid and 10 cm and shows the step in use (9.8" or 3.9"
  in feet and inches); **Snap to Grid** in the top bar turns snapping off.
  While it is off, Snap reads **Snap off**, and **S** still picks the step
  used once snapping is back on.
- **Map** shows a mini-map of the whole floor for large plans.
- Zoom with the mouse wheel or pinch; **F** fits the whole plan, **Shift+F**
  fits the selection. Pan with **Space+drag**, the middle mouse button, **Pan
  mode (H)**, or Shift+drag on empty canvas.

### Layers panel

**L** (or the 🗂 button) opens **Layers**: every element on the floor grouped
as Walls, Doors, Windows, Furniture, Entourage, Stairs, Columns, Guides,
Measurements, Annotations, Text notes and Rooms. Each group can be hidden or
shown, and clicking an entry selects it on the canvas — useful for small or
overlapping items. A hidden group is also left out of Print Layout and the 2D
exports (see [section 11](#what-the-2d-exports-show)).

## 8. 3D view and walkthrough

Press **Tab** or click **3D** in the top bar ("Loading 3D viewer…" appears the
first time while the viewer downloads). Drag to orbit, scroll or pinch to zoom,
right-drag (two fingers on touch) to pan. Switching floors in 3D rebuilds the
scene for that floor.

The toolbar at the top right has:

- **Show All Floors Stacked** / **Active Floor Only**
- **Top-Down View**
- **Make Walls Transparent** / **Show Solid Walls**
- **Edit Mode** — "click to select walls & change materials". Click a wall and
  the **Wall Properties** panel opens with the **Interior** / **Exterior**
  colour and **Texture**. The banner reads "Click walls to paint materials •
  ESC to close picker or exit". In Edit Mode, **Place Furniture** opens a
  **Furniture** picker; pick an item and "Click floor to place … • ESC to
  cancel".
- **Place Interior Camera** — "click floor to position, click again to aim".
  The **Interior Camera** panel shows a preview ("Drag to look around"),
  arrow buttons to move, **FOV**, **Height**, **X-ray walls (see through)**,
  **Capture 1920×1080** (downloads `<project>-interior-photo.png`) and
  **Reposition**. **AI Render** generates a photorealistic image through your
  own Gemini or OpenAI key from **Settings → AI** ("The camera image goes
  directly to this provider. Provider charges may apply."); **Download
  Render** saves `<project>-ai-render.png`.
- **Save 3D Screenshot** — downloads `floorplan-3d.png` at the current window
  size.
- **Enter Walkthrough Mode** — first-person view starting inside a room.
  "WASD to look • Arrows to move • Mouse to look • Shift to sprint • ESC to
  exit". The **Walkthrough Controls** panel sets **Eye Height**, **Walk Speed**
  and **Sprint Speed**. If the browser refuses mouse capture you will see
  "Mouse look is unavailable in this browser. Use WASD to look and arrow keys
  to move."

**Lighting Controls** (bottom left) has **Time of Day** presets (morning, noon,
evening, night), **Sun Position**, **Sun Elevation** and **Ambient Light**.
**Export Blender Scene** downloads `openplan3d-render-scene.json` for the
separate local render lab described in [render-lab.md](render-lab.md); it is
not needed for normal use.

Room floors come from **Floor Material** in 2D Room Properties; wall colours
and textures from Wall Properties. The 3D view needs WebGL; if the browser
cannot start it, the view says "The 3D view needs WebGL, which this browser
could not start. …" instead. Check that hardware acceleration is enabled in
the browser and that no extension blocks WebGL; the 2D plan keeps working.

## 9. Settings

The **Settings** dialog (gear icon in the top bar, or Settings in the More
menu) has four tabs:

- **Project**: **Project Name**, **Description** (printed in the PDF title
  block) and **Floor elevations** (see section 5). These are saved with the
  project.
- **Dimensions**: **Wall snapping**; **Metrics unit** — **m, cm** or
  **ft, inch**; **Measure walls** — **Centerline** or **Edge to edge**; the
  **Dimensions**, **External Dimensions**, **Internal Dimensions**, **Extension
  Lines** and **Object Distance** switches; **Line Color**. These settings are
  stored in the browser, not in the project, so they apply to every project
  you open in this browser and are not included in JSON files. **Measure
  walls** also decides the wall lengths printed by the PNG, SVG, DXF and PDF
  exports, and with **Dimensions** or **External Dimensions** off those exports
  leave the wall lengths out (see [section 11](#what-the-2d-exports-show)).
- **Appearance**: **Language** (English, Português) and **Theme** (Light,
  Dark, System).
- **AI**: **Gemini API Key** ("Required for AI-powered photorealistic
  rendering. Your key is stored locally in your browser only - never sent to
  our servers.") and optional **OpenAI API Key** / provider settings. Only
  needed for AI Render in the 3D interior camera.

Changing the unit converts the display everywhere (lengths, areas, the wall
length field, exports). Imperial lengths are shown in feet and inches; the
wall **Length** field accepts values such as `5'6"`, `12"` or `2.5 m`.

## 10. Saving and the project library

### Autosave

Every change is saved to the browser about one second after you stop editing.
The top bar shows **Unsaved •**, **Saving…**, then **Saved ✓**; hovering the
status shows "Last saved: …". **Save** (or **Ctrl+S**) saves immediately. The
editor also saves when you switch tabs, go back to **Projects** or close the
window.

### Where projects live, and what happens if browser storage is cleared

Projects, thumbnails and version history are stored in this browser's site
storage (IndexedDB) for app.openplan3d.com. Nothing is sent to a server, which
also means:

- Another browser, another device, a private window, or a different browser
  profile does not see your projects. Only <https://app.openplan3d.com>
  opens this library; another address has a library of its own.
- Clearing site data, cookies or "browsing data" for app.openplan3d.com
  deletes every project and its history. Private/incognito windows discard
  storage when closed. Browsers may also evict site storage when the disk is
  nearly full (see "Persistent storage" below).
- A browser set to delete site data when it closes deletes the library every
  time it quits, including the restart that installs a browser update, even
  though the restored tab looks as if it was never closed. In Firefox that is
  **Settings → Privacy & Security → Cookies and Site Data → Delete cookies
  and site data when Firefox is closed**, or **History** set to **Never
  remember history**. Turn it off, or allow app.openplan3d.com as an
  exception.
- To keep your work safe, download a **library backup** regularly (below) or
  **Download JSON** for individual projects, and keep those files somewhere
  you control.

### Persistent storage

Browsers keep site data either as best-effort storage, which they may delete
on their own to free space (Safari can also delete the data of sites you have
not used for a while), or as persistent storage, which only you can delete.
The first time you save work in a browser (creating, saving, copying,
restoring or importing a project), OpenPlan3D asks once to keep the library
in persistent storage. Opening a page never asks, and saving never waits for
the answer.

- Firefox asks whether to allow app.openplan3d.com to store data in
  persistent storage: choose **Allow**. To change it later, open Page Info
  (padlock in the address bar → **More information**) → **Permissions** →
  **Store Data in Persistent Storage**.
- Chrome, Edge and Safari decide without asking, based on how you use the
  site (in Chrome, bookmarking it helps).

Persistent storage only stops automatic cleanup. Clearing site data, a
"delete on close" setting, a private window or another browser profile still
removes or hides the library, so backups stay the copy you control. While the
browser has not agreed to keep the library, the library page says so and
recommends **Download library backup** (see
[section 1](#the-project-library)).

### Version History

**Version History** (clock icon in the top bar) keeps up to 10 snapshots per
project: one at "Session start", an "Auto-save" every 5 minutes while the plan
has changed since the last snapshot ("Versions are saved automatically every 5
minutes."), a "Manual save" when you press Ctrl+S, and a "Before restore" copy
of the version you are replacing whenever you restore one. **Restore** loads a
snapshot ("Restore this version? The current version is kept in Version
History."), and **Clear all versions** deletes them. If the history cannot be read, the dialog
offers **Download version backup** (`openplan3d-version-history-backup.json`).

Version history is separate from **Undo** / **Redo** (Ctrl+Z / Ctrl+Y), which
keeps up to 50 steps for the current session; the **Undo History** panel lists
them by name ("Added wall", "Moved furniture", …).

### Library backups

On the library page, **Download library backup** saves
`openplan3d-library-backup.json` with every project, its version history,
previews and any recovery data. **Restore library backup** ("Add restored
copies to this browser. Your existing projects stay available.") reads such a
file, lists what it contains ("New copy · 3 saved versions"), and **Restore as
copies** adds them without overwriting anything. At most the latest 10 valid
versions per project are restored; damaged entries are kept as recovery data
and included in future backups.

**Restore library backup** also takes a single project saved with **Download
JSON** (or **Download JSON backup** in the red save bar), for example
`Our house.json` or a second download named `Our house(1).json`. That is the
quickest way back if browser storage was cleared: choose the file, check that
the preview lists the project, and choose **Restore as copies**; it comes back
as "Our house (Restored copy)".

### Save problems

If a save fails, a red bar reads "Changes are not saved." followed by the
reason, with **Retry save** and **Download JSON backup**. When the project was
changed in another tab ("This project changed or was deleted in another tab.
Save your version as a copy or download a JSON backup to keep both versions.")
use **Save as copy**. See [Troubleshooting](#16-troubleshooting) for the
storage messages.

When a new release is deployed you may see "An app update is ready. Reload to
use the latest version. Your project will be saved first." — choose **Save and
reload**.

## 11. Exporting and downloads

### The Export menu

The **Export** button in the top bar opens:

| Menu item | File you get | What it contains |
| --- | --- | --- |
| **Print Layout** (Ctrl+P) | `<project>-1-50.pdf` (or `-Fit to page.pdf`), or the browser print dialog | Active floor to a true scale on Letter or A4, with a room schedule page |
| **Export 2D as PNG** | `<project>.png` | Active floor as an image of what the 2D plan shows: room fills and labels, walls and their lengths, openings, furniture symbols, stairs, columns, measurements, dimensions and notes, with "<project> — <floor>" as a title; up to 2× resolution, at most 4096 px per side |
| **Export 3D as PNG** | `<project>-3d.png` | The 3D view of the active floor (the editor switches to 3D, renders, downloads, and returns to 2D) |
| **Export as SVG** | `<project>.svg` | Vector drawing of the active floor; 1 unit = 1 cm; opens in Inkscape, Illustrator, browsers |
| **Export as DXF** | `<project>.dxf` | CAD drawing of the active floor in centimetres with layers WALLS, DOORS, WINDOWS, FURNITURE, DIMENSIONS, ROOMS, STAIRS, COLUMNS |
| **Export as DWG** | `<project>.dxf` | There is no DWG writer. The editor downloads the DXF and shows the notice "DWG saved as DXF — DWG is a proprietary format, so a DXF file was downloaded instead. AutoCAD, SketchUp and FreeCAD open DXF directly." |
| **Export as PDF** | `<project>.pdf` | A4 landscape sheet of the active floor with a title block, **Room Schedule** pages and, if the 3D view is open, a **3D Perspective View** page; the sheet's labels follow the interface language |
| **Download JSON** | `<project>.openplan.json` | The complete project: all floors, rooms, furniture, notes, settings stored in the project, background images and custom models. This is the file to keep as a backup and to reopen with **Import JSON** |
| **Download project package** | `openplan3d-project.zip` | "For iPhone and web. Includes retained original data and attachments, even when they are not shown here." See below |
| **Share with Assistant…** | nothing downloaded | Uploads a copy for seven days and gives you a code and secret (section 14) |
| **Other planners** → **Open in OpenLandscape3D**, **Open in OpenKitchen3D**, **Open in OpenCatio3D** | nothing downloaded; a new tab | Opens that planner with the whole plan in the link (see "Opening a plan in another planner" below) |
| **Download interchange JSON** | `<Project-Name>-openplan3d.json` | "For OpenKitchen3D, OpenLandscape3D, OpenCatio3D and the iPhone app. Opening another planner puts the whole file in the link; nothing is uploaded. The file carries the plan's geometry only; the project package keeps the full plan." Walls, doors, windows, furniture and room labels in metres, plus anything one of those planners stored in the file |
| **Import JSON** | — | Opens a `.json` or RoomPlan `.zip` as a new project (section 12) |
| **Import project package** | — | Opens the same **Import project package** dialog as the library page (section 12); after **Import as copy** the editor switches to the imported copy |
| **New Project** | — | Saves the current plan and opens an empty one |

`<project>` is the project name; an unnamed project exports as `floorplan`.
Browsers add " (1)", " (2)" and so on when a file with the same name already
exists in the Downloads folder.

If the active floor is empty, the 2D PNG, SVG, DXF, DWG and PDF exports do
nothing except show "Add walls, furniture, stairs, columns, entourage, notes or
measurements to the active floor before exporting a PNG" (or "… an SVG", "… a
DXF", "… a DWG", "… a PDF"). If everything on it is on a hidden layer, they
say "Everything on the active floor is on a hidden layer. …" instead (see
[What the 2D exports show](#what-the-2d-exports-show)).

DXF and DWG files hold CAD linework only, so they leave out uploaded entourage
symbols and entourage at 0% opacity, which the SVG, PNG and PDF exports
include. When those are all the active floor holds, Export as DXF and Export as
DWG download nothing and say "A DXF can't include uploaded entourage symbols or
entourage at 0% opacity, and the active floor has nothing else to export.
Export as SVG, PNG or PDF instead." (or "A DWG …").

### Printing to scale (Print Layout)

**Export → Print Layout** (or Ctrl+P) opens **Print Preview**:

- **Page:** Letter or A4. **Orientation:** Landscape or Portrait.
- **Scale:** **Fit to page**, 1:25, 1:50, 1:100 or 1:200. If the plan does not
  fit you will read "The plan does not fit at this scale. Choose a smaller
  scale, another orientation, or Fit to page." Room labels, notes and the
  captions of stairs, measurements and dimensions count as part of the plan,
  so **Fit to page** keeps them whole on the sheet. Lettering keeps a minimum
  size on paper, so at small scales it takes up more of the plan.
- **Download PDF** saves `<project>-1-50.pdf` (the scale is part of the name);
  **Print** opens the browser's print dialog for the same page.
- The sheet shows the project name and "Scale: 1:50"; the PDF also includes
  the **Room Schedule**. As the dialog says: "Print at 100% / Actual size on
  the selected paper size." In the print dialog, turn off "Fit to page" /
  "Scale to fit" and choose the same paper size, otherwise the printed scale
  is wrong.

### Export as PDF

**Export as PDF** is the presentation sheet: A4 landscape, a double border, a
title block with the project name, floor name, description, date, units,
"openplan3d.com" and "Created with OpenPlan3D", then **Room Schedule** pages
(#, Room Name, Type, Area, Floor Texture) and a **3D Perspective View** page
captured from the 3D view. These labels and the date follow the interface
language (Portuguese: "Tabela de ambientes", "Vista 3D em perspectiva"). The 3D
page is only possible while the 3D view is open: switch to **3D**, wait for
it to render, then choose **Export → Export as PDF**. Exporting from 2D gives
"PDF exported without the 3D view — The floor plan was exported. Reopen the 3D
view and try again to include it." It is not printed to a fixed scale; use
**Print Layout** for that.

### What the 2D exports show

Print Layout, **Export 2D as PNG**, **Export as SVG**, **Export as DXF** /
**DWG** and **Export as PDF** draw the active floor the way the 2D plan shows
it. Hide what you do not want on paper before exporting — for example, turn
off automatic dimensions for an outline of the shell without estimated
lengths. Everything that shows by default is exported by default.

| On screen | Left out of the exports while it is off |
| --- | --- |
| **Settings → Dimensions → Dimensions**, or **Automatic dimensions** in the status bar's **Layers** popover (the same switch) | Automatic wall lengths, and the room width × depth that Print Layout prints with **Internal Dimensions** on |
| **Settings → Dimensions → External Dimensions** | Automatic wall lengths |
| **Settings → Dimensions → Internal Dimensions** (off by default) | Room width × depth, which only Print Layout prints |
| A group in **Layers** (**L**), or its checkbox in the status bar's **Layers** popover: Walls, Doors, Windows, Furniture, Entourage, Stairs, Columns, Measurements, Annotations (**Dimensions** in the popover: the Dimension tool's lines), Text notes | That group. Hidden walls take their lengths with them, but rooms stay filled because they are traced from the walls |
| **Room Labels** in the status bar's **Layers** popover | Room names and areas |
| **Furniture** in the status bar, **Toggle Furniture** in the top bar or **Show Furniture** in the **More** menu | Furniture (the same switch as the Furniture group) |

The grid, guides, rulers, mini-map, selection handles, the distances shown
while a door, window or furniture item is selected, and the Floor Below ghost
are never exported; **Extension Lines**, **Object Distance** and **Line Color**
only change the screen. The PDF's Room Schedule and summary always cover the
whole floor. If every item on the active floor is hidden, the export says
"Everything on the active floor is on a hidden layer. Exports show only what
the 2D plan shows: turn the layers back on under Layers and export again."
instead of saving an empty file, and Print Preview says "Everything on this
floor is on a hidden layer. Turn its layers back on under Layers to print it."
**Export 3D as PNG** shows the 3D view, which has no labels, notes or
dimensions. JSON files, project packages and interchange files always contain
everything.

### 3D images

- **Export → Export 3D as PNG** gives `<project>-3d.png` from the main view.
- In 3D, **Save 3D Screenshot** gives `floorplan-3d.png`; the **Interior
  Camera**'s **Capture 1920×1080** gives `<project>-interior-photo.png`.
- If the capture fails ("The 3D view could not be captured. Reopen the 3D
  view and try again."), open 3D, let it render completely, and export again.

### JSON, project package or library backup?

- **Download JSON** — one project, everything the web editor knows, as plain
  text. Best for backups and for moving a project to another browser or
  computer: open it with **Import JSON** in the editor, **Import a Plan** on
  the Welcome screen, or **Restore library backup** on the library page. Does
  not include version history.
- **Download project package** — one project as a ZIP for exchange with the
  OpenPlan3D iPhone app or another browser. It carries the plan, photos,
  custom models and any original iPhone data that was retained from an import,
  even when the web editor does not display it. Import it with **Import
  project package** on the library page or in the editor's Export menu. The
  format is described in
  [project-package-v1.md](project-package-v1.md).
- **Download library backup** — every project in this browser plus version
  history and previews, restored with **Restore library backup** (choosing it
  in **Import JSON** or **Import a Plan** opens the same dialog).

Do not re-zip or edit a package with another tool; only packages written by
OpenPlan3D are accepted ("Unsupported ZIP layout. Export a new project package
from OpenPlan3D.").

### Opening a plan in another planner

OpenLandscape3D (<https://openlandscape3d.com>), OpenKitchen3D
(<https://openkitchen3d.com>) and OpenCatio3D (<https://opencatio3d.com>) are
free web planners from the same makers that read and write the same plan
file. Under the **Other planners** caption of the Export menu:

- **Open in OpenLandscape3D**, **Open in OpenKitchen3D** and **Open in
  OpenCatio3D** open that planner in a new tab with your plan already loaded:
  the walls become the house footprint for a garden, the room for a kitchen
  or the host walls for a catio. The whole plan travels inside the link
  itself (the part after `#`), so nothing is uploaded and no account is
  needed. Allow pop-ups for app.openplan3d.com if the tab does not open.
- **Download interchange JSON** saves the same plan as
  `<Project-Name>-openplan3d.json` (spaces and punctuation in the name become
  `-`; an unnamed project saves as `plan-openplan3d.json`). Import that file
  in the other planner, or in the OpenPlan3D iPhone app, when a link is not
  practical.
- A plan with many walls or objects can be too large for a link. The editor
  then downloads the interchange JSON instead and tells you so; use the other
  planner's Import.

The file carries walls, doors, windows, furniture, room names and colours and
floor names, in metres. It does not carry stairs, columns, dimension or text
notes, measurements, guides, entourage, background images, wall colours and
textures, Item details, **Open to floor below** or floor elevations and slab
thicknesses (a plan that comes back through the file has a slab in every room
and floors 300 cm apart on 5 cm slabs). A curved wall travels as its straight
chord, a sloping wall at its taller height, and door types other than single,
double and sliding become the nearest of those. Anything a sibling planner
stored in a file you imported (its cabinets, plants, areas or structures) is
kept with your project and written back when you export, so a kitchen can go
OpenKitchen3D → OpenPlan3D → OpenKitchen3D without losing its cabinets — as
long as you keep working from this project, its **Download JSON** or a library
backup, not from a project package. OpenKitchen3D and OpenLandscape3D also
pick up walls, doors and windows you edited here. OpenCatio3D rebuilds its
house from its own stored walls, so wall edits made here do not change the
catio's host walls yet; its design itself survives the round trip. A link sent
to another planner leaves out precise site coordinates, observation positions
and photo names; the downloaded file keeps them.

If opening fails you will see **Couldn't open the other planner** with one of:

- "This plan is too large for a link, so the interchange JSON was downloaded
  instead. Use Import in the other planner."
- "This browser can't build transfer links. Download the interchange JSON and
  import it in the other planner." — an older browser without built-in
  compression.
- "The browser blocked the new tab. Allow pop-ups for this site and try again."
- "Could not build the link. Download the interchange JSON instead." — an
  unexpected error while packing the plan; the file still works.

### Where the file goes, and why a download may seem to do nothing

All exports are ordinary browser downloads started when you click a menu item;
no file is written anywhere else.

- **Chrome, Edge, Firefox (desktop):** the file goes to the browser's
  Downloads folder (or the browser asks where, if you enabled "Ask where to
  save each file"). Look for the download icon in the toolbar.
- **Safari (Mac):** the file goes to the folder set in Safari → Settings →
  General → "File download location" (Downloads by default); the arrow icon
  at the top right lists recent downloads. The first time, Safari may ask "Do
  you want to allow downloads on app.openplan3d.com?" — choose Allow. If it
  was blocked earlier, open Safari → Settings → Websites → Downloads and set
  app.openplan3d.com to Allow.
- **iPhone / iPad:** Safari shows "Do you want to download …?"; the file lands
  in the **Files** app under Downloads (iCloud Drive or On My iPhone, as set
  in Settings → Safari → Downloads). PDFs may open in a preview first; use the
  share icon to save them.
- **Android:** files go to the Downloads folder and appear in the browser's
  download list and the Files app.
- **Blocked downloads:** after the first file, browsers may block further
  automatic downloads from the same site. Chrome and Edge show a blocked-
  download icon in the address bar — click it and allow app.openplan3d.com to
  download multiple files (the same switch is under Site settings → Automatic
  downloads). Firefox and Safari show a similar prompt or a blocked-popup
  icon. Content blockers and some privacy extensions can also stop downloads;
  try with them off.
- **Embedded browsers:** the in-app browser of a chat or social app often
  cannot save files. Open the link in Safari, Chrome or Firefox instead.
- **Nothing happens and no message is shown:** check the browser's download
  list first — the file is usually there. If the Export notice says the plan is
  empty, you are on an empty floor.

## 12. Importing

Imports open a **new project**; the project you are working on is saved first
and stays in the library. If the file's internal ID clashes with an existing
project, the copy is named "… (Imported copy)". The one exception is **Add to
this plan** in the Import RoomPlan dialog, which stitches a scan into the open
project (below).

### Import JSON (Export menu)

**Export → Import JSON** accepts:

- a web project `.json` from **Download JSON** (or from a JSON backup);
- an "Export Editable Plan (JSON)" file from the OpenPlan3D iPhone app;
- an interchange file from this editor, OpenKitchen3D, OpenLandscape3D or
  OpenCatio3D (`…-openplan3d.json`; see "Plans from OpenKitchen3D,
  OpenLandscape3D and OpenCatio3D" below);
- a raw Apple RoomPlan `.json`;
- a RoomPlan `.zip` that contains exactly one `room.json`;
- a library backup (`openplan3d-library-backup.json`), which opens **Restore
  library backup** with that file instead: it lists the projects, and
  **Restore as copies** adds them to the library while the plan you are
  editing stays open.

RoomPlan files are converted to walls, doors, windows, rooms and furniture.
Files that cannot be read show "Couldn't import plan" with the reason, and
"No project was imported." — your current plan is untouched.

### Import RoomPlan (Build tab)

**Build → Import RoomPlan** ("iOS LiDAR scan (.json/.zip); add scans to one
plan") does the same as above for scans but first shows the **Import
RoomPlan** dialog:

- **Where to put it** — **Open as a new project** ("Keeps this plan and opens
  the scan as its own project"; the default) or **Add to this plan** ("Places
  the scan beside the current walls on the matching floor and selects it. Move
  or rotate it into place afterwards.")
- **Straighten walls** — "Snap near-horizontal/vertical walls to axis"
- **Enforce orthogonal** — "Force all walls to 90°/180° angles"
- **Corner merge distance (cm)**

Plans prepared in the iPhone app keep their angles by default; raw scans are
straightened by default. A ZIP that already contains an edited iPhone plan is
rejected: "This dataset contains an edited iPhone plan. On iPhone, choose Export
Editable Plan (JSON) to import its edits; the room.json in this ZIP is the
original scan."

**Stitching several scans into one plan.** Rooms scanned one at a time each
arrive in their own coordinates, so **Add to this plan** does not guess where
the new room belongs: it places the scan 100 cm to the right of everything
already on the floor, top edges aligned, on the floor whose level matches the
scan's storey (a storey the project does not have becomes a new floor named
after it). The scan keeps its rooms and their names; identifiers that clash
with the open project are re-issued, and anything a sibling planner stored in
the file (see section 11) travels with the scan. After the import the new
walls, openings and furniture are selected, the editor is back on the Select
tool, and the view zooms to fit the plan and the new scan together, so you can
drag them into place straight away and press **R** to turn the whole selection
in 15° steps. Walls turn only when every wall they touch is selected, so the
scan's loop stays closed; a single wall of a room does not move with **R**.
One **Undo** ("Added RoomPlan scan") removes the whole scan again.

To snap the scan into place instead of dragging it, right-click one of its
doors and choose **Join to another door…** (the same button sits under the
door's properties), then click the door it meets in the other room. The hint
"Click the door this one meets in the other room. Esc cancels." shows
meanwhile and the first door is marked in amber. The scan — its walls with
their doors and windows, and the furniture, notes and dimensions inside its
rooms — turns and slides as one piece until its door lies against the other
door on the far side of that wall, one wall thickness apart (the average of
the two walls' thicknesses; a scan's walls are 15 cm unless the capture says
otherwise), because each scan modelled the shared wall from its own side. The
joined scan is selected afterwards, so **R** or a drag still adjusts it. A door
of the same room is refused with "Pick a door that belongs to another room.",
doors on curved walls cannot be joined, and only walls that meet corner to
corner travel with the door's room. One **Undo** ("Joined doors") puts the
scan back where it was.

### Plans from OpenKitchen3D, OpenLandscape3D and OpenCatio3D

Those planners export "OpenPlan3D JSON" — the interchange file described in
section 11 — and OpenLandscape3D and OpenCatio3D also have an **Open in
OpenPlan3D** button that opens this editor directly with the design (you see
"Importing capture from iOS app…", then a new project), falling back to a file
download when the link cannot be made. Open a downloaded file with **Export →
Import JSON** or **Build → Import RoomPlan**; the new project takes the title
the plan had in that planner (other RoomPlan files take the file name). The
kitchen, garden or catio
arrives as walls, openings, room labels and furniture-sized objects; what the
other planner knows and this editor cannot show (cabinet runs, plants,
structures) stays attached to the project and is written back by **Download
interchange JSON** and the **Open in …** items.

### Import project package (library page or Export menu)

On the library page (or the Welcome screen) choose **Import project package**
("Bring an edited plan and its attachments from iPhone or another browser.
Files stay on this device."), then **Choose project package**. A preview shows
"3 floors · 24 walls · 5 attachment files" and any notices, for example that
"Photos, item notes and costs travel with this package and can be edited in
Item details." **Import as copy** adds it to the library; "Import creates an
independent copy. Existing projects and work in other tabs stay available."
Packages must be under 64 MiB.

In the editor, **Export → Import project package** opens the same dialog. After
**Import as copy** the plan you were editing is saved and the editor switches
to the imported copy; if it cannot be opened here, the copy is still in the
library and the reason is shown after you close the dialog.

### Tracing an image

To draw over an existing plan or sketch:

1. **Build → Import Image** ("Floor plan background") and choose an image, or
   copy an image and press **Ctrl+V** with the canvas focused (paste only
   places an image when nothing from the plan is on the internal clipboard).
   Images over 5 MB still import and show the note "Large image imported. The
   image is larger than 5 MB and may slow down the editor." under the button.
2. The image appears on the current floor at reduced opacity. Click it to open
   **Background Image** in Properties: **Opacity**, **Scale**, **Rotation**,
   **Set Scale** and **Remove Image**.
3. **Set Scale**: click two points on the image whose real distance you know,
   then answer "Enter the real-world distance between these two points (in
   cm):". The image is rescaled so the plan matches.
4. Draw walls (W) over the image. Each floor can have its own image. Images are
   saved inside the project (and in JSON exports), so very large images make
   the project large.

## 13. iPhone app handoff

The OpenPlan3D iPhone app scans a room and can hand the result to the web
editor in two ways.

**Link or QR code.** In the app, choose **Open in OpenPlan3D**. The app uploads
the plan and shows a link of the form
`https://app.openplan3d.com/editor?import=CODE` (codes use letters and digits
but never I, O, 0 or 1). Opening it shows "Importing capture from iOS app…"
and creates a new project named "Room Capture CODE" (a plan sent by
OpenLandscape3D or OpenCatio3D keeps the title it had there); the address then changes
to the project's own `?id=` link, so reloading does not import twice. The
upload is temporary: files are removed after about one day, and the app reuses
the same link for an unchanged plan for up to 24 hours, so sharing again gives
the same code until something changes. If you see "Capture code CODE was not
found. It may have expired — share it again from the iOS app.", generate a new
link in the app. The link route is limited to 1 MiB per capture.

**Files (no upload).** In the app, **Export Editable Plan (JSON)** saves a file
you can AirDrop or send to yourself and open with **Export → Import JSON** or
**Build → Import RoomPlan**. To also bring photos, notes, costs and the original
scan data, use the app's **Export Project Package (ZIP)** and the web library's
**Import project package**; packages exported from the web editor can be
imported back into the app the same way. Details of what survives the round
trip are in [project-package-v1.md](project-package-v1.md) and
[handoff-format-v1.md](handoff-format-v1.md).

## 14. Sharing with an assistant

**Export → Share with Assistant…** uploads a copy "for seven days so an
assistant such as Claude can summarize it, review its photos or build a
contractor handoff."

1. Decide whether to **Include photos** ("Photos attached to rooms and items.
   Retained original data and unattached files are never uploaded.") and read
   the notice: "The plan, notes and chosen photos go to app.openplan3d.com and
   are deleted after seven days or when you remove the share."
2. Click **Share**. You get a **Share code** and a **Secret** with **Copy**
   buttons. "Give both to the assistant when it asks. The secret is shown only
   here."
3. In Claude, add the connector once: "Settings → Connectors → Add custom
   connector → https://app.openplan3d.com/mcp", then ask for a summary, photo
   review or handoff and paste the code and secret when prompted.
4. **Remove share now** deletes the copy immediately ("The share was removed.
   The code and secret no longer work.").

A share with photos may be up to 64 MiB, without photos 16 MiB. The assistant
can only read the share; it cannot change your project. If the service is
turned off or busy you will see "Could not share this project." — try later or
send the project package file instead.

## 15. Keyboard shortcuts

Press **?** in the editor to see this list on screen (**Copy All** copies it;
**User guide** opens this page).

| Keys | Action |
| --- | --- |
| **V** | Select tool |
| **W** | Wall tool |
| **D** | Door tool (last chosen type) |
| **H** | Pan mode |
| **M** | Measure tool |
| **N** | Dimension (annotate) tool |
| **T** | Text tool |
| **S** | Switch snap step: 25 cm grid or 10 cm (status bar Snap) |
| **G** | Toggle grid |
| **F** / **Shift+F** | Zoom to fit / Fit selection |
| **+** / **−** (also **=** / **_** and the numpad keys) | Zoom in / out, 25% steps between the minimum zoom and 1000% |
| **L** | Toggle Layers panel |
| **Tab** | Toggle 2D / 3D |
| **?** | Show shortcuts |
| **Ctrl+K** or **/** | Command Palette |
| **Ctrl+P** | Print Layout |
| **Ctrl+S** | Save project |
| **Ctrl+Z** / **Ctrl+Y** (or Ctrl+Shift+Z) | Undo / Redo |
| **Ctrl+C** / **Ctrl+V** | Copy / Paste selection |
| **Ctrl+A** / **Ctrl+D** | Select all / Deselect all |
| **Esc** | Cancel the current tool, drawing or door join, deselect |
| **R** | Rotate selection (15° steps; walls included when several things are selected; also rotates the placement preview) |
| **Delete** / **Backspace** | Delete selected |
| **Ctrl+L** | Lock / Unlock |
| **Ctrl+G** / **Ctrl+Shift+G** | Group / Ungroup |
| **Mouse wheel** or pinch | Zoom |
| **Space+drag**, middle button, or Shift+drag on empty canvas | Pan |
| **Shift+click** | Add to / remove from selection |
| **Ctrl+click** | Select one member of a group |
| **Double-click** (wall tool) | Finish the wall chain |
| **C** (wall tool) | Close the wall loop |
| **Shift** (wall tool) | Lock the angle to 45° steps |
| **digits + Enter** (wall tool) | Place the wall at the typed length |
| **Alt+drag** middle handle | Curve a wall |
| **Alt+drag** end handle | Move a wall corner freely (no snapping) |
| **Shift+drag** end handle | Keep the wall on the nearest 45° step |
| **Shift** while resizing | Keep proportions |
| **WASD / arrows / mouse / Shift / Esc** (walkthrough) | Look / move / look / sprint / exit |

Shortcuts are ignored while you type in a text field, and most are disabled
while a dialog is open. **Ctrl** / **Cmd** with **+** / **−** is left to the
browser, so page zoom keeps working.

## 16. Troubleshooting

Messages are quoted as the editor shows them.

**Saving and storage**

- "Browser storage is full. Download your project as JSON, then free space by
  deleting projects you have backed up." — The browser's quota for this site is
  used up. Back up, then delete old projects or clear version history.
- "Browser storage is unavailable. Allow site storage or download your project
  as JSON." — Site data is blocked (private window, strict privacy settings,
  or "Block all cookies"). Allow storage for app.openplan3d.com, or keep
  working and save with **Download JSON**.
- Every project is gone and the library is empty ("No projects yet", or the
  **Welcome** screen as on a first visit) — The browser started without this
  site's saved data; OpenPlan3D only deletes a project when you choose
  **Delete**. Check that the address is <https://app.openplan3d.com>, that
  this is not a private window, and that the browser uses your usual
  profile: after a reinstall Firefox can start with a new profile, and
  about:profiles launches the previous one with its projects. Otherwise the
  data was cleared (a "delete on close" setting, a cleanup tool, or the
  browser freeing space; see "Persistent storage" in section 10) and only
  your own files can bring it back: **Restore library backup** reads a
  library backup, and **Import JSON** (Export menu) or **Import a Plan**
  (Welcome screen) opens a project's JSON file.
- "Could not save to browser storage. Download your project as JSON to keep a
  copy." — A general write failure; retry, and download JSON if it persists.
- "This project changed or was deleted in another tab. Save your version as a
  copy or download a JSON backup to keep both versions." — The same project
  is open twice. Use **Save as copy** here, or close the other tab.
- "Close other OpenPlan3D tabs, then retry loading to update browser storage.
  Your saved projects have not been removed." — A storage upgrade is waiting
  for other tabs to close.
- "The saved project library could not be read. Download a backup before
  attempting recovery." — Click **Download library backup** first; the raw
  data is preserved in that file and can be restored later.
- "Version history could not be read. Download a backup before clearing
  damaged versions." — Use **Download version backup**, then **Clear all
  versions** if you no longer need them.
- "These attachments would make saved versions too large to reopen. Export a
  backup, then use smaller files or remove unused attachments." — Photos and
  models share a 64 MiB budget per project; remove or shrink some.

**Importing**

- "Couldn't import plan" / "Check the file or save your current plan, then try
  again." — The file is not a project the editor can read; the text after
  "Invalid project:" names the field. Nothing was changed.
- "Unsupported manifest. Choose an OpenPlan3D project package, not a capture
  dataset or library backup." — You chose the wrong kind of file: library
  backups go to **Restore library backup**, RoomPlan ZIPs to **Import JSON** /
  **Import RoomPlan**.
- "This is a RoomPlan scan or an interchange JSON file, not a backup. Open it
  with Import JSON in the editor. No projects were restored." — **Restore
  library backup** takes library backups and project files from **Download
  JSON**; scans and `…-openplan3d.json` interchange files open with **Import
  JSON**.
- "This is a JSON file, not a project package. Open it with Restore library
  backup on the Projects page or with Import JSON in the editor." — **Import
  project package** takes only the `.zip` from **Download project package**
  (its file picker hides other files unless you switch it to all files).
- "The file must be a ZIP package under 64 MiB." / "Only regular, uncompressed
  package files are supported." / "Unsupported ZIP layout. Export a new project
  package from OpenPlan3D." — The package was re-zipped or edited by another
  program; export it again from OpenPlan3D.
- "The ZIP must contain exactly one room.json capture." — Not a RoomPlan
  dataset; use the iPhone app's Export Editable Plan (JSON) instead.
- "Pick a door that belongs to another room." — While joining scans, the
  second door you clicked is on the same run of walls as the first. Click a
  door of the other room, or press **Esc**. A door on a curved wall cannot be
  joined; the hint stays until you pick another door or press **Esc**.
- "Capture code CODE was not found. It may have expired — share it again from
  the iOS app." / "Network error while downloading the capture. Check your
  connection and try again." / "Invalid import code in URL." — Open a fresh
  link from the app; make sure the full link was copied.

**Exporting**

- "Everything on the active floor is on a hidden layer." — The exports draw
  what the 2D plan shows; show the hidden groups again under **Layers**.
  Dimensions, notes or furniture missing from an export are hidden the same
  way (see "What the 2D exports show" in section 11).
- "Couldn't export PDF" / "Couldn't export 2D PNG" with "Add walls, furniture,
  stairs, columns, entourage, notes or measurements to the active floor …" —
  The active floor is empty; switch floors.
- "Couldn't export DXF" / "Couldn't export DWG" with "A DXF can't include
  uploaded entourage symbols or entourage at 0% opacity …" — Those are all the
  active floor holds. Use Export as SVG, Export 2D as PNG or Export as PDF, or
  raise the symbol's opacity above 0%.
- "PDF exported without the 3D view" — Open the 3D view, then export again.
- "The 3D view could not be captured. Reopen the 3D view and try again." —
  The 3D canvas was not ready (or WebGL was lost); open 3D, wait, retry.
- "The plan does not fit at this scale. Choose a smaller scale, another
  orientation, or Fit to page." — Print Layout only; pick 1:100 or Landscape.
- A download never appears — see "Where the file goes" in section 11.
- "Couldn't open the other planner" — "This plan is too large for a link, so
  the interchange JSON was downloaded instead. Use Import in the other
  planner." / "This browser can't build transfer links. Download the
  interchange JSON and import it in the other planner." / "The browser blocked
  the new tab. Allow pop-ups for this site and try again." / "Could not build
  the link. Download the interchange JSON instead." — Use the downloaded
  file in the other planner, or allow pop-ups for app.openplan3d.com and try
  again.

**3D and models**

- "Loading 3D viewer…" never finishes, or "Part of the app could not load.
  Check your connection, then reload to try again." — The 3D code is
  downloaded on first use; check the connection and reload.
- "Mouse look is unavailable in this browser. Use WASD to look and arrow keys
  to move." — Pointer capture was refused (common in embedded browsers).
- "Choose a GLB file up to 16 MiB." / "Local furniture import does not support
  animations yet. Export a static mesh." / "Invalid GLB resources: Embed all
  buffers in the GLB; external and data URLs are not supported." — Re-export
  the model as a single static `.glb` with embedded textures.
- "Image too large (max 2 MB)" — Entourage symbols must be 2 MB or smaller.
- "Please add your Gemini API key in Settings → AI first." — AI Render needs
  your own key.

**General**

- "An app update is ready. Reload to use the latest version. Your project will
  be saved first." — Choose **Save and reload**; keep "Download JSON backup"
  as a fallback.
- Keys do nothing — click the canvas first; shortcuts are off while a text
  field or dialog has focus.

## 17. Getting help

The **User guide** links in the editor — in the Keyboard Shortcuts (**?**)
dialog, in the top bar's **More** menu and on the project library page — open
this page in a new tab. Report problems and ask questions at
<https://github.com/laanlabs/openPlan3D/issues>. The **Bug report** template
asks for:

- **Problem** — what you expected and what happened instead.
- **Reproduction** — start from a new project or a small fixture, the action
  and the selected tool/floor, and the incorrect result.
- **Fixture or example** — a small synthetic project JSON or package, or the
  relevant dimensions and objects; whether save/reload, Undo/Redo or an export
  changes the result. Please leave out private room scans, personal photos,
  credentials and share codes.
- **Environment** — app URL and release if known, browser and version,
  OS/device, viewport or window size and display scaling, and whether you use
  a mouse, trackpad, touch or keyboard.
- **Evidence** — screenshots, sanitized error text, or a short recording.

Before filing, try the current release in a fresh tab, and keep a **Download
JSON** of the affected project so the problem can be reproduced.
