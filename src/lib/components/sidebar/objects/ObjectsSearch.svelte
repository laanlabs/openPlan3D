<script lang="ts">
  import { t } from '$lib/i18n';

  let { value = $bindable(''), onClear }: { value?: string; onClear?: () => void } = $props();
</script>

<div class="relative">
  <input
    type="text"
    placeholder={$t('objectPanel.search')}
    aria-label={$t('objectPanel.search')}
    class="w-full px-3 py-2 pr-9 border border-gray-200 rounded-full text-sm focus:ring-2 focus:ring-blue-200 focus:border-blue-400 outline-none"
    bind:value
  />
  {#if value}
    <button
      type="button"
      class="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 w-6 h-6 flex items-center justify-center rounded-full hover:bg-gray-100"
      title={$t('objectPanel.clearSearch')}
      aria-label={$t('objectPanel.clearSearch')}
      onclick={() => { value = ''; onClear?.(); }}
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
    </button>
  {/if}
</div>
