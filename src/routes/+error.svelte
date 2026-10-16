<script lang="ts">
  import { page } from '$app/state';
  import { base } from '$app/paths';
  import { t } from '$lib/i18n';
  import { prepareToLeave } from '$lib/services/deployment';
  import { currentProject } from '$lib/stores/project';
  import { downloadProjectJSON as exportAsJSON } from '$lib/utils/projectBackup';
  let saveFailed = $state(false);
  async function retry() {
    if (await prepareToLeave()) window.location.reload();
    else saveFailed = true;
  }
</script>

<main class="mx-auto max-w-xl p-8 text-slate-700">
  <h1 class="text-2xl font-semibold">{$t(page.status === 404 ? 'errorPage.notFound' : 'errorPage.failed')}</h1>
  <p class="mt-3">{$t('errorPage.help')}</p>
  {#if saveFailed}<p role="alert" class="mt-3 text-red-700">{$t('errorPage.saveFailed')}</p>{/if}
  <div class="mt-5 flex gap-4">
    <button class="rounded bg-blue-600 px-4 py-2 text-white" onclick={retry}>{$t('errorPage.retry')}</button>
    {#if $currentProject}<button onclick={() => { if ($currentProject) exportAsJSON($currentProject); }}>{$t('errorPage.backup')}</button>{/if}
    <a class="p-2 underline" href={`${base}/`}>{$t('errorPage.library')}</a>
  </div>
</main>
