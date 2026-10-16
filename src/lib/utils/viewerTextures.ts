import * as THREE from 'three';
import { ownTexture } from './furnitureModelResources';

/** An owned texture for a canvas of colours: CSS fills, drawn photos, label text.
 * Canvas pixels are sRGB-encoded, so the texture is tagged sRGB and three.js decodes
 * it to linear before lighting, as THREE.Color does for the same hex values. Data
 * maps (normals, roughness) must stay linear and do not belong here. */
export function ownColorCanvasTexture(canvas: HTMLCanvasElement): THREE.CanvasTexture {
  const texture = ownTexture(new THREE.CanvasTexture(canvas));
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/** Shows a redrawn canvas behind an equirectangular scene background, such as the sky.
 * Each renderer converts that background into a cube map once and keeps reusing the cube
 * while the texture lives, whatever needsUpdate says. Disposing the texture drops every
 * renderer's cube, so each converts the new canvas on its next frame; the texture stays
 * in use and is uploaded again. */
export function refreshBackgroundTexture(texture: THREE.Texture) {
  texture.needsUpdate = true;
  texture.dispose();
}
