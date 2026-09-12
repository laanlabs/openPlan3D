<script lang="ts">
  import { onDestroy } from 'svelte';
  import { get } from 'svelte/store';
  import { t } from '$lib/i18n';
  import { customModelMessages } from '$lib/i18n/customModelMessages';
  import { currentProject, commitItemDetails, canvasCamX, canvasCamY, selectedElementId, selectedElementIds, selectedTool } from '$lib/stores/project';
  import { getSnapshots } from '$lib/stores/versionHistory';
  import { modalDialog } from '$lib/utils/modalDialog';
  import type { PreparedCustomModel } from '$lib/services/customModelImport';
  import { placeCustomModel, removeCustomModel } from '$lib/services/customModels';
  import CustomModelPreview from './CustomModelPreview.svelte';

  let input: HTMLInputElement;
  let open = $state(false), busy = $state(false), saving = $state(false), error = $state(''), status = $state('');
  let prepared = $state.raw<PreparedCustomModel | null>(null);
  let name = $state(''), attribution = $state(''), license = $state(''), sourceUrl = $state('');
  let removal = $state<string | null>(null);
  let controller: AbortController | undefined;
  let generation = 0, projectId: string | undefined;
  function close() {
    generation++; controller?.abort(); controller = undefined;
    prepared?.dispose(); prepared = null; open = false; busy = false; saving = false; error = '';
  }
  onDestroy(currentProject.subscribe(project => {
    if (project?.id !== projectId) { close(); removal = null; status = ''; projectId = project?.id; }
  }));
  onDestroy(close);
  async function choose(event: Event) {
    const file = (event.currentTarget as HTMLInputElement).files?.[0]; input.value = '';
    if (!file || !$currentProject) return;
    close(); open = true; busy = true; status = '';
    name = ''; attribution = ''; license = ''; sourceUrl = '';
    const request = generation, lifetime = new AbortController(); controller = lifetime;
    try {
      const { prepareCustomModel } = await import('$lib/services/customModelImport');
      const result = await prepareCustomModel(file, lifetime.signal);
      if (request !== generation) { result.dispose(); return; }
      prepared = result; name = result.sourceFilename.replace(/\.glb$/i, '');
    } catch (e) {
      if (request === generation) error = e instanceof Error ? e.message : get(t)('customModel.failed');
    } finally { if (request === generation) busy = false; }
  }
  async function admit() {
    if (!prepared || saving) return;
    const project = get(currentProject), model = prepared, request = generation;
    if (!project) return;
    saving = true; error = '';
    try {
      const { attachCustomModel } = await import('$lib/services/customModelImport');
      const history = await getSnapshots(project.id);
      const estimate = await navigator.storage?.estimate?.().catch(() => undefined);
      if (request !== generation) return;
      if (get(currentProject) !== project) throw new Error(get(t)('customModel.changed'));
      const result = attachCustomModel(project, model, { name: name.trim(), attribution: attribution.trim() || undefined,
        license: license.trim() || undefined, sourceUrl: sourceUrl.trim() || undefined }, history, estimate);
      commitItemDetails(project, result.project, 'Imported custom model');
      close(); status = get(t)(result.reused ? 'customModel.reused' : 'customModel.saved');
    } catch (e) { if (request === generation) error = e instanceof Error ? e.message : get(t)('customModel.failed'); }
    finally { if (request === generation) saving = false; }
  }
  function place(id: string) {
    const project = get(currentProject); if (!project) return;
    error = ''; status = '';
    try {
      const next = placeCustomModel(project, id, { x: get(canvasCamX), y: get(canvasCamY) });
      const floor = next.floors.find(floor => floor.id === next.activeFloorId)!;
      const item = floor.furniture.at(-1)!;
      commitItemDetails(project, next, 'Placed custom model');
      selectedTool.set('select'); selectedElementId.set(item.id); selectedElementIds.set(new Set());
      status = get(t)('customModel.placed');
    } catch (e) { error = e instanceof Error ? e.message : get(t)('customModel.failed'); }
  }
  function remove() {
    const project = get(currentProject); if (!project || !removal) return;
    try {
      commitItemDetails(project, removeCustomModel(project, removal), 'Removed custom model');
      removal = null; status = get(t)('customModel.removed');
    } catch (e) { error = e instanceof Error ? e.message : get(t)('customModel.failed'); removal = null; }
  }
