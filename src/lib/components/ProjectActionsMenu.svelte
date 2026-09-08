<script lang="ts">
  import { tick } from 'svelte';

  let { name, disabled = false, onaction }: {
    name: string;
    disabled?: boolean;
    onaction: (action: 'open' | 'rename' | 'duplicate' | 'delete') => void;
  } = $props();
  const id = $props.id();
  let open = $state(false);
  let trigger = $state<HTMLButtonElement>();
  let menu = $state<HTMLDivElement>();
  const actions = ['open', 'rename', 'duplicate', 'delete'] as const;

  function close(restore = false) {
    open = false;
    if (restore) trigger?.focus({ preventScroll: true });
  }
  async function show(last = false) {
    if (disabled) return;
    open = true;
    await tick();
    const items = menu?.querySelectorAll<HTMLButtonElement>('[role="menuitem"]');
    items?.[last ? items.length - 1 : 0]?.focus();
  }
  function outside(event: Event) {
    const target = event.target as Node;
    if (open && !menu?.contains(target) && !trigger?.contains(target)) close();
  }
  function keydown(event: KeyboardEvent) {
    const items = [...(menu?.querySelectorAll<HTMLButtonElement>('[role="menuitem"]') ?? [])];
    const index = items.indexOf(document.activeElement as HTMLButtonElement);
    if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); close(true); }
    else if (event.key === 'Tab') {
      // Continue the page's normal tab order from the menu button.
      close(true);
    } else {
      let next: number | undefined;
      if (event.key === 'ArrowDown') next = (index + 1) % items.length;
      else if (event.key === 'ArrowUp') next = (index - 1 + items.length) % items.length;
      else if (event.key === 'Home') next = 0;
      else if (event.key === 'End') next = items.length - 1;
      else if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
        // Repeated letters cycle matching actions (Duplicate / Delete).
        for (let offset = 1; offset <= items.length; offset++) {
          const candidate = (index + offset) % items.length;
          if (items[candidate].textContent?.trim().toLowerCase().startsWith(event.key.toLowerCase())) { next = candidate; break; }
        }
      }
      if (next !== undefined) { event.preventDefault(); items[next]?.focus(); }
    }
  }
</script>

<svelte:window onpointerdown={outside} onfocusin={outside} />
<button bind:this={trigger} type="button" {disabled}
  onclick={() => open ? close(true) : show()}
  onkeydown={(event) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault(); void show(event.key === 'ArrowUp');
    }
  }}
  aria-label={`Project actions for ${name || 'Untitled Project'}`}
  aria-haspopup="menu" aria-expanded={open} aria-controls={open ? id : undefined}
  class="absolute top-3 right-3 w-8 h-8 bg-white/90 backdrop-blur rounded-lg shadow-sm border border-gray-200 flex items-center justify-center md:opacity-0 md:group-hover:opacity-100 focus-visible:opacity-100 transition-opacity hover:bg-gray-50 disabled:opacity-40">
  <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="currentColor" class="text-gray-500"><circle cx="12" cy="5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="19" r="2"/></svg>
</button>
{#if open}
  <div bind:this={menu} {id} role="menu" tabindex="-1" aria-label={`Project actions for ${name || 'Untitled Project'}`}
    onkeydown={keydown} class="absolute top-12 right-3 bg-white rounded-lg shadow-xl border border-gray-200 py-1 w-40 z-50">
    {#each actions as action}
      <button type="button" role="menuitem" tabindex="-1"
        onclick={() => { close(true); onaction(action); }}
        class="w-full px-3 py-2 text-sm text-left focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-blue-500 {action === 'delete' ? 'text-red-500 hover:bg-red-50 focus:bg-red-50' : 'text-gray-700 hover:bg-gray-50 focus:bg-gray-50'}">
        {action[0].toUpperCase() + action.slice(1)}
      </button>
    {/each}
  </div>
{/if}
