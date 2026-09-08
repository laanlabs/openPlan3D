<script lang="ts">
  import { modalDialog } from '$lib/utils/modalDialog';
  import { projectSettings } from '$lib/stores/settings';
  import type { ProjectSettings } from '$lib/stores/settings';
  import { currentProject, updateProjectName } from '$lib/stores/project';
  import type { Project } from '$lib/models/types';
  import { themePreference, type ThemePreference } from '$lib/stores/theme';
  import OpenAISettings from '$lib/components/ai/OpenAISettings.svelte';
  import FloorElevations from './FloorElevations.svelte';

  let { open = $bindable(false) }: { open: boolean } = $props();
  let projectName = $state('');
  let projectDescription = $state('');

  currentProject.subscribe((p) => {
    if (p) {
      projectName = p.name;
      projectDescription = p.description ?? '';
    }
  });

  function onNameChange(e: Event) {
    projectName = (e.target as HTMLInputElement).value;
    updateProjectName(projectName);
  }

  function onDescriptionChange(e: Event) {
    projectDescription = (e.target as HTMLTextAreaElement).value;
    currentProject.update((p) => {
      if (p) return { ...p, description: projectDescription };
      return p;
    });
  }
  let activeTab = $state<'project' | 'dimensions' | 'appearance' | 'ai'>('project');
  let geminiKey = $state('');
  let geminiKeyVisible = $state(false);
  let geminiKeySaved = $state(false);

  // Load API keys from localStorage
  if (typeof window !== 'undefined') {
    geminiKey = localStorage.getItem('o3d_gemini_key') ?? '';
  }

  function saveGeminiKey() {
    if (typeof window !== 'undefined') {
      if (geminiKey.trim()) {
        localStorage.setItem('o3d_gemini_key', geminiKey.trim());
      } else {
        localStorage.removeItem('o3d_gemini_key');
      }
      geminiKeySaved = true;
      setTimeout(() => { geminiKeySaved = false; }, 2000);
    }
  }

  function clearGeminiKey() {
    geminiKey = '';
    if (typeof window !== 'undefined') {
      localStorage.removeItem('o3d_gemini_key');
    }
    geminiKeySaved = true;
    setTimeout(() => { geminiKeySaved = false; }, 2000);
  }

  let currentTheme = $state<ThemePreference>('system');
  themePreference.subscribe((t) => { currentTheme = t; });
  let settings = $state<ProjectSettings>({
    units: 'metric',
    showDimensions: true,
    showExternalDimensions: true,
    showInternalDimensions: false,
    showExtensionLines: true,
    showObjectDistance: true,
    dimensionLineColor: '#1e293b',
    wallMeasureMode: 'centerline',
    snapToGrid: true,
    snapToWalls: true,
    gridSize: 25,
  });

  projectSettings.subscribe((s) => { settings = { ...s }; });

  function updateSetting<K extends keyof ProjectSettings>(key: K, value: ProjectSettings[K]) {
    settings[key] = value;
    projectSettings.set({ ...settings });
  }

  function close() {
    open = false;
  }
</script>

