// Ambient decoration only — flat drifting boxes at a fixed altitude, not
// a real weather system (spec/07-survival-systems.md §4's weather states
// are later-phase work). A fixed scatter of clouds is generated once in
// group-local space and kept centered on the player (plus a slow wind
// drift) each frame, rather than streamed per-chunk like terrain — cheap,
// and clouds are far enough away that the repeating pattern isn't
// noticeable during normal play.
import * as THREE from "three";

const CLOUD_COUNT = 60;
const SCATTER_RADIUS = 260;
const ALTITUDE = 140;
const WIND_SPEED = 0.5; // blocks/sec

export class Clouds {
  readonly group: THREE.Group;
  private windOffset = 0;

  constructor() {
    this.group = new THREE.Group();
    // fog: false — clouds scatter out to SCATTER_RADIUS (260), well past
    // the fog's far distance (190), so without this most of them would
    // read as a dingy haze instead of crisp white (same fix as Sky.ts's
    // sun/moon). MeshBasicMaterial (unlit) instead of Lambert since these
    // are meant to always read bright regardless of time-of-day lighting.
    const material = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9, fog: false });

    for (let i = 0; i < CLOUD_COUNT; i++) {
      const width = 8 + Math.random() * 16;
      const depth = 6 + Math.random() * 12;
      const height = 2 + Math.random() * 1.5;
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), material);
      mesh.position.set(
        (Math.random() * 2 - 1) * SCATTER_RADIUS,
        ALTITUDE + Math.random() * 8,
        (Math.random() * 2 - 1) * SCATTER_RADIUS,
      );
      this.group.add(mesh);
    }
  }

  update(dt: number, playerX: number, playerZ: number): void {
    this.windOffset = (this.windOffset + WIND_SPEED * dt) % (SCATTER_RADIUS * 2);
    this.group.position.set(playerX + this.windOffset, 0, playerZ);
  }

  dispose(): void {
    this.group.traverse((obj) => {
      if (obj instanceof THREE.Mesh) obj.geometry.dispose();
    });
  }
}
