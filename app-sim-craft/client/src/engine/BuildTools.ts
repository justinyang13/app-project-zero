// The player's hands: what the crosshair is on, and what the current build
// mode does with it — break a block, place one, drop a torch, plant a flag.
// Every mode repeats while the primary action is held, so breaking through a
// block immediately continues into whatever is now exposed behind it.
import * as THREE from "three";
import type { World } from "../core/World";
import { AIR_ID, getBlockByKey } from "../data/blocks";
import { HOTBAR_SLOTS, useHotbarStore } from "../state/hotbarStore";
import type { MapMarkerRecord, TorchRecord } from "../persistence/db";
import type { ChunkManager } from "./ChunkManager";
import type { Flag } from "./Flag";
import type { PlacedSet } from "./PlacedSet";
import { EYE_HEIGHT, PLAYER_HEIGHT, PLAYER_WIDTH, type Player } from "./Player";
import { raycastVoxels, type RaycastHit } from "./Raycaster";
import type { Torch } from "./Torch";

const HOLD_REPEAT_INTERVAL = 0.15; // seconds between repeats while the primary action is held down

const scratchDirection = new THREE.Vector3();

export interface BuildToolsDeps {
  world: World;
  chunkManager: ChunkManager;
  scene: THREE.Scene;
  camera: THREE.Camera;
  player: Player;
  markers: PlacedSet<MapMarkerRecord, Flag>;
  torches: PlacedSet<TorchRecord, Torch>;
}

export class BuildTools {
  private readonly deps: BuildToolsDeps;
  private readonly highlight: THREE.LineSegments;
  private currentTarget: RaycastHit | null = null;
  private holdCooldown = 0;

  constructor(deps: BuildToolsDeps) {
    this.deps = deps;
    const outline = new THREE.EdgesGeometry(new THREE.BoxGeometry(1.002, 1.002, 1.002));
    this.highlight = new THREE.LineSegments(outline, new THREE.LineBasicMaterial({ color: 0x000000 }));
    this.highlight.visible = false;
    deps.scene.add(this.highlight);
  }

  /** The voxel the crosshair is on (and the empty cell in front of it), or null when nothing is in reach. */
  get target(): RaycastHit | null {
    return this.currentTarget;
  }

  /** Once per rendered frame, after the camera has moved: re-aims at whatever is under the crosshair and repeats the primary action while it is held. */
  update(dt: number, primaryHeld: boolean): void {
    this.currentTarget = this.computeTarget();
    const target = this.currentTarget;
    this.highlight.visible = target !== null;
    if (target) this.highlight.position.set(target.block.x + 0.5, target.block.y + 0.5, target.block.z + 0.5);

    if (primaryHeld) {
      this.holdCooldown -= dt;
      if (this.holdCooldown <= 0) this.primaryAction(true);
    } else {
      this.holdCooldown = 0;
    }
  }

  /**
   * Whichever action the current Build/Break mode selects (see hotbarStore.ts) —
   * shared by desktop's left-click and the touch action button, so both trigger
   * identically. Fires once per call; repeats while held come from update(),
   * which calls back in with `isRepeat`. The initial call acts immediately
   * rather than waiting out the cooldown, and resets it so the two don't double up.
   *
   * Torch/Flag are toggles on the first press (pressing on an existing one
   * removes it), but a *repeat* only ever adds.
   */
  primaryAction(isRepeat = false): void {
    const mode = useHotbarStore.getState().mode;
    if (mode === "place") this.placeSelectedBlock();
    else if (mode === "break") this.breakTargetedBlock();
    else if (mode === "torch") this.toggleTorchAtTarget(isRepeat);
    else if (mode === "flag") this.toggleFlagAtTarget(isRepeat);
    this.holdCooldown = HOLD_REPEAT_INTERVAL;
  }

  /** Right-click: a quick block-place shortcut for the break/place modes only — Torch/Flag have no natural second action, so it's a no-op there rather than surprising the player by placing a hotbar block. */
  secondaryAction(): void {
    const mode = useHotbarStore.getState().mode;
    if (mode === "break" || mode === "place") this.placeSelectedBlock();
  }

  /** K: toggles a custom minimap marker at the player's current spot. */
  toggleMarkerAtPlayer(): void {
    const p = this.deps.player.position;
    this.deps.markers.toggleAt(p.x, p.y, p.z);
  }

  dispose(): void {
    this.deps.scene.remove(this.highlight);
    this.highlight.geometry.dispose();
    (this.highlight.material as THREE.Material).dispose();
  }

  private placeSelectedBlock(): void {
    if (!this.currentTarget) return;
    const { x, y, z } = this.currentTarget.placeAt;
    if (this.overlapsPlayer(x, y, z)) return;
    const blockKey = HOTBAR_SLOTS[useHotbarStore.getState().selectedIndex].key;
    this.deps.chunkManager.applyEdit(x, y, z, getBlockByKey(blockKey).id);
  }

  private breakTargetedBlock(): void {
    if (!this.currentTarget) return;
    const { x, y, z } = this.currentTarget.block;
    this.deps.chunkManager.applyEdit(x, y, z, AIR_ID);
  }

  /** Torch build mode: place/remove a portable light at whatever block the player is looking at. */
  private toggleTorchAtTarget(addOnly: boolean): void {
    if (!this.currentTarget) return;
    const { x, y, z } = this.currentTarget.placeAt;
    this.deps.torches.toggleAt(x, y, z, addOnly);
  }

  /** Flag build mode: drop/pick up a flag (and its minimap marker) at whatever block the player is looking at. */
  private toggleFlagAtTarget(addOnly: boolean): void {
    if (!this.currentTarget) return;
    const { x, y, z } = this.currentTarget.placeAt;
    this.deps.markers.toggleAt(x + 0.5, y, z + 0.5, addOnly);
  }

  private overlapsPlayer(bx: number, by: number, bz: number): boolean {
    const p = this.deps.player.position;
    const half = PLAYER_WIDTH / 2;
    return bx + 1 > p.x - half && bx < p.x + half && bz + 1 > p.z - half && bz < p.z + half && by + 1 > p.y && by < p.y + PLAYER_HEIGHT;
  }

  // Always raycasts from the player's actual eye position, not the camera's — in third person the camera is
  // pulled back several blocks, and reach shouldn't change just because it's looking over the character's shoulder.
  private computeTarget(): RaycastHit | null {
    const { camera, player, world } = this.deps;
    camera.getWorldDirection(scratchDirection);
    const eye = { x: player.position.x, y: player.position.y + EYE_HEIGHT, z: player.position.z };
    return raycastVoxels(world, eye, scratchDirection);
  }
}
