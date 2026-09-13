<script lang="ts">
  import { t, locale } from '$lib/i18n';
  import { projectServiceMessage } from '$lib/i18n/projectServiceMessages';
  import { onDestroy } from 'svelte';
  import { modalDialog } from '$lib/utils/modalDialog';
  import { prepareLibraryRestore, type LibraryRestorePreview, type RestoreResult } from '$lib/services/libraryRestore';
  import { storageErrorMessage } from '$lib/services/datastore';

  let { onclose, onrestored }: { onclose: () => void; onrestored: () => Promise<void> } = $props();
  let input = $state<HTMLInputElement>();
  let preview = $state.raw<LibraryRestorePreview | null>(null);
  let result = $state.raw<RestoreResult | null>(null);
  let source = $state.raw<string | null>(null);
  let filename = $state('');
  let reading = $state(false);
  let restoring = $state(false);
  let error = $state<string | null>(null);
  let readRequest = 0;
  const lifetime = new AbortController();
  onDestroy(() => { readRequest++; lifetime.abort(); });

  async function selectFile(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    const request = ++readRequest;
    reading = true; preview = null; result = null; source = null; error = null; filename = file.name;
    if (input) input.value = '';
    try {
      const raw = await file.text();
      if (lifetime.signal.aborted || request !== readRequest) return;
      source = raw;
      preview = prepareLibraryRestore(raw, file.name);
    } catch (reason) {
      if (!lifetime.signal.aborted && request === readRequest) error = reason instanceof Error ? reason.message : $t('restore.failedRead');
    } finally { if (request === readRequest) reading = false; }
  }

  async function restore() {
    if (!preview || restoring || result) return;
    restoring = true; error = null;
    try {
      const restored = await preview.restore(lifetime.signal);
      if (lifetime.signal.aborted) return;
      result = restored; // A later list refresh failure must not offer a duplicate restore.
      try { localStorage.setItem('hasSeenWelcome', 'true'); } catch {}
      await onrestored();
    } catch (reason) {
      if (!lifetime.signal.aborted) error = result
        ? $t('restore.refreshFailed')
        : `${storageErrorMessage(reason)} ${$t('restore.retry')}`;
    } finally { restoring = false; }
  }

  function downloadSource() {
    if (source === null) return;
    const url = URL.createObjectURL(new Blob([source], { type: 'application/json' }));
    const link = document.createElement('a');
    link.href = url; link.download = 'openplan3d-restore-source.json'; link.click(); URL.revokeObjectURL(url);
  }
</script>

<dialog use:modalDialog aria-labelledby="library-restore-title" aria-describedby="library-restore-description"
  oncancel={(event) => { if (restoring) event.preventDefault(); else onclose(); }}
  class="m-auto w-[36rem] max-w-[calc(100vw-2rem)] max-h-[85vh] rounded-2xl bg-white p-0 shadow-2xl backdrop:bg-black/50">
  <div class="flex max-h-[85vh] flex-col text-gray-800">
    <div class="flex items-start justify-between gap-4 border-b border-gray-100 px-5 py-4">
      <div>
        <h2 id="library-restore-title" class="text-lg font-semibold">{$t('restore.title')}</h2>
        <p id="library-restore-description" class="mt-1 text-sm text-gray-500">{$t('restore.help')}</p>
      </div>
      <button aria-label={$t('restore.close')} onclick={onclose} disabled={restoring} class="rounded px-2 py-1 text-gray-500 hover:bg-gray-100 disabled:opacity-40">✕</button>
    </div>

    <div class="space-y-4 overflow-y-auto px-5 py-4">
      {#if result}
        <div role="status" class="rounded-lg bg-green-50 p-4 text-sm text-green-900">
          <p class="font-semibold">{result.projects.length ? $t(result.projects.length === 1 ? 'restore.savedOne' : 'restore.savedMany', { count: result.projects.length }) : $t('restore.saved')}</p>
          {#if result.recoveryArchives}<p class="mt-1">{$t('restore.archiveHelp')}</p>{/if}
          {#if result.projects.length}<p class="mt-1">{$t('restore.openHelp')}</p>{/if}
        </div>
      {:else}
        <input type="file" accept=".json,application/json" class="hidden" bind:this={input} onchange={selectFile} disabled={restoring} />
        <div class="flex flex-wrap items-center gap-3">
          <button onclick={() => input?.click()} disabled={restoring} class="rounded-lg border border-gray-300 px-3 py-2 text-sm font-semibold hover:bg-gray-50 disabled:opacity-40">{$t('restore.choose')}</button>
          <p class="min-w-0 break-all text-sm text-gray-500">{filename || $t('restore.fileHint')}</p>
        </div>
        {#if reading}<p role="status" class="text-sm text-gray-500">{$t('restore.reading')}</p>{/if}
        {#if preview}
          <p class="text-sm font-semibold">{$t(preview.projectCount === 1 ? 'restore.readyOne' : 'restore.readyMany', { count: preview.projectCount })}</p>
          {#if preview.warnings.length}
            <div class="space-y-1 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
              {#each preview.warnings as warning}<p>{projectServiceMessage(warning, $locale)}</p>{/each}
            </div>
          {/if}
          <ul class="space-y-2" aria-label={$t('restore.projects')}>
            {#each preview.entries as entry}
              <li class="rounded-lg border border-gray-200 px-3 py-2">
                <p class="break-words text-sm font-semibold">{entry.name}</p>
                <p class="mt-0.5 text-xs text-gray-500">{entry.restorable ? $t(entry.versions === 1 ? 'restore.versionOne' : 'restore.versionMany', { count: entry.versions }) : $t('restore.recoveryOnly')}</p>
                {#each entry.warnings as warning}<p class="mt-1 break-words text-xs text-amber-800">{projectServiceMessage(warning, $locale)}</p>{/each}
              </li>
            {/each}
          </ul>
          {#if !preview.entries.length && !preview.recoveryArchives}<p class="text-sm text-gray-500">{$t('restore.empty')}</p>{/if}
        {/if}
      {/if}
      {#if error}<p role="alert" class="rounded-lg bg-red-50 p-3 text-sm text-red-900">{projectServiceMessage(error, $locale)}</p>{/if}
      {#if source !== null}<button onclick={downloadSource} class="text-sm font-semibold text-blue-600 underline">{$t('restore.original')}</button>{/if}
    </div>

    <div class="flex flex-wrap justify-end gap-3 border-t border-gray-100 px-5 py-4">
      <button onclick={onclose} disabled={restoring} class="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold hover:bg-gray-50 disabled:opacity-40">{result ? $t('transfer.done') : $t('transfer.cancel')}</button>
      {#if !result}
        <button onclick={restore} disabled={reading || restoring || !preview || (!preview.projectCount && !preview.recoveryArchives)}
          class="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-40">
          {restoring ? $t('restore.busy') : preview && !preview.projectCount && preview.recoveryArchives ? $t('restore.keep') : $t('restore.confirm')}
        </button>
      {/if}
    </div>
  </div>
</dialog>
