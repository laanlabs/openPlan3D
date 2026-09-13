<script lang="ts">
  import { t } from '$lib/i18n';
  import { activeFloor, detectedRoomsStore } from '$lib/stores/project';
  import { projectSettings, formatArea, formatLength } from '$lib/stores/settings';
  import type { Room, Wall, RoomCategory } from '$lib/models/types';
  import { resolveRooms } from '$lib/utils/roomDetection';

  // Auto subscriptions end when the summary dialog closes.
  let floor = $derived($activeFloor);
  let detectedRooms = $derived($detectedRoomsStore);
  let settings = $derived($projectSettings);
  type SummaryCategory = RoomCategory | 'uncategorized';

  // Geometry supplies current areas; saved boundaries supply names/categories.
  let allRooms = $derived(floor ? resolveRooms(floor, detectedRooms) : []);

  let totalArea = $derived(allRooms.reduce((sum: number, r: Room) => sum + r.area, 0));

  let roomsByCategory = $derived.by(() => {
    const cats: Record<SummaryCategory, Room[]> = { indoor: [], outdoor: [], garage: [], utility: [], uncategorized: [] };
    for (const r of allRooms) {
      const cat = r.roomType ?? 'indoor';
      // Imported projects can retain category values outside the current model.
      // Keep those rooms and their original metadata, without guessing a category.
      if (cat === 'indoor' || cat === 'outdoor' || cat === 'garage' || cat === 'utility') cats[cat].push(r);
      else cats.uncategorized.push(r);
    }
    return cats;
  });

  let categoryTotals = $derived.by(() => {
    const cats = roomsByCategory;
    const result: { category: SummaryCategory; label: string; area: number; count: number }[] = [];
    const labels: Record<SummaryCategory, string> = { indoor: `🏠 ${$t('areaSummary.indoor')}`, outdoor: `🌳 ${$t('areaSummary.outdoor')}`, garage: `🚗 ${$t('areaSummary.garage')}`, utility: `🔧 ${$t('areaSummary.utility')}`, uncategorized: $t('areaSummary.uncategorized') };
    for (const [cat, rooms] of Object.entries(cats) as [SummaryCategory, Room[]][]) {
      if (rooms.length > 0) {
        result.push({ category: cat, label: labels[cat], area: rooms.reduce((s: number, r: Room) => s + r.area, 0), count: rooms.length });
      }
    }
    return result;
  });

  // Quick stats
  let totalWalls = $derived(floor?.walls.length ?? 0);
  let totalDoors = $derived(floor?.doors.length ?? 0);
  let totalWindows = $derived(floor?.windows.length ?? 0);

  function calcWallLength(wall: Wall): number {
    if (wall.curvePoint) {
      let len = 0; const N = 20;
      let px = wall.start.x, py = wall.start.y;
      for (let i = 1; i <= N; i++) {
        const t = i / N, mt = 1 - t;
        const nx = mt*mt*wall.start.x + 2*mt*t*wall.curvePoint.x + t*t*wall.end.x;
        const ny = mt*mt*wall.start.y + 2*mt*t*wall.curvePoint.y + t*t*wall.end.y;
        len += Math.hypot(nx - px, ny - py); px = nx; py = ny;
      }
      return len;
    }
    return Math.hypot(wall.end.x - wall.start.x, wall.end.y - wall.start.y);
  }

  let totalWallLength = $derived((floor?.walls ?? []).reduce((s: number, w: Wall) => s + calcWallLength(w), 0));
</script>

<div class="space-y-3">
  <!-- Quick Stats -->
  <div class="grid grid-cols-2 gap-2">
    <div class="bg-blue-50 rounded-lg p-2 text-center">
      <div class="text-lg font-bold text-blue-700">{allRooms.length}</div>
      <div class="text-[10px] text-blue-500">{$t('areaSummary.rooms')}</div>
    </div>
    <div class="bg-green-50 rounded-lg p-2 text-center">
      <div class="text-lg font-bold text-green-700">{formatArea(totalArea, settings.units)}</div>
      <div class="text-[10px] text-green-500">{$t('areaSummary.totalArea')}</div>
    </div>
    <div class="bg-amber-50 rounded-lg p-2 text-center">
      <div class="text-sm font-bold text-amber-700">{$t('areaSummary.openingCounts', { doors: totalDoors, windows: totalWindows })}</div>
      <div class="text-[10px] text-amber-500">{$t('areaSummary.doorsWindows')}</div>
    </div>
    <div class="bg-purple-50 rounded-lg p-2 text-center">
      <div class="text-sm font-bold text-purple-700">{formatLength(totalWallLength, settings.units)}</div>
      <div class="text-[10px] text-purple-500">{$t('areaSummary.wallLength')}</div>
    </div>
  </div>

  <!-- Category Breakdown -->
  {#if categoryTotals.length > 0}
    <div>
      <h4 class="text-xs font-semibold text-gray-500 uppercase mb-1.5">{$t('areaSummary.byCategory')}</h4>
      <div class="space-y-1">
        {#each categoryTotals as cat}
          <div class="flex items-center justify-between text-xs bg-gray-50 rounded px-2 py-1.5">
            <span class="text-gray-700">{cat.label} <span class="text-gray-400">({cat.count})</span></span>
            <span class="font-medium text-gray-800">{formatArea(cat.area, settings.units)}</span>
          </div>
        {/each}
      </div>
    </div>
  {/if}

  <!-- Per-Room Breakdown -->
  {#if allRooms.length > 0}
    <div>
      <h4 class="text-xs font-semibold text-gray-500 uppercase mb-1.5">{$t('areaSummary.roomBreakdown')}</h4>
      <div class="space-y-0.5">
        {#each allRooms as room}
          {@const pct = totalArea > 0 ? (room.area / totalArea * 100) : 0}
          <div class="flex items-center gap-1.5 text-xs px-1 py-1">
            <div class="flex-1 min-w-0">
              <div class="flex items-center justify-between">
                <span class="text-gray-700 truncate">{room.name}</span>
                <span class="text-gray-500 ml-1 shrink-0">{formatArea(room.area, settings.units)}</span>
              </div>
              <div class="w-full bg-gray-200 rounded-full h-1 mt-0.5">
                <div class="bg-blue-400 h-1 rounded-full" style="width: {Math.min(pct, 100)}%"></div>
              </div>
            </div>
            <span class="text-[10px] text-gray-400 w-8 text-right shrink-0">{pct.toFixed(0)}%</span>
          </div>
        {/each}
      </div>
    </div>
  {:else}
    <p class="text-xs text-gray-400 text-center py-4">{$t('areaSummary.noRooms')}<br/>{$t('areaSummary.drawWalls')}</p>
  {/if}
</div>
