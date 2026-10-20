<script lang="ts">
  import { t } from '$lib/i18n';
  import type { ObjectSubcard } from '$lib/utils/objectTaxonomy';

  let { subcard, count, onOpen }: { subcard: ObjectSubcard; count: number; onOpen: (subcard: ObjectSubcard) => void } = $props();
</script>

<button
  type="button"
  class="flex flex-col items-center gap-1 rounded-lg border-2 border-gray-100 p-3 text-center transition-colors hover:border-blue-300 hover:bg-blue-50"
  onclick={() => onOpen(subcard)}
>
  <div class="flex h-12 w-12 items-center justify-center rounded-lg bg-gray-50 text-2xl">{subcard.icon}</div>
  <span class="text-xs font-medium leading-tight text-gray-600">{$t(subcard.labelKey)}</span>
  <span class="text-[10px] text-gray-400">{$t(count === 1 ? 'roomChoices.item' : 'roomChoices.items', { count })}</span>
</button>
