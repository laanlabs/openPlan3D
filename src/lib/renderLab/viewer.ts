import * as THREE from 'three';
import { validateLocalGLB } from './glb';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RectAreaLightUniformsLib } from 'three/addons/lights/RectAreaLightUniformsLib.js';
import { WebGLPathTracer, DenoiseMaterial } from 'three-gpu-pathtracer';
import { FullScreenQuad } from 'three/addons/postprocessing/Pass.js';

export type LabStatus = { samples: number; triangles: number; mode: string; error?: string };
export async function createViewer(host: HTMLElement, report: (status: LabStatus) => void) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
  renderer.toneMapping = THREE.AgXToneMapping;
  renderer.toneMappingExposure = 1;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  host.append(renderer.domElement);
  renderer.domElement.setAttribute('aria-label', 'Interactive floorplan render');
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#e8e5df');
  const camera = new THREE.PerspectiveCamera(35, 1, .05, 300);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.maxPolarAngle = Math.PI * .49;
  controls.minDistance = 1;
  controls.maxDistance = 45;
  const envData = new Float32Array(128 * 64 * 4);
  for (let y = 0; y < 64; y++) for (let x = 0; x < 128; x++) {
    const strength = .30 + .30 * Math.sin(Math.PI * y / 64);
    const i = (y * 128 + x) * 4;
    envData.set([strength, strength * .98, strength * .94, 1], i);
  }
  const environment = new THREE.DataTexture(envData, 128, 64, THREE.RGBAFormat, THREE.FloatType);
  environment.mapping = THREE.EquirectangularReflectionMapping; environment.needsUpdate = true;
  scene.environment = environment;
  RectAreaLightUniformsLib.init();
  const key = new THREE.RectAreaLight(0xfff5e6, 8, 7, 7);
  key.position.set(1, 9, 1); key.lookAt(0, 0, 0); scene.add(key);
  const fill = new THREE.RectAreaLight(0xe5edff, 3, 5, 5);
  fill.position.set(-6, 5, -4); fill.lookAt(0, 0, 0); scene.add(fill);
  const sun = new THREE.DirectionalLight(0xfff6e8, 2.0);
  sun.position.set(-3, 8, 5); sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -9, right: 9, top: 9, bottom: -9, near: .1, far: 30 });
  sun.shadow.normalBias = .02; scene.add(sun);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), new THREE.MeshStandardMaterial({ color: '#dcd9d3', roughness: .95 }));
  ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);
  const denoise = new DenoiseMaterial({ sigma: 2, kSigma: 1, threshold: .07 });
  const denoiseQuad = new FullScreenQuad(denoise);
  let tracer: WebGLPathTracer | undefined;
  let model: THREE.Group | undefined;
  let disposed = false, ready = false, paused = false, quality = true, dirty = true;
  let triangles = 0, frame = 0, lastReport = 0;
  const center = new THREE.Vector3();
  let span = 8;
  function notify(error?: string) { report({ samples: Math.floor(tracer?.samples ?? 0), triangles, mode: paused ? 'Paused' : quality && tracer ? 'Path tracing' : 'Interactive', error }); }
  function reset() { dirty = true; tracer?.updateCamera(); tracer?.reset(); }
  controls.addEventListener('change', reset);
  function resize() {
    const { width, height } = host.getBoundingClientRect();
    renderer.setSize(Math.max(1, width), Math.max(1, height));
    const nextAspect = Math.max(1, width) / Math.max(1, height);
    if (ready) camera.position.sub(controls.target).multiplyScalar(Math.min(camera.aspect, 1) / Math.min(nextAspect, 1)).add(controls.target);
    camera.aspect = nextAspect; camera.updateProjectionMatrix(); reset();
  }
  const observer = new ResizeObserver(resize); observer.observe(host); resize();
  function preset(view: string) {
    const direction = view === 'top' ? new THREE.Vector3(0, 1.7, .001) : view === 'reverse' ? new THREE.Vector3(-1, 1.25, -1) : new THREE.Vector3(1, 1.35, 1);
    camera.position.copy(center).addScaledVector(direction.normalize(), span * 2.05 / Math.min(camera.aspect, 1));
    controls.target.copy(center); controls.update(); reset();
  }
  function release(root: THREE.Object3D) {
    const textures = new Set<THREE.Texture>(); const materials = new Set<THREE.Material>();
    root.traverse(obj => {
      if (!(obj instanceof THREE.Mesh)) return;
      obj.geometry.dispose();
      for (const material of Array.isArray(obj.material) ? obj.material : [obj.material]) materials.add(material);
    });
    for (const material of materials) {
      for (const value of Object.values(material)) if (value instanceof THREE.Texture) textures.add(value);
      material.dispose();
    }
    for (const texture of textures) { if (typeof ImageBitmap !== 'undefined' && texture.source.data instanceof ImageBitmap) texture.source.data.close(); texture.dispose(); }
  }
  async function load(buffer: ArrayBuffer) {
    validateLocalGLB(buffer);
    const manager = new THREE.LoadingManager();
    // Embedded assets only. A model cannot request external textures or buffers.
    manager.setURLModifier(url => { if (/^(blob:|data:)/.test(url)) return url; throw new Error('Use a self-contained GLB with embedded textures.'); });
    const gltf = await new GLTFLoader(manager).parseAsync(buffer, '');
    if (disposed) { release(gltf.scene); return; }
    if (model) { scene.remove(model); release(model); }
    tracer?.dispose(); tracer = undefined; ready = false;
    model = gltf.scene; triangles = 0;
    model.traverse(obj => {
      if (!(obj instanceof THREE.Mesh)) return;
      obj.castShadow = true; obj.receiveShadow = true;
      triangles += (obj.geometry.index?.count ?? obj.geometry.attributes.position.count) / 3;
      for (const m of Array.isArray(obj.material) ? obj.material : [obj.material]) {
        if (m instanceof THREE.MeshStandardMaterial && m.map) m.map.anisotropy = renderer.capabilities.getMaxAnisotropy();
      }
    });
    const bounds = new THREE.Box3().setFromObject(model);
    if (bounds.isEmpty() || !Number.isFinite(bounds.max.length())) { release(model); model = undefined; throw new Error('The model has invalid or empty bounds.'); }
    bounds.getCenter(center); model.position.sub(center);
    const size = bounds.getSize(new THREE.Vector3()); span = Math.max(size.x, size.z, size.y, 1);
    ground.position.y = bounds.min.y - center.y - .025;
    center.set(0, 0, 0); scene.add(model); preset('isometric');
    scene.updateMatrixWorld(true);
    renderer.render(scene, camera); notify();
    // Show the scene before doing the BVH/shader preparation.
    await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
    if (disposed) return;
    try {
      tracer = new WebGLPathTracer(renderer);
      tracer.renderToCanvasCallback = (target, gl, quad) => {
        const autoClear = gl.autoClear; gl.autoClear = false;
        if ((tracer?.samples ?? 0) >= 4) { denoise.map = target.texture; denoiseQuad.render(gl); }
        else quad.render(gl);
        gl.autoClear = autoClear;
      };
      tracer.bounces = 6; tracer.filterGlossyFactor = .5;
      tracer.tiles.set(3, 3); tracer.renderDelay = 200; tracer.minSamples = 1;
      tracer.textureSize.set(1024, 1024); tracer.setScene(scene, camera);
    } catch (error) {
      tracer?.dispose(); tracer = undefined; quality = false;
      notify(`Path tracing unavailable: ${error instanceof Error ? error.message : String(error)}. Interactive preview is available.`);
    }
    ready = true; dirty = true; notify();
  }
  function animate(time: number) {
    if (disposed) return;
    frame = requestAnimationFrame(animate);
    if (document.hidden) return;
    controls.update();
    if (ready && quality && tracer && !paused && tracer.samples < 512) {
      try { tracer.renderSample(); } catch (error) { quality = false; notify(`Path tracing stopped: ${String(error)}`); }
    } else if (dirty) { renderer.render(scene, camera); }
    dirty = false;
    if (time - lastReport > 300) { lastReport = time; notify(); }
  }
  frame = requestAnimationFrame(animate);
  return {
    load,
    preset,
    setQuality(value: boolean) { quality = value; paused = false; tracer?.reset(); dirty = true; notify(); },
    setPaused(value: boolean) { paused = value; dirty = false; notify(); },
    setExposure(value: number) { renderer.toneMappingExposure = value; tracer?.reset(); dirty = true; },
    exportPNG() { const a = document.createElement('a'); a.href = renderer.domElement.toDataURL('image/png'); a.download = 'openplan3d-web-render.png'; a.click(); },
    dispose() { disposed = true; cancelAnimationFrame(frame); observer.disconnect(); controls.dispose(); tracer?.dispose(); denoiseQuad.dispose(); denoise.dispose(); release(scene); environment.dispose(); renderer.dispose(); renderer.domElement.remove(); }
  };
}
