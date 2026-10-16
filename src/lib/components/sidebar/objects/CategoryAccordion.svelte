<script lang="ts">
  import { t } from '$lib/i18n';
  import { objectGroups, objectSubcards, subcardHasItems, type ObjectSubcard, type ObjectGroupId } from '$lib/utils/objectTaxonomy';
  import SubcardCard from './SubcardCard.svelte';

  let { onOpen }: { onOpen: (subcard: ObjectSubcard) => void } = $props();
  let collapsed = $state<Record<string, boolean>>({});

  function toggle(group: ObjectGroupId) { collapsed = { ...collapsed, [group]: !collapsed[group] }; }
  function subcardsOf(group: ObjectGroupId): ObjectSubcard[] {
    return objectSubcards.filter((subcard) => subcard.group === group && subcardHasItems(subcard));
  }
</script>

{#each objectGroups as group (group.id)}
  {@const subcards = subcardsOf(group.id)}
  <div class="mb-2">
    <button type="button" class="flex w-full items-center justify-between py-1.5" onclick={() => toggle(group.id)}>
      <span class="text-xs font-semibold uppercase text-gray-500">{$t(group.labelKey)}</span>
      <span class="text-gray-400 text-xs">{collapsed[group.id] ? '▸' : '▾'}</span>
    </button>
    {#if !collapsed[group.id]}
      <div class="grid grid-cols-1 gap-2">
        {#each subcards as subcard (subcard.id)}
          <SubcardCard {subcard} count={subcard.itemIds.length} onOpen={onOpen} />
        {/each}
      </div>
    {/if}
  </div>
{/each}
