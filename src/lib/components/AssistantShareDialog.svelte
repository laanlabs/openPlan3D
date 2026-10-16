<script lang="ts">
  import { t } from '$lib/i18n';
  import { onDestroy } from 'svelte';
  import { modalDialog, reconcileNativeClose } from '$lib/utils/modalDialog';
  import type { Project } from '$lib/models/types';
  import { ASSISTANT_CONNECTOR_URL, deleteAssistantShare, shareWithAssistant, type AssistantShare } from '$lib/services/assistantShare';
  let { project, onclose }: { project: Project; onclose: () => void } = $props();
  let includePhotos = $state(true), busy = $state(false), removed = $state(false);
  let share = $state<AssistantShare | null>(null), error = $state<string | null>(null), copied = $state<'code' | 'secret' | null>(null);
  const lifetime = new AbortController();
  onDestroy(() => lifetime.abort());
  async function upload() {
    if (busy) return;
    busy = true; error = null;
    try {
      // The prop can be a reactive proxy, which structuredClone() rejects; a snapshot is a plain copy.
      const result = await shareWithAssistant($state.snapshot(project), includePhotos);
      if (!lifetime.signal.aborted) share = result;
    } catch (reason) { if (!lifetime.signal.aborted) error = reason instanceof Error ? reason.message : $t('assistant.failed'); }
    finally { busy = false; }
  }
  async function remove() {
    if (!share || busy) return;
    busy = true; error = null;
    try { await deleteAssistantShare(share); if (!lifetime.signal.aborted) removed = true; }
    catch (reason) { if (!lifetime.signal.aborted) error = reason instanceof Error ? reason.message : $t('assistant.failed'); }
    finally { busy = false; }
  }
  async function copy(kind: 'code' | 'secret') {
    if (!share) return;
    try { await navigator.clipboard.writeText(kind === 'code' ? share.code : share.secret); copied = kind; } catch { copied = null; }
  }
  const expiry = $derived(share ? new Date(share.expiresAt).toLocaleString() : '');
</script>
<!-- The server may already hold a share whose secret is shown only here, so a close the
     browser forces during an upload shows the dialog again instead of losing the share. -->
<dialog use:modalDialog aria-labelledby="assistant-title" aria-describedby="assistant-description"
  oncancel={(event) => { if (busy) event.preventDefault(); else onclose(); }}
  onclose={(event) => reconcileNativeClose(event, busy || share !== null, onclose)}
  class="m-auto w-[34rem] max-w-[calc(100vw-2rem)] max-h-[85vh] rounded-2xl bg-white p-0 shadow-2xl backdrop:bg-black/50">
  <div class="flex max-h-[85vh] flex-col text-gray-800">
    <div class="border-b border-gray-100 px-5 py-4">
      <h2 id="assistant-title" class="text-lg font-semibold">{$t('assistant.title')}</h2>
      <p id="assistant-description" class="mt-1 text-sm text-gray-500">{$t('assistant.help')}</p>
    </div>
    <div class="space-y-4 overflow-y-auto px-5 py-4">
      {#if removed}
        <p role="status" class="rounded-lg bg-green-50 p-4 text-sm text-green-900">{$t('assistant.removed')}</p>
      {:else if share}
        <div class="space-y-3 rounded-lg border border-gray-200 p-3">
          <div class="flex items-center justify-between gap-3">
            <div><p class="text-xs text-gray-500">{$t('assistant.code')}</p><p class="font-mono text-lg font-semibold tracking-widest">{share.code}</p></div>
            <button onclick={() => copy('code')} class="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-semibold hover:bg-gray-50">{copied === 'code' ? $t('assistant.copied') : $t('assistant.copy')}</button>
          </div>
          <div class="flex items-center justify-between gap-3">
            <div class="min-w-0"><p class="text-xs text-gray-500">{$t('assistant.secret')}</p><p class="break-all font-mono text-sm font-semibold">{share.secret}</p></div>
            <button onclick={() => copy('secret')} class="shrink-0 rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-semibold hover:bg-gray-50">{copied === 'secret' ? $t('assistant.copied') : $t('assistant.copy')}</button>
          </div>
        </div>
        <p class="text-sm text-gray-600">{$t('assistant.afterShare', { expiry })}</p>
        <p class="text-sm text-gray-600">{$t('assistant.connector', { url: ASSISTANT_CONNECTOR_URL })}</p>
        <button onclick={remove} disabled={busy} class="text-sm font-semibold text-red-700 underline disabled:opacity-40">{$t('assistant.remove')}</button>
      {:else}
        <label class="flex items-start gap-3 text-sm">
          <input type="checkbox" bind:checked={includePhotos} disabled={busy} class="mt-0.5" />
          <span><span class="font-semibold">{$t('assistant.photos')}</span><br /><span class="text-gray-500">{$t('assistant.photosHelp')}</span></span>
        </label>
        <p class="text-sm text-gray-500">{$t('assistant.privacy')}</p>
      {/if}
      {#if error}<p role="alert" class="rounded-lg bg-red-50 p-3 text-sm text-red-900">{error}</p>{/if}
    </div>
    <div class="flex flex-wrap justify-end gap-3 border-t border-gray-100 px-5 py-4">
      <button onclick={onclose} disabled={busy} class="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold disabled:opacity-40">{share ? $t('transfer.done') : $t('transfer.cancel')}</button>
      {#if !share}<button onclick={upload} disabled={busy} class="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40">{busy ? $t('assistant.busy') : $t('assistant.share')}</button>{/if}
    </div>
  </div>
</dialog>
