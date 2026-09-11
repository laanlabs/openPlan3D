<script lang="ts">
  import { t, locale } from '$lib/i18n';
  import { furnitureName } from '$lib/i18n/furnitureNames';
  import { entourageLabels } from '$lib/i18n/entourageLabels';
  import { onDestroy } from 'svelte';
  import { activeFloor, selectedElementId, selectedElementIds, selectedRoomId, detectedRoomsStore, layerVisibility } from '$lib/stores/project';
  import { getCatalogItem } from '$lib/utils/furnitureCatalog';
  import { getEntourageDef } from '$lib/utils/entourageCatalog';
  import type { Floor } from '$lib/models/types';

  let floor: Floor | null = $state(null);
  onDestroy(activeFloor.subscribe(f => { floor = f; }));

  let selId: string | null = $state(null);
  onDestroy(selectedElementId.subscribe(id => { selId = id; }));

  let vis = $state({ walls: true, doors: true, windows: true, furniture: true, stairs: true, columns: true, guides: true, measurements: true, annotations: true, textAnnotations: true, entourage: true, floorBelow: true });
  onDestroy(layerVisibility.subscribe(v => { vis = v; }));

  // Collapsed state per category
  let collapsed: Record<string, boolean> = $state({});

  function toggle(cat: string) {
    collapsed[cat] = !collapsed[cat];
  }

  function toggleVisibility(cat: Category['key']) {
    layerVisibility.update(v => ({ ...v, [cat]: !v[cat] }));
  }

  function select(id: string, category: Category['key']) {
    if (!vis[category]) layerVisibility.update(v => ({ ...v, [category]: true }));
    selectedElementIds.set(new Set());
    selectedRoomId.set(null);
    selectedElementId.set(id);
  }

  let rooms = $derived.by(() => {
    const result = new Map((floor?.rooms ?? []).map(room => [room.id, room]));
    for (const room of $detectedRoomsStore) result.set(room.id, room);
    return [...result.values()];
  });

  interface Category {
    key: keyof typeof vis;
    label: string;
    icon: string;
    items: { id: string; label: string; icon: string }[];
  }

  let categories: Category[] = $derived.by(() => {
    if (!floor) return [];
    const cats: Category[] = [];

    cats.push({
      key: 'walls', label: $t('layers.walls'), icon: '🧱',
      items: floor.walls.map((w, i) => ({ id: w.id, label: $t('layers.wall', { number: i + 1 }), icon: '─' })),
    });

    cats.push({
      key: 'doors', label: $t('layers.doors'), icon: '🚪',
      items: floor.doors.map((d, i) => ({ id: d.id, label: $t('layers.door', { type: $t(`layers.value.${d.type}`), number: i + 1 }), icon: '🚪' })),
    });

    cats.push({
      key: 'windows', label: $t('layers.windows'), icon: '🪟',
      items: floor.windows.map((w, i) => ({ id: w.id, label: $t('layers.window', { type: $t(`layers.value.${w.type}`), number: i + 1 }), icon: '🪟' })),
    });

    cats.push({
      key: 'furniture', label: $t('layers.furniture'), icon: '🪑',
      items: floor.furniture.map((fi) => {
        const cat = getCatalogItem(fi.catalogId);
        return { id: fi.id, label: furnitureName(fi.catalogId, $locale), icon: cat?.icon ?? '📦' };
      }),
    });

    if (floor.entourage?.length) {
      cats.push({
        key: 'entourage', label: $t('layers.entourage'), icon: '🌳',
        items: floor.entourage.map((en, i) => ({ id: en.id, label: entourageLabels[en.defId] ? $t(entourageLabels[en.defId]) : getEntourageDef(en.defId)?.name ?? $t('layers.custom', { number: i + 1 }), icon: '🌳' })),
      });
    }

    if (floor.stairs?.length) {
      cats.push({
        key: 'stairs', label: $t('layers.stairs'), icon: '🪜',
        items: floor.stairs.map((s, i) => ({ id: s.id, label: $t('layers.stair', { number: i + 1, direction: $t(`layers.value.${s.direction}`) }), icon: '🪜' })),
      });
    }

    if (floor.columns?.length) {
      cats.push({
        key: 'columns', label: $t('layers.columns'), icon: '🏛️',
        items: floor.columns.map((c, i) => ({ id: c.id, label: $t('layers.column', { shape: $t(`layers.value.${c.shape}`), number: i + 1 }), icon: '🏛️' })),
      });
    }

    if (floor.guides?.length) {
      cats.push({
        key: 'guides', label: $t('layers.guides'), icon: '📏',
        items: floor.guides.map((g, i) => ({ id: g.id, label: $t('layers.guide', { orientation: $t(`layers.value.${g.orientation}`), number: i + 1 }), icon: g.orientation === 'horizontal' ? '─' : '│' })),
      });
    }

    if (floor.measurements?.length) {
      cats.push({
        key: 'measurements', label: $t('layers.measurements'), icon: '📐',
        items: floor.measurements.map((m, i) => {
          const dist = Math.round(Math.hypot(m.x2 - m.x1, m.y2 - m.y1));
          return { id: m.id, label: $t('layers.measurement', { number: i + 1, distance: dist }), icon: '📐' };
        }),
      });
    }

    if (floor.annotations?.length) {
      cats.push({
        key: 'annotations', label: $t('layers.annotations'), icon: '📏',
        items: floor.annotations.map((a, i) => {
          const dist = Math.round(Math.hypot(a.x2 - a.x1, a.y2 - a.y1));
          const label = a.label || `${dist} cm`;
          return { id: a.id, label: $t('layers.annotation', { number: i + 1, label }), icon: '📏' };
        }),
      });
    }

    if (floor.textAnnotations?.length) {
      cats.push({
        key: 'textAnnotations', label: $t('layers.textAnnotations'), icon: 'T',
        items: floor.textAnnotations.map((note, i) => ({
          id: note.id,
          label: $t('layers.note', { number: i + 1, text: note.text.trim().replace(/\s+/g, ' ') || $t('layers.emptyNote') }),
          icon: 'T',
        })),
      });
    }

    return cats;
  });
