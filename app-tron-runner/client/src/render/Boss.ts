// Sentinel boss view (SPEC §5.4, M9b). Render only — state from logic/boss.
import * as THREE from 'three';
import {
  BOSS_Z0,
  activeTelegraph,
  boltPosition,
  bossShattered,
  type BossState,
} from '../logic/boss';

const LANE_X = [-3, 0, 3];

export class BossView {
  private group = new THREE.Group();
  private body = new THREE.Group();
  private blades: THREE.Mesh[] = [];
  private eyeMat: THREE.MeshBasicMaterial;
  private telegraphMat: THREE.MeshBasicMaterial;
  private telegraphs: THREE.Mesh[] = [];
  private bolt: THREE.Mesh;
  private boltMat: THREE.MeshBasicMaterial;
  private shatter: THREE.InstancedMesh;
  private shatterMat: THREE.MeshBasicMaterial;
  private shatterTime = -1; // -1 = not started
  private shatterVel: THREE.Vector3[] = [];
  private tmpV = new THREE.Vector3();
  private shatterBase = new THREE.Vector3();
  private tmpM = new THREE.Matrix4();
  private tmpQ = new THREE.Quaternion();
  private tmpS = new THREE.Vector3(1, 1, 1);
  private time = 0;
  private targetX = 0;
  private curX = 0;

