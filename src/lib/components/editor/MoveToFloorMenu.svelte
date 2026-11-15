<script lang="ts">
  import { t } from '$lib/i18n';
  import { currentProject, moveSelectionToFloor } from '$lib/stores/project';
  import { orderedFloors } from '$lib/utils/floors';

  /** The selection to move; shown only when the plan has another floor to move it to. */
  let { ids }: { ids: ReadonlySet<string> } = $props();

  let open = $state(false);
  let root: HTMLDivElement | undefined = $state();
  /** The other floors, top floor first, so the list reads like the building. */
  const others = $derived($currentProject
    ? orderedFloors($currentProject.floors).map(entry => entry.floor).filter(f => f.id !== $currentProject!.activeFloorId).reverse()
    : []);

  function move(floorId: string) {
    open = false;
    moveSelectionToFloor(ids, floorId);
  }

  function onWindowPointerDown(event: PointerEvent) {
    if (open && root && !root.contains(event.target as Node)) open = false;
  }

  function onKeydown(event: KeyboardEvent) {
    // Keep menu keys away from the canvas shortcuts.
    event.stopPropagation();
    if (event.key === 'Escape') { open = false; (root?.querySelector('button') as HTMLButtonElement | null)?.focus(); }
  }
</script>

<svelte:window onpointerdown={onWindowPointerDown} />

{#if others.length && ids.size}
  <div class="relative" bind:this={root} onkeydown={onKeydown} role="presentation">
    <button
      class="h-7 px-1.5 flex items-center gap-1 rounded hover:bg-blue-50 text-gray-500 hover:text-blue-600 transition-colors text-xs"
      title={$t('floorMove.label')}
      aria-label={$t('floorMove.label')}
      aria-haspopup="menu"
      aria-expanded={open}
      onclick={() => open = !open}
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m12 2 9 5-9 5-9-5 9-5Z"/><path d="m3 12 9 5 9-5"/><path d="m3 17 9 5 9-5"/></svg>
      <svg width="8" height="8" viewBox="0 0 10 6" fill="none" aria-hidden="true"><path d="M1 1l4 4 4-4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>
    </button>
    {#if open}
      <div role="menu" aria-label={$t('floorMove.label')} class="absolute right-0 top-full mt-1 z-50 min-w-[11rem] bg-white rounded-lg shadow-lg border border-gray-200 py-1">
        {#each others as floor (floor.id)}
          <button role="menuitem" class="w-full px-3 py-1.5 text-sm text-left text-gray-700 hover:bg-gray-100" onclick={() => move(floor.id)}>
            {$t('floorMove.to', { name: floor.name })}
          </button>
        {/each}
      </div>
    {/if}
  </div>
{/if}
