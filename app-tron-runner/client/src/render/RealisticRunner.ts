import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import type { PlayerState } from '../logic/player';
import { chooseClip, INITIAL_CLIP_STATE, type ClipName, type ClipState } from '../logic/animMap';
import { TRIM_BANDS } from '../logic/trimMask';
import { RUNNER_FACING_FLIP } from '../config';
import type { RunnerView } from './runnerView';

const CYAN = 0x19f2ff;
const ORANGE = 0xff7a18;

/** GLSL mirror of logic/trimMask.ts (same bands, same formula). */
function trimGLSL(b: typeof TRIM_BANDS): string {
  const f = (v: number) => v.toFixed(4);
  const armYC = f((b.armY0 + b.armY1) / 2);
  const armYH = f((b.armY1 - b.armY0) / 2);
  const chestC = f((b.chestY0 + b.chestY1) / 2);
  const chestH = f((b.chestY1 - b.chestY0) / 2);
  const beltC = f((b.beltY0 + b.beltY1) / 2);
  const beltH = f((b.beltY1 - b.beltY0) / 2);
  return `
    float trimBand(float v, float c, float h, float s) {
      float d = abs(v - c);
      if (d >= h + s) return 0.0;
      if (d <= h) return 1.0;
      return (h + s - d) / s;
    }
    float trimRange(float v, float lo, float hi, float s) {
      if (v < lo - s || v > hi + s) return 0.0;
      if (v >= lo && v <= hi) return 1.0;
      if (v < lo) return (v - (lo - s)) / s;
      return ((hi + s) - v) / s;
    }
    float trimMask(vec3 p) {
      float ax = abs(p.x);
      float hw = ${f(b.halfWidth)};
      float sf = ${f(b.soft)};
      float m = 0.0;
      float leg = trimBand(ax, ${f(b.legX)}, hw, sf)
        * trimBand(p.z, ${f(b.legZC)}, ${f(b.legZH)}, sf)
        * trimRange(p.y, ${f(b.legY0)}, ${f(b.legY1)}, sf);
      m = max(m, leg);
      float arm = trimBand(p.y, ${armYC}, ${armYH}, sf)
        * trimBand(p.z, ${f(b.armZC)}, ${f(b.armZH)}, sf)
        * trimRange(ax, ${f(b.armX0)}, ${f(b.armX1)}, sf);
      m = max(m, arm);
      float chest = trimBand(p.y, ${chestC}, ${chestH}, sf) * trimRange(ax, 0.0, ${f(b.chestX)}, sf);
      m = max(m, chest);
      float belt = trimBand(p.y, ${beltC}, ${beltH}, sf) * trimRange(ax, 0.0, ${f(b.beltX)}, sf);
      m = max(m, belt);
      float spine = trimRange(ax, 0.0, ${f(b.spineX)}, sf)
        * (p.z < -${f(b.spineZ)} ? 1.0 : max(0.0, 1.0 - (${f(b.spineZ)} - p.z) / sf))
        * trimRange(p.y, ${f(b.spineY0)}, ${f(b.spineY1)}, sf);
      m = max(m, spine);
      return min(1.0, m);
    }
  `;
}

export class RealisticRunner implements RunnerView {
  private root: THREE.Group;
  private outer: THREE.Group; // carries wall rotation + lane lean
  private inner: THREE.Group; // carries facing flip
  private model: THREE.Object3D | null = null;
  private mixer: THREE.AnimationMixer | null = null;
  private actions = new Map<ClipName, THREE.AnimationAction>();
  private current: THREE.AnimationAction | null = null;
  private clipState: ClipState = { ...INITIAL_CLIP_STATE };
  private oneShotThen: ClipName | null = null;

  private shatter: THREE.InstancedMesh;
  private shatterActive = false;
  private shatterTime = 0;
  private deathTime = -1;
  private lean = 0;
  private tmpMatrix = new THREE.Matrix4();
  private tmpPos = new THREE.Vector3();
  private tmpQuat = new THREE.Quaternion();
  private tmpScale = new THREE.Vector3();
  private tmpEuler = new THREE.Euler();

  ready: Promise<void>;

  constructor() {
    this.root = new THREE.Group();
    this.outer = new THREE.Group();
    this.inner = new THREE.Group();
    this.inner.rotation.y = RUNNER_FACING_FLIP ? Math.PI : 0;
    this.outer.add(this.inner);
    this.root.add(this.outer);

    // Death shatter cubes (same effect as the procedural model).
    const cubeGeo = new THREE.BoxGeometry(0.12, 0.12, 0.12);
    const cubeMat = new THREE.MeshBasicMaterial({ color: CYAN });
    this.shatter = new THREE.InstancedMesh(cubeGeo, cubeMat, 60);
    this.shatter.count = 0;
    this.shatter.frustumCulled = false;
    this.root.add(this.shatter);

    this.ready = this.load();
  }

