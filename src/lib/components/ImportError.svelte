<script lang="ts">
  import { t } from '$lib/i18n';
  let { message, onDismiss, title }: { message: string; onDismiss: () => void; title?: string } = $props();
</script>

<div role="alert" class="fixed top-16 left-1/2 -translate-x-1/2 z-[60] w-[min(28rem,calc(100vw-2rem))] rounded-xl border border-red-200 bg-white p-4 shadow-xl">
  <div class="flex items-start justify-between gap-3">
    <div>
      <p class="font-semibold text-red-800">{title ?? $t('importError.title')}</p>
      <p class="mt-1 text-sm text-gray-700">{message}</p>
      <p class="mt-2 text-xs text-gray-500">{$t('importError.help')}</p>
    </div>
    <button aria-label={$t('importError.dismiss')} class="rounded px-2 py-1 text-gray-600 hover:bg-gray-100" onclick={onDismiss}>✕</button>
  </div>
</div>
