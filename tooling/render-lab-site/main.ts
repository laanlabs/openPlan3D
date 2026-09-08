import { mount } from 'svelte';
import RenderLab from '../../src/routes/render-lab/+page.svelte';
mount(RenderLab, {
  target: document.getElementById('app')!,
  props: { startupModel: import.meta.env.VITE_RENDER_LAB_MODEL || '' }
});
