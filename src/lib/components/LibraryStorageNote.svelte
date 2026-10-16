<script lang="ts">
  import { onMount } from 'svelte';
  import { t } from '$lib/i18n';
  import { checkStoragePersistence, dismissStorageNote, showStorageNote, storageNoteDismissed, storagePersistence } from '$lib/services/storagePersistence';

  /** True while the library lists saved projects without a storage error. */
  let { active }: { active: boolean } = $props();
  // Hidden until the browser has been checked, so the note never flashes or renders on the server.
  let dismissed = $state(true);

  onMount(() => {
    dismissed = storageNoteDismissed();
    void checkStoragePersistence();
  });

  function dismiss() {
    dismissStorageNote();
    dismissed = true;
  }
</script>

{#if showStorageNote($storagePersistence, dismissed, active)}
  <div role="note" class="mb-6 flex items-start justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
    <p class="min-w-0">{$t('library.storageNote', { backup: $t('library.backup') })}</p>
    <button type="button" aria-label={$t('library.storageNoteDismiss')} onclick={dismiss}
      class="shrink-0 rounded px-2 text-amber-900 hover:bg-amber-100">✕</button>
  </div>
{/if}
