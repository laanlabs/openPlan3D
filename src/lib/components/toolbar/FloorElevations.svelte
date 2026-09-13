<script lang="ts">
  import { t } from '$lib/i18n';
  import { currentProject, updateFloorElevation, updateFloorSlabThickness } from '$lib/stores/project';
  import { floorElevations, DEFAULT_FLOOR_SPACING } from '$lib/utils/floors';

  const entries = $derived(floorElevations($currentProject?.floors ?? []));

  function editElevation(event: Event, floorId: string) {
    const input = event.currentTarget as HTMLInputElement;
    if (input.value.trim() !== '' && Number.isFinite(input.valueAsNumber)) {
      updateFloorElevation(floorId, input.valueAsNumber);
    } else if (event.type === 'blur') {
      input.value = String(entries.find(entry => entry.floor.id === floorId)?.elevation ?? 0);
    }
  }
  function editThickness(event: Event, floorId: string) {
    const input = event.currentTarget as HTMLInputElement;
    if (Number.isFinite(input.valueAsNumber) && input.valueAsNumber > 0) {
      updateFloorSlabThickness(floorId, input.valueAsNumber);
    } else if (event.type === 'blur') {
      input.value = String(entries.find(entry => entry.floor.id === floorId)?.floor.slabThickness ?? 5);
    }
  }
</script>

<section aria-label={$t('floors.title')} class="space-y-3 border-t border-gray-200 dark:border-gray-700 pt-4">
  <h3 class="text-sm font-semibold text-gray-800 dark:text-gray-100">{$t('floors.title')}</h3>
  <p id="floor-elevation-help" class="text-xs text-gray-500 dark:text-gray-400">
    {$t('floors.help')}
  </p>
  {#each entries as { floor, level, elevation } (floor.id)}
    <div class="space-y-1">
      <label class="block text-sm text-gray-700 dark:text-gray-300">
        {$t('floors.elevation', { name: floor.name })}
        <input type="number" step="any" value={elevation} aria-describedby="floor-elevation-help"
          oninput={(event) => editElevation(event, floor.id)} onblur={(event) => editElevation(event, floor.id)}
          class="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm bg-white dark:bg-gray-700 dark:text-gray-100" />
      </label>
      <button type="button" disabled={floor.elevation === undefined}
        aria-label={$t('floors.resetElevation', { name: floor.name })}
        onclick={() => updateFloorElevation(floor.id)}
        class="text-xs text-blue-700 dark:text-blue-300 underline disabled:text-gray-400 disabled:no-underline">
        {$t('floors.default', { value: level * DEFAULT_FLOOR_SPACING })}
      </button>
      <label class="block text-sm text-gray-700 dark:text-gray-300">
        {$t('floors.thickness', { name: floor.name })}
        <input type="number" min="0.01" step="any" value={floor.slabThickness ?? 5}
          oninput={(event) => editThickness(event, floor.id)} onblur={(event) => editThickness(event, floor.id)}
          class="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm bg-white dark:bg-gray-700 dark:text-gray-100" />
      </label>
      <p class="text-xs text-gray-500 dark:text-gray-400">{$t('floors.slabHelp')}</p>
      <button type="button" disabled={floor.slabThickness === undefined}
        aria-label={$t('floors.resetThickness', { name: floor.name })}
        onclick={() => updateFloorSlabThickness(floor.id)}
        class="text-xs text-blue-700 dark:text-blue-300 underline disabled:text-gray-400 disabled:no-underline">
        {$t('floors.default', { value: 5 })}
      </button>
    </div>
  {/each}
</section>
