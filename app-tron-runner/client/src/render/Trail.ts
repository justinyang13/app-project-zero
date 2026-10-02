import * as THREE from 'three';

const RIBBON_LENGTH = 15; // ribbon history samples (~1.2 s at 120 Hz)

/**
 * Soft additive cyan ribbon trailing behind the runner (SPEC §8.3).
 * A glowing line strip that follows the player's recent position history and fades out.
 */
export class Trail {
  private line: THREE.Line;
  private geometry: THREE.BufferGeometry;
  private positions: Float32Array;
  private colors: Float32Array;
  private history: { x: number; y: number; z: number }[] = [];
  private tmpColor = new THREE.Color();

  constructor() {
    this.geometry = new THREE.BufferGeometry();
    this.positions = new Float32Array(RIBBON_LENGTH * 3);
    this.colors = new Float32Array(RIBBON_LENGTH * 3);
    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    this.geometry.setAttribute('color', new THREE.BufferAttribute(this.colors, 3));

    const material = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    this.line = new THREE.Line(this.geometry, material);
    this.line.frustumCulled = false;
    this.line.visible = false;
  }

  getModel(): THREE.Line {
    return this.line;
  }

  update(position: THREE.Vector3): void {
    // Push the current position into the history ring (newest last).
    this.history.push({ x: position.x, y: position.y, z: position.z });
    while (this.history.length > RIBBON_LENGTH) {
      this.history.shift();
    }
    if (this.history.length < 2) {
      this.line.visible = false;
      return;
    }
    this.line.visible = true;

    const n = this.history.length;
    for (let i = 0; i < n; i++) {
      const p = this.history[i];
      const t = i / (RIBBON_LENGTH - 1);
      const fade = Math.max(0, 1 - t) * 0.9;
      const base = i * 3;
      this.positions[base] = p.x;
      this.positions[base + 1] = p.y + 0.2;
      this.positions[base + 2] = p.z;
      this.tmpColor.setRGB(0.1 * fade, 0.95 * fade, 1.0 * fade);
      this.colors[base] = this.tmpColor.r;
      this.colors[base + 1] = this.tmpColor.g;
      this.colors[base + 2] = this.tmpColor.b;
    }
    // Zero out unused tail.
    for (let i = n; i < RIBBON_LENGTH; i++) {
      const base = i * 3;
      this.positions[base] = 0;
      this.positions[base + 1] = 0;
      this.positions[base + 2] = 0;
      this.colors[base] = 0;
      this.colors[base + 1] = 0;
      this.colors[base + 2] = 0;
    }

    (this.geometry.getAttribute('position') as THREE.BufferAttribute).needsUpdate = true;
    (this.geometry.getAttribute('color') as THREE.BufferAttribute).needsUpdate = true;
  }

  reset(): void {
    this.history.length = 0;
    this.line.visible = false;
  }
}
