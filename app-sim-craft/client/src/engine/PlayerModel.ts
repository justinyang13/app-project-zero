// A blocky humanoid body — the classic voxel-sandbox player silhouette
// (head/torso/arms/legs as simple boxes) is a genre convention, not
// protected expression, but per spec/00-vision-and-scope.md's IP stance
// this uses SimCraft's own original colors rather than copying any
// specific existing character's exact skin. Only visible in third-person
// (see GameLoop.ts's view-mode toggle) — first-person hides it entirely
// to avoid seeing the inside of your own head.
import * as THREE from "three";
import { PLAYER_HEIGHT } from "./Player";

const HEAD_SIZE = 0.42;
const TORSO_HEIGHT = 0.7;
const TORSO_WIDTH = 0.5;
const TORSO_DEPTH = 0.28;
const LEG_HEIGHT = PLAYER_HEIGHT - TORSO_HEIGHT - HEAD_SIZE;
const LIMB_WIDTH = 0.22;

const BODY_PIVOT_Y = PLAYER_HEIGHT / 2;

const SKIN_COLOR = 0xd8a878;
const TUNIC_COLOR = 0x2f7f7a;
const LEGS_COLOR = 0x4a4038;

export class PlayerModel {
  readonly group: THREE.Group;
  // Everything below hangs off this pivot at the body's center of mass, so
  // the whole figure can pitch forward into a flying pose without the feet
  // staying planted at the origin.
  private readonly body: THREE.Group;
  private readonly leftLeg: THREE.Mesh;
  private readonly rightLeg: THREE.Mesh;
  private readonly leftArm: THREE.Mesh;
  private readonly rightArm: THREE.Mesh;
  private readonly head: THREE.Mesh;
  private walkPhase = 0;
  private flyPhase = 0;
  private flyBlend = 0; // 0 walking/standing -> 1 fully in the flying pose, eased

  constructor() {
    this.group = new THREE.Group();
    this.body = new THREE.Group();
    this.group.add(this.body);

    const skinMat = new THREE.MeshLambertMaterial({ color: SKIN_COLOR });
    const tunicMat = new THREE.MeshLambertMaterial({ color: TUNIC_COLOR });
    const legsMat = new THREE.MeshLambertMaterial({ color: LEGS_COLOR });

    this.head = new THREE.Mesh(new THREE.BoxGeometry(HEAD_SIZE, HEAD_SIZE, HEAD_SIZE), skinMat);
    this.head.position.y = LEG_HEIGHT + TORSO_HEIGHT + HEAD_SIZE / 2;
    this.body.add(this.head);

    const torso = new THREE.Mesh(new THREE.BoxGeometry(TORSO_WIDTH, TORSO_HEIGHT, TORSO_DEPTH), tunicMat);
    torso.position.y = LEG_HEIGHT + TORSO_HEIGHT / 2;
    this.body.add(torso);

    // Geometry is shifted down by half its own height so the mesh's
    // local origin sits at its TOP face — then positioning that origin
    // at the shoulder/hip and rotating .x hinges correctly from the
    // joint, instead of pivoting through the limb's middle.
    const armGeom = new THREE.BoxGeometry(LIMB_WIDTH, TORSO_HEIGHT, LIMB_WIDTH).translate(0, -TORSO_HEIGHT / 2, 0);
    this.leftArm = new THREE.Mesh(armGeom, skinMat);
    this.rightArm = new THREE.Mesh(armGeom, skinMat);
    const armOffsetX = TORSO_WIDTH / 2 + LIMB_WIDTH / 2;
    const shoulderY = LEG_HEIGHT + TORSO_HEIGHT;
    this.leftArm.position.set(-armOffsetX, shoulderY, 0);
    this.rightArm.position.set(armOffsetX, shoulderY, 0);
    this.body.add(this.leftArm, this.rightArm);

    const legGeom = new THREE.BoxGeometry(LIMB_WIDTH, LEG_HEIGHT, LIMB_WIDTH).translate(0, -LEG_HEIGHT / 2, 0);
    this.leftLeg = new THREE.Mesh(legGeom, legsMat);
    this.rightLeg = new THREE.Mesh(legGeom, legsMat);
    const legOffsetX = TORSO_WIDTH / 2 - LIMB_WIDTH / 2;
    this.leftLeg.position.set(-legOffsetX, LEG_HEIGHT, 0);
    this.rightLeg.position.set(legOffsetX, LEG_HEIGHT, 0);
    this.body.add(this.leftLeg, this.rightLeg);

    // Re-center every part on the pivot (half the figure's height up) —
    // the parts above were laid out with the feet at y=0.
    for (const child of this.body.children) child.position.y -= BODY_PIVOT_Y;
    this.body.position.y = BODY_PIVOT_Y;
  }

  /**
   * `position` is the player's feet; `yaw` is horizontal facing; `speed`
   * drives the walk-cycle swing. While `flying` the walk cycle is replaced
   * by a flight pose: the body pitches head-first forward more the faster it's moving
   * (hovering stays nearly upright), the legs trail behind with a gentle
   * flutter, and the arms reach ahead.
   */
  update(position: { x: number; y: number; z: number }, yaw: number, speed: number, dt: number, flying = false): void {
    this.group.position.set(position.x, position.y, position.z);
    this.group.rotation.y = yaw;

    this.flyBlend += ((flying ? 1 : 0) - this.flyBlend) * Math.min(1, dt * 8);
    const fly = this.flyBlend;

    let legSwing = 0;
    let armSwing = 0;
    if (speed > 0.1 && fly < 0.5) {
      this.walkPhase += speed * dt * 3;
      legSwing = Math.sin(this.walkPhase) * 0.6 * (1 - fly * 2);
      armSwing = legSwing * 0.7;
    }

    this.flyPhase += dt * (3 + Math.min(speed, 12) * 0.4);
    const flutter = Math.sin(this.flyPhase) * 0.14;
    const speedFrac = Math.min(1, speed / 6);

    // The model's facing direction is local -Z (GameLoop feeds it the
    // camera's yaw, and the camera looks down -Z), so leaning head-first
    // into travel is a *negative* pitch about X.
    this.body.rotation.x = -fly * (0.12 + speedFrac * 1.05);
    this.body.position.y = BODY_PIVOT_Y + fly * Math.sin(this.flyPhase * 0.6) * 0.04; // faint hover bob

    this.leftLeg.rotation.x = legSwing - fly * (0.12 + flutter);
    this.rightLeg.rotation.x = -legSwing - fly * (0.12 - flutter);
    this.leftArm.rotation.x = -armSwing + fly * (Math.PI * 0.82 + flutter * 0.5);
    this.rightArm.rotation.x = armSwing + fly * (Math.PI * 0.82 - flutter * 0.5);
    this.leftArm.rotation.z = fly * -0.18;
    this.rightArm.rotation.z = fly * 0.18;
  }

  set visible(value: boolean) {
    this.group.visible = value;
  }

  dispose(): void {
    this.group.traverse((obj) => {
      if (obj instanceof THREE.Mesh) obj.geometry.dispose();
    });
  }
}