{#if open}
  <dialog use:modalDialog class="modal-overlay fixed inset-0 bg-black/50 z-50 flex items-center justify-center" onclick={(e) => { if (e.target === e.currentTarget) close(); }} oncancel={(e) => { e.preventDefault(); close(); }} aria-label="Settings">
    <div class="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-[420px] max-w-[calc(100vw-1rem)] max-h-[80vh] flex flex-col">
      <!-- Header -->
      <div class="flex items-center justify-between px-5 pt-4 pb-2">
        <h2 class="text-lg font-bold text-gray-800 dark:text-gray-100">Settings</h2>
        <button class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-xl leading-none" onclick={close} aria-label="Close settings">✕</button>
      </div>

      <!-- Tabs -->
      <div class="flex shrink-0 overflow-x-auto border-b border-gray-200 dark:border-gray-700 px-5">
        <button
          class="px-4 py-2 text-sm font-medium transition-colors relative {activeTab === 'project' ? 'text-slate-800 dark:text-slate-200' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'}"
          onclick={() => activeTab = 'project'}
        >
          Project
          {#if activeTab === 'project'}<div class="absolute bottom-0 left-0 right-0 h-0.5 bg-slate-700 dark:bg-slate-300 rounded-t"></div>{/if}
        </button>
        <button
          class="px-4 py-2 text-sm font-medium transition-colors relative {activeTab === 'dimensions' ? 'text-slate-800 dark:text-slate-200' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'}"
          onclick={() => activeTab = 'dimensions'}
        >
          Dimensions
          {#if activeTab === 'dimensions'}<div class="absolute bottom-0 left-0 right-0 h-0.5 bg-slate-700 dark:bg-slate-300 rounded-t"></div>{/if}
        </button>
        <button
          class="px-4 py-2 text-sm font-medium transition-colors relative {activeTab === 'appearance' ? 'text-slate-800 dark:text-slate-200' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'}"
          onclick={() => activeTab = 'appearance'}
        >
          Appearance
          {#if activeTab === 'appearance'}<div class="absolute bottom-0 left-0 right-0 h-0.5 bg-slate-700 dark:bg-slate-300 rounded-t"></div>{/if}
        </button>
        <button
          class="px-4 py-2 text-sm font-medium transition-colors relative {activeTab === 'ai' ? 'text-slate-800 dark:text-slate-200' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'}"
          onclick={() => activeTab = 'ai'}
        >
          AI
          {#if activeTab === 'ai'}<div class="absolute bottom-0 left-0 right-0 h-0.5 bg-slate-700 dark:bg-slate-300 rounded-t"></div>{/if}
        </button>
      </div>

      <!-- Content -->
      <div class="p-5 overflow-y-auto">
        {#if activeTab === 'project'}
          <div class="space-y-4">
            <label class="block">
              <span class="text-sm font-medium text-gray-700 dark:text-gray-300">Project Name</span>
              <input
                type="text"
                value={projectName}
                oninput={onNameChange}
                class="mt-1 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-slate-500 focus:border-slate-500 outline-none bg-white dark:bg-gray-700 dark:text-gray-100"
                placeholder="Untitled Project"
              />
            </label>
            <label class="block">
              <span class="text-sm font-medium text-gray-700 dark:text-gray-300">Description</span>
              <textarea
                value={projectDescription}
                oninput={onDescriptionChange}
                rows="3"
                class="mt-1 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-slate-500 focus:border-slate-500 outline-none resize-none bg-white dark:bg-gray-700 dark:text-gray-100"
                placeholder="Add a description for this project..."
              ></textarea>
            </label>
            <FloorElevations />
          </div>

        {:else if activeTab === 'dimensions'}
          <!-- Snapping controls -->
          <div class="bg-gray-50 dark:bg-gray-700/50 rounded-xl divide-y divide-gray-200 dark:divide-gray-600 mb-5">
            <label class="flex items-center justify-between px-4 py-3.5 cursor-pointer">
              <span class="text-sm text-gray-700 dark:text-gray-300" title="Furniture automatically aligns its back edge with nearby walls">Wall snapping</span>
              <input
                type="checkbox"
                checked={settings.snapToWalls}
                onchange={(e) => updateSetting('snapToWalls', (e.target as HTMLInputElement).checked)}
                class="w-10 h-5 rounded-full appearance-none cursor-pointer bg-gray-300 checked:bg-slate-700 relative transition-colors
                  before:content-[''] before:absolute before:w-4 before:h-4 before:rounded-full before:bg-white before:top-0.5 before:left-0.5 before:transition-transform checked:before:translate-x-5"
              />
            </label>
          </div>

          <!-- Metrics Unit Toggle -->
          <div class="flex items-center justify-between mb-5">
            <span class="text-sm font-medium text-gray-700 dark:text-gray-300">Metrics unit</span>
            <div class="flex rounded-lg border border-gray-300 dark:border-gray-600 overflow-hidden">
              <button
                class="px-3 py-1.5 text-sm font-medium transition-colors {settings.units === 'metric' ? 'bg-slate-700 text-white' : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600'}"
                onclick={() => updateSetting('units', 'metric')}
              >m, cm</button>
              <button
                class="px-3 py-1.5 text-sm font-medium transition-colors {settings.units === 'imperial' ? 'bg-slate-700 text-white' : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600'}"
                onclick={() => updateSetting('units', 'imperial')}
              >ft, inch</button>
            </div>
          </div>

          <!-- Wall measurement mode (centerline vs edge-to-edge clear span) -->
          <div class="flex items-center justify-between mb-5">
            <span class="text-sm font-medium text-gray-700 dark:text-gray-300" title="Edge to edge shows the clear span between adjoining wall faces">Measure walls</span>
            <div class="flex rounded-lg border border-gray-300 dark:border-gray-600 overflow-hidden">
              <button
                class="px-3 py-1.5 text-sm font-medium transition-colors {settings.wallMeasureMode !== 'edge' ? 'bg-slate-700 text-white' : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600'}"
                onclick={() => updateSetting('wallMeasureMode', 'centerline')}
              >Centerline</button>
              <button
                class="px-3 py-1.5 text-sm font-medium transition-colors {settings.wallMeasureMode === 'edge' ? 'bg-slate-700 text-white' : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600'}"
                onclick={() => updateSetting('wallMeasureMode', 'edge')}
              >Edge to edge</button>
            </div>
          </div>

          <!-- Toggle options -->
          <div class="bg-gray-50 dark:bg-gray-700/50 rounded-xl divide-y divide-gray-200 dark:divide-gray-600">
            <label class="flex items-center justify-between px-4 py-3.5 cursor-pointer">
              <span class="text-sm text-gray-700">Dimensions</span>
              <input
                type="checkbox"
                checked={settings.showDimensions}
                onchange={(e) => updateSetting('showDimensions', (e.target as HTMLInputElement).checked)}
                class="w-10 h-5 rounded-full appearance-none cursor-pointer bg-gray-300 checked:bg-slate-700 relative transition-colors
                  before:content-[''] before:absolute before:w-4 before:h-4 before:rounded-full before:bg-white before:top-0.5 before:left-0.5 before:transition-transform checked:before:translate-x-5"
              />
            </label>
            <label class="flex items-center justify-between px-4 py-3.5 cursor-pointer">
              <span class="text-sm text-gray-700">External Dimensions</span>
              <input
                type="checkbox"
                checked={settings.showExternalDimensions}
                onchange={(e) => updateSetting('showExternalDimensions', (e.target as HTMLInputElement).checked)}
                class="w-10 h-5 rounded-full appearance-none cursor-pointer bg-gray-300 checked:bg-slate-700 relative transition-colors
                  before:content-[''] before:absolute before:w-4 before:h-4 before:rounded-full before:bg-white before:top-0.5 before:left-0.5 before:transition-transform checked:before:translate-x-5"
              />
            </label>
            <label class="flex items-center justify-between px-4 py-3.5 cursor-pointer">
              <span class="text-sm text-gray-700">Internal Dimensions</span>
              <input
                type="checkbox"
                checked={settings.showInternalDimensions}
                onchange={(e) => updateSetting('showInternalDimensions', (e.target as HTMLInputElement).checked)}
                class="w-10 h-5 rounded-full appearance-none cursor-pointer bg-gray-300 checked:bg-slate-700 relative transition-colors
                  before:content-[''] before:absolute before:w-4 before:h-4 before:rounded-full before:bg-white before:top-0.5 before:left-0.5 before:transition-transform checked:before:translate-x-5"
              />
            </label>
            <label class="flex items-center justify-between px-4 py-3.5 cursor-pointer">
              <span class="text-sm text-gray-700">Extension Lines</span>
              <input
                type="checkbox"
                checked={settings.showExtensionLines}
                onchange={(e) => updateSetting('showExtensionLines', (e.target as HTMLInputElement).checked)}
                class="w-10 h-5 rounded-full appearance-none cursor-pointer bg-gray-300 checked:bg-slate-700 relative transition-colors
                  before:content-[''] before:absolute before:w-4 before:h-4 before:rounded-full before:bg-white before:top-0.5 before:left-0.5 before:transition-transform checked:before:translate-x-5"
              />
            </label>
            <label class="flex items-center justify-between px-4 py-3.5 cursor-pointer">
              <span class="text-sm text-gray-700">Object Distance</span>
              <input
                type="checkbox"
                checked={settings.showObjectDistance}
                onchange={(e) => updateSetting('showObjectDistance', (e.target as HTMLInputElement).checked)}
                class="w-10 h-5 rounded-full appearance-none cursor-pointer bg-gray-300 checked:bg-slate-700 relative transition-colors
                  before:content-[''] before:absolute before:w-4 before:h-4 before:rounded-full before:bg-white before:top-0.5 before:left-0.5 before:transition-transform checked:before:translate-x-5"
              />
            </label>
            <div class="flex items-center justify-between px-4 py-3.5">
              <span class="text-sm text-gray-700">Line Color</span>
              <div class="flex items-center gap-2">
                <button
                  class="w-8 h-8 rounded border-2 transition-colors {settings.dimensionLineColor === '#ffffff' ? 'border-slate-600' : 'border-gray-200'}"
                  style="background-color: #ffffff"
                  onclick={() => updateSetting('dimensionLineColor', '#ffffff')}
                  aria-label="White line color"
                ></button>
                <span class="text-gray-300">|</span>
                <button
                  class="w-8 h-8 rounded border-2 transition-colors {settings.dimensionLineColor === '#1e293b' ? 'border-slate-600' : 'border-gray-200'}"
                  style="background-color: #1e293b"
                  onclick={() => updateSetting('dimensionLineColor', '#1e293b')}
                  aria-label="Dark line color"
                ></button>
              </div>
            </div>
          </div>
        {:else if activeTab === 'appearance'}
          <div class="space-y-4">
            <div>
              <span class="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-3">Theme</span>
              <div class="flex gap-3">
                {#each [['light', '☀️', 'Light'], ['dark', '🌙', 'Dark'], ['system', '💻', 'System']] as [value, icon, label]}
                  <button
                    class="flex-1 flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all {currentTheme === value ? 'border-slate-600 bg-slate-50 dark:border-slate-400 dark:bg-slate-700' : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'}"
                    onclick={() => themePreference.set(value as ThemePreference)}
                  >
                    <span class="text-2xl">{icon}</span>
                    <span class="text-xs font-medium text-gray-700 dark:text-gray-300">{label}</span>
                  </button>
                {/each}
              </div>
            </div>
          </div>
        {:else if activeTab === 'ai'}
          <div class="space-y-4">
            <div>
              <span class="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1">Gemini API Key</span>
              <p class="text-xs text-gray-500 dark:text-gray-400 mb-3">Required for AI-powered photorealistic rendering. Your key is stored locally in your browser only - never sent to our servers.</p>
              <div class="flex gap-2">
                <div class="relative flex-1">
                  <input
                    type={geminiKeyVisible ? 'text' : 'password'}
                    value={geminiKey}
                    oninput={(e) => { geminiKey = (e.target as HTMLInputElement).value; }}
                    class="w-full px-3 py-2 pr-10 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-mono focus:ring-2 focus:ring-slate-500 focus:border-slate-500 outline-none bg-white dark:bg-gray-700 dark:text-gray-100"
                    placeholder="AIza..."
                  />
                  <button
                    class="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-sm"
                    onclick={() => geminiKeyVisible = !geminiKeyVisible}
                    aria-label={geminiKeyVisible ? 'Hide key' : 'Show key'}
                  >
                    {geminiKeyVisible ? '🙈' : '👁️'}
                  </button>
                </div>
              </div>
              <div class="flex gap-2 mt-3">
                <button
                  class="px-4 py-2 text-sm font-medium bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors"
                  onclick={saveGeminiKey}
                >
                  {geminiKeySaved ? '✓ Saved' : 'Save Key'}
                </button>
                {#if geminiKey}
                  <button
                    class="px-4 py-2 text-sm font-medium text-red-600 dark:text-red-400 border border-red-300 dark:border-red-600 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                    onclick={clearGeminiKey}
                  >
                    Remove
                  </button>
                {/if}
              </div>
            </div>
            <div class="border-t border-gray-200 dark:border-gray-700 pt-4">
              <span class="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-2">How to get a Gemini key</span>
              <ol class="text-xs text-gray-500 dark:text-gray-400 space-y-1 list-decimal list-inside">
                <li>Go to <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener" class="text-blue-500 hover:underline">Google AI Studio</a></li>
                <li>Click "Create API Key"</li>
                <li>Copy and paste it above</li>
              </ol>
            </div>

            <OpenAISettings />
          </div>
        {/if}
      </div>
    </div>
  </dialog>
{/if}