  constructor(scene: THREE.Scene) {
    // Body: tall tapered dark core
    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0x0a0a12, metalness: 0.9, roughness: 0.3,
      emissive: 0x330000, emissiveIntensity: 0.6,
    });
    const core = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 3.4, 14, 6), bodyMat);
    core.position.y = 8;
    this.body.add(core);
    const head = new THREE.Mesh(new THREE.ConeGeometry(1.6, 4, 6), bodyMat);
    head.position.y = 17;
    this.body.add(head);
    // Glowing red-orange edge strips
    const edgeMat = new THREE.MeshBasicMaterial({ color: 0xff3300 });
    for (let i = 0; i < 3; i++) {
      const strip = new THREE.Mesh(new THREE.BoxGeometry(0.15, 12, 0.15), edgeMat);
      const a = (i / 3) * Math.PI * 2;
      strip.position.set(Math.cos(a) * 2.6, 8, Math.sin(a) * 2.6);
      this.body.add(strip);
    }
    // Eye
    this.eyeMat = new THREE.MeshBasicMaterial({ color: 0xff5511 });
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.7, 12, 12), this.eyeMat);
    eye.position.set(0, 12, 2.2);
    this.body.add(eye);
    // Floating blades
    const bladeMat = new THREE.MeshStandardMaterial({
      color: 0x111118, metalness: 0.95, roughness: 0.2,
      emissive: 0xff2200, emissiveIntensity: 0.8,
    });
    const bladeGeo = new THREE.BoxGeometry(4.5, 0.25, 0.9);
    for (let i = 0; i < 4; i++) {
      const b = new THREE.Mesh(bladeGeo, bladeMat);
      b.userData.angle = (i / 4) * Math.PI * 2;
      b.userData.radius = 5.5 + (i % 2) * 1.5;
      b.userData.y = 6 + i * 2.2;
      this.blades.push(b);
      this.body.add(b);
    }
    this.group.add(this.body);

    // Red lane telegraphs: long emissive planes per lane
    this.telegraphMat = new THREE.MeshBasicMaterial({
      color: 0xff1122, transparent: true, opacity: 0,
      blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
    });
    const teleGeo = new THREE.PlaneGeometry(2.6, 120);
    for (let i = 0; i < 3; i++) {
      const p = new THREE.Mesh(teleGeo, this.telegraphMat.clone());
      p.position.set(LANE_X[i], 0.06, -60);
      p.rotation.x = -Math.PI / 2;
      p.visible = false;
      this.telegraphs.push(p);
      this.group.add(p);
    }

    // Plasma bolt
    this.boltMat = new THREE.MeshBasicMaterial({ color: 0xff3300 });
    this.bolt = new THREE.Mesh(new THREE.SphereGeometry(0.9, 14, 14), this.boltMat);
    this.bolt.visible = false;
    this.group.add(this.bolt);
    const boltGlow = new THREE.Mesh(
      new THREE.SphereGeometry(1.6, 12, 12),
      new THREE.MeshBasicMaterial({
        color: 0xff6622, transparent: true, opacity: 0.35,
        blending: THREE.AdditiveBlending, depthWrite: false,
      }),
    );
    this.bolt.add(boltGlow);

    // Shatter cubes
    const N = 80;
    this.shatterMat = new THREE.MeshBasicMaterial({ color: 0xff4411 });
    this.shatter = new THREE.InstancedMesh(
      new THREE.BoxGeometry(0.6, 0.6, 0.6), this.shatterMat, N,
    );
    this.shatter.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.shatter.visible = false;
    for (let i = 0; i < N; i++) {
      this.shatterVel.push(new THREE.Vector3(
        (Math.random() - 0.5) * 30,
        Math.random() * 26 + 4,
        (Math.random() - 0.5) * 30,
      ));
      this.tmpM.makeScale(0, 0, 0);
      this.shatter.setMatrixAt(i, this.tmpM);
    }
    this.group.add(this.shatter);

    this.group.visible = false;
    scene.add(this.group);
  }

  reset(): void {
    this.time = 0;
    this.curX = 0;
    this.targetX = 0;
    this.shatterTime = -1;
    this.bolt.visible = false;
    this.group.visible = false;
    for (const t of this.telegraphs) t.visible = false;
  }

  update(playerDist: number, bossState: BossState, dt: number): void {
    this.time += dt;
    if (playerDist < BOSS_Z0 - 100) {
      this.group.visible = false;
      return;
    }
    this.group.visible = true;
    const shattered = bossShattered(playerDist);

    // Position ~70 m ahead, drifting between lanes
    const aheadZ = -(playerDist + 70);
    if (!shattered) {
      // deterministic drift: sine of distance
      this.targetX = Math.sin(playerDist * 0.02) * 2.5;
      this.curX += (this.targetX - this.curX) * Math.min(1, dt * 2);
      this.body.position.set(this.curX, 0, aheadZ);
      this.body.rotation.y = this.time * 0.3;
      for (const b of this.blades) {
        const a = (b.userData.angle as number) + this.time * 0.8;
        const r = b.userData.radius as number;
        b.position.set(Math.cos(a) * r, b.userData.y as number, Math.sin(a) * r);
        b.rotation.z = a;
      }
      this.eyeMat.color.setHSL(0.03, 1, 0.45 + 0.15 * Math.sin(this.time * 6));
    } else {
      this.body.visible = false;
      // shatter burst
      if (this.shatterTime < 0) this.shatterTime = 0;
      this.shatterTime += dt;
      const t = this.shatterTime;
      const base = this.shatterBase.set(this.curX, 8, aheadZ);
      const fade = Math.max(0, 1 - t / 2.0);
      for (let i = 0; i < this.shatterVel.length; i++) {
        const v = this.shatterVel[i];
        this.tmpV.set(
          base.x + v.x * t,
          Math.max(0.3, base.y + v.y * t - 9.8 * t * t),
          base.z + v.z * t,
        );
        const s = Math.max(0.001, 1 - t / 2.0);
        this.tmpM.compose(this.tmpV, this.tmpQ, this.tmpS.set(s, s, s));
        this.shatter.setMatrixAt(i, this.tmpM);
      }
      this.shatter.instanceMatrix.needsUpdate = true;
      this.shatter.visible = t < 2.0;
      this.shatterMat.color.setHSL(0.05, 1, 0.3 + 0.4 * fade);
    }

    // Telegraph: red lane plane(s)
    const tele = activeTelegraph(playerDist, bossState);
    for (let i = 0; i < 3; i++) {
      const on = !!tele && tele.lanes.includes(i as -1 | 0 | 1);
      const m = this.telegraphs[i];
      m.visible = on;
      if (on) {
        (m.material as THREE.MeshBasicMaterial).opacity =
          0.25 + 0.25 * Math.sin(this.time * 12);
        m.position.z = aheadZ;
      }
    }

    // Plasma bolt
    const bp = boltPosition(playerDist, bossState);
    if (bp) {
      this.bolt.visible = true;
      // bp.z is a distance coordinate; place at that distance in the first lane
      const bx = LANE_X[bp.lanes[0] + 1];
      this.bolt.position.set(bx, 1.0, -bp.z);
      this.boltMat.color.setHSL(0.02, 1, 0.5 + 0.2 * Math.sin(this.time * 30));
    } else {
      this.bolt.visible = false;
    }
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