</script>

<!-- Keep the list above the 45vh phone properties sheet, with room for the 3rem toolbar. -->
<div class="w-56 bg-white border-l border-gray-200 flex flex-col overflow-hidden text-xs select-none {(selId || $selectedRoomId || floor?.backgroundImage) ? 'max-md:max-h-[calc(55vh-3rem)]' : ''}">
  <div class="shrink-0 px-3 py-2 border-b border-gray-100 font-semibold text-gray-700 text-sm flex items-center gap-1.5">
    🗂 {$t('layers.title')}
  </div>
  <div class="flex-1 min-h-0 overflow-y-auto">
    {#each categories as cat}
      <div class="border-b border-gray-50 relative">
        <!-- Category header -->
        <button
          class="w-full flex items-center gap-1.5 px-2 py-1.5 hover:bg-gray-50 text-left"
          onclick={() => toggle(cat.key)}
        >
          <span class="text-[10px] text-gray-400 w-3">{collapsed[cat.key] ? '▸' : '▾'}</span>
          <span>{cat.icon}</span>
          <span class="font-medium text-gray-700 flex-1">{cat.label}</span>
          <span class="text-gray-400 mr-1">{cat.items.length}</span>
        </button>
        <!-- Visibility toggle (outside button to avoid nesting) -->
        <span
          role="button"
          tabindex="0"
          class="inline-flex p-0.5 rounded hover:bg-gray-200 text-sm leading-none cursor-pointer absolute right-2 top-1.5"
          class:opacity-30={!vis[cat.key]}
          onclick={(e) => { e.stopPropagation(); toggleVisibility(cat.key); }}
          onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleVisibility(cat.key); } }}
          title={vis[cat.key] ? $t('layers.hide', { category: cat.label }) : $t('layers.show', { category: cat.label })}
        >👁</span>
        <!-- Items -->
        {#if !collapsed[cat.key]}
          {#each cat.items as item}
            <button
              class="w-full flex items-center gap-1.5 pl-7 pr-2 py-1 hover:bg-blue-50 text-left transition-colors"
              class:bg-blue-100={selId === item.id}
              class:text-blue-700={selId === item.id}
              class:opacity-40={!vis[cat.key]}
              onclick={() => select(item.id, cat.key)}
            >
              <span class="text-[10px]">{item.icon}</span>
              <span class="truncate flex-1">{item.label}</span>
            </button>
          {/each}
          {#if cat.items.length === 0}
            <div class="pl-7 pr-2 py-1 text-gray-300 italic">{$t('layers.empty')}</div>
          {/if}
        {/if}
      </div>
    {/each}
    {#if rooms.length}
      <div class="border-b border-gray-100">
        <button onclick={() => toggle('rooms')} class="flex w-full items-center gap-1.5 px-2 py-1.5 text-left hover:bg-gray-50">
          <span class="w-3 text-[10px] text-gray-400">{collapsed.rooms ? '▸' : '▾'}</span>
          <span>🏠</span><span class="flex-1 font-medium text-gray-700">{$t('layers.rooms')}</span><span class="text-gray-400">{rooms.length}</span>
        </button>
        {#if !collapsed.rooms}
          {#each rooms as room (room.id)}
            <button aria-label={$t('layers.selectRoom', { name: room.name || $t('layers.unnamed') })} onclick={() => { selectedElementId.set(null); selectedElementIds.set(new Set()); selectedRoomId.set(room.id); }} class="w-full truncate py-1 pl-7 pr-2 text-left hover:bg-blue-50" class:bg-blue-100={$selectedRoomId === room.id}>{room.name || $t('layers.unnamed')}</button>
          {/each}
        {/if}
      </div>
    {/if}
    {#if categories.length === 0}
      <div class="p-4 text-gray-400 text-center">{$t('layers.none')}</div>
    {/if}
  </div>
</div>
