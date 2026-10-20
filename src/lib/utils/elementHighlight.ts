import * as THREE from 'three';

export interface ElementRef {
  id: string;
  kind: 'wall' | 'door' | 'window' | 'furniture' | 'stair' | 'column' | 'room';
}

/** Tints every mesh of the selected element by cloning its material and adding a
 *  blue emissive. Textures are borrowed; only the material clones are owned. */
export function createElementHighlight() {
  const originals = new Map<THREE.Mesh, THREE.Material | THREE.Material[]>();
  const clones = new Map<THREE.Material, THREE.Material>();

  function clear() {
    for (const [mesh, material] of originals) mesh.material = material;
    originals.clear();
    for (const material of clones.values()) material.dispose();
    clones.clear();
  }

  function clone(material: THREE.Material) {
    if (!clones.has(material)) {
      const highlighted = material.clone();
      if (highlighted instanceof THREE.MeshStandardMaterial) {
        highlighted.emissive.set(0x3388ff);
        highlighted.emissiveIntensity = 0.3;
      }
      clones.set(material, highlighted);
    }
    return clones.get(material)!;
  }

  return {
    clear,
    apply(entries: Iterable<[THREE.Object3D, ElementRef]>, elementId: string | null, roomId: string | null) {
      clear();
      if (!elementId && !roomId) return;
      for (const [obj, ref] of entries) {
        if (!(obj instanceof THREE.Mesh)) continue;
        const match = ref.kind === 'room' ? ref.id === roomId : ref.id === elementId;
        if (!match) continue;
        originals.set(obj, obj.material);
        obj.material = Array.isArray(obj.material) ? obj.material.map(clone) : clone(obj.material);
      }
    },
  };
}
