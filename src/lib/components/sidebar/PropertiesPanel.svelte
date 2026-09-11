<script lang="ts">
  import { entourageLabels } from '$lib/i18n/entourageLabels';
  import { roomTypeLabels, roomColorLabels, floorGroupLabels, floorMaterialLabels } from '$lib/i18n/roomPropertyLabels';
  import { t, type TranslationKey } from '$lib/i18n';
  const furnitureFinishLabels: Record<string, TranslationKey> = {"Wood": "furnitureFinish.Wood", "Metal": "furnitureFinish.Metal", "Fabric": "furnitureFinish.Fabric", "Leather": "furnitureFinish.Leather", "Glass": "furnitureFinish.Glass", "Plastic": "furnitureFinish.Plastic", "Stone": "furnitureFinish.Stone", "Ceramic": "furnitureFinish.Ceramic"};
  import { furnitureFinishes } from '$lib/utils/furnitureFinishes';
  import { resolveRooms } from '$lib/utils/roomDetection';
  import { onDestroy } from 'svelte';
  import ItemDetailsPanel from './ItemDetailsPanel.svelte';
  import type { DetailTarget } from '$lib/models/types';
  import { catalogAssetUrl } from '$lib/utils/catalogAssetUrl';

  import { activeFloor, selectedElementId, selectedRoomId, updateWall, resizeWallLength, reverseWall, updateDoor, updateWindow, updateRoom, updateFurniture, detectedRoomsStore, updateStair, updateColumn, updateBackgroundImage, setBackgroundImage, calibrationMode, calibrationPoints, updateTextAnnotation, toggleFurnitureLock, updateEntourageItem, removeElement, elevationWallId } from '$lib/stores/project';
  import { wallLength as calcWallLength, MIN_WALL_LENGTH, type WallEndpoint } from '$lib/utils/wallEditing';
  import { openingOnWall } from '$lib/utils/wallProfiles';
  import { getEntourageDef } from '$lib/utils/entourageCatalog';
  import { floorMaterials, wallColors } from '$lib/utils/materials';
  import { getCatalogItem } from '$lib/utils/furnitureCatalog';
  import { projectSettings, formatLength, formatArea, parseLengthInput } from '$lib/stores/settings';
    import type { Floor, Wall, Door, Window as Win, Room, FurnitureItem, Stair, Column, RoomCategory, TextAnnotation } from '$lib/models/types';
  import { getWallStartHeight, getWallEndHeight } from '$lib/models/types';

  let floor = $state<Floor | null>(null);
  let selId: string | null = $state(null);
  let selRoomId: string | null = $state(null);
  let detectedRooms: Room[] = $state([]);

  onDestroy(activeFloor.subscribe((f) => { floor = f; }));
  onDestroy(selectedElementId.subscribe((id) => { selId = id; }));
  onDestroy(selectedRoomId.subscribe((id) => { selRoomId = id; }));
  onDestroy(detectedRoomsStore.subscribe((rooms) => { detectedRooms = rooms; }));

  let settings = $state($projectSettings);
  onDestroy(projectSettings.subscribe((s) => { settings = s; }));

  function displayValue(cm: number): number {
    return settings.units === 'imperial' ? Math.round(cm / 2.54 * 10) / 10 : Math.round(cm * 1000) / 1000;
  }
  function inputToCm(value: number): number {
    return settings.units === 'imperial' ? value * 2.54 : value;
  }
  function unitLabel(): string {
    return settings.units === 'imperial' ? 'in' : 'cm';
  }

  let { is3D = false }: { is3D?: boolean } = $props();
  let wallSideTab = $state<'interior' | 'exterior'>('interior');
  let selectedWall = $derived(floor?.walls?.find(w => w.id === selId) ?? null);
  let selectedDoor = $derived(floor?.doors?.find(d => d.id === selId) ?? null);
  let selectedWindow = $derived(floor?.windows?.find(w => w.id === selId) ?? null);
  let selectedFurniture = $derived(floor?.furniture?.find(f => f.id === selId) ?? null);
  let selectedStair = $derived(floor?.stairs?.find(s => s.id === selId) ?? null);
  let selectedColumn = $derived(floor?.columns?.find(c => c.id === selId) ?? null);
  let selectedTextAnnotation = $derived(floor?.textAnnotations?.find(t => t.id === selId) ?? null);
  let selectedEntourage = $derived(floor?.entourage?.find(en => en.id === selId) ?? null);
  let hasBgImage = $derived(!!floor?.backgroundImage);
  let selectedRoom = $derived(floor && selRoomId
    ? resolveRooms(floor, detectedRooms).find(r => r.id === selRoomId) ?? null
    : null);

  // Helper to get the parent wall for selected door/window
  let selectedDoorWall = $derived((selectedDoor && floor?.walls?.find(w => w.id === selectedDoor.wallId)) ?? null);
  let selectedWindowWall = $derived((selectedWindow && floor?.walls?.find(w => w.id === selectedWindow.wallId)) ?? null);

  let wallLength = $derived(selectedWall ? Math.round(calcWallLength(selectedWall) * 1000) / 1000 : 0);
  let fixedEndpoint = $state<WallEndpoint>('start');
  let wallLengthError = $state<string | null>(null);
  $effect(() => { void selId; fixedEndpoint = 'start'; wallLengthError = null; });

  // Calculate door distances
  let doorDistFromA = $derived(selectedDoor && selectedDoorWall ? calcWallLength(selectedDoorWall) * selectedDoor.position : 0);
  let doorDistFromB = $derived(selectedDoor && selectedDoorWall ? calcWallLength(selectedDoorWall) * (1 - selectedDoor.position) : 0);

  // Calculate window distances  
  let windowDistFromA = $derived(selectedWindow && selectedWindowWall ? calcWallLength(selectedWindowWall) * selectedWindow.position : 0);
  let windowDistFromB = $derived(selectedWindow && selectedWindowWall ? calcWallLength(selectedWindowWall) * (1 - selectedWindow.position) : 0);

  function onWallLength(e: Event) {
    if (!selectedWall) return;
    const input = e.target as HTMLInputElement;
    const current = calcWallLength(selectedWall);
    const parsed = parseLengthInput(input.value, settings.units);
    if (parsed === null || parsed < MIN_WALL_LENGTH) {
      wallLengthError = 'Enter a wall length of at least 1 cm.';
    } else if (input.value.trim() !== String(displayValue(current))) {
      wallLengthError = resizeWallLength(selectedWall.id, parsed, fixedEndpoint);
    } else { wallLengthError = null; }
    input.value = String(displayValue(calcWallLength(selectedWall)));
  }

  /** Blank/invalid drafts leave geometry untouched; restore the saved value on blur. */
  function dimensionInput(e: Event, current: number, save: (cm: number) => void, zeroAllowed = false, max = Infinity) {
    const input = e.target as HTMLInputElement;
    const value = inputToCm(input.valueAsNumber);
    const valid = input.value.trim() && input.validity.valid && Number.isFinite(value) && (zeroAllowed ? value >= 0 : value > 0) && value <= max;
    if (valid && input.valueAsNumber !== displayValue(current)) save(value);
    else if (!valid && e.type === 'blur') input.value = String(displayValue(current));
  }
  function scalarInput(e: Event, current: number, save: (value: number) => void) {
    const input = e.target as HTMLInputElement;
    const value = input.valueAsNumber;
    const valid = input.value.trim() && input.validity.valid && Number.isFinite(value);
    if (valid && value !== current) save(value);
    else if (!valid && e.type === 'blur') input.value = String(current);
  }
  function onStairWidth(e: Event) {
    if (selectedStair) dimensionInput(e, selectedStair.width, value => updateStair(selectedStair!.id, { width: value }));
  }
  function onStairDepth(e: Event) {
    if (selectedStair) dimensionInput(e, selectedStair.depth, value => updateStair(selectedStair!.id, { depth: value }));
  }
  function onStairRisers(e: Event) {
    if (selectedStair) scalarInput(e, selectedStair.riserCount, value => updateStair(selectedStair!.id, { riserCount: value }));
  }
  function onStairRotation(e: Event) {
    if (selectedStair) scalarInput(e, selectedStair.rotation, value => updateStair(selectedStair!.id, { rotation: value }));
  }
  function onColumnDiameter(e: Event) {
    if (selectedColumn) dimensionInput(e, selectedColumn.diameter, value => updateColumn(selectedColumn!.id, { diameter: value }));
  }
  function onColumnHeight(e: Event) {
    if (selectedColumn) dimensionInput(e, selectedColumn.height, value => updateColumn(selectedColumn!.id, { height: value }));
  }
  function onWallThickness(e: Event) {
    if (selectedWall) dimensionInput(e, selectedWall.thickness, value => updateWall(selectedWall!.id, { thickness: value }));
  }
  let clippedOpenings = $derived.by(() => {
    if (!selectedWall || !floor) return false;
    const wall = selectedWall;
    const length = Math.hypot(wall.end.x - wall.start.x, wall.end.y - wall.start.y);
    return [...floor.doors.filter(d => d.wallId === wall.id).map(d => ({ ...d, bottom: 0 })),
      ...floor.windows.filter(w => w.wallId === wall.id).map(w => ({ ...w, bottom: w.sillHeight ?? 90 }))].some(item => {
      const rect = openingOnWall(length, getWallStartHeight(wall), getWallEndHeight(wall), item.position, item.width, item.bottom, item.height);
      return !rect || rect.right - rect.left < item.width - 0.01 || rect.top - rect.bottom < item.height - 0.01;
    });
  });
  function onWallStartHeight(e: Event) {
    if (selectedWall) dimensionInput(e, getWallStartHeight(selectedWall), value => updateWall(selectedWall!.id, { startHeight: value }), true);
  }
  function onWallEndHeight(e: Event) {
    if (selectedWall) dimensionInput(e, getWallEndHeight(selectedWall), value => updateWall(selectedWall!.id, { endHeight: value }), true);
  }
  function equalizeWallHeights() {
    if (!selectedWall) return;
    const startH = getWallStartHeight(selectedWall);
    updateWall(selectedWall.id, { startHeight: startH, endHeight: startH, height: startH });
  }
  function onWallColor(e: Event) {
    if (!selectedWall) return;
    updateWall(selectedWall.id, { color: (e.target as HTMLInputElement).value });
  }
  function onDoorWidth(e: Event) {
    if (selectedDoor) dimensionInput(e, selectedDoor.width, value => updateDoor(selectedDoor!.id, { width: value }));
  }
  function onDoorHeight(e: Event) {
    if (selectedDoor) dimensionInput(e, selectedDoor.height ?? 210, value => updateDoor(selectedDoor!.id, { height: value }));
  }
  function onDoorType(e: Event) {
    if (!selectedDoor) return;
    updateDoor(selectedDoor.id, { type: (e.target as HTMLSelectElement).value as Door['type'] });
  }
  function onDoorSwing(e: Event) {
    if (!selectedDoor) return;
    updateDoor(selectedDoor.id, { swingDirection: (e.target as HTMLSelectElement).value as 'left' | 'right' });
  }
  function flipDoorHorizontal() {
    if (!selectedDoor) return;
    updateDoor(selectedDoor.id, { swingDirection: selectedDoor.swingDirection === 'left' ? 'right' : 'left' });
  }
  function flipDoorVertical() {
    if (!selectedDoor) return;
    updateDoor(selectedDoor.id, { flipSide: !(selectedDoor.flipSide ?? false) });
  }
  function onWindowType(e: Event) {
    if (!selectedWindow) return;
    updateWindow(selectedWindow.id, { type: (e.target as HTMLSelectElement).value as Win['type'] });
  }
  function onWindowWidth(e: Event) {
    if (selectedWindow) dimensionInput(e, selectedWindow.width, value => updateWindow(selectedWindow!.id, { width: value }));
  }
  function onWindowHeight(e: Event) {
    if (selectedWindow) dimensionInput(e, selectedWindow.height, value => updateWindow(selectedWindow!.id, { height: value }));
  }
  function onWindowSill(e: Event) {
    if (selectedWindow) dimensionInput(e, selectedWindow.sillHeight ?? 90, value => updateWindow(selectedWindow!.id, { sillHeight: value }), true);
  }

  // Furniture handlers
  function onFurnitureColor(color: string) {
    if (!selectedFurniture) return;
    updateFurniture(selectedFurniture.id, { color });
  }
  function onFurnitureWidth(e: Event) {
    if (!selectedFurniture) return;
    dimensionInput(e, selectedFurniture.width ?? getCatalogItem(selectedFurniture.catalogId)?.width ?? 50,
      value => updateFurniture(selectedFurniture!.id, { width: value }));
  }
  function onFurnitureDepth(e: Event) {
    if (!selectedFurniture) return;
    dimensionInput(e, selectedFurniture.depth ?? getCatalogItem(selectedFurniture.catalogId)?.depth ?? 50,
      value => updateFurniture(selectedFurniture!.id, { depth: value }));
  }
  function onFurnitureHeight(e: Event) {
    if (!selectedFurniture) return;
    dimensionInput(e, selectedFurniture.height ?? getCatalogItem(selectedFurniture.catalogId)?.height ?? 50,
      value => updateFurniture(selectedFurniture!.id, { height: value }));
  }
  function onFurnitureMaterial(e: Event) {
    if (!selectedFurniture) return;
    updateFurniture(selectedFurniture.id, { material: (e.target as HTMLSelectElement).value || undefined });
  }
  function onFurnitureRotation(e: Event) {
    if (!selectedFurniture) return;
    scalarInput(e, selectedFurniture.rotation, value => updateFurniture(selectedFurniture!.id, { rotation: value }));
  }
  function resetFurnitureDefaults() {
    if (!selectedFurniture) return;
    updateFurniture(selectedFurniture.id, { color: undefined, width: undefined, depth: undefined, height: undefined, material: undefined });
  }

  // Door distance handlers
  function onDoorDistFromA(e: Event) {
    if (!selectedDoor || !selectedDoorWall) return;
    const length = calcWallLength(selectedDoorWall);
    if (!Number.isFinite(length) || length <= 0) return;
    dimensionInput(e, length * selectedDoor.position, value => updateDoor(selectedDoor!.id, { position: value / length }), true, length);
  }
  
  function onDoorDistFromB(e: Event) {
    if (!selectedDoor || !selectedDoorWall) return;
    const length = calcWallLength(selectedDoorWall);
    if (!Number.isFinite(length) || length <= 0) return;
    dimensionInput(e, length * (1 - selectedDoor.position), value => updateDoor(selectedDoor!.id, { position: 1 - value / length }), true, length);
  }

  // Window distance handlers
  function onWindowDistFromA(e: Event) {
    if (!selectedWindow || !selectedWindowWall) return;
    const length = calcWallLength(selectedWindowWall);
    if (!Number.isFinite(length) || length <= 0) return;
    dimensionInput(e, length * selectedWindow.position, value => updateWindow(selectedWindow!.id, { position: value / length }), true, length);
  }
  
  function onWindowDistFromB(e: Event) {
    if (!selectedWindow || !selectedWindowWall) return;
    const length = calcWallLength(selectedWindowWall);
    if (!Number.isFinite(length) || length <= 0) return;
    dimensionInput(e, length * (1 - selectedWindow.position), value => updateWindow(selectedWindow!.id, { position: 1 - value / length }), true, length);
  }
  let detailTarget = $derived.by((): DetailTarget | null => {
    if (!floor) return null;
    for (const [kind, item] of [['walls', selectedWall], ['doors', selectedDoor], ['windows', selectedWindow], ['furniture', selectedFurniture], ['rooms', selectedRoom]] as const) {
      if (item) return { floorId: floor.id, kind, id: item.id };
    }
    return null;
  });
  // Preset colors for rooms and columns
  const roomColorPresets = [
    { name: 'White', color: '#ffffff' },
    { name: 'Cream', color: '#fffdd0' },
    { name: 'Beige', color: '#f5f5dc' },
    { name: 'Light Gray', color: '#d1d5db' },
    { name: 'Warm Gray', color: '#b8a082' },
    { name: 'Sage Green', color: '#d4e2d4' },
    { name: 'Light Blue', color: '#dbeafe' },
    { name: 'Blush Pink', color: '#f4c2c2' },
    { name: 'Lavender', color: '#e6e6fa' },
    { name: 'Butter Yellow', color: '#fff8dc' },
  ];

  const columnColorLabels: Record<string, TranslationKey> = {"White": "columnColor.White", "Light Gray": "columnColor.Light Gray", "Concrete": "columnColor.Concrete", "Charcoal": "columnColor.Charcoal", "Black": "columnColor.Black", "Cream": "columnColor.Cream", "Wood": "columnColor.Wood", "Bronze": "columnColor.Bronze", "Silver": "columnColor.Silver", "Navy": "columnColor.Navy"};
  const columnColorPresets = [
    { name: 'White', color: '#ffffff' },
    { name: 'Light Gray', color: '#d1d5db' },
    { name: 'Concrete', color: '#999999' },
    { name: 'Charcoal', color: '#374151' },
    { name: 'Black', color: '#000000' },
    { name: 'Cream', color: '#fffdd0' },
    { name: 'Wood', color: '#8B6914' },
    { name: 'Bronze', color: '#cd7f32' },
    { name: 'Silver', color: '#c0c0c0' },
    { name: 'Navy', color: '#1e3a8a' },
  ];

  function updateDetectedRoom(id: string, updates: Partial<{ name: string; floorTexture: string; color: string }>) {
    detectedRoomsStore.update(rooms => rooms.map(r => r.id === id ? { ...r, ...updates } : r));
  }

  function onRoomName(e: Event) {
    if (!selectedRoom) return;
    const name = (e.target as HTMLInputElement).value;
    updateRoom(selectedRoom.id, { name });
    updateDetectedRoom(selectedRoom.id, { name });
  }
  function onRoomFloor(texture: string) {
    if (!selectedRoom) return;
    updateRoom(selectedRoom.id, { floorTexture: texture });
    updateDetectedRoom(selectedRoom.id, { floorTexture: texture });
  }
  function onRoomColor(color: string) {
    if (!selectedRoom) return;
    updateRoom(selectedRoom.id, { color });
    updateDetectedRoom(selectedRoom.id, { color });
  }

  const roomTypes = [
    { id: 'living', label: 'Living Room', icon: '🛋️' },
    { id: 'bedroom', label: 'Bedroom', icon: '🛏️' },
    { id: 'kitchen', label: 'Kitchen', icon: '🍳' },
    { id: 'bathroom', label: 'Bathroom', icon: '🚿' },
    { id: 'dining', label: 'Dining Room', icon: '🍽️' },
    { id: 'office', label: 'Office', icon: '💻' },
    { id: 'hallway', label: 'Hallway', icon: '🚶' },
    { id: 'closet', label: 'Closet', icon: '👔' },
    { id: 'laundry', label: 'Laundry', icon: '🧺' },
    { id: 'garage', label: 'Garage', icon: '🚗' },
    { id: 'custom', label: 'Custom', icon: '✏️' },
  ];

  function onRoomType(e: Event) {
    if (!selectedRoom) return;
    const typeId = (e.target as HTMLSelectElement).value;
    const rt = roomTypes.find(t => t.id === typeId);
    if (rt && rt.id !== 'custom') {
      updateRoom(selectedRoom.id, { name: rt.label });
      updateDetectedRoom(selectedRoom.id, { name: rt.label });
    }
  }

  let selectedRoomType = $derived(() => {
    if (!selectedRoom) return 'custom';
    const match = roomTypes.find(t => t.label === selectedRoom!.name);
    return match ? match.id : 'custom';
  });

  const floorTexPaths: Record<string, string> = {
    'light-oak': catalogAssetUrl(`/textures/floor-light-oak.webp`), 'walnut': catalogAssetUrl(`/textures/floor-walnut.webp`),
    'bamboo': catalogAssetUrl(`/textures/floor-bamboo.webp`), 'laminate': catalogAssetUrl(`/textures/floor-laminate.webp`),
    'ceramic-white': catalogAssetUrl(`/textures/floor-tile-white.webp`), 'ceramic-gray': catalogAssetUrl(`/textures/floor-tile-gray.webp`),
    'porcelain': catalogAssetUrl(`/textures/floor-porcelain.webp`),
    'marble-white': catalogAssetUrl(`/textures/floor-marble-white.webp`), 'marble-dark': catalogAssetUrl(`/textures/floor-marble-dark.webp`),
    'carpet-beige': catalogAssetUrl(`/textures/floor-carpet-beige.webp`), 'carpet-gray': catalogAssetUrl(`/textures/floor-carpet-gray.webp`),
    'concrete': catalogAssetUrl(`/textures/floor-concrete.webp`), 'slate': catalogAssetUrl(`/textures/floor-slate.webp`),
    'vinyl': catalogAssetUrl(`/textures/floor-vinyl.webp`),
  };
  const wallTexPaths: Record<string, string> = {
    'red-brick': catalogAssetUrl(`/textures/brick.webp`), 'exposed-brick': catalogAssetUrl(`/textures/exposed-brick.webp`),
    'stone': catalogAssetUrl(`/textures/stone.webp`), 'wood-panel': catalogAssetUrl(`/textures/wood-panel.webp`),
    'concrete-block': catalogAssetUrl(`/textures/concrete.webp`), 'subway-tile': catalogAssetUrl(`/textures/subway-tile.webp`),
  };
  const textureGroups = [
    { label: '🎨 Plain', ids: ['none'] },
    { label: '🪵 Wood', ids: ['light-oak', 'walnut', 'bamboo', 'laminate'] },
    { label: '🔲 Tile', ids: ['ceramic-white', 'ceramic-gray', 'porcelain', 'vinyl'] },
    { label: '🪨 Stone', ids: ['marble-white', 'marble-dark', 'concrete', 'slate'] },
    { label: '🧶 Carpet', ids: ['carpet-beige', 'carpet-gray'] },
  ];

  let hasSelection = $derived(!!selectedWall || !!selectedDoor || !!selectedWindow || !!selectedFurniture || !!selectedRoom || !!selectedStair || !!selectedColumn || !!selectedTextAnnotation || !!selectedEntourage || (!is3D && hasBgImage));
