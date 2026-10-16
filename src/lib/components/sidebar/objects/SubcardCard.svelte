<script lang="ts">
  import { t } from '$lib/i18n';
  import type { ObjectSubcard } from '$lib/utils/objectTaxonomy';

  let { subcard, count, onOpen }: { subcard: ObjectSubcard; count: number; onOpen: (subcard: ObjectSubcard) => void } = $props();
</script>

<button
  type="button"
  class="flex items-center gap-3 rounded-xl border-2 border-gray-100 p-3 text-left transition-colors hover:border-blue-300 hover:bg-blue-50"
  onclick={() => onOpen(subcard)}
>
  <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gray-50 text-xl">{subcard.icon}</div>
  <div class="min-w-0">
    <div class="truncate text-sm font-medium text-gray-700">{$t(subcard.labelKey)}</div>
    <div class="text-[10px] text-gray-400">{$t(count === 1 ? 'roomChoices.item' : 'roomChoices.items', { count })}</div>
  </div>
</button>
