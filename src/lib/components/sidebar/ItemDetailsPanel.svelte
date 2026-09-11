<script lang="ts">
  import { t } from '$lib/i18n';
  import { itemDetailLabels } from '$lib/i18n/itemDetailLabels';
  import { onDestroy } from 'svelte';
  import { get } from 'svelte/store';
  import type { DetailTarget, ItemDetails } from '$lib/models/types';
  import { currentProject, detectedRoomsStore, updateItemDetails, commitItemDetails } from '$lib/stores/project';
  import { projectSettings } from '$lib/stores/settings';
  import { getSnapshots } from '$lib/stores/versionHistory';
  import { itemDetails, ROOM_TYPES, WALL_MATERIALS } from '$lib/utils/itemDetails';
  import { attachItemPhoto, checkPhotoStorage, deleteUnusedPhoto, downloadPhoto, photoPreview, prepareItemPhoto, usedPhotoNames } from '$lib/services/itemPhotos';

  let { target }: { target: DetailTarget } = $props();
  let details = $derived($currentProject ? itemDetails($currentProject, target) : {});
  let assets = $derived($currentProject?.projectPackage?.assets ?? {});
  let photos = $derived([...new Set(details.photos ?? [])]);
  let supportsPhotos = $derived(target.kind === 'furniture' || target.kind === 'rooms');
  let supportsCost = $derived(['furniture', 'doors', 'windows'].includes(target.kind));
  let busy = $state(false), error = $state(''), status = $state('');
  let retainedOpen = $state(false), deleting = $state<string | null>(null);
  let input = $state<HTMLInputElement>();
  let generation = 0;
  onDestroy(() => { generation++; });
  let retained = $derived(Object.keys(assets).map(path => path.slice(7)));
  let attachmentMiB = $derived((Object.values(assets).reduce((n, value) => n + value.length * 3 / 4, 0) / 1024 / 1024).toFixed(2));
  let imperial = $derived($projectSettings.units === 'imperial');
  const photoName = (name: string) => $currentProject?.attachmentNames?.[name] ?? (/^photo-[a-f0-9]{64}\./.test(name) ? 'Added photo' : name);
  function download(name: string) {
    try { downloadPhoto(photoName(name), assets[`assets/${name}`]); }
    catch { error = 'This attachment could not be downloaded. Export a JSON backup to retain the original saved data.'; }
  }
  function save(patch: ItemDetails) {
    error = ''; status = '';
    if (Object.entries(patch).every(([key, value]) => JSON.stringify(details[key as keyof ItemDetails]) === JSON.stringify(value))) return;
    try { updateItemDetails(target, patch); } catch (e) { error = e instanceof Error ? e.message : 'Could not update item details.'; }
  }
  function optionalNumber(event: Event, field: 'price' | 'ceilingHeight') {
    const input = event.currentTarget as HTMLInputElement;
    if (!input.value.trim() && !input.validity.badInput) {
      if (event.type === 'blur') save({ [field]: null });
      return;
    }
    const value = input.valueAsNumber * (field === 'ceilingHeight' && imperial ? 2.54 : 1);
    if (!input.validity.valid || !Number.isFinite(value) || (field === 'price' ? value < 0 : value <= 0 || value > 1_000_000)) {
      if (event.type !== 'blur') return;
      error = field === 'price' ? 'Enter a cost of zero or more, or clear the field.' : 'Enter a positive ceiling height, or clear the field to use the default.';
      input.value = details[field] == null ? '' : String(details[field]! / (field === 'ceilingHeight' && imperial ? 2.54 : 1));
      return;
    }
    save({ [field]: value });
  }
  async function addPhoto(event: Event) {
    const file = (event.currentTarget as HTMLInputElement).files?.[0];
    if (input) input.value = '';
    if (!file || busy) return;
    const project = get(currentProject), request = ++generation;
    if (!project) return;
    const room = get(detectedRoomsStore).find(r => r.id === target.id);
    busy = true; error = ''; status = '';
    try {
      const photo = await prepareItemPhoto(file);
      const history = await getSnapshots(project.id);
      const estimate = await navigator.storage?.estimate?.().catch(() => undefined);
      if (generation !== request) return;
      const next = attachItemPhoto(project, target, photo, room);
      checkPhotoStorage(project, next, history, estimate);
      commitItemDetails(project, next, 'Added item photo');
      status = 'Photo attached. Save the project to keep it in this browser.';
    } catch (e) {
      if (generation === request) error = e instanceof Error ? e.message : 'Could not add the photo. The project has not changed.';
    } finally { if (generation === request) busy = false; }
  }
  function attachRetained(name: string) {
    const project = get(currentProject);
    if (!project) return;
    error = ''; status = '';
    try {
      commitItemDetails(project, attachItemPhoto(project, target, { name, data: assets[`assets/${name}`] }, get(detectedRoomsStore).find(r => r.id === target.id)), 'Reused item photo');
      status = 'Existing attachment reused.';
    } catch (e) { error = e instanceof Error ? e.message : 'Could not attach the photo.'; }
  }
  function requestDelete(name: string) {
    const project = get(currentProject);
    if (!project) return;
    error = ''; status = '';
    try {
      if (usedPhotoNames(project).has(name)) { error = 'This file is still used by an item or tracing image. Remove those references first.'; return; }
      deleting = name;
    } catch (e) { error = e instanceof Error ? e.message : 'Could not check attachment references.'; }
  }
  function deleteFile() {
    const project = get(currentProject);
    if (!project || !deleting) return;
    try {
      commitItemDetails(project, deleteUnusedPhoto(project, deleting), 'Deleted retained attachment');
      deleting = null; status = 'File removed from this project’s future exports. Save to keep this change.';
    } catch (e) { error = e instanceof Error ? e.message : 'Could not delete the attachment.'; }
  }
