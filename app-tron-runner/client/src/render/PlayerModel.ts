import * as THREE from 'three';
import type { PlayerState } from '../logic/player';
import type { RunnerView } from './runnerView';

const CYAN = 0x19f2ff;
const ORANGE = 0xff7a18;
const SUIT = 0x0a0a12;

interface Limb {
  pivot: THREE.Group;
  upper: THREE.Mesh;
  lower: THREE.Group;
}

export class PlayerModel implements RunnerView {
  private root: THREE.Group;
  private body: THREE.Group;
  private head: THREE.Group;
  private leftArm: Limb;
  private rightArm: Limb;
  private leftLeg: Limb;
  private rightLeg: Limb;
  private suitMat: THREE.MeshStandardMaterial;
  private cyanMat: THREE.MeshStandardMaterial;
  private orangeMat: THREE.MeshStandardMaterial;
  private shatter: THREE.InstancedMesh;
  private shatterActive = false;
  private shatterTime = 0;
  private runPhase = 0;
  private prevInvuln = 0;
  private tmpMatrix = new THREE.Matrix4();
  private tmpPos = new THREE.Vector3();
  private tmpQuat = new THREE.Quaternion();
  private tmpScale = new THREE.Vector3();
  private tmpEuler = new THREE.Euler();

  constructor() {
    this.root = new THREE.Group();
    this.body = new THREE.Group();
    this.root.add(this.body);

    this.suitMat = new THREE.MeshStandardMaterial({ color: SUIT, metalness: 0.9, roughness: 0.25 });
    this.cyanMat = new THREE.MeshStandardMaterial({ color: CYAN, emissive: CYAN, emissiveIntensity: 2.2 });
    this.orangeMat = new THREE.MeshStandardMaterial({ color: ORANGE, emissive: ORANGE, emissiveIntensity: 1.8 });

    // Torso
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.62, 0.3), this.suitMat);
    torso.position.y = 1.15;
    this.body.add(torso);
    const chestRing = new THREE.Mesh(new THREE.TorusGeometry(0.14, 0.025, 8, 24), this.cyanMat);
    chestRing.position.set(0, 1.25, 0.17);
    this.body.add(chestRing);
    const chestLine = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.4, 0.03), this.cyanMat);
    chestLine.position.set(0, 1.05, 0.17);
    this.body.add(chestLine);

    // Orange identity disc on the back
    const disc = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.035, 8, 24), this.orangeMat);
    disc.position.set(0, 1.2, -0.18);
    this.body.add(disc);
    const discCore = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.03, 16), this.orangeMat);
    discCore.rotation.x = Math.PI / 2;
    discCore.position.set(0, 1.2, -0.18);
    this.body.add(discCore);

    // Head with helmet + visor
    this.head = new THREE.Group();
    this.head.position.y = 1.62;
    const skull = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.3, 0.28), this.suitMat);
    this.head.add(skull);
    const visor = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.05, 0.03), this.cyanMat);
    visor.position.set(0, 0.02, 0.15);
    this.head.add(visor);
    this.body.add(this.head);

    // Limbs
    this.leftArm = this.makeLimb(-0.36, 1.42);
    this.rightArm = this.makeLimb(0.36, 1.42);
    this.leftLeg = this.makeLimb(-0.14, 0.85);
    this.rightLeg = this.makeLimb(0.14, 0.85);

    // Death shatter cubes
    const cubeGeo = new THREE.BoxGeometry(0.12, 0.12, 0.12);
    const cubeMat = new THREE.MeshBasicMaterial({ color: CYAN });
    this.shatter = new THREE.InstancedMesh(cubeGeo, cubeMat, 60);
    this.shatter.count = 0;
    this.shatter.frustumCulled = false;
    this.root.add(this.shatter);
  }

  private makeLimb(x: number, y: number): Limb {
    const pivot = new THREE.Group();
    pivot.position.set(x, y, 0);
    const upper = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.42, 0.16), this.suitMat);
    upper.position.y = -0.21;
    pivot.add(upper);
    const line = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.36, 0.03), this.cyanMat);
    line.position.set(0, -0.21, 0.09);
    pivot.add(line);
    const lower = new THREE.Group();
    lower.position.y = -0.42;
    const lowerMesh = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.4, 0.14), this.suitMat);
    lowerMesh.position.y = -0.2;
    lower.add(lowerMesh);
    const lowerLine = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.34, 0.03), this.cyanMat);
    lowerLine.position.set(0, -0.2, 0.08);
    lower.add(lowerLine);
    const boot = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.1, 0.24), this.suitMat);
    boot.position.set(0, -0.42, 0.04);
    lower.add(boot);
    pivot.add(lower);
    this.body.add(pivot);
    return { pivot, upper, lower };
  }

  getModel(): THREE.Group {
    return this.root;
  }

  private setLimb(limb: Limb, swing: number, bend: number): void {
    limb.pivot.rotation.x = swing;
    limb.lower.rotation.x = bend;
  }

  update(state: PlayerState, dt: number, speed: number): void {
    // Position
    this.root.position.set(state.x, state.y, state.z);

    // Hit flicker: flash white when invulnerability just started
    if (state.invulnerabilityTimer > 0 && this.prevInvuln <= 0) {
      this.suitMat.emissive.setHex(0xffffff);
      this.suitMat.emissiveIntensity = 1.0;
    }
    this.prevInvuln = state.invulnerabilityTimer;
    if (state.invulnerabilityTimer > 0) {
      const flicker = Math.sin(state.invulnerabilityTimer * 40) > 0 ? 0.35 : 0.0;
      this.suitMat.emissiveIntensity = flicker;
    } else {
      this.suitMat.emissiveIntensity = 0;
    }

    // Shatter animation (death)
    if (this.shatterActive) {
      this.shatterTime += dt;
      const t = this.shatterTime;
      for (let i = 0; i < 60; i++) {
        const seed = i * 12.9898;
        const sx = Math.sin(seed) * 4.0;
        const sy = Math.sin(seed * 1.7) * 4.0;
        const sz = Math.sin(seed * 2.3) * 4.0;
        const r = 0.5 + t * 6;
        this.tmpPos.set(sx * r, sy * r + t * t * 4, sz * r);
        this.tmpQuat.setFromEuler(this.tmpEuler.set(t * sx, t * sy, t * sz));
        const s = Math.max(0.01, 1 - t / 1.5);
        this.tmpScale.set(s, s, s);
        this.tmpMatrix.compose(this.tmpPos, this.tmpQuat, this.tmpScale);
        this.shatter.setMatrixAt(i, this.tmpMatrix);
      }
      this.shatter.count = t < 1.5 ? 60 : 0;
      this.shatter.instanceMatrix.needsUpdate = true;
      this.body.visible = false;
      return;
    }
    this.body.visible = true;

    const runRate = 6 + speed * 0.35;
    this.runPhase += dt * runRate;
    const s = Math.sin(this.runPhase);

    if (state.isWallRunning) {
      // Wall-run: body rotated 90° onto the wall, legs mid-stride, arm toward wall.
      this.body.rotation.z = -state.wallSide * Math.PI / 2;
      this.body.rotation.x = 0;
      this.body.position.y = 0;
      const rowLift = state.wallRow === 'high' ? 0 : 0;
      this.setLimb(this.leftLeg, s * 0.6, -Math.max(0, -s) * 0.8 + rowLift);
      this.setLimb(this.rightLeg, -s * 0.6, -Math.max(0, s) * 0.8);
      this.setLimb(this.leftArm, -s * 0.4, 0.3);
      this.setLimb(this.rightArm, s * 0.4, 0.3);
      this.head.rotation.x = 0;
      return;
    }

    // Lane lean
    const lean = (state.x - state.lane * 3) * 0.12;
    this.body.rotation.z = -lean;

    if (state.isSliding) {
      // Slide: low crouch, one leg extended, ~70° back lean.
      this.body.rotation.x = -1.22;
      this.body.position.y = 0.35;
      this.setLimb(this.leftLeg, 0.9, 0.1);
      this.setLimb(this.rightLeg, -0.3, 1.2);
      this.setLimb(this.leftArm, 0.4, 0.6);
      this.setLimb(this.rightArm, 0.4, 0.6);
      this.head.rotation.x = 0.4;
      return;
    }

    if (!state.isGrounded) {
      // Jump: tuck on the way up, stretch on the way down.
      const tuck = state.vy > 0 ? 1 : 0;
      this.body.rotation.x = 0.2 * tuck;
      this.setLimb(this.leftLeg, -0.9 * tuck, -0.9 * tuck);
      this.setLimb(this.rightLeg, -0.7 * tuck, -0.7 * tuck);
      this.setLimb(this.leftArm, -1.2 * tuck, 0.2);
      this.setLimb(this.rightArm, -1.2 * tuck, 0.2);
      this.head.rotation.x = -0.2 * tuck;
      return;
    }

    // Run cycle: legs/arms swing opposite, torso lean forward 12°.
    this.body.rotation.x = 0.21;
    this.setLimb(this.leftLeg, s * 0.8, -Math.max(0, -s) * 1.1);
    this.setLimb(this.rightLeg, -s * 0.8, -Math.max(0, s) * 1.1);
    this.setLimb(this.leftArm, -s * 0.7, -0.4 - Math.max(0, s) * 0.4);
    this.setLimb(this.rightArm, s * 0.7, -0.4 - Math.max(0, -s) * 0.4);
    this.head.rotation.x = 0;
  }

  /** Trigger the death shatter (player splits into ~60 emissive cubes). */
  triggerShatter(): void {
    this.shatterActive = true;
    this.shatterTime = 0;
    this.shatter.count = 60;
  }

  reset(): void {
    this.shatterActive = false;
    this.shatter.count = 0;
    this.body.visible = true;
    this.body.rotation.set(0, 0, 0);
    this.body.position.set(0, 0, 0);
    this.root.position.set(0, 0, 0);
    this.runPhase = 0;
    this.prevInvuln = 0;
    this.suitMat.emissiveIntensity = 0;
  }
}
