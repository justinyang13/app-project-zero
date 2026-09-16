// Owns the Three.js renderer/scene and the fixed-timestep sim tick, per
// spec/01-tech-stack-architecture.md §2 and §8. React never drives this
// loop — it only reads a throttled snapshot pushed into hudStore once
// per render frame.
import * as THREE from "three";
import { World } from "./World";
import { MouseLook } from "./Camera";
import { Player, EYE_HEIGHT, type PlayerInput } from "./Player";
import { ChunkManager } from "./ChunkManager";
import { raycastVoxels, type RaycastHit } from "./Raycaster";
import { Creature, findSurfaceY, type CreatureSpecies } from "./Creature";
import { PlayerModel } from "./PlayerModel";
import { Clouds } from "./Clouds";
import { Sky } from "./Sky";
import { CampfireVisual } from "./CampfireVisual";
import { CAMPFIRE_CENTER, getStructureAnchors } from "./worldgen/structures";
import { AIR_ID, getBlockById, getBlockByKey } from "../data/blocks";
import { sampleColumn, biomeKeyFromIndex, sampleBiomeIndexAt } from "./worldgen/terrain";
import { useHudStore } from "../state/hudStore";
import { useHotbarStore, HOTBAR_SLOTS } from "../state/hotbarStore";
import { SaveManager } from "../persistence/SaveManager";

const SIM_HZ = 20;
const SIM_DT = 1 / SIM_HZ;
const MAX_SIM_STEPS_PER_FRAME = 5;
const ARROW_PAN_SPEED = 2.2; // radians/sec
const THIRD_PERSON_DISTANCE = 4.5;
const THIRD_PERSON_UP_OFFSET = 1.0;

type ViewMode = "first" | "third";

export class GameLoop {
  private readonly canvas: HTMLCanvasElement;
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene: THREE.Scene;
  private readonly camera: THREE.PerspectiveCamera;
  private readonly mouseLook: MouseLook;
  private readonly world: World;
  private readonly player: Player;
  private readonly chunkManager: ChunkManager;
  private readonly saveManager: SaveManager;
  private readonly highlightMesh: THREE.LineSegments;
  private readonly creatures: Creature[] = [];
  private creaturesSpawned = false;
  private readonly playerModel: PlayerModel;
  private readonly clouds: Clouds;
  private readonly sky: Sky;
  private readonly campfire: CampfireVisual;
  private viewMode: ViewMode = "first";

  private readonly pressed = new Set<string>();
  private lastSpaceTapTime = 0;
  private currentTarget: RaycastHit | null = null;

  private simTick = 0;
  private accumulator = 0;
  private lastFrameTime = performance.now();
  private fpsFrameCount = 0;
  private fpsWindowStart = performance.now();
  private currentFps = 0;
  private rafHandle = 0;
  private disposed = false;

  static async create(canvas: HTMLCanvasElement): Promise<GameLoop> {
    const saveManager = new SaveManager();
    const { seed, playerState } = await saveManager.load();
    return new GameLoop(canvas, seed, saveManager, playerState);
  }

  private constructor(
    canvas: HTMLCanvasElement,
    seed: number,
    saveManager: SaveManager,
    playerState: Awaited<ReturnType<SaveManager["load"]>>["playerState"],
  ) {
    this.saveManager = saveManager;
    this.canvas = canvas;

    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(window.innerWidth, window.innerHeight);

    this.scene = new THREE.Scene();

    this.camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 1000);
    this.mouseLook = new MouseLook(this.camera, canvas);

    this.sky = new Sky(this.scene);

    this.world = new World(seed);
    this.chunkManager = new ChunkManager(this.world, this.scene, saveManager);

    this.player = new Player();
    if (playerState) {
      this.player.position = { ...playerState.position };
      this.player.flying = playerState.flying;
      this.camera.rotation.set(playerState.pitch, playerState.yaw, 0, "YXZ");
      useHotbarStore.getState().select(playerState.selectedHotbarIndex);
    } else {
      const spawnHeight = sampleColumn(seed, 0, 0).height;
      this.world.spawnPoint = { x: 0.5, y: spawnHeight + 1, z: 0.5 };
      this.player.position = { ...this.world.spawnPoint };
    }
    this.chunkManager.update(this.player.position.x, this.player.position.z);

    const highlightGeometry = new THREE.EdgesGeometry(new THREE.BoxGeometry(1.002, 1.002, 1.002));
    this.highlightMesh = new THREE.LineSegments(highlightGeometry, new THREE.LineBasicMaterial({ color: 0x000000 }));
    this.highlightMesh.visible = false;
    this.scene.add(this.highlightMesh);

