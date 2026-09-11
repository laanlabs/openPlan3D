<script lang="ts">
  import { t } from '$lib/i18n';
  import { activeFloor, selectedElementId, removeElement, updateDoor, duplicateDoor, duplicateWindow, duplicateFurniture, duplicateWall, selectedTool } from '$lib/stores/project';
  import type { Floor, Door } from '$lib/models/types';

  let { canvasRect = { x: 0, y: 0 }, worldToScreen = (x: number, y: number) => ({ x: 0, y: 0 }) }: {
    canvasRect: { x: number; y: number };
    worldToScreen: (x: number, y: number) => { x: number; y: number };
  } = $props();

  let floor: Floor | null = $state(null);
  let selId: string | null = $state(null);

  activeFloor.subscribe((f) => { floor = f; });
  selectedElementId.subscribe((id) => { selId = id; });

  let elementInfo = $derived.by(() => {
    if (!floor || !selId) return null;
    const wall = floor.walls.find(w => w.id === selId);
    if (wall) {
      const cx = (wall.start.x + wall.end.x) / 2;
      const cy = (wall.start.y + wall.end.y) / 2;
      return { type: 'wall' as const, id: selId, cx, cy };
    }
    const door = floor.doors.find(d => d.id === selId);
    if (door) {
      const w = floor.walls.find(w => w.id === door.wallId);
      if (w) {
        const cx = w.start.x + (w.end.x - w.start.x) * door.position;
        const cy = w.start.y + (w.end.y - w.start.y) * door.position;
        return { type: 'door' as const, id: selId, cx, cy, door };
      }
    }
    const win = floor.windows.find(w => w.id === selId);
    if (win) {
      const w = floor.walls.find(w => w.id === win.wallId);
      if (w) {
        const cx = w.start.x + (w.end.x - w.start.x) * win.position;
        const cy = w.start.y + (w.end.y - w.start.y) * win.position;
        return { type: 'window' as const, id: selId, cx, cy };
      }
    }
    const furn = floor.furniture.find(f => f.id === selId);
    if (furn) {
      return { type: 'furniture' as const, id: selId, cx: furn.position.x, cy: furn.position.y };
    }
    return null;
  });

  function onDelete() {
    if (selId) {
      removeElement(selId);
      selectedElementId.set(null);
    }
  }

  function onDuplicate() {
    if (!elementInfo) return;
    let newId: string | null = null;
    if (elementInfo.type === 'door') newId = duplicateDoor(elementInfo.id);
    else if (elementInfo.type === 'window') newId = duplicateWindow(elementInfo.id);
    else if (elementInfo.type === 'furniture') newId = duplicateFurniture(elementInfo.id);
    else if (elementInfo.type === 'wall') newId = duplicateWall(elementInfo.id);
    if (newId) selectedElementId.set(newId);
  }

  function onFlipSwing() {
    if (!elementInfo || elementInfo.type !== 'door') return;
    const door = elementInfo.door as Door;
    updateDoor(door.id, { swingDirection: door.swingDirection === 'left' ? 'right' : 'left' });
  }

  function onFlipSide() {
    if (!elementInfo || elementInfo.type !== 'door') return;
    const door = elementInfo.door as Door;
    updateDoor(door.id, { flipSide: !door.flipSide });
  }
</script>

{#if elementInfo}
  {@const screenPos = worldToScreen(elementInfo.cx, elementInfo.cy)}
  <div
    class="absolute z-40 flex items-center gap-1 bg-white rounded-lg shadow-lg border border-gray-200 px-1.5 py-1"
    style="left: {screenPos.x + canvasRect.x}px; top: {screenPos.y + canvasRect.y - 48}px; transform: translateX(-50%); pointer-events: auto;"
  >
    <button
      class="w-7 h-7 flex items-center justify-center rounded hover:bg-gray-100 text-gray-600 hover:text-gray-800 transition-colors"
      title={$t('contextMenu.duplicate')}
      aria-label={$t('contextMenu.duplicate')}
      onclick={onDuplicate}
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
    </button>
    {#if elementInfo.type === 'door'}
      <button
        class="w-7 h-7 flex items-center justify-center rounded hover:bg-gray-100 text-gray-600 hover:text-gray-800 transition-colors"
        title={$t('contextToolbar.flipSwing')}
        aria-label={$t('contextToolbar.swingLabel')}
        onclick={onFlipSwing}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M7 16V4m0 0L3 8m4-4l4 4M17 8v12m0 0l4-4m-4 4l-4-4"/></svg>
      </button>
      <button
        class="w-7 h-7 flex items-center justify-center rounded hover:bg-gray-100 text-gray-600 hover:text-gray-800 transition-colors"
        title={$t('contextToolbar.flipSide')}
        aria-label={$t('contextToolbar.sideLabel')}
        onclick={onFlipSide}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 12h18M12 3v18"/><path d="M8 8l-4 4 4 4M16 8l4 4-4 4"/></svg>
      </button>
    {/if}
    <div class="w-px h-5 bg-gray-200"></div>
    <button
      class="w-7 h-7 flex items-center justify-center rounded hover:bg-red-50 text-gray-500 hover:text-red-600 transition-colors"
      title={$t('contextMenu.delete')}
      aria-label={$t('contextMenu.delete')}
      onclick={onDelete}
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14"/></svg>
    </button>
  </div>
{/if}
