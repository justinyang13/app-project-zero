// Where the camera sits each frame and how wide it sees: first person at the
// eyes, a third-person chase cam behind the player, or — while riding or
// driving — a chase cam anchored to the mount (the dragon can also be seen
// out of, honouring the first/third toggle). Mouse-look rotates the camera
// itself; this only decides its position and field of view.
import * as THREE from "three";
import { EYE_HEIGHT } from "./Player";
import type { Rideable } from "../entities/Rideable";

export type ViewMode = "first" | "third";

const BASE_FOV = 70;
const TURBO_FOV = 84; // turbo flight widens the view a little for a sense of speed
const FOV_EASE_RATE = 6;
const THIRD_PERSON_DISTANCE = 4.5;
const THIRD_PERSON_UP_OFFSET = 1.0;
const MIN_RIDE_ZOOM = 0.5; // multiplier on a mount's own chase-cam distance, adjusted with the mouse wheel
const MAX_RIDE_ZOOM = 6;

const scratchEuler = new THREE.Euler();
const scratchForward = new THREE.Vector3();

/** The camera's heading (yaw, radians) — where the player faces. */
export function cameraYaw(camera: THREE.Camera): number {
  return scratchEuler.setFromQuaternion(camera.quaternion, "YXZ").y;
}

export function cameraPitch(camera: THREE.Camera): number {
  return scratchEuler.setFromQuaternion(camera.quaternion, "YXZ").x;
}

export class CameraRig {
  private readonly camera: THREE.PerspectiveCamera;
  private mode: ViewMode = "first";
  private modeBeforeMount: ViewMode | null = null;
  private wasRiding = false;
  private rideZoom = 1;

  constructor(camera: THREE.PerspectiveCamera) {
    this.camera = camera;
  }

  get viewMode(): ViewMode {
    return this.mode;
  }

  /** The F5 key's action: switch between first- and third-person views. */
  toggleViewMode(): void {
    this.mode = this.mode === "first" ? "third" : "first";
  }

  /** The hotbar is idle while riding, so the wheel zooms the chase cam instead: scroll down to pull back (far enough to see the whole dragon), up to come in. */
  zoomRide(wheelDelta: number): void {
    const step = Math.max(-100, Math.min(100, wheelDelta));
    this.rideZoom = Math.max(MIN_RIDE_ZOOM, Math.min(MAX_RIDE_ZOOM, this.rideZoom * Math.exp(step * 0.0015)));
  }

  /** Places the camera for this frame and returns the view actually shown — a mount forces the chase cam unless it can be seen out of. */
  update(dt: number, player: { position: { x: number; y: number; z: number }; flying: boolean; turbo: boolean }, mount: Rideable | null): ViewMode {
    const riding = mount !== null;
    // Mounting starts on the chase cam (the whole mount in view); the previous view is restored when getting off.
    if (riding && !this.wasRiding) {
      this.modeBeforeMount = this.mode;
      this.mode = "third";
    } else if (!riding && this.wasRiding) {
      if (this.modeBeforeMount) this.mode = this.modeBeforeMount;
      this.modeBeforeMount = null;
    }
    this.wasRiding = riding;

    const firstPersonRide = mount !== null && mount.supportsFirstPerson === true && this.mode === "first";
    const shown: ViewMode = riding && !firstPersonRide ? "third" : this.mode;
    if (mount) mount.setFirstPersonView?.(firstPersonRide);

    const eyeY = player.position.y + (mount ? mount.rideEyeHeight : EYE_HEIGHT);
    if (firstPersonRide && mount.firstPersonEye) {
      const eye = mount.firstPersonEye();
      this.camera.position.set(eye.x, eye.y, eye.z);
    } else if (shown === "first") {
      this.camera.position.set(player.position.x, eyeY, player.position.z);
    } else {
      this.camera.getWorldDirection(scratchForward);
      const distance = mount ? mount.rideCameraDistance * this.rideZoom : THIRD_PERSON_DISTANCE;
      this.camera.position
        .set(player.position.x, eyeY, player.position.z)
        .addScaledVector(scratchForward, -distance);
      this.camera.position.y += THIRD_PERSON_UP_OFFSET;
    }

    const targetFov = player.flying && player.turbo && !riding ? TURBO_FOV : BASE_FOV;
    if (Math.abs(this.camera.fov - targetFov) > 0.05) {
      this.camera.fov += (targetFov - this.camera.fov) * Math.min(1, dt * FOV_EASE_RATE);
      this.camera.updateProjectionMatrix();
    }
    return shown;
  }
}
