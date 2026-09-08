<script lang="ts">
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
      if (!lifetime.signal.aborted && request === readRequest) error = reason instanceof Error ? reason.message : 'Could not read this backup.';
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
        ? 'Restoration finished, but the project list could not refresh. Close this dialog and retry loading the library.'
        : `${storageErrorMessage(reason)} Nothing from this restore was added. You can retry.`;
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
        <h2 id="library-restore-title" class="text-lg font-semibold">Restore library backup</h2>
        <p id="library-restore-description" class="mt-1 text-sm text-gray-500">Add restored copies to this browser. Your existing projects stay available.</p>
      </div>
      <button aria-label="Close restore" onclick={onclose} disabled={restoring} class="rounded px-2 py-1 text-gray-500 hover:bg-gray-100 disabled:opacity-40">✕</button>
    </div>

    <div class="space-y-4 overflow-y-auto px-5 py-4">
      {#if result}
        <div role="status" class="rounded-lg bg-green-50 p-4 text-sm text-green-900">
          <p class="font-semibold">{result.projects.length ? `${result.projects.length} project${result.projects.length === 1 ? '' : 's'} restored.` : 'Recovery data saved.'}</p>
          {#if result.recoveryArchives}<p class="mt-1">Recovery data is included when you download a library backup.</p>{/if}
          {#if result.projects.length}<p class="mt-1">Close this dialog to open a restored copy from the library.</p>{/if}
        </div>
      {:else}
        <input type="file" accept=".json,application/json" class="hidden" bind:this={input} onchange={selectFile} disabled={restoring} />
        <div class="flex flex-wrap items-center gap-3">
          <button onclick={() => input?.click()} disabled={restoring} class="rounded-lg border border-gray-300 px-3 py-2 text-sm font-semibold hover:bg-gray-50 disabled:opacity-40">Choose backup file</button>
          <p class="min-w-0 break-all text-sm text-gray-500">{filename || 'A current or older library JSON backup'}</p>
        </div>
        {#if reading}<p role="status" class="text-sm text-gray-500">Reading backup…</p>{/if}
        {#if preview}
          <p class="text-sm font-semibold">{preview.projectCount} project{preview.projectCount === 1 ? '' : 's'} ready to restore</p>
          {#if preview.warnings.length}
            <div class="space-y-1 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
              {#each preview.warnings as warning}<p>{warning}</p>{/each}
            </div>
          {/if}
          <ul class="space-y-2" aria-label="Backup projects">
            {#each preview.entries as entry}
              <li class="rounded-lg border border-gray-200 px-3 py-2">
                <p class="break-words text-sm font-semibold">{entry.name}</p>
                <p class="mt-0.5 text-xs text-gray-500">{entry.restorable ? `New copy · ${entry.versions} saved version${entry.versions === 1 ? '' : 's'}` : 'Recovery data only'}</p>
                {#each entry.warnings as warning}<p class="mt-1 break-words text-xs text-amber-800">{warning}</p>{/each}
              </li>
            {/each}
          </ul>
          {#if !preview.entries.length && !preview.recoveryArchives}<p class="text-sm text-gray-500">This backup is empty.</p>{/if}
        {/if}
      {/if}
      {#if error}<p role="alert" class="rounded-lg bg-red-50 p-3 text-sm text-red-900">{error}</p>{/if}
      {#if source !== null}<button onclick={downloadSource} class="text-sm font-semibold text-blue-600 underline">Download original backup</button>{/if}
    </div>

    <div class="flex flex-wrap justify-end gap-3 border-t border-gray-100 px-5 py-4">
      <button onclick={onclose} disabled={restoring} class="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold hover:bg-gray-50 disabled:opacity-40">{result ? 'Done' : 'Cancel'}</button>
      {#if !result}
        <button onclick={restore} disabled={reading || restoring || !preview || (!preview.projectCount && !preview.recoveryArchives)}
          class="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-40">
          {restoring ? 'Restoring…' : preview && !preview.projectCount && preview.recoveryArchives ? 'Keep recovery data' : 'Restore as copies'}
        </button>
      {/if}
    </div>
  </div>
</dialog>
