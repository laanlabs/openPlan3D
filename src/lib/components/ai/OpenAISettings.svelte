<script lang="ts">
  import { t } from '$lib/i18n';
  import { get } from 'svelte/store';
  import { openAISettings, saveOpenAISettings, removeOpenAISettings } from '$lib/stores/aiKeys';
  import { normalizeBaseUrl } from '$lib/utils/openaiClient';
  import OpenAIModelPicker from './OpenAIModelPicker.svelte';

  const initial = get(openAISettings);
  let apiKey = $state(initial.apiKey);
  let baseUrl = $state(initial.baseUrl);
  let model = $state(initial.model);
  let keyVisible = $state(false);
  let status = $state('');
  let error = $state('');
  let destination = initial.baseUrl;
  function comparable(url: string) { try { return normalizeBaseUrl(url); } catch { return url.trim(); } }
  function changeDestination() {
    if (comparable(baseUrl) !== comparable(destination)) {
      apiKey = ''; model = '';
      status = $t('provider.changed');
    } else { status = ''; }
    destination = baseUrl;
    error = '';
  }
  function save() {
    error = ''; status = '';
    try {
      saveOpenAISettings({ apiKey, baseUrl, model });
      baseUrl = get(openAISettings).baseUrl; destination = baseUrl;
      status = $t('provider.saved');
    } catch (e) { error = e instanceof Error && e.name !== 'QuotaExceededError' && e.name !== 'SecurityError' ? e.message : $t('provider.saveFailed'); }
  }
  function remove() {
    error = ''; status = '';
    try {
      removeOpenAISettings(); apiKey = ''; baseUrl = ''; destination = ''; model = '';
      status = $t('provider.removed');
    } catch { error = $t('provider.removeFailed'); }
  }
</script>

<section class="border-t border-gray-200 dark:border-gray-700 pt-4 space-y-3 text-gray-700 dark:text-gray-200" aria-label={$t('provider.region')}>
  <h3 class="text-sm font-medium">{$t('provider.title')}</h3>
  <p class="text-xs text-gray-500 dark:text-gray-400">{$t('provider.help')}</p>
  <label class="block text-sm">
    {$t('provider.url')}
    <input type="url" bind:value={baseUrl} oninput={(event) => { baseUrl = event.currentTarget.value; changeDestination(); }} placeholder="https://api.openai.com/v1" autocomplete="off" spellcheck="false"
      class="mt-1 w-full px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700" />
  </label>
  <p class="text-xs text-gray-500 dark:text-gray-400">{$t('provider.urlHelp')}</p>
  <label class="block text-sm" for="openai-provider-key">{$t('provider.key')}</label>
  <div class="flex gap-2">
    <input id="openai-provider-key" type={keyVisible ? 'text' : 'password'} bind:value={apiKey} oninput={() => { status = ''; error = ''; }}
      autocomplete="off" spellcheck="false" placeholder={$t('provider.optionalKey')}
      class="min-w-0 flex-1 px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700" />
    <button type="button" onclick={() => keyVisible = !keyVisible} aria-label={keyVisible ? $t('provider.hideKey') : $t('provider.showKey')} class="text-xs px-2 border border-gray-300 dark:border-gray-600 rounded-lg">{keyVisible ? $t('provider.hide') : $t('provider.show')}</button>
  </div>
  <OpenAIModelPicker config={{ apiKey, baseUrl }} bind:model id="settings-openai-model" onchange={() => { status = ''; error = ''; }} />
  {#if status}<p role="status" class="text-xs">{status}</p>{/if}
  {#if error}<p role="alert" class="text-xs text-red-600 dark:text-red-400">{error}</p>{/if}
  <div class="flex flex-wrap gap-2">
    <button type="button" onclick={save} class="px-3 py-2 text-sm font-medium bg-slate-700 text-white rounded-lg hover:bg-slate-600">{$t('provider.save')}</button>
    <button type="button" onclick={remove} class="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">{$t('provider.remove')}</button>
  </div>
  <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" class="block text-xs text-blue-500 underline">{$t('provider.getKey')}</a>
</section>
