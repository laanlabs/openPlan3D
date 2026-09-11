<script lang="ts">
  import { t } from '$lib/i18n';
  import { onDestroy } from 'svelte';
  import { modalDialog } from '$lib/utils/modalDialog';
  import { prepareProjectPackage } from '$lib/services/projectPackage';
  import { storageErrorMessage } from '$lib/services/datastore';
  let { onclose, onimported }: { onclose: () => void; onimported: () => Promise<void> } = $props();
  let input = $state<HTMLInputElement>();
  let preview = $state.raw<Awaited<ReturnType<typeof prepareProjectPackage>> | null>(null);
  let error = $state<string | null>(null), reading = $state(false), importing = $state(false), complete = $state(false);
  const lifetime = new AbortController();
  let request = 0;
  onDestroy(() => { request++; lifetime.abort(); });
  async function choose(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    const current = ++request; reading = true; preview = null; error = null;
    if (input) input.value = '';
    try {
      const candidate = await prepareProjectPackage(file);
      if (current === request && !lifetime.signal.aborted) preview = candidate;
    } catch (reason) {
      if (current === request && !lifetime.signal.aborted) error = reason instanceof Error ? reason.message : $t('package.failedRead');
    } finally { if (current === request) reading = false; }
  }
  async function importCopy() {
    if (!preview || importing || complete) return;
    importing = true; error = null;
    try {
      await preview.restore(lifetime.signal);
      if (lifetime.signal.aborted) return;
      complete = true;
      try { localStorage.setItem('hasSeenWelcome', 'true'); } catch {}
      await onimported();
    } catch (reason) {
      if (!lifetime.signal.aborted) error = complete ? $t('package.refreshFailed') : `${storageErrorMessage(reason)} ${$t('package.retry')}`;
    } finally { importing = false; }
  }
  function original() {
    if (!preview) return;
    const url = URL.createObjectURL(new Blob([preview.bytes as Uint8Array<ArrayBuffer>], { type: 'application/zip' }));
    const link = document.createElement('a'); link.href = url; link.download = 'openplan3d-original.zip'; link.click(); URL.revokeObjectURL(url);
  }
</script>
<dialog use:modalDialog aria-labelledby="package-title" aria-describedby="package-description"
  oncancel={(event) => { if (importing) event.preventDefault(); else onclose(); }}
  class="m-auto w-[36rem] max-w-[calc(100vw-2rem)] max-h-[85vh] rounded-2xl bg-white p-0 shadow-2xl backdrop:bg-black/50">
  <div class="flex max-h-[85vh] flex-col text-gray-800">
    <div class="border-b border-gray-100 px-5 py-4">
      <h2 id="package-title" class="text-lg font-semibold">{$t('package.title')}</h2>
      <p id="package-description" class="mt-1 text-sm text-gray-500">{$t('package.help')}</p>
    </div>
    <div class="space-y-4 overflow-y-auto px-5 py-4">
      {#if complete}
        <p role="status" class="rounded-lg bg-green-50 p-4 text-sm text-green-900">{$t('package.complete')}</p>
      {:else}
        <input type="file" accept=".zip,application/zip" class="hidden" bind:this={input} onchange={choose} disabled={importing} />
        <button onclick={() => input?.click()} disabled={importing} class="rounded-lg border border-gray-300 px-3 py-2 text-sm font-semibold hover:bg-gray-50 disabled:opacity-40">{$t('package.choose')}</button>
        {#if reading}<p role="status" class="text-sm text-gray-500">{$t('package.reading')}</p>{/if}
        {#if preview}
          <div class="rounded-lg border border-gray-200 p-3">
            <h3 class="break-words font-semibold">{preview.project.name || $t('library.untitled')}</h3>
            <p class="mt-1 text-sm text-gray-500">{$t('package.summary', { floors: preview.project.floors.length, walls: preview.project.floors.reduce((n, floor) => n + floor.walls.length, 0), assets: preview.assets })}</p>
          </div>
          {#each preview.warnings as warning}<p class="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">{warning}</p>{/each}
          <p class="text-sm text-gray-500">{$t('package.copyHelp')}</p>
        {/if}
      {/if}
      {#if error}<p role="alert" class="rounded-lg bg-red-50 p-3 text-sm text-red-900">{error}</p>{/if}
      {#if preview}<button onclick={original} class="text-sm font-semibold text-blue-600 underline">{$t('package.original')}</button>{/if}
    </div>
    <div class="flex flex-wrap justify-end gap-3 border-t border-gray-100 px-5 py-4">
      <button onclick={onclose} disabled={importing} class="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold disabled:opacity-40">{complete ? $t('transfer.done') : $t('transfer.cancel')}</button>
      {#if !complete}<button onclick={importCopy} disabled={reading || importing || !preview} class="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40">{importing ? $t('package.busy') : $t('package.confirm')}</button>{/if}
    </div>
  </div>
</dialog>
