<script lang="ts">
  import { onDestroy } from 'svelte';
  import { t, locale, type Locale } from '$lib/i18n';
  import { undoMessage } from '$lib/i18n/undoMessages';
  import { undoHistoryStore, jumpToUndoStep } from '$lib/stores/project';

  let { visible = $bindable(false) } : { visible?: boolean } = $props();

  let history = $state<{ entries: { description: string; timestamp: number }[]; currentIndex: number }>({ entries: [], currentIndex: -1 });

  onDestroy(undoHistoryStore.subscribe((h) => { history = h; }));

  function formatTime(ts: number, language: Locale) {
    const d = new Date(ts);
    return d.toLocaleTimeString(language === 'pt' ? 'pt-BR' : 'en', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  }

  function handleClick(index: number) {
    jumpToUndoStep(index);
  }
</script>

{#if visible}
  <div role="region" aria-label={$t('undoHistory.title')} class="undo-history fixed bottom-12 left-4 w-64 max-h-80 bg-white rounded-xl shadow-2xl border border-gray-200 z-50 flex flex-col overflow-hidden">
    <!-- Header -->
    <div class="flex items-center justify-between px-3 py-2 border-b border-gray-100 bg-gray-50">
      <div class="flex items-center gap-1.5">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="text-slate-500"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>
        <span class="text-xs font-semibold text-slate-700">{$t('undoHistory.title')}</span>
      </div>
      <div class="flex items-center gap-2">
        <span class="text-[10px] text-gray-600">
          {$t('undoHistory.step', { current: history.currentIndex, total: history.entries.length })}
        </span>
        <button
          class="focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 text-gray-600 text-sm leading-none"
          onclick={() => visible = false}
          aria-label={$t('undoHistory.close')}
        >✕</button>
      </div>
    </div>

    <!-- Steps list -->
    <div class="flex-1 overflow-y-auto">
      {#if history.entries.length === 0}
        <div class="px-3 py-6 text-center text-xs text-gray-600">{$t('undoHistory.noHistory')}</div>
      {:else}
        <div class="py-1">
          {#each history.entries as entry, i}
            <button
              class="focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-blue-600 w-full px-3 py-1.5 text-left flex items-center gap-2 text-xs hover:bg-blue-50 transition-colors"
              class:bg-blue-100={i === history.currentIndex}
              class:text-blue-700={i === history.currentIndex}
              class:text-gray-600={i > history.currentIndex}
              class:text-gray-700={i < history.currentIndex && i !== history.currentIndex}
              onclick={() => handleClick(i)}
            >
              <span class="w-5 text-[10px] text-gray-600 text-right shrink-0">{i + 1}</span>
              <span class="truncate flex-1">{undoMessage(entry.description, $locale)}</span>
              <time datetime={new Date(entry.timestamp).toISOString()} class="text-[10px] text-gray-600 shrink-0">{formatTime(entry.timestamp, $locale)}</time>
            </button>
          {/each}
          <!-- Current state indicator -->
          <div
            aria-current="step"
            class="w-full px-3 py-1.5 flex items-center gap-2 text-xs"
            class:bg-blue-100={history.currentIndex === history.entries.length}
            class:text-blue-700={history.currentIndex === history.entries.length}
            class:text-gray-700={history.currentIndex !== history.entries.length}
          >
            <span class="w-5 text-[10px] text-gray-600 text-right shrink-0">●</span>
            <span class="truncate flex-1 font-medium">{$t('undoHistory.currentState')}</span>
          </div>
        </div>
      {/if}
    </div>
  </div>
{/if}

<style>
  :global(html.dark) .undo-history :global(.text-blue-700) {
    color: #bfdbfe;
  }
  :global(html.dark) .undo-history button:focus-visible {
    outline-color: #93c5fd;
  }
</style>
