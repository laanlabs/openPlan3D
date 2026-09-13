<script lang="ts">
  import { t } from '$lib/i18n';
  import { onDestroy } from 'svelte';
  import { fetchOpenAIModels, DEFAULT_OPENAI_MODEL, OPENAI_MODEL_SUGGESTIONS, type OpenAIConfig } from '$lib/utils/openaiClient';

  let { config, model = $bindable(''), id, disabled = false, onchange = () => {} }: {
    config: OpenAIConfig; model?: string; id: string; disabled?: boolean; onchange?: () => void;
  } = $props();
  let models = $state<string[]>([]);
  let loading = $state(false);
  let message = $state('');
  let controller: AbortController | null = null;

  // Changing key/destination invalidates discovery; late responses cannot replace the new list.
  $effect(() => {
    void config.apiKey; void config.baseUrl;
    controller?.abort(); controller = null;
    models = []; message = ''; loading = false;
  });
  onDestroy(() => { controller?.abort(); controller = null; });

  async function loadModels() {
    controller?.abort();
    const current = new AbortController();
    controller = current; loading = true; message = '';
    try {
      const result = await fetchOpenAIModels(config, fetch, current.signal);
      if (controller !== current) return;
      models = result;
      message = result.length ? $t(result.length === 1 ? 'models.foundOne' : 'models.found', { count: result.length }) : $t('models.empty');
    } catch (error) {
      if (controller === current) message = error instanceof Error ? error.message : $t('models.failed');
    } finally {
      if (controller === current) { loading = false; controller = null; }
    }
  }
</script>

<div class="space-y-2">
  <label for={id} class="block text-xs font-medium">{$t('models.title')}</label>
  <div class="flex gap-2">
    <input {id} list={`${id}-models`} bind:value={model} {disabled} onblur={onchange} aria-label={$t('models.title')}
      placeholder={DEFAULT_OPENAI_MODEL} autocomplete="off" spellcheck="false"
      class="min-w-0 flex-1 rounded-lg border border-gray-500/50 bg-transparent px-2 py-1.5 text-sm" />
    <button type="button" onclick={loadModels} disabled={disabled || loading}
      class="shrink-0 rounded-lg border border-gray-500/50 px-2 py-1.5 text-xs hover:bg-gray-500/20 disabled:opacity-50">
      {loading ? $t('models.loading') : $t('models.load')}
    </button>
  </div>
  <datalist id={`${id}-models`}>
    {#each models.length ? models : !config.baseUrl ? OPENAI_MODEL_SUGGESTIONS : [] as value}
      <option {value}></option>
    {/each}
  </datalist>
  {#if message}<p role="status" class="text-xs break-words">{message}</p>{/if}
  <p class="text-xs opacity-70">{$t('models.help')}</p>
</div>
