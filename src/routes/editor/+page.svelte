<script lang="ts">
  import { modalDialog, hasOpenModal } from '$lib/utils/modalDialog';
  import { onMount } from 'svelte';
  import { get } from 'svelte/store';
  import { base } from '$app/paths';
  import { replaceState } from '$app/navigation';
  import { page } from '$app/state';
  import { reportLoadingFailure } from '$lib/services/deployment';
  import { currentProject, viewMode, selectedElementId, selectedRoomId, createDefaultProject, loadProject, selectedTool, placingFurnitureId, elevationWallId, elevationPickMode } from '$lib/stores/project';
  import { localStore, storageErrorMessage, downloadLibraryBackup } from '$lib/services/datastore';
  import { autoSave, markClean, saveState } from '$lib/stores/saveStatus';
  import { createProjectFromRoomPlan, isRoomPlanJson } from '$lib/utils/roomplanImport';
  import TopBar from '$lib/components/toolbar/TopBar.svelte';
  import BuildPanel from '$lib/components/sidebar/BuildPanel.svelte';
  import PropertiesPanel from '$lib/components/sidebar/PropertiesPanel.svelte';
  import LayersPanel from '$lib/components/sidebar/LayersPanel.svelte';

  let showLayers = $state(false);
  import FloorPlanCanvas from '$lib/components/editor/FloorPlanCanvas.svelte';
  import AlignmentToolbar from '$lib/components/editor/AlignmentToolbar.svelte';
  import UndoHistoryPanel from '$lib/components/editor/UndoHistoryPanel.svelte';
  import CommandPalette from '$lib/components/editor/CommandPalette.svelte';
  import ElevationView from '$lib/components/editor/ElevationView.svelte';
  import PrintLayout from '$lib/components/editor/PrintLayout.svelte';
  import OnboardingTooltip from '$lib/components/OnboardingTooltip.svelte';
  import { triggerTip } from '$lib/stores/onboarding.svelte';

  let commandPaletteOpen = $state(false);
  let printOpen = $state(false);

  // Lazy-load ThreeViewer to avoid loading Three.js (~1.4MB) until 3D mode is activated
  let ThreeViewer: any = $state(null);
  $effect(() => {
    if (mode === '3d' && !ThreeViewer) {
      import('$lib/components/viewer3d/ThreeViewer.svelte').then(m => { ThreeViewer = m.default; }).catch(() => {
        viewMode.set('2d');
        reportLoadingFailure();
      });
    }
  });

  let mode = $state<'2d' | '3d'>('2d');
  let ready = $state(false);
  let showHelp = $state(false);
  let showUndoHistory = $state(false);

  // Mobile (< md): BuildPanel becomes an off-canvas drawer toggled by the Tools FAB.
  let buildPanelOpen = $state(false);
  // Close the drawer once the user has picked a tool / item so the canvas is usable
  selectedTool.subscribe(() => { if (buildPanelOpen) buildPanelOpen = false; });
  placingFurnitureId.subscribe((id) => { if (id && buildPanelOpen) buildPanelOpen = false; });

  // iOS capture handoff (?import=CODE → fetch RoomPlan JSON from Firebase Storage inbox)
  let importingCapture = $state(false);
  let importError = $state<string | null>(null);
  let loadError = $state<string | null>(null);

  async function backupLibrary() {
    try { await downloadLibraryBackup(); }
    catch (error) { loadError = storageErrorMessage(error); }
  }

  /** Fetch a RoomPlan capture uploaded by the iOS app and open it as a new project. Returns true on success. */
  async function importCaptureFromCode(code: string): Promise<boolean> {
    importingCapture = true;
    try {
      const url = `https://firebasestorage.googleapis.com/v0/b/openplan3d.firebasestorage.app/o/inbox%2F${code}.json?alt=media`;
      let res: Response;
      try {
        res = await fetch(url);
      } catch {
        throw new Error('Network error while downloading the capture. Check your connection and try again.');
      }
      if (res.status === 404) {
        throw new Error(`Capture code ${code} was not found. It may have expired — share it again from the iOS app.`);
      }
      if (!res.ok) {
        throw new Error(`Failed to download the capture (HTTP ${res.status}).`);
      }
      let data: any;
      try {
        data = await res.json();
      } catch {
        throw new Error('The downloaded capture is not valid JSON.');
      }
      if (!isRoomPlanJson(data)) {
        throw new Error('The downloaded file is not a valid RoomPlan export.');
      }
      const project = createProjectFromRoomPlan(data, `Room Capture ${code}`);
      loadProject(project);
      // A storage failure must not discard a successfully downloaded capture.
      await autoSave();
      // Remove ?import=CODE so a refresh doesn't re-import
      replaceState(`${base}/editor?id=${project.id}`, page.state);
      return true;
    } catch (e: any) {
      importError = e?.message ?? 'Failed to import capture.';
      return false;
    } finally {
      importingCapture = false;
    }
  }

  viewMode.subscribe((m) => {
    mode = m;
    if (m === '3d') {
      // Clear selection when entering 3D — start in view-only mode
      selectedElementId.set(null);
      selectedRoomId.set(null);
      elevationPickMode.set(false);
      // Onboarding tip for first 3D view
      triggerTip('first-3d', 200, 80);
    }
  });

  async function initializeEditor() {
    loadError = null;
    try {
      const url = new URL(window.location.href);

      // iOS capture handoff: ?import=CODE
      const rawCode = url.searchParams.get('import');
      if (rawCode) {
        const code = rawCode.toUpperCase();
        if (/^[A-Z2-9]{4,32}$/.test(code)) {
          if (await importCaptureFromCode(code)) {
            ready = true;
            return;
          }
          // Import failed — fall through to the normal load flow (error shown via toast)
        } else {
          importError = 'Invalid import code in URL.';
        }
      }

      const id = url.searchParams.get('id');
      if (id) {
        // A new/imported project may exist only in memory if its first save failed.
        const pending = get(currentProject);
        if (pending?.id === id && get(saveState) !== 'saved') { ready = true; return; }
        const project = await localStore.load(id);
        if (project) {
          loadProject(project);
          markClean();
        } else {
          const p = createDefaultProject();
          loadProject(p);
          await autoSave();
          replaceState(`${base}/editor?id=${p.id}`, page.state);
        }
      } else {
        const p = createDefaultProject();
        loadProject(p);
        await autoSave();
        replaceState(`${base}/editor?id=${p.id}`, page.state);
      }
      ready = true;
    } catch (error) {
      loadError = storageErrorMessage(error);
    }
  }

  onMount(() => {
    void initializeEditor();
    // Imports can replace the active project from either sidebar or toolbar.
    // Keep reloads pointed at that project once initial route loading is complete.
    const stopSyncProjectUrl = currentProject.subscribe((project) => {
      if (!ready || !project) return;
      const url = new URL(window.location.href);
      if (url.searchParams.get('id') === project.id) return;
      url.searchParams.delete('import');
      url.searchParams.set('id', project.id);
      replaceState(url, page.state);
    });
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (get(saveState) !== 'saved') {
        void autoSave();
        event.preventDefault();
        event.returnValue = '';
      }
    };
    const onVisibilityChange = () => {
      if (document.hidden && get(saveState) === 'unsaved') void autoSave();
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      stopSyncProjectUrl();
      window.removeEventListener('beforeunload', onBeforeUnload);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  });
  function onEditorKeydown(e: KeyboardEvent) {
    if (hasOpenModal()) return;
    const target = e.target as HTMLElement | null;
    const typing = !!target && (['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) || target.isContentEditable);
    const mod = e.ctrlKey || e.metaKey;
    if (e.key === 'p' && mod) { e.preventDefault(); printOpen = true; }
    if ((e.key === 'k' && mod) || (e.key === '/' && !mod && !e.altKey && !typing)) {
      e.preventDefault(); commandPaletteOpen = !commandPaletteOpen;
    }
    if (e.key === '?' && !mod && !e.altKey && !typing) { showHelp = !showHelp; e.preventDefault(); }
    if (e.key === 'Escape' && showHelp) showHelp = false;
    if (e.key === 'l' && !mod && !e.altKey && !typing) showLayers = !showLayers;
  }
</script>

<svelte:window on:keydown={onEditorKeydown} />

{#if ready}
  <div class="h-screen flex flex-col overflow-hidden">
    <TopBar />
    <!-- Keep canvas/viewer controls beneath toolbar menus and project dialogs. -->
    <div class="flex flex-1 overflow-hidden isolate">
      {#if mode === '2d'}
        <!-- Build panel: inline sidebar on md+, off-canvas drawer on phones -->
        {#if buildPanelOpen}
          <div
            class="md:hidden fixed inset-x-0 top-12 bottom-0 bg-black/40 z-40"
            onclick={() => buildPanelOpen = false}
            aria-hidden="true"
          ></div>
        {/if}
        <div class="h-full max-md:fixed max-md:left-0 max-md:top-12 max-md:bottom-0 max-md:h-auto max-md:z-50 max-md:shadow-2xl max-md:transition-transform max-md:duration-200 {buildPanelOpen ? '' : 'max-md:-translate-x-full'}">
          <BuildPanel />
        </div>
      {/if}
      <div class="flex-1 min-w-0 relative">
        {#if mode === '2d'}
          <FloorPlanCanvas />
          <AlignmentToolbar />
          {#if $elevationWallId}
            <!-- Integrated elevation view replaces the plan canvas area (sidebars stay) -->
            <ElevationView />
          {/if}
        {:else}
          {#if ThreeViewer}
            <ThreeViewer />
          {:else}
            <div class="flex items-center justify-center h-full text-slate-400">Loading 3D viewer…</div>
          {/if}
        {/if}
      </div>
      {#if showLayers && mode === '2d'}
        <LayersPanel />
      {/if}
      <PropertiesPanel is3D={mode === '3d'} />
    </div>
  </div>

  <!-- Tools drawer FAB (mobile only) -->
  {#if mode === '2d'}
    <button
      class="md:hidden fixed bottom-4 left-4 w-12 h-12 rounded-full bg-blue-600 text-white shadow-lg active:bg-blue-700 transition-colors z-40 flex items-center justify-center"
      onclick={() => buildPanelOpen = !buildPanelOpen}
      title="Tools"
      aria-label="Toggle tools panel"
    >
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>
    </button>
  {/if}

  <!-- Layers toggle button -->
  {#if mode === '2d'}
    <button
      class="max-md:hidden fixed bottom-4 left-14 w-8 h-8 rounded-full shadow-lg hover:bg-slate-600 transition-colors z-50 text-sm"
      class:bg-blue-600={showLayers}
      class:text-white={showLayers}
      class:bg-slate-700={!showLayers}
      class:text-gray-300={!showLayers}
      onclick={() => showLayers = !showLayers}
      title="Layers Panel (L)"
      aria-label="Toggle Layers Panel"
    >🗂</button>
  {/if}

  <!-- Undo History toggle button -->
  <button
    class="max-md:hidden fixed bottom-4 left-24 w-8 h-8 rounded-full shadow-lg hover:bg-slate-600 transition-colors z-50 text-sm"
    class:bg-blue-600={showUndoHistory}
    class:text-white={showUndoHistory}
    class:bg-slate-700={!showUndoHistory}
    class:text-gray-300={!showUndoHistory}
    onclick={() => showUndoHistory = !showUndoHistory}
    title="Undo History"
    aria-label="Toggle Undo History"
  >⟲</button>

  <UndoHistoryPanel bind:visible={showUndoHistory} />

  <!-- Help button (desktop only — keyboard shortcuts are meaningless on touch) -->
  <button
    class="max-md:hidden fixed bottom-4 left-4 w-8 h-8 rounded-full bg-slate-700 text-white text-sm font-bold shadow-lg hover:bg-slate-600 transition-colors z-50"
    onclick={() => showHelp = !showHelp}
    title="Keyboard Shortcuts (?)"
    aria-label="Keyboard Shortcuts"
  >?</button>

  <!-- Shortcuts overlay -->
  {#if showHelp}
    {@const shortcutsCopied = { value: false }}
    <dialog use:modalDialog class="modal-overlay fixed inset-0 bg-black/50 flex items-center justify-center z-50" onclick={(e) => { if (e.target === e.currentTarget) showHelp = false; }} oncancel={(e) => { e.preventDefault(); showHelp = false; }} onkeydown={(e) => { if (e.key === '?') { e.preventDefault(); showHelp = false; } }} aria-label="Keyboard Shortcuts">
      <div class="bg-white rounded-2xl shadow-2xl max-w-2xl w-full mx-4 max-h-[85vh] flex flex-col">
        <!-- Header -->
        <div class="flex items-center justify-between px-6 pt-5 pb-3 border-b border-gray-100">
          <div class="flex items-center gap-2">
            <svg class="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707"/></svg>
            <h2 class="text-lg font-bold text-slate-800">Keyboard Shortcuts</h2>
          </div>
          <div class="flex items-center gap-2">
            <button
              class="text-xs px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-800 transition-colors flex items-center gap-1.5"
              onclick={() => {
                const text = [
                  'KEYBOARD SHORTCUTS — Open3D Floorplan',
                  '',
                  '── TOOLS ──',
                  'V          Select tool',
                  'W          Wall tool',
                  'D          Door tool',
                  'H          Pan mode',
                  'M          Measure tool',
                  'N          Annotate tool',
                  'T          Text tool',
                  'S          Toggle snap',
                  '',
                  '── EDIT ──',
                  'Ctrl+Z     Undo',
                  'Ctrl+Y     Redo',
                  'Ctrl+C     Copy',
                  'Ctrl+V     Paste',
                  'Ctrl+A     Select all',
                  'Ctrl+D     Deselect all',
                  'Ctrl+S     Save project',
                  'Esc        Cancel / Deselect',
                  '',
                  '── ELEMENTS ──',
                  'R          Rotate element',
                  'Del/Back   Delete selected',
                  'Ctrl+L     Lock/Unlock',
                  'Ctrl+G     Group selection',
                  'Ctrl+⇧+G   Ungroup',
                  '',
                  '── VIEW ──',
                  'Tab        Toggle 2D/3D',
                  'F          Zoom to fit',
                  'G          Toggle grid',
                  'L          Toggle layers',
                  '?          Show shortcuts',
                  '',
                  '── CANVAS ──',
                  'Scroll     Zoom in/out',
                  '+/-        Zoom in/out',
                  'Space+Drag Pan canvas',
                  '',
                  '── WALLS ──',
                  'Dbl-click  Finish wall chain',
                  'C          Close wall loop',
                ].join('\n');
                navigator.clipboard.writeText(text);
              }}
              aria-label="Copy all shortcuts"
            >
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>
              Copy All
            </button>
            <button class="text-gray-400 hover:text-gray-600 text-xl leading-none" onclick={() => showHelp = false} aria-label="Close shortcuts">✕</button>
          </div>
        </div>

        <!-- Body -->
        <div class="overflow-y-auto px-6 py-4">
          <div class="grid grid-cols-2 gap-x-8 gap-y-0 text-sm">
            <!-- Left column -->
            <div>
              <!-- Tools -->
              <div class="flex items-center gap-2 mb-2">
                <span class="text-xs font-bold uppercase tracking-wider text-indigo-500">Tools</span>
                <div class="flex-1 h-px bg-indigo-100"></div>
              </div>
              <div class="space-y-1.5 mb-5">
                <div class="flex justify-between"><span class="text-gray-600">Select tool</span><kbd class="px-1.5 py-0.5 bg-gray-100 rounded text-xs font-mono text-slate-700 border border-gray-200">V</kbd></div>
                <div class="flex justify-between"><span class="text-gray-600">Wall tool</span><kbd class="px-1.5 py-0.5 bg-gray-100 rounded text-xs font-mono text-slate-700 border border-gray-200">W</kbd></div>
                <div class="flex justify-between"><span class="text-gray-600">Door tool</span><kbd class="px-1.5 py-0.5 bg-gray-100 rounded text-xs font-mono text-slate-700 border border-gray-200">D</kbd></div>
                <div class="flex justify-between"><span class="text-gray-600">Pan mode</span><kbd class="px-1.5 py-0.5 bg-gray-100 rounded text-xs font-mono text-slate-700 border border-gray-200">H</kbd></div>
                <div class="flex justify-between"><span class="text-gray-600">Measure tool</span><kbd class="px-1.5 py-0.5 bg-gray-100 rounded text-xs font-mono text-slate-700 border border-gray-200">M</kbd></div>
                <div class="flex justify-between"><span class="text-gray-600">Annotate tool</span><kbd class="px-1.5 py-0.5 bg-gray-100 rounded text-xs font-mono text-slate-700 border border-gray-200">N</kbd></div>
                <div class="flex justify-between"><span class="text-gray-600">Text tool</span><kbd class="px-1.5 py-0.5 bg-gray-100 rounded text-xs font-mono text-slate-700 border border-gray-200">T</kbd></div>
                <div class="flex justify-between"><span class="text-gray-600">Toggle snap</span><kbd class="px-1.5 py-0.5 bg-gray-100 rounded text-xs font-mono text-slate-700 border border-gray-200">S</kbd></div>
              </div>

              <!-- Edit -->
              <div class="flex items-center gap-2 mb-2">
                <span class="text-xs font-bold uppercase tracking-wider text-amber-500">Edit</span>
                <div class="flex-1 h-px bg-amber-100"></div>
              </div>
              <div class="space-y-1.5 mb-5">
                <div class="flex justify-between"><span class="text-gray-600">Undo</span><kbd class="px-1.5 py-0.5 bg-gray-100 rounded text-xs font-mono text-slate-700 border border-gray-200">Ctrl+Z</kbd></div>
                <div class="flex justify-between"><span class="text-gray-600">Redo</span><kbd class="px-1.5 py-0.5 bg-gray-100 rounded text-xs font-mono text-slate-700 border border-gray-200">Ctrl+Y</kbd></div>
                <div class="flex justify-between"><span class="text-gray-600">Copy</span><kbd class="px-1.5 py-0.5 bg-gray-100 rounded text-xs font-mono text-slate-700 border border-gray-200">Ctrl+C</kbd></div>
                <div class="flex justify-between"><span class="text-gray-600">Paste</span><kbd class="px-1.5 py-0.5 bg-gray-100 rounded text-xs font-mono text-slate-700 border border-gray-200">Ctrl+V</kbd></div>
                <div class="flex justify-between"><span class="text-gray-600">Select all</span><kbd class="px-1.5 py-0.5 bg-gray-100 rounded text-xs font-mono text-slate-700 border border-gray-200">Ctrl+A</kbd></div>
                <div class="flex justify-between"><span class="text-gray-600">Deselect all</span><kbd class="px-1.5 py-0.5 bg-gray-100 rounded text-xs font-mono text-slate-700 border border-gray-200">Ctrl+D</kbd></div>
                <div class="flex justify-between"><span class="text-gray-600">Save project</span><kbd class="px-1.5 py-0.5 bg-gray-100 rounded text-xs font-mono text-slate-700 border border-gray-200">Ctrl+S</kbd></div>
                <div class="flex justify-between"><span class="text-gray-600">Cancel / Deselect</span><kbd class="px-1.5 py-0.5 bg-gray-100 rounded text-xs font-mono text-slate-700 border border-gray-200">Esc</kbd></div>
              </div>
            </div>

            <!-- Right column -->
            <div>
              <!-- Elements -->
              <div class="flex items-center gap-2 mb-2">
                <span class="text-xs font-bold uppercase tracking-wider text-emerald-500">Elements</span>
                <div class="flex-1 h-px bg-emerald-100"></div>
              </div>
              <div class="space-y-1.5 mb-5">
                <div class="flex justify-between"><span class="text-gray-600">Rotate element</span><kbd class="px-1.5 py-0.5 bg-gray-100 rounded text-xs font-mono text-slate-700 border border-gray-200">R</kbd></div>
                <div class="flex justify-between"><span class="text-gray-600">Delete selected</span><kbd class="px-1.5 py-0.5 bg-gray-100 rounded text-xs font-mono text-slate-700 border border-gray-200">Del</kbd></div>
                <div class="flex justify-between"><span class="text-gray-600">Lock / Unlock</span><kbd class="px-1.5 py-0.5 bg-gray-100 rounded text-xs font-mono text-slate-700 border border-gray-200">Ctrl+L</kbd></div>
                <div class="flex justify-between"><span class="text-gray-600">Group selection</span><kbd class="px-1.5 py-0.5 bg-gray-100 rounded text-xs font-mono text-slate-700 border border-gray-200">Ctrl+G</kbd></div>
                <div class="flex justify-between"><span class="text-gray-600">Ungroup</span><kbd class="px-1.5 py-0.5 bg-gray-100 rounded text-xs font-mono text-slate-700 border border-gray-200">Ctrl+⇧+G</kbd></div>
              </div>

              <!-- View -->
              <div class="flex items-center gap-2 mb-2">
                <span class="text-xs font-bold uppercase tracking-wider text-blue-500">View</span>
                <div class="flex-1 h-px bg-blue-100"></div>
              </div>
              <div class="space-y-1.5 mb-5">
                <div class="flex justify-between"><span class="text-gray-600">Toggle 2D / 3D</span><kbd class="px-1.5 py-0.5 bg-gray-100 rounded text-xs font-mono text-slate-700 border border-gray-200">Tab</kbd></div>
                <div class="flex justify-between"><span class="text-gray-600">Zoom to fit</span><kbd class="px-1.5 py-0.5 bg-gray-100 rounded text-xs font-mono text-slate-700 border border-gray-200">F</kbd></div>
                <div class="flex justify-between"><span class="text-gray-600">Toggle grid</span><kbd class="px-1.5 py-0.5 bg-gray-100 rounded text-xs font-mono text-slate-700 border border-gray-200">G</kbd></div>
                <div class="flex justify-between"><span class="text-gray-600">Toggle layers</span><kbd class="px-1.5 py-0.5 bg-gray-100 rounded text-xs font-mono text-slate-700 border border-gray-200">L</kbd></div>
                <div class="flex justify-between"><span class="text-gray-600">Show shortcuts</span><kbd class="px-1.5 py-0.5 bg-gray-100 rounded text-xs font-mono text-slate-700 border border-gray-200">?</kbd></div>
              </div>

              <!-- Canvas -->
              <div class="flex items-center gap-2 mb-2">
                <span class="text-xs font-bold uppercase tracking-wider text-purple-500">Canvas</span>
                <div class="flex-1 h-px bg-purple-100"></div>
              </div>
              <div class="space-y-1.5 mb-5">
                <div class="flex justify-between"><span class="text-gray-600">Zoom in / out</span><kbd class="px-1.5 py-0.5 bg-gray-100 rounded text-xs font-mono text-slate-700 border border-gray-200">Scroll</kbd></div>
                <div class="flex justify-between"><span class="text-gray-600">Zoom in / out</span><kbd class="px-1.5 py-0.5 bg-gray-100 rounded text-xs font-mono text-slate-700 border border-gray-200">+ / −</kbd></div>
                <div class="flex justify-between"><span class="text-gray-600">Pan canvas</span><kbd class="px-1.5 py-0.5 bg-gray-100 rounded text-xs font-mono text-slate-700 border border-gray-200">Space+Drag</kbd></div>
              </div>

              <!-- Walls -->
              <div class="flex items-center gap-2 mb-2">
                <span class="text-xs font-bold uppercase tracking-wider text-rose-500">Walls</span>
                <div class="flex-1 h-px bg-rose-100"></div>
              </div>
              <div class="space-y-1.5">
                <div class="flex justify-between"><span class="text-gray-600">Finish wall chain</span><kbd class="px-1.5 py-0.5 bg-gray-100 rounded text-xs font-mono text-slate-700 border border-gray-200">Dbl-click</kbd></div>
                <div class="flex justify-between"><span class="text-gray-600">Close wall loop</span><kbd class="px-1.5 py-0.5 bg-gray-100 rounded text-xs font-mono text-slate-700 border border-gray-200">C</kbd></div>
              </div>
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div class="px-6 py-3 border-t border-gray-100 text-center">
          <p class="text-xs text-gray-400">Press <kbd class="px-1 py-0.5 bg-gray-100 rounded text-xs font-mono border border-gray-200">?</kbd> or <kbd class="px-1 py-0.5 bg-gray-100 rounded text-xs font-mono border border-gray-200">Esc</kbd> to close</p>
        </div>
      </div>
    </dialog>
  {/if}

  <CommandPalette bind:open={commandPaletteOpen} />
  <PrintLayout bind:open={printOpen} />
  <OnboardingTooltip />
{:else}
  <div class="h-screen flex flex-col items-center justify-center gap-3">
    {#if loadError}
      <p role="alert" class="max-w-lg px-6 text-center text-red-700">{loadError}</p>
      <button class="text-blue-700 underline" onclick={initializeEditor}>Retry loading</button>
      <button class="text-blue-700 underline" onclick={backupLibrary}>Download library backup</button>
      <a class="text-blue-700 underline" href={`${base}/`}>Back to projects</a>
    {:else if importingCapture}
      <div class="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" aria-hidden="true"></div>
      <p class="text-gray-400">Importing capture from iOS app…</p>
    {:else}
      <p class="text-gray-400">Loading...</p>
    {/if}
  </div>
{/if}

<!-- iOS capture import error toast -->
{#if importError}
  <div class="fixed top-16 left-1/2 -translate-x-1/2 z-[100] w-[calc(100vw-2rem)] max-w-md bg-red-50 border border-red-200 text-red-700 rounded-lg shadow-lg px-4 py-3 flex items-start gap-3" role="alert">
    <svg class="w-5 h-5 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
    <div class="flex-1 text-sm">
      <p class="font-semibold">Capture import failed</p>
      <p>{importError}</p>
    </div>
    <button class="text-red-400 hover:text-red-600 text-lg leading-none" onclick={() => importError = null} aria-label="Dismiss error">✕</button>
  </div>
{/if}
