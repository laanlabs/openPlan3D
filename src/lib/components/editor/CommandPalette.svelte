<script lang="ts">
  import { t, locale } from '$lib/i18n';
  import { exportPNGWithFeedback, exportPDFWithFeedback as exportPDF } from '$lib/stores/exportNotice';
  import { tick } from 'svelte';
  import { modalDialog } from '$lib/utils/modalDialog';
  import { furnitureCatalog } from '$lib/utils/furnitureCatalog';
  import { selectedTool, snapEnabled, placingFurnitureId, undo, redo, currentProject, viewMode } from '$lib/stores/project';
  import { exportAsJSON, exportAsSVG } from '$lib/utils/export';
  import { exportDXF } from '$lib/utils/cadExport';
  import { get } from 'svelte/store';
  import { goto } from '$app/navigation';
  import { base } from '$app/paths';

  interface Props {
    open: boolean;
  }

  let { open = $bindable(false) }: Props = $props();

  let query = $state('');
  let selectedIndex = $state(0);
  let inputEl: HTMLInputElement | undefined = $state();

  type ResultItem = {
    id: string;
    name: string;
    icon: string;
    category: 'furniture' | 'tool' | 'action';
    categoryLabel: string;
    action: () => void;
  };

  const tools: ResultItem[] = $derived([
    { id: 't-select', name: $t('commandPalette.selectTool'), icon: '🔧', category: 'tool', categoryLabel: `🔧 ${$t('commandPalette.tool')}`, action: () => selectedTool.set('select') },
    { id: 't-wall', name: $t('commandPalette.wallTool'), icon: '🔧', category: 'tool', categoryLabel: `🔧 ${$t('commandPalette.tool')}`, action: () => selectedTool.set('wall') },
    { id: 't-door', name: $t('commandPalette.doorTool'), icon: '🔧', category: 'tool', categoryLabel: `🔧 ${$t('commandPalette.tool')}`, action: () => selectedTool.set('door') },
    { id: 't-window', name: $t('commandPalette.windowTool'), icon: '🔧', category: 'tool', categoryLabel: `🔧 ${$t('commandPalette.tool')}`, action: () => selectedTool.set('window') },
    { id: 't-furniture', name: $t('commandPalette.furnitureTool'), icon: '🔧', category: 'tool', categoryLabel: `🔧 ${$t('commandPalette.tool')}`, action: () => selectedTool.set('furniture') },
    { id: 't-text', name: $t('commandPalette.textTool'), icon: '🔧', category: 'tool', categoryLabel: `🔧 ${$t('commandPalette.tool')}`, action: () => selectedTool.set('text') },
  ]);

  const actions: ResultItem[] = $derived([
    { id: 'a-export-svg', name: $t('commandPalette.exportSvg'), icon: '⚡', category: 'action', categoryLabel: `⚡ ${$t('commandPalette.action')}`, action: () => { const p = get(currentProject); if (p) exportAsSVG(p, get(locale)); } },
    { id: 'a-export-dxf', name: $t('commandPalette.exportDxf'), icon: '⚡', category: 'action', categoryLabel: `⚡ ${$t('commandPalette.action')}`, action: () => { const p = get(currentProject); if (p) exportDXF(p, get(locale)); } },
    { id: 'a-export-pdf', name: $t('commandPalette.exportPdf'), icon: '⚡', category: 'action', categoryLabel: `⚡ ${$t('commandPalette.action')}`, action: () => { const p = get(currentProject); if (p) exportPDF(p); } },
    { id: 'a-export-png', name: $t('commandPalette.exportPng'), icon: '⚡', category: 'action', categoryLabel: `⚡ ${$t('commandPalette.action')}`, action: () => { const p = get(currentProject); if (p) void exportPNGWithFeedback(p); } },
    { id: 'a-export-json', name: $t('commandPalette.exportJson'), icon: '⚡', category: 'action', categoryLabel: `⚡ ${$t('commandPalette.action')}`, action: () => { const p = get(currentProject); if (p) exportAsJSON(p); } },
    { id: 'a-toggle-grid', name: $t('commandPalette.toggleGrid'), icon: '⚡', category: 'action', categoryLabel: `⚡ ${$t('commandPalette.action')}`, action: () => { window.dispatchEvent(new KeyboardEvent('keydown', { key: 'g', bubbles: true })); } },
    { id: 'a-toggle-snap', name: $t('commandPalette.toggleSnap'), icon: '⚡', category: 'action', categoryLabel: `⚡ ${$t('commandPalette.action')}`, action: () => { snapEnabled.update(v => !v); } },
    { id: 'a-zoom-fit', name: $t('commandPalette.zoomToFit'), icon: '⚡', category: 'action', categoryLabel: `⚡ ${$t('commandPalette.action')}`, action: () => { window.dispatchEvent(new KeyboardEvent('keydown', { key: 'f', bubbles: true })); } },
    { id: 'a-undo', name: $t('commandPalette.undo'), icon: '⚡', category: 'action', categoryLabel: `⚡ ${$t('commandPalette.action')}`, action: () => undo() },
    { id: 'a-redo', name: $t('commandPalette.redo'), icon: '⚡', category: 'action', categoryLabel: `⚡ ${$t('commandPalette.action')}`, action: () => redo() },
    { id: 'a-settings', name: $t('settings.title'), icon: '⚡', category: 'action', categoryLabel: `⚡ ${$t('commandPalette.action')}`, action: () => { window.dispatchEvent(new CustomEvent('open-settings')); } },
    { id: 'a-new-project', name: $t('library.new'), icon: '⚡', category: 'action', categoryLabel: `⚡ ${$t('commandPalette.action')}`, action: () => goto(base || '/') },
    { id: 'a-toggle-3d', name: $t('commandPalette.toggle2d3d'), icon: '⚡', category: 'action', categoryLabel: `⚡ ${$t('commandPalette.action')}`, action: () => { viewMode.update(m => m === '2d' ? '3d' : '2d'); } },
  ]);

  const furnitureItems: ResultItem[] = furnitureCatalog.map(f => ({
    id: `f-${f.id}`,
    name: f.name,
    icon: f.icon,
    category: 'furniture' as const,
    categoryLabel: `🪑 ${f.category}`,
    action: () => {
      selectedTool.set('furniture');
      placingFurnitureId.set(f.id);
    },
  }));

  const allItems = $derived([...actions, ...tools, ...furnitureItems]);

  function searchText(value: string) {
    return value.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
  }

  let results = $derived.by(() => {
    const q = searchText(query).trim();
    if (!q) return allItems.slice(0, 12);
    return allItems.filter(item => searchText(item.name).includes(q) || searchText(item.categoryLabel).includes(q)).slice(0, 20);
  });

  $effect(() => {
    if (open) {
      query = '';
      selectedIndex = 0;
    }
  });

  // Reset index when results change
  $effect(() => {
    results; // track
    selectedIndex = 0;
  });

  async function execute(item: ResultItem) {
    open = false;
    // Close the modal before commands dispatch editor shortcuts or open Settings.
    await tick();
    item.action();
  }

  function onKeydown(e: KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      selectedIndex = Math.min(selectedIndex + 1, results.length - 1);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      selectedIndex = Math.max(selectedIndex - 1, 0);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (results[selectedIndex]) execute(results[selectedIndex]);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      open = false;
    }
  }