</script>
<section class="space-y-2 rounded-lg border border-gray-200 p-2" aria-label={$t('customModel.heading')}>
  <h3 class="text-sm font-semibold">{$t('customModel.heading')}</h3>
  <input bind:this={input} type="file" accept=".glb,model/gltf-binary" class="hidden" onchange={choose} />
  <button class="rounded border border-blue-600 px-3 py-1.5 text-sm text-blue-700" onclick={() => input.click()} disabled={!$currentProject}>{$t('customModel.import')}</button>
  <p class="text-xs text-gray-500">{$t('customModel.help')}</p>
  {#each $currentProject?.customModels ?? [] as model (model.id)}
    <div class="rounded border border-gray-200 p-2 text-xs">
      <strong class="break-words">{model.name}</strong>
      <p>{model.width.toFixed(1)} × {model.depth.toFixed(1)} × {model.height.toFixed(1)} cm</p>
      {#if model.attribution}<p class="break-words">{model.attribution}</p>{/if}
      {#if model.license}<p class="break-words">{model.license}</p>{/if}
      {#if model.sourceUrl}<a class="text-blue-700 underline" href={model.sourceUrl} target="_blank" rel="noopener noreferrer">{$t('customModel.source')}</a>{/if}
      <div class="mt-1 flex flex-wrap gap-2">
        <button class="text-blue-700 underline" onclick={() => place(model.id)}>{$t('customModel.place')}</button>
        <button class="text-red-700 underline" onclick={() => { error = ''; removal = model.id; }}>{$t('customModel.remove')}</button>
      </div>
    </div>
  {/each}
  {#if !open && error}<p role="alert" class="text-xs text-red-700">{customModelMessages[error] ? $t(customModelMessages[error]) : error}</p>{/if}
  {#if status}<p role="status" class="text-xs text-gray-600">{status}</p>{/if}
</section>
{#if open}
  <dialog use:modalDialog oncancel={event => { event.preventDefault(); close(); }} class="m-auto max-h-[90vh] w-[min(32rem,94vw)] overflow-y-auto rounded-xl p-5 shadow-xl backdrop:bg-black/40" aria-labelledby="custom-model-title">
    <h2 id="custom-model-title" class="text-lg font-semibold">{$t('customModel.import')}</h2>
    {#if busy}<p role="status" class="my-4">{$t('customModel.loading')}</p>{/if}
    {#if prepared}
      <CustomModelPreview model={prepared} />
      <p class="my-2 text-xs text-gray-600">{$t('customModel.dimensions', { width: (prepared.dimensions.width * 100).toFixed(1), depth: (prepared.dimensions.depth * 100).toFixed(1), height: (prepared.dimensions.height * 100).toFixed(1) })}</p>
      <form onsubmit={event => { event.preventDefault(); void admit(); }} class="space-y-2">
        <label class="block text-sm">{$t('customModel.name')}<input required maxlength="256" bind:value={name} class="block w-full rounded border p-2" /></label>
        <label class="block text-sm">{$t('customModel.attribution')}<textarea maxlength="2048" bind:value={attribution} class="block w-full rounded border p-2"></textarea></label>
        <label class="block text-sm">{$t('customModel.license')}<input maxlength="256" bind:value={license} class="block w-full rounded border p-2" /></label>
        <label class="block text-sm">{$t('customModel.source')}<input type="url" maxlength="2048" bind:value={sourceUrl} class="block w-full rounded border p-2" /></label>
        <button disabled={saving} class="rounded bg-blue-700 px-3 py-2 text-sm text-white">{$t(saving ? 'customModel.saving' : 'customModel.add')}</button>
      </form>
    {/if}
    {#if error}<p role="alert" class="my-2 text-sm text-red-700">{customModelMessages[error] ? $t(customModelMessages[error]) : error}</p>{/if}
    <button type="button" onclick={close} class="mt-3 rounded border px-3 py-2 text-sm">{$t('customModel.cancel')}</button>
  </dialog>
{/if}
{#if removal}
  <dialog use:modalDialog oncancel={event => { event.preventDefault(); removal = null; }} aria-label={$t('customModel.remove')} class="m-auto max-w-sm rounded-xl p-5 shadow-xl backdrop:bg-black/40">
    <p class="mb-3">{$t('customModel.removeConfirm')}</p>
    <button onclick={remove} class="rounded bg-red-700 px-3 py-2 text-white">{$t('customModel.remove')}</button>
    <button onclick={() => removal = null} class="ml-2 rounded border px-3 py-2">{$t('customModel.cancel')}</button>
  </dialog>
{/if}
