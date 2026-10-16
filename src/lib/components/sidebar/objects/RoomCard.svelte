<script lang="ts">
  import { t } from '$lib/i18n';
  import type { ObjectRoom } from '$lib/utils/objectTaxonomy';

  let { room, count, onOpen }: { room: ObjectRoom; count: number; onOpen: (room: ObjectRoom) => void } = $props();
</script>

<button
  type="button"
  class="flex flex-col items-start gap-1 rounded-xl border-2 border-gray-100 p-3 text-left transition-colors hover:border-blue-300 hover:bg-blue-50"
  onclick={() => onOpen(room)}
>
  <div class="flex h-14 w-full items-center justify-center rounded-lg bg-gray-50 text-3xl">{room.icon}</div>
  <span class="text-sm font-medium text-gray-700">{$t(room.labelKey)}</span>
  <span class="text-[10px] text-gray-400">{$t(count === 1 ? 'roomChoices.item' : 'roomChoices.items', { count })}</span>
</button>
