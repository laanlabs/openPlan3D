<script lang="ts">
  import { onMount } from 'svelte';
  import { get } from 'svelte/store';
  import { beforeNavigate, goto } from '$app/navigation';
  import { dev, version } from '$app/environment';
  import { assets, base } from '$app/paths';
  import { currentProject } from '$lib/stores/project';
  import { saveState } from '$lib/stores/saveStatus';
  import { loadingFailure, prepareToLeave } from '$lib/services/deployment';
  import { hasDeploymentUpdate } from '$lib/services/deploymentVersion';
  import { downloadProjectJSON as exportAsJSON } from '$lib/utils/projectBackup';

  let busy = $state(false);
  let message = $state('');
  let target = $state<URL | null>(null);
  let updateAvailable = $state(false);

  beforeNavigate(navigation => {
    if (navigation.willUnload || !navigation.to?.url) return;
    const dirtyEditor = navigation.from?.url.pathname === `${base}/editor` && get(saveState) !== 'saved';
    if (!updateAvailable && !dirtyEditor) return;
    navigation.cancel();
    target = navigation.to.url;
    if (dirtyEditor && !busy) {
      busy = true;
      const destination = target;
      void prepareToLeave().then(saved => {
        busy = false;
        if (!saved) { message = 'Your changes could not be saved. Stay here to retry or download a JSON backup.'; return; }
        if (!updateAvailable && target === destination) {
          target = null;
          void goto(destination, { replaceState: navigation.type === 'popstate' });
        }
      });
    }
  });

  async function reload() {
    busy = true;
    if (!await prepareToLeave()) {
      message = 'Your changes could not be saved. Retry saving or download a JSON backup before reloading.';
      busy = false;
      return;
    }
    window.location.assign(target?.href ?? window.location.href);
  }

  onMount(() => {
    if (dev) return;
    let lastCheck = Date.now();
    let checking = false;
    let disposed = false;
    const check = () => {
      if (document.hidden || updateAvailable || checking || Date.now() - lastCheck < 60_000) return;
      lastCheck = Date.now();
      checking = true;
      void hasDeploymentUpdate(version, `${assets}/_app/version.json`).then(available => {
        if (!disposed && available) updateAvailable = true;
      }).finally(() => { checking = false; });
    };
    const timer = setInterval(check, 300_000);
    window.addEventListener('focus', check);
    document.addEventListener('visibilitychange', check);
    return () => { disposed = true; clearInterval(timer); window.removeEventListener('focus', check); document.removeEventListener('visibilitychange', check); };
  });
</script>

{#if updateAvailable || $loadingFailure || message}
  <aside role="status" class="fixed bottom-4 left-1/2 -translate-x-1/2 z-[90] w-[min(95vw,650px)] rounded-xl border border-blue-300 bg-white p-4 text-slate-800 shadow-xl print-hide">
    <p class="text-sm">{message || (updateAvailable ? 'An app update is ready. Reload to use the latest version. Your project will be saved first.' : $loadingFailure)}</p>
    <div class="mt-3 flex flex-wrap gap-3">
      <button class="rounded bg-blue-600 px-3 py-1.5 text-sm text-white disabled:opacity-50" disabled={busy} onclick={reload}>{busy ? 'Saving…' : 'Save and reload'}</button>
      {#if $currentProject}<button class="text-sm underline" onclick={() => { if ($currentProject) exportAsJSON($currentProject); }}>Download JSON backup</button>{/if}
      {#if message}<button class="text-sm underline" onclick={() => { message = ''; target = null; }}>Keep editing</button>{/if}
    </div>
  </aside>
{/if}
