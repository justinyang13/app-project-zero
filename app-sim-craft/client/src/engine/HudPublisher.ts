// The one-way projection of live game state into the UI's Zustand store
// (spec/01-tech-stack-architecture.md §3): React never reads the world, it
// reads what this publishes. The debug readout is throttled — it's text on a
// screen, not something that needs to re-render sixty times a second.
import type * as THREE from "three";
import type { World } from "../core/World";
import { getBlockById } from "../data/blocks";
import { useHudStore } from "../state/hudStore";
import { biomeKeyFromIndex, sampleBiomeIndexAt } from "../worldgen/terrain";
import type { MouseLook } from "./Camera";
import { cameraYaw, type ViewMode } from "./CameraRig";
import type { ChunkManager } from "./ChunkManager";
import type { Player } from "./Player";
import type { RaycastHit } from "./Raycaster";

const DEBUG_PUBLISH_INTERVAL_MS = 100;

export interface HudSources {
  world: World;
  player: Player;
  camera: THREE.Camera;
  chunkManager: ChunkManager;
  mouseLook: MouseLook;
  carCount(): number;
}

export interface FrameReport {
  fps: number;
  frameTimeMs: number;
  simTick: number;
  timeOfDay: number;
  viewMode: ViewMode;
  target: RaycastHit | null;
}

export class HudPublisher {
  private readonly sources: HudSources;
  private lastDebugPublish = 0;
  private lastPrompt: string | null = null;

  constructor(sources: HudSources) {
    this.sources = sources;
  }

  /** The E-key hint (or null). Only touches the store when it changes. */
  publishPrompt(prompt: string | null): void {
    if (prompt === this.lastPrompt) return;
    this.lastPrompt = prompt;
    useHudStore.getState().setVehiclePrompt(prompt);
  }

  publishDebug(report: FrameReport): void {
    const now = performance.now();
    if (now - this.lastDebugPublish < DEBUG_PUBLISH_INTERVAL_MS) return;
    this.lastDebugPublish = now;

    const { world, player, camera, chunkManager, mouseLook } = this.sources;
    const biome = biomeKeyFromIndex(sampleBiomeIndexAt(world.seed, Math.floor(player.position.x), Math.floor(player.position.z)));
    useHudStore.getState().setDebug({
      fps: report.fps,
      frameTimeMs: report.frameTimeMs,
      position: { x: player.position.x, y: player.position.y, z: player.position.z },
      facingYawDeg: (cameraYaw(camera) * 180) / Math.PI,
      chunkCount: chunkManager.loadedChunkCount,
      simTick: report.simTick,
      worldSeed: world.seed,
      pointerLocked: mouseLook.isLocked,
      biome,
      targetBlock: report.target ? getBlockById(report.target.blockId).name : null,
      pendingChunkOps: chunkManager.pendingCount,
      carCount: this.sources.carCount(),
      flying: player.flying,
      turbo: player.turbo,
      swimming: player.swimming,
      viewMode: report.viewMode,
      timeOfDay: report.timeOfDay,
    });
  }
}