</script>

<!-- Right sidebar on md+; slides up as a bottom sheet on phones -->
<div data-plan-properties class="{is3D ? 'w-80' : 'w-64'} shrink-0 bg-white border-l border-gray-200 flex flex-col overflow-y-auto p-3 fixed md:static right-0 top-12 bottom-9 z-40 shadow-lg max-md:top-auto max-md:bottom-0 max-md:left-0 max-md:w-full max-md:max-h-[45vh] max-md:border-l-0 max-md:border-t max-md:rounded-t-xl max-md:shadow-2xl" class:hidden={!hasSelection}>
  {#if selectedWall}
    <h3 class="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
      <span class="w-6 h-6 bg-gray-200 rounded flex items-center justify-center text-xs">▭</span>
      Wall Properties
    </h3>
    <div class="space-y-3">
      <label class="block">
        <span class="text-xs text-gray-500">Length ({unitLabel()})</span>
        <input type="text" value={displayValue(wallLength)} onblur={onWallLength} onkeydown={(event) => { if (event.key === 'Enter') event.currentTarget.blur(); }} class="w-full px-2 py-1 border border-gray-200 rounded text-sm" />
      </label>
      <p class="text-xs text-gray-500">Enter {unitLabel()}, or include units such as 2.5 m, 12&quot; or 5&apos;6&quot;.</p>
      <label class="block">
        <span class="text-xs text-gray-500">Keep fixed</span>
        <select bind:value={fixedEndpoint} class="w-full px-2 py-1 border border-gray-200 rounded text-sm">
          <option value="start">Start (A)</option>
          <option value="end">End (B)</option>
        </select>
      </label>
      <p class="text-xs text-gray-500">Joined corners follow the moving endpoint. Openings keep their relative positions.</p>
      {#if wallLengthError}<p role="alert" class="text-xs text-red-700">{wallLengthError}</p>{/if}
      <label class="block">
        <span class="text-xs text-gray-500">Thickness ({unitLabel()})</span>
        <input type="number" value={displayValue(selectedWall.thickness)} oninput={onWallThickness} onblur={onWallThickness} step="any" class="w-full px-2 py-1 border border-gray-200 rounded text-sm" />
      </label>
      <div class="grid grid-cols-2 gap-2">
        <label class="block">
          <span class="text-xs text-gray-500">Start Height ({unitLabel()})</span>
          <input type="number" value={displayValue(getWallStartHeight(selectedWall))} min="0" step="any" oninput={onWallStartHeight} onblur={onWallStartHeight} class="w-full px-2 py-1 border border-gray-200 rounded text-sm" />
        </label>
        <label class="block">
          <span class="text-xs text-gray-500">End Height ({unitLabel()})</span>
          <input type="number" value={displayValue(getWallEndHeight(selectedWall))} min="0" step="any" oninput={onWallEndHeight} onblur={onWallEndHeight} class="w-full px-2 py-1 border border-gray-200 rounded text-sm" />
        </label>
      </div>
      {#if clippedOpenings}
        <p role="status" class="text-xs text-amber-800 bg-amber-50 rounded p-2">Some openings do not fit this wall. Elevation and 3D clip their preview; saved dimensions stay unchanged. Raise the wall or resize/reposition the openings.</p>
      {/if}
      <div class="flex items-center gap-2">
        {#if getWallStartHeight(selectedWall) !== getWallEndHeight(selectedWall)}
          <button
            onclick={equalizeWallHeights}
            class="text-xs text-blue-600 hover:text-blue-800 underline flex items-center gap-1"
          >
            ↔️ Equalize ({displayValue(getWallStartHeight(selectedWall))} {unitLabel()})
          </button>
        {/if}
        <button
          onclick={() => { if (selectedWall) reverseWall(selectedWall.id); }}
          class="text-xs text-gray-600 hover:text-gray-900 border border-gray-200 px-2 py-0.5 rounded flex items-center gap-1 ml-auto"
          title="Reverse wall direction (swap start/end points and heights)"
        >
          🔄 Reverse direction
        </button>
      </div>
      <button
        class="w-full py-1.5 text-sm rounded-md bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 transition-colors flex items-center justify-center gap-1.5"
        onclick={() => { if (selectedWall) elevationWallId.set(selectedWall.id); }}
        title="View this wall face-on and edit its doors and windows"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="14" rx="1"/><line x1="3" y1="18" x2="21" y2="18"/><rect x="7" y="9" width="4" height="4"/><rect x="14" y="10" width="3" height="8"/></svg>
        Elevation
      </button>
      <div class="flex items-center gap-2">
        <span class="text-xs text-gray-500">Curved</span>
        <button
          class="px-2 py-0.5 text-xs rounded {selectedWall.curvePoint ? 'bg-amber-100 text-amber-800 border border-amber-300' : 'bg-gray-100 text-gray-500 border border-gray-200'}"
          onclick={() => {
            if (selectedWall) {
              if (selectedWall.curvePoint) {
                updateWall(selectedWall.id, { curvePoint: undefined });
              } else {
                // Set curve point to offset midpoint
                const mx = (selectedWall.start.x + selectedWall.end.x) / 2;
                const my = (selectedWall.start.y + selectedWall.end.y) / 2;
                const dx = selectedWall.end.x - selectedWall.start.x;
                const dy = selectedWall.end.y - selectedWall.start.y;
                const len = Math.hypot(dx, dy) || 1;
                updateWall(selectedWall.id, { curvePoint: { x: mx + (-dy / len) * 60, y: my + (dx / len) * 60 } });
              }
            }
          }}
        >
          {selectedWall.curvePoint ? '◆ On' : '◇ Off'}
        </button>
      </div>
      <!-- Wall Material Tabs: Interior / Exterior -->
      <div>
        <div class="flex border-b border-gray-200 mb-3">
          <button
            class="flex-1 py-1.5 text-xs font-medium border-b-2 transition-colors {wallSideTab === 'interior' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-400 hover:text-gray-600'}"
            onclick={() => wallSideTab = 'interior'}
          >Interior</button>
          <button
            class="flex-1 py-1.5 text-xs font-medium border-b-2 transition-colors {wallSideTab === 'exterior' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-400 hover:text-gray-600'}"
            onclick={() => wallSideTab = 'exterior'}
          >Exterior</button>
        </div>
        {#if wallSideTab === 'interior'}
          {@const sideColor = selectedWall.interiorColor || selectedWall.color}
          {@const sideTex = selectedWall.interiorTexture === 'none' ? undefined : (selectedWall.interiorTexture || selectedWall.texture)}
          <div class="space-y-2">
            <span class="text-xs text-gray-500">Color</span>
            <div class="grid grid-cols-6 gap-1.5">
              {#each wallColors as wc}
                <button
                  class="w-7 h-7 rounded-md border-2 hover:border-gray-300 transition-colors {sideColor === wc.color ? 'border-blue-500 ring-1 ring-blue-200' : 'border-gray-200'}"
                  style="background-color: {wc.color}"
                  title={wc.name}
                  onclick={() => { if (selectedWall) updateWall(selectedWall.id, { interiorColor: wc.color }); }}
                ></button>
              {/each}
            </div>
            <label class="flex items-center gap-2">
              <span class="text-xs text-gray-500">Custom:</span>
              <input type="color" value={sideColor} oninput={(e) => { if (selectedWall) updateWall(selectedWall.id, { interiorColor: (e.target as HTMLInputElement).value }); }} class="w-8 h-6 rounded border border-gray-200 cursor-pointer" />
            </label>
            <span class="text-xs text-gray-500">Texture</span>
            <div class="grid grid-cols-3 gap-1.5">
              <button
                class="p-1.5 rounded-md border-2 text-[10px] text-center h-14 {!sideTex ? 'border-blue-500 ring-1 ring-blue-200' : 'border-gray-200 hover:border-gray-300'}"
                onclick={() => { if (selectedWall) updateWall(selectedWall.id, { interiorTexture: 'none' }); }}
              >None</button>
              {#each wallColors.filter(wc => wc.texture) as wc}
                {@const texPath = wallTexPaths[wc.id] ?? ''}
                <button
                  class="rounded-md border-2 text-[10px] text-center h-14 flex flex-col items-center justify-end overflow-hidden relative {sideTex === wc.id ? 'border-blue-500 ring-1 ring-blue-200' : 'border-gray-200 hover:border-gray-300'}"
                  style={texPath ? `background-image: url(${texPath}); background-size: cover; background-position: center;` : `background-color: ${wc.color}20`}
                  onclick={() => { if (selectedWall) updateWall(selectedWall.id, { interiorTexture: wc.id, interiorColor: wc.color }); }}
                ><span class="bg-white/80 backdrop-blur-sm rounded px-1 py-0.5 mb-0.5 text-gray-700">{wc.name}</span></button>
              {/each}
            </div>
          </div>
        {:else}
          {@const sideColor = selectedWall.exteriorColor || selectedWall.color}
          {@const sideTex = selectedWall.exteriorTexture === 'none' ? undefined : (selectedWall.exteriorTexture || selectedWall.texture)}
          <div class="space-y-2">
            <span class="text-xs text-gray-500">Color</span>
            <div class="grid grid-cols-6 gap-1.5">
              {#each wallColors as wc}
                <button
                  class="w-7 h-7 rounded-md border-2 hover:border-gray-300 transition-colors {sideColor === wc.color ? 'border-blue-500 ring-1 ring-blue-200' : 'border-gray-200'}"
                  style="background-color: {wc.color}"
                  title={wc.name}
                  onclick={() => { if (selectedWall) updateWall(selectedWall.id, { exteriorColor: wc.color }); }}
                ></button>
              {/each}
            </div>
            <label class="flex items-center gap-2">
              <span class="text-xs text-gray-500">Custom:</span>
              <input type="color" value={sideColor} oninput={(e) => { if (selectedWall) updateWall(selectedWall.id, { exteriorColor: (e.target as HTMLInputElement).value }); }} class="w-8 h-6 rounded border border-gray-200 cursor-pointer" />
            </label>
            <span class="text-xs text-gray-500">Texture</span>
            <div class="grid grid-cols-3 gap-1.5">
              <button
                class="p-1.5 rounded-md border-2 text-[10px] text-center h-14 {!sideTex ? 'border-blue-500 ring-1 ring-blue-200' : 'border-gray-200 hover:border-gray-300'}"
                onclick={() => { if (selectedWall) updateWall(selectedWall.id, { exteriorTexture: 'none' }); }}
              >None</button>
              {#each wallColors.filter(wc => wc.texture) as wc}
                {@const texPath = wallTexPaths[wc.id] ?? ''}
                <button
                  class="rounded-md border-2 text-[10px] text-center h-14 flex flex-col items-center justify-end overflow-hidden relative {sideTex === wc.id ? 'border-blue-500 ring-1 ring-blue-200' : 'border-gray-200 hover:border-gray-300'}"
                  style={texPath ? `background-image: url(${texPath}); background-size: cover; background-position: center;` : `background-color: ${wc.color}20`}
                  onclick={() => { if (selectedWall) updateWall(selectedWall.id, { exteriorTexture: wc.id, exteriorColor: wc.color }); }}
                ><span class="bg-white/80 backdrop-blur-sm rounded px-1 py-0.5 mb-0.5 text-gray-700">{wc.name}</span></button>
              {/each}
            </div>
          </div>
        {/if}
      </div>
    </div>

  {:else if selectedDoor}
    <h3 class="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
      <span class="w-6 h-6 bg-amber-100 rounded flex items-center justify-center text-xs">🚪</span>
      {$t('openingProperties.door')}
    </h3>
    <div class="space-y-3">
      <label class="block">
        <span class="text-xs text-gray-500">{$t('openingProperties.width')} ({unitLabel()})</span>
        <input type="number" value={displayValue(selectedDoor.width)} oninput={onDoorWidth} onblur={onDoorWidth} step="any" min="0" class="w-full px-2 py-1 border border-gray-200 rounded text-sm" />
      </label>
      <label class="block">
        <span class="text-xs text-gray-500">{$t('openingProperties.fromA')} ({unitLabel()})</span>
        <input type="number" value={displayValue(doorDistFromA)} oninput={onDoorDistFromA} onblur={onDoorDistFromA} step="any" class="w-full px-2 py-1 border border-gray-200 rounded text-sm" />
      </label>
      <label class="block">
        <span class="text-xs text-gray-500">{$t('openingProperties.fromB')} ({unitLabel()})</span>
        <input type="number" value={displayValue(doorDistFromB)} oninput={onDoorDistFromB} onblur={onDoorDistFromB} step="any" class="w-full px-2 py-1 border border-gray-200 rounded text-sm" />
      </label>
      <label class="block">
        <span class="text-xs text-gray-500">{$t('openingProperties.height')} ({unitLabel()})</span>
        <input type="number" value={displayValue(selectedDoor.height ?? 210)} oninput={onDoorHeight} onblur={onDoorHeight} step="any" class="w-full px-2 py-1 border border-gray-200 rounded text-sm" />
      </label>
      <label class="block">
        <span class="text-xs text-gray-500">{$t('openingProperties.type')}</span>
        <select value={selectedDoor.type} onchange={onDoorType} class="w-full px-2 py-1 border border-gray-200 rounded text-sm">
          <option value="single">{$t('openingCatalog.single')}</option>
          <option value="double">{$t('openingCatalog.double')}</option>
          <option value="sliding">{$t('openingCatalog.sliding')}</option>
          <option value="french">{$t('openingCatalog.french')}</option>
          <option value="pocket">{$t('openingCatalog.pocket')}</option>
          <option value="bifold">{$t('openingCatalog.bifold')}</option>
          <option value="opening">{$t('openingProperties.doorway')}</option>
          <option value="garage">{$t('openingCatalog.garage')}</option>
        </select>
      </label>
      {#if selectedDoor.type !== 'opening' && selectedDoor.type !== 'garage'}
      <div role="group" aria-label={$t('openingProperties.hinge')}>
        <span class="text-xs text-gray-500">{$t('openingProperties.hinge')}</span>
        <div class="flex gap-2">
          <button aria-pressed={selectedDoor.swingDirection === 'left'} onclick={() => { if (selectedDoor) updateDoor(selectedDoor.id, { swingDirection: 'left' }); }} class="flex-1 px-2 py-1.5 border rounded text-sm transition-colors {selectedDoor?.swingDirection === 'left' ? 'bg-blue-100 border-blue-400 text-blue-700' : 'border-gray-200 hover:bg-gray-50'}">{$t('openingProperties.left')}</button>
          <button aria-pressed={selectedDoor.swingDirection === 'right'} onclick={() => { if (selectedDoor) updateDoor(selectedDoor.id, { swingDirection: 'right' }); }} class="flex-1 px-2 py-1.5 border rounded text-sm transition-colors {selectedDoor?.swingDirection === 'right' ? 'bg-blue-100 border-blue-400 text-blue-700' : 'border-gray-200 hover:bg-gray-50'}">{$t('openingProperties.right')}</button>
        </div>
      </div>
      <div role="group" aria-label={$t('openingProperties.opens')}>
        <span class="text-xs text-gray-500">{$t('openingProperties.opens')}</span>
        <div class="flex gap-2">
          <button aria-pressed={!selectedDoor.flipSide} onclick={() => { if (selectedDoor) updateDoor(selectedDoor.id, { flipSide: false }); }} class="flex-1 px-2 py-1.5 border rounded text-sm transition-colors {!(selectedDoor?.flipSide) ? 'bg-blue-100 border-blue-400 text-blue-700' : 'border-gray-200 hover:bg-gray-50'}">{$t('openingProperties.inward')}</button>
          <button aria-pressed={!!selectedDoor.flipSide} onclick={() => { if (selectedDoor) updateDoor(selectedDoor.id, { flipSide: true }); }} class="flex-1 px-2 py-1.5 border rounded text-sm transition-colors {selectedDoor?.flipSide ? 'bg-blue-100 border-blue-400 text-blue-700' : 'border-gray-200 hover:bg-gray-50'}">{$t('openingProperties.outward')}</button>
        </div>
      </div>
      {/if}
    </div>

  {:else if selectedWindow}
    <h3 class="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
      <span class="w-6 h-6 bg-cyan-100 rounded flex items-center justify-center text-xs">🪟</span>
      {$t('openingProperties.window')}
    </h3>
    <div class="space-y-3">
      <label class="block">
        <span class="text-xs text-gray-500">{$t('openingProperties.type')}</span>
        <select value={selectedWindow.type ?? 'standard'} onchange={onWindowType} class="w-full px-2 py-1 border border-gray-200 rounded text-sm">
          <option value="standard">{$t('openingCatalog.standard')}</option>
          <option value="fixed">{$t('openingCatalog.fixed')}</option>
          <option value="casement">{$t('openingCatalog.casement')}</option>
          <option value="sliding">{$t('openingCatalog.sliding')}</option>
          <option value="bay">{$t('openingCatalog.bay')}</option>
        </select>
      </label>
      <label class="block">
        <span class="text-xs text-gray-500">{$t('openingProperties.width')} ({unitLabel()})</span>
        <input type="number" value={displayValue(selectedWindow.width)} oninput={onWindowWidth} onblur={onWindowWidth} step="any" min="0" class="w-full px-2 py-1 border border-gray-200 rounded text-sm" />
      </label>
      <label class="block">
        <span class="text-xs text-gray-500">{$t('openingProperties.fromA')} ({unitLabel()})</span>
        <input type="number" value={displayValue(windowDistFromA)} oninput={onWindowDistFromA} onblur={onWindowDistFromA} step="any" class="w-full px-2 py-1 border border-gray-200 rounded text-sm" />
      </label>
      <label class="block">
        <span class="text-xs text-gray-500">{$t('openingProperties.fromB')} ({unitLabel()})</span>
        <input type="number" value={displayValue(windowDistFromB)} oninput={onWindowDistFromB} onblur={onWindowDistFromB} step="any" class="w-full px-2 py-1 border border-gray-200 rounded text-sm" />
      </label>
      <label class="block">
        <span class="text-xs text-gray-500">{$t('openingProperties.height')} ({unitLabel()})</span>
        <input type="number" value={displayValue(selectedWindow.height)} oninput={onWindowHeight} onblur={onWindowHeight} step="any" class="w-full px-2 py-1 border border-gray-200 rounded text-sm" />
      </label>
      <label class="block">
        <span class="text-xs text-gray-500">{$t('openingProperties.sill')} ({unitLabel()})</span>
        <input type="number" value={displayValue(selectedWindow.sillHeight)} oninput={onWindowSill} onblur={onWindowSill} step="any" class="w-full px-2 py-1 border border-gray-200 rounded text-sm" />
      </label>
    </div>

  {:else if selectedFurniture}
    <h3 class="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
      <span class="w-6 h-6 bg-purple-100 rounded flex items-center justify-center text-xs">
        {getCatalogItem(selectedFurniture.catalogId)?.icon ?? '🪑'}
      </span>
      {$t('furnitureProperties.heading', { name: getCatalogItem(selectedFurniture.catalogId)?.name ?? $t('furnitureProperties.fallback') })}
      <button
        onclick={() => { if (selectedFurniture) toggleFurnitureLock(selectedFurniture.id); }}
        class="ml-auto px-1.5 py-0.5 rounded text-xs border transition-colors {selectedFurniture.locked ? 'bg-amber-100 border-amber-400 text-amber-700' : 'border-gray-200 hover:bg-gray-50 text-gray-500'}"
        title={selectedFurniture.locked ? $t('furnitureProperties.unlock') : $t('furnitureProperties.lock')}
      >{selectedFurniture.locked ? `🔒 ${$t('furnitureProperties.locked')}` : '🔓'}</button>
    </h3>
    {#if selectedFurniture.catalogId === 'imported_object'}
      <p class="mb-3 text-xs text-gray-500 break-words">{$t('furnitureProperties.originalCategory', { category: selectedFurniture.sourceCategory || $t('furnitureProperties.unknown') })}</p>
    {:else if selectedFurniture.catalogId === 'stairs'}
      <p class="mb-3 text-xs text-gray-500">{$t('furnitureProperties.stairsHelp')}</p>
    {/if}
    <div class="space-y-3">
      <!-- Color -->
      <div>
        <div class="flex items-center gap-1 mb-2">
          <span class="text-xs text-gray-500">{$t('furnitureProperties.color')}</span>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="text-gray-400">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
            <circle cx="9" cy="9" r="2"/>
            <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/>
          </svg>
        </div>
        <div class="grid grid-cols-5 gap-1.5 mb-2">
          {#each ['#ffffff', '#f5f5dc', '#d2b48c', '#daa520', '#8b4513', '#696969', '#191970', '#000000', '#dc143c', '#228b22'] as color}
            <button
              class="w-6 h-6 rounded border-2 hover:border-gray-300 transition-colors {(selectedFurniture.color ?? getCatalogItem(selectedFurniture.catalogId)?.color) === color ? 'border-blue-500 ring-1 ring-blue-200' : 'border-gray-200'}"
              style="background-color: {color}"
              title={$t('furnitureProperties.colorValue', { color })}
              onclick={() => onFurnitureColor(color)}
            ></button>
          {/each}
        </div>
        <div class="flex items-center gap-2">
          <span class="text-xs text-gray-500">{$t('furnitureProperties.custom')}</span>
          <input 
            type="color" aria-label={$t('furnitureProperties.customColor')}
            value={selectedFurniture.color ?? getCatalogItem(selectedFurniture.catalogId)?.color ?? '#888888'} 
            oninput={(e) => onFurnitureColor((e.target as HTMLInputElement).value)} 
            class="w-8 h-6 rounded border border-gray-200 cursor-pointer" 
          />
        </div>
      </div>
      
      <!-- Dimensions -->
      <label class="block">
        <span class="text-xs text-gray-500">{$t('openingProperties.width')} ({unitLabel()})</span>
        <input 
          type="number" 
          value={displayValue(selectedFurniture.width ?? getCatalogItem(selectedFurniture.catalogId)?.width ?? 50)}
          oninput={onFurnitureWidth} onblur={onFurnitureWidth} min={settings.units === 'imperial' ? 1 / 2.54 : 1} step="any"
          class="w-full px-2 py-1 border border-gray-200 rounded text-sm" 
        />
      </label>
      <label class="block">
        <span class="text-xs text-gray-500">{$t('furnitureProperties.depth')} ({unitLabel()})</span>
        <input 
          type="number" 
          value={displayValue(selectedFurniture.depth ?? getCatalogItem(selectedFurniture.catalogId)?.depth ?? 50)}
          oninput={onFurnitureDepth} onblur={onFurnitureDepth} min={settings.units === 'imperial' ? 1 / 2.54 : 1} step="any"
          class="w-full px-2 py-1 border border-gray-200 rounded text-sm" 
        />
      </label>
      <label class="block">
        <span class="text-xs text-gray-500">{$t('openingProperties.height')} ({unitLabel()})</span>
        <input 
          type="number" 
          value={displayValue(selectedFurniture.height ?? getCatalogItem(selectedFurniture.catalogId)?.height ?? 50)}
          oninput={onFurnitureHeight} onblur={onFurnitureHeight} min={settings.units === 'imperial' ? 1 / 2.54 : 1} step="any"
          class="w-full px-2 py-1 border border-gray-200 rounded text-sm" 
        />
      </label>
      
      <!-- Material -->
      <label class="block">
        <span class="text-xs text-gray-500">{$t('furnitureProperties.material')}</span>
        <select 
          value={selectedFurniture.material ?? ''}
          onchange={onFurnitureMaterial} 
          class="w-full px-2 py-1 border border-gray-200 rounded text-sm"
        >
          <option value="">{$t('furnitureProperties.original')}</option>
          {#if selectedFurniture.material && !Object.hasOwn(furnitureFinishes, selectedFurniture.material)}
            <option value={selectedFurniture.material}>{$t('furnitureProperties.retained', { material: selectedFurniture.material })}</option>
          {/if}
          {#each Object.keys(furnitureFinishes) as finish}<option value={finish}>{$t(furnitureFinishLabels[finish])}</option>{/each}
        </select>
      </label>

      <p class="text-xs text-gray-500">{$t('furnitureProperties.appearanceHelp')}</p>
      
      <!-- Rotation -->
      <label class="block">
        <span class="text-xs text-gray-500">{$t('furnitureProperties.rotation')}</span>
        <input 
          type="number" 
          value={selectedFurniture.rotation}
          oninput={onFurnitureRotation} onblur={onFurnitureRotation} step="any"
          class="w-full px-2 py-1 border border-gray-200 rounded text-sm" 
        />
      </label>

      <!-- Rotate / Flip controls -->
      <div class="flex gap-1">
        <button
          onclick={() => { if (selectedFurniture) updateFurniture(selectedFurniture.id, { rotation: selectedFurniture.rotation - 90 }); }}
          class="flex-1 px-2 py-1.5 border border-gray-200 rounded text-sm hover:bg-gray-50 transition-colors"
          title={$t('furnitureProperties.rotateLeft')}
        >↺ 90°</button>
        <button
          onclick={() => { if (selectedFurniture) updateFurniture(selectedFurniture.id, { rotation: selectedFurniture.rotation + 90 }); }}
          class="flex-1 px-2 py-1.5 border border-gray-200 rounded text-sm hover:bg-gray-50 transition-colors"
          title={$t('furnitureProperties.rotateRight')}
        >↻ 90°</button>
      </div>
      <div class="flex gap-1">
        <button
          onclick={() => { if (selectedFurniture) { const s = selectedFurniture.scale; updateFurniture(selectedFurniture.id, { scale: { x: s.x * -1, y: s.y, z: s.z } }); } }}
          class="flex-1 px-2 py-1.5 border border-gray-200 rounded text-sm hover:bg-gray-50 transition-colors"
          title={$t('furnitureProperties.flipHorizontal')}
        >↔ {$t('furnitureProperties.flipH')}</button>
        <button
          onclick={() => { if (selectedFurniture) { const s = selectedFurniture.scale; updateFurniture(selectedFurniture.id, { scale: { x: s.x, y: s.y * -1, z: s.z } }); } }}
          class="flex-1 px-2 py-1.5 border border-gray-200 rounded text-sm hover:bg-gray-50 transition-colors"
          title={$t('furnitureProperties.flipVertical')}
        >↕ {$t('furnitureProperties.flipV')}</button>
      </div>
      
      <!-- Reset button -->
      <button
        onclick={resetFurnitureDefaults}
        class="w-full px-2 py-1.5 border border-gray-300 rounded text-sm text-gray-600 hover:bg-gray-50 transition-colors"
      >
        {$t('furnitureProperties.reset')}
      </button>
    </div>

  {:else if selectedRoom}
    <h3 class="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
      <span class="w-6 h-6 bg-green-100 rounded flex items-center justify-center text-xs">⬜</span>
      {$t('roomProperties.heading')}
    </h3>
    <div class="space-y-3">
      <label class="block">
        <span class="text-xs text-gray-500">{$t('roomProperties.type')}</span>
        <select value={selectedRoomType()} onchange={onRoomType} class="w-full px-2 py-1 border border-gray-200 rounded text-sm">
          {#each roomTypes as rt}
            <option value={rt.id}>{rt.icon} {$t(roomTypeLabels[rt.id])}</option>
          {/each}
        </select>
      </label>
      <label class="block">
        <span class="text-xs text-gray-500">{$t('roomProperties.name')}</span>
        <input type="text" value={selectedRoom.name} oninput={onRoomName} class="w-full px-2 py-1 border border-gray-200 rounded text-sm" />
      </label>
      <label class="block">
        <span class="text-xs text-gray-500">{$t('roomProperties.category')}</span>
        <select value={selectedRoom.roomType ?? 'indoor'} onchange={(e) => { if (selectedRoom) { const v = (e.target as HTMLSelectElement).value as RoomCategory; updateRoom(selectedRoom.id, { roomType: v }); updateDetectedRoom(selectedRoom.id, { roomType: v } as any); } }} class="w-full px-2 py-1 border border-gray-200 rounded text-sm">
          <option value="indoor">🏠 {$t('areaSummary.indoor')}</option>
          <option value="outdoor">🌳 {$t('areaSummary.outdoor')}</option>
          <option value="garage">🚗 {$t('areaSummary.garage')}</option>
          <option value="utility">🔧 {$t('areaSummary.utility')}</option>
        </select>
      </label>
      <div>
        <span class="text-xs text-gray-500">{$t('roomProperties.area')}</span>
        <p class="text-sm text-gray-700">{formatArea(selectedRoom.area, settings.units)}</p>
      </div>
      <!-- Room Color -->
      <label class="flex items-center gap-2 text-sm text-gray-700">
        <input type="checkbox" checked={selectedRoom.floorOpening ?? false}
          onchange={(e) => { if (selectedRoom) updateRoom(selectedRoom.id, { floorOpening: e.currentTarget.checked }); }} />
        {$t('roomProperties.opening')}
      </label>
      <p class="text-xs text-gray-500">{$t('roomProperties.openingHelp')}</p>
      <div>
        <span class="text-xs text-gray-500 mb-1.5 block">{$t('roomProperties.color')}{selectedRoom.floorTexture === 'none' ? $t('roomProperties.floorColor') : ''}</span>
        <div class="grid grid-cols-5 gap-1.5 mb-2">
          {#each roomColorPresets as preset}
            <button
              class="w-7 h-7 rounded-md border-2 hover:border-gray-300 transition-colors {selectedRoom.color === preset.color ? 'border-blue-500 ring-1 ring-blue-200' : 'border-gray-200'}"
              style="background-color: {preset.color}"
              title={$t(roomColorLabels[preset.name])}
              onclick={() => onRoomColor(preset.color)}
            ></button>
          {/each}
        </div>
        <div class="flex items-center gap-2">
          <span class="text-xs text-gray-500">{$t('furnitureProperties.custom')}</span>
          <input type="color" aria-label={$t('furnitureProperties.customColor')} value={selectedRoom.color ?? '#ffffff'} oninput={(e) => onRoomColor((e.target as HTMLInputElement).value)} class="w-8 h-6 rounded border border-gray-200 cursor-pointer" />
        </div>
      </div>
      <div>
        <div class="flex items-center gap-1 mb-2">
          <span class="text-xs text-gray-500">{$t('roomProperties.floorMaterial')}</span>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="text-gray-400">
            <path d="M3 3h18v18H3z"/>
            <path d="M8 8h8v8H8z"/>
          </svg>
        </div>
        <div class="space-y-3">
          {#each textureGroups as group}
            <div>
              <span class="text-xs font-medium text-gray-600 mb-1.5 block">{$t(floorGroupLabels[group.label])}</span>
              <div class="grid grid-cols-3 gap-1.5">
                {#each group.ids as matId}
                  {@const mat = floorMaterials.find(m => m.id === matId)}
                  {#if mat}
                    {@const texPath = floorTexPaths[mat.id] ?? ''}
                    <button
                      class="p-1 rounded-lg border-2 hover:border-gray-300 transition-all text-xs {selectedRoom.floorTexture === mat.id ? 'border-blue-500 ring-2 ring-blue-200 shadow-sm' : 'border-gray-200'}"
                      title={$t(floorMaterialLabels[mat.id])}
                      onclick={() => onRoomFloor(mat.id)}
                    >
                      <div
                        class="w-full h-12 rounded-md mb-1 overflow-hidden"
                        style={texPath ? `background-image: url(${texPath}); background-size: cover; background-position: center;` : `background-color: ${mat.id === 'none' ? (selectedRoom.color ?? mat.color) : mat.color}`}
                      ></div>
                      <div class="text-center leading-3 text-[10px] text-gray-600 truncate">{$t(floorMaterialLabels[mat.id])}</div>
                    </button>
                  {/if}
                {/each}
              </div>
            </div>
          {/each}
        </div>
      </div>
    </div>

  {:else if selectedEntourage}
    <h3 class="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
      <span class="w-6 h-6 bg-green-100 rounded flex items-center justify-center text-xs">🌳</span>
      {$t('entourageLabels.title')}
    </h3>
    <div class="space-y-3">
      <div>
        <span class="text-xs text-gray-500">{$t('symbolProperties.symbol')}</span>
        <p class="text-sm text-gray-700">{entourageLabels[selectedEntourage.defId] ? $t(entourageLabels[selectedEntourage.defId]) : getEntourageDef(selectedEntourage.defId)?.name ?? $t('symbolProperties.custom')}</p>
      </div>
      <label class="block">
        <span class="text-xs text-gray-500">{$t('openingProperties.width')} ({unitLabel()})</span>
        <input type="number" value={displayValue(selectedEntourage.width)} oninput={(e) => dimensionInput(e, selectedEntourage!.width, value => updateEntourageItem(selectedEntourage!.id, { width: value }))} onblur={(e) => dimensionInput(e, selectedEntourage!.width, value => updateEntourageItem(selectedEntourage!.id, { width: value }))} min={settings.units === 'imperial' ? 1 / 2.54 : 1} step="any" class="w-full px-2 py-1 border border-gray-200 rounded text-sm" />
      </label>
      <label class="block">
        <span class="text-xs text-gray-500">{$t('symbolProperties.rotation')}</span>
        <input type="number" value={selectedEntourage.rotation} oninput={(e) => scalarInput(e, selectedEntourage!.rotation, value => updateEntourageItem(selectedEntourage!.id, { rotation: value }))} onblur={(e) => scalarInput(e, selectedEntourage!.rotation, value => updateEntourageItem(selectedEntourage!.id, { rotation: value }))} step="any" class="w-full px-2 py-1 border border-gray-200 rounded text-sm" />
      </label>
      <label class="block">
        <span class="text-xs text-gray-500">{$t('symbolProperties.opacity', { percent: Math.round((selectedEntourage.opacity ?? 1) * 100) })}</span>
        <input type="range" min="0.1" max="1" step="0.05" value={selectedEntourage.opacity ?? 1} oninput={(e) => { if (selectedEntourage) updateEntourageItem(selectedEntourage.id, { opacity: Number((e.target as HTMLInputElement).value) }); }} class="w-full" />
      </label>
      <div class="flex gap-2">
        <button onclick={() => { if (selectedEntourage) updateEntourageItem(selectedEntourage.id, { locked: !selectedEntourage.locked }); }} class="flex-1 px-2 py-1.5 border rounded text-sm transition-colors {selectedEntourage.locked ? 'bg-amber-50 border-amber-300 text-amber-700' : 'border-gray-200 hover:bg-gray-50'}">{selectedEntourage.locked ? $t('symbolProperties.locked') : $t('symbolProperties.unlocked')}</button>
        <button onclick={() => { if (selectedEntourage) { removeElement(selectedEntourage.id); selectedElementId.set(null); } }} class="flex-1 px-2 py-1.5 border border-red-200 text-red-600 rounded text-sm hover:bg-red-50 transition-colors">{$t('symbolProperties.delete')}</button>
      </div>
    </div>

  {:else if selectedStair}
    <h3 class="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
      <span class="w-6 h-6 bg-gray-200 rounded flex items-center justify-center text-xs">🪜</span>
      {$t('stairProperties.heading')}
    </h3>
    <div class="space-y-3">
      <label class="block">
        <span class="text-xs text-gray-500">{$t('openingProperties.type')}</span>
        <select value={selectedStair.stairType || 'straight'} onchange={(e) => updateStair(selectedStair!.id, { stairType: (e.target as HTMLSelectElement).value as any })} class="w-full px-2 py-1 border border-gray-200 rounded text-sm">
          <option value="straight">{$t('stairProperties.straight')}</option>
          <option value="l-shaped">{$t('stairProperties.l')}</option>
          <option value="u-shaped">{$t('stairProperties.u')}</option>
          <option value="spiral">{$t('stairProperties.spiral')}</option>
        </select>
      </label>
      <label class="block">
        <span class="text-xs text-gray-500">{$t('openingProperties.width')} ({unitLabel()})</span>
        <input type="number" value={displayValue(selectedStair.width)} oninput={onStairWidth} onblur={onStairWidth} min="0" step="any" class="w-full px-2 py-1 border border-gray-200 rounded text-sm" />
      </label>
      <label class="block">
        <span class="text-xs text-gray-500">{$t('furnitureProperties.depth')} ({unitLabel()})</span>
        <input type="number" value={displayValue(selectedStair.depth)} oninput={onStairDepth} onblur={onStairDepth} min="0" step="any" class="w-full px-2 py-1 border border-gray-200 rounded text-sm" />
      </label>
      <label class="block">
        <span class="text-xs text-gray-500">{$t('stairProperties.risers')}</span>
        <input type="number" value={selectedStair.riserCount} min="3" max="30" step="1" oninput={onStairRisers} onblur={onStairRisers} class="w-full px-2 py-1 border border-gray-200 rounded text-sm" />
      </label>
      <div role="group" aria-label={$t('stairProperties.direction')}>
        <span class="text-xs text-gray-500">{$t('stairProperties.direction')}</span>
        <div class="flex gap-2">
          <button aria-pressed={selectedStair.direction === 'up'} onclick={() => updateStair(selectedStair!.id, { direction: 'up' })} class="flex-1 px-2 py-1.5 border rounded text-sm transition-colors {selectedStair.direction === 'up' ? 'bg-blue-100 border-blue-400 text-blue-700' : 'border-gray-200 hover:bg-gray-50'}">{$t('stairProperties.up')}</button>
          <button aria-pressed={selectedStair.direction === 'down'} onclick={() => updateStair(selectedStair!.id, { direction: 'down' })} class="flex-1 px-2 py-1.5 border rounded text-sm transition-colors {selectedStair.direction === 'down' ? 'bg-blue-100 border-blue-400 text-blue-700' : 'border-gray-200 hover:bg-gray-50'}">{$t('stairProperties.down')}</button>
        </div>
      </div>
      <label class="block">
        <span class="text-xs text-gray-500">{$t('furnitureProperties.rotation')}</span>
        <input type="number" value={selectedStair.rotation} step="any" oninput={onStairRotation} onblur={onStairRotation} class="w-full px-2 py-1 border border-gray-200 rounded text-sm" />
      </label>
    </div>
  {:else if selectedColumn}
    <h3 class="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
      <span class="w-6 h-6 bg-gray-200 rounded flex items-center justify-center text-xs">🏛️</span>
      {$t('columnProperties.heading')}
    </h3>
    <div class="space-y-3">
      <div role="group" aria-label={$t('columnProperties.shape')}>
        <span class="text-xs text-gray-500">{$t('columnProperties.shape')}</span>
        <div class="flex gap-2">
          <button aria-pressed={selectedColumn.shape === 'round'} onclick={() => updateColumn(selectedColumn!.id, { shape: 'round' })} class="flex-1 px-2 py-1.5 border rounded text-sm transition-colors {selectedColumn.shape === 'round' ? 'bg-blue-100 border-blue-400 text-blue-700' : 'border-gray-200 hover:bg-gray-50'}">⭕ {$t('columnProperties.round')}</button>
          <button aria-pressed={selectedColumn.shape === 'square'} onclick={() => updateColumn(selectedColumn!.id, { shape: 'square' })} class="flex-1 px-2 py-1.5 border rounded text-sm transition-colors {selectedColumn.shape === 'square' ? 'bg-blue-100 border-blue-400 text-blue-700' : 'border-gray-200 hover:bg-gray-50'}">⬜ {$t('columnProperties.square')}</button>
        </div>
      </div>
      <label class="block">
        <span class="text-xs text-gray-500">{selectedColumn.shape === 'round' ? $t('columnProperties.diameter') : $t('columnProperties.side')} ({unitLabel()})</span>
        <input type="number" value={displayValue(selectedColumn.diameter)} min={settings.units === 'imperial' ? 10 / 2.54 : 10} max={settings.units === 'imperial' ? 200 / 2.54 : 200} step="any" oninput={onColumnDiameter} onblur={onColumnDiameter} class="w-full px-2 py-1 border border-gray-200 rounded text-sm" />
      </label>
      <label class="block">
        <span class="text-xs text-gray-500">{$t('openingProperties.height')} ({unitLabel()})</span>
        <input type="number" value={displayValue(selectedColumn.height)} min={settings.units === 'imperial' ? 50 / 2.54 : 50} max={settings.units === 'imperial' ? 1000 / 2.54 : 1000} step="any" oninput={onColumnHeight} onblur={onColumnHeight} class="w-full px-2 py-1 border border-gray-200 rounded text-sm" />
      </label>
      <div>
        <span class="text-xs text-gray-500 mb-1.5 block">{$t('furnitureProperties.color')}</span>
        <div class="grid grid-cols-5 gap-1.5 mb-2">
          {#each columnColorPresets as preset}
            <button
              class="w-7 h-7 rounded-md border-2 hover:border-gray-300 transition-colors {selectedColumn.color === preset.color ? 'border-blue-500 ring-1 ring-blue-200' : 'border-gray-200'}"
              style="background-color: {preset.color}"
              title={$t(columnColorLabels[preset.name])}
              onclick={() => updateColumn(selectedColumn!.id, { color: preset.color })}
            ></button>
          {/each}
        </div>
        <div class="flex items-center gap-2">
          <span class="text-xs text-gray-500">{$t('furnitureProperties.custom')}</span>
          <input type="color" aria-label={$t('furnitureProperties.customColor')} value={selectedColumn.color} oninput={(e) => updateColumn(selectedColumn!.id, { color: (e.target as HTMLInputElement).value })} class="w-8 h-6 rounded border border-gray-200 cursor-pointer" />
        </div>
      </div>
      {#if selectedColumn.shape === 'square'}
        <label class="block">
          <span class="text-xs text-gray-500">{$t('furnitureProperties.rotation')}</span>
          <input type="number" value={selectedColumn.rotation} oninput={(e) => scalarInput(e, selectedColumn!.rotation, value => updateColumn(selectedColumn!.id, { rotation: value }))} onblur={(e) => scalarInput(e, selectedColumn!.rotation, value => updateColumn(selectedColumn!.id, { rotation: value }))} step="any" class="w-full px-2 py-1 border border-gray-200 rounded text-sm" />
        </label>
      {/if}
    </div>
  {:else if selectedTextAnnotation}
    <div class="space-y-3">
      <h3 class="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
        <span class="w-6 h-6 bg-emerald-100 rounded flex items-center justify-center text-xs">🏷️</span>
        {$t('annotationProperties.heading')}
      </h3>
      <label class="block">
        <span class="text-xs text-gray-500">{$t('annotationProperties.text')}</span>
        <textarea rows="3" value={selectedTextAnnotation.text} oninput={(e) => updateTextAnnotation(selectedTextAnnotation!.id, { text: (e.target as HTMLTextAreaElement).value })} class="w-full px-2 py-1 border border-gray-200 rounded text-sm resize-y"></textarea>
      </label>
      <label class="block">
        <span class="text-xs text-gray-500">{$t('annotationProperties.fontSize')}</span>
        <input type="number" value={selectedTextAnnotation.fontSize} min="8" max="72" oninput={(e) => scalarInput(e, selectedTextAnnotation!.fontSize, value => updateTextAnnotation(selectedTextAnnotation!.id, { fontSize: value }))} onblur={(e) => scalarInput(e, selectedTextAnnotation!.fontSize, value => updateTextAnnotation(selectedTextAnnotation!.id, { fontSize: value }))} step="any" class="w-full px-2 py-1 border border-gray-200 rounded text-sm" />
      </label>
      <label class="block">
        <span class="text-xs text-gray-500">{$t('furnitureProperties.color')}</span>
        <div class="flex items-center gap-2">
          <input type="color" value={selectedTextAnnotation.color} oninput={(e) => updateTextAnnotation(selectedTextAnnotation!.id, { color: (e.target as HTMLInputElement).value })} class="w-8 h-6 rounded border border-gray-200 cursor-pointer" />
          <span class="text-xs text-gray-400">{selectedTextAnnotation.color}</span>
        </div>
      </label>
      <label class="block">
        <span class="text-xs text-gray-500">{$t('symbolProperties.rotation')}</span>
        <input type="number" value={selectedTextAnnotation.rotation} oninput={(e) => scalarInput(e, selectedTextAnnotation!.rotation, value => updateTextAnnotation(selectedTextAnnotation!.id, { rotation: value }))} onblur={(e) => scalarInput(e, selectedTextAnnotation!.rotation, value => updateTextAnnotation(selectedTextAnnotation!.id, { rotation: value }))} step="any" class="w-full px-2 py-1 border border-gray-200 rounded text-sm" />
      </label>
      <label class="block">
        <span class="text-xs text-gray-500">X</span>
        <input type="number" value={selectedTextAnnotation.x} oninput={(e) => scalarInput(e, selectedTextAnnotation!.x, value => updateTextAnnotation(selectedTextAnnotation!.id, { x: value }))} onblur={(e) => scalarInput(e, selectedTextAnnotation!.x, value => updateTextAnnotation(selectedTextAnnotation!.id, { x: value }))} step="any" class="w-full px-2 py-1 border border-gray-200 rounded text-sm" />
      </label>
      <label class="block">
        <span class="text-xs text-gray-500">Y</span>
        <input type="number" value={selectedTextAnnotation.y} oninput={(e) => scalarInput(e, selectedTextAnnotation!.y, value => updateTextAnnotation(selectedTextAnnotation!.id, { y: value }))} onblur={(e) => scalarInput(e, selectedTextAnnotation!.y, value => updateTextAnnotation(selectedTextAnnotation!.id, { y: value }))} step="any" class="w-full px-2 py-1 border border-gray-200 rounded text-sm" />
      </label>
    </div>
  {/if}

  {#if detailTarget}
    {#key `${detailTarget.floorId}:${detailTarget.kind}:${detailTarget.id}`}
      <ItemDetailsPanel target={detailTarget} />
    {/key}
  {/if}

  <!-- Background Image Controls (always show when bg image exists) -->
  {#if hasBgImage && floor?.backgroundImage}
    <div class="mt-4 pt-3 border-t border-gray-200">
      <h3 class="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
        <span class="w-6 h-6 bg-blue-100 rounded flex items-center justify-center text-xs">🖼️</span>
        Background Image
      </h3>
      <div class="space-y-3">
        <label class="block">
          <span class="text-xs text-gray-500">Opacity</span>
          <input type="range" min="0.05" max="1" step="0.05" value={floor.backgroundImage.opacity} oninput={(e) => updateBackgroundImage({ opacity: Number((e.target as HTMLInputElement).value) })} class="w-full" />
        </label>
        <label class="block">
          <span class="text-xs text-gray-500">Scale</span>
          <input type="range" min="0.1" max="5" step="0.05" value={floor.backgroundImage.scale} oninput={(e) => updateBackgroundImage({ scale: Number((e.target as HTMLInputElement).value) })} class="w-full" />
        </label>
        <label class="block">
          <span class="text-xs text-gray-500">Rotation</span>
          <input type="number" value={floor.backgroundImage.rotation} oninput={(e) => scalarInput(e, floor!.backgroundImage!.rotation, value => updateBackgroundImage({ rotation: value }))} onblur={(e) => scalarInput(e, floor!.backgroundImage!.rotation, value => updateBackgroundImage({ rotation: value }))} step="any" class="w-full px-2 py-1 border border-gray-200 rounded text-sm" />
        </label>
        <div class="flex gap-2">
          <button
            onclick={() => updateBackgroundImage({ locked: !floor!.backgroundImage!.locked })}
            class="flex-1 px-2 py-1.5 border rounded text-sm {floor.backgroundImage.locked ? 'bg-amber-100 border-amber-400 text-amber-700' : 'border-gray-200 hover:bg-gray-50'}"
          >{floor.backgroundImage.locked ? '🔒 Locked' : '🔓 Unlocked'}</button>
          <button
            onclick={() => { calibrationPoints.set([]); calibrationMode.set(true); }}
            class="flex-1 px-2 py-1.5 border rounded text-sm border-gray-200 hover:bg-gray-50"
          >📏 Set Scale</button>
        </div>
        <button
          onclick={() => setBackgroundImage(undefined)}
          class="w-full px-2 py-1.5 border border-red-300 rounded text-sm text-red-600 hover:bg-red-50"
        >Remove Image</button>
      </div>
    </div>
  {/if}
</div>