</script>

{#if open}
  <dialog use:modalDialog
    class="modal-overlay fixed inset-0 bg-black/40 z-[100] flex justify-center"
    onclick={(e) => { if (e.target === e.currentTarget) open = false; }}
    oncancel={(e) => { e.preventDefault(); open = false; }}
    aria-label={$t('commandPalette.title')}
  >
    <div
      class="mt-[15vh] mx-4 w-full max-w-lg h-fit bg-white rounded-xl shadow-2xl overflow-hidden"
    >
      <!-- Search input -->
      <div class="flex items-center gap-2 px-4 py-3 border-b border-gray-200">
        <span class="text-gray-400 text-lg">🔍</span>
        <input
          bind:this={inputEl}
          bind:value={query}
          onkeydown={onKeydown}
          class="flex-1 bg-transparent outline-none text-sm text-gray-800 placeholder-gray-400"
          placeholder={$t('commandPalette.searchPlaceholder')}
          type="text"
          spellcheck="false"
          role="combobox"
          aria-label={$t('commandPalette.searchLabel')}
          aria-expanded="true"
          aria-controls="command-results"
          aria-autocomplete="list"
          aria-activedescendant={results[selectedIndex] ? `command-result-${results[selectedIndex].id}` : undefined}
        />
        <kbd class="text-[10px] px-1.5 py-0.5 bg-gray-100 rounded border border-gray-200 text-gray-400">ESC</kbd>
      </div>

      <!-- Results -->
      <div id="command-results" role="listbox" aria-label={$t('commandPalette.resultsLabel')} tabindex="-1" class="max-h-[50vh] overflow-y-auto">
        {#if results.length === 0}
          <div class="px-4 py-6 text-center text-sm text-gray-400">{$t('commandPalette.noResults')}</div>
        {:else}
          {#each results as item, i}
            <button
              id={`command-result-${item.id}`}
              tabindex="-1"
              class="flex w-full text-left items-center gap-3 px-4 py-2 cursor-pointer text-sm transition-colors"
              class:bg-blue-50={i === selectedIndex}
              class:text-blue-700={i === selectedIndex}
              class:text-gray-700={i !== selectedIndex}
              onmouseenter={() => selectedIndex = i}
              onclick={() => execute(item)}
              role="option"
              aria-selected={i === selectedIndex}
            >
              <span class="text-base w-6 text-center flex-shrink-0">{item.icon}</span>
              <span class="flex-1 truncate">{item.name}</span>
              <span class="text-xs text-gray-400 flex-shrink-0">{item.categoryLabel}</span>
            </button>
          {/each}
        {/if}
      </div>

      <!-- Footer hint -->
      <div class="px-4 py-2 border-t border-gray-100 flex items-center gap-3 text-[10px] text-gray-400">
        <span><kbd class="px-1 py-0.5 bg-gray-100 rounded border border-gray-200">↑↓</kbd> {$t('commandPalette.navigate')}</span>
        <span><kbd class="px-1 py-0.5 bg-gray-100 rounded border border-gray-200">↵</kbd> {$t('commandPalette.select')}</span>
        <span><kbd class="px-1 py-0.5 bg-gray-100 rounded border border-gray-200">esc</kbd> {$t('commandPalette.close')}</span>
      </div>
    </div>
  </dialog>
{/if}
