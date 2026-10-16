import { expect, it, vi } from 'vitest';
import * as THREE from 'three';
// The per-renderer cache WebGLRenderer keeps for equirectangular backgrounds; it needs no WebGL.
import { WebGLCubeMaps } from 'three/src/renderers/webgl/WebGLCubeMaps.js';
import { ownColorCanvasTexture, refreshBackgroundTexture } from '$lib/utils/viewerTextures';
import { disposeModel } from '$lib/utils/furnitureModelResources';

// Any canvas image source will do; three.js reads it only when uploading.
const canvas = () => ({ width: 256, height: 64 }) as unknown as HTMLCanvasElement;

it('tags colour canvases sRGB, unlike three.js\'s default for canvas textures', () => {
  const source = canvas(), texture = ownColorCanvasTexture(source);
  expect(new THREE.CanvasTexture(source).colorSpace).toBe(THREE.NoColorSpace);
  expect(texture.colorSpace).toBe(THREE.SRGBColorSpace);
  expect(THREE.ColorManagement.getTransfer(texture.colorSpace)).toBe(THREE.SRGBTransfer);
  expect(texture.image).toBe(source);
  expect(texture.version).toBeGreaterThan(0); // uploaded on first use
});

it('decodes a canvas pixel to the same linear colour THREE.Color gives its hex', () => {
  // How the renderer reads the hardwood floor's #c4a882 from a tagged and an untagged canvas.
  const texel = (colorSpace: string) => new THREE.Color().setRGB(0xc4 / 255, 0xa8 / 255, 0x82 / 255, colorSpace as THREE.ColorSpace);
  const swatch = new THREE.Color('#c4a882'), tagged = texel(ownColorCanvasTexture(canvas()).colorSpace);
  for (const channel of ['r', 'g', 'b'] as const) expect(tagged[channel]).toBeCloseTo(swatch[channel], 10);
  const untagged = texel(new THREE.CanvasTexture(canvas()).colorSpace);
  expect(untagged.r).toBeGreaterThan(swatch.r * 1.3); // lit as if already linear: washed out
});

it('stays owned by the scene, so disposal releases the texture but keeps the canvas', () => {
  const source = canvas(), texture = ownColorCanvasTexture(source);
  const disposed = vi.spyOn(texture, 'dispose');
  const scene = new THREE.Group();
  scene.add(new THREE.Sprite(new THREE.SpriteMaterial({ map: texture })));
  disposeModel(scene); disposeModel(scene);
  expect(disposed).toHaveBeenCalledTimes(1);
  expect(texture.image).toBe(source);
});

/** A renderer's background cube cache. Building a cube renders its six faces from the sky
 * texture; each face records which painting of the sky canvas it was drawn from. */
function backgroundCubes() {
  const faces: string[] = [], targets: THREE.WebGLRenderTarget[] = [];
  let target: any = null;
  const renderer = {
    coordinateSystem: THREE.WebGLCoordinateSystem, xr: { enabled: false },
    getRenderTarget: () => target, getActiveCubeFace: () => 0, getActiveMipmapLevel: () => 0,
    setRenderTarget: (next: any) => { target = next; if (next && !targets.includes(next)) targets.push(next); },
    render: (face: any) => { faces.push(face.material.uniforms.tEquirect.value.image.painting); },
  };
  return { cubes: new WebGLCubeMaps(renderer as unknown as THREE.WebGLRenderer), faces, targets };
}

it('repaints the sky in every renderer when a time-of-day preset redraws its canvas', () => {
  const skyCanvas = { width: 4, height: 512, painting: 'day' };
  const sky = ownColorCanvasTexture(skyCanvas as unknown as HTMLCanvasElement);
  sky.mapping = THREE.EquirectangularReflectionMapping; // as the viewer's scene.background
  const main = backgroundCubes(), preview = backgroundCubes();
  const day = main.cubes.get(sky);
  preview.cubes.get(sky);
  expect(main.faces).toEqual(Array(6).fill('day'));
  let freed = 0;
  main.targets[0].addEventListener('dispose', () => freed++);

  skyCanvas.painting = 'night';
  sky.needsUpdate = true; // all the viewer used to do: three kept showing the daytime cube
  expect(main.cubes.get(sky)).toBe(day);
  expect(main.faces).toHaveLength(6);

  refreshBackgroundTexture(sky);
  const night = main.cubes.get(sky);
  expect(night).not.toBe(day);
  expect(main.faces.slice(6)).toEqual(Array(6).fill('night'));
  expect(freed).toBe(1); // the daytime cube's GPU memory is released
  preview.cubes.get(sky); // an interior preview's renderer rebuilds its own cube as well
  expect(preview.faces.slice(6)).toEqual(Array(6).fill('night'));
  expect(main.cubes.get(sky)).toBe(night); // cached again until the next preset
  // The same sky texture keeps its canvas, mapping and sRGB tag, so it is still not tone-mapped.
  expect(sky.image).toBe(skyCanvas);
  expect(sky.mapping).toBe(THREE.EquirectangularReflectionMapping);
  expect(night.colorSpace).toBe(THREE.SRGBColorSpace);
});
