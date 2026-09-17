// Mouse-look only, per spec/05-player-mechanics.md §2 (first-person,
// configurable-sensitivity mouse-look). Movement is Player.ts's job now
// (physics-resolved, not a raw camera translation) — this class exists
// solely to own the click-to-lock Pointer Lock lifecycle and expose the
// camera's current yaw for Player movement's forward/right vectors.
import * as THREE from "three";
import { PointerLockControls } from "three/examples/jsm/controls/PointerLockControls.js";

export class MouseLook {
  readonly controls: PointerLockControls;
  private readonly domElement: HTMLElement;
  private readonly handleClick = (): void => this.controls.lock();

  constructor(camera: THREE.PerspectiveCamera, domElement: HTMLElement) {
    this.controls = new PointerLockControls(camera, domElement);
    this.domElement = domElement;
    domElement.addEventListener("click", this.handleClick);
  }

  get isLocked(): boolean {
    return this.controls.isLocked;
  }

  /** Yaw-only forward/right unit vectors (ignoring pitch) for ground movement. */
  getMoveAxes(camera: THREE.PerspectiveCamera): { forward: { x: number; z: number }; right: { x: number; z: number } } {
    const yaw = new THREE.Euler().setFromQuaternion(camera.quaternion, "YXZ").y;
    return {
      forward: { x: -Math.sin(yaw), z: -Math.cos(yaw) },
      right: { x: Math.cos(yaw), z: -Math.sin(yaw) },
    };
  }

  /**
   * Keyboard look — an alternative to mouse-look for panning the camera
   * (arrow keys), since Pointer Lock is unreliable across browsers/embeds
   * (see engine/GameLoop.ts's mouse-independent input handling). Reads
   * and writes via the same 'YXZ' Euler convention used everywhere else
   * yaw/pitch is extracted, rather than mutating camera.rotation directly
   * (whose `.order` defaults to 'XYZ' and would silently desync from the
   * mouse-look math). Positive `deltaPitch` looks up, matching this
   * codebase's established convention (verified: negative pitch hits a
   * block below eye level in Raycaster usage elsewhere).
   */
  panBy(camera: THREE.PerspectiveCamera, deltaYaw: number, deltaPitch: number): void {
    const euler = new THREE.Euler().setFromQuaternion(camera.quaternion, "YXZ");
    euler.y -= deltaYaw;
    euler.x = THREE.MathUtils.clamp(euler.x + deltaPitch, -Math.PI / 2, Math.PI / 2);
    camera.quaternion.setFromEuler(euler);
  }

  /**
   * Applies a raw pixel delta — as PointerLockControls' own mousemove
   * handler would read from event.movementX/Y — to the camera's
   * yaw/pitch. Used to feed touch-drag look (engine/GameLoop.ts) with
   * the exact same sensitivity and clamping mouse-look uses, without
   * going through the Pointer Lock API (touch has no equivalent concept,
   * and dragging works fine without locking the cursor).
   *
   * Reads pointerSpeed/min/maxPolarAngle straight off `this.controls` so
   * this stays in sync with actual mouse-look if those are ever tuned —
   * only MOUSE_SENSITIVITY is a copy, since PointerLockControls doesn't
   * export its internal 0.002 constant.
   */
  applyPointerDelta(camera: THREE.PerspectiveCamera, deltaX: number, deltaY: number): void {
    const euler = new THREE.Euler().setFromQuaternion(camera.quaternion, "YXZ");
    euler.y -= deltaX * MouseLook.MOUSE_SENSITIVITY * this.controls.pointerSpeed;
    euler.x -= deltaY * MouseLook.MOUSE_SENSITIVITY * this.controls.pointerSpeed;
    const minPitch = Math.PI / 2 - this.controls.maxPolarAngle;
    const maxPitch = Math.PI / 2 - this.controls.minPolarAngle;
    euler.x = THREE.MathUtils.clamp(euler.x, minPitch, maxPitch);
    camera.quaternion.setFromEuler(euler);
  }

  // Matches PointerLockControls' internal `_MOUSE_SENSITIVITY` constant (three/examples/jsm/controls/PointerLockControls.js) — not exported, so mirrored here.
  private static readonly MOUSE_SENSITIVITY = 0.002;

  dispose(): void {
    this.domElement.removeEventListener("click", this.handleClick);
    this.controls.dispose();
  }
}
