<script lang="ts">
  import { t, locale, translate, type Locale } from '$lib/i18n';
  import { projectServiceMessage } from '$lib/i18n/projectServiceMessages';
  import { templateLabels } from '$lib/i18n/templateLabels';
  import { modalDialog } from '$lib/utils/modalDialog';
  import { onMount, onDestroy, tick } from 'svelte';
  import { goto } from '$app/navigation';
  import { base } from '$app/paths';
  import { localStore, storageErrorMessage, downloadLibraryBackup } from '$lib/services/datastore';
  import { openProject } from '$lib/services/projectOpening';
  import { createDefaultProject } from '$lib/stores/project';
  import WelcomeScreen from '$lib/components/WelcomeScreen.svelte';
  import LibraryRestoreDialog from '$lib/components/LibraryRestoreDialog.svelte';
  import ProjectPackageDialog from '$lib/components/ProjectPackageDialog.svelte';
  import ProjectActionsMenu from '$lib/components/ProjectActionsMenu.svelte';
  import { houseTemplates } from '$lib/utils/houseTemplates';

  const openingLifetime = new AbortController();
  onDestroy(() => openingLifetime.abort());

  let projects = $state<{ id: string; name: string; updatedAt: string }[]>([]);
  let thumbnails = $state<Record<string, string | null>>({});
  let showWelcome = $state(false);
  let restoreOpen = $state(false);
  let packageOpen = $state(false);
  let loading = $state(true);
  let actionDialog = $state<{ type: 'rename' | 'delete'; id: string; name: string } | null>(null);
  let renameValue = $state('');
  let actionError = $state<string | null>(null);
  let actionBusy = $state(false);
  let duplicating = $state(false);
  let newProjectButton = $state<HTMLButtonElement>();
  let showTemplateModal = $state(false);

  let libraryError = $state<string | null>(null);

  async function withLibraryError(action: () => Promise<void>) {
    try { await action(); libraryError = null; }
    catch (error) { libraryError = storageErrorMessage(error); }
  }

  async function backupLibrary() {
    try { await downloadLibraryBackup(); }
    catch (error) { libraryError = storageErrorMessage(error); }
  }

  async function refreshProjects() {
    loading = true;
    try {
      projects = await localStore.list();
      projects.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
      thumbnails = await localStore.getThumbnails();
    } finally { loading = false; }
  }

  function openRestore() { showWelcome = false; restoreOpen = true; }
  function openPackage() { showWelcome = false; packageOpen = true; }
  async function afterRestore() {
    await refreshProjects();
    libraryError = null;
  }

  onMount(() => {
    void withLibraryError(async () => {
      await refreshProjects();
      const seen = localStorage.getItem('hasSeenWelcome');
      if (!seen && projects.length === 0) {
        showWelcome = true;
      }
    });
  });

  async function createProject(create: () => unknown) {
    await withLibraryError(async () => {
      const project = await openProject(create, 'new', openingLifetime.signal);
      if (!project) return;
      showTemplateModal = false;
      goto(`${base}/editor?id=${encodeURIComponent(project.id)}`);
    });
  }

  function createFromTemplate(index: number) { return createProject(houseTemplates[index].create); }
  function newProject() { return createProject(() => createDefaultProject('Untitled Project')); }

  async function duplicateProject(id: string) {
    if (duplicating) return;
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    duplicating = true;
    await withLibraryError(async () => {
      const dup = await localStore.duplicate(id);
      if (!dup) throw new Error($t('library.gone'));
    });
    // Refresh errors must not turn a completed copy into a retryable mutation.
    if (!libraryError) await withLibraryError(refreshProjects);
    duplicating = false;
    await tick();
    if (document.activeElement === document.body && previous?.isConnected) previous.focus();
  }

  function openAction(type: 'rename' | 'delete', project: { id: string; name: string }) {
    actionDialog = { type, id: project.id, name: project.name || 'Untitled Project' };
    renameValue = project.name;
    actionError = null;
  }
  function closeAction() { if (!actionBusy) actionDialog = null; }
  async function submitAction() {
    const action = actionDialog, name = renameValue.trim();
    if (!action || actionBusy || (action.type === 'rename' && !name)) return;
    actionBusy = true; actionError = null;
    try {
      if (action.type === 'delete') await localStore.delete(action.id);
      else {
        const project = await localStore.load(action.id);
        if (!project) throw new Error($t('library.goneAction'));
        project.name = name;
        project.updatedAt = new Date();
        await localStore.save(project);
      }
    } catch (error) {
      actionError = storageErrorMessage(error);
      actionBusy = false;
      return;
    }
    actionBusy = false;
    actionDialog = null;
    // Close only after the transaction commits, then refresh separately so a
    // failed list read cannot repeat a successful rename or delete.
    await withLibraryError(refreshProjects);
    await tick();
    if (action.type === 'delete' && document.activeElement === document.body) newProjectButton?.focus();
  }

  function formatDate(d: string, language: Locale) {
    const date = new Date(d);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return translate(language, 'library.justNow');
    if (diffMin < 60) return translate(language, 'library.minutes', { count: diffMin });
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return translate(language, 'library.hours', { count: diffHr });
    const diffDay = Math.floor(diffHr / 24);
    if (diffDay < 7) return translate(language, 'library.days', { count: diffDay });
    return date.toLocaleDateString(language === 'pt' ? 'pt-BR' : 'en');
  }
