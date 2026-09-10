<script lang="ts">
  import { exportNotice } from '$lib/stores/exportNotice';
</script>

{#if $exportNotice}
  <div role="alert" class="fixed top-16 left-1/2 -translate-x-1/2 z-[60] w-[min(28rem,calc(100vw-2rem))] rounded-xl border border-amber-300 bg-white p-4 shadow-xl">
    <div class="flex items-start justify-between gap-3">
      <div>
        <p class="font-semibold text-gray-900">{$exportNotice.title}</p>
        <p class="mt-1 text-sm text-gray-700">{$exportNotice.message}</p>
      </div>
      <button aria-label="Dismiss export notice" class="rounded px-2 py-1 text-gray-600 hover:bg-gray-100" onclick={() => exportNotice.set(null)}>✕</button>
    </div>
  </div>
{/if}