  private async load(): Promise<void> {
    const loader = new GLTFLoader();
    loader.setMeshoptDecoder(MeshoptDecoder);
    const gltf = await loader.loadAsync(`${import.meta.env.BASE_URL}assets/models/runner.glb`);
    const scene = gltf.scene;
    this.inner.add(scene);
    this.model = scene;
    this.applySuitMaterial(scene);
    this.attachRestPose(scene);

    this.mixer = new THREE.AnimationMixer(scene);
    this.mixer.addEventListener('finished', this.onActionFinished);
    for (const clip of gltf.animations) {
      const name = clip.name as ClipName;
      const action = this.mixer.clipAction(clip);
      action.enabled = true;
      this.actions.set(name, action);
    }
    const idle = this.actions.get('Idle_Loop');
    if (idle) {
      idle.play();
      this.current = idle;
      this.clipState = { ...INITIAL_CLIP_STATE, clip: 'Idle_Loop' };
    }
  }

  isReady(): boolean {
    return this.model !== null;
  }

  /** The loaded GLB scene (parent of the bones). */
  getSceneObject(): THREE.Object3D | null {
    return this.model;
  }

  getModel(): THREE.Object3D {
    return this.root;
  }

  /** Tron suit: dark glossy body + cyan trim lines + fresnel rim. */
  private applySuitMaterial(scene: THREE.Object3D): void {
    scene.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (!mesh.isMesh) return;
      const old = mesh.material as THREE.Material;
      const mat = new THREE.MeshStandardMaterial({
        color: 0x05070d,
        metalness: 0.7,
        roughness: 0.35,
        normalMap: (old as THREE.MeshStandardMaterial).normalMap ?? null,
        roughnessMap: (old as THREE.MeshStandardMaterial).roughnessMap ?? null
      });
      mat.envMapIntensity = 0.6;
      const b = TRIM_BANDS;
      mat.onBeforeCompile = (shader) => {
        shader.vertexShader = shader.vertexShader
          .replace('#include <common>', '#include <common>\nvarying vec3 vObjPos;')
          .replace('#include <begin_vertex>', '#include <begin_vertex>\nvObjPos = position;');
        shader.fragmentShader = shader.fragmentShader
          .replace(
            '#include <common>',
            `#include <common>
            varying vec3 vObjPos;
            ${trimGLSL(b)}`
          )
          .replace(
            '#include <emissivemap_fragment>',
            `#include <emissivemap_fragment>
            {
              float mask = trimMask(vObjPos);
              totalEmissiveRadiance += min(vec3(1.0), vec3(0.10, 0.95, 1.0) * 1.6) * mask;
              vec3 vDir = normalize(vViewPosition);
              float fres = pow(1.0 - abs(dot(vDir, normal)), 4.0);
              totalEmissiveRadiance += vec3(0.10, 0.95, 1.0) * fres * 0.30;
            }`
          );
      };
      mesh.material = mat;
    });
  }

  /**
   * M14c: convert a REST-POSE model-space point into a bone's local space.
   * Done before any clip plays, with the facing flip temporarily zeroed so
   * the math is in the model's own frame (orientation independent).
   */
  private restLocal(bone: THREE.Object3D, px: number, py: number, pz: number): THREE.Vector3 {
    const prevY = this.inner.rotation.y;
    this.inner.rotation.y = 0;
    this.inner.updateMatrixWorld(true);
    const local = bone.worldToLocal(new THREE.Vector3(px, py, pz));
    this.inner.rotation.y = prevY;
    this.inner.updateMatrixWorld(true);
    return local;
  }

  private attachRestPose(scene: THREE.Object3D): void {
    const cyanMat = new THREE.MeshStandardMaterial({
      color: CYAN,
      emissive: CYAN,
      emissiveIntensity: 3,
      side: THREE.DoubleSide
    });
    const orangeMat = new THREE.MeshStandardMaterial({ color: ORANGE, emissive: ORANGE, emissiveIntensity: 1.8 });
    const blackMat = new THREE.MeshStandardMaterial({ color: 0x05070d, metalness: 0.9, roughness: 0.2 });

    const head = scene.getObjectByName('Head');
    if (head) {
      // Helmet: black glossy sphere centred on the rest-pose head centre.
      const helmet = new THREE.Mesh(new THREE.SphereGeometry(0.125, 24, 16), blackMat);
      helmet.scale.set(1.0, 1.12, 1.08);
      helmet.position.copy(this.restLocal(head, 0, 1.69, 0));
      head.add(helmet);
      // Visor: thin cyan emissive curved band on the FRONT (+Z) of the helmet.
      // Partial sphere r=0.13 centred on the helmet: +-55 deg horizontal,
      // y 1.66..1.72 (theta from acos(y/r) about the helmet centre).
      const r = 0.13;
      const tTop = Math.acos(0.03 / r); // y = +0.03 above centre
      const tBot = Math.acos(-0.03 / r); // y = -0.03 below centre
      const phi = (55 * Math.PI) / 180;
      const visor = new THREE.Mesh(
        new THREE.SphereGeometry(r, 24, 8, -phi, phi * 2, tTop, tBot - tTop),
        cyanMat
      );
      visor.position.copy(this.restLocal(head, 0, 1.69, 0));
      head.add(visor);
    }

    const spine = scene.getObjectByName('spine_03');
    if (spine) {
      // Orange identity disc on the BACK, facing -Z (torus normal is +Z/-Z).
      const disc = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.03, 8, 24), orangeMat);
      disc.position.copy(this.restLocal(spine, 0, 1.28, -0.14));
      spine.add(disc);
      const core = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.025, 16), orangeMat);
      core.rotation.x = Math.PI / 2;
      core.position.copy(this.restLocal(spine, 0, 1.28, -0.14));
      spine.add(core);
    }

    for (const [name, sx] of [['foot_l', 0.114], ['foot_r', -0.114]] as const) {
      const foot = scene.getObjectByName(name);
      if (foot) {
        // Ankle ring: horizontal (axis Y) cyan torus.
        const ring = new THREE.Mesh(new THREE.TorusGeometry(0.075, 0.008, 8, 20), cyanMat);
        ring.rotation.x = Math.PI / 2;
        ring.position.copy(this.restLocal(foot, sx, 0.1, -0.06));
        foot.add(ring);
      }
    }
  }

  private playClip(name: ClipName, fade: number, timeScale: number, loop: boolean, oneShotThen: ClipName | null): void {
    if (!this.mixer) return;
    const action = this.actions.get(name);
    if (!action) return;
    action.timeScale = timeScale;
    action.setLoop(loop ? THREE.LoopRepeat : THREE.LoopOnce, loop ? Infinity : 1);
    action.clampWhenFinished = !loop;
    if (this.current && this.current !== action) {
      this.current.fadeOut(fade);
      action.reset().fadeIn(fade).play();
    } else {
      action.reset().play();
    }
    this.current = action;
    this.oneShotThen = oneShotThen;
    this.clipState = { clip: name, time: 0, oneShot: !loop, oneShotThen, hitOverlay: name === 'Hit_Chest' };
  }

  private onActionFinished = (event: { action: THREE.AnimationAction }): void => {
    if (this.oneShotThen && event.action === this.current) {
      const next = this.oneShotThen;
      this.oneShotThen = null;
      this.playClip(next, 0.12, 1, true, null);
    }
  };

  update(state: PlayerState, dt: number, speed: number): void {
    this.root.position.set(state.x, state.y, state.z);

    // Death sequence: Death01 for 0.6 s, then cube burst.
    if (state.integrity <= 0) {
      if (this.deathTime < 0) this.deathTime = 0;
      this.deathTime += dt;
      if (this.deathTime >= 0.6 && !this.shatterActive) {
        this.shatterActive = true;
        this.shatterTime = 0;
        this.shatter.count = 60;
        if (this.model) this.model.visible = false;
      }
      this.updateShatter(dt);
      return;
    }
    this.deathTime = -1;

    if (this.model) {
      this.model.visible = state.invulnerabilityTimer <= 0 || Math.sin(state.invulnerabilityTimer * 40) > 0;
    }

    // Wall-run: rotate the outer group ±90° about the forward (z) axis,
    // exactly like the procedural model's body rotation.
    const targetRoll = state.isWallRunning ? -state.wallSide * (Math.PI / 2) : 0;
    this.outer.rotation.z += (targetRoll - this.outer.rotation.z) * Math.min(1, dt / 0.25);

    // Lane-change lean: tilt about z by ±12° toward the move, damped.
    const targetLean = state.isWallRunning ? 0 : (state.x - state.lane * 3) * 0.21;
    this.lean += (targetLean - this.lean) * Math.min(1, dt / 0.14);
    this.outer.rotation.z += -this.lean;

    if (!this.mixer) return;
    this.mixer.update(dt);

    const choice = chooseClip(state, speed, this.clipState);
    if (choice.clip !== this.clipState.clip) {
      this.playClip(choice.clip, choice.fade, choice.timeScale, choice.loop, choice.oneShotThen ?? null);
    } else {
      if (this.current) this.current.timeScale = choice.timeScale;
    }
  }

  private updateShatter(dt: number): void {
    if (!this.shatterActive) return;
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
  }

  triggerShatter(): void {
    // Play Death01 first for 0.6 s, then the cube burst (see update()).
    if (this.mixer) {
      this.playClip('Death01', 0.05, 1, false, null);
    }
    this.deathTime = 0;
    this.shatterActive = false;
    this.shatterTime = 0;
  }

  reset(): void {
    this.shatterActive = false;
    this.shatterTime = 0;
    this.shatter.count = 0;
    this.deathTime = -1;
    this.lean = 0;
    this.oneShotThen = null;
    this.outer.rotation.set(0, 0, 0);
    this.root.position.set(0, 0, 0);
    if (this.model) this.model.visible = true;
    if (this.mixer) {
      this.mixer.stopAllAction();
      const idle = this.actions.get('Idle_Loop');
      if (idle) {
        idle.reset().play();
        this.current = idle;
      }
      this.clipState = { ...INITIAL_CLIP_STATE, clip: 'Idle_Loop' };
    }
  }
}
