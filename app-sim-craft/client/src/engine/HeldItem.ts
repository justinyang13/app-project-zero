// First-person viewmodel: a small mesh anchored to the bottom-right of
// the camera showing whichever block is selected (Build mode) or a
// generic pickaxe (Break mode) — the counterpart to the 2D hotbar's
// icon (ui/Hotbar.tsx always shows a pickaxe glyph for Break too, for
// the same reason: mining doesn't depend on the selected block). Third
// person hides this entirely (see GameLoop.ts) since PlayerModel's own
// arms stand in for it there.
import * as THREE from "three";
import { disposeObject3D } from "../rendering/disposeObject";
import type { BuildMode } from "../state/hotbarStore";
import type { BlockDef } from "../data/blocks";

const HELD_POSITION = new THREE.Vector3(0.55, -0.45, -0.9);
const HELD_ROTATION = new THREE.Euler(0.25, -0.5, 0.1);
const BLOCK_SIZE = 0.32;

export class HeldItem {
  readonly group: THREE.Group;
  private readonly blockMesh: THREE.Mesh;
  private readonly blockMat: THREE.MeshLambertMaterial;
  private readonly pickaxeGroup: THREE.Group;
  private readonly torchGroup: THREE.Group;
  private readonly flagGroup: THREE.Group;
  private bobPhase = 0;

  constructor() {
    this.group = new THREE.Group();
    this.group.position.copy(HELD_POSITION);
    this.group.rotation.copy(HELD_ROTATION);

    this.blockMat = new THREE.MeshLambertMaterial({ color: 0xffffff });
    this.blockMesh = new THREE.Mesh(new THREE.BoxGeometry(BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE), this.blockMat);
    this.group.add(this.blockMesh);

    this.pickaxeGroup = buildPickaxe();
    this.group.add(this.pickaxeGroup);

    this.torchGroup = buildHeldTorch();
    this.group.add(this.torchGroup);

    this.flagGroup = buildHeldFlag();
    this.group.add(this.flagGroup);
  }

  update(dt: number, mode: BuildMode, selectedBlock: BlockDef, horizontalSpeed: number): void {
    this.blockMesh.visible = mode === "place";
    this.pickaxeGroup.visible = mode === "break";
    this.torchGroup.visible = mode === "torch";
    this.flagGroup.visible = mode === "flag";
    if (mode === "place") this.blockMat.color.setHex(selectedBlock.color);

    // A tiny idle sway, faster while walking — just enough for the item
    // to not look like a static screen decal.
    const moving = horizontalSpeed > 0.1;
    this.bobPhase += dt * (moving ? 6 : 1.5);
    const amplitude = moving ? 0.025 : 0.008;
    this.group.position.y = HELD_POSITION.y + Math.sin(this.bobPhase) * amplitude;
    this.group.position.x = HELD_POSITION.x + Math.sin(this.bobPhase * 0.5) * amplitude * 0.5;
  }

  dispose(): void {
    disposeObject3D(this.blockMesh);
    for (const group of [this.pickaxeGroup, this.torchGroup, this.flagGroup]) disposeObject3D(group);
  }
}

function buildPickaxe(): THREE.Group {
  const group = new THREE.Group();
  const handleMat = new THREE.MeshLambertMaterial({ color: 0x8a5a35 });
  const headMat = new THREE.MeshLambertMaterial({ color: 0x9d9d9a });

  const handle = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.5, 0.055), handleMat);
  handle.position.y = -0.1;
  group.add(handle);

  const head = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.08, 0.08), headMat);
  head.position.y = 0.16;
  group.add(head);

  return group;
}

function buildHeldTorch(): THREE.Group {
  const group = new THREE.Group();
  const stick = new THREE.Mesh(
    new THREE.BoxGeometry(0.06, 0.4, 0.06),
    new THREE.MeshLambertMaterial({ color: 0x6b4a30 }),
  );
  group.add(stick);

  const flame = new THREE.Mesh(
    new THREE.ConeGeometry(0.09, 0.2, 8),
    new THREE.MeshBasicMaterial({ color: 0xff8c2a }),
  );
  flame.position.y = 0.28;
  group.add(flame);

  return group;
}

function buildHeldFlag(): THREE.Group {
  const group = new THREE.Group();
  const pole = new THREE.Mesh(
    new THREE.BoxGeometry(0.05, 0.5, 0.05),
    new THREE.MeshLambertMaterial({ color: 0x8a5a35 }),
  );
  group.add(pole);

  const cloth = new THREE.Mesh(
    new THREE.PlaneGeometry(0.26, 0.17),
    new THREE.MeshBasicMaterial({ color: 0xff4fd8, side: THREE.DoubleSide }),
  );
  cloth.position.set(0.14, 0.17, 0);
  group.add(cloth);

  return group;
}
