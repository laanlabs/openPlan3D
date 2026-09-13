<script lang="ts">
  import * as THREE from 'three';
  import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
  import type { PreparedCustomModel } from '$lib/services/customModelImport';
  import { t } from '$lib/i18n';
  let { model }: { model: PreparedCustomModel } = $props();
  let host = $state<HTMLDivElement>();
  let failed = $state(false);
  let reset = () => {};
  let canvas = $state.raw<HTMLCanvasElement>();
  type Action = 'left' | 'right' | 'up' | 'down' | 'in' | 'out';
  let adjust = (_action: Action) => {};
  const actions = [
    ['left', 'customModel.rotateLeft'], ['right', 'customModel.rotateRight'],
    ['up', 'customModel.rotateUp'], ['down', 'customModel.rotateDown'],
    ['in', 'customModel.zoomIn'], ['out', 'customModel.zoomOut'],
  ] as const;
  $effect(() => { if (canvas) canvas.setAttribute('aria-label', $t('customModel.previewLabel')); });
  $effect(() => {
    if (!host) return;
    const element = host, source = model;
    let renderer: THREE.WebGLRenderer;
    try { renderer = new THREE.WebGLRenderer({ antialias: true }); }
    catch { failed = true; return; }
    failed = false;
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
    element.append(renderer.domElement);
    canvas = renderer.domElement;
    renderer.domElement.setAttribute('role', 'img');
    const scene = new THREE.Scene(); scene.background = new THREE.Color('#e6e8eb');
    scene.add(source.scene, new THREE.AmbientLight(0xffffff, 2));
    const light = new THREE.DirectionalLight(0xffffff, 3); scene.add(light);
    const center = source.bounds.getCenter(new THREE.Vector3());
    const size = source.bounds.getSize(new THREE.Vector3()).length();
    const camera = new THREE.PerspectiveCamera(40, 1, Math.max(size / 1000, 0.000001), size * 100);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.copy(center); controls.enablePan = false;
    controls.minDistance = size / 10; controls.maxDistance = size * 10;
    function render() { light.position.copy(camera.position); renderer.render(scene, camera); }
    reset = () => {
      camera.position.copy(center).add(new THREE.Vector3(1, 0.7, 1).normalize().multiplyScalar(size * 1.8));
      controls.target.copy(center); controls.update(); render();
    };
    adjust = (action: Action) => {
      const offset = new THREE.Spherical().setFromVector3(camera.position.clone().sub(controls.target));
      const step = Math.PI / 12;
      if (action === 'left') offset.theta -= step;
      if (action === 'right') offset.theta += step;
      if (action === 'up') offset.phi -= step;
      if (action === 'down') offset.phi += step;
      if (action === 'in') offset.radius /= 1.2;
      if (action === 'out') offset.radius *= 1.2;
      offset.phi = THREE.MathUtils.clamp(offset.phi, 0.01, Math.PI - 0.01);
      offset.radius = THREE.MathUtils.clamp(offset.radius, controls.minDistance, controls.maxDistance);
      camera.position.copy(controls.target).add(new THREE.Vector3().setFromSpherical(offset));
      controls.update(); render();
    };
    const resize = () => {
      const width = Math.max(1, element.clientWidth), height = Math.max(1, element.clientHeight);
      renderer.setSize(width, height); camera.aspect = width / height; camera.updateProjectionMatrix(); render();
    };
    controls.addEventListener('change', render);
    const observer = new ResizeObserver(resize); observer.observe(element);
    resize(); reset();
    return () => {
      observer.disconnect(); controls.dispose(); scene.remove(source.scene);
      renderer.dispose(); renderer.domElement.remove(); canvas = undefined; reset = () => {}; adjust = () => {};
    };
  });
</script>
<div bind:this={host} class="h-64 w-full overflow-hidden rounded-lg bg-gray-100"></div>
{#if failed}<p class="text-sm text-amber-700">{$t('customModel.previewUnavailable')}</p>{/if}
{#if canvas && !failed}
  <div class="grid grid-cols-2 gap-2 sm:grid-cols-3">
    {#each actions as [action, label]}
      <button type="button" class="min-h-11 rounded border px-2 py-1 text-sm text-blue-700 hover:bg-blue-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600" onclick={() => adjust(action)}>{$t(label)}</button>
    {/each}
  </div>
  <button type="button" class="min-h-11 text-sm text-blue-700 underline" onclick={() => reset()}>{$t('customModel.reset')}</button>
{/if}
