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

const SKIN_COLOR = 0xd8a878;
const TUNIC_COLOR = 0x2f7f7a;
const LEGS_COLOR = 0x4a4038;

export class PlayerModel {
  readonly group: THREE.Group;
  private readonly leftLeg: THREE.Mesh;
  private readonly rightLeg: THREE.Mesh;
  private readonly leftArm: THREE.Mesh;
  private readonly rightArm: THREE.Mesh;
  private readonly head: THREE.Mesh;
  private walkPhase = 0;

  constructor() {
    this.group = new THREE.Group();

    const skinMat = new THREE.MeshLambertMaterial({ color: SKIN_COLOR });
    const tunicMat = new THREE.MeshLambertMaterial({ color: TUNIC_COLOR });
    const legsMat = new THREE.MeshLambertMaterial({ color: LEGS_COLOR });

    this.head = new THREE.Mesh(new THREE.BoxGeometry(HEAD_SIZE, HEAD_SIZE, HEAD_SIZE), skinMat);
    this.head.position.y = LEG_HEIGHT + TORSO_HEIGHT + HEAD_SIZE / 2;
    this.group.add(this.head);

    const torso = new THREE.Mesh(new THREE.BoxGeometry(TORSO_WIDTH, TORSO_HEIGHT, TORSO_DEPTH), tunicMat);
    torso.position.y = LEG_HEIGHT + TORSO_HEIGHT / 2;
    this.group.add(torso);

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
    this.group.add(this.leftArm, this.rightArm);

    const legGeom = new THREE.BoxGeometry(LIMB_WIDTH, LEG_HEIGHT, LIMB_WIDTH).translate(0, -LEG_HEIGHT / 2, 0);
    this.leftLeg = new THREE.Mesh(legGeom, legsMat);
    this.rightLeg = new THREE.Mesh(legGeom, legsMat);
    const legOffsetX = TORSO_WIDTH / 2 - LIMB_WIDTH / 2;
    this.leftLeg.position.set(-legOffsetX, LEG_HEIGHT, 0);
    this.rightLeg.position.set(legOffsetX, LEG_HEIGHT, 0);
    this.group.add(this.leftLeg, this.rightLeg);
  }

  /** `position` is the player's feet; `yaw` is horizontal facing; `speed` drives the walk-cycle swing. */
  update(position: { x: number; y: number; z: number }, yaw: number, speed: number, dt: number): void {
    this.group.position.set(position.x, position.y, position.z);
    this.group.rotation.y = yaw;

    if (speed > 0.1) {
      this.walkPhase += speed * dt * 3;
      const swing = Math.sin(this.walkPhase) * 0.6;
      this.leftLeg.rotation.x = swing;
      this.rightLeg.rotation.x = -swing;
      this.leftArm.rotation.x = -swing * 0.7;
      this.rightArm.rotation.x = swing * 0.7;
    } else {
      this.leftLeg.rotation.x = 0;
      this.rightLeg.rotation.x = 0;
      this.leftArm.rotation.x = 0;
      this.rightArm.rotation.x = 0;
    }
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
