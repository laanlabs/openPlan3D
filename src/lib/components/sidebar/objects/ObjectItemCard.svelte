<script lang="ts">
  import { t, locale } from '$lib/i18n';
  import { furnitureName } from '$lib/i18n/furnitureNames';
  import type { FurnitureDef } from '$lib/utils/furnitureCatalog';
  import FurnitureThumbnail from '../FurnitureThumbnail.svelte';

  let { item, placing, favorite, onPlace, onToggleFavorite }: {
    item: FurnitureDef;
    placing: boolean;
    favorite: boolean;
    onPlace: (item: FurnitureDef) => void;
    onToggleFavorite: (id: string) => void;
  } = $props();
</script>

<div class="relative">
  <button
    type="button"
    class="w-full h-full flex flex-col items-center gap-1 p-3 rounded-lg border-2 transition-colors cursor-grab active:cursor-grabbing {placing ? 'border-blue-400 bg-blue-50 ring-1 ring-blue-300' : 'border-gray-100 hover:border-blue-300 hover:bg-blue-50'}"
    onclick={() => onPlace(item)}
    draggable="true"
    ondragstart={(event) => { event.dataTransfer?.setData('application/o3d-type', 'furniture'); event.dataTransfer?.setData('application/o3d-id', item.id); }}
  >
    <div class="w-12 h-12"><FurnitureThumbnail catalogId={item.id} name={furnitureName(item.id, $locale)} color={item.color} /></div>
    <span class="text-xs font-medium text-gray-600">{furnitureName(item.id, $locale)}</span>
    <span class="text-[10px] text-gray-400">{item.width}×{item.depth}cm</span>
  </button>
  <button
    type="button"
    class="absolute top-1 right-1 text-[12px] leading-none cursor-pointer {favorite ? 'text-pink-500' : 'text-gray-300 hover:text-pink-400'}"
    onclick={() => onToggleFavorite(item.id)}
    aria-label={$t(favorite ? 'objectControls.remove' : 'objectControls.add', { name: furnitureName(item.id, $locale) })}
    aria-pressed={favorite}
    title={$t(favorite ? 'objectControls.removeHint' : 'objectControls.addHint')}
  >{favorite ? '♥' : '♡'}</button>
</div>
