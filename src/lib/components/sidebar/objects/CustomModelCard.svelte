<script lang="ts">
  import { t } from '$lib/i18n';
  import type { CustomModelDef } from '$lib/models/types';

  let { model, placing, onArm, onRemove }: {
    model: CustomModelDef;
    placing: boolean;
    onArm: (id: string) => void;
    onRemove?: (id: string) => void;
  } = $props();

  const provenance = $derived([model.attribution, model.license, model.sourceUrl].filter(Boolean).join(' · '));
  const tooltip = $derived(provenance ? `${provenance} · ${$t('customModel.placeHint')}` : $t('customModel.placeHint'));
</script>

<div class="relative">
  <button
    type="button"
    class="w-full h-full flex flex-col items-center gap-1 p-3 rounded-lg border-2 transition-colors cursor-grab active:cursor-grabbing {placing ? 'border-blue-400 bg-blue-50 ring-1 ring-blue-300' : 'border-gray-100 hover:border-blue-300 hover:bg-blue-50'}"
    title={tooltip}
    onclick={() => onArm(model.id)}
    draggable="true"
    ondragstart={(event) => { event.dataTransfer?.setData('application/o3d-type', 'custom-model'); event.dataTransfer?.setData('application/o3d-id', model.id); }}
  >
    <div class="w-12 h-12 flex items-center justify-center rounded-lg bg-slate-100 text-2xl">📦</div>
    <span class="text-xs font-medium text-gray-600 text-center leading-tight">{model.name}</span>
    <span class="text-[10px] text-gray-400">{Math.round(model.width)}×{Math.round(model.depth)}cm</span>
  </button>
  {#if onRemove}
    <button
      type="button"
      class="absolute top-1 right-1 w-5 h-5 flex items-center justify-center rounded-full text-[14px] leading-none cursor-pointer text-gray-400 hover:text-red-600 hover:bg-red-50"
      onclick={() => onRemove(model.id)}
      aria-label={$t('customModel.remove')}
      title={$t('customModel.remove')}
    >−</button>
  {/if}
</div>