</script>

{#if showWelcome}
  <WelcomeScreen onRestoreLibrary={openRestore} onImportPackage={openPackage} onDismiss={() => { showWelcome = false; void withLibraryError(refreshProjects); }} />
{/if}

{#if restoreOpen}<LibraryRestoreDialog onclose={() => restoreOpen = false} onrestored={afterRestore} />{/if}
{#if packageOpen}<ProjectPackageDialog onclose={() => packageOpen = false} onimported={afterRestore} />{/if}

<div class="min-h-screen bg-gray-50">
  <!-- Header -->
  <div class="bg-gradient-to-r from-slate-800 to-slate-700 shadow-sm">
    <div class="max-w-5xl mx-auto px-6 py-5 flex flex-wrap gap-4 items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold text-white">{$t('library.title')}</h1>
        <p class="text-sm text-white/50 mt-0.5">{loading ? $t('library.loading') : $t(projects.length === 1 ? 'library.countOne' : 'library.countMany', { count: projects.length })}</p>
      </div>
      <div class="flex flex-wrap items-center gap-3">
        <button
          onclick={() => showTemplateModal = true}
          class="px-4 py-2.5 bg-white/10 text-white rounded-lg hover:bg-white/20 font-medium text-sm transition-all flex items-center gap-2 border border-white/20"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>
          {$t('library.templates')}
        </button>
        <button
          bind:this={newProjectButton}
          onclick={newProject}
          class="px-5 py-2.5 bg-blue-500 text-white rounded-lg hover:bg-blue-600 font-semibold text-sm shadow-lg shadow-blue-500/25 transition-all hover:shadow-blue-500/40 flex items-center gap-2"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          {$t('library.new')}
        </button>
      </div>
    </div>
  </div>

  <div class="max-w-5xl mx-auto px-6 py-8">
    {#if duplicating}<p role="status" class="mb-4 text-sm text-gray-500">{$t('library.duplicating')}</p>{/if}
    <div class="mb-5 flex flex-wrap items-center justify-between gap-3 text-sm text-gray-500">
      <p>{$t('library.local')}</p>
      <div class="flex flex-wrap gap-4">
        {#if !libraryError}<button class="font-semibold text-blue-600 underline" onclick={backupLibrary}>{$t('library.backup')}</button>{/if}
        <button class="font-semibold text-blue-600 underline" onclick={openRestore}>{$t('library.restore')}</button>
        <button class="font-semibold text-blue-600 underline" onclick={openPackage}>{$t('library.package')}</button>
      </div>
    </div>
    {#if libraryError}
      <div role="alert" class="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-900">
        <p>{projectServiceMessage(libraryError, $locale)}</p>
        <div class="mt-3 flex gap-4">
          <button class="font-semibold underline" onclick={() => withLibraryError(refreshProjects)}>{$t('library.retry')}</button>
          <button class="font-semibold underline" onclick={backupLibrary}>{$t('library.backup')}</button>
        </div>
      </div>
    {/if}
    {#if loading && projects.length === 0}
      <p role="status" class="py-12 text-center text-gray-500">{$t('library.loadingSaved')}</p>
    {:else if projects.length === 0 && !libraryError}
      <div class="text-center py-24">
        <div class="w-16 h-16 bg-gray-200 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="text-gray-400"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/></svg>
        </div>
        <p class="text-lg text-gray-400 font-medium">{$t('library.empty')}</p>
        <p class="text-sm text-gray-300 mt-1">{$t('library.emptyHelp')}</p>
        <div class="mt-6 flex items-center gap-3 justify-center">
          <button onclick={newProject} class="px-5 py-2.5 bg-blue-500 text-white rounded-lg hover:bg-blue-600 font-semibold text-sm">
            {$t('library.create')}
          </button>
          <button onclick={() => showTemplateModal = true} class="px-5 py-2.5 bg-white text-gray-700 rounded-lg hover:bg-gray-100 font-semibold text-sm border border-gray-200">
            {$t('library.fromTemplate')}
          </button>
        </div>
      </div>
    {:else}
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {#each projects as project (project.id)}
          <div class="group bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-lg hover:border-gray-300 transition-all duration-200 relative">
            <!-- Thumbnail -->
            <a href={`${base}/editor?id=${encodeURIComponent(project.id)}`} aria-label={$t('library.openName', { name: project.name || $t('library.untitled') })} class="block">
              <div class="aspect-[4/3] bg-gray-100 relative overflow-hidden">
                {#if thumbnails[project.id]}
                  <img src={thumbnails[project.id]} alt="" class="w-full h-full object-contain" />
                {:else}
                  <div class="w-full h-full flex items-center justify-center">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" class="text-gray-300"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/></svg>
                  </div>
                {/if}
              </div>
            </a>

            <!-- Info -->
            <div class="p-4">
              <a href={`${base}/editor?id=${encodeURIComponent(project.id)}`} class="block">
                <h3 class="font-semibold text-gray-800 text-sm truncate">{project.name || $t('library.untitled')}</h3>
              </a>
              <p class="text-xs text-gray-400 mt-1">{formatDate(project.updatedAt, $locale)}</p>
            </div>

            <ProjectActionsMenu name={project.name} disabled={duplicating}
              onaction={(action) => {
                if (action === 'open') goto(`${base}/editor?id=${encodeURIComponent(project.id)}`);
                else if (action === 'duplicate') void duplicateProject(project.id);
                else openAction(action, project);
              }} />
          </div>
        {/each}
      </div>
    {/if}
  </div>

  {#if actionDialog}
    <dialog use:modalDialog aria-labelledby="library-action-title" aria-describedby="library-action-description"
      oncancel={(event) => { event.preventDefault(); closeAction(); }}
      class="m-auto w-[28rem] max-w-[calc(100vw-2rem)] max-h-[85vh] overflow-y-auto rounded-2xl bg-white p-5 text-gray-800 shadow-2xl backdrop:bg-black/50">
      <form onsubmit={(event) => { event.preventDefault(); void submitAction(); }}>
        <h2 id="library-action-title" class="text-lg font-semibold">{actionDialog.type === 'rename' ? $t('library.renameTitle') : $t('library.deleteTitle')}</h2>
        <p id="library-action-description" class="mt-2 break-words text-sm text-gray-500">
          {#if actionDialog.type === 'rename'}{$t('library.renameHelp', { name: actionDialog.name })}
          {:else}{$t('library.deleteHelp', { name: actionDialog.name })}{/if}
        </p>
        {#if actionDialog.type === 'rename'}
          <label for="library-project-name" class="mt-4 block text-sm font-medium">{$t('library.name')}</label>
          <input id="library-project-name" type="text" bind:value={renameValue} disabled={actionBusy} required
            class="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-blue-500" />
        {/if}
        {#if actionError}<p role="alert" class="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-900">{projectServiceMessage(actionError, $locale)}</p>{/if}
        {#if actionBusy}<p role="status" class="mt-4 text-sm text-gray-500">{actionDialog.type === 'rename' ? $t('library.saving') : $t('library.deleting')}</p>{/if}
        <div class="mt-5 flex justify-end gap-3">
          <button type="button" onclick={closeAction} disabled={actionBusy} class="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold disabled:opacity-40">{$t('library.cancel')}</button>
          <button type="submit" disabled={actionBusy || (actionDialog.type === 'rename' && !renameValue.trim())}
            class="rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-40 {actionDialog.type === 'rename' ? 'bg-blue-600' : 'bg-red-600'}">
            {actionDialog.type === 'rename' ? $t('library.saveName') : $t('library.deleteTitle')}
          </button>
        </div>
      </form>
    </dialog>
  {/if}

  <!-- Template Modal -->
  {#if showTemplateModal}
    <dialog use:modalDialog class="modal-overlay fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" aria-label={$t('welcome.templatesTitle')} onclick={(e) => { if (e.target === e.currentTarget) showTemplateModal = false; }} oncancel={(e) => { e.preventDefault(); showTemplateModal = false; }}>
      <div class="bg-white rounded-2xl shadow-2xl p-8 max-w-xl w-full mx-4 max-h-[85vh] overflow-auto">
        <div class="flex items-center justify-between mb-2">
          <h2 class="text-2xl font-bold text-gray-800">{$t('welcome.templatesTitle')}</h2>
          <button aria-label={$t('library.closeTemplates')} onclick={() => showTemplateModal = false} class="text-gray-400 hover:text-gray-600 text-xl">✕</button>
        </div>
        <p class="text-sm text-gray-400 mb-6">{$t('welcome.templatesSubtitle')}</p>
        <div class="space-y-3">
          {#each houseTemplates as template, i}
            <button
              onclick={() => createFromTemplate(i)}
              class="w-full flex items-center gap-4 p-4 rounded-xl border-2 border-gray-200 hover:border-blue-400 hover:bg-blue-50 transition-all text-left"
            >
              <span class="text-3xl">{template.icon}</span>
              <div class="flex-1 min-w-0">
                <div class="font-semibold text-gray-800">{templateLabels[template.name] ? $t(templateLabels[template.name].name) : template.name}</div>
                <div class="text-xs text-gray-400">{templateLabels[template.name] ? $t(templateLabels[template.name].description) : template.description}</div>
              </div>
              <span class="text-xs font-medium text-blue-500 bg-blue-50 px-2 py-1 rounded-lg shrink-0">{template.area}</span>
            </button>
          {/each}
        </div>
      </div>
    </dialog>
  {/if}
</div>
