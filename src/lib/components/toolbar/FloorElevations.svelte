<script lang="ts">
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

<section aria-label="Floor elevations" class="space-y-3 border-t border-gray-200 dark:border-gray-700 pt-4">
  <h3 class="text-sm font-semibold text-gray-800 dark:text-gray-100">Floor elevations</h3>
  <p id="floor-elevation-help" class="text-xs text-gray-500 dark:text-gray-400">
    Set each floor's height above ground for stacked 3D. Use negative values for basements.
    Wall heights and other floors stay unchanged. Defaults are 300 cm apart.
  </p>
  {#each entries as { floor, level, elevation } (floor.id)}
    <div class="space-y-1">
      <label class="block text-sm text-gray-700 dark:text-gray-300">
        {floor.name} elevation (cm)
        <input type="number" step="any" value={elevation} aria-describedby="floor-elevation-help"
          oninput={(event) => editElevation(event, floor.id)} onblur={(event) => editElevation(event, floor.id)}
          class="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm bg-white dark:bg-gray-700 dark:text-gray-100" />
      </label>
      <button type="button" disabled={floor.elevation === undefined}
        aria-label={`Use default elevation for ${floor.name}`}
        onclick={() => updateFloorElevation(floor.id)}
        class="text-xs text-blue-700 dark:text-blue-300 underline disabled:text-gray-400 disabled:no-underline">
        Use default ({level * DEFAULT_FLOOR_SPACING} cm)
      </button>
      <label class="block text-sm text-gray-700 dark:text-gray-300">
        {floor.name} slab thickness (cm)
        <input type="number" min="0.01" step="any" value={floor.slabThickness ?? 5}
          oninput={(event) => editThickness(event, floor.id)} onblur={(event) => editThickness(event, floor.id)}
          class="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm bg-white dark:bg-gray-700 dark:text-gray-100" />
      </label>
      <p class="text-xs text-gray-500 dark:text-gray-400">Extends below the floor surface in enclosed rooms.</p>
      <button type="button" disabled={floor.slabThickness === undefined}
        aria-label={`Use default slab thickness for ${floor.name}`}
        onclick={() => updateFloorSlabThickness(floor.id)}
        class="text-xs text-blue-700 dark:text-blue-300 underline disabled:text-gray-400 disabled:no-underline">
        Use default (5 cm)
      </button>
    </div>
  {/each}
</section>
