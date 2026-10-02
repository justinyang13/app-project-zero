// Finish portal at z = -7800 (SPEC §5.4, §8.5, M9b).
import * as THREE from 'three';
import { LEVEL_LENGTH } from '../config';

const FINISH_Z = -LEVEL_LENGTH; // -7800
const SHOW_FROM = 6500;

export class FinishPortal {
  private group = new THREE.Group();
  private ringMat: THREE.MeshBasicMaterial;
  private swirl: THREE.Mesh;
  private swirlMat: THREE.MeshBasicMaterial;
  private beamMat: THREE.MeshBasicMaterial;
  private time = 0;

  constructor(scene: THREE.Scene) {
    // Big glowing torus ring
    this.ringMat = new THREE.MeshBasicMaterial({ color: 0x2bff88 });
    const ring = new THREE.Mesh(new THREE.TorusGeometry(7, 0.5, 16, 64), this.ringMat);
    ring.position.set(0, 5, FINISH_Z);
    this.group.add(ring);

    // Inner swirling additive plane (canvas texture with radial swirl)
    const tex = FinishPortal.makeSwirlTexture();
    this.swirlMat = new THREE.MeshBasicMaterial({
      map: tex, transparent: true, opacity: 0.85,
      blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
    });
    this.swirl = new THREE.Mesh(new THREE.CircleGeometry(6.6, 48), this.swirlMat);
    this.swirl.position.set(0, 5, FINISH_Z);
    this.group.add(this.swirl);

    // 300 m green light beam (fog-exempt so visible from far)
    this.beamMat = new THREE.MeshBasicMaterial({
      color: 0x2bff88, transparent: true, opacity: 0.28,
      blending: THREE.AdditiveBlending, depthWrite: false, fog: false,
    });
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 2.2, 300, 16, 1, true), this.beamMat);
    beam.position.set(0, 150, FINISH_Z);
    this.group.add(beam);

    // Floor glow disc
    const discMat = new THREE.MeshBasicMaterial({
      color: 0x2bff88, transparent: true, opacity: 0.3,
      blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
    });
    const disc = new THREE.Mesh(new THREE.CircleGeometry(8, 40), discMat);
    disc.rotation.x = -Math.PI / 2;
    disc.position.set(0, 0.05, FINISH_Z);
    this.group.add(disc);

    this.group.visible = false;
    scene.add(this.group);
  }

  private static makeSwirlTexture(): THREE.Texture {
    const size = 256;
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = size;
    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, size, size);
    const cx = size / 2;
    for (let i = 0; i < 5; i++) {
      const r0 = 20 + i * 22;
      ctx.strokeStyle = i % 2 === 0 ? 'rgba(43,255,136,0.9)' : 'rgba(25,242,255,0.7)';
      ctx.lineWidth = 5;
      ctx.beginPath();
      for (let a = 0; a <= Math.PI * 2 + 0.01; a += 0.1) {
        const r = r0 + Math.sin(a * 3 + i) * 8;
        const x = cx + Math.cos(a) * r;
        const y = cx + Math.sin(a) * r;
        if (a === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  reset(): void {
    this.time = 0;
    this.group.visible = false;
  }

  update(playerDist: number, dt: number): void {
    this.time += dt;
    this.group.visible = playerDist > SHOW_FROM;
    if (!this.group.visible) return;
    this.swirl.rotation.z = this.time * 0.8;
    const pulse = 0.85 + 0.15 * Math.sin(this.time * 3);
    this.ringMat.color.setHSL(0.4, 1, 0.45 * pulse + 0.1);
    this.beamMat.opacity = 0.22 + 0.1 * Math.sin(this.time * 2);
  }

  dispose(): void {
    this.group.traverse(obj => {
      const mesh = obj as THREE.Mesh;
      if (mesh.geometry) mesh.geometry.dispose();
      const mat = (mesh as { material?: THREE.Material | THREE.Material[] }).material;
      if (Array.isArray(mat)) mat.forEach(m => m.dispose());
      else if (mat) mat.dispose();
    });
    this.group.removeFromParent();
  }
}
