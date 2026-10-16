<script lang="ts">
  import { t } from '$lib/i18n';
  import { roomPresetLabels, roomTemplateLabels } from '$lib/i18n/roomLabels';
  import { modalDialog } from '$lib/utils/modalDialog';
  import { openProject } from '$lib/services/projectOpening';
  import ImportError from '$lib/components/ImportError.svelte';
  import { onDestroy, tick } from 'svelte';
  import { get } from 'svelte/store';
  import { activateMeasurementTool, selectedTool, placingFurnitureId, placingCustomModelId, placingDoorType, placingWindowType, placingStair, addStair, placingColumn, placingColumnShape, activeFloor, setBackgroundImage, canvasCamX, canvasCamY } from '$lib/stores/project';
  import type { Tool } from '$lib/stores/project';
  import { toggleColumnPlacement, toggleStairPlacement } from '$lib/utils/placementArming';
  import type { Door, Window as Win } from '$lib/models/types';
  import { roomPresets, placePreset } from '$lib/utils/roomPresets';
  import { roomTemplates, placeRoomTemplate } from '$lib/utils/roomTemplates';
  import { createProjectFromRoomPlan, extractRoomJsonFromZip, importRoomPlanFloors, interchangeStateFromRoomPlan, roomPlanImportOptions, validateRoomPlan, ORTHO_VERSION } from '$lib/utils/roomplanImport';
  import { addRoomPlanFloorsToProject, currentProject, selectImportedElements } from '$lib/stores/project';
  import { selectableContentIds, type AddedContent } from '$lib/utils/roomplanMerge';
  import { interchangeProjectName } from '$lib/utils/interchange';
  import ObjectsPanel from './objects/ObjectsPanel.svelte';

  let { onClose }: { onClose?: () => void } = $props();

  const openingLifetime = new AbortController();
  onDestroy(() => openingLifetime.abort());

  let importError = $state<string | null>(null);
  let largeImageWarning = $state(false);
  let unsupportedImage = $state(false);

  // AreaSummaryPanel moved to top bar dialog
  let activeTab = $state<'draw' | 'rooms' | 'objects'>('draw');
  let constructionOpen = $state(true);
  let selectedCategory = $state<string>('All');
  // RoomPlan import dialog state
  let showImportDialog = $state(false);
  let importFileName = $state('');
  let importJsonData: any = $state(null);
  let optStraighten = $state(true);
  let optOrthogonal = $state(true);
  let optMergeDistance = $state(15);
  /** 'add' stitches the scan into the open plan (issue #103); 'new' opens it as its own project. */
  let importTarget = $state<'new' | 'add'>('new');

  function setTool(tool: Tool) {
    if (tool === 'measure' || tool === 'annotate') activateMeasurementTool(tool);
    else selectedTool.set(tool);
    placingFurnitureId.set(null);
    placingCustomModelId.set(null);
  }

  let currentTool = $state<Tool>('select');
  onDestroy(selectedTool.subscribe((t) => { currentTool = t; }));

  function onPresetClick(presetId: string, templateName?: string) {
    const preset = roomPresets.find(p => p.id === presetId);
    if (preset) {
      let cx = 0, cy = 0;
      canvasCamX.subscribe(v => { cx = v; })();
      canvasCamY.subscribe(v => { cy = v; })();
      const template = templateName ? roomTemplates.find(t => t.name === templateName) ?? null : null;
      placeRoomTemplate(preset, { x: cx, y: cy }, template);
    }
  }

  const doorCatalog: { type: Door['type']; name: string; desc: string; icon: string }[] = $derived([
    { type: 'single', name: $t('openingCatalog.single'), desc: $t('openingCatalog.singleDescription'), icon: 'M6 3h12v18H6z' },
    { type: 'double', name: $t('openingCatalog.double'), desc: $t('openingCatalog.doubleDescription'), icon: 'M3 3h8v18H3zM13 3h8v18h-8z' },
    { type: 'sliding', name: $t('openingCatalog.sliding'), desc: $t('openingCatalog.slidingDescription'), icon: 'M3 6h18v12H3z' },
    { type: 'french', name: $t('openingCatalog.french'), desc: $t('openingCatalog.frenchDescription'), icon: 'M3 3h8v18H3zM13 3h8v18h-8z' },
    { type: 'pocket', name: $t('openingCatalog.pocket'), desc: $t('openingCatalog.pocketDescription'), icon: 'M6 3h12v18H6z' },
    { type: 'bifold', name: $t('openingCatalog.bifold'), desc: $t('openingCatalog.bifoldDescription'), icon: 'M3 3h5v18H3zM9 3h6v18H9zM16 3h5v18h-5z' },
    { type: 'opening', name: $t('openingCatalog.doorway'), desc: $t('openingCatalog.doorwayDescription'), icon: 'M6 3h2v18H6zM16 3h2v18h-2z' },
    { type: 'garage', name: $t('openingCatalog.garage'), desc: $t('openingCatalog.garageDescription'), icon: 'M3 5h18v14H3zM5 9h14M5 13h14M5 17h14' },
  ]);

  const windowCatalog: { type: Win['type']; name: string; desc: string }[] = $derived([
    { type: 'standard', name: $t('openingCatalog.standard'), desc: '120×120cm' },
    { type: 'fixed', name: $t('openingCatalog.fixed'), desc: '100×100cm' },
    { type: 'casement', name: $t('openingCatalog.casement'), desc: '80×130cm' },
    { type: 'sliding', name: $t('openingCatalog.sliding'), desc: '180×120cm' },
    { type: 'bay', name: $t('openingCatalog.bay'), desc: '200×150cm' },
  ]);

  let selectedDoorType = $state<Door['type']>('single');
  let selectedWindowType = $state<Win['type']>('standard');

  function setDoorType(type: Door['type']) {
    selectedDoorType = type;
    placingDoorType.set(type);
    setTool('door');
  }

  function setWindowType(type: Win['type']) {
    selectedWindowType = type;
    placingWindowType.set(type);
    setTool('window');
  }

  let isPlacingStair = $state(false);
  onDestroy(placingStair.subscribe(v => { isPlacingStair = v; }));

  let isPlacingColumn = $state(false);
  onDestroy(placingColumn.subscribe(v => { isPlacingColumn = v; }));
  let placingColShape = $state<'round' | 'square'>('round');
  onDestroy(placingColumnShape.subscribe(v => { placingColShape = v; }));
  const columnArmed = (shape: 'round' | 'square') => isPlacingColumn && placingColShape === shape;

  /** PNG, JPEG and GIF reach the iPhone package unchanged; any other decodable pick (WebP, BMP, …) is re-encoded as PNG so the package never drops it. */
  async function tracingImageDataUrl(file: File): Promise<string | undefined> {
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });
    if (/^data:image\/(?:png|jpeg|gif);base64,/.test(dataUrl)) return dataUrl;
    const image = new Image();
    image.src = dataUrl;
    await image.decode();
    // Bound the canvas so a huge WebP or BMP cannot exhaust memory.
    const scale = Math.min(1, Math.sqrt(24_000_000 / (image.naturalWidth * image.naturalHeight)));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(image.naturalWidth * scale); canvas.height = Math.round(image.naturalHeight * scale);
    const context = canvas.getContext('2d');
    if (!context) return undefined;
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const png = canvas.toDataURL('image/png');
    return png.startsWith('data:image/png;base64,') ? png : undefined;
  }

  function onImportImage() {
    const input = document.createElement('input');
    input.type = 'file';
    // The formats a project package shares with iPhone, plus WebP, which is re-encoded as PNG.
    input.accept = 'image/png,image/jpeg,image/gif,image/webp';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      unsupportedImage = false;
      const dataUrl = await tracingImageDataUrl(file).catch(() => undefined);
      if (!dataUrl) { unsupportedImage = true; return; }
      // A large image still imports; the note under the button replaces the old blocking alert.
      largeImageWarning = dataUrl.length * 3 / 4 > 5 * 1024 * 1024;
      setBackgroundImage({ dataUrl, position: { x: 0, y: 0 }, scale: 1, opacity: 0.4, rotation: 0, locked: false });
    };
    input.click();
  }

  async function onImportRoomPlan() {
    importError = null;
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,.zip';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      try {
        let jsonData: any;
        if (/\.zip$/i.test(file.name)) {
          jsonData = await extractRoomJsonFromZip(file);
        } else {
          const text = await file.text();
          jsonData = JSON.parse(text);
        }
        validateRoomPlan(jsonData);
        const options = roomPlanImportOptions(jsonData);
        optStraighten = options.straighten ?? true;
        optOrthogonal = options.orthogonal ?? true;
        optMergeDistance = options.mergeDistance ?? 15;
        importJsonData = jsonData;
        importFileName = file.name.replace(/\.(json|zip)$/, '');
        showImportDialog = true;
      } catch (e: any) {
        importError = e.message;
      }
    };
    input.click();
  }

  async function confirmImport() {
    if (!importJsonData) return;
    const input = importJsonData;
    importError = null;
    const options = { straighten: optStraighten, orthogonal: optOrthogonal, mergeDistance: optMergeDistance };
    let added: AddedContent[] = [];
    try {
      if (importTarget === 'add') {
        // Stitch the scan into the open plan beside its current content; one Undo removes it again.
        // The file's sibling block, attributes, defaults and notes travel with the scan.
        added = addRoomPlanFloorsToProject(importRoomPlanFloors(input, options), undefined, interchangeStateFromRoomPlan(input)).added;
        selectAddedContent(added);
      } else {
        // Create a new project for the imported data instead of merging into current
        const projectName = interchangeProjectName(input, importFileName ? importFileName.replace(/\.(json|zip)$/i, '') : 'RoomPlan Import');
        await openProject(() => createProjectFromRoomPlan(input, projectName, options), 'import', openingLifetime.signal);
      }
    } catch (e: any) {
      if (importJsonData === input) importError = e.message;
    }
    if (importJsonData === input) {
      showImportDialog = false;
      importJsonData = null;
      if (added.some(entry => entry.ids.length)) await revealPlan();
    }
  }

  /** Show the stitched scan on its floor and select it, so it can be moved or rotated into place. */
  function selectAddedContent(added: AddedContent[]) {
    const first = added.find(entry => entry.ids.length), project = get(currentProject);
    if (!first || !project) return;
    const floor = project.floors.find(f => f.id === first.floorId);
    // Switches floor when needed and always leaves the select tool active with nothing being placed.
    selectImportedElements(first.floorId, floor ? selectableContentIds(floor, first.ids) : []);
  }

  /** The canvas owns its camera; its Zoom to Fit shortcut shows the plan and the new scan together once the dialog is gone. */
  async function revealPlan() {
    await tick();
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'f' }));
  }

  function cancelImport() {
    showImportDialog = false;
    importJsonData = null;
  }
