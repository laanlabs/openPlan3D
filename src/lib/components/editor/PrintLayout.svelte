<script lang="ts">
  import { t, locale } from '$lib/i18n';
  import { modalDialog } from '$lib/utils/modalDialog';
  import { tick } from 'svelte';
  import { currentProject } from '$lib/stores/project';
  import { renderPrintPage, createPrintPDF } from '$lib/utils/scaledPrint';
  import type { PrintOptions, calculatePrintLayout } from '$lib/utils/printLayout';

  let { open = $bindable(false) } = $props();
  let pageSize = $state<PrintOptions['pageSize']>('letter');
  let orientation = $state<PrintOptions['orientation']>('landscape');
  let scale = $state<PrintOptions['scale']>(50);
  let canvas = $state<HTMLCanvasElement>();
  let layout = $state<ReturnType<typeof calculatePrintLayout> | null>(null);
  let error = $state('');
  let rendering = $state(false);
  const options = $derived({ pageSize, orientation, scale });

  $effect(() => {
    const project = $currentProject;
    const settings = options;
    const language = $locale;
    if (!open || !project) return;
    let disposed = false;
    rendering = true;
    void tick().then(() => {
      if (disposed || !canvas) return;
      try { layout = renderPrintPage(canvas, project, settings, language); error = ''; }
      catch (e) { layout = null; error = e instanceof Error ? e.message : $t('print.prepareFailed'); }
      rendering = false;
    });
    return () => { disposed = true; };
  });

  function downloadPDF() {
    if (!$currentProject || !canvas || !layout?.fits || rendering) return;
    try { createPrintPDF(canvas, $currentProject, options, $locale).save(`${$currentProject.name || 'floorplan'}-${layout.scaleLabel.replaceAll(':', '-')}.pdf`); }
    catch (e) { error = e instanceof Error ? e.message : $t('print.downloadFailed'); }
  }
</script>

<svelte:head>
  {#if open}<style>{`@page { size: ${pageSize === 'a4' ? 'A4' : 'letter'} ${orientation}; margin: 0; }`}</style>{/if}
</svelte:head>

{#if open}
  <dialog use:modalDialog class="modal-overlay fixed inset-0 bg-slate-950/70 z-[100] overflow-auto print-overlay-backdrop" aria-label={$t('print.title')} oncancel={(e) => { e.preventDefault(); open = false; }}>
    <div class="sticky top-0 bg-slate-800 text-white p-3 flex flex-wrap items-center gap-3 z-[101] print-hide">
      <h2 class="font-semibold">{$t('print.title')}</h2>
      <label>{$t('print.page')} <select bind:value={pageSize} class="bg-slate-700 rounded p-1"><option value="letter">{$t('print.letter')}</option><option value="a4">A4</option></select></label>
      <label>{$t('print.orientation')} <select bind:value={orientation} class="bg-slate-700 rounded p-1"><option value="landscape">{$t('print.landscape')}</option><option value="portrait">{$t('print.portrait')}</option></select></label>
      <label>{$t('print.scale')} <select bind:value={scale} class="bg-slate-700 rounded p-1"><option value="fit">{$t('print.fit')}</option>{#each [25, 50, 100, 200] as denominator}<option value={denominator}>1:{denominator}</option>{/each}</select></label>
      <button class="bg-blue-600 disabled:opacity-40 px-3 py-1 rounded" disabled={!layout?.fits || rendering} onclick={downloadPDF}>{$t('print.download')}</button>
      <button class="bg-slate-600 disabled:opacity-40 px-3 py-1 rounded" disabled={!layout?.fits || rendering} onclick={() => window.print()}>{$t('print.print')}</button>
      <button class="ml-auto px-3 py-1" onclick={() => open = false}>{$t('print.close')}</button>
      <p class="w-full text-xs text-slate-200">{$t('print.help')}</p>
      {#if error}<p role="alert" class="w-full text-amber-200">{error}</p>
      {:else if !rendering && !layout}<p role="status" class="w-full text-amber-200">{$t('print.empty')}</p>
      {:else if layout && !layout.fits}<p role="alert" class="w-full text-amber-200">{$t('print.overflow')}</p>{/if}
    </div>
    <div class="print-page bg-white mx-auto my-6 shadow-xl" style:width={layout ? `${layout.pageWidth}mm` : '279.4mm'} style:max-width="100%">
      <canvas bind:this={canvas} class="block w-full h-auto" aria-label={$t('print.canvas')}></canvas>
    </div>
  </dialog>
{/if}
