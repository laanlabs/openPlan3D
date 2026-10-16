<script lang="ts">
  import { t } from '$lib/i18n';
  import { entourageLabels } from '$lib/i18n/entourageLabels';
  import type { EntourageDef } from '$lib/utils/entourageCatalog';

  let { def, placing, onPlace }: { def: EntourageDef; placing: boolean; onPlace: (id: string) => void } = $props();
  const name = $derived(entourageLabels[def.id] ? $t(entourageLabels[def.id]) : def.name);
</script>

<button
  type="button"
  class="p-1.5 rounded-lg border text-center transition-colors {placing ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-200' : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50'}"
  title={$t('entourageLabels.placeHint', { name, width: def.width })}
  onclick={() => onPlace(def.id)}
>
  <svg viewBox="0 0 100 {Math.round(100 * def.aspect)}" class="w-full h-8 text-gray-600" fill="none" stroke="currentColor" stroke-width="3" stroke-linejoin="round" stroke-linecap="round">
    {#each def.paths as d}<path {d} />{/each}
  </svg>
  <span class="text-[9px] text-gray-500 leading-tight block truncate">{name}</span>
</button>
