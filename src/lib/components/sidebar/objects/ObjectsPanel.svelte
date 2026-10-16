<script lang="ts">
  import { onDestroy, tick } from 'svelte';
  import { t, locale } from '$lib/i18n';
  import { furnitureName } from '$lib/i18n/furnitureNames';
  import { catalogCategoryLabels, normalizeCatalogSearch } from '$lib/i18n/catalogCategories';
  import {
    placingFurnitureId, placingEntourageId, selectedTool, currentProject, addCustomEntourage,
  } from '$lib/stores/project';
  import type { CustomEntourageDef } from '$lib/models/types';
  import { furnitureCatalog, type FurnitureDef } from '$lib/utils/furnitureCatalog';
  import { entourageCatalog } from '$lib/utils/entourageCatalog';
  import {
    objectRooms, subcardsForRoom,
    catalogItemsForSubcard, entourageItemsForSubcard, itemsForRoom, subcardHasItems,
    type ObjectRoom, type ObjectSubcard,
  } from '$lib/utils/objectTaxonomy';
  import ObjectsSearch from './ObjectsSearch.svelte';
  import EmptyState from './EmptyState.svelte';
  import RoomCard from './RoomCard.svelte';
  import SubcardCard from './SubcardCard.svelte';
  import ObjectItemCard from './ObjectItemCard.svelte';
  import EntourageItemCard from './EntourageItemCard.svelte';
  import CategoryAccordion from './CategoryAccordion.svelte';
  import MyItemsPanel from './MyItemsPanel.svelte';

  let { onClose }: { onClose?: () => void } = $props();

  type Tab = 'rooms' | 'categories' | 'items';
  let tab = $state<Tab>('rooms');
  let myItems = $state<{ openPicker: () => void }>();
  let search = $state('');
  let openRoom = $state<ObjectRoom | null>(null);
  let openSubcard = $state<ObjectSubcard | null>(null);
  let showFavorites = $state(false);

  let currentPlacing = $state<string | null>(null);
  onDestroy(placingFurnitureId.subscribe((id) => { currentPlacing = id; }));

  let placingEntId = $state<string | null>(null);
  onDestroy(placingEntourageId.subscribe((id) => { placingEntId = id; }));

  const FAV_KEY = 'o3d_favorite_furniture';
  let favoriteIds = $state<string[]>((() => { try { return JSON.parse(localStorage.getItem(FAV_KEY) || '[]'); } catch { return []; } })());
  function toggleFavorite(id: string) {
    favoriteIds = favoriteIds.includes(id) ? favoriteIds.filter((value) => value !== id) : [...favoriteIds, id];
    localStorage.setItem(FAV_KEY, JSON.stringify(favoriteIds));
  }

  const RECENT_KEY = 'o3d_recent_furniture';
  const MAX_RECENT = 10;
  let recentIds = $state<string[]>((() => { try { return JSON.parse(localStorage.getItem(RECENT_KEY) || '[]'); } catch { return []; } })());
  function addToRecent(id: string) {
    recentIds = [id, ...recentIds.filter((value) => value !== id)].slice(0, MAX_RECENT);
    localStorage.setItem(RECENT_KEY, JSON.stringify(recentIds));
  }

  const favoriteItems = $derived(favoriteIds.map((id) => furnitureCatalog.find((item) => item.id === id)).filter((item): item is FurnitureDef => !!item));
  const recentItems = $derived(recentIds.map((id) => furnitureCatalog.find((item) => item.id === id)).filter((item): item is FurnitureDef => !!item));

  function place(item: FurnitureDef) {
    selectedTool.set('furniture');
    placingFurnitureId.set(item.id);
    addToRecent(item.id);
  }

  function armEntourage(id: string) {
    placingEntourageId.set(placingEntId === id ? null : id);
    selectedTool.set('select');
  }

  let customEntDefs = $state<CustomEntourageDef[]>([]);
  onDestroy(currentProject.subscribe((project) => { customEntDefs = project?.customEntourage ?? []; }));
  let entourageFileInput = $state<HTMLInputElement | null>(null);
  let symbolUploadError = $state<'tooLarge' | 'readFailed' | 'invalid' | null>(null);

  function onEntourageUpload(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    symbolUploadError = null;
    if (file.size > 2 * 1024 * 1024) { symbolUploadError = 'tooLarge'; return; }
    const reader = new FileReader();
    reader.onerror = () => { symbolUploadError = 'readFailed'; };
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const image = new Image();
      image.onerror = () => { symbolUploadError = 'invalid'; };
      image.onload = () => {
        const aspect = image.naturalHeight / image.naturalWidth || 1;
        const id = addCustomEntourage(file.name.replace(/\.[^.]+$/, ''), dataUrl, aspect);
        placingEntourageId.set(id);
      };
      image.src = dataUrl;
    };
    reader.readAsDataURL(file);
  }

  function resetNavigation() { openRoom = null; openSubcard = null; showFavorites = false; }

  function selectTab(next: Tab) { tab = next; resetNavigation(); }

  function roomCount(room: ObjectRoom): number {
    return room.kind === 'direct'
      ? itemsForRoom(room).length
      : subcardsForRoom(room.id).reduce((total, subcard) => total + subcard.itemIds.length, 0);
  }
  function roomItems(room: ObjectRoom): FurnitureDef[] {
    if (room.kind === 'direct') return itemsForRoom(room);
    return subcardsForRoom(room.id).flatMap((subcard) => catalogItemsForSubcard(subcard));
  }
  function visibleSubcards(room: ObjectRoom): ObjectSubcard[] {
    return subcardsForRoom(room.id).filter(subcardHasItems);
  }
  function subcardCount(subcard: ObjectSubcard): number { return subcard.itemIds.length; }

  const query = $derived(normalizeCatalogSearch(search));
  const searchItems = $derived(query
    ? furnitureCatalog.filter((item) => {
        const values = [furnitureName(item.id, $locale), item.name, item.category];
        if (catalogCategoryLabels[item.category]) values.push($t(catalogCategoryLabels[item.category]));
        return values.some((value) => normalizeCatalogSearch(value).includes(query));
      })
    : []);
  const searchEntourage = $derived(query ? entourageCatalog.filter((def) => normalizeCatalogSearch(def.name).includes(query)) : []);
  const searchTotal = $derived(searchItems.length + searchEntourage.length);
