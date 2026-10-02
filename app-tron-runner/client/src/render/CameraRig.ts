import * as THREE from 'three';
import type { PlayerState } from '../logic/player';

export class CameraRig {
  private camera: THREE.PerspectiveCamera;
  private target = new THREE.Vector3();
  private desired = new THREE.Vector3();
  private current = new THREE.Vector3();
  private followDistance = 5.5;
  private followHeight = 2.8;
  private baseFOV = 68;
  private maxFOV = 86;
  private currentRoll = 0;
  private targetRoll = 0;
  private shakeIntensity = 0;
  private shakeTimer = 0;
  private shakeDuration = 0;
  private bobPhase = 0;
  private attractAngle = 0;
  private introT = 0;
  private introActive = false;
  private prevInvuln = 0;

  constructor() {
    this.camera = new THREE.PerspectiveCamera(
      this.baseFOV,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.camera.position.set(0, this.followHeight, this.followDistance);
    this.camera.lookAt(0, 1.3, -6);
    this.current.copy(this.camera.position);
  }

  getCamera(): THREE.PerspectiveCamera {
    return this.camera;
  }

  setAspect(aspect: number): void {
    this.camera.aspect = aspect;
    this.camera.updateProjectionMatrix();
  }

  /** Chase camera per SPEC §8.4. Player runs toward -Z. */
  update(state: PlayerState, dt: number, speed: number): void {
    // Trigger shake when invulnerability just started (hit).
    if (state.invulnerabilityTimer > 0 && this.prevInvuln <= 0) {
      this.addShake(0.5, 0.5);
    }
    this.prevInvuln = state.invulnerabilityTimer;

    // Target point: 5 m ahead of the player (ahead = -Z), y ≈ 1.3.
    this.target.set(state.x, state.y + 1.3, state.z - 5);

    // Desired camera position: behind and above the player.
    this.desired.set(
      state.x,
      state.y + this.followHeight,
      state.z + this.followDistance
    );

    // Exponential smoothing (frame-rate independent).
    const k = 1 - Math.exp(-dt / 0.12);
    this.current.lerp(this.desired, k);

    // Vertical bob with the run cycle (tiny).
    if (state.isGrounded && !state.isSliding && !state.isWallRunning) {
      this.bobPhase += dt * (6 + speed * 0.35);
      this.current.y += Math.sin(this.bobPhase) * 0.05;
    }

    // Jump lifts the camera partially.
    if (!state.isGrounded) {
      this.current.y += state.y * 0.35;
    }

    // Camera shake (decays over shakeDuration).
    if (this.shakeDuration > 0) {
      this.shakeTimer += dt;
      this.shakeDuration -= dt;
      if (this.shakeDuration <= 0) {
        this.shakeIntensity = 0;
      } else {
        const amp = this.shakeIntensity * (this.shakeDuration / 0.5);
        this.current.x += (Math.random() - 0.5) * amp;
        this.current.y += (Math.random() - 0.5) * amp;
      }
    }

    // Roll toward the wall during wall-run (up to 22°), ease ~0.25 s.
    this.targetRoll = state.isWallRunning ? state.wallSide * 22 : 0;
    const rollK = 1 - Math.exp(-dt / 0.25);
    this.currentRoll += (this.targetRoll - this.currentRoll) * rollK;

    this.camera.position.copy(this.current);
    this.camera.lookAt(this.target);
    this.camera.rotation.z = THREE.MathUtils.degToRad(this.currentRoll);

    // FOV: 68° at base speed, up to 86° with speed/boost.
    const speedT = THREE.MathUtils.clamp((speed - 20) / 20, 0, 1);
    const fov = this.baseFOV + (this.maxFOV - this.baseFOV) * speedT;
    if (Math.abs(this.camera.fov - fov) > 0.01) {
      this.camera.fov = fov;
      this.camera.updateProjectionMatrix();
    }
  }

  /** Attract-mode orbit for the title screen. */
  updateAttract(dt: number, center: THREE.Vector3): void {
    this.attractAngle += dt * 0.25;
    const r = 12;
    this.camera.position.set(
      center.x + Math.sin(this.attractAngle) * r,
      center.y + 5,
      center.z + Math.cos(this.attractAngle) * r
    );
    this.camera.lookAt(center);
    this.camera.rotation.z = 0;
  }

  /** Intro dolly during the countdown (3 s). */
  startIntro(): void {
    this.introT = 0;
    this.introActive = true;
  }

  updateIntro(dt: number, playerPos: THREE.Vector3): void {
    if (!this.introActive) return;
    this.introT += dt;
    const t = THREE.MathUtils.clamp(this.introT / 3, 0, 1);
    // Dolly from far (z + 14, y 6) to the chase position.
    const z = playerPos.z + THREE.MathUtils.lerp(14, this.followDistance, t);
    const y = THREE.MathUtils.lerp(6, this.followHeight, t);
    this.camera.position.set(playerPos.x, y, z);
    this.camera.lookAt(playerPos.x, 1.3, playerPos.z - 5);
    if (t >= 1) this.introActive = false;
  }

  addShake(intensity: number, duration: number): void {
    this.shakeIntensity = intensity;
    this.shakeDuration = duration;
    this.shakeTimer = 0;
  }

  /** Lower camera + wider FOV in light-cycle mode. */
  setCycleMode(on: boolean): void {
    if (on) {
      this.followDistance = 5.0;
      this.followHeight = 2.4;
      this.baseFOV = 74;
    } else {
      this.followDistance = 5.5;
      this.followHeight = 2.8;
      this.baseFOV = 68;
    }
  }
}