    this.playerModel = new PlayerModel();
    this.playerModel.visible = false; // first-person by default — see the F5 view-mode toggle
    this.scene.add(this.playerModel.group);

    this.clouds = new Clouds();
    this.scene.add(this.clouds.group);

    const { campfireY } = getStructureAnchors(seed);
    this.campfire = new CampfireVisual(CAMPFIRE_CENTER.x, campfireY, CAMPFIRE_CENTER.z);
    this.scene.add(this.campfire.group);

    window.addEventListener("resize", this.handleResize);
    window.addEventListener("keydown", this.handleKeyDown);
    window.addEventListener("keyup", this.handleKeyUp);
    window.addEventListener("beforeunload", this.handleBeforeUnload);
    document.addEventListener("visibilitychange", this.handleBeforeUnload);
    canvas.addEventListener("mousedown", this.handleMouseDown);
    canvas.addEventListener("contextmenu", this.handleContextMenu);
    canvas.addEventListener("wheel", this.handleWheel);
  }

  private handleResize = (): void => {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  };

  private handleContextMenu = (e: Event): void => e.preventDefault();

  private handleWheel = (e: WheelEvent): void => {
    useHotbarStore.getState().cycle(Math.sign(e.deltaY));
  };

  private static readonly GAME_KEYS = new Set([
    "KeyW",
    "KeyA",
    "KeyS",
    "KeyD",
    "Space",
    "ShiftLeft",
    "ShiftRight",
    "ControlLeft",
    "ControlRight",
    "ArrowUp",
    "ArrowDown",
    "ArrowLeft",
    "ArrowRight",
  ]);

  private handleKeyDown = (e: KeyboardEvent): void => {
    // Space's browser default is page-scroll, which would visibly yank
    // the canvas out of view the moment the player tries to jump —
    // preventDefault on every game-control key avoids that class of bug.
    if (GameLoop.GAME_KEYS.has(e.code)) e.preventDefault();
    this.pressed.add(e.code);
    if (e.code === "F3") {
      e.preventDefault();
      useHudStore.getState().toggleDebug();
    }
    if (e.code === "Space" && !e.repeat) {
      // e.repeat guards against the browser's key-repeat firing keydown
      // continuously while held — without it, holding Space would flip
      // flying on/off many times a second instead of once per real tap.
      const now = performance.now();
      if (now - this.lastSpaceTapTime < 300) this.player.flying = !this.player.flying;
      this.lastSpaceTapTime = now;
    }
    if (e.code.startsWith("Digit")) {
      const n = Number(e.code.slice(5));
      if (n >= 1 && n <= HOTBAR_SLOTS.length) useHotbarStore.getState().select(n - 1);
    }
    if (e.code === "KeyB" && !e.repeat) {
      useHotbarStore.getState().toggleMode();
    }
    if (e.code === "F5") {
      // F5's browser default is a page refresh, which would lose the
      // session's in-memory state — preventDefault before it can fire.
      e.preventDefault();
      if (!e.repeat) this.viewMode = this.viewMode === "first" ? "third" : "first";
    }
  };

  private handleKeyUp = (e: KeyboardEvent): void => {
    this.pressed.delete(e.code);
  };

  private placeSelectedBlock(): void {
    if (!this.currentTarget) return;
    const { x, y, z } = this.currentTarget.placeAt;
    if (this.overlapsPlayer(x, y, z)) return;
    const blockKey = HOTBAR_SLOTS[useHotbarStore.getState().selectedIndex].key;
    this.chunkManager.applyEdit(x, y, z, getBlockByKey(blockKey).id);
  }

  private breakTargetedBlock(): void {
    if (!this.currentTarget) return;
    const { x, y, z } = this.currentTarget.block;
    this.chunkManager.applyEdit(x, y, z, AIR_ID);
  }

  private handleMouseDown = (e: MouseEvent): void => {
    // Deliberately not gated on mouseLook.isLocked — mining/placing must
    // keep working even if the Pointer Lock API fails to engage (it's
    // finicky across browsers/embeds), so mouse-look is a bonus on top
    // of building, never a prerequisite for it.
    if (e.button === 0) {
      // Left click does whichever action the Build/Break mode selects
      // (see hotbarStore.ts) — right-click-to-place alone isn't reliable
      // across input devices (trackpads, single-button mice), so left
      // click has to be able to do both.
      if (useHotbarStore.getState().mode === "place") this.placeSelectedBlock();
      else this.breakTargetedBlock();
    } else if (e.button === 2) {
      this.placeSelectedBlock();
    }
  };

  private overlapsPlayer(bx: number, by: number, bz: number): boolean {
    const p = this.player.position;
    return (
      bx + 1 > p.x - 0.3 && bx < p.x + 0.3 && bz + 1 > p.z - 0.3 && bz < p.z + 0.3 && by + 1 > p.y && by < p.y + 1.8
    );
  }

  // Always raycasts from the player's actual eye position, not
  // `camera.position` — in third-person that's pulled back several
  // blocks (see the F5 view-mode toggle), and reach shouldn't change
  // just because the camera is looking over the character's shoulder.
  private computeTargetHit(): RaycastHit | null {
    const direction = new THREE.Vector3();
    this.camera.getWorldDirection(direction);
    const eye = { x: this.player.position.x, y: this.player.position.y + EYE_HEIGHT, z: this.player.position.z };
    return raycastVoxels(this.world, eye, direction);
  }

  // Waits until the initial chunk load settles (so ground actually
  // exists to snap to) before scattering a few ambient passive creatures
  // near spawn. Positions are randomized, not seed-derived — creature
  // placement isn't part of world generation's determinism contract
  // (spec/01-tech-stack-architecture.md §9 scopes that to terrain only).
  private trySpawnCreatures(): void {
    if (this.creaturesSpawned || this.chunkManager.pendingCount > 0 || this.chunkManager.loadedChunkCount === 0) {
      return;
    }
    this.creaturesSpawned = true;

    const plan: { species: CreatureSpecies; count: number }[] = [
      { species: "sheep", count: 3 },
      { species: "llama", count: 2 },
      { species: "cat", count: 2 },
    ];
    const origin = this.player.position;

    for (const { species, count } of plan) {
      for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const radius = 6 + Math.random() * 14;
        const x = origin.x + Math.cos(angle) * radius;
        const z = origin.z + Math.sin(angle) * radius;
        const y = findSurfaceY(this.world, x, z);
        if (y === null) continue;

        const creature = new Creature(species, x, y, z);
        this.creatures.push(creature);
        this.scene.add(creature.mesh);
      }
    }
  }

  private buildPlayerInput(): PlayerInput {
    return {
      forward: (this.pressed.has("KeyW") ? 1 : 0) - (this.pressed.has("KeyS") ? 1 : 0),
      right: (this.pressed.has("KeyD") ? 1 : 0) - (this.pressed.has("KeyA") ? 1 : 0),
      jump: this.pressed.has("Space"),
      sprint: this.pressed.has("ControlLeft") || this.pressed.has("ControlRight"),
      flyUp: this.pressed.has("Space"),
      flyDown: this.pressed.has("ShiftLeft") || this.pressed.has("ShiftRight"),
    };
  }

  start(): void {
    this.rafHandle = requestAnimationFrame(this.frame);
  }

  private frame = (now: number): void => {
    if (this.disposed) return;
    const frameStart = performance.now();
    const dt = Math.min((now - this.lastFrameTime) / 1000, 0.25);
    this.lastFrameTime = now;

    this.accumulator += dt;
    let steps = 0;
    while (this.accumulator >= SIM_DT && steps < MAX_SIM_STEPS_PER_FRAME) {
      // Arrow keys pan the view — a keyboard alternative to mouse-look,
      // since Pointer Lock is unreliable across browsers/embeds (same
      // "don't require the finicky thing" reasoning as movement below).
      const panYaw = (this.pressed.has("ArrowRight") ? 1 : 0) - (this.pressed.has("ArrowLeft") ? 1 : 0);
      const panPitch = (this.pressed.has("ArrowUp") ? 1 : 0) - (this.pressed.has("ArrowDown") ? 1 : 0);
      if (panYaw !== 0 || panPitch !== 0) {
        this.mouseLook.panBy(this.camera, panYaw * ARROW_PAN_SPEED * SIM_DT, panPitch * ARROW_PAN_SPEED * SIM_DT);
      }

      // Movement runs regardless of Pointer Lock state — mouse-look
      // (camera rotation) is a bonus on top of WASD, never a
      // prerequisite for it (same reasoning as handleMouseDown above).
      const axes = this.mouseLook.getMoveAxes(this.camera);
      this.player.tick(SIM_DT, this.world, this.buildPlayerInput(), axes.forward, axes.right);
      for (const creature of this.creatures) creature.tick(SIM_DT, this.world);
      this.simTick++;
      this.accumulator -= SIM_DT;
      steps++;
    }

    const eyeX = this.player.position.x;
    const eyeY = this.player.position.y + EYE_HEIGHT;
    const eyeZ = this.player.position.z;
    if (this.viewMode === "first") {
      this.camera.position.set(eyeX, eyeY, eyeZ);
    } else {
      const forward = new THREE.Vector3();
      this.camera.getWorldDirection(forward);
      this.camera.position
        .set(eyeX, eyeY, eyeZ)
        .addScaledVector(forward, -THIRD_PERSON_DISTANCE)
        .add(new THREE.Vector3(0, THIRD_PERSON_UP_OFFSET, 0));
    }

    const bodyYaw = new THREE.Euler().setFromQuaternion(this.camera.quaternion, "YXZ").y;
    const horizontalSpeed = Math.hypot(this.player.velocity.x, this.player.velocity.z);
    this.playerModel.update(this.player.position, bodyYaw, horizontalSpeed, dt);
    this.playerModel.visible = this.viewMode === "third";

    this.clouds.update(dt, this.player.position.x, this.player.position.z);
    this.sky.update(this.player.position);
    this.campfire.update(dt);

    this.chunkManager.update(this.player.position.x, this.player.position.z);
    this.trySpawnCreatures();

    this.currentTarget = this.computeTargetHit();
    if (this.currentTarget) {
      this.highlightMesh.position.set(
        this.currentTarget.block.x + 0.5,
        this.currentTarget.block.y + 0.5,
        this.currentTarget.block.z + 0.5,
      );
      this.highlightMesh.visible = true;
    } else {
      this.highlightMesh.visible = false;
    }

    this.renderer.render(this.scene, this.camera);

    this.fpsFrameCount++;
    const sinceWindowStart = frameStart - this.fpsWindowStart;
    if (sinceWindowStart >= 500) {
      this.currentFps = Math.round((this.fpsFrameCount * 1000) / sinceWindowStart);
      this.fpsFrameCount = 0;
      this.fpsWindowStart = frameStart;
    }

    const frameTimeMs = performance.now() - frameStart;
    const yaw = THREE.MathUtils.radToDeg(new THREE.Euler().setFromQuaternion(this.camera.quaternion, "YXZ").y);
    const biomeKey = biomeKeyFromIndex(
      sampleBiomeIndexAt(this.world.seed, Math.floor(this.player.position.x), Math.floor(this.player.position.z)),
    );
    useHudStore.getState().setDebug({
      fps: this.currentFps,
      frameTimeMs,
      position: { x: this.player.position.x, y: this.player.position.y, z: this.player.position.z },
      facingYawDeg: yaw,
      chunkCount: this.chunkManager.loadedChunkCount,
      simTick: this.simTick,
      worldSeed: this.world.seed,
      pointerLocked: this.mouseLook.isLocked,
      biome: biomeKey,
      targetBlock: this.currentTarget ? getBlockById(this.currentTarget.blockId).name : null,
      pendingChunkOps: this.chunkManager.pendingCount,
      flying: this.player.flying,
      viewMode: this.viewMode,
    });

    this.rafHandle = requestAnimationFrame(this.frame);
  };

  // Captures live position/look/mode into a save-ready snapshot. Called
  // both from a real page-unload (the only path guaranteed to fire on a
  // hard reload/tab close — React's unmount cleanup does not) and from
  // dispose() (dev HMR, or a future in-game "back to menu").
  private savePlayerStateNow = (): void => {
    const euler = new THREE.Euler().setFromQuaternion(this.camera.quaternion, "YXZ");
    void this.saveManager.savePlayerState({
      position: this.player.position,
      yaw: euler.y,
      pitch: euler.x,
      flying: this.player.flying,
      selectedHotbarIndex: useHotbarStore.getState().selectedIndex,
    });
  };

  private handleBeforeUnload = (): void => {
    this.savePlayerStateNow();
  };

  dispose(): void {
    this.disposed = true;
    cancelAnimationFrame(this.rafHandle);
    window.removeEventListener("resize", this.handleResize);
    window.removeEventListener("keydown", this.handleKeyDown);
    window.removeEventListener("keyup", this.handleKeyUp);
    window.removeEventListener("beforeunload", this.handleBeforeUnload);
    document.removeEventListener("visibilitychange", this.handleBeforeUnload);
    this.canvas.removeEventListener("mousedown", this.handleMouseDown);
    this.canvas.removeEventListener("contextmenu", this.handleContextMenu);
    this.canvas.removeEventListener("wheel", this.handleWheel);
    this.mouseLook.dispose();
    this.chunkManager.dispose();
    for (const creature of this.creatures) {
      this.scene.remove(creature.mesh);
      creature.dispose();
    }
    this.scene.remove(this.playerModel.group);
    this.playerModel.dispose();
    this.scene.remove(this.clouds.group);
    this.clouds.dispose();
    this.sky.dispose();
    this.scene.remove(this.campfire.group);
    this.campfire.dispose();
    this.renderer.dispose();

    this.savePlayerStateNow();
    void this.saveManager.flushDirtyChunks();
    this.saveManager.dispose();
  }
}
