<script lang="ts">
  import { multiSelectionBounds } from '$lib/utils/multiSelectionBounds';
  import { onMount, onDestroy } from 'svelte';
  import { get } from 'svelte/store';
  import { selectionContentBounds } from '$lib/utils/selectionContentBounds';
  import { planContentBounds, hasPlanContent } from '$lib/utils/planContentBounds';
  import { connectedWallEndpoints } from '$lib/utils/wallEditing';
  import { createDrawScheduler } from '$lib/utils/drawScheduler';
  import { activeFloor, selectedTool, selectedElementId, selectedElementIds, selectedRoomId, addWall, addDoor, addWindow, updateWall, moveWallEndpoint, updateDoor, updateWindow, addFurniture, moveFurniture, transformFurnitureDuringDrag, rotateFurniture, rotateSelection, setFurnitureRotation, scaleFurniture, removeElement, placingFurnitureId, placingRotation, placingDoorType, placingWindowType, detectedRoomsStore, duplicateDoor, duplicateWindow, duplicateFurniture, duplicateSelection, pasteSelection, moveWallParallel, splitWall, snapEnabled, placingStair, addStair, moveStair, updateStair, placingColumn, placingColumnShape, addColumn, moveColumn, updateColumn, calibrationMode, calibrationPoints, updateBackgroundImage, setBackgroundImage, canvasZoom, canvasMinimumZoom, canvasCamX, canvasCamY, panMode, showFurnitureStore, addGuide, moveGuide, removeGuide, beginUndoGroup, endUndoGroup, layerVisibility, updateRoom, addMeasurement, updateMeasurement, removeMeasurement, addAnnotation, removeAnnotation, updateAnnotation, addTextAnnotation, removeTextAnnotation, updateTextAnnotation, moveTextAnnotation, toggleFurnitureLock, toggleSelectionLock, createGroup, ungroupElements, findGroupForElement, placingEntourageId, addEntourageItem, moveEntourage, resizeEntourage, currentProject, elevationWallId, elevationPickMode } from '$lib/stores/project';
  import type { Point, Wall, Door, Window as Win, FurnitureItem, Stair, Column, GuideLine, Measurement, Annotation, TextAnnotation, CustomEntourageDef } from '$lib/models/types';
  import type { Floor, Room } from '$lib/models/types';
  import { resolveRoomGeometry, roomLabelPosition } from '$lib/utils/roomDetection';
  import { getFloorBelow } from '$lib/utils/floors';
  import { detectOuterWalls } from '$lib/utils/outerWalls';
  import { getMaterial } from '$lib/utils/materials';
  import { snapFurnitureToWalls } from '$lib/utils/furnitureGeometry';
  import { getCatalogItem, getFurnitureSize, type FurnitureDef } from '$lib/utils/furnitureCatalog';
  import { drawFurnitureIcon } from '$lib/utils/furnitureIcons';
  import { handleGlobalShortcut, isEditingField, isControlKey } from '$lib/utils/shortcuts';
  import { hasOpenModal } from '$lib/utils/modalDialog';
  import ContextMenu from './ContextMenu.svelte';
  import { roomPresets, placePreset } from '$lib/utils/roomPresets';
  import { getWallTextureCanvas, getFloorTextureCanvas, setTextureLoadCallback } from '$lib/utils/textureGenerator';
  import { projectSettings, formatLength, formatArea } from '$lib/stores/settings';
  import type { ProjectSettings } from '$lib/stores/settings';
  import { resizeFurnitureFromHandle, type CanvasState } from '$lib/utils/canvasInteraction';
  import { drawWall as _drawWall, drawDoorOnWall as _drawDoorOnWall, drawWindowOnWall as _drawWindowOnWall, drawDoorDistanceDimensions as _drawDoorDistanceDimensions, drawWindowDistanceDimensions as _drawWindowDistanceDimensions, drawFurnitureItem, drawStair as _drawStair, drawColumn as _drawColumn, drawGuides as _drawGuides, drawPersistedMeasurements as _drawPersistedMeasurements, drawTextAnnotations as _drawTextAnnotations, drawAnnotation as _drawAnnotation, drawAnnotations as _drawAnnotations, drawRooms as _drawRooms, drawWallJoints as _drawWallJoints, drawSnapPoints as _drawSnapPoints, drawMinimap as _drawMinimap, drawEntourageItems as _drawEntourageItems, drawEntourageGhost as _drawEntourageGhost, drawFloorBelowGhost as _drawFloorBelowGhost, entourageAspect } from '$lib/utils/canvasRenderer';
  import { getEntourageDef } from '$lib/utils/entourageCatalog';
  import { pointInPolygon, positionOnWall, findWallAt as _findWallAt, findHandleAt as _findHandleAt, findFurnitureAt as _findFurnitureAt, findColumnAt as _findColumnAt, findStairAt as _findStairAt, findDoorAt as _findDoorAt, findWindowAt as _findWindowAt, findRoomAt as _findRoomAt, hitTestMeasurement as _hitTestMeasurement, hitTestAnnotation as _hitTestAnnotation, hitTestTextAnnotation as _hitTestTextAnnotation, findEntourageAt } from '$lib/utils/hitTesting';

  let canvas: HTMLCanvasElement;
  let ctx: CanvasRenderingContext2D;
  let width = $state(800);
  let height = $state(600);
  let zoomControlsBottom = $state(12);

  // Camera
  let camX = $state(0);
  let camY = $state(0);
  let zoom = $state(1);
  let minimumZoom = $state(0.1);

  // Events and subscriptions coalesce into one frame; no idle polling.
  let drawing: ReturnType<typeof createDrawScheduler> | undefined;
  function markDirty() { drawing?.invalidate(); }
  function getCS(): CanvasState { return { ctx, width, height, zoom, camX, camY }; }
  // Sync zoom with shared store
  onDestroy(canvasZoom.subscribe(v => { zoom = v; }));
  $effect(() => { canvasZoom.set(zoom); });
  $effect(() => { canvasMinimumZoom.set(minimumZoom); });
  $effect(() => { canvasCamX.set(camX); });
  $effect(() => { canvasCamY.set(camY); });

  // Wall drawing state
  let wallStart: Point | null = $state(null);
  // Digits typed while drawing a wall — Enter places the wall at exactly this length (issue #6)
  let typedWallLength = $state('');
  let wallSequenceFirst: Point | null = $state(null);
  let mousePos: Point = $state({ x: 0, y: 0 });

  // Inline room name editing
  let editingRoomId: string | null = $state(null);
  let editingRoomPos: { x: number; y: number } = $state({ x: 0, y: 0 });
  let editingRoomName: string = $state('');

  // Pan state
  let isPanning = $state(false);
  let panStartX = 0;
  let panStartY = 0;
  let spaceDown = $state(false);
  let shiftDown = $state(false);

  // Furniture drag state
  let draggingFurnitureId: string | null = $state(null);
  let draggingEntourageId: string | null = $state(null);
  let resizingEntourageId: string | null = $state(null);
  let currentEntourageDefId: string | null = $state(null);
  let customEntourageDefs: CustomEntourageDef[] | undefined = $state(undefined);
  let dragOffset: Point = { x: 0, y: 0 };
  let dragStartRotation: number = 0;
  let dragWasWallSnapped: boolean = false;
  let draggingDoorId: string | null = $state(null);
  let draggingWindowId: string | null = $state(null);

  // Guide lines
  let selectedGuideId: string | null = $state(null);
  let draggingGuideId: string | null = $state(null);

  let currentTool: string = $state('select');

  // Measurement tool
  let measureStart: Point | null = $state(null);
  let measureEnd: Point | null = $state(null);
  let measuring = $derived(currentTool === 'measure');
  let selectedMeasurementId: string | null = $state(null);

  // Annotation tool (dimension annotations)
  let annotating = $derived(currentTool === 'annotate');
  let annotationStart: Point | null = $state(null);
  let selectedAnnotationId: string | null = $state(null);
  let editingDimensionId: string | null = $state(null);
  let dimensionLabel = $state('');

  function finishDimensionLabel() {
    if (editingDimensionId && dimensionLabel.trim()) {
      updateAnnotation(editingDimensionId, { label: dimensionLabel.trim() });
    }
    editingDimensionId = null;
  }

  function focusInlineEditor(node: HTMLInputElement) {
    // Placement starts on mousedown. Focus after its default canvas focus has
    // completed, and cancel pending focus when the inline editor is dismissed.
    const frame = requestAnimationFrame(() => {
      if (node.isConnected && !hasOpenModal()) node.focus({ preventScroll: true });
    });
    return { destroy: () => cancelAnimationFrame(frame) };
  }

  // Text annotation tool
  let textAnnotationMode = $state(false);
  let editingTextAnnotationId: string | null = $state(null);
  let editingTextAnnotationPos: { x: number; y: number } = $state({ x: 0, y: 0 });
  let editingTextAnnotationValue: string = $state('');
  let selectedTextAnnotationId: string | null = $state(null);
  let draggingTextAnnotationId: string | null = $state(null);
  let textAnnotationDragOffset: Point = { x: 0, y: 0 };

  // Grid toggle
  let showGrid = $state(true);

  // Ruler toggle
  let showRulers = $state(true);

  // Layer visibility toggles
  let layerVis = $state({ walls: true, doors: true, windows: true, furniture: true, stairs: true, columns: true, guides: true, measurements: true, annotations: true, entourage: true, floorBelow: true });
  // Sync showFurnitureStore ↔ layerVisibility.furniture
  let showFurniture = $derived(layerVis.furniture);
  $effect(() => { showFurnitureStore.set(layerVis.furniture); });
  let showDoors = $derived(layerVis.doors);
  let showWindows = $derived(layerVis.windows);
  let showRoomLabels = $state(true);
  let showDimensions = $state(true);
  let dimSettings: ProjectSettings = $state({
    units: 'metric', showDimensions: true, showExternalDimensions: true,
    showInternalDimensions: false, showExtensionLines: true,
    showObjectDistance: true, dimensionLineColor: '#1e293b',
    wallMeasureMode: 'centerline', snapToGrid: true, snapToWalls: true, gridSize: 25,
  });
  onDestroy(projectSettings.subscribe((s) => {
    dimSettings = s;
    showDimensions = s.showDimensions;
  }));
  let showStairs = $derived(layerVis.stairs);
  let showLayerPanel = $state(false);
  let showMinimap = $state(true);
  let minimapCanvas = $state<HTMLCanvasElement>();
  const RULER_SIZE = 24;

  // These local display controls also change outside canvas pointer handlers.
  $effect(() => {
    camX; camY; zoom;
    showGrid; showRulers; showRoomLabels; showDimensions;
    showMinimap; minimapCanvas;
    bgImage; shiftDown; dragPreview;
    markDirty();
  });

  // Detected rooms
  let detectedRooms: Room[] = $state([]);
  let roomPolygons = new Map<string, Point[]>();
  let lastWallHash = '';
  let lastRoomFloorId = '';
  // Storey directly beneath the active one, drawn as a dim reference underlay.
  let floorBelow: Floor | null = $state(null);
  // Its envelope walls. Cached because detection runs room detection, which is
  // far too costly for the per-frame redraws that dragging triggers.
  let floorBelowOuterIds = new Set<string>();
  let lastFloorBelowHash = '';

  const GRID = 20;
  const SNAP = 10;
  const MAGNETIC_SNAP = 15;
  // Store subscriptions
  let currentFloor: Floor | null = $state(null);
  let currentSelectedId: string | null = $state(null);
  let currentSelectedRoomId: string | null = $state(null);
  let currentPlacingId: string | null = $state(null);
  let currentPlacingRotation: number = $state(0);
  let currentDoorType: Door['type'] = $state('single');
  let currentWindowType: Win['type'] = $state('standard');
  let currentSnapEnabled: boolean = $state(true);
  let currentSnapToGrid: boolean = $state(true);
  let currentSnapToWalls: boolean = $state(true);
  let currentGridSize: number = $state(25);
  let isPlacingStair: boolean = $state(false);
  let draggingStairId: string | null = $state(null);
  let stairDragOffset: Point = { x: 0, y: 0 };
  let isPlacingColumn: boolean = $state(false);
  let placingColShape: 'round' | 'square' = $state('round');
  let draggingColumnId: string | null = $state(null);
  let columnDragOffset: Point = { x: 0, y: 0 };
  let isCalibrating: boolean = $state(false);
  let calPoints: Point[] = $state([]);
  let bgImage: HTMLImageElement | null = $state(null);
  let backgroundLoading = $state(false);

  // Room label drag state
  let draggingRoomLabelId: string | null = $state(null);
  let roomLabelDragStart: Point = { x: 0, y: 0 };
  let roomLabelOrigOffset: Point = { x: 0, y: 0 };
  let roomLabelDragZoom = 1;
  let roomLabelDragOffset: Point | null = null;

  // Room drag state
  let draggingRoomId: string | null = $state(null);
  let roomDragStartMouse: Point = { x: 0, y: 0 };
  let roomDragStartPositions: Map<string, { start: Point; end: Point }> = new Map();

  // Wall endpoint drag state (includes all connected walls at the corner)
  let draggingWallEndpoint: { wallId: string; endpoint: 'start' | 'end' } | null = $state(null);
  let draggingConnectedEndpoints: { wallId: string; endpoint: 'start' | 'end' }[] = $state([]);
  let dragPreview: { x: number; y: number; type: string; width: number; depth: number } | null = $state(null);

  // Resize/rotate handle drag state
  type HandleType = 'resize-tl' | 'resize-tr' | 'resize-bl' | 'resize-br' | 'resize-t' | 'resize-b' | 'resize-l' | 'resize-r' | 'rotate';
  let draggingHandle = $state<HandleType | null>(null);
  let handleOrigScale: { x: number; y: number } = { x: 1, y: 1 };
  let handleOrigRotation: number = 0;
  let handleOrigPosition: Point = { x: 0, y: 0 };
  let handleOrigBaseSize: { width: number; depth: number } = { width: 50, depth: 50 };

  // Wall parallel drag state (drag midpoint to move wall parallel)
  let draggingWallParallel: { wallId: string; startMousePos: Point; origStart: Point; origEnd: Point; origCurve?: Point; connectedStart: { wallId: string; endpoint: 'start' | 'end' }[]; connectedEnd: { wallId: string; endpoint: 'start' | 'end' }[] } | null = $state(null);

  // Curve handle drag state
  let draggingCurveHandle: string | null = $state(null); // wallId being curved

  // Wall snap state for visual feedback
  let wallSnapInfo: { wallId: string; side: 'normal' | 'anti'; wallAngle: number } | null = $state(null);

  // Door/window placement preview state
  let placementPreview: { wallId: string; position: number; type: 'door' | 'window' } | null = $state(null);

  // Marquee (drag-to-select) state
  let marqueeStart: Point | null = $state(null);
  let marqueeEnd: Point | null = $state(null);
  let currentSelectedIds: Set<string> = $state(new Set());

  // Multi-select drag state
  let draggingMultiSelect: { startMousePos: Point; origPositions: Map<string, { start?: Point; end?: Point; position?: Point }> } | null = $state(null);

  // Clipboard for copy/paste (Ctrl+C / Ctrl+V)
  let clipboard: { floor: Floor; ids: string[]; step: number; projectId: string } | null = $state.raw(null);

  // Context menu state
  let ctxMenuVisible = $state(false);
  let ctxMenuX = $state(0);
  let ctxMenuY = $state(0);
  let ctxMenuTargetType: 'furniture' | 'wall' | 'door' | 'window' | 'room' | 'canvas' | null = $state(null);
  let ctxMenuTargetId: string | null = $state(null);
  let ctxMenuWall: Wall | null = $state(null);
  let ctxMenuFurniture: FurnitureItem | null = $state(null);
  let ctxMenuRoom: Room | null = $state(null);

  function startMultiSelectionDrag(wp: Point): boolean {
    if (currentSelectedIds.size >= 2 && currentFloor) {
      const bbox = getMultiSelectBBox();
      if (bbox && wp.x >= bbox.minX && wp.x <= bbox.maxX && wp.y >= bbox.minY && wp.y <= bbox.maxY) {
        const origPositions = new Map<string, { start?: Point; end?: Point; position?: Point }>();
        for (const id of currentSelectedIds) {
          const w = currentFloor.walls.find(w => w.id === id);
          if (w) { origPositions.set(id, { start: { ...w.start }, end: { ...w.end } }); continue; }
          const note = currentFloor.textAnnotations?.find(item => item.id === id);
          if (note) { origPositions.set(id, { position: { x: note.x, y: note.y } }); continue; }
          const dimension = [...currentFloor.measurements ?? [], ...currentFloor.annotations ?? []].find(item => item.id === id);
          if (dimension) { origPositions.set(id, { start: { x: dimension.x1, y: dimension.y1 }, end: { x: dimension.x2, y: dimension.y2 } }); continue; }
          const fi = currentFloor.furniture.find(f => f.id === id);
          if (fi) { if (!fi.locked) origPositions.set(id, { position: { ...fi.position } }); continue; }
          if (currentFloor.stairs) { const st = currentFloor.stairs.find(s => s.id === id); if (st) { origPositions.set(id, { position: { ...st.position } }); continue; } }
          if (currentFloor.columns) { const col = currentFloor.columns.find(c => c.id === id); if (col) { origPositions.set(id, { position: { ...col.position } }); continue; } }
        }
        for (const item of currentFloor.entourage ?? []) {
          if (currentSelectedIds.has(item.id) && !item.locked) origPositions.set(item.id, { position: { ...item.position } });
        }
        if (origPositions.size) draggingMultiSelect = { startMousePos: { ...wp }, origPositions };
        return true;
      }
    }
    return false;
  }

  function selectAllPlanElements() {
    if (!currentFloor) return;
    const ids = new Set<string>();
    for (const items of [currentFloor.walls, currentFloor.furniture, currentFloor.doors,
      currentFloor.windows, currentFloor.stairs, currentFloor.columns, currentFloor.entourage,
      currentFloor.textAnnotations, currentFloor.measurements, currentFloor.annotations]) {
      for (const item of items ?? []) ids.add(item.id);
    }
    clearAuxiliarySelection();
    selectedRoomId.set(null);
    selectedElementIds.set(ids);
    selectedElementId.set(ids.values().next().value ?? null);
  }

  /**
   * Compute bounding box of all multi-selected elements.
   */
  function getMultiSelectBBox(): { minX: number; minY: number; maxX: number; maxY: number } | null {
    return currentFloor ? multiSelectionBounds(currentFloor, currentSelectedIds, customEntourageDefs, zoom, ctx, dimSettings.units) : null;
  }

  /**
   * Snap furniture position so its edge is flush against the nearest wall.
   * Returns adjusted position and rotation, or null if no wall is close enough.
   */
  function snapFurnitureToWall(pos: Point, furniture: FurnitureItem | FurnitureDef): { position: Point; rotation: number; wallId: string; side: 'normal' | 'anti'; wallAngle: number } | null {
    if (!currentFloor || !currentSnapToWalls) return null;

    return snapFurnitureToWalls(pos, furniture, currentFloor.walls, snap);
  }

  function snap(v: number): number {
    if (!currentSnapEnabled) return v;
    const step = currentSnapToGrid ? currentGridSize : SNAP;
    return Math.round(v / step) * step;
  }

  function screenToWorld(sx: number, sy: number): Point {
    return { x: (sx - width / 2) / zoom + camX, y: (sy - height / 2) / zoom + camY };
  }

  function worldToScreen(wx: number, wy: number): { x: number; y: number } {
    return { x: (wx - camX) * zoom + width / 2, y: (wy - camY) * zoom + height / 2 };
  }

  /** Find all other wall endpoints that share the same point (within tolerance) */
  function findConnectedEndpoints(pt: Point, excludeWallId: string): { wallId: string; endpoint: 'start' | 'end' }[] {
    return currentFloor ? connectedWallEndpoints(currentFloor.walls, pt, excludeWallId) : [];
  }

  function magneticSnap(p: Point, excludeWallIds?: Set<string>): Point & { snappedToEndpoint?: boolean; snappedToWall?: boolean; snappedWallId?: string } {
    if (!currentFloor) return { x: snap(p.x), y: snap(p.y) };
    let best: Point & { snappedToEndpoint?: boolean; snappedToWall?: boolean; snappedWallId?: string } = { x: snap(p.x), y: snap(p.y) };
    let bestDist = MAGNETIC_SNAP / zoom;
    // First pass: snap to endpoints (highest priority)
    for (const w of currentFloor.walls) {
      if (excludeWallIds && excludeWallIds.has(w.id)) continue;
      for (const ep of [w.start, w.end]) {
        const d = Math.hypot(p.x - ep.x, p.y - ep.y);
        if (d < bestDist) {
          bestDist = d;
          best = { x: ep.x, y: ep.y, snappedToEndpoint: true };
        }
      }
    }
    // Second pass: snap to nearest point on wall segments (lower priority, only if no endpoint snap)
    if (!best.snappedToEndpoint) {
      const wallSnapThreshold = (MAGNETIC_SNAP + 10) / zoom;
      let bestWallDist = wallSnapThreshold;
      for (const w of currentFloor.walls) {
        if (excludeWallIds && excludeWallIds.has(w.id)) continue;
        const wx = w.end.x - w.start.x;
        const wy = w.end.y - w.start.y;
        const wLen = Math.hypot(wx, wy);
        if (wLen < 1) continue;
        // Project p onto the wall segment
        const t = ((p.x - w.start.x) * wx + (p.y - w.start.y) * wy) / (wLen * wLen);
        if (t < 0.02 || t > 0.98) continue; // skip near endpoints (already handled)
        const projX = w.start.x + wx * t;
        const projY = w.start.y + wy * t;
        const d = Math.hypot(p.x - projX, p.y - projY);
        if (d < bestWallDist) {
          bestWallDist = d;
          best = { x: projX, y: projY, snappedToWall: true, snappedWallId: w.id };
        }
      }
    }
    return best;
  }

  function angleSnap(start: Point, end: Point): Point {
    if (!currentSnapEnabled) return end;
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const len = Math.hypot(dx, dy);
    if (len < 5) return end;
    const angle = Math.atan2(dy, dx);
    const snapAngles = [0, Math.PI / 4, Math.PI / 2, 3 * Math.PI / 4, Math.PI, -Math.PI, -3 * Math.PI / 4, -Math.PI / 2, -Math.PI / 4];
    const ANGLE_THRESHOLD = Math.PI / 18;
    for (const sa of snapAngles) {
      if (Math.abs(angle - sa) < ANGLE_THRESHOLD) {
        return { x: start.x + len * Math.cos(sa), y: start.y + len * Math.sin(sa) };
      }
    }
    return end;
  }

  function resize() {
    const parent = canvas?.parentElement;
    if (!parent) return;
    width = parent.clientWidth;
    height = parent.clientHeight;
    if (canvas) {
      canvas.width = width;
      canvas.height = height;
    }
    markDirty();
  }

  function drawGrid() {
    if (!ctx || !showGrid) return;
    const step = (currentSnapToGrid ? currentGridSize : GRID) * zoom;
    if (step < 4) return;

    // Minor grid
    ctx.strokeStyle = '#e8eaed';
    ctx.lineWidth = 0.5;
    const offX = (width / 2 - camX * zoom) % step;
    const offY = (height / 2 - camY * zoom) % step;
    for (let x = offX; x < width; x += step) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, height); ctx.stroke();
    }
    for (let y = offY; y < height; y += step) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(width, y); ctx.stroke();
    }

    // Major grid (every 100cm / 1m)
    const majorStep = 100 * zoom;
    if (majorStep >= 20) {
      ctx.strokeStyle = '#d1d5db';
      ctx.lineWidth = 0.8;
      const mOffX = (width / 2 - camX * zoom) % majorStep;
      const mOffY = (height / 2 - camY * zoom) % majorStep;
      for (let x = mOffX; x < width; x += majorStep) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, height); ctx.stroke();
      }
      for (let y = mOffY; y < height; y += majorStep) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(width, y); ctx.stroke();
      }
    }
  }

  function wallLength(w: Wall): number {
    if (w.curvePoint) {
      // Approximate quadratic bezier length with 20 segments
      let len = 0;
      const N = 20;
      let px = w.start.x, py = w.start.y;
      for (let i = 1; i <= N; i++) {
        const t = i / N;
        const mt = 1 - t;
        const nx = mt * mt * w.start.x + 2 * mt * t * w.curvePoint.x + t * t * w.end.x;
        const ny = mt * mt * w.start.y + 2 * mt * t * w.curvePoint.y + t * t * w.end.y;
        len += Math.hypot(nx - px, ny - py);
        px = nx; py = ny;
      }
      return len;
    }
    return Math.hypot(w.end.x - w.start.x, w.end.y - w.start.y);
  }

  /** Get point on wall at parameter t (0-1), handling curves */
  function wallPointAt(w: Wall, t: number): Point {
    if (w.curvePoint) {
      const mt = 1 - t;
      return {
        x: mt * mt * w.start.x + 2 * mt * t * w.curvePoint.x + t * t * w.end.x,
        y: mt * mt * w.start.y + 2 * mt * t * w.curvePoint.y + t * t * w.end.y,
      };
    }
    return {
      x: w.start.x + (w.end.x - w.start.x) * t,
      y: w.start.y + (w.end.y - w.start.y) * t,
    };
  }

  /** Get tangent direction at parameter t on wall */
  function wallTangentAt(w: Wall, t: number): Point {
    if (w.curvePoint) {
      const mt = 1 - t;
      const dx = 2 * mt * (w.curvePoint.x - w.start.x) + 2 * t * (w.end.x - w.curvePoint.x);
      const dy = 2 * mt * (w.curvePoint.y - w.start.y) + 2 * t * (w.end.y - w.curvePoint.y);
      const len = Math.hypot(dx, dy) || 1;
      return { x: dx / len, y: dy / len };
    }
    const dx = w.end.x - w.start.x;
    const dy = w.end.y - w.start.y;
    const len = Math.hypot(dx, dy) || 1;
    return { x: dx / len, y: dy / len };
  }

  function wallThicknessScreen(w: Wall): number {
    return Math.max(w.thickness * zoom, 4);
  }


  // ── Delegating wrappers to extracted modules ──────────────────────────

  function drawDoorDistanceDimensions(wall: Wall, door: Door) {
    _drawDoorDistanceDimensions(getCS(), wall, door, dimSettings);
  }

  function drawWindowDistanceDimensions(wall: Wall, window: Win) {
    _drawWindowDistanceDimensions(getCS(), wall, window, dimSettings);
  }

  function drawWall(w: Wall, selected: boolean) {
    _drawWall(getCS(), w, selected, showDimensions, dimSettings, currentFloor?.walls);
  }

  function drawDoorOnWall(wall: Wall, door: Door) {
    _drawDoorOnWall(getCS(), wall, door);
  }

  function drawWindowOnWall(wall: Wall, win: Win) {
    _drawWindowOnWall(getCS(), wall, win);
  }

  function drawFurniture(item: FurnitureItem, selected: boolean) {
    drawFurnitureItem(getCS(), item, selected);
  }

  // Track wall snap during placement preview
  let placementWallSnap: { position: Point; rotation: number; wallId: string } | null = $state(null);

  function drawFurniturePreview() {
    if (!currentPlacingId) return;
    const cat = getCatalogItem(currentPlacingId);
    if (!cat) return;

    const wallSnap = snapFurnitureToWall(mousePos, cat);
    placementWallSnap = wallSnap;

    const pos = wallSnap ? wallSnap.position : mousePos;
    const rot = wallSnap ? wallSnap.rotation : currentPlacingRotation;

    const s = worldToScreen(pos.x, pos.y);
    const w = cat.width * zoom;
    const d = cat.depth * zoom;
    const angle = (rot * Math.PI) / 180;

    if (wallSnap && currentFloor) {
      const snapWall = currentFloor.walls.find(wl => wl.id === wallSnap.wallId);
      if (snapWall) {
        const ws = worldToScreen(snapWall.start.x, snapWall.start.y);
        const we = worldToScreen(snapWall.end.x, snapWall.end.y);
        ctx.strokeStyle = '#3b82f6';
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 3]);
        ctx.beginPath();
        ctx.moveTo(ws.x, ws.y);
        ctx.lineTo(we.x, we.y);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }

    ctx.save();
    ctx.translate(s.x, s.y);
    ctx.rotate(angle);
    ctx.globalAlpha = 0.5;
    drawFurnitureIcon(ctx, currentPlacingId, w, d, cat.color, cat.color);
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  function drawPlacementPreview() {
    if (!placementPreview || !currentFloor) return;
    const wall = currentFloor.walls.find(w => w.id === placementPreview!.wallId);
    if (!wall) return;
    const t = placementPreview.position;
    const wpt = wallPointAt(wall, t);
    const s = worldToScreen(wpt.x, wpt.y);
    const tan = wallTangentAt(wall, t);
    const ux = tan.x, uy = tan.y;
    const nx = -uy, ny = ux;
    const isDoor = placementPreview.type === 'door';
    const doorWidths: Record<string, number> = {
      single: 90, double: 150, sliding: 180, french: 150,
      pocket: 90, bifold: 180, opening: 100, garage: 240,
    };
    const itemWidth = isDoor ? (doorWidths[currentDoorType] ?? 90) : 120;
    const halfW = (itemWidth / 2) * zoom;
    const thickness = Math.max(wall.thickness * zoom, 4);

    ctx.save();
    ctx.globalAlpha = 0.5;

    ctx.fillStyle = '#fafafa';
    const gux = ux * halfW, guy = uy * halfW;
    const gnx = nx * (thickness / 2 + 1), gny = ny * (thickness / 2 + 1);
    ctx.beginPath();
    ctx.moveTo(s.x - gux + gnx, s.y - guy + gny);
    ctx.lineTo(s.x + gux + gnx, s.y + guy + gny);
    ctx.lineTo(s.x + gux - gnx, s.y + guy - gny);
    ctx.lineTo(s.x - gux - gnx, s.y - guy - gny);
    ctx.closePath();
    ctx.fill();

    if (isDoor) {
      // Openings and garage doors have no swing — show the gap and a panel line
      const noSwing = currentDoorType === 'opening' || currentDoorType === 'garage';
      if (!noSwing) {
        const wallAngle = Math.atan2(uy, ux);
        const r = itemWidth * zoom;
        const hingeX = s.x - ux * halfW;
        const hingeY = s.y - uy * halfW;
        const startAngle = wallAngle + Math.PI;
        const endAngle = startAngle + Math.PI / 2;
        ctx.strokeStyle = '#3b82f6';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(hingeX, hingeY, r, Math.min(startAngle, endAngle), Math.max(startAngle, endAngle));
        ctx.stroke();
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(hingeX, hingeY);
        ctx.lineTo(hingeX + r * Math.cos(endAngle), hingeY + r * Math.sin(endAngle));
        ctx.stroke();
      } else if (currentDoorType === 'garage') {
        ctx.strokeStyle = '#3b82f6';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(s.x - ux * halfW, s.y - uy * halfW);
        ctx.lineTo(s.x + ux * halfW, s.y + uy * halfW);
        ctx.stroke();
      }
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = '#3b82f6';
      const jamb = thickness / 2 + 2;
      for (const sign of [-1, 1]) {
        const jx = s.x + ux * halfW * sign;
        const jy = s.y + uy * halfW * sign;
        ctx.beginPath();
        ctx.moveTo(jx + nx * jamb, jy + ny * jamb);
        ctx.lineTo(jx - nx * jamb, jy - ny * jamb);
        ctx.stroke();
      }
    } else {
      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 2;
      for (const off of [-2, 0, 2]) {
        const ox = nx * off, oy = ny * off;
        ctx.beginPath();
        ctx.moveTo(s.x - ux * halfW + ox, s.y - uy * halfW + oy);
        ctx.lineTo(s.x + ux * halfW + ox, s.y + uy * halfW + oy);
        ctx.stroke();
      }
    }

    ctx.globalAlpha = 1;

    ctx.font = 'bold 11px system-ui, sans-serif';
    const text = isDoor ? 'Click to place door' : 'Click to place window';
    const tm = ctx.measureText(text);
    const tx = s.x, ty = s.y - thickness / 2 - 24;
    const pw = tm.width + 12, ph = 20;
    ctx.fillStyle = '#1e293b';
    ctx.beginPath();
    ctx.roundRect(tx - pw / 2, ty - ph / 2, pw, ph, 4);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(tx - 5, ty + ph / 2);
    ctx.lineTo(tx + 5, ty + ph / 2);
    ctx.lineTo(tx, ty + ph / 2 + 5);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, tx, ty);

    ctx.restore();

    const ws = worldToScreen(wall.start.x, wall.start.y);
    const we = worldToScreen(wall.end.x, wall.end.y);
    ctx.strokeStyle = '#3b82f680';
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 3]);
    ctx.beginPath();
    ctx.moveTo(ws.x, ws.y);
    ctx.lineTo(we.x, we.y);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  function drawAlignmentGuides(item: FurnitureItem) {
    if (!currentFloor) return;
    const threshold = 5;
    for (const other of currentFloor.furniture) {
      if (other.id === item.id) continue;
      const s1 = worldToScreen(item.position.x, item.position.y);
      const s2 = worldToScreen(other.position.x, other.position.y);
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 0.5;
      ctx.setLineDash([4, 4]);
      if (Math.abs(item.position.x - other.position.x) < threshold) {
        ctx.beginPath(); ctx.moveTo(s1.x, 0); ctx.lineTo(s1.x, height); ctx.stroke();
      }
      if (Math.abs(item.position.y - other.position.y) < threshold) {
        ctx.beginPath(); ctx.moveTo(0, s1.y); ctx.lineTo(width, s1.y); ctx.stroke();
      }
      ctx.setLineDash([]);
    }
  }

  function drawMeasurement() {
    if (!measureStart) return;
    const end = measureEnd ?? mousePos;
    const s = worldToScreen(measureStart.x, measureStart.y);
    const e = worldToScreen(end.x, end.y);
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([6, 3]);
    ctx.beginPath(); ctx.moveTo(s.x, s.y); ctx.lineTo(e.x, e.y); ctx.stroke();
    ctx.setLineDash([]);

    for (const p of [s, e]) {
      ctx.fillStyle = '#ef4444';
      ctx.beginPath(); ctx.arc(p.x, p.y, 3, 0, Math.PI * 2); ctx.fill();
    }

    const dist = Math.hypot(end.x - measureStart.x, end.y - measureStart.y);
    const mx = (s.x + e.x) / 2;
    const my = (s.y + e.y) / 2;
    ctx.fillStyle = '#ef4444';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText(formatLength(dist, dimSettings.units), mx, my - 6);
  }

  function drawPersistedMeasurements(floor: Floor) {
    _drawPersistedMeasurements(getCS(), floor, selectedMeasurementId, dimSettings);
  }

  function hitTestMeasurement(wp: Point, floor: Floor): string | null {
    return _hitTestMeasurement(wp, floor, zoom);
  }

  function drawAnnotation(a: Annotation, selected: boolean) {
    _drawAnnotation(getCS(), a, selected, dimSettings);
  }

  function drawAnnotations(floor: Floor) {
    _drawAnnotations(getCS(), floor, selectedAnnotationId, dimSettings);
  }

  function drawAnnotationPreview() {
    if (!annotationStart) return;
    const end = mousePos;
    const offset = 40;
    const dx = end.x - annotationStart.x, dy = end.y - annotationStart.y;
    const len = Math.hypot(dx, dy);
    if (len < 1) return;

    const ux = dx / len, uy = dy / len;
    const nx = -uy, ny = ux;

    const d1x = annotationStart.x + nx * offset, d1y = annotationStart.y + ny * offset;
    const d2x = end.x + nx * offset, d2y = end.y + ny * offset;

    const s1 = worldToScreen(annotationStart.x, annotationStart.y);
    const s2 = worldToScreen(end.x, end.y);
    const sd1 = worldToScreen(d1x, d1y);
    const sd2 = worldToScreen(d2x, d2y);

    const color = '#6366f180';

    ctx.strokeStyle = color;
    ctx.lineWidth = 0.75;
    ctx.beginPath();
    ctx.moveTo(s1.x, s1.y);
    ctx.lineTo(sd1.x, sd1.y);
    ctx.moveTo(s2.x, s2.y);
    ctx.lineTo(sd2.x, sd2.y);
    ctx.stroke();

    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(sd1.x, sd1.y);
    ctx.lineTo(sd2.x, sd2.y);
    ctx.stroke();

    const dist = Math.hypot(end.x - annotationStart.x, end.y - annotationStart.y);
    const dimMx = (sd1.x + sd2.x) / 2;
    const dimMy = (sd1.y + sd2.y) / 2;
    ctx.fillStyle = '#6366f1';
    const fontSize = Math.max(10, 11 * zoom);
    ctx.font = `${fontSize}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(formatLength(dist, dimSettings.units), dimMx, dimMy - 8);

    for (const p of [s1, s2]) {
      ctx.fillStyle = '#6366f1';
      ctx.beginPath();
      ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function hitTestAnnotation(wp: Point, floor: Floor): string | null {
    return _hitTestAnnotation(wp, floor, zoom);
  }

  function drawTextAnnotations(floor: Floor) {
    _drawTextAnnotations(getCS(), floor, selectedTextAnnotationId, currentSelectedId);
  }

  function hitTestTextAnnotation(wp: Point, floor: Floor): string | null {
    return _hitTestTextAnnotation(wp, floor, ctx, zoom);
  }

  function drawWallJoints(floor: Floor, selId: string | null) {
    _drawWallJoints(getCS(), floor, selId);
  }

  function drawSnapPoints() {
    if (!currentFloor) return;
    _drawSnapPoints(getCS(), currentFloor, showGrid);
  }

  function drawRooms() {
    if (!currentFloor) return;
    _drawRooms(getCS(), currentFloor, detectedRooms, currentSelectedRoomId, showRoomLabels, showDimensions, dimSettings, roomPolygons);
  }

  function drawAngleGuides(start: Point) {
    const s = worldToScreen(start.x, start.y);
    ctx.strokeStyle = '#3b82f640';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    const guideLen = 200;
    const angles = [0, Math.PI / 4, Math.PI / 2, 3 * Math.PI / 4, Math.PI, -3 * Math.PI / 4, -Math.PI / 2, -Math.PI / 4];
    for (const a of angles) {
      ctx.beginPath(); ctx.moveTo(s.x, s.y);
      ctx.lineTo(s.x + guideLen * Math.cos(a), s.y + guideLen * Math.sin(a));
      ctx.stroke();
    }
    ctx.setLineDash([]);
  }

  /** Envelope wall ids for the ghost underlay, recomputed only when its geometry changes. */
  function getFloorBelowOuterIds(floor: Floor): Set<string> {
    const hash = floor.id + JSON.stringify(floor.walls.map(w => [w.id, w.start, w.end]));
    if (hash !== lastFloorBelowHash) {
      lastFloorBelowHash = hash;
      floorBelowOuterIds = detectOuterWalls(floor.walls);
    }
    return floorBelowOuterIds;
  }

  function updateDetectedRooms() {
    if (!currentFloor) {
      detectedRooms = [];
      roomPolygons = new Map();
      lastWallHash = '';
      lastRoomFloorId = '';
      detectedRoomsStore.set([]);
      return;
    }
    const hash = currentFloor.id + JSON.stringify([currentFloor.walls, currentFloor.rooms]);
    if (hash === lastWallHash) return;
    lastWallHash = hash;
    const previous = lastRoomFloorId === currentFloor.id ? detectedRooms : [];
    const geometry = resolveRoomGeometry(currentFloor, previous);
    const newRooms = geometry.map(item => item.room);
    roomPolygons = new Map(geometry.map(({ room, polygon }) => [room.id, polygon]));
    lastRoomFloorId = currentFloor.id;
    detectedRooms = newRooms;
    detectedRoomsStore.set(newRooms);
  }

  function drawGuides() {
    if (!currentFloor) return;
    _drawGuides(getCS(), currentFloor, selectedGuideId, RULER_SIZE);
  }

  function drawStair(stair: Stair, selected: boolean) {
    _drawStair(getCS(), stair, selected);
  }

  function drawColumn(col: Column, selected: boolean) {
    _drawColumn(getCS(), col, selected);
  }

  function rulerLabel(worldCm: number, tickStep: number, isImperial: boolean): string {
    if (isImperial) {
      const inches = worldCm / 2.54;
      const ft = inches / 12;
      if (tickStep / 2.54 >= 12) {
        // Show feet
        return `${ft % 1 === 0 ? ft.toFixed(0) : ft.toFixed(1)}'`;
      }
      return `${Math.round(inches)}"`;
    }
    // Metric
    if (tickStep >= 100) {
      const m = worldCm / 100;
      return `${worldCm % 100 === 0 ? m.toFixed(0) : m.toFixed(1)}m`;
    }
    return `${Math.round(worldCm)}`;
  }

  function drawRulers() {
    if (!ctx || !showRulers) return;
    const R = RULER_SIZE;
    const fontSize = 9;
    const isImperial = dimSettings.units === 'imperial';
    ctx.save();

    // Determine tick spacing based on zoom
    // For imperial: use inch-friendly steps (in cm equivalents)
    // For metric: use cm-friendly steps
    let tickStep: number;
    let minorDiv: number;
    let minorStep: number;

    if (isImperial) {
      // Nice steps in inches, stored as cm: 1in, 2in, 6in, 1ft, 2ft, 5ft, 10ft, 20ft, 50ft, 100ft
      const inchCm = 2.54;
      const niceInchSteps = [1, 2, 6, 12, 24, 60, 120, 240, 600, 1200, 2400];
      const niceStepsCm = niceInchSteps.map(i => i * inchCm);
      tickStep = niceStepsCm[niceStepsCm.length - 1];
      for (const s of niceStepsCm) {
        if (s * zoom >= 40) { tickStep = s; break; }
      }
      const tickInches = tickStep / inchCm;
      // Minor divisions: if >= 1ft, divide by 6 (every 2in); else divide by 2
      minorDiv = tickInches >= 12 ? 6 : tickInches >= 6 ? 3 : 2;
      minorStep = tickStep / minorDiv;
    } else {
      const niceSteps = [1, 2, 5, 10, 20, 50, 100, 200, 500, 1000, 2000, 5000];
      tickStep = niceSteps[niceSteps.length - 1];
      for (const s of niceSteps) {
        if (s * zoom >= 40) { tickStep = s; break; }
      }
      minorDiv = tickStep >= 100 ? 5 : tickStep >= 10 ? 5 : 2;
      minorStep = tickStep / minorDiv;
    }

    // Extend the largest preset at low fitted zooms, keeping tick counts bounded.
    if (tickStep * zoom < 40) {
      tickStep *= 10 ** Math.ceil(Math.log10(40 / (tickStep * zoom)));
      minorStep = tickStep / minorDiv;
    }

    // --- Horizontal ruler (top) ---
    ctx.fillStyle = '#f1f3f5';
    ctx.fillRect(R, 0, width - R, R);
    ctx.strokeStyle = '#d1d5db';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(R, R); ctx.lineTo(width, R); ctx.stroke();

    // Ticks
    const worldLeft = screenToWorld(R, 0).x;
    const worldRight = screenToWorld(width, 0).x;
    const startTick = Math.floor(worldLeft / minorStep) * minorStep;

    ctx.fillStyle = '#6b7280';
    ctx.font = `${fontSize}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';

    for (let wx = startTick; wx <= worldRight; wx += minorStep) {
      const sx = worldToScreen(wx, 0).x;
      if (sx < R) continue;
      const isMajor = Math.abs(wx % tickStep) < 0.01;
      const isMid = !isMajor && Math.abs(wx % (tickStep / 2)) < 0.01 && minorDiv >= 4;
      const tickH = isMajor ? R * 0.7 : isMid ? R * 0.45 : R * 0.25;

      // Highlight origin tick
      const isOrigin = Math.abs(wx) < 0.01;
      ctx.strokeStyle = isOrigin ? '#ef4444' : isMajor ? '#9ca3af' : '#d1d5db';
      ctx.lineWidth = isOrigin ? 1.5 : isMajor ? 1 : 0.5;
      ctx.beginPath();
      ctx.moveTo(sx, R);
      ctx.lineTo(sx, R - tickH);
      ctx.stroke();

      if (isMajor) {
        ctx.fillStyle = isOrigin ? '#ef4444' : '#6b7280';
        const label = isOrigin ? '0' : rulerLabel(wx, tickStep, isImperial);
        ctx.fillText(label, sx, 2);
        ctx.fillStyle = '#6b7280';
      }
    }

    // --- Vertical ruler (left) ---
    ctx.fillStyle = '#f1f3f5';
    ctx.fillRect(0, R, R, height - R);
    ctx.strokeStyle = '#d1d5db';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(R, R); ctx.lineTo(R, height); ctx.stroke();

    const worldTop = screenToWorld(0, R).y;
    const worldBottom = screenToWorld(0, height).y;
    const startTickY = Math.floor(worldTop / minorStep) * minorStep;

    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';

    for (let wy = startTickY; wy <= worldBottom; wy += minorStep) {
      const sy = worldToScreen(0, wy).y;
      if (sy < R) continue;
      const isMajor = Math.abs(wy % tickStep) < 0.01;
      const isMid = !isMajor && Math.abs(wy % (tickStep / 2)) < 0.01 && minorDiv >= 4;
      const tickH = isMajor ? R * 0.7 : isMid ? R * 0.45 : R * 0.25;

      const isOrigin = Math.abs(wy) < 0.01;
      ctx.strokeStyle = isOrigin ? '#ef4444' : isMajor ? '#9ca3af' : '#d1d5db';
      ctx.lineWidth = isOrigin ? 1.5 : isMajor ? 1 : 0.5;
      ctx.beginPath();
      ctx.moveTo(R, sy);
      ctx.lineTo(R - tickH, sy);
      ctx.stroke();

      if (isMajor) {
        const label = isOrigin ? '0' : rulerLabel(wy, tickStep, isImperial);
        ctx.save();
        ctx.translate(R - 3, sy);
        ctx.rotate(-Math.PI / 2);
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.fillStyle = isOrigin ? '#ef4444' : '#6b7280';
        ctx.font = `${fontSize}px sans-serif`;
        ctx.fillText(label, 0, 0);
        ctx.restore();
      }
    }

    // Corner square with origin marker
    ctx.fillStyle = '#e5e7eb';
    ctx.fillRect(0, 0, R, R);
    ctx.strokeStyle = '#d1d5db';
    ctx.lineWidth = 1;
    ctx.strokeRect(0, 0, R, R);
    // Origin crosshair in corner
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 1;
    const cx = R / 2, cy = R / 2;
    ctx.beginPath();
    ctx.moveTo(cx - 4, cy); ctx.lineTo(cx + 4, cy);
    ctx.moveTo(cx, cy - 4); ctx.lineTo(cx, cy + 4);
    ctx.stroke();

    // Mouse position indicators on rulers — thin line + triangle
    const mScreen = worldToScreen(mousePos.x, mousePos.y);

    // Horizontal: thin tracking line spanning ruler height
    if (mScreen.x > R) {
      ctx.strokeStyle = 'rgba(59,130,246,0.5)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(mScreen.x, 0);
      ctx.lineTo(mScreen.x, R);
      ctx.stroke();
      // Triangle indicator
      ctx.fillStyle = '#3b82f6';
      ctx.beginPath();
      ctx.moveTo(mScreen.x, R);
      ctx.lineTo(mScreen.x - 3, R - 6);
      ctx.lineTo(mScreen.x + 3, R - 6);
      ctx.closePath();
      ctx.fill();
    }

    // Vertical: thin tracking line spanning ruler width
    if (mScreen.y > R) {
      ctx.strokeStyle = 'rgba(59,130,246,0.5)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, mScreen.y);
      ctx.lineTo(R, mScreen.y);
      ctx.stroke();
      // Triangle indicator
      ctx.fillStyle = '#3b82f6';
      ctx.beginPath();
      ctx.moveTo(R, mScreen.y);
      ctx.lineTo(R - 6, mScreen.y - 3);
      ctx.lineTo(R - 6, mScreen.y + 3);
      ctx.closePath();
      ctx.fill();
    }

    ctx.restore();
  }

  function drawBackgroundImage() {
    if (!bgImage || !currentFloor?.backgroundImage) return;
    const bg = currentFloor.backgroundImage;
    const s = worldToScreen(bg.position.x, bg.position.y);
    ctx.save();
    ctx.globalAlpha = bg.opacity;
    ctx.translate(s.x, s.y);
    ctx.rotate(bg.rotation * Math.PI / 180);
    const sw = bgImage.width * bg.scale * zoom;
    const sh = bgImage.height * bg.scale * zoom;
    ctx.drawImage(bgImage, -sw / 2, -sh / 2, sw, sh);
    ctx.restore();
  }


  function draw() {
    if (canvas) updateZoomControlsPosition();
    if (!ctx) return;
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = '#f8f9fa';
    ctx.fillRect(0, 0, width, height);
    drawGrid();
    if (layerVis.guides) drawGuides();
    drawBackgroundImage();

    const floor = currentFloor;
    if (!floor) return;
    updateDetectedRooms();
    const selId = currentSelectedId;
    const multiIds = currentSelectedIds;
    function isSelected(id: string) { return id === selId || multiIds.has(id); }

    drawRooms();
    // Above the room fills, below this floor's own walls. Room floor textures
    // are opaque, so an underlay drawn before them vanishes the moment the
    // storey encloses a room — which is immediately, now that a new floor
    // starts from the envelope below.
    if (layerVis.floorBelow && floorBelow) {
      _drawFloorBelowGhost(getCS(), floorBelow, getFloorBelowOuterIds(floorBelow));
    }
    drawSnapPoints();

    if (layerVis.walls) {
      for (const w of floor.walls) drawWall(w, isSelected(w.id));
      drawWallJoints(floor, selId);
    }

    if (showDoors) {
      for (const d of floor.doors) {
        const wall = floor.walls.find((w) => w.id === d.wallId);
        if (wall) {
          drawDoorOnWall(wall, d);
          if (isSelected(d.id)) {
            // Selection highlight box
            const t = d.position;
            const wpt = wallPointAt(wall, t);
            const sp = worldToScreen(wpt.x, wpt.y);
            const hw = (d.width / 2) * zoom + 4;
            const hh = (wall.thickness / 2) * zoom + 8;
            const angle = Math.atan2(wall.end.y - wall.start.y, wall.end.x - wall.start.x);
            ctx.save();
            ctx.translate(sp.x, sp.y);
            ctx.rotate(angle);
            ctx.strokeStyle = '#3b82f6';
            ctx.lineWidth = 1.5;
            ctx.setLineDash([4, 3]);
            ctx.strokeRect(-hw, -hh, hw * 2, hh * 2);
            ctx.setLineDash([]);
            ctx.restore();
          }
          if (showDimensions && isSelected(d.id)) drawDoorDistanceDimensions(wall, d);
        }
      }
    }
    if (showWindows) {
      for (const win of floor.windows) {
        const wall = floor.walls.find((w) => w.id === win.wallId);
        if (wall) {
          drawWindowOnWall(wall, win);
          if (isSelected(win.id)) {
            const t = win.position;
            const wpt = wallPointAt(wall, t);
            const sp = worldToScreen(wpt.x, wpt.y);
            const hw = (win.width / 2) * zoom + 4;
            const hh = (wall.thickness / 2) * zoom + 8;
            const angle = Math.atan2(wall.end.y - wall.start.y, wall.end.x - wall.start.x);
            ctx.save();
            ctx.translate(sp.x, sp.y);
            ctx.rotate(angle);
            ctx.strokeStyle = '#3b82f6';
            ctx.lineWidth = 1.5;
            ctx.setLineDash([4, 3]);
            ctx.strokeRect(-hw, -hh, hw * 2, hh * 2);
            ctx.setLineDash([]);
            ctx.restore();
          }
          if (showDimensions && isSelected(win.id)) drawWindowDistanceDimensions(wall, win);
        }
      }
    }

    // Entourage (2D presentation symbols) — under furniture
    if (layerVis.entourage) {
      _drawEntourageItems(getCS(), floor, currentSelectedId, customEntourageDefs, markDirty);
    }

    // Furniture
    if (showFurniture) {
      for (const fi of floor.furniture) {
        const selected = isSelected(fi.id);
        if (selected && draggingFurnitureId === fi.id) drawAlignmentGuides(fi);
        drawFurniture(fi, selected);
      }
    }

    // Object distance dimensions (from selected furniture to room boundaries)
    if (showDimensions && dimSettings.showObjectDistance && currentSelectedId && showFurniture) {
      const selFurniture = floor.furniture.find(f => f.id === currentSelectedId);
      if (selFurniture) {
        const cat = getCatalogItem(selFurniture.catalogId);
        if (cat) {
          const fw = (selFurniture.width ?? cat.width) * Math.abs(selFurniture.scale?.x ?? 1);
          const fd = (selFurniture.depth ?? cat.depth) * Math.abs(selFurniture.scale?.y ?? 1);
          const fx = selFurniture.position.x;
          const fy = selFurniture.position.y;
          // AABB edges of the furniture (ignoring rotation for simplicity)
          const fLeft = fx - fw / 2;
          const fRight = fx + fw / 2;
          const fTop = fy - fd / 2;
          const fBottom = fy + fd / 2;
          
          // Find which room the furniture is in
          let furnitureRoom: Room | null = null;
          for (const room of detectedRooms) {
            const poly = (roomPolygons.get(room.id) ?? []);
            if (pointInPolygon(selFurniture.position, poly)) {
              furnitureRoom = room;
              break;
            }
          }
          
          // Collect all dimension lines (wall + furniture distances)
          type DimLine = { label: string; from: Point; to: Point; color: string; dir: 'left' | 'right' | 'top' | 'bottom' };
          const allDimensions: DimLine[] = [];
          
          // --- Wall distances ---
          if (furnitureRoom) {
            const poly = (roomPolygons.get(furnitureRoom.id) ?? []);
            let rMinX = Infinity, rMaxX = -Infinity, rMinY = Infinity, rMaxY = -Infinity;
            for (const pt of poly) {
              if (pt.x < rMinX) rMinX = pt.x;
              if (pt.x > rMaxX) rMaxX = pt.x;
              if (pt.y < rMinY) rMinY = pt.y;
              if (pt.y > rMaxY) rMaxY = pt.y;
            }
            allDimensions.push(
              { label: formatLength(fLeft - rMinX, dimSettings.units), from: { x: fLeft, y: fy }, to: { x: rMinX, y: fy }, color: '#f97316', dir: 'left' },
              { label: formatLength(rMaxX - fRight, dimSettings.units), from: { x: fRight, y: fy }, to: { x: rMaxX, y: fy }, color: '#f97316', dir: 'right' },
              { label: formatLength(fTop - rMinY, dimSettings.units), from: { x: fx, y: fTop }, to: { x: fx, y: rMinY }, color: '#f97316', dir: 'top' },
              { label: formatLength(rMaxY - fBottom, dimSettings.units), from: { x: fx, y: fBottom }, to: { x: fx, y: rMaxY }, color: '#f97316', dir: 'bottom' },
            );
          }
          
          // --- Furniture-to-furniture distances ---
          // For each direction, find the nearest other furniture edge
          const otherFurniture = floor.furniture.filter(f => f.id !== selFurniture.id);
          // Track closest furniture per direction
          const closestFurn: Record<string, { dist: number; dim: DimLine }> = {};
          
          for (const other of otherFurniture) {
            const oCat = getCatalogItem(other.catalogId);
            if (!oCat) continue;
            const ow = (other.width ?? oCat.width) * Math.abs(other.scale?.x ?? 1);
            const od = (other.depth ?? oCat.depth) * Math.abs(other.scale?.y ?? 1);
            const ox = other.position.x;
            const oy = other.position.y;
            const oLeft = ox - ow / 2;
            const oRight = ox + ow / 2;
            const oTop = oy - od / 2;
            const oBottom = oy + od / 2;
            
            // Check vertical overlap (needed for left/right distances)
            const vOverlap = fBottom > oTop && fTop < oBottom;
            // Check horizontal overlap (needed for top/bottom distances)
            const hOverlap = fRight > oLeft && fLeft < oRight;
            
            const midY = Math.max(fTop, oTop) / 2 + Math.min(fBottom, oBottom) / 2;
            const midX = Math.max(fLeft, oLeft) / 2 + Math.min(fRight, oRight) / 2;
            
            // Left: other is to the left of selected
            if (vOverlap && oRight <= fLeft) {
              const gap = fLeft - oRight;
              if (!closestFurn['left'] || gap < closestFurn['left'].dist) {
                closestFurn['left'] = { dist: gap, dim: { label: formatLength(gap, dimSettings.units), from: { x: fLeft, y: midY }, to: { x: oRight, y: midY }, color: '#ef4444', dir: 'left' } };
              }
            }
            // Right: other is to the right
            if (vOverlap && oLeft >= fRight) {
              const gap = oLeft - fRight;
              if (!closestFurn['right'] || gap < closestFurn['right'].dist) {
                closestFurn['right'] = { dist: gap, dim: { label: formatLength(gap, dimSettings.units), from: { x: fRight, y: midY }, to: { x: oLeft, y: midY }, color: '#ef4444', dir: 'right' } };
              }
            }
            // Top: other is above
            if (hOverlap && oBottom <= fTop) {
              const gap = fTop - oBottom;
              if (!closestFurn['top'] || gap < closestFurn['top'].dist) {
                closestFurn['top'] = { dist: gap, dim: { label: formatLength(gap, dimSettings.units), from: { x: midX, y: fTop }, to: { x: midX, y: oBottom }, color: '#ef4444', dir: 'top' } };
              }
            }
            // Bottom: other is below
            if (hOverlap && oTop >= fBottom) {
              const gap = oTop - fBottom;
              if (!closestFurn['bottom'] || gap < closestFurn['bottom'].dist) {
                closestFurn['bottom'] = { dist: gap, dim: { label: formatLength(gap, dimSettings.units), from: { x: midX, y: fBottom }, to: { x: midX, y: oTop }, color: '#ef4444', dir: 'bottom' } };
              }
            }
          }
          
          // For each direction, use furniture-to-furniture if closer than wall, otherwise wall
          const finalDimensions: DimLine[] = [];
          const dirs: Array<'left' | 'right' | 'top' | 'bottom'> = ['left', 'right', 'top', 'bottom'];
          for (const dir of dirs) {
            const wallDim = allDimensions.find(d => d.dir === dir);
            const furnDim = closestFurn[dir];
            if (furnDim && wallDim) {
              // Show whichever is closer (furniture-to-furniture usually wins)
              const wallDist = Math.hypot(wallDim.to.x - wallDim.from.x, wallDim.to.y - wallDim.from.y);
              if (furnDim.dist < wallDist) {
                finalDimensions.push(furnDim.dim);
              } else {
                finalDimensions.push(wallDim);
              }
            } else if (furnDim) {
              finalDimensions.push(furnDim.dim);
            } else if (wallDim) {
              finalDimensions.push(wallDim);
            }
          }
          
          // --- Draw all dimension lines ---
          const fontSize = Math.max(9, 10 * zoom);
          ctx.font = `${fontSize}px sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          
          for (const d of finalDimensions) {
            const fromS = worldToScreen(d.from.x, d.from.y);
            const toS = worldToScreen(d.to.x, d.to.y);
            const dist = Math.hypot(d.to.x - d.from.x, d.to.y - d.from.y);
            if (dist < 1) continue;
            
            // Dashed line
            ctx.strokeStyle = d.color;
            ctx.lineWidth = 1;
            ctx.setLineDash([3, 3]);
            ctx.beginPath();
            ctx.moveTo(fromS.x, fromS.y);
            ctx.lineTo(toS.x, toS.y);
            ctx.stroke();
            ctx.setLineDash([]);
            
            // Small end caps (perpendicular ticks)
            const dx = toS.x - fromS.x;
            const dy = toS.y - fromS.y;
            const len = Math.hypot(dx, dy);
            if (len > 0) {
              const nx = -dy / len;
              const ny = dx / len;
              const tickLen = 4;
              ctx.strokeStyle = d.color;
              ctx.lineWidth = 1;
              ctx.setLineDash([]);
              for (const pt of [fromS, toS]) {
                ctx.beginPath();
                ctx.moveTo(pt.x - nx * tickLen, pt.y - ny * tickLen);
                ctx.lineTo(pt.x + nx * tickLen, pt.y + ny * tickLen);
                ctx.stroke();
              }
            }
            
            // Dimension pill at midpoint
            const mx = (fromS.x + toS.x) / 2;
            const my = (fromS.y + toS.y) / 2;
            const tw = ctx.measureText(d.label).width;
            const pw = tw + 8;
            const ph = fontSize + 4;
            ctx.fillStyle = d.color;
            ctx.beginPath();
            ctx.roundRect(mx - pw / 2, my - ph / 2, pw, ph, ph / 2);
            ctx.fill();
            ctx.fillStyle = '#ffffff';
            ctx.fillText(d.label, mx, my);
          }
        }
      }
    }

    // Wall snap indicator — highlight the target wall
    if (wallSnapInfo && currentFloor) {
      const snapWall = currentFloor.walls.find(w => w.id === wallSnapInfo!.wallId);
      if (snapWall) {
        const s = worldToScreen(snapWall.start.x, snapWall.start.y);
        const e = worldToScreen(snapWall.end.x, snapWall.end.y);
        ctx.strokeStyle = '#3b82f6';
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 3]);
        ctx.beginPath();
        ctx.moveTo(s.x, s.y);
        ctx.lineTo(e.x, e.y);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }

    // Stairs
    if (showStairs && floor.stairs) {
      for (const stair of floor.stairs) {
        drawStair(stair, isSelected(stair.id));
      }
    }

    // Columns
    if (layerVis.columns && floor.columns) {
      for (const col of floor.columns) {
        drawColumn(col, isSelected(col.id));
      }
    }

    // Column placement preview
    if (isPlacingColumn) {
      ctx.save();
      ctx.globalAlpha = 0.5;
      const preview: Column = { id: 'preview', position: mousePos, rotation: 0, shape: placingColShape, diameter: 30, height: 280, color: '#cccccc' };
      drawColumn(preview, false);
      ctx.restore();
    }

    // Stair placement preview
    if (isPlacingStair) {
      ctx.save();
      ctx.globalAlpha = 0.5;
      const preview: Stair = { id: 'preview', position: mousePos, rotation: 0, width: 100, depth: 300, riserCount: 14, direction: 'up', stairType: 'straight' };
      drawStair(preview, false);
      ctx.restore();
    }

    // Entourage placement ghost
    if (currentEntourageDefId) {
      const ghostW = getEntourageDef(currentEntourageDefId)?.width ?? 100;
      _drawEntourageGhost(getCS(), currentEntourageDefId, customEntourageDefs, mousePos, ghostW);
    }

    // Calibration points
    if (isCalibrating && calPoints.length > 0) {
      ctx.fillStyle = '#ef4444';
      for (const pt of calPoints) {
        const sp = worldToScreen(pt.x, pt.y);
        ctx.beginPath();
        ctx.arc(sp.x, sp.y, 6, 0, Math.PI * 2);
        ctx.fill();
      }
      if (calPoints.length === 2) {
        const sp1 = worldToScreen(calPoints[0].x, calPoints[0].y);
        const sp2 = worldToScreen(calPoints[1].x, calPoints[1].y);
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 4]);
        ctx.beginPath();
        ctx.moveTo(sp1.x, sp1.y);
        ctx.lineTo(sp2.x, sp2.y);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }

    // Furniture placement preview
    if (currentPlacingId && currentTool === 'furniture') drawFurniturePreview();

    // Door/window placement preview
    if (placementPreview) drawPlacementPreview();

    // Wall in progress — draw close indicator at first point
    if (wallSequenceFirst && wallStart && currentTool === 'wall' && (wallStart.x !== wallSequenceFirst.x || wallStart.y !== wallSequenceFirst.y)) {
      const fp = worldToScreen(wallSequenceFirst.x, wallSequenceFirst.y);
      const distToFirst = Math.hypot(mousePos.x - wallSequenceFirst.x, mousePos.y - wallSequenceFirst.y);
      const isNear = distToFirst < 20;
      ctx.beginPath();
      ctx.arc(fp.x, fp.y, isNear ? 8 : 5, 0, Math.PI * 2);
      ctx.strokeStyle = isNear ? '#3b82f6' : '#64748b';
      ctx.lineWidth = isNear ? 2.5 : 1.5;
      ctx.stroke();
      if (isNear) {
        ctx.fillStyle = 'rgba(34, 197, 94, 0.2)';
        ctx.fill();
      }
    }
    if (wallStart && currentTool === 'wall') {
      drawAngleGuides(wallStart);
      const endPt = applyTypedWallLength(snapWallEndPoint(mousePos));
      const s = worldToScreen(wallStart.x, wallStart.y);
      const e = worldToScreen(endPt.x, endPt.y);
      const dx = e.x - s.x, dy = e.y - s.y;
      const len = Math.hypot(dx, dy);
      if (len > 1) {
        const thickness = Math.max(20 * zoom, 4);
        const nx = (-dy / len) * thickness / 2;
        const ny = (dx / len) * thickness / 2;
        ctx.fillStyle = '#3b82f620';
        ctx.strokeStyle = '#3b82f6';
        ctx.lineWidth = 1;
        ctx.setLineDash([6, 4]);
        ctx.beginPath();
        ctx.moveTo(s.x + nx, s.y + ny); ctx.lineTo(e.x + nx, e.y + ny);
        ctx.lineTo(e.x - nx, e.y - ny); ctx.lineTo(s.x - nx, s.y - ny);
        ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.setLineDash([]);
      }

      // Dimension label on the wall preview (pill style)
      const plen = Math.hypot(endPt.x - wallStart.x, endPt.y - wallStart.y);
      const angle = Math.atan2(endPt.y - wallStart.y, endPt.x - wallStart.x) * 180 / Math.PI;
      const displayAngle = ((angle % 360) + 360) % 360;
      const dimMidX = (s.x + e.x) / 2;
      const dimMidY = (s.y + e.y) / 2;
      const typedActive = typedWallLengthCm() !== null;
      const dimText = typedActive
        ? `${formatLength(plen, dimSettings.units)} ⏎`
        : formatLength(plen, dimSettings.units);
      const angleText = shiftDown ? `${Math.round(displayAngle)}° ⇧` : `${Math.round(displayAngle)}°`;

      // Dimension pill (on the wall) — amber while an exact length is being typed
      ctx.font = 'bold 11px system-ui, sans-serif';
      const dimTW = ctx.measureText(dimText).width;
      const dimPW = dimTW + 12;
      const dimPH = 18;
      ctx.fillStyle = typedActive ? '#b45309' : '#1e293b';
      ctx.beginPath();
      ctx.roundRect(dimMidX - dimPW / 2, dimMidY - dimPH / 2 - 12, dimPW, dimPH, dimPH / 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(dimText, dimMidX, dimMidY - 12);

      // Angle indicator near cursor
      const angleTW = ctx.measureText(angleText).width;
      const anglePW = angleTW + 12;
      const anglePH = 18;
      const angleX = e.x + 20;
      const angleY = e.y - 20;
      ctx.fillStyle = shiftDown ? '#7c3aed' : '#3b82f6';
      ctx.beginPath();
      ctx.roundRect(angleX - anglePW / 2, angleY - anglePH / 2, anglePW, anglePH, anglePH / 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.fillText(angleText, angleX, angleY);

      // Snap indicator — green ring when snapping to existing endpoint
      if ((endPt as any).snappedToEndpoint) {
        ctx.strokeStyle = '#22c55e';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(e.x, e.y, 8, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = '#22c55e40';
        ctx.fill();
      }

      // Wall extension snap indicator — magenta ring + highlight target wall when snapping to wall segment
      if ((endPt as any).snappedToWall && (endPt as any).snappedWallId && currentFloor) {
        // Draw snap point indicator
        ctx.strokeStyle = '#ec4899';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(e.x, e.y, 8, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = '#ec489940';
        ctx.fill();
        // Draw crosshair at snap point
        ctx.strokeStyle = '#ec4899';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(e.x - 12, e.y); ctx.lineTo(e.x + 12, e.y);
        ctx.moveTo(e.x, e.y - 12); ctx.lineTo(e.x, e.y + 12);
        ctx.stroke();
        // Highlight the target wall
        const targetWall = currentFloor.walls.find(w => w.id === (endPt as any).snappedWallId);
        if (targetWall) {
          const tw1 = worldToScreen(targetWall.start.x, targetWall.start.y);
          const tw2 = worldToScreen(targetWall.end.x, targetWall.end.y);
          ctx.strokeStyle = '#ec4899';
          ctx.lineWidth = 2;
          ctx.setLineDash([6, 3]);
          ctx.beginPath();
          ctx.moveTo(tw1.x, tw1.y);
          ctx.lineTo(tw2.x, tw2.y);
          ctx.stroke();
          ctx.setLineDash([]);
        }
        // "Extend to wall" tooltip
        ctx.font = 'bold 10px system-ui, sans-serif';
        const extText = 'Snap to wall';
        const extTW = ctx.measureText(extText).width;
        ctx.fillStyle = '#ec4899';
        ctx.beginPath();
        ctx.roundRect(e.x - extTW / 2 - 6, e.y + 14, extTW + 12, 16, 8);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(extText, e.x, e.y + 22);
      }
    }

    // Marquee selection rectangle
    if (marqueeStart && marqueeEnd) {
      const s = worldToScreen(marqueeStart.x, marqueeStart.y);
      const e = worldToScreen(marqueeEnd.x, marqueeEnd.y);
      const rx = Math.min(s.x, e.x), ry = Math.min(s.y, e.y);
      const rw = Math.abs(e.x - s.x), rh = Math.abs(e.y - s.y);
      if (rw > 2 || rh > 2) {
        ctx.fillStyle = 'rgba(59, 130, 246, 0.08)';
        ctx.fillRect(rx, ry, rw, rh);
        ctx.strokeStyle = '#3b82f6';
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 3]);
        ctx.strokeRect(rx, ry, rw, rh);
        ctx.setLineDash([]);
      }
    }

    // Multi-select bounding box
    {
      const bbox = getMultiSelectBBox();
      if (bbox) {
        const s1 = worldToScreen(bbox.minX, bbox.minY);
        const s2 = worldToScreen(bbox.maxX, bbox.maxY);
        ctx.strokeStyle = '#8b5cf6';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([6, 4]);
        ctx.strokeRect(s1.x, s1.y, s2.x - s1.x, s2.y - s1.y);
        ctx.setLineDash([]);
        // Light fill
        ctx.fillStyle = 'rgba(139, 92, 246, 0.08)';
        ctx.fillRect(s1.x, s1.y, s2.x - s1.x, s2.y - s1.y);

        // Move icon in center — 4-arrow crosshair
        const cx = (s1.x + s2.x) / 2, cy = (s1.y + s2.y) / 2;
        const r = 18; // arm length
        const ah = 6;  // arrowhead size
        ctx.save();
        // Background circle
        ctx.beginPath();
        ctx.arc(cx, cy, r + 8, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255,255,255,0.9)';
        ctx.fill();
        ctx.strokeStyle = '#8b5cf6';
        ctx.lineWidth = 1.5;
        ctx.stroke();
        // Draw 4 arrows
        ctx.strokeStyle = '#8b5cf6';
        ctx.fillStyle = '#8b5cf6';
        ctx.lineWidth = 2;
        for (const [dx, dy] of [[1,0],[-1,0],[0,1],[0,-1]]) {
          // Line
          ctx.beginPath();
          ctx.moveTo(cx, cy);
          ctx.lineTo(cx + dx * r, cy + dy * r);
          ctx.stroke();
          // Arrowhead
          ctx.beginPath();
          ctx.moveTo(cx + dx * r, cy + dy * r);
          if (dx !== 0) {
            ctx.lineTo(cx + dx * (r - ah), cy - ah);
            ctx.lineTo(cx + dx * (r - ah), cy + ah);
          } else {
            ctx.lineTo(cx - ah, cy + dy * (r - ah));
            ctx.lineTo(cx + ah, cy + dy * (r - ah));
          }
          ctx.closePath();
          ctx.fill();
        }
        ctx.restore();
      }
    }

    // Persisted measurements
    if (layerVis.measurements && floor) drawPersistedMeasurements(floor);
    // Active measurement
    if (measureStart && measuring) drawMeasurement();
    // Annotations
    if (layerVis.annotations && floor) drawAnnotations(floor);
    // Annotation preview
    if (annotating && annotationStart) drawAnnotationPreview();
    // Text annotations
    if (floor) drawTextAnnotations(floor);

    // Rotation angle tooltip while dragging rotation handle
    if (draggingHandle === 'rotate' && currentSelectedId && currentFloor) {
      const fi = currentFloor.furniture.find(f => f.id === currentSelectedId);
      if (fi) {
        const sp = worldToScreen(fi.position.x, fi.position.y);
        const rotAngle = Math.round(fi.rotation);
        const label = `${rotAngle}°`;
        const fontSize = 13;
        ctx.font = `bold ${fontSize}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const tw = ctx.measureText(label).width;
        const pw = tw + 14;
        const ph = fontSize + 10;
        const tx = sp.x;
        const ty = sp.y - 50;
        ctx.fillStyle = '#1e293b';
        ctx.beginPath();
        ctx.roundRect(tx - pw / 2, ty - ph / 2, pw, ph, 4);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.fillText(label, tx, ty);
      }
    }

    // Drag preview ghost
    if (dragPreview) {
      const dp = dragPreview;
      const s = worldToScreen(dp.x - dp.width / 2, dp.y - dp.depth / 2);
      const e2 = worldToScreen(dp.x + dp.width / 2, dp.y + dp.depth / 2);
      ctx.save();
      ctx.globalAlpha = 0.3;
      ctx.fillStyle = '#3b82f6';
      ctx.fillRect(s.x, s.y, e2.x - s.x, e2.y - s.y);
      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 4]);
      ctx.strokeRect(s.x, s.y, e2.x - s.x, e2.y - s.y);
      ctx.setLineDash([]);
      ctx.restore();
    }

    // Rulers (drawn last, on top of everything)
    drawRulers();

    // Mini-map
    drawMinimap();

  }

  /** True while the integrated elevation view covers the canvas area */
  let elevationOpen = $state(false);
  /** Armed via the Elevation segment with no wall selected: next wall click opens its elevation */
  let pickingElevation = $state(false);

  onMount(() => {
    ctx = canvas.getContext('2d')!;
    drawing = createDrawScheduler(draw);
    resize();
    const stopTextures = setTextureLoadCallback(markDirty);
    let mounted = true;
    const resizeObs = new ResizeObserver(resize);
    resizeObs.observe(canvas.parentElement!);

    const floorViews = new Map<string, { x: number; y: number; zoom: number; minimumZoom: number; fitted: boolean }>();
    let activeViewKey: string | null = null;
    let initialFitDone = false;
    let initialFitPending = false;
    function queueInitialFit() {
      if (initialFitDone || initialFitPending) return;
      initialFitPending = true;
      requestAnimationFrame(() => {
        initialFitPending = false;
        if (!mounted || initialFitDone) return;
        // An image-only active floor takes priority over the floor below once loaded.
        if (backgroundLoading && currentFloor && !boundsForFloor(currentFloor)) return;
        if (!getFitBounds()) return;
        initialFitDone = true;
        zoomToFit();
      });
    }
    const unsub1 = activeFloor.subscribe((f) => {
      const viewKey = f ? JSON.stringify([get(currentProject)?.id, f.id]) : null;
      if (viewKey !== activeViewKey) {
        if (activeViewKey) floorViews.set(activeViewKey, { x: camX, y: camY, zoom, minimumZoom, fitted: initialFitDone });
        activeViewKey = viewKey;
        const saved = viewKey ? floorViews.get(viewKey) : undefined;
        camX = saved?.x ?? 0; camY = saved?.y ?? 0; zoom = saved?.zoom ?? 1;
        minimumZoom = saved?.minimumZoom ?? 0.1;
        initialFitDone = saved?.fitted ?? false;
        measureStart = null;
        measureEnd = null;
        annotationStart = null;
        editingDimensionId = null;
        wallStart = null;
        wallSequenceFirst = null;
        typedWallLength = '';
      }
      currentFloor = f;
      updateDetectedRooms();
      markDirty();
      queueInitialFit();
    });
    const unsub2 = selectedElementId.subscribe((id) => {
      currentSelectedId = id;
      if (id) {
        clearAuxiliarySelection();
        if (currentFloor?.guides?.some(item => item.id === id)) selectedGuideId = id;
        if (currentFloor?.measurements?.some(item => item.id === id)) selectedMeasurementId = id;
        if (currentFloor?.annotations?.some(item => item.id === id)) selectedAnnotationId = id;
        if (currentFloor?.textAnnotations?.some(item => item.id === id)) selectedTextAnnotationId = id;
      }
      markDirty();
    });
    const unsub3 = selectedRoomId.subscribe((id) => { currentSelectedRoomId = id; markDirty(); });
    const unsub4 = placingFurnitureId.subscribe((id) => { currentPlacingId = id; markDirty(); });
    const unsub5 = placingRotation.subscribe((r) => { currentPlacingRotation = r; markDirty(); });
    const unsub6 = selectedTool.subscribe((t) => {
      if (t !== currentTool) {
        finishCanvasGesture();
        measureStart = null;
        measureEnd = null;
        annotationStart = null;
        editingDimensionId = null;
        wallStart = null;
        wallSequenceFirst = null;
        typedWallLength = '';
      }
      currentTool = t;
      textAnnotationMode = t === 'text';
      if (t !== 'text') { editingTextAnnotationId = null; }
      markDirty();
    });
    const unsub7 = detectedRoomsStore.subscribe((rooms) => { if (rooms.length > 0) detectedRooms = rooms; markDirty(); });
    const unsub8 = placingDoorType.subscribe((t) => { currentDoorType = t; markDirty(); });
    const unsub9 = placingWindowType.subscribe((t) => { currentWindowType = t; markDirty(); });
    const unsub10 = snapEnabled.subscribe((v) => { currentSnapEnabled = v; markDirty(); });
    const unsub_snapgrid = projectSettings.subscribe((s) => { currentSnapToGrid = s.snapToGrid; currentSnapToWalls = s.snapToWalls; currentGridSize = s.gridSize; markDirty(); });
    const unsub11 = placingStair.subscribe((v) => { isPlacingStair = v; markDirty(); });
    const unsubEnt1 = placingEntourageId.subscribe((id) => { currentEntourageDefId = id; markDirty(); });
    const unsubEnt2 = currentProject.subscribe((pr) => {
      if (clipboard && clipboard.projectId !== pr?.id) clipboard = null;
      customEntourageDefs = pr?.customEntourage;
      floorBelow = getFloorBelow(pr);
      queueInitialFit();
      markDirty();
    });
    const unsub_layers = layerVisibility.subscribe((v) => { layerVis = v; markDirty(); });
    const unsub_col = placingColumn.subscribe((v) => { isPlacingColumn = v; markDirty(); });
    const unsub_cols = placingColumnShape.subscribe((v) => { placingColShape = v; markDirty(); });
    const unsub12 = calibrationMode.subscribe((v) => { isCalibrating = v; markDirty(); });
    const unsub13 = calibrationPoints.subscribe((pts) => { calPoints = pts; markDirty(); });
    const unsub_multi = selectedElementIds.subscribe((ids) => { currentSelectedIds = ids; markDirty(); });
    const unsub_elevopen = elevationWallId.subscribe((id) => { elevationOpen = !!id; markDirty(); });
    const unsub_elevpick = elevationPickMode.subscribe((v) => { pickingElevation = v; markDirty(); });
    let backgroundSource: string | undefined;
    const unsub14 = activeFloor.subscribe((f) => {
      const source = f?.backgroundImage?.dataUrl;
      if (source === backgroundSource) return;
      backgroundSource = source;
      bgImage = null;
      backgroundLoading = !!source;
      if (source) {
        const img = new Image();
        img.onload = () => {
          if (mounted && backgroundSource === source) {
            bgImage = img;
            backgroundLoading = false;
            queueInitialFit();
          }
        };
        img.onerror = () => {
          if (mounted && backgroundSource === source) {
            backgroundLoading = false;
            queueInitialFit();
          }
        };
        img.src = source;
      }
    });

    // Clipboard image paste handler — only if no internal plan clipboard
    function handlePaste(e: ClipboardEvent) {
      if (!e.clipboardData) return;
      if (clipboard && clipboard.ids.length > 0) return; // internal clipboard takes priority
      const files = e.clipboardData.files;
      for (let i = 0; i < files.length; i++) {
        if (files[i].type.startsWith('image/')) {
          e.preventDefault();
          const reader = new FileReader();
          reader.onload = () => {
            setBackgroundImage({
              dataUrl: reader.result as string,
              position: { x: camX, y: camY },
              scale: 1,
              opacity: 0.5,
              rotation: 0,
              locked: false
            });
          };
          reader.readAsDataURL(files[i]);
          return;
        }
      }
    }
    document.addEventListener('paste', handlePaste);

    // Touch input — registered manually so the handlers are non-passive
    // (Svelte attaches touch listeners passively, which blocks preventDefault)
    canvas.addEventListener('touchstart', onTouchStart, { passive: false });
    canvas.addEventListener('touchmove', onTouchMove, { passive: false });
    canvas.addEventListener('touchend', onTouchEnd, { passive: false });
    canvas.addEventListener('touchcancel', onTouchEnd, { passive: false });

    return () => { mounted = false; drawing?.stop(); stopTextures(); resizeObs.disconnect(); unsub1(); unsub2(); unsub3(); unsub4(); unsub5(); unsub6(); unsub7(); unsub8(); unsub9(); unsub10(); unsub11(); unsub12(); unsub13(); unsub_multi(); unsub_elevopen(); unsub_elevpick(); unsub14(); unsub_col(); unsub_cols(); unsub_layers(); unsub_snapgrid(); unsubEnt1(); unsubEnt2(); document.removeEventListener('paste', handlePaste); canvas.removeEventListener('touchstart', onTouchStart); canvas.removeEventListener('touchmove', onTouchMove); canvas.removeEventListener('touchend', onTouchEnd); canvas.removeEventListener('touchcancel', onTouchEnd); };
  });

  /** Compute world bounding box of all elements */
  function getWorldBBox(): { minX: number; minY: number; maxX: number; maxY: number } | null {
    if (!currentFloor) return null;
    const bounds = boundsForFloor(currentFloor);
    if (!bounds) return null;
    const pad = 50;
    return { minX: bounds.minX - pad, minY: bounds.minY - pad,
      maxX: bounds.maxX + pad, maxY: bounds.maxY + pad };
  }

  function drawMinimap() {
    if (!showMinimap || !minimapCanvas || !currentFloor) return;
    _drawMinimap(getCS(), minimapCanvas, currentFloor, getWorldBBox, layerVis);
  }

  function onMinimapClick(e: MouseEvent) {
    if (!minimapCanvas || !currentFloor) return;
    const rect = minimapCanvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const mw = minimapCanvas.width;
    const mh = minimapCanvas.height;

    const bbox = getWorldBBox();
    if (!bbox) return;
    const bw = bbox.maxX - bbox.minX;
    const bh = bbox.maxY - bbox.minY;
    if (bw < 1 || bh < 1) return;
    const scale = Math.min((mw - 8) / bw, (mh - 8) / bh);
    const ox = (mw - bw * scale) / 2;
    const oy = (mh - bh * scale) / 2;

    // Convert mini-map coords to world coords
    camX = bbox.minX + (mx - ox) / scale;
    camY = bbox.minY + (my - oy) / scale;
  }

  function boundsForFloor(floor: Floor, fittedZoom = 1, ids?: ReadonlySet<string>) {
      const options: Parameters<typeof planContentBounds>[1] = {
        context: ctx,
        automaticDimensions: {
          external: floor === currentFloor && layerVis.walls && showDimensions && dimSettings.showExternalDimensions,
          internal: floor === currentFloor && showDimensions && dimSettings.showInternalDimensions,
          edge: dimSettings.wallMeasureMode === 'edge',
        },
        dimensionRooms: floor === currentFloor && showDimensions && dimSettings.showInternalDimensions
          ? detectedRooms.map(room => ({ room, polygon: roomPolygons.get(room.id) ?? [] })) : undefined,
        measurementsVisible: floor === currentFloor && layerVis.measurements,
        dimensionsVisible: floor === currentFloor && layerVis.annotations,
        roomLabels: floor === currentFloor && showRoomLabels
          ? detectedRooms.map(room => ({ room, polygon: roomPolygons.get(room.id) ?? [] })) : undefined,
        units: dimSettings.units,
        zoom: fittedZoom,
        entourageAspect: id => entourageAspect(id, customEntourageDefs) || 1,
        backgroundSize: floor === currentFloor && bgImage ? bgImage : undefined,
      };
      return ids ? selectionContentBounds(floor,ids,options,detectedRooms) : planContentBounds(floor,options);
  }

  function getFitBounds(fittedZoom = 1) {
    return (currentFloor && boundsForFloor(currentFloor, fittedZoom))
      || (layerVis.floorBelow && floorBelow && boundsForFloor({
        ...floorBelow, furniture: [], doors: [], windows: [], columns: [], entourage: [],
        measurements: [], annotations: [], textAnnotations: [], backgroundImage: undefined,
      }, fittedZoom));
  }

  function visibleCanvasHeight() {
    const canvasRect = canvas.getBoundingClientRect();
    const sheet = document.querySelector<HTMLElement>('[data-plan-properties]');
    const sheetRect = sheet?.getBoundingClientRect();
    const coversBottom = sheetRect && sheetRect.width > 0 && sheetRect.height > 0
      && sheetRect.left < canvasRect.right && sheetRect.right > canvasRect.left
      && sheetRect.top < canvasRect.bottom && sheetRect.bottom >= canvasRect.bottom;
    const visibleHeight = coversBottom
      ? Math.max(1, Math.min(height, (sheetRect.top - canvasRect.top) * height / canvasRect.height))
      : height;
    return visibleHeight;
  }

  function updateZoomControlsPosition() {
    const visibleHeight = visibleCanvasHeight();
    zoomControlsBottom = 12 + (height-visibleHeight) * canvas.getBoundingClientRect().height / Math.max(1,height);
  }

  function clearAuxiliarySelection() {
    selectedGuideId = null;
    selectedMeasurementId = null;
    selectedAnnotationId = null;
    selectedTextAnnotationId = null;
  }

  function selectAuxiliary(kind: 'guide' | 'measurement' | 'annotation' | 'text', id: string) {
    clearAuxiliarySelection();
    selectedElementIds.set(new Set());
    selectedRoomId.set(null);
    selectedElementId.set(kind === 'text' ? id : null);
    if (kind === 'guide') selectedGuideId = id;
    if (kind === 'measurement') selectedMeasurementId = id;
    if (kind === 'annotation') selectedAnnotationId = id;
    if (kind === 'text') selectedTextAnnotationId = id;
  }

  function selectAnnotationTarget(kind: 'measurement' | 'annotation' | 'text', id: string, e: MouseEvent, wp: Point): boolean {
    if (e.shiftKey) {
      const ids = new Set(currentSelectedIds);
      for (const selected of [currentSelectedId, selectedMeasurementId, selectedAnnotationId, selectedTextAnnotationId]) {
        if (selected) ids.add(selected);
      }
      if (ids.has(id)) ids.delete(id); else ids.add(id);
      clearAuxiliarySelection();
      selectedRoomId.set(null);
      selectedElementIds.set(ids.size > 1 ? ids : new Set());
      selectedElementId.set(ids.has(id) ? id : (ids.values().next().value ?? null));
      return true;
    }
    const group = currentFloor && !e.ctrlKey && !e.metaKey ? findGroupForElement(currentFloor, id) : undefined;
    if (group) {
      clearAuxiliarySelection();
      selectedRoomId.set(null);
      selectedElementIds.set(new Set(group.elementIds));
      selectedElementId.set(id);
      startMultiSelectionDrag(wp);
      return true;
    }
    selectAuxiliary(kind, id);
    return false;
  }

  function fitSelectionIds() {
    const ids = new Set(currentSelectedIds);
    for (const id of [currentSelectedId,selectedMeasurementId,selectedAnnotationId,selectedTextAnnotationId,currentSelectedRoomId]) if (id) ids.add(id);
    return ids;
  }

  function zoomToFit(selectionOnly = false) {
    const ids = fitSelectionIds();
    const boundsAt = (scale = 1) => selectionOnly
      ? (currentFloor ? boundsForFloor(currentFloor,scale,ids) : null) : getFitBounds(scale);
    const bounds = boundsAt();
    if (!bounds && selectionOnly) return;
    if (!bounds) { camX = 0; camY = 0; zoom = 1; minimumZoom = 0.1; markDirty(); return; }
    let { minX, minY, maxX, maxY } = bounds;
    const padding = 80;
    // On phones the properties sheet overlays the lower canvas. Fit into the
    // visible area, then compensate for the renderer's full-canvas origin.
    const visibleHeight = visibleCanvasHeight();
    const availableWidth = Math.max(1, width - 80), availableHeight = Math.max(1, visibleHeight - 80);
    const initialZoom = Math.min(availableWidth / (maxX - minX + padding * 2),
      availableHeight / (maxY - minY + padding * 2), 3);
    // Minimum screen fonts make text bounds scale-dependent. Find the largest
    // feasible scale; if a label alone exceeds the viewport, retain the initial fit.
    let lower = 0, upper = initialZoom, fittedBounds = bounds;
    for (let pass = 0; pass < 33; pass++) {
      const candidate = pass === 0 ? initialZoom : (lower + upper) / 2;
      const refined = boundsAt(candidate);
      if (!refined) break;
      const fits = (refined.maxX - refined.minX + padding * 2) * candidate <= availableWidth + 1e-6
        && (refined.maxY - refined.minY + padding * 2) * candidate <= availableHeight + 1e-6;
      if (fits) {
        lower = candidate; fittedBounds = refined;
        if (pass === 0) break;
      } else upper = candidate;
    }
    zoom = lower || initialZoom;
    ({ minX, minY, maxX, maxY } = fittedBounds);
    minimumZoom = Math.min(0.1, zoom / 4);
    camX = (minX + maxX) / 2;
    camY = (minY + maxY) / 2 + (height - visibleHeight) / (2 * zoom);
    markDirty();
  }

  // ── Hit-testing wrappers (delegating to hitTesting.ts) ──────────────

  function findWallAt(p: Point): Wall | null {
    if (!currentFloor) return null;
    return _findWallAt(p, currentFloor.walls, zoom);
  }

  function findHandleAt(p: Point): HandleType | null {
    if (!currentFloor) return null;
    return _findHandleAt(p, currentSelectedId, currentFloor.furniture, zoom);
  }

  function findFurnitureAt(p: Point): FurnitureItem | null {
    if (!currentFloor) return null;
    return _findFurnitureAt(p, currentFloor.furniture);
  }

  function findColumnAt(p: Point): Column | null {
    if (!currentFloor) return null;
    return _findColumnAt(p, currentFloor.columns);
  }

  function findStairAt(p: Point): Stair | null {
    if (!currentFloor) return null;
    return _findStairAt(p, currentFloor.stairs);
  }

  function findDoorAt(p: Point): Door | null {
    if (!currentFloor) return null;
    return _findDoorAt(p, currentFloor.doors, currentFloor.walls, zoom);
  }

  function findWindowAt(p: Point): Win | null {
    if (!currentFloor) return null;
    return _findWindowAt(p, currentFloor.windows, currentFloor.walls, zoom);
  }

  function findRoomLabelAt(p: Point): Room | null {
    if (!currentFloor || !showRoomLabels) return null;
    for (const room of detectedRooms) {
      const poly = (roomPolygons.get(room.id) ?? []);
      if (poly.length < 3) continue;
      const { x: lx, y: ly } = roomLabelPosition(room, poly);
      // Check if click is within label area (approx 80x40 world units)
      const hitW = 80 / zoom;
      const hitH = 40 / zoom;
      if (Math.abs(p.x - lx) < hitW && Math.abs(p.y - ly) < hitH) {
        return room;
      }
    }
    return null;
  }

  function findRoomAt(p: Point): Room | null {
    if (!currentFloor) return null;
    return _findRoomAt(p, detectedRooms, currentFloor.walls, roomPolygons);
  }

  // pointInPolygon, pointToSegmentDist, positionOnWall imported from hitTesting.ts

  /** True while a press that began on the canvas is still in progress. */
  let canvasGestureActive = false;
  let canvasPressPosition: Point = { x: 0, y: 0 };
  let furnitureGestureStarted = false;
  let geometryGestureStarted = false;
  let selectionPress: { floorId: string; x: number; y: number; world: Point } | null = null;

  function sameSelectionPress(e: MouseEvent) {
    return currentTool === 'select' && selectionPress !== null && selectionPress.floorId === currentFloor?.id &&
      Math.hypot(e.clientX - selectionPress.x, e.clientY - selectionPress.y) <= 8;
  }

  function finishCanvasGesture() {
    if (canvasGestureActive) onMouseUp(new MouseEvent('mouseup'));
  }

  function onWindowBlur() {
    finishCanvasGesture();
    spaceDown = false;
    shiftDown = false;
  }

  // A press that starts on the canvas can end somewhere else: the selection toolbar appears
  // over the element the moment it is selected, and a drag can also leave the canvas
  // entirely. Finishing the gesture from the window keeps the release from being lost, which
  // would otherwise leave the element following the pointer with no way to drop it.
  function onWindowMouseMove(e: MouseEvent) {
    if (canvasGestureActive && e.target !== canvas) onMouseMove(e);
  }

  function onWindowMouseUp(e: MouseEvent) {
    if (canvasGestureActive && e.target !== canvas) onMouseUp(e);
  }

  function onMouseDown(e: MouseEvent) {
    markDirty();
    if (e.button !== 0 && e.button !== 1) return;
    finishCanvasGesture();
    // Native double-clicks belong to the original press even if selection opened
    // a sidebar and resized the canvas. Do not select a second object underneath
    // the now-shifted pixel before the dblclick handler runs.
    if (e.button === 0 && e.detail >= 2 && sameSelectionPress(e)) return;
    selectionPress = null;
    canvasGestureActive = true;
    canvasPressPosition = { x: e.clientX, y: e.clientY };
    if (e.button === 0 && e.shiftKey && currentTool === 'select' && currentFloor && !spaceDown && !$panMode) {
      const rect = canvas.getBoundingClientRect();
      const wp = screenToWorld(e.clientX - rect.left, e.clientY - rect.top);
      const measurement = hitTestMeasurement(wp, currentFloor);
      const note = measurement ? null : hitTestTextAnnotation(wp, currentFloor);
      const dimension = measurement || note ? null : hitTestAnnotation(wp, currentFloor);
      const id = measurement || note || dimension;
      if (id) {
        selectAnnotationTarget(measurement ? 'measurement' : note ? 'text' : 'annotation', id, e, wp);
        return;
      }
    }
    if (e.button === 1 || (e.button === 0 && (spaceDown || $panMode || (e.shiftKey && currentTool === 'select')))) {
      isPanning = true;
      panStartX = e.clientX;
      panStartY = e.clientY;
      return;
    }
    if (e.button !== 0) return;

    const rect = canvas.getBoundingClientRect();
    const wp = screenToWorld(e.clientX - rect.left, e.clientY - rect.top);
    const tool = currentTool;
    if (tool === 'select' && currentFloor && e.detail === 1) {
      selectionPress = { floorId: currentFloor.id, x: e.clientX, y: e.clientY, world: wp };
    }

    // Elevation pick mode: the next wall clicked opens its elevation view;
    // clicking empty canvas cancels. Consumes the click either way so the
    // normal selection flow is untouched.
    if (pickingElevation) {
      elevationPickMode.set(false);
      const wall = findWallAt(wp);
      if (wall) {
        selectedElementId.set(wall.id);
        selectedElementIds.set(new Set());
        selectedRoomId.set(null);
        elevationWallId.set(wall.id);
      }
      return;
    }

    // Text annotation tool: click to place text
    if (textAnnotationMode) {
      const snapped = { x: snap(wp.x), y: snap(wp.y) };
      // Check if clicking on an existing text annotation to edit it
      if (currentFloor) {
        const hitId = hitTestTextAnnotation(wp, currentFloor);
        if (hitId) {
          // Edit existing text annotation
          const ta = currentFloor.textAnnotations?.find(t => t.id === hitId);
          if (ta) {
            const sp = worldToScreen(ta.x, ta.y);
            editingTextAnnotationId = hitId;
            editingTextAnnotationPos = { x: sp.x, y: sp.y };
            editingTextAnnotationValue = ta.text;
            selectedTextAnnotationId = hitId;
            selectedElementId.set(hitId);
            return;
          }
        }
      }
      // Place new text annotation — show inline input
      const sp = worldToScreen(snapped.x, snapped.y);
      const id = addTextAnnotation(snapped.x, snapped.y, 'Text', 16, '#1e293b', 0);
      editingTextAnnotationId = id;
      editingTextAnnotationPos = { x: sp.x, y: sp.y };
      editingTextAnnotationValue = '';
      selectedTextAnnotationId = id;
      selectedElementId.set(id);
      return;
    }

    if (measuring) {
      placeMeasurementPoint(wp);
      return;
    }

    // Annotation tool: click first point, then second point
    if (annotating) {
      const snapped = magneticSnap(wp);
      if (!annotationStart) {
        annotationStart = { x: snapped.x, y: snapped.y };
      } else {
        // Keep the canvas's default mousedown focus from immediately blurring
        // the inline label field that is about to open.
        e.preventDefault();
        const id = addAnnotation(annotationStart.x, annotationStart.y, snapped.x, snapped.y, 40);
        annotationStart = null;
        dimensionLabel = '';
        editingDimensionId = id;
      }
      return;
    }

    // Column placement (before select-mode handlers to avoid interception)
    if (isPlacingColumn) {
      const pos = { x: snap(wp.x), y: snap(wp.y) };
      const id = addColumn(pos, placingColShape);
      selectedElementId.set(id);
      placingColumn.set(false);
      return;
    }

    // Stair placement (before select-mode handlers to avoid interception)
    if (currentEntourageDefId) {
      const entW = getEntourageDef(currentEntourageDefId)?.width ?? 100;
      const entId = addEntourageItem(currentEntourageDefId, { x: snap(wp.x), y: snap(wp.y) }, entW);
      if (!e.shiftKey) placingEntourageId.set(null); // hold Shift to keep stamping
      selectedElementId.set(entId);
      return;
    }

    if (isPlacingStair) {
      const pos = { x: snap(wp.x), y: snap(wp.y) };
      const id = addStair(pos);
      selectedElementId.set(id);
      placingStair.set(false);
      return;
    }

    // Guide line click detection (select / start drag)
    if (tool === 'select' && currentFloor?.guides) {
      const GUIDE_HIT = 6 / zoom; // 6px tolerance in world units
      for (const g of currentFloor.guides) {
        if (g.orientation === 'horizontal' && Math.abs(wp.y - g.position) < GUIDE_HIT) {
          selectAuxiliary('guide',g.id);
          draggingGuideId = g.id;
          return;
        }
        if (g.orientation === 'vertical' && Math.abs(wp.x - g.position) < GUIDE_HIT) {
          selectAuxiliary('guide',g.id);
          draggingGuideId = g.id;
          return;
        }
      }
      // Click elsewhere deselects guide
      selectedGuideId = null;
    }

    // Measurement click detection (select)
    if (tool === 'select' && currentFloor) {
      const hitId = hitTestMeasurement(wp, currentFloor);
      if (hitId && (e.ctrlKey || e.metaKey || !(currentSelectedIds.size >= 2 && currentSelectedIds.has(hitId)))) {
        selectAnnotationTarget('measurement',hitId,e,wp);
        return;
      }
      selectedMeasurementId = null;
    }

    // Text annotation click detection (select + drag)
    if (tool === 'select' && currentFloor) {
      const textHitId = hitTestTextAnnotation(wp, currentFloor);
      if (textHitId && (e.ctrlKey || e.metaKey || !(currentSelectedIds.size >= 2 && currentSelectedIds.has(textHitId)))) {
        if (selectAnnotationTarget('text',textHitId,e,wp)) return;
        const ta = currentFloor.textAnnotations?.find(t => t.id === textHitId);
        if (ta) {
          draggingTextAnnotationId = textHitId;
          textAnnotationDragOffset = { x: wp.x - ta.x, y: wp.y - ta.y };
        }
        return;
      }
      selectedTextAnnotationId = null;
    }

    // Annotation click detection (select)
    if (tool === 'select' && currentFloor) {
      const hitId = hitTestAnnotation(wp, currentFloor);
      if (hitId && (e.ctrlKey || e.metaKey || !(currentSelectedIds.size >= 2 && currentSelectedIds.has(hitId)))) {
        selectAnnotationTarget('annotation',hitId,e,wp);
        return;
      }
      selectedAnnotationId = null;
    }

    // Calibration mode click
    if (isCalibrating) {
      calibrationPoints.update(pts => {
        const newPts = [...pts, { x: wp.x, y: wp.y }];
        if (newPts.length >= 2) {
          const dist = Math.hypot(newPts[1].x - newPts[0].x, newPts[1].y - newPts[0].y);
          const realDist = prompt('Enter the real-world distance between these two points (in cm):');
          if (realDist && Number(realDist) > 0) {
            const pixelsPerCm = dist / Number(realDist);
            if (currentFloor?.backgroundImage) {
              updateBackgroundImage({ scale: currentFloor.backgroundImage.scale * (1 / pixelsPerCm) });
            }
          }
          calibrationMode.set(false);
          return [];
        }
        return newPts;
      });
      return;
    }

    // Column and stair placement moved earlier (before select-mode handlers)

    if (tool === 'furniture' && currentPlacingId) {
      const placingCat = getCatalogItem(currentPlacingId);
      const wallSnap = placingCat ? snapFurnitureToWall(wp, placingCat) : null;
      const pos = wallSnap ? wallSnap.position : { x: snap(wp.x), y: snap(wp.y) };
      const rot = wallSnap ? wallSnap.rotation : currentPlacingRotation;
      const id = addFurniture(currentPlacingId, pos);
      if (rot !== 0) {
        rotateFurniture(id, rot);
      }
      selectedElementId.set(id);
      return;
    }

    if (tool === 'wall') {
      let endPt = snapWallEndPoint(wp);
      if (wallStart) endPt = applyTypedWallLength(endPt);
      typedWallLength = '';
      if (!wallStart) {
        wallStart = endPt;
        wallSequenceFirst = endPt;
      } else {
        // Auto-close: if clicking near the first point of the sequence, close the loop
        if (wallSequenceFirst && Math.hypot(endPt.x - wallSequenceFirst.x, endPt.y - wallSequenceFirst.y) < 20 && Math.hypot(wallStart.x - wallSequenceFirst.x, wallStart.y - wallSequenceFirst.y) > 20) {
          addWall(wallStart, wallSequenceFirst);
          wallStart = null;
          wallSequenceFirst = null;
        } else if (Math.hypot(endPt.x - wallStart.x, endPt.y - wallStart.y) > 5) {
          addWall(wallStart, endPt);
          wallStart = endPt;
        }
      }
    } else if (tool === 'select') {
      if (startMultiSelectionDrag(wp)) return;
      // Check wall endpoint handles first (drag-to-resize walls)
      if (currentSelectedId && currentFloor) {
        const selWall = currentFloor.walls.find(w => w.id === currentSelectedId);
        if (selWall) {
          const epThreshold = 15 / zoom;
          if (Math.hypot(wp.x - selWall.start.x, wp.y - selWall.start.y) < epThreshold) {
            draggingWallEndpoint = { wallId: selWall.id, endpoint: 'start' };
            draggingConnectedEndpoints = findConnectedEndpoints(selWall.start, selWall.id);
            return;
          }
          if (Math.hypot(wp.x - selWall.end.x, wp.y - selWall.end.y) < epThreshold) {
            draggingWallEndpoint = { wallId: selWall.id, endpoint: 'end' };
            draggingConnectedEndpoints = findConnectedEndpoints(selWall.end, selWall.id);
            return;
          }
          // Check midpoint handle: Alt+drag = curve, normal drag = parallel move
          const curveHandlePt = selWall.curvePoint
            ? selWall.curvePoint
            : { x: (selWall.start.x + selWall.end.x) / 2, y: (selWall.start.y + selWall.end.y) / 2 };
          if (Math.hypot(wp.x - curveHandlePt.x, wp.y - curveHandlePt.y) < epThreshold) {
            if (e.altKey) {
              draggingCurveHandle = selWall.id;
            } else if (!selWall.curvePoint) {
              // Parallel drag for straight walls
              draggingWallParallel = {
                wallId: selWall.id,
                startMousePos: { ...wp },
                origStart: { ...selWall.start },
                origEnd: { ...selWall.end },
                connectedStart: findConnectedEndpoints(selWall.start, selWall.id),
                connectedEnd: findConnectedEndpoints(selWall.end, selWall.id),
              };
            } else {
              // For curved walls, midpoint handle still curves
              draggingCurveHandle = selWall.id;
            }
            return;
          }
        }
      }

      // Selection handles come first: they belong to the already-selected element and are
      // drawn over everything, so they win over any element underneath them.
      const handle = findHandleAt(wp);
      if (handle && currentSelectedId && currentFloor) {
        const fi = currentFloor.furniture.find(f => f.id === currentSelectedId);
        if (fi) {
          draggingHandle = handle;
          handleOrigPosition = { ...fi.position };
          handleOrigScale = { x: fi.scale?.x ?? 1, y: fi.scale?.y ?? 1 };
          handleOrigRotation = fi.rotation;
          const scaleX = Math.abs(handleOrigScale.x) || 1;
          const scaleY = Math.abs(handleOrigScale.y) || 1;
          const size = getFurnitureSize(fi);
          handleOrigBaseSize = { width: size.width / scaleX, depth: size.depth / scaleY };
          return;
        }
      }
      // Entourage resize handle (SE corner of the selected item)
      const selEnt = currentFloor?.entourage?.find(en => en.id === currentSelectedId);
      if (selEnt && !selEnt.locked) {
        const entAspect = entourageAspect(selEnt.defId, customEntourageDefs) || 1;
        const ea = ((selEnt.rotation || 0) * Math.PI) / 180;
        const lx = selEnt.width / 2, ly = (selEnt.width * entAspect) / 2;
        const hx = selEnt.position.x + lx * Math.cos(ea) - ly * Math.sin(ea);
        const hy = selEnt.position.y + lx * Math.sin(ea) + ly * Math.cos(ea);
        if (Math.hypot(wp.x - hx, wp.y - hy) < 12 / zoom) {
          resizingEntourageId = selEnt.id;
          return;
        }
      }
      // Helper: select an element (shift = add to multi-select)
      function selectElement(id: string, isShift: boolean, isCtrl: boolean = false) {
        if (isShift) {
          selectedElementIds.update(ids => {
            const next = new Set(ids);
            // Also include the current single selection if any
            if (currentSelectedId && currentSelectedId !== id) next.add(currentSelectedId);
            if (next.has(id)) next.delete(id); else next.add(id);
            return next;
          });
          selectedElementId.set(id);
        } else {
          // Group selection: if element is in a group and not ctrl-clicking, select all group members
          const group = currentFloor ? findGroupForElement(currentFloor, id) : undefined;
          if (group && !isCtrl) {
            selectedElementId.set(id);
            selectedElementIds.set(new Set(group.elementIds));
          } else {
            selectedElementId.set(id);
            selectedElementIds.set(new Set());
          }
        }
        selectedRoomId.set(null);
      }

      // Check columns
      const col = findColumnAt(wp);
      if (col) {
        selectElement(col.id, e.shiftKey);
        if (!e.shiftKey) {
          draggingColumnId = col.id;
          columnDragOffset = { x: wp.x - col.position.x, y: wp.y - col.position.y };
        }
        return;
      }
      // Check stairs
      const stair = findStairAt(wp);
      if (stair) {
        selectElement(stair.id, e.shiftKey);
        if (!e.shiftKey) {
          draggingStairId = stair.id;
          stairDragOffset = { x: wp.x - stair.position.x, y: wp.y - stair.position.y };
        }
        return;
      }
      // Check furniture
      const fi = findFurnitureAt(wp);
      if (fi) {
        selectElement(fi.id, e.shiftKey, e.ctrlKey || e.metaKey);
        if (!e.shiftKey && !fi.locked) {
          draggingFurnitureId = fi.id;
          dragOffset = { x: wp.x - fi.position.x, y: wp.y - fi.position.y };
          dragStartRotation = fi.rotation;
          dragWasWallSnapped = false;
        }
        return;
      }
      // Check entourage (below furniture in priority)
      const ent = findEntourageAt(wp, currentFloor?.entourage, (d) => entourageAspect(d, customEntourageDefs));
      if (ent) {
        selectElement(ent.id, e.shiftKey);
        if (!e.shiftKey && !ent.locked) {
          draggingEntourageId = ent.id;
          dragOffset = { x: wp.x - ent.position.x, y: wp.y - ent.position.y };
        }
        return;
      }
      // Doors and windows sit on walls, so they come after the objects standing in the room
      // and before the walls themselves.
      const door = findDoorAt(wp);
      if (door) {
        selectElement(door.id, e.shiftKey);
        if (!e.shiftKey) draggingDoorId = door.id;
        return;
      }
      const win = findWindowAt(wp);
      if (win) {
        selectElement(win.id, e.shiftKey);
        if (!e.shiftKey) draggingWindowId = win.id;
        return;
      }
      const wall = findWallAt(wp);
      if (wall) {
        selectElement(wall.id, e.shiftKey);
      } else {
        // Check if clicking on a room label (for dragging)
        const labelRoom = findRoomLabelAt(wp);
        if (labelRoom) {
          draggingRoomLabelId = labelRoom.id;
          roomLabelDragStart = { x: e.clientX, y: e.clientY };
          roomLabelDragZoom = zoom;
          roomLabelDragOffset = null;
          roomLabelOrigOffset = { x: labelRoom.labelOffset?.x ?? 0, y: labelRoom.labelOffset?.y ?? 0 };
          selectedRoomId.set(labelRoom.id);
          selectedElementId.set(null);
          selectedElementIds.set(new Set());
          return;
        }
        const room = findRoomLabelAt(wp) ?? findRoomAt(wp);
        if (room) {
          selectedRoomId.set(room.id);
          selectedElementId.set(null);
          selectedElementIds.set(new Set());
          // Start room drag
          draggingRoomId = room.id;
          roomDragStartMouse = { x: wp.x, y: wp.y };
          roomDragStartPositions.clear();
          for (const wid of room.walls) {
            const w = currentFloor!.walls.find(wall => wall.id === wid);
            if (w) roomDragStartPositions.set(wid, { start: { ...w.start }, end: { ...w.end } });
          }
        } else {
          // Empty space — start marquee selection
          marqueeStart = { ...wp };
          marqueeEnd = { ...wp };
          if (!e.shiftKey) {
            selectedElementId.set(null);
            selectedElementIds.set(new Set());
          }
          selectedRoomId.set(null);
        }
      }
    } else if (tool === 'door') {
      const wall = findWallAt(wp);
      if (wall) {
        addDoor(wall.id, positionOnWall(wp, wall), currentDoorType);
        selectedTool.set('select');
      }
    } else if (tool === 'window') {
      const wall = findWallAt(wp);
      if (wall) {
        addWindow(wall.id, positionOnWall(wp, wall), currentWindowType);
        selectedTool.set('select');
      }
    }
  }

  function onDblClick(e: MouseEvent) {
    const rect = canvas.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    const R = RULER_SIZE;
    const selectionPoint = e.detail >= 2 && sameSelectionPress(e) ? selectionPress!.world : screenToWorld(sx, sy);
    selectionPress = null;

    // Double-click on horizontal ruler → add horizontal guide
    if (sy < R && sx > R) {
      const wp = screenToWorld(sx, sy);
      addGuide('horizontal', wp.y);
      return;
    }
    // Double-click on vertical ruler → add vertical guide
    if (sx < R && sy > R) {
      const wp = screenToWorld(sx, sy);
      addGuide('vertical', wp.x);
      return;
    }

    // Double-click on a text annotation to edit it
    if (currentTool === 'select' && currentFloor) {
      const wp = selectionPoint;
      const textHitId = hitTestTextAnnotation(wp, currentFloor);
      if (textHitId) {
        const ta = currentFloor.textAnnotations?.find(t => t.id === textHitId);
        if (ta) {
          const sp = worldToScreen(ta.x, ta.y);
          editingTextAnnotationId = textHitId;
          editingTextAnnotationPos = { x: sp.x, y: sp.y };
          editingTextAnnotationValue = ta.text;
          selectedTextAnnotationId = textHitId;
          selectedElementId.set(textHitId);
          return;
        }
      }
    }

    // Double-click on a room to edit its name inline
    if (currentTool === 'select') {
      const wp = selectionPoint;
      const room = findRoomLabelAt(wp) ?? findRoomAt(wp);
      if (room) {
        const poly = (roomPolygons.get(room.id) ?? []);
        const centroid = roomLabelPosition(room, poly);
        const sc = worldToScreen(centroid.x, centroid.y);
        editingRoomId = room.id;
        editingRoomName = room.name;
        editingRoomPos = { x: sc.x, y: sc.y };
        selectedRoomId.set(room.id);
        return;
      }
    }

    // Double-click on a wall in select mode to split it
    if (currentTool === 'select') {
      const wp = selectionPoint;
      const wall = findWallAt(wp);
      if (wall && !wall.curvePoint) {
        const t = positionOnWall(wp, wall);
        if (t > 0.05 && t < 0.95) {
          const newId = splitWall(wall.id, t);
          if (newId) {
            selectedElementId.set(null);
            return;
          }
        }
      }
    }
    if (currentTool === 'wall' && wallStart && wallSequenceFirst) {
      // Auto-close the wall loop back to the first point if we have at least 2 walls
      if (Math.hypot(wallStart.x - wallSequenceFirst.x, wallStart.y - wallSequenceFirst.y) > 5) {
        addWall(wallStart, wallSequenceFirst);
      }
      wallStart = null;
      wallSequenceFirst = null;
    }
  }

  function onMouseMove(e: MouseEvent) {
    // Recover if a release outside the window was never delivered to this page.
    if (canvasGestureActive && e.buttons === 0) finishCanvasGesture();
    markDirty();
    const rect = canvas.getBoundingClientRect();
    mousePos = screenToWorld(e.clientX - rect.left, e.clientY - rect.top);

    if ((draggingFurnitureId || draggingHandle) && !furnitureGestureStarted) {
      // Treat small pointer movement during a click as selection, not a snapped move.
      if (Math.hypot(e.clientX - canvasPressPosition.x, e.clientY - canvasPressPosition.y) < 3) return;
      beginUndoGroup();
      furnitureGestureStarted = true;
    }

    if ((draggingWallEndpoint || draggingWallParallel || draggingCurveHandle || draggingRoomId
      || draggingStairId || draggingColumnId || draggingTextAnnotationId || draggingMultiSelect
      || draggingDoorId || draggingWindowId || draggingGuideId || draggingEntourageId || resizingEntourageId) && !geometryGestureStarted) {
      if (Math.hypot(e.clientX - canvasPressPosition.x, e.clientY - canvasPressPosition.y) < 3) return;
      beginUndoGroup();
      geometryGestureStarted = true;
    }

    // Drag room label using screen deltas so sidebar layout changes cannot
    // masquerade as pointer movement. A click must not create a drag history item.
    if (draggingRoomLabelId) {
      const dx = e.clientX - roomLabelDragStart.x, dy = e.clientY - roomLabelDragStart.y;
      if (!roomLabelDragOffset && Math.hypot(dx, dy) < 3) return;
      if (!roomLabelDragOffset) beginUndoGroup();
      const newOffset = { x: roomLabelOrigOffset.x + dx / roomLabelDragZoom, y: roomLabelOrigOffset.y + dy / roomLabelDragZoom };
      roomLabelDragOffset = newOffset;
      detectedRoomsStore.update(rooms => rooms.map(r => r.id === draggingRoomLabelId ? { ...r, labelOffset: newOffset } : r));
      return;
    }

    // Drag guide line
    if (draggingGuideId && currentFloor?.guides) {
      const g = currentFloor.guides.find(g => g.id === draggingGuideId);
      if (g) {
        const newPos = g.orientation === 'horizontal' ? mousePos.y : mousePos.x;
        moveGuide(draggingGuideId, snap(newPos));
      }
      return;
    }
    if (isPanning) {
      camX -= (e.clientX - panStartX) / zoom;
      camY -= (e.clientY - panStartY) / zoom;
      panStartX = e.clientX;
      panStartY = e.clientY;
    }
    if (draggingWallEndpoint) {
      // Exclude the dragged wall and all connected walls from magnetic snap targets
      const excludeIds = new Set<string>([draggingWallEndpoint.wallId, ...draggingConnectedEndpoints.map(c => c.wallId)]);
      let pt = magneticSnap(mousePos, excludeIds);
      // Angle snap to the opposite endpoint of the primary wall being dragged
      if (currentFloor) {
        const wall = currentFloor.walls.find(w => w.id === draggingWallEndpoint!.wallId);
        if (wall) {
          const other = draggingWallEndpoint.endpoint === 'start' ? wall.end : wall.start;
          pt = angleSnap(other, pt);
        }
      }
      moveWallEndpoint(draggingWallEndpoint.wallId, draggingWallEndpoint.endpoint, pt);
      // Move all connected endpoints together
      for (const conn of draggingConnectedEndpoints) {
        moveWallEndpoint(conn.wallId, conn.endpoint, pt);
      }
    }
    if (draggingWallParallel && currentFloor) {
      const wall = currentFloor.walls.find(w => w.id === draggingWallParallel!.wallId);
      if (wall) {
        // Free movement in all directions
        {
          const mdx = mousePos.x - draggingWallParallel.startMousePos.x;
          const mdy = mousePos.y - draggingWallParallel.startMousePos.y;
          // Snap delta to grid
          const snapStep = currentSnapToGrid ? currentGridSize : SNAP;
          const dx = Math.round(mdx / snapStep) * snapStep;
          const dy = Math.round(mdy / snapStep) * snapStep;
          // Set wall positions from original + offset
          const newStart = {
            x: draggingWallParallel.origStart.x + dx,
            y: draggingWallParallel.origStart.y + dy,
          };
          const newEnd = {
            x: draggingWallParallel.origEnd.x + dx,
            y: draggingWallParallel.origEnd.y + dy,
          };
          moveWallEndpoint(draggingWallParallel.wallId, 'start', newStart);
          moveWallEndpoint(draggingWallParallel.wallId, 'end', newEnd);
          // Move connected walls' shared endpoints so adjacent walls stretch to stay connected
          for (const conn of draggingWallParallel.connectedStart) {
            moveWallEndpoint(conn.wallId, conn.endpoint, newStart);
          }
          for (const conn of draggingWallParallel.connectedEnd) {
            moveWallEndpoint(conn.wallId, conn.endpoint, newEnd);
          }
        }
      }
    }
    if (draggingMultiSelect && currentFloor) {
      const mSnapStep = currentSnapToGrid ? currentGridSize : SNAP;
      const dx = Math.round((mousePos.x - draggingMultiSelect.startMousePos.x) / mSnapStep) * mSnapStep;
      const dy = Math.round((mousePos.y - draggingMultiSelect.startMousePos.y) / mSnapStep) * mSnapStep;
      for (const [id, orig] of draggingMultiSelect.origPositions) {
        if (orig.start && orig.end) {
          const endpoints = { x1: orig.start.x + dx, y1: orig.start.y + dy, x2: orig.end.x + dx, y2: orig.end.y + dy };
          if (currentFloor.measurements?.some(item => item.id === id)) { updateMeasurement(id, endpoints); continue; }
          if (currentFloor.annotations?.some(item => item.id === id)) { updateAnnotation(id, endpoints); continue; }
          // Wall — move both endpoints
          moveWallEndpoint(id, 'start', { x: orig.start.x + dx, y: orig.start.y + dy });
          moveWallEndpoint(id, 'end', { x: orig.end.x + dx, y: orig.end.y + dy });
        } else if (orig.position) {
          // Furniture, stair, column, or entourage
          const newPos = { x: orig.position.x + dx, y: orig.position.y + dy };
          if (currentFloor.textAnnotations?.some(item => item.id === id)) { moveTextAnnotation(id, newPos); continue; }
          const fi = currentFloor.furniture.find(f => f.id === id);
          if (fi) { moveFurniture(id, newPos); continue; }
          if (currentFloor.stairs) { const st = currentFloor.stairs.find(s => s.id === id); if (st) { moveStair(id, newPos); continue; } }
          if (currentFloor.columns) { const col = currentFloor.columns.find(c => c.id === id); if (col) { moveColumn(id, newPos); continue; } }
          if (currentFloor.entourage?.some(item => item.id === id)) moveEntourage(id, newPos);
        }
      }
    }
    if (draggingRoomId && currentFloor && roomDragStartPositions.size > 0) {
      const rSnapStep = currentSnapToGrid ? currentGridSize : SNAP;
      const dx = Math.round((mousePos.x - roomDragStartMouse.x) / rSnapStep) * rSnapStep;
      const dy = Math.round((mousePos.y - roomDragStartMouse.y) / rSnapStep) * rSnapStep;
      for (const [wid, orig] of roomDragStartPositions) {
        moveWallEndpoint(wid, 'start', { x: orig.start.x + dx, y: orig.start.y + dy });
        moveWallEndpoint(wid, 'end', { x: orig.end.x + dx, y: orig.end.y + dy });
      }
    }
    if (draggingCurveHandle && currentFloor) {
      const wall = currentFloor.walls.find(w => w.id === draggingCurveHandle);
      if (wall) {
        // Check if mouse is close enough to the straight line (if so, snap back to straight)
        const mx = (wall.start.x + wall.end.x) / 2;
        const my = (wall.start.y + wall.end.y) / 2;
        const distToMid = Math.hypot(mousePos.x - mx, mousePos.y - my);
        if (distToMid < 5) {
          // Snap back to straight wall
          updateWall(draggingCurveHandle, { curvePoint: undefined });
        } else {
          updateWall(draggingCurveHandle, { curvePoint: { x: snap(mousePos.x), y: snap(mousePos.y) } });
        }
      }
    }
    if (draggingHandle && currentSelectedId && currentFloor) {
      const fi = currentFloor.furniture.find(f => f.id === currentSelectedId);
      if (fi) {
        if (draggingHandle === 'rotate') {
          // Rotate based on angle from furniture center to mouse
          const dx = mousePos.x - fi.position.x;
          const dy = mousePos.y - fi.position.y;
          let angle = Math.atan2(dx, -dy) * 180 / Math.PI; // 0° = up
          // Hold Shift to snap to 15° increments; otherwise free rotation
          if (shiftDown) {
            angle = Math.round(angle / 15) * 15;
          }
          transformFurnitureDuringDrag(currentSelectedId, { rotation: ((angle % 360) + 360) % 360 });
        } else {
          const resized = resizeFurnitureFromHandle({
            position: handleOrigPosition,
            rotation: handleOrigRotation,
            width: handleOrigBaseSize.width,
            depth: handleOrigBaseSize.depth,
            scale: handleOrigScale,
            handle: draggingHandle,
            pointer: mousePos,
            preserveAspectRatio: shiftDown,
          });
          transformFurnitureDuringDrag(currentSelectedId, {
            position: resized.position,
            scale: { ...resized.scale, z: fi.scale?.z ?? 1 },
          });
        }
      }
    }
    if (draggingTextAnnotationId && currentFloor?.textAnnotations) {
      const basePos = { x: mousePos.x - textAnnotationDragOffset.x, y: mousePos.y - textAnnotationDragOffset.y };
      moveTextAnnotation(draggingTextAnnotationId, { x: snap(basePos.x), y: snap(basePos.y) });
      // Update inline editor position if open
      if (editingTextAnnotationId === draggingTextAnnotationId) {
        const sp = worldToScreen(snap(basePos.x), snap(basePos.y));
        editingTextAnnotationPos = { x: sp.x, y: sp.y };
      }
    }
    if (draggingColumnId && currentFloor?.columns) {
      const basePos = { x: mousePos.x - columnDragOffset.x, y: mousePos.y - columnDragOffset.y };
      moveColumn(draggingColumnId, { x: snap(basePos.x), y: snap(basePos.y) });
    }
    if (draggingStairId && currentFloor?.stairs) {
      const basePos = { x: mousePos.x - stairDragOffset.x, y: mousePos.y - stairDragOffset.y };
      moveStair(draggingStairId, { x: snap(basePos.x), y: snap(basePos.y) });
    }
    if (draggingEntourageId) {
      const basePos = { x: mousePos.x - dragOffset.x, y: mousePos.y - dragOffset.y };
      moveEntourage(draggingEntourageId, { x: snap(basePos.x), y: snap(basePos.y) });
    }
    if (resizingEntourageId) {
      const it = currentFloor?.entourage?.find(en => en.id === resizingEntourageId);
      if (it) {
        const entAspect = entourageAspect(it.defId, customEntourageDefs) || 1;
        const ea = (-(it.rotation || 0) * Math.PI) / 180;
        const dx = mousePos.x - it.position.x, dy = mousePos.y - it.position.y;
        const lx = Math.abs(dx * Math.cos(ea) - dy * Math.sin(ea));
        const ly = Math.abs(dx * Math.sin(ea) + dy * Math.cos(ea));
        resizeEntourage(it.id, Math.max(10, Math.max(lx * 2, (ly * 2) / entAspect)));
      }
    }
    if (draggingFurnitureId) {
      const basePos = { x: mousePos.x - dragOffset.x, y: mousePos.y - dragOffset.y };
      const fi = currentFloor?.furniture.find(f => f.id === draggingFurnitureId);
      if (fi) {
        const wallSnap = snapFurnitureToWall(basePos, fi);
        if (wallSnap) {
          transformFurnitureDuringDrag(draggingFurnitureId, { position: wallSnap.position, rotation: wallSnap.rotation });
          dragWasWallSnapped = true;
          wallSnapInfo = { wallId: wallSnap.wallId, side: wallSnap.side, wallAngle: wallSnap.wallAngle };
        } else {
          const snapped = { x: snap(basePos.x), y: snap(basePos.y) };
          // Snap to guide lines
          const GUIDE_SNAP = 10; // world units
          if (currentFloor?.guides) {
            for (const g of currentFloor.guides) {
              if (g.orientation === 'horizontal' && Math.abs(snapped.y - g.position) < GUIDE_SNAP) {
                snapped.y = g.position;
              }
              if (g.orientation === 'vertical' && Math.abs(snapped.x - g.position) < GUIDE_SNAP) {
                snapped.x = g.position;
              }
            }
          }
          transformFurnitureDuringDrag(draggingFurnitureId, {
            position: snapped,
            ...(dragWasWallSnapped ? { rotation: dragStartRotation } : {}),
          });
          dragWasWallSnapped = false;
          wallSnapInfo = null;
        }
      }
    }
    if (draggingDoorId && currentFloor) {
      const door = currentFloor.doors.find(d => d.id === draggingDoorId);
      if (door) {
        const wall = currentFloor.walls.find(w => w.id === door.wallId);
        if (wall) {
          const newPos = positionOnWall(mousePos, wall);
          updateDoor(door.id, { position: newPos });
        }
      }
    }
    if (draggingWindowId && currentFloor) {
      const win = currentFloor.windows.find(w => w.id === draggingWindowId);
      if (win) {
        const wall = currentFloor.walls.find(w => w.id === win.wallId);
        if (wall) {
          const newPos = positionOnWall(mousePos, wall);
          updateWindow(win.id, { position: newPos });
        }
      }
    }
    // Door/window placement preview
    if ((currentTool === 'door' || currentTool === 'window') && currentFloor) {
      const wall = findWallAt(mousePos);
      if (wall) {
        placementPreview = { wallId: wall.id, position: positionOnWall(mousePos, wall), type: currentTool as 'door' | 'window' };
      } else {
        placementPreview = null;
      }
    } else {
      placementPreview = null;
    }

    // Marquee drag update
    if (marqueeStart) {
      marqueeEnd = { ...mousePos };
    }

    if (measuring && measureStart) {
      measureEnd = { ...mousePos };
    }
  }

  function onMouseUp(e: MouseEvent) {
    markDirty();
    canvasGestureActive = false;
    isPanning = false;
    draggingGuideId = null;

    // Finalize only actual label movement, never a selection click.
    if (draggingRoomLabelId) {
      if (roomLabelDragOffset) {
        updateRoom(draggingRoomLabelId, { labelOffset: roomLabelDragOffset });
        endUndoGroup('Move room label');
      }
      draggingRoomLabelId = null;
      roomLabelDragOffset = null;
    }

    // Finalize marquee selection
    if (marqueeStart && marqueeEnd && currentFloor) {
      const minX = Math.min(marqueeStart.x, marqueeEnd.x);
      const maxX = Math.max(marqueeStart.x, marqueeEnd.x);
      const minY = Math.min(marqueeStart.y, marqueeEnd.y);
      const maxY = Math.max(marqueeStart.y, marqueeEnd.y);
      const marqueeW = maxX - minX;
      const marqueeH = maxY - minY;

      // Only treat as marquee if dragged at least a small distance
      if (marqueeW > 5 || marqueeH > 5) {
        const ids = new Set<string>(e.shiftKey ? currentSelectedIds : []);

        function ptInRect(p: Point) {
          return p.x >= minX && p.x <= maxX && p.y >= minY && p.y <= maxY;
        }

        // Walls: both endpoints inside
        for (const w of currentFloor.walls) {
          if (ptInRect(w.start) && ptInRect(w.end)) ids.add(w.id);
        }
        // Doors/windows: center point inside
        for (const d of currentFloor.doors) {
          const w = currentFloor.walls.find(w => w.id === d.wallId);
          if (w) {
            const cx = w.start.x + (w.end.x - w.start.x) * d.position;
            const cy = w.start.y + (w.end.y - w.start.y) * d.position;
            if (ptInRect({ x: cx, y: cy })) ids.add(d.id);
          }
        }
        for (const win of currentFloor.windows) {
          const w = currentFloor.walls.find(w => w.id === win.wallId);
          if (w) {
            const cx = w.start.x + (w.end.x - w.start.x) * win.position;
            const cy = w.start.y + (w.end.y - w.start.y) * win.position;
            if (ptInRect({ x: cx, y: cy })) ids.add(win.id);
          }
        }
        // Furniture: center inside
        for (const fi of currentFloor.furniture) {
          if (ptInRect(fi.position)) ids.add(fi.id);
        }
        // Stairs: center inside
        if (currentFloor.stairs) {
          for (const st of currentFloor.stairs) {
            if (ptInRect(st.position)) ids.add(st.id);
          }
        }
        // Columns: center inside
        if (currentFloor.columns) {
          for (const col of currentFloor.columns) {
            if (ptInRect(col.position)) ids.add(col.id);
          }
        }

        for (const item of currentFloor.entourage ?? []) {
          if (ptInRect(item.position)) ids.add(item.id);
        }

        for (const item of currentFloor.textAnnotations ?? []) {
          if (ptInRect(item)) ids.add(item.id);
        }
        for (const item of [...currentFloor.measurements ?? [], ...currentFloor.annotations ?? []]) {
          if (ptInRect({ x: item.x1, y: item.y1 }) && ptInRect({ x: item.x2, y: item.y2 })) ids.add(item.id);
        }

        if (ids.size > 0) {
          clearAuxiliarySelection();
          selectedRoomId.set(null);
          selectedElementIds.set(ids);
          // Set primary selection to first element
          const first = ids.values().next().value;
          if (first) selectedElementId.set(first);
        }
      }
      marqueeStart = null;
      marqueeEnd = null;
    }

    if (furnitureGestureStarted) {
      endUndoGroup(draggingHandle === 'rotate' ? 'Rotated furniture' : draggingHandle ? 'Resized furniture' : 'Moved furniture');
      furnitureGestureStarted = false;
    }
    if (geometryGestureStarted) {
      endUndoGroup('Moved plan geometry');
      geometryGestureStarted = false;
    }
    draggingTextAnnotationId = null;
    draggingRoomId = null;
    roomDragStartPositions.clear();
    draggingMultiSelect = null;
    draggingWallParallel = null;
    draggingCurveHandle = null;
    draggingFurnitureId = null;
    draggingEntourageId = null;
    resizingEntourageId = null;
    draggingStairId = null;
    draggingColumnId = null;
    draggingDoorId = null;
    draggingWindowId = null;
    draggingHandle = null;
    draggingWallEndpoint = null;
    draggingConnectedEndpoints = [];
    wallSnapInfo = null;
  }

  function onWheel(e: WheelEvent) {
    markDirty();
    e.preventDefault();
    if (currentPlacingId && !e.ctrlKey) {
      // Rotate furniture preview
      const delta = e.deltaY > 0 ? 15 : -15;
      placingRotation.update(r => (r + delta) % 360);
      return;
    }

    const rect = canvas.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;

    if (e.ctrlKey) {
      // Pinch-to-zoom on trackpad (or Ctrl+scroll)
      const factor = e.deltaY > 0 ? 0.95 : 1.05;
      const newZoom = Math.max(minimumZoom, Math.min(10, zoom * factor));
      // Zoom towards cursor position
      const worldX = (sx - width / 2) / zoom + camX;
      const worldY = (sy - height / 2) / zoom + camY;
      camX = worldX - (sx - width / 2) / newZoom;
      camY = worldY - (sy - height / 2) / newZoom;
      zoom = newZoom;
    } else if (Math.abs(e.deltaX) > 0) {
      // Two-finger trackpad pan (deltaX present means trackpad gesture)
      camX += e.deltaX / zoom;
      camY += e.deltaY / zoom;
    } else {
      // Regular scroll wheel: zoom towards cursor
      const factor = e.deltaY > 0 ? 0.9 : 1.1;
      const newZoom = Math.max(minimumZoom, Math.min(10, zoom * factor));
      // Zoom towards cursor position
      const worldX = (sx - width / 2) / zoom + camX;
      const worldY = (sy - height / 2) / zoom + camY;
      camX = worldX - (sx - width / 2) / newZoom;
      camY = worldY - (sy - height / 2) / newZoom;
      zoom = newZoom;
    }
  }

  // ── Touch input (phones/tablets) ──────────────────────────────────
  // One finger drives the existing mouse pipeline via synthetic MouseEvents
  // (so every tool works unchanged); two fingers pinch-zoom and pan.
  // Listeners are registered manually in onMount with { passive: false }
  // because we must preventDefault to stop scrolling and the browser's
  // compatibility mouse events (which would double-fire the handlers).
  let pinchState: { dist: number; cx: number; cy: number } | null = null;
  let singleTouchActive = false;
  let lastTapTime = 0;
  let lastTapX = 0;
  let lastTapY = 0;

  function dispatchMouse(type: 'mousedown' | 'mousemove' | 'mouseup' | 'click' | 'dblclick', clientX: number, clientY: number) {
    canvas.dispatchEvent(new MouseEvent(type, {
      clientX,
      clientY,
      button: 0,
      buttons: type === 'mousedown' || type === 'mousemove' ? 1 : 0,
      bubbles: true,
      cancelable: true,
    }));
  }

  function onTouchStart(e: TouchEvent) {
    e.preventDefault();
    if (e.touches.length === 1) {
      singleTouchActive = true;
      dispatchMouse('mousedown', e.touches[0].clientX, e.touches[0].clientY);
    } else if (e.touches.length === 2) {
      // Second finger landed: abandon any single-finger drag and start pinching
      if (singleTouchActive) {
        dispatchMouse('mouseup', e.touches[0].clientX, e.touches[0].clientY);
        singleTouchActive = false;
      }
      const a = e.touches[0], b = e.touches[1];
      pinchState = {
        dist: Math.hypot(b.clientX - a.clientX, b.clientY - a.clientY),
        cx: (a.clientX + b.clientX) / 2,
        cy: (a.clientY + b.clientY) / 2,
      };
    }
  }

  function onTouchMove(e: TouchEvent) {
    e.preventDefault();
    if (pinchState && e.touches.length >= 2) {
      const a = e.touches[0], b = e.touches[1];
      const dist = Math.hypot(b.clientX - a.clientX, b.clientY - a.clientY);
      const cx = (a.clientX + b.clientX) / 2;
      const cy = (a.clientY + b.clientY) / 2;
      const rect = canvas.getBoundingClientRect();
      const sx = cx - rect.left, sy = cy - rect.top;
      // Zoom about the pinch midpoint (same math as onWheel)
      const newZoom = Math.max(minimumZoom, Math.min(10, zoom * (dist / (pinchState.dist || dist))));
      const worldX = (sx - width / 2) / zoom + camX;
      const worldY = (sy - height / 2) / zoom + camY;
      camX = worldX - (sx - width / 2) / newZoom;
      camY = worldY - (sy - height / 2) / newZoom;
      zoom = newZoom;
      // Two-finger pan: camera follows the midpoint
      camX -= (cx - pinchState.cx) / newZoom;
      camY -= (cy - pinchState.cy) / newZoom;
      pinchState = { dist, cx, cy };
      markDirty();
    } else if (singleTouchActive && e.touches.length === 1) {
      dispatchMouse('mousemove', e.touches[0].clientX, e.touches[0].clientY);
    }
  }

  function onTouchEnd(e: TouchEvent) {
    e.preventDefault();
    if (pinchState) {
      // Leaving pinch: ignore the remaining finger until it lifts too
      if (e.touches.length < 2) pinchState = null;
      return;
    }
    if (singleTouchActive && e.touches.length === 0) {
      const t = e.changedTouches[0];
      singleTouchActive = false;
      dispatchMouse('mouseup', t.clientX, t.clientY);
      // Synthesize click so document-level click-outside handlers (menus) fire
      dispatchMouse('click', t.clientX, t.clientY);
      // Double-tap → dblclick (finish wall chains, rename rooms, …)
      const now = Date.now();
      if (now - lastTapTime < 350 && Math.hypot(t.clientX - lastTapX, t.clientY - lastTapY) < 30) {
        dispatchMouse('dblclick', t.clientX, t.clientY);
        lastTapTime = 0;
      } else {
        lastTapTime = now;
        lastTapX = t.clientX;
        lastTapY = t.clientY;
      }
    }
  }

  // ── Exact-length wall entry (issue #6) ────────────────────────────
  /** Shared endpoint snapping for wall drawing: magnetic + Shift/angle snap. */
  function snapWallEndPoint(raw: Point): Point {
    let endPt = magneticSnap(raw);
    if (!wallStart) return endPt;
    if (shiftDown) {
      // Force strict angle snap when Shift is held (0°, 45°, 90°, 135°, 180°)
      const sdx = endPt.x - wallStart.x;
      const sdy = endPt.y - wallStart.y;
      const slen = Math.hypot(sdx, sdy);
      if (slen > 5) {
        const rawAngle = Math.atan2(sdy, sdx);
        const snapAngles = [0, Math.PI / 4, Math.PI / 2, 3 * Math.PI / 4, Math.PI, -Math.PI, -3 * Math.PI / 4, -Math.PI / 2, -Math.PI / 4];
        let bestAngle = 0, bestDiff = Infinity;
        for (const sa of snapAngles) { const diff = Math.abs(rawAngle - sa); if (diff < bestDiff) { bestDiff = diff; bestAngle = sa; } }
        endPt = { x: wallStart.x + slen * Math.cos(bestAngle), y: wallStart.y + slen * Math.sin(bestAngle) };
      }
    } else {
      endPt = angleSnap(wallStart, endPt);
    }
    return endPt;
  }

  function typedWallLengthCm(): number | null {
    const v = parseFloat(typedWallLength);
    if (!isFinite(v) || v <= 0) return null;
    return dimSettings.units === 'imperial' ? v * 2.54 : v;
  }

  /** Override the wall end point to the exact typed length along the current direction. */
  function applyTypedWallLength(endPt: Point): Point {
    const lenCm = typedWallLengthCm();
    if (!wallStart || lenCm === null) return endPt;
    const dx = endPt.x - wallStart.x, dy = endPt.y - wallStart.y;
    const d = Math.hypot(dx, dy);
    if (d < 0.001) return endPt;
    return { x: wallStart.x + (dx / d) * lenCm, y: wallStart.y + (dy / d) * lenCm };
  }

  function onKeyDown(e: KeyboardEvent) {
    if (hasOpenModal()) return;
    // This listener is on window, so field keystrokes reach it too. Keep every
    // canvas action (including Space, select/copy/paste and annotation deletion)
    // out of focused inputs; only the explicit Save shortcut is global there.
    if (isEditingField(e.target)) {
      handleGlobalShortcut(e);
      return;
    }
    if (isControlKey(e)) return;
    shiftDown = e.shiftKey;
    if (e.code === 'Space') { spaceDown = true; e.preventDefault(); return; }

    // Exact-length entry while drawing a wall (issue #6):
    // type a number, then Enter places the wall at exactly that length.
    if (currentTool === 'wall' && wallStart && !editingTextAnnotationId && !e.metaKey && !e.ctrlKey) {
      if (/^[0-9.]$/.test(e.key)) {
        typedWallLength += e.key;
        markDirty();
        e.preventDefault();
        return;
      }
      if (e.key === 'Backspace' && typedWallLength) {
        typedWallLength = typedWallLength.slice(0, -1);
        markDirty();
        e.preventDefault();
        return;
      }
      if (e.key === 'Enter' && typedWallLengthCm() !== null) {
        const endPt = applyTypedWallLength(snapWallEndPoint(mousePos));
        if (Math.hypot(endPt.x - wallStart.x, endPt.y - wallStart.y) > 1) {
          addWall(wallStart, endPt);
          wallStart = endPt;
        }
        typedWallLength = '';
        markDirty();
        e.preventDefault();
        return;
      }
    }

    if ((e.key === 'Delete' || e.key === 'Backspace') && currentSelectedIds.size >= 2) clearAuxiliarySelection();

    // Delete selected guide line
    if ((e.key === 'Delete' || e.key === 'Backspace') && currentSelectedIds.size < 2 && selectedGuideId) {
      removeGuide(selectedGuideId);
      selectedGuideId = null;
      selectedElementId.set(null);
      e.preventDefault();
      return;
    }

    // Delete selected measurement
    if ((e.key === 'Delete' || e.key === 'Backspace') && currentSelectedIds.size < 2 && selectedMeasurementId) {
      removeMeasurement(selectedMeasurementId);
      selectedMeasurementId = null;
      selectedElementId.set(null);
      e.preventDefault();
      return;
    }

    // Delete selected text annotation
    if ((e.key === 'Delete' || e.key === 'Backspace') && currentSelectedIds.size < 2 && selectedTextAnnotationId && !editingTextAnnotationId) {
      removeTextAnnotation(selectedTextAnnotationId);
      selectedTextAnnotationId = null;
      selectedElementId.set(null);
      e.preventDefault();
      return;
    }

    // Delete selected annotation
    if ((e.key === 'Delete' || e.key === 'Backspace') && currentSelectedIds.size < 2 && selectedAnnotationId) {
      removeAnnotation(selectedAnnotationId);
      selectedAnnotationId = null;
      selectedElementId.set(null);
      e.preventDefault();
      return;
    }

    // Canvas-specific Escape handling (before global shortcut eats it)
    if (e.code === 'Escape') {
      finishCanvasGesture();
      clearAuxiliarySelection();
      selectedRoomId.set(null);
      elevationPickMode.set(false);
      wallStart = null; wallSequenceFirst = null; typedWallLength = '';
      placingFurnitureId.set(null);
      placingEntourageId.set(null);
      placingRotation.set(0);
      editingTextAnnotationId = null;
      textAnnotationMode = false;
      measureStart = null;
      measureEnd = null;
      annotationStart = null;
      marqueeStart = null;
      marqueeEnd = null;
    }

    // Select All (Ctrl+A / Cmd+A)
    if ((e.ctrlKey || e.metaKey) && e.key === 'a' && !e.shiftKey) {
      e.preventDefault();
      selectAllPlanElements();
      return;
    }

    // Deselect All (Ctrl+D / Cmd+D)
    if ((e.ctrlKey || e.metaKey) && e.key === 'd' && !e.shiftKey) {
      e.preventDefault();
      clearAuxiliarySelection();
      selectedRoomId.set(null);
      selectedElementIds.set(new Set());
      selectedElementId.set(null);
      return;
    }

    // Toggle Lock (Ctrl+L / Cmd+L)
    if ((e.ctrlKey || e.metaKey) && e.key === 'l' && !e.shiftKey) {
      e.preventDefault();
      if (currentFloor) {
        const idsToLock = currentSelectedIds.size > 0 ? currentSelectedIds : (currentSelectedId ? new Set([currentSelectedId]) : new Set<string>());
        toggleSelectionLock(idsToLock);
      }
      return;
    }

    // Group (Ctrl+G / Cmd+G)
    if ((e.ctrlKey || e.metaKey) && e.key === 'g' && !e.shiftKey) {
      e.preventDefault();
      if (currentFloor && currentSelectedIds.size >= 2) {
        createGroup([...currentSelectedIds]);
      }
      return;
    }

    // Ungroup (Ctrl+Shift+G / Cmd+Shift+G)
    if ((e.ctrlKey || e.metaKey) && e.key === 'G' && e.shiftKey) {
      e.preventDefault();
      if (currentFloor) {
        const idsToUngroup = currentSelectedIds.size > 0 ? [...currentSelectedIds] : (currentSelectedId ? [currentSelectedId] : []);
        if (idsToUngroup.length > 0) ungroupElements(idsToUngroup);
      }
      return;
    }

    // Copy (Ctrl+C / Cmd+C)
    if ((e.ctrlKey || e.metaKey) && e.key === 'c' && !e.shiftKey) {
      if (currentFloor) {
        const copyable = [...currentFloor.walls,...currentFloor.doors,...currentFloor.windows,...currentFloor.furniture,
          ...currentFloor.stairs ?? [],...currentFloor.columns ?? [],...currentFloor.entourage ?? [],
          ...currentFloor.textAnnotations ?? [],...currentFloor.measurements ?? [],...currentFloor.annotations ?? []];
        const ids = [...fitSelectionIds()].filter(id => copyable.some(item => item.id === id));
        if (ids.length) {
          clipboard = { floor: structuredClone(get(activeFloor)!), ids, step: 1, projectId: get(currentProject)!.id };
          e.preventDefault();
          return;
        }
      }
    }

    // Paste (Ctrl+V / Cmd+V)
    if ((e.ctrlKey || e.metaKey) && e.key === 'v' && !e.shiftKey) {
      if (clipboard && clipboard.ids.length && currentFloor) {
        e.preventDefault();
        const newIds = pasteSelection(clipboard.floor, new Set(clipboard.ids), clipboard.step);
        if (newIds.length) {
          clipboard = { ...clipboard, step: clipboard.step + 1 };
          selectedElementIds.set(new Set(newIds));
          selectedElementId.set(newIds[0]);
        }
        return;
      }
    }

    // Global shortcuts
    const handled = handleGlobalShortcut(e, {
      rotateFurniture: () => {
        if (currentPlacingId) {
          placingRotation.update(r => (r + 15) % 360);
        } else if (currentFloor) {
          rotateSelection(fitSelectionIds());
        }
      }
    });
    if (handled) return;

    if (e.key === 's' || e.key === 'S') {
      projectSettings.update(s => ({ ...s, snapToGrid: !s.snapToGrid }));
    }
    if (e.key === 'g' || e.key === 'G') {
      showGrid = !showGrid;
    }
    if ((e.key === 'f' || e.key === 'F') && !e.ctrlKey && !e.metaKey && !e.altKey) {
      e.preventDefault();
      zoomToFit(e.shiftKey);
    }
    // 'C' to close wall loop back to first point (but not Ctrl+C)
    if ((e.key === 'c' || e.key === 'C') && !e.ctrlKey && !e.metaKey && wallStart && wallSequenceFirst) {
      if (Math.hypot(wallStart.x - wallSequenceFirst.x, wallStart.y - wallSequenceFirst.y) > 5) {
        addWall(wallStart, wallSequenceFirst);
        wallStart = null;
        wallSequenceFirst = null;
      }
    }
  }

  function onKeyUp(e: KeyboardEvent) {
    shiftDown = e.shiftKey;
    if (e.code === 'Space') spaceDown = false;
  }

  function onDragOver(e: DragEvent) {
    if (e.dataTransfer?.types.includes('application/o3d-type')) {
      e.preventDefault();
      if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy';
      const rect = canvas.getBoundingClientRect();
      const wp = screenToWorld(e.clientX - rect.left, e.clientY - rect.top);
      const itemType = e.dataTransfer?.types.includes('application/o3d-type') ? 'item' : '';
      // Default preview size (furniture ~60x60cm, room ~400x300cm)
      const isRoom = e.dataTransfer?.types.includes('application/o3d-type');
      dragPreview = { x: wp.x, y: wp.y, type: itemType, width: 60, depth: 60 };
    }
  }

  function onDragLeave(e: DragEvent) {
    dragPreview = null;
  }

  function onDrop(e: DragEvent) {
    e.preventDefault();
    dragPreview = null;
    const itemType = e.dataTransfer?.getData('application/o3d-type');
    const itemId = e.dataTransfer?.getData('application/o3d-id');
    if (!itemType || !itemId) return;

    const rect = canvas.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    const wp = screenToWorld(sx, sy);
    const pos = { x: snap(wp.x), y: snap(wp.y) };

    if (itemType === 'furniture') {
      const id = addFurniture(itemId, pos);
      selectedElementId.set(id);
      selectedTool.set('select');
      placingFurnitureId.set(null);
    } else if (itemType === 'door') {
      // Find nearest wall to drop point and add door there
      const floor = currentFloor;
      if (floor) {
        let bestWall: Wall | null = null;
        let bestDist = Infinity;
        let bestT = 0.5;
        for (const w of floor.walls) {
          const dx = w.end.x - w.start.x;
          const dy = w.end.y - w.start.y;
          const lenSq = dx * dx + dy * dy;
          if (lenSq < 1) continue;
          const t = Math.max(0.05, Math.min(0.95, ((wp.x - w.start.x) * dx + (wp.y - w.start.y) * dy) / lenSq));
          const px = w.start.x + t * dx;
          const py = w.start.y + t * dy;
          const dist = Math.hypot(wp.x - px, wp.y - py);
          if (dist < bestDist) { bestDist = dist; bestWall = w; bestT = t; }
        }
        if (bestWall && bestDist < 100) {
          const id = addDoor(bestWall.id, bestT, itemId as Door['type']);
          selectedElementId.set(id);
          selectedTool.set('select');
        }
      }
    } else if (itemType === 'window') {
      const floor = currentFloor;
      if (floor) {
        let bestWall: Wall | null = null;
        let bestDist = Infinity;
        let bestT = 0.5;
        for (const w of floor.walls) {
          const dx = w.end.x - w.start.x;
          const dy = w.end.y - w.start.y;
          const lenSq = dx * dx + dy * dy;
          if (lenSq < 1) continue;
          const t = Math.max(0.05, Math.min(0.95, ((wp.x - w.start.x) * dx + (wp.y - w.start.y) * dy) / lenSq));
          const px = w.start.x + t * dx;
          const py = w.start.y + t * dy;
          const dist = Math.hypot(wp.x - px, wp.y - py);
          if (dist < bestDist) { bestDist = dist; bestWall = w; bestT = t; }
        }
        if (bestWall && bestDist < 100) {
          const id = addWindow(bestWall.id, bestT, itemId as Win['type']);
          selectedElementId.set(id);
          selectedTool.set('select');
        }
      }
    } else if (itemType === 'room') {
      const preset = roomPresets.find(p => p.id === itemId);
      if (preset) {
        placePreset(preset, pos);
        selectedTool.set('select');
      }
    }
  }

  function placeMeasurementPoint(point: Point) {
    if (!measureStart) {
      measureStart = point;
      measureEnd = null;
    } else {
      if (Math.hypot(point.x - measureStart.x, point.y - measureStart.y) > 0) {
        addMeasurement(measureStart.x, measureStart.y, point.x, point.y);
      }
      measureStart = null;
      measureEnd = null;
    }
    markDirty();
  }

  function onContextMenu(e: MouseEvent) {
    e.preventDefault();

    // Keep right-click measurement available alongside clicks and taps.
    if (measuring) {
      const rect = canvas.getBoundingClientRect();
      placeMeasurementPoint(screenToWorld(e.clientX - rect.left, e.clientY - rect.top));
      return;
    }

    // Show context menu
    const rect = canvas.getBoundingClientRect();
    const wp = screenToWorld(e.clientX - rect.left, e.clientY - rect.top);

    // Hit-test in priority order: furniture > door > window > wall > room > canvas
    const fi = findFurnitureAt(wp);
    if (fi) {
      selectedElementId.set(fi.id);
      ctxMenuTargetType = 'furniture';
      ctxMenuTargetId = fi.id;
      ctxMenuFurniture = fi;
      ctxMenuWall = null;
      ctxMenuRoom = null;
    } else {
      const door = findDoorAt(wp);
      if (door) {
        selectedElementId.set(door.id);
        ctxMenuTargetType = 'door';
        ctxMenuTargetId = door.id;
        ctxMenuFurniture = null;
        ctxMenuWall = null;
        ctxMenuRoom = null;
      } else {
        const win = findWindowAt(wp);
        if (win) {
          selectedElementId.set(win.id);
          ctxMenuTargetType = 'window';
          ctxMenuTargetId = win.id;
          ctxMenuFurniture = null;
          ctxMenuWall = null;
          ctxMenuRoom = null;
        } else {
          const wall = findWallAt(wp);
          if (wall) {
            selectedElementId.set(wall.id);
            ctxMenuTargetType = 'wall';
            ctxMenuTargetId = wall.id;
            ctxMenuWall = wall;
            ctxMenuFurniture = null;
            ctxMenuRoom = null;
          } else {
            const room = findRoomLabelAt(wp) ?? findRoomAt(wp);
            if (room) {
              selectedRoomId.set(room.id);
              ctxMenuTargetType = 'room';
              ctxMenuTargetId = room.id;
              ctxMenuRoom = room;
              ctxMenuWall = null;
              ctxMenuFurniture = null;
            } else {
              ctxMenuTargetType = 'canvas';
              ctxMenuTargetId = null;
              ctxMenuWall = null;
              ctxMenuFurniture = null;
              ctxMenuRoom = null;
            }
          }
        }
      }
    }

    ctxMenuX = e.clientX;
    ctxMenuY = e.clientY;
    ctxMenuVisible = true;
  }

  function handleContextMenuAction(action: string, _data?: any) {
    if (!currentFloor) return;
    const id = ctxMenuTargetId;

    switch (action) {
      // Furniture actions
      case 'duplicate-furniture':
        if (id) { const newId = duplicateFurniture(id); if (newId) selectedElementId.set(newId); }
        break;
      case 'rotate-furniture-90':
        if (id) rotateFurniture(id, 90);
        break;
      case 'flip-horizontal':
        if (id) {
          const fi = currentFloor.furniture.find(f => f.id === id);
          if (fi) scaleFurniture(id, { x: -(fi.scale?.x ?? 1), y: fi.scale?.y ?? 1 });
        }
        break;
      case 'bring-to-front':
        if (id) {
          const idx = currentFloor.furniture.findIndex(f => f.id === id);
          if (idx >= 0) {
            const [item] = currentFloor.furniture.splice(idx, 1);
            currentFloor.furniture.push(item);
            markDirty();
          }
        }
        break;
      case 'send-to-back':
        if (id) {
          const idx = currentFloor.furniture.findIndex(f => f.id === id);
          if (idx >= 0) {
            const [item] = currentFloor.furniture.splice(idx, 1);
            currentFloor.furniture.unshift(item);
            markDirty();
          }
        }
        break;

      // Wall actions
      case 'split-wall':
        if (id) { const newId = splitWall(id, 0.5); if (newId) selectedElementId.set(null); }
        break;
      case 'toggle-curve':
        if (id && ctxMenuWall) {
          if (ctxMenuWall.curvePoint) {
            updateWall(id, { curvePoint: undefined } as any);
          } else {
            const mx = (ctxMenuWall.start.x + ctxMenuWall.end.x) / 2;
            const my = (ctxMenuWall.start.y + ctxMenuWall.end.y) / 2;
            const dx = ctxMenuWall.end.x - ctxMenuWall.start.x;
            const dy = ctxMenuWall.end.y - ctxMenuWall.start.y;
            const len = Math.hypot(dx, dy) || 1;
            updateWall(id, { curvePoint: { x: mx + (-dy / len) * 50, y: my + (dx / len) * 50 } });
          }
        }
        break;

      // Room actions
      case 'reset-room-label':
        if (ctxMenuRoom) {
          updateRoom(ctxMenuRoom.id, { labelOffset: undefined });
          detectedRoomsStore.update(rooms => rooms.map(room => room.id === ctxMenuRoom!.id ? { ...room, labelOffset: undefined } : room));
        }
        break;
      case 'rename-room':
        if (ctxMenuRoom) {
          // Trigger inline rename via existing mechanism
          const poly = (roomPolygons.get(ctxMenuRoom.id) ?? []);
          const centroid = roomLabelPosition(ctxMenuRoom, poly);
          const sp = worldToScreen(centroid.x, centroid.y);
          editingRoomId = ctxMenuRoom.id;
          editingRoomName = ctxMenuRoom.name;
          editingRoomPos = { x: sp.x, y: sp.y };
        }
        break;
      case 'change-floor-texture':
        // Select the room so PropertiesPanel shows it
        if (ctxMenuRoom) selectedRoomId.set(ctxMenuRoom.id);
        break;
      case 'delete-room':
        if (ctxMenuRoom) {
          beginUndoGroup();
          for (const wid of ctxMenuRoom.walls) removeElement(wid);
          endUndoGroup();
          selectedRoomId.set(null);
        }
        break;

      // Canvas actions
      case 'paste':
        // Trigger paste via synthetic keyboard event
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'v', ctrlKey: true, metaKey: true }));
        break;
      case 'select-all':
        selectAllPlanElements();
        break;
      case 'add-wall':
        selectedTool.set('wall');
        break;
      case 'zoom-to-fit':
        zoomToFit();
        break;

      // Lock/Unlock
      case 'toggle-lock':
        if (id) toggleFurnitureLock(id);
        break;

      // Group/Ungroup
      case 'group':
        if (currentFloor && currentSelectedIds.size >= 2) {
          createGroup([...currentSelectedIds]);
        }
        break;
      case 'ungroup':
        if (currentFloor) {
          const idsToUngroup = currentSelectedIds.size > 0 ? [...currentSelectedIds] : (id ? [id] : []);
          if (idsToUngroup.length > 0) ungroupElements(idsToUngroup);
        }
        break;

      // Shared actions
      case 'delete':
        if (id) { removeElement(id); selectedElementId.set(null); }
        break;
      case 'properties':
        // Select element so PropertiesPanel shows it
        if (id) selectedElementId.set(id);
        break;
    }
  }

  let cursorStyle = $derived(
    spaceDown || isPanning || $panMode || (shiftDown && currentTool === 'select') ? 'grab' :
    pickingElevation ? 'crosshair' :
    draggingFurnitureId ? 'move' :
    draggingRoomId ? 'move' :
    draggingMultiSelect ? 'move' :
    draggingDoorId ? 'move' :
    draggingWindowId ? 'move' :
    draggingStairId ? 'move' :
    draggingColumnId ? 'move' :
    draggingTextAnnotationId ? 'move' :
    draggingWallParallel ? 'move' :
    draggingCurveHandle ? 'crosshair' :
    draggingWallEndpoint ? 'crosshair' :
    draggingHandle === 'rotate' ? 'grabbing' :
    (draggingHandle === 'resize-t' || draggingHandle === 'resize-b') ? 'ns-resize' :
    (draggingHandle === 'resize-l' || draggingHandle === 'resize-r') ? 'ew-resize' :
    draggingHandle?.startsWith('resize') ? 'nwse-resize' :
    currentTool === 'text' ? 'text' :
    currentTool === 'select' ? 'default' :
    currentTool === 'furniture' ? 'copy' :
    (currentTool === 'door' || currentTool === 'window') ? (placementPreview ? 'crosshair' : 'not-allowed') :
    'crosshair'
  );
</script>

<svelte:window on:keydown={onKeyDown} on:keyup={onKeyUp} onmousemove={onWindowMouseMove} onmouseup={onWindowMouseUp} onblur={onWindowBlur} />

<div class="w-full h-full relative overflow-hidden" role="application">
  <canvas
    bind:this={canvas}
    class="block w-full h-full touch-none"
    tabindex="0"
    aria-label="Floor plan editor canvas"
    style="cursor: {cursorStyle}"
    onmousedown={onMouseDown}
    onmousemove={onMouseMove}
    onmouseup={onMouseUp}
    ondblclick={onDblClick}
    onwheel={onWheel}
    oncontextmenu={onContextMenu}
    ondragover={onDragOver}
    ondragleave={onDragLeave}
    ondrop={onDrop}
  ></canvas>
  <!-- Elevation pick mode hint chip -->
  {#if pickingElevation}
    <div class="absolute top-3 left-1/2 -translate-x-1/2 z-30 bg-slate-800/90 text-white text-xs font-medium px-3.5 py-1.5 rounded-full shadow-lg pointer-events-none flex items-center gap-1.5">
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11l9-7 9 7v9H3z"/><rect x="10" y="14" width="4" height="6"/><rect x="5.5" y="13" width="3" height="3"/></svg>
      <span class="max-md:hidden">Click a wall to view its elevation — Esc to cancel</span>
      <span class="md:hidden">Tap a wall to view its elevation</span>
    </div>
  {/if}
  <!-- Inline room name editor -->
  {#if editingRoomId}
    <input
      type="text"
      class="absolute bg-white border-2 border-blue-500 rounded px-2 py-1 text-sm text-center shadow-lg outline-none"
      style="left: {editingRoomPos.x}px; top: {editingRoomPos.y}px; transform: translate(-50%, -50%); z-index: 20; min-width: 100px;"
      aria-label="Room name"
      value={editingRoomName}
      oninput={(e) => { editingRoomName = (e.target as HTMLInputElement).value; }}
      onkeydown={(e) => {
        if (e.key === 'Enter') {
          updateRoom(editingRoomId!, { name: editingRoomName });
          detectedRoomsStore.update(rooms => rooms.map(r => r.id === editingRoomId ? { ...r, name: editingRoomName } : r));
          editingRoomId = null;
        } else if (e.key === 'Escape') {
          editingRoomId = null;
        }
      }}
      onblur={() => {
        if (editingRoomId) {
          updateRoom(editingRoomId, { name: editingRoomName });
          detectedRoomsStore.update(rooms => rooms.map(r => r.id === editingRoomId ? { ...r, name: editingRoomName } : r));
          editingRoomId = null;
        }
      }}
      use:focusInlineEditor
    />
  {/if}
  {#if editingDimensionId}
    <div class="absolute top-14 left-1/2 -translate-x-1/2 z-20 rounded-lg border border-blue-300 bg-white p-3 shadow-lg">
      <label class="block text-xs text-gray-600" for="dimension-label">Dimension label (optional)</label>
      <input
        id="dimension-label"
        class="mt-1 w-60 max-w-[70vw] rounded border border-gray-300 px-2 py-1 text-sm outline-blue-500"
        placeholder="Leave empty for measured distance"
        bind:value={dimensionLabel}
        use:focusInlineEditor
        onkeydown={(event) => {
          if (event.key === 'Enter') { event.preventDefault(); finishDimensionLabel(); }
          if (event.key === 'Escape') { event.preventDefault(); editingDimensionId = null; }
        }}
        onblur={finishDimensionLabel}
      />
    </div>
  {/if}
  <!-- Inline text annotation editor -->
  {#if editingTextAnnotationId}
    <input
      type="text"
      class="absolute bg-white border-2 border-blue-500 rounded px-2 py-1 text-sm text-center shadow-lg outline-none"
      style="left: {editingTextAnnotationPos.x}px; top: {editingTextAnnotationPos.y}px; transform: translate(-50%, -50%); z-index: 20; min-width: 120px;"
      aria-label="Annotation text"
      value={editingTextAnnotationValue}
      oninput={(e) => { editingTextAnnotationValue = (e.target as HTMLInputElement).value; }}
      onkeydown={(e) => {
        e.stopPropagation();
        if (e.key === 'Enter') {
          if (editingTextAnnotationValue.trim()) {
            updateTextAnnotation(editingTextAnnotationId!, { text: editingTextAnnotationValue });
          } else {
            removeTextAnnotation(editingTextAnnotationId!);
            selectedTextAnnotationId = null;
            selectedElementId.set(null);
          }
          editingTextAnnotationId = null;
        } else if (e.key === 'Escape') {
          // If it was a new annotation with default text and user cancels, remove it
          if (currentFloor?.textAnnotations) {
            const ta = currentFloor.textAnnotations.find(t => t.id === editingTextAnnotationId);
            if (ta && ta.text === 'Text' && !editingTextAnnotationValue.trim()) {
              removeTextAnnotation(editingTextAnnotationId!);
              selectedTextAnnotationId = null;
              selectedElementId.set(null);
            }
          }
          editingTextAnnotationId = null;
        }
      }}
      onblur={() => {
        if (editingTextAnnotationId) {
          if (editingTextAnnotationValue.trim()) {
            updateTextAnnotation(editingTextAnnotationId, { text: editingTextAnnotationValue });
          } else {
            removeTextAnnotation(editingTextAnnotationId);
            selectedTextAnnotationId = null;
            selectedElementId.set(null);
          }
          editingTextAnnotationId = null;
        }
      }}
      use:focusInlineEditor
    />
  {/if}
  <!-- Empty state hint -->
  {#if currentFloor && !hasPlanContent(currentFloor) && !(layerVis.floorBelow && floorBelow && hasPlanContent(floorBelow))}
    <div class="absolute inset-0 flex items-center justify-center pointer-events-none">
      <div class="text-center opacity-60">
        <div class="text-5xl mb-3">🏠</div>
        <div class="text-sm font-medium text-gray-500">Start building your floor plan</div>
        <div class="text-xs text-gray-400 mt-1">Draw walls with <span class="font-mono bg-gray-100 px-1 rounded">W</span> or drag items from the sidebar</div>
      </div>
    </div>
  {/if}
  <!-- Mini-map -->
  {#if showMinimap && currentFloor && hasPlanContent(currentFloor)}
    <canvas
      bind:this={minimapCanvas}
      aria-label="Floor plan minimap"
      width="180"
      height="120"
      class="absolute bottom-10 right-2 rounded-lg shadow-lg border border-gray-300 cursor-crosshair bg-white max-md:hidden"
      style="z-index: 15;"
      onclick={onMinimapClick}
    ></canvas>
  {/if}
  <div class="absolute bottom-2 right-2 bg-white/80 rounded px-2 py-1 text-xs text-gray-500 flex gap-3">
    {#if detectedRooms.length > 0}
      <span>{detectedRooms.length} room{detectedRooms.length !== 1 ? 's' : ''}</span>
      <span>{formatArea(detectedRooms.reduce((s, r) => s + r.area, 0), $projectSettings.units)}</span>
      <span class="text-gray-300">|</span>
    {/if}
    {#if currentFloor}
      <span>{currentFloor.walls.length} wall{currentFloor.walls.length !== 1 ? 's' : ''}</span>
      {#if currentFloor.doors.length > 0}
        <span>{currentFloor.doors.length} door{currentFloor.doors.length !== 1 ? 's' : ''}</span>
      {/if}
      {#if currentFloor.windows.length > 0}
        <span>{currentFloor.windows.length} window{currentFloor.windows.length !== 1 ? 's' : ''}</span>
      {/if}
      {#if currentFloor.furniture.length > 0}
        <span>{currentFloor.furniture.length} object{currentFloor.furniture.length !== 1 ? 's' : ''}</span>
      {/if}
      <span class="text-gray-300">|</span>
    {/if}
    {#if currentSelectedIds.size > 1}
      <span class="text-blue-600 font-medium">{currentSelectedIds.size} selected</span>
      <span class="text-gray-300">|</span>
    {/if}
    <span>Zoom: {Math.round(zoom * 100)}%</span>
    <button class="hover:text-gray-700" onclick={() => zoomToFit()} title="Zoom to Fit (F)">⊞ Fit</button>
    <button class="hover:text-gray-700" onclick={() => showGrid = !showGrid} title="Toggle Grid (G)">
      {showGrid ? '▦' : '▢'} Grid
    </button>
    <button class="hover:text-gray-700" onclick={() => projectSettings.update(s => ({ ...s, snapToGrid: !s.snapToGrid }))} title="Toggle Snap to Grid (S)">
      {currentSnapToGrid ? '🧲' : '↔'} Snap
    </button>
    <button class="hover:text-gray-700" onclick={() => layerVisibility.update(v => ({ ...v, furniture: !v.furniture }))} title="Toggle Furniture">
      {showFurniture ? '🪑' : '👻'} Furniture
    </button>
    <button class="hover:text-gray-700" onclick={() => showLayerPanel = !showLayerPanel} title="Layer Visibility">
      🗂 Layers
    </button>
    <button class="hover:text-gray-700" onclick={() => showRulers = !showRulers} title="Toggle Rulers">
      {showRulers ? '📏' : '📐'} Rulers
    </button>
    <button class="hover:text-gray-700" onclick={() => showMinimap = !showMinimap} title="Toggle Mini-map">
      {showMinimap ? '🗺' : '🗺'} Map
    </button>
  </div>
  <!-- Layer Visibility Panel -->
  {#if showLayerPanel}
    <div class="absolute bottom-12 right-2 z-20 bg-white rounded-lg shadow-lg border border-gray-200 p-3 text-xs min-w-[160px]">
      <div class="font-semibold text-gray-700 mb-2">Layers</div>
      {#each [['walls','Walls'],['doors','Doors'],['windows','Windows'],['furniture','Furniture'],['stairs','Stairs'],['columns','Columns'],['guides','Guides'],['measurements','Measurements']] as [key, label]}
        <label class="flex items-center gap-2 py-0.5 cursor-pointer hover:bg-gray-50 rounded px-1">
          <input type="checkbox" checked={(layerVis as Record<string, boolean>)[key]} onchange={() => layerVisibility.update(v => ({ ...v, [key]: !(v as Record<string, boolean>)[key] }))} class="accent-blue-500" />
          <span>{label}</span>
        </label>
      {/each}
      <hr class="my-1 border-gray-100" />
      <label class="flex items-center gap-2 py-0.5 cursor-pointer hover:bg-gray-50 rounded px-1" class:opacity-40={!floorBelow}>
        <input type="checkbox" checked={layerVis.floorBelow} disabled={!floorBelow} onchange={() => layerVisibility.update(v => ({ ...v, floorBelow: !v.floorBelow }))} class="accent-blue-500" />
        <span>{floorBelow ? `Floor Below (${floorBelow.name})` : 'Floor Below'}</span>
      </label>
      <label class="flex items-center gap-2 py-0.5 cursor-pointer hover:bg-gray-50 rounded px-1">
        <input type="checkbox" bind:checked={showRoomLabels} class="accent-blue-500" />
        <span>Room Labels</span>
      </label>
      <label class="flex items-center gap-2 py-0.5 cursor-pointer hover:bg-gray-50 rounded px-1">
        <input type="checkbox" bind:checked={showDimensions} class="accent-blue-500" />
        <span>Dimensions</span>
      </label>
    </div>
  {/if}

  <!-- Contextual Toolbar (hidden while the integrated elevation view covers the canvas) -->
  {#if (currentSelectedId || currentSelectedIds.size > 0) && currentFloor && currentTool === 'select' && !elevationOpen}
    {@const el = (() => {
      const f = currentFloor;
      const wall = f.walls.find(w => w.id === currentSelectedId);
      if (wall) {
        const s = worldToScreen((wall.start.x + wall.end.x) / 2, (wall.start.y + wall.end.y) / 2);
        return { type: 'wall', pos: s };
      }
      const door = f.doors.find(d => d.id === currentSelectedId);
      if (door) {
        const w = f.walls.find(w => w.id === door.wallId);
        if (w) {
          const s = worldToScreen(w.start.x + (w.end.x - w.start.x) * door.position, w.start.y + (w.end.y - w.start.y) * door.position);
          return { type: 'door', pos: s, door };
        }
      }
      const win = f.windows.find(w => w.id === currentSelectedId);
      if (win) {
        const w = f.walls.find(w => w.id === win.wallId);
        if (w) {
          const s = worldToScreen(w.start.x + (w.end.x - w.start.x) * win.position, w.start.y + (w.end.y - w.start.y) * win.position);
          return { type: 'window', pos: s };
        }
      }
      const furn = f.furniture.find(fi => fi.id === currentSelectedId);
      if (furn) {
        const s = worldToScreen(furn.position.x, furn.position.y);
        return { type: 'furniture', pos: s };
      }
      const positioned = [...f.stairs ?? [], ...f.columns ?? [], ...f.entourage ?? []].find(item => item.id === currentSelectedId);
      if (positioned) return { type: 'object', pos: worldToScreen(positioned.position.x, positioned.position.y) };
      return null;
    })()}
    {#if el}
      <div
        class="absolute z-40 flex items-center gap-0.5 bg-white rounded-lg shadow-lg border border-gray-200 px-1 py-0.5"
        style="left: {el.pos.x}px; top: {el.pos.y - 44}px; transform: translateX(-50%);"
      >
        <button
          class="w-7 h-7 flex items-center justify-center rounded hover:bg-gray-100 text-gray-500 hover:text-gray-700"
          title="Duplicate"
          aria-label="Duplicate"
          onclick={() => {
            if (!currentSelectedId || !currentFloor) return;
            const ids = currentSelectedIds.size ? currentSelectedIds : new Set([currentSelectedId]);
            const newIds = duplicateSelection(ids);
            if (newIds.length) {
              selectedElementIds.set(new Set(newIds));
              selectedElementId.set(newIds[0]);
            }
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
        </button>
        {#if el.type === 'door' && el.door}
          <button
            class="w-7 h-7 flex items-center justify-center rounded hover:bg-gray-100 text-gray-500 hover:text-gray-700"
            title="Flip swing"
            aria-label="Flip swing"
            onclick={() => { if (el.door) updateDoor(el.door.id, { swingDirection: el.door.swingDirection === 'left' ? 'right' : 'left' }); }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M7 16V4m0 0L3 8m4-4l4 4M17 8v12m0 0l4-4m-4 4l-4-4"/></svg>
          </button>
        {/if}
        {#if el.type === 'wall' && currentSelectedId && currentSelectedIds.size === 0}
          <button
            class="w-7 h-7 flex items-center justify-center rounded hover:bg-gray-100 text-gray-500 hover:text-gray-700"
            title="Split wall at midpoint"
            aria-label="Split wall at midpoint"
            onclick={() => {
              if (currentSelectedId) {
                const newId = splitWall(currentSelectedId, 0.5);
                if (newId) selectedElementId.set(null);
              }
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v20M4 12h4M16 12h4"/></svg>
          </button>
        {/if}
        <div class="w-px h-5 bg-gray-200 mx-0.5"></div>
        <button
          class="w-7 h-7 flex items-center justify-center rounded hover:bg-red-50 text-gray-400 hover:text-red-600"
          title="Delete"
          aria-label="Delete"
          onclick={() => {
            if (currentSelectedIds.size > 0) {
              beginUndoGroup();
              for (const id of currentSelectedIds) removeElement(id);
              endUndoGroup();
              selectedElementIds.set(new Set());
              selectedElementId.set(null);
            } else if (currentSelectedId) {
              removeElement(currentSelectedId);
              selectedElementId.set(null);
            }
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14"/></svg>
        </button>
      </div>
    {/if}
  {/if}
  {#if currentTool === 'wall' && wallStart}
    <div class="absolute top-2 left-1/2 -translate-x-1/2 bg-blue-600 text-white px-3 py-1 rounded-full text-xs shadow">
      Click to add wall segment · Double-click to finish · C to close loop · Esc to cancel
    </div>
  {/if}
  {#if currentPlacingId && currentTool === 'furniture'}
    <div class="absolute top-2 left-1/2 -translate-x-1/2 bg-purple-600 text-white px-3 py-1 rounded-full text-xs shadow">
      Click to place · Scroll or R to rotate ({currentPlacingRotation}°) · Esc to cancel
    </div>
  {/if}
  {#if measuring}
    <div class="absolute top-2 left-1/2 -translate-x-1/2 bg-red-600 text-white px-3 py-1 rounded-full text-xs shadow">
      Click or tap two points to measure · M to exit · Esc to cancel
    </div>
  {/if}
  {#if textAnnotationMode}
    <div class="absolute top-2 left-1/2 -translate-x-1/2 bg-emerald-600 text-white px-3 py-1 rounded-full text-xs shadow">
      Click to place text label · Esc to cancel
    </div>
  {/if}
  {#if annotating}
    <div class="absolute top-2 left-1/2 -translate-x-1/2 bg-indigo-600 text-white px-3 py-1 rounded-full text-xs shadow">
      {annotationStart ? 'Click second point to create annotation' : 'Click first point'} · N to exit · Esc to cancel
    </div>
  {/if}

  <!-- Zoom Controls (bottom-left) -->
  <div style:bottom={`${zoomControlsBottom}px`} class="absolute left-3 max-md:left-20 z-20 flex items-center gap-1 bg-white rounded-lg shadow-lg border border-gray-200 px-1 py-0.5">
    <button
      class="w-7 h-7 flex items-center justify-center rounded hover:bg-gray-100 text-gray-600 hover:text-gray-800 font-bold text-lg"
      title="Zoom Out (−)"
      aria-label="Zoom out"
      onclick={() => {
        const newZoom = Math.max(minimumZoom, zoom * 0.8);
        // Zoom towards canvas center
        const worldCX = (width / 2 - width / 2) / zoom + camX;
        const worldCY = (height / 2 - height / 2) / zoom + camY;
        camX = worldCX - (width / 2 - width / 2) / newZoom;
        camY = worldCY - (height / 2 - height / 2) / newZoom;
        zoom = newZoom;
      }}
    >−</button>
    <button
      class="min-w-[3.5rem] h-7 flex items-center justify-center rounded hover:bg-gray-100 text-xs font-medium text-gray-600 hover:text-gray-800 tabular-nums"
      title="Reset to 100%"
      aria-label="Zoom to 100%"
      onclick={() => { zoom = 1; }}
    >{zoom < 0.01 ? (zoom * 100).toPrecision(2) : Math.round(zoom * 100)}%</button>
    <button
      class="w-7 h-7 flex items-center justify-center rounded hover:bg-gray-100 text-gray-600 hover:text-gray-800 font-bold text-lg"
      title="Zoom In (+)"
      aria-label="Zoom in"
      onclick={() => {
        const newZoom = Math.min(10, zoom * 1.25);
        zoom = newZoom;
      }}
    >+</button>
    <div class="w-px h-5 bg-gray-200"></div>
    <button
      class="w-7 h-7 flex items-center justify-center rounded hover:bg-gray-100 text-gray-500 hover:text-gray-700 text-sm"
      title="Zoom to Fit (F)"
      aria-label="Zoom to fit"
      onclick={() => zoomToFit()}
    >⊞</button>
    <button
      class="w-7 h-7 flex items-center justify-center rounded hover:bg-gray-100 text-gray-500 hover:text-gray-700 text-sm disabled:opacity-30 disabled:cursor-not-allowed"
      title="Fit Selection (Shift+F)"
      aria-label="Fit selection"
      disabled={fitSelectionIds().size === 0}
      onclick={() => zoomToFit(true)}
    >⊡</button>
  </div>

  <!-- Context Menu -->
  <ContextMenu
    x={ctxMenuX}
    y={ctxMenuY}
    visible={ctxMenuVisible}
    targetType={ctxMenuTargetType}
    targetId={ctxMenuTargetId}
    targetWall={ctxMenuWall}
    targetFurniture={ctxMenuFurniture}
    targetRoom={ctxMenuRoom}
    clipboard={clipboard}
    onclose={() => { ctxMenuVisible = false; }}
    onaction={handleContextMenuAction}
  />
</div>
