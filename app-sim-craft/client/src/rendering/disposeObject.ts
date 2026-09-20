// One implementation of "release everything three.js allocated for this
// object graph" — every entity and prop used to carry its own copy of the
// geometry-only traverse.
import * as THREE from "three";

export function disposeObject3D(root: THREE.Object3D): void {
  root.traverse((obj) => {
    if (!(obj instanceof THREE.Mesh)) return;
    obj.geometry.dispose();
    const materials: THREE.Material[] = Array.isArray(obj.material) ? obj.material : [obj.material];
    for (const material of materials) material.dispose();
  });
}