</script>

<section aria-label={$t('itemDetails.heading')} class="mt-4 space-y-3 border-t border-gray-200 pt-3">
  <h3 class="text-sm font-semibold text-gray-700">{$t('itemDetails.heading')}</h3>
  {#if target.kind === 'walls' || supportsPhotos}
    <label class="block text-xs text-gray-600">{$t('itemDetails.notes')}
      <textarea value={details.note ?? ''} rows="3" maxlength="20000" oninput={e => save({ note: e.currentTarget.value || null })} class="mt-1 w-full rounded border border-gray-300 px-2 py-1.5 text-sm"></textarea>
    </label>
  {/if}
  {#if supportsCost}
    <label class="block text-xs text-gray-600">{$t('itemDetails.cost')}
      <input type="number" min="0" step="any" value={details.price ?? ''} oninput={e => optionalNumber(e, 'price')} onblur={e => optionalNumber(e, 'price')} class="mt-1 w-full rounded border border-gray-300 px-2 py-1.5 text-sm" />
    </label>
    <p class="text-xs text-gray-500">{$t('itemDetails.currencyHelp')}</p>
  {/if}
  {#if target.kind === 'walls'}
    <label class="block text-xs text-gray-600">{$t('itemDetails.material')}
      <select value={details.material ?? ''} onchange={e => save({ material: e.currentTarget.value || null })} class="mt-1 w-full rounded border border-gray-300 px-2 py-1.5 text-sm">
        <option value="">{$t('itemDetails.unspecified')}</option>
        {#if details.material && !WALL_MATERIALS.includes(details.material)}<option value={details.material}>{$t('itemDetails.retained', { value: details.material })}</option>{/if}
        {#each WALL_MATERIALS as value}<option {value}>{$t(itemDetailLabels[value])}</option>{/each}
      </select>
    </label>
    <p class="text-xs text-gray-500">{$t('itemDetails.materialHelp')}</p>
  {/if}
  {#if target.kind === 'rooms'}
    <label class="block text-xs text-gray-600">{$t('itemDetails.use')}
      <select value={details.roomType ?? ''} onchange={e => save({ roomType: e.currentTarget.value || null })} class="mt-1 w-full rounded border border-gray-300 px-2 py-1.5 text-sm">
        <option value="">{$t('itemDetails.unspecified')}</option>
        {#each ROOM_TYPES as value}<option {value}>{$t(itemDetailLabels[value])}</option>{/each}
      </select>
    </label>
    <label class="block text-xs text-gray-600">{$t('itemDetails.ceiling')} ({imperial ? 'in' : 'cm'})
      <input type="number" min="0" step="any" placeholder={$t('itemDetails.default')} value={details.ceilingHeight == null ? '' : details.ceilingHeight / (imperial ? 2.54 : 1)} oninput={e => optionalNumber(e, 'ceilingHeight')} onblur={e => optionalNumber(e, 'ceilingHeight')} class="mt-1 w-full rounded border border-gray-300 px-2 py-1.5 text-sm" />
    </label>
    <p class="text-xs text-gray-500">{$t('itemDetails.ceilingHelp')}</p>
  {/if}
  {#if supportsPhotos}
    <div class="space-y-2">
      <h4 class="text-xs font-medium text-gray-600">{$t('itemPhotos.heading', { count: photos.length })}</h4>
      {#each photos as name, index (name)}
        {@const data = assets[`assets/${name}`]}
        {@const preview = photoPreview(data)}
        <div class="rounded border border-gray-200 p-2 space-y-2">
          {#if preview}<img src={preview} alt={$t('itemPhotos.alt', { number: index + 1 })} loading="lazy" class="max-h-40 w-full rounded object-contain" />
          {:else}<p class="text-xs text-gray-500">{$t('itemPhotos.unavailable')}</p>{/if}
          <p class="break-words text-xs text-gray-500">{photoName(name)}</p>
          <div class="flex flex-wrap gap-2">
            <button onclick={() => download(name)} disabled={!data} class="text-xs text-blue-700 underline">{$t('itemPhotos.download', { number: index + 1 })}</button>
            <button onclick={() => save({ photos: photos.filter(p => p !== name) })} aria-label={$t('itemPhotos.removeLabel', { number: index + 1 })} class="text-xs text-red-700 underline">{$t('itemPhotos.remove')}</button>
          </div>
        </div>
      {/each}
      <input bind:this={input} type="file" accept="image/jpeg,image/png,.jpg,.jpeg,.png" aria-label={$t('itemPhotos.choose')} onchange={addPhoto} class="hidden" />
      <button disabled={busy} onclick={() => input?.click()} class="rounded border border-blue-300 px-3 py-2 text-sm text-blue-700 disabled:opacity-50">{busy ? $t('itemPhotos.preparing') : $t('itemPhotos.add')}</button>
      <p class="text-xs text-gray-500">{$t('itemPhotos.help')}</p>
      <p class="text-xs text-gray-500">{$t('itemPhotos.retentionHelp')}</p>
      {#if retained.length}
        <details ontoggle={e => retainedOpen = e.currentTarget.open} class="rounded border border-gray-200 p-2">
          <summary class="cursor-pointer text-xs font-medium text-gray-600">Retained attachments ({retained.length}) · {attachmentMiB} MiB</summary>
          {#if retainedOpen}
            <p class="mt-2 text-xs text-gray-500">Repeated photo bytes are shared across saved versions. New photos must fit the 64 MiB project and version-history budget.</p>
            {#each retained as name (name)}
              {@const preview = photoPreview(assets[`assets/${name}`])}
              <div class="mt-3 border-t border-gray-100 pt-2">
                {#if preview}<img src={preview} alt="Retained attachment preview" loading="lazy" class="mb-1 h-12 w-16 rounded object-contain" />{/if}
                <p class="break-words text-xs text-gray-600">{photoName(name)}</p>
                <div class="mt-1 flex flex-wrap gap-2">
                  <button disabled={photos.includes(name)} onclick={() => attachRetained(name)} aria-label={`Attach retained file ${name}`} class="text-xs text-blue-700 underline disabled:text-gray-400">Attach to item</button>
                  <button onclick={() => download(name)} aria-label={`Download retained file ${name}`} class="text-xs text-blue-700 underline">Download</button>
                  <button onclick={() => requestDelete(name)} aria-label={`Delete retained file ${name}`} class="text-xs text-red-700 underline">Delete file…</button>
                </div>
              </div>
            {/each}
          {/if}
        </details>
      {/if}
      {#if deleting}
        <div class="space-y-2 rounded border border-amber-300 bg-amber-50 p-2" role="group" aria-label="Delete retained attachment">
          <p class="break-words text-xs text-gray-700">Delete {photoName(deleting)} from this project’s future exports? Original features may refer to retained files. Older projects, saved versions and downloaded files keep their copies.</p>
          <div class="flex gap-2">
            <button onclick={() => deleting = null} class="rounded border px-2 py-1 text-xs">Keep file</button>
            <button onclick={deleteFile} class="rounded bg-red-700 px-2 py-1 text-xs text-white">Delete file from project</button>
          </div>
        </div>
      {/if}
    </div>
  {/if}
  {#if error}<p role="alert" class="break-words text-xs text-red-700">{error}</p>{/if}
  {#if status}<p role="status" class="text-xs text-green-700">{status}</p>{/if}
</section>