</script>

<div class="flex-1 flex flex-col overflow-hidden bg-white">
  <div class="flex items-center justify-between px-3 py-2 border-b border-gray-200">
    <h2 class="text-sm font-semibold text-gray-800">{$t('objectPanel.title')}</h2>
    <button type="button" class="md:hidden text-gray-400 hover:text-gray-600" aria-label={$t('objectPanel.close')} title={$t('objectPanel.close')} onclick={() => onClose?.()}>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
    </button>
  </div>

  <div class="p-3">
    <ObjectsSearch bind:value={search} onClear={resetNavigation} />
  </div>

  {#if query}
    <div class="flex-1 overflow-y-auto px-3 pb-3">
      <p class="text-[10px] text-gray-400 px-1 pb-2">{$t(searchTotal === 1 ? 'objectPanel.result' : 'objectPanel.results', { count: searchTotal })}</p>
      {#if searchItems.length}
        <div class="grid grid-cols-2 gap-2">
          {#each searchItems as item (item.id)}
            <ObjectItemCard {item} placing={currentPlacing === item.id} favorite={favoriteIds.includes(item.id)} onPlace={place} onToggleFavorite={toggleFavorite} />
          {/each}
        </div>
      {/if}
      {#if searchEntourage.length}
        <div class="grid grid-cols-3 gap-1.5 mt-2">
          {#each searchEntourage as def (def.id)}
            <EntourageItemCard {def} placing={placingEntId === def.id} onPlace={armEntourage} />
          {/each}
        </div>
      {/if}
      {#if !searchTotal}<EmptyState label={$t('objectPanel.empty')} />{/if}
    </div>
  {:else}
    <div class="flex border-b border-gray-200">
      {#each ([['rooms', 'objectPanel.tabs.rooms'], ['categories', 'objectPanel.tabs.categories'], ['items', 'objectPanel.tabs.items']] as const) as [id, key]}
        <button
          type="button"
          class="flex-1 py-2 text-xs font-semibold {tab === id ? 'text-slate-800 border-b-2 border-green-500' : 'text-gray-500 hover:text-gray-700'}"
          onclick={() => selectTab(id)}
        >{$t(key)}</button>
      {/each}
    </div>

    <div class="flex-1 overflow-y-auto p-3">
      {#if tab === 'rooms'}
        {#if !openRoom && !showFavorites}
          <div class="mb-3 rounded-xl border border-dashed border-gray-300 p-3">
            <div class="text-sm font-semibold text-gray-700">{$t('objectPanel.createItems')}</div>
            <p class="mb-2 text-xs text-gray-500">{$t('objectPanel.createItemsHelp')}</p>
            <button
              type="button"
              class="w-full rounded-full bg-green-100 px-3 py-2 text-sm font-medium text-green-700"
              onclick={async () => { selectTab('items'); await tick(); myItems?.openPicker(); }}
            >+ {$t('objectPanel.createItemsAction')}</button>
          </div>
        {/if}
        {#if showFavorites}
          <div class="mb-2 flex items-center gap-2">
            <button type="button" class="text-xs text-blue-600 hover:underline" onclick={() => showFavorites = false}>← {$t('objectPanel.back')}</button>
            <span class="text-sm font-semibold text-gray-700">♥ {$t('objectRooms.favorite')}</span>
          </div>
          <div class="grid grid-cols-2 gap-2">
            {#each favoriteItems as item (item.id)}
              <ObjectItemCard {item} placing={currentPlacing === item.id} favorite onPlace={place} onToggleFavorite={toggleFavorite} />
            {/each}
          </div>
          {#if favoriteItems.length === 0}<EmptyState label={$t('objectPanel.empty')} />{/if}
        {:else if openRoom}
          <div class="mb-2 flex items-center gap-2">
            <button type="button" class="text-xs text-blue-600 hover:underline" onclick={() => { openSubcard = null; openRoom = null; }}>← {$t('objectPanel.back')}</button>
            <span class="text-sm font-semibold text-gray-700">{openRoom.icon} {$t(openRoom.labelKey)}</span>
          </div>
          {#if openSubcard}
            <div class="mb-2 flex items-center gap-2">
              <button type="button" class="text-xs text-blue-600 hover:underline" onclick={() => openSubcard = null}>← {$t('objectPanel.back')}</button>
              <span class="text-xs font-semibold text-gray-600">{openSubcard.icon} {$t(openSubcard.labelKey)}</span>
            </div>
            {#if openSubcard.source === 'entourage'}
              <div class="grid grid-cols-3 gap-1.5">
                {#each entourageItemsForSubcard(openSubcard) as def (def.id)}
                  <EntourageItemCard {def} placing={placingEntId === def.id} onPlace={armEntourage} />
                {/each}
              </div>
            {:else}
              <div class="grid grid-cols-2 gap-2">
                {#each catalogItemsForSubcard(openSubcard) as item (item.id)}
                  <ObjectItemCard {item} placing={currentPlacing === item.id} favorite={favoriteIds.includes(item.id)} onPlace={place} onToggleFavorite={toggleFavorite} />
                {/each}
              </div>
            {/if}
          {:else if openRoom.kind === 'direct'}
            <div class="grid grid-cols-2 gap-2">
              {#each roomItems(openRoom) as item (item.id)}
                <ObjectItemCard {item} placing={currentPlacing === item.id} favorite={favoriteIds.includes(item.id)} onPlace={place} onToggleFavorite={toggleFavorite} />
              {/each}
            </div>
            {#if roomItems(openRoom).length === 0}<EmptyState label={$t('objectPanel.empty')} />{/if}
          {:else if visibleSubcards(openRoom).length}
            <div class="grid grid-cols-2 gap-2">
              {#each visibleSubcards(openRoom) as subcard (subcard.id)}
                <SubcardCard {subcard} count={subcardCount(subcard)} onOpen={(value) => openSubcard = value} />
              {/each}
            </div>
          {:else}
            <EmptyState label={$t('objectPanel.empty')} />
          {/if}
        {:else}
          {#if recentItems.length}
            <h3 class="mb-1.5 text-[10px] font-semibold uppercase text-gray-400">{$t('objectPanel.recent')}</h3>
            <div class="mb-3 grid grid-cols-2 gap-2">
              {#each recentItems as item (item.id)}
                <ObjectItemCard {item} placing={currentPlacing === item.id} favorite={favoriteIds.includes(item.id)} onPlace={place} onToggleFavorite={toggleFavorite} />
              {/each}
            </div>
          {/if}
          <div class="grid grid-cols-2 gap-2">
            <button type="button" class="flex flex-col items-start gap-1 rounded-xl border-2 border-pink-100 p-3 text-left hover:border-pink-300 hover:bg-pink-50" onclick={() => { showFavorites = true; openRoom = null; openSubcard = null; }}>
              <div class="flex h-14 w-full items-center justify-center rounded-lg bg-pink-50 text-3xl">♥</div>
              <span class="text-sm font-medium text-gray-700">{$t('objectRooms.favorite')}</span>
              <span class="text-[10px] text-gray-400">{$t(favoriteItems.length === 1 ? 'roomChoices.item' : 'roomChoices.items', { count: favoriteItems.length })}</span>
            </button>
            {#each objectRooms as room (room.id)}
              <RoomCard {room} count={roomCount(room)} onOpen={(value) => openRoom = value} />
            {/each}
          </div>
        {/if}
      {:else if tab === 'categories'}
        {#if openSubcard}
          <div class="mb-2 flex items-center gap-2">
            <button type="button" class="text-xs text-blue-600 hover:underline" onclick={() => openSubcard = null}>← {$t('objectPanel.back')}</button>
            <span class="text-xs font-semibold text-gray-600">{openSubcard.icon} {$t(openSubcard.labelKey)}</span>
          </div>
          {#if openSubcard.source === 'entourage'}
            <div class="grid grid-cols-3 gap-1.5">
              {#each entourageItemsForSubcard(openSubcard) as def (def.id)}
                <EntourageItemCard {def} placing={placingEntId === def.id} onPlace={armEntourage} />
              {/each}
            </div>
            {#if openSubcard.id === 'entourage'}
              {#if customEntDefs.length}
                <div class="mt-3">
                  <span class="text-[10px] font-medium text-gray-500">🖼️ {$t('entourageLabels.custom')}</span>
                  <div class="grid grid-cols-3 gap-1.5 mt-1">
                    {#each customEntDefs as def (def.id)}
                      <button type="button" class="p-1.5 rounded-lg border text-center hover:border-blue-300 hover:bg-blue-50 transition-colors {placingEntId === def.id ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-200' : 'border-gray-200'}" title={def.name} onclick={() => armEntourage(def.id)}>
                        <img src={def.dataUrl} alt={def.name} class="w-full h-8 object-contain" />
                        <span class="text-[9px] text-gray-500 leading-tight block truncate">{def.name}</span>
                      </button>
                    {/each}
                  </div>
                </div>
              {/if}
              <button type="button" class="mt-2 w-full py-1.5 border border-dashed border-gray-300 rounded-lg text-xs text-gray-500 hover:border-blue-300 hover:text-blue-600 transition-colors" onclick={() => entourageFileInput?.click()}>+ {$t('entourageLabels.upload')}</button>
              {#if symbolUploadError}<p role="alert" class="text-xs text-red-700">{$t(`entourageLabels.${symbolUploadError}`)}</p>{/if}
              <input type="file" accept="image/png,image/jpeg,image/webp" class="hidden" bind:this={entourageFileInput} onchange={onEntourageUpload} />
            {/if}
          {:else}
            <div class="grid grid-cols-2 gap-2">
              {#each catalogItemsForSubcard(openSubcard) as item (item.id)}
                <ObjectItemCard {item} placing={currentPlacing === item.id} favorite={favoriteIds.includes(item.id)} onPlace={place} onToggleFavorite={toggleFavorite} />
              {/each}
            </div>
          {/if}
        {:else}
          <CategoryAccordion onOpen={(value) => openSubcard = value} />
        {/if}
      {:else}
        <MyItemsPanel bind:this={myItems} />
      {/if}
    </div>
  {/if}
</div>
