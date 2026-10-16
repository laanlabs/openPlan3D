import * as THREE from 'three';

/** Opacity of x-rayed surfaces in the interior-camera preview and captures. */
export const XRAY_OPACITY = 0.12;

interface MaterialState { transparent: boolean; opacity: number; depthWrite: boolean }

/** Fade every mesh under `root` flagged `userData.xray` (wall bodies, the baseboards,
 * doors and windows set in them, and ceilings) and return a function that restores
 * them. State is kept per material, so a material shared by several meshes, or used
 * several times in a wall's material array, is faded once and restored exactly once.
 * Unflagged meshes, such as floors, furniture, stairs and columns, are never touched. */
export function applyWallXray(root: THREE.Object3D, opacity = XRAY_OPACITY): () => void {
  const saved = new Map<THREE.Material, MaterialState>();
  root.traverse(object => {
    if (!(object instanceof THREE.Mesh) || object.userData.xray !== true) return;
    for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
      if (!material || saved.has(material)) continue;
      saved.set(material, { transparent: material.transparent, opacity: material.opacity, depthWrite: material.depthWrite });
      material.transparent = true;
      material.opacity = Math.min(material.opacity, opacity);
      material.depthWrite = false;
      material.needsUpdate = true;
    }
  });
  return () => {
    for (const [material, state] of saved) {
      material.transparent = state.transparent;
      material.opacity = state.opacity;
      material.depthWrite = state.depthWrite;
      material.needsUpdate = true;
    }
    saved.clear();
  };
}