</script>

<div class="w-64 max-md:w-full bg-white border-r border-gray-200 flex flex-col h-full overflow-hidden">
  <!-- Tabs -->
  <div class="flex border-b border-gray-200">
    <button
      class="flex-1 py-2.5 text-xs font-semibold uppercase tracking-wide {activeTab === 'draw' ? 'text-slate-800 border-b-2 border-blue-500 bg-blue-50' : 'text-gray-500 hover:text-gray-700'}"
      onclick={() => activeTab = 'draw'}
    >{$t('buildTools.build')}</button>
    <button
      class="flex-1 py-2.5 text-xs font-semibold uppercase tracking-wide {activeTab === 'rooms' ? 'text-slate-800 border-b-2 border-blue-500 bg-blue-50' : 'text-gray-500 hover:text-gray-700'}"
      onclick={() => activeTab = 'rooms'}
    >{$t('buildTools.rooms')}</button>
    <button
      class="flex-1 py-2.5 text-xs font-semibold uppercase tracking-wide {activeTab === 'objects' ? 'text-slate-800 border-b-2 border-blue-500 bg-blue-50' : 'text-gray-500 hover:text-gray-700'}"
      onclick={() => activeTab = 'objects'}
    >{$t('buildTools.objects')}</button>
  </div>

  {#if activeTab === 'objects'}
    <ObjectsPanel {onClose} />
  {:else}
  <div class="flex-1 overflow-y-auto p-3">
    {#if activeTab === 'draw'}
      <div class="space-y-1">
        <h3 class="text-xs font-semibold text-gray-400 uppercase mb-2">{$t('buildTools.tools')}</h3>
        <button
          class="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors {currentTool === 'select' ? 'bg-blue-50 text-slate-800 ring-1 ring-blue-200' : 'hover:bg-gray-50 text-gray-700'}"
          onclick={() => setTool('select')}
        >
          <div class="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center {currentTool === 'select' ? 'bg-blue-100' : ''}">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z"/><path d="M13 13l6 6"/></svg>
          </div>
          <div class="text-left">
            <div class="font-medium">{$t('buildTools.select')} <span class="text-gray-400 text-xs ml-1">V</span></div>
            <div class="text-xs text-gray-400">{$t('buildTools.selectHelp')}</div>
          </div>
        </button>
        <button
          class="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors {currentTool === 'wall' ? 'bg-blue-50 text-slate-800 ring-1 ring-blue-200' : 'hover:bg-gray-50 text-gray-700'}"
          onclick={() => setTool('wall')}
        >
          <div class="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center {currentTool === 'wall' ? 'bg-blue-100' : ''}">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="8" width="18" height="8" rx="1"/><line x1="7" y1="8" x2="7" y2="16"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="17" y1="8" x2="17" y2="16"/></svg>
          </div>
          <div class="text-left">
            <div class="font-medium">{$t('buildTools.wall')} <span class="text-gray-400 text-xs ml-1">W</span></div>
            <div class="text-xs text-gray-400">{$t('buildTools.wallHelp')}</div>
          </div>
        </button>

        <h3 class="text-xs font-semibold text-gray-400 uppercase mb-2 mt-3">{$t('buildTools.structure')}</h3>
        <button
          class="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors {isPlacingStair ? 'bg-blue-50 text-slate-800 ring-1 ring-blue-200' : 'hover:bg-gray-50 text-gray-700'}"
          aria-pressed={isPlacingStair}
          onclick={toggleStairPlacement}
        >
          <div class="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center {isPlacingStair ? 'bg-blue-100' : ''}">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 5h-5V2h-3v6h-4V5H7v6H2v3h5v3h3v-3h4v3h3v-6h5z"/></svg>
          </div>
          <div class="text-left">
            <div class="font-medium">{$t('buildTools.stairs')}</div>
            <div class="text-xs text-gray-400">{$t('buildTools.stairsHelp')}</div>
          </div>
        </button>

        <div class="flex gap-2">
          <button
            class="flex-1 flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm transition-colors {columnArmed('round') ? 'bg-blue-50 text-slate-800 ring-1 ring-blue-200' : 'hover:bg-gray-50 text-gray-700'}"
            aria-pressed={columnArmed('round')}
            onclick={() => toggleColumnPlacement('round')}
          >
            <div class="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center {columnArmed('round') ? 'bg-blue-100' : ''}">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="6"/><line x1="6" y1="6" x2="18" y2="18"/><line x1="18" y1="6" x2="6" y2="18"/></svg>
            </div>
            <div class="text-left">
              <div class="font-medium text-xs">{$t('buildTools.round')}</div>
            </div>
          </button>
          <button
            class="flex-1 flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm transition-colors {columnArmed('square') ? 'bg-blue-50 text-slate-800 ring-1 ring-blue-200' : 'hover:bg-gray-50 text-gray-700'}"
            aria-pressed={columnArmed('square')}
            onclick={() => toggleColumnPlacement('square')}
          >
            <div class="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center {columnArmed('square') ? 'bg-blue-100' : ''}">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="6" y="6" width="12" height="12"/><line x1="6" y1="6" x2="18" y2="18"/><line x1="18" y1="6" x2="6" y2="18"/></svg>
            </div>
            <div class="text-left">
              <div class="font-medium text-xs">{$t('buildTools.square')}</div>
            </div>
          </button>
        </div>

        <h3 class="text-xs font-semibold text-gray-400 uppercase mb-2 mt-3">{$t('buildTools.annotate')}</h3>
        <button
          class="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors {currentTool === 'text' ? 'bg-blue-50 text-slate-800 ring-1 ring-blue-200' : 'hover:bg-gray-50 text-gray-700'}"
          onclick={() => setTool('text')}
        >
          <div class="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center {currentTool === 'text' ? 'bg-blue-100' : ''}">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7V4h16v3"/><line x1="12" y1="4" x2="12" y2="20"/><line x1="8" y1="20" x2="16" y2="20"/></svg>
          </div>
          <div class="text-left">
            <div class="font-medium">{$t('buildTools.text')}</div>
            <div class="text-xs text-gray-400">{$t('buildTools.textHelp')}</div>
          </div>
        </button>

        <button
          class="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors {currentTool === 'annotate' ? 'bg-blue-50 text-slate-800 ring-1 ring-blue-200' : 'hover:bg-gray-50 text-gray-700'}"
          onclick={() => setTool('annotate')}
        >
          <div class="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center {currentTool === 'annotate' ? 'bg-blue-100' : ''}">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><line x1="16" y1="5" x2="22" y2="5"/><line x1="19" y1="2" x2="19" y2="8"/><line x1="3" y1="12" x2="12" y2="12"/></svg>
          </div>
          <div class="text-left">
            <div class="font-medium">{$t('buildTools.dimension')}</div>
            <div class="text-xs text-gray-400">{$t('buildTools.dimensionHelp')}</div>
          </div>
        </button>
        <button
          class="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors {currentTool === 'measure' ? 'bg-blue-50 text-slate-800 ring-1 ring-blue-200' : 'hover:bg-gray-50 text-gray-700'}"
          onclick={() => setTool('measure')}
        >
          <div class="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center {currentTool === 'measure' ? 'bg-blue-100' : ''}">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12h5l2-7 4 14 2-7h7"/></svg>
          </div>
          <div class="text-left">
            <div class="font-medium">{$t('buildTools.measure')}</div>
            <div class="text-xs text-gray-400">{$t('buildTools.measureHelp')}</div>
          </div>
        </button>

        <h3 class="text-xs font-semibold text-gray-400 uppercase mb-2 mt-3">{$t('buildTools.import')}</h3>
        <button
          class="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors hover:bg-gray-50 text-gray-700"
          onclick={onImportImage}
        >
          <div class="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>
          </div>
          <div class="text-left">
            <div class="font-medium">{$t('buildTools.image')}</div>
            <div class="text-xs text-gray-400">{$t('buildTools.imageHelp')}</div>
          </div>
        </button>
        {#if largeImageWarning}
          <div role="status" class="mb-1 flex items-start justify-between gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900">
            <p><span class="font-semibold">{$t('buildTools.largeImageTitle')}</span> {$t('buildTools.largeImage')}</p>
            <button aria-label={$t('buildTools.largeImageDismiss')} class="rounded px-1 hover:bg-amber-100" onclick={() => largeImageWarning = false}>✕</button>
          </div>
        {/if}
        {#if unsupportedImage}
          <div role="alert" class="mb-1 flex items-start justify-between gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900">
            <p>{$t('buildTools.imageUnsupported')}</p>
            <button aria-label={$t('buildTools.largeImageDismiss')} class="rounded px-1 hover:bg-amber-100" onclick={() => unsupportedImage = false}>✕</button>
          </div>
        {/if}
        <button
          class="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors hover:bg-gray-50 text-gray-700"
          onclick={onImportRoomPlan}
        >
          <div class="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
          </div>
          <div class="text-left">
            <div class="font-medium">{$t('buildTools.roomplan')}</div>
            <div class="text-xs text-gray-400">{$t('buildTools.roomplanHelp')}</div>
          </div>
        </button>

        <button
          class="w-full flex items-center justify-between px-1 py-2 mt-3"
          onclick={() => constructionOpen = !constructionOpen}
        >
          <h3 class="text-xs font-semibold text-gray-400 uppercase">{$t('layers.doors')}</h3>
          <span class="text-gray-400 text-xs">{constructionOpen ? '▼' : '▶'}</span>
        </button>

        {#if constructionOpen}
          <div class="grid grid-cols-2 gap-2 mb-3">
            {#each doorCatalog as dc}
              <button
                class="flex flex-col items-center gap-1 p-2.5 rounded-lg border-2 transition-colors cursor-grab active:cursor-grabbing {currentTool === 'door' && selectedDoorType === dc.type ? 'border-blue-400 bg-blue-50' : 'border-gray-100 hover:border-gray-200'}"
                onclick={() => setDoorType(dc.type)}
                draggable="true"
                ondragstart={(e) => { e.dataTransfer?.setData('application/o3d-type', 'door'); e.dataTransfer?.setData('application/o3d-id', dc.type); }}
              >
                <div class="w-9 h-9 rounded-lg bg-amber-50 flex items-center justify-center">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#92400e" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="{dc.icon}"/></svg>
                </div>
                <span class="text-xs font-medium text-gray-600">{dc.name}</span>
                <span class="text-[10px] text-gray-400">{dc.desc}</span>
              </button>
            {/each}
          </div>

          <h3 class="text-xs font-semibold text-gray-400 uppercase mb-2">{$t('layers.windows')}</h3>
          <div class="grid grid-cols-2 gap-2">
            {#each windowCatalog as wc}
              <button
                class="flex flex-col items-center gap-1 p-2.5 rounded-lg border-2 transition-colors cursor-grab active:cursor-grabbing {currentTool === 'window' && selectedWindowType === wc.type ? 'border-blue-400 bg-blue-50' : 'border-gray-100 hover:border-gray-200'}"
                onclick={() => setWindowType(wc.type)}
                draggable="true"
                ondragstart={(e) => { e.dataTransfer?.setData('application/o3d-type', 'window'); e.dataTransfer?.setData('application/o3d-id', wc.type); }}
              >
                <div class="w-9 h-9 rounded-lg bg-cyan-50 flex items-center justify-center">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0e7490" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="16" rx="1"/><line x1="12" y1="4" x2="12" y2="20"/><line x1="3" y1="12" x2="21" y2="12"/></svg>
                </div>
                <span class="text-xs font-medium text-gray-600">{wc.name}</span>
                <span class="text-[10px] text-gray-400">{wc.desc}</span>
              </button>
            {/each}
          </div>
        {/if}
      </div>

    {:else}
      <div class="space-y-2">
        <h3 class="text-xs font-semibold text-gray-400 uppercase mb-2">{$t('roomChoices.presets')}</h3>
        <p class="text-xs text-gray-400 mb-3">{$t('roomChoices.presetsHelp')}</p>
        <div class="grid grid-cols-2 gap-2">
          {#each roomPresets as preset}
            <button
              class="flex flex-col items-center gap-1.5 p-3 rounded-lg border-2 border-gray-100 hover:border-blue-300 hover:bg-blue-50 transition-colors cursor-grab active:cursor-grabbing"
              onclick={() => onPresetClick(preset.id)}
              draggable="true"
              ondragstart={(e) => { e.dataTransfer?.setData('application/o3d-type', 'room'); e.dataTransfer?.setData('application/o3d-id', preset.id); }}
            >
              <div class="w-12 h-12 rounded-lg bg-gray-50 flex items-center justify-center text-2xl font-mono">{preset.icon}</div>
              <span class="text-xs font-medium text-gray-600">{roomPresetLabels[preset.id] ? $t(roomPresetLabels[preset.id]) : preset.name}</span>
            </button>
          {/each}
        </div>

        <hr class="my-3 border-gray-200" />

        <h3 class="text-xs font-semibold text-gray-400 uppercase mb-2">{$t('roomChoices.templates')}</h3>
        <p class="text-xs text-gray-400 mb-3">{$t('roomChoices.templatesHelp')}</p>
        <div class="grid grid-cols-2 gap-2">
          {#each roomTemplates as tmpl}
            <button
              class="flex flex-col items-center gap-1.5 p-3 rounded-lg border-2 border-gray-100 hover:border-green-300 hover:bg-green-50 transition-colors cursor-grab active:cursor-grabbing"
              onclick={() => onPresetClick(tmpl.presetId, tmpl.name)}
              draggable="true"
              ondragstart={(e) => { e.dataTransfer?.setData('application/o3d-type', 'room-template'); e.dataTransfer?.setData('application/o3d-id', tmpl.name); }}
            >
              <div class="w-12 h-12 rounded-lg bg-green-50 flex items-center justify-center text-lg">
                {#if tmpl.name === 'Living Room'}🛋️
                {:else if tmpl.name === 'Bedroom'}🛏️
                {:else if tmpl.name === 'Kitchen'}🍳
                {:else if tmpl.name === 'Bathroom'}🛁
                {:else if tmpl.name === 'Office'}🖥️
                {:else if tmpl.name === 'Dining Room'}🍽️
                {:else}🏠
                {/if}
              </div>
              <span class="text-xs font-medium text-gray-600">{roomTemplateLabels[tmpl.name] ? $t(roomTemplateLabels[tmpl.name]) : tmpl.name}</span>
              <span class="text-[10px] text-gray-400">{$t(tmpl.furniture.length === 1 ? 'roomChoices.item' : 'roomChoices.items', { count: tmpl.furniture.length })}</span>
            </button>
          {/each}
        </div>
      </div>

    {/if}
  </div>
  {/if}
</div>

<!-- RoomPlan Import Options Dialog -->
{#if showImportDialog}
  <dialog use:modalDialog class="modal-overlay fixed inset-0 bg-black/50 z-50 flex items-center justify-center" aria-label={$t('roomPlanDialog.title')} onclick={(e) => { if (e.target === e.currentTarget) cancelImport(); }} oncancel={(e) => { e.preventDefault(); cancelImport(); }}>
    <div class="bg-white rounded-xl shadow-2xl w-80 max-w-[calc(100vw-2rem)] max-h-[85vh] overflow-auto p-5">
      <h3 class="text-sm font-bold text-gray-800 mb-1">{$t('roomPlanDialog.title')}</h3>
      <p class="text-xs text-gray-400 mb-4">{importFileName}</p>

      <div class="space-y-3">
        <fieldset class="space-y-2 pb-3 border-b border-gray-100">
          <legend class="text-xs text-gray-500 mb-1">{$t('roomPlanDialog.target')}</legend>
          <label class="flex items-start gap-2.5 cursor-pointer">
            <input type="radio" name="roomplan-target" value="new" bind:group={importTarget} class="accent-blue-500 mt-0.5" />
            <div>
              <div class="text-sm font-medium text-gray-700">{$t('roomPlanDialog.newProject')}</div>
              <div class="text-xs text-gray-400">{$t('roomPlanDialog.newProjectHelp')}</div>
            </div>
          </label>
          <label class="flex items-start gap-2.5 cursor-pointer">
            <input type="radio" name="roomplan-target" value="add" bind:group={importTarget} class="accent-blue-500 mt-0.5" />
            <div>
              <div class="text-sm font-medium text-gray-700">{$t('roomPlanDialog.addToPlan')}</div>
              <div class="text-xs text-gray-400">{$t('roomPlanDialog.addToPlanHelp')}</div>
            </div>
          </label>
        </fieldset>

        <label class="flex items-start gap-2.5 cursor-pointer">
          <input type="checkbox" bind:checked={optStraighten} class="accent-blue-500 mt-0.5" />
          <div>
            <div class="text-sm font-medium text-gray-700">{$t('roomPlanDialog.straighten')}</div>
            <div class="text-xs text-gray-400">{$t('roomPlanDialog.straightenHelp')}</div>
          </div>
        </label>

        <label class="flex items-start gap-2.5 cursor-pointer">
          <input type="checkbox" bind:checked={optOrthogonal} class="accent-blue-500 mt-0.5" />
          <div>
            <div class="text-sm font-medium text-gray-700">{$t('roomPlanDialog.orthogonal')} <span class="text-xs text-blue-400 font-mono">{ORTHO_VERSION}</span></div>
            <div class="text-xs text-gray-400">{$t('roomPlanDialog.orthogonalHelp')}</div>
          </div>
        </label>

        <label class="block">
          <div class="text-xs text-gray-500 mb-1">{$t('roomPlanDialog.merge')}</div>
          <input type="number" bind:value={optMergeDistance} min="0" max="50" step="5" class="w-full px-2 py-1 border border-gray-200 rounded text-sm" />
        </label>
      </div>

      <div class="flex gap-2 mt-5">
        <button onclick={cancelImport} class="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors">{$t('roomPlanDialog.cancel')}</button>
        <button onclick={confirmImport} class="flex-1 px-3 py-2 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600 transition-colors">{$t('roomPlanDialog.import')}</button>
      </div>
    </div>
  </dialog>
{/if}

{#if importError}
  <ImportError message={importError} onDismiss={() => importError = null} />
{/if}
