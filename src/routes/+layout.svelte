<script>
  import '../app.css';
  import { initializeLocale } from '$lib/i18n';
  onMount(initializeLocale);
  import { browser } from '$app/env';
  import { onMount } from 'svelte';
  import * as env from '$app/env/public';
  import { themePreference } from '$lib/stores/theme';
  import DeploymentNotice from '$lib/components/DeploymentNotice.svelte';
  // Self-hosted instances and browser tests can run without sending analytics.
  onMount(() => { if (window.location.pathname !== '/render-lab' && env.PUBLIC_ENABLE_ANALYTICS !== 'false') void import('$lib/firebase'); });
  let { children } = $props();
</script>

{@render children()}
<DeploymentNotice />
