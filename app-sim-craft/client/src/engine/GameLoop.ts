// Owns the Three.js renderer/scene and the fixed-timestep sim tick, per
// spec/01-tech-stack-architecture.md §2 and §8. React never drives this
// loop — it only reads a throttled snapshot pushed into hudStore once
// per render frame.
import * as THREE from "three";
import { World } from "./World";
import { MouseLook } from "./Camera";
import { Player, EYE_HEIGHT, type PlayerInput } from "./Player";
import { ChunkManager, RENDER_DISTANCE_COLUMNS } from "./ChunkManager";
import { raycastVoxels, type RaycastHit } from "./Raycaster";
import { Creature, findSurfaceY, ALL_SPECIES } from "./Creature";
import {
  Fish,
  findNearbyWaterSpots,
  sampleRandom,
  pickSwimY,
  spawnDepthFor,
  ALL_FISH_SPECIES,
  BIG_AQUATIC_SPECIES,
} from "./Fish";
import { Dragon, createDragons } from "./Dragon";
import { LightPool } from "./LightPool";
import type { Rideable, RideInput } from "./Rideable";
import { DEEP_LAKE_CENTER, DEEP_LAKE_RADIUS } from "./worldgen/deepLake";
import { Car, type CarInput } from "./Car";
import { pointAtProgress, roadDeckYAtProgress, LOOP_PERIMETER } from "./worldgen/roads";
import { PlayerModel } from "./PlayerModel";
import { HeldItem } from "./HeldItem";
import { Clouds } from "./Clouds";
import { Sky, dayFactorAt, getSystemTimeOfDay, isNight } from "./Sky";
import { updateTexturedMaterial } from "../rendering/texturedMaterial";
import { useTimeStore } from "../state/timeStore";
import { CampfireVisual } from "./CampfireVisual";
import { StreetLamp } from "./StreetLamp";
import { CastleBanners } from "./CastleBanners";
import { Torch } from "./Torch";
import { Flag } from "./Flag";
import { CAMPFIRE_SITES, CASTLE_CENTER, CASTLE_GATE_SPAWN, LAMP_SITES, LAMP_POST_HEIGHT, getStructureAnchors } from "./worldgen/structures";
import { MiniMap, type MiniMapMarker } from "./MiniMap";
import { AIR_ID, getBlockById, getBlockByKey } from "../data/blocks";
import { sampleColumn, biomeKeyFromIndex, sampleBiomeIndexAt } from "./worldgen/terrain";
import { useHudStore } from "../state/hudStore";
import { useHotbarStore, HOTBAR_SLOTS } from "../state/hotbarStore";
import { useMinimapStore } from "../state/minimapStore";
import { SaveManager } from "../persistence/SaveManager";
import type { MapMarkerRecord, TorchRecord } from "../persistence/db";

const SIM_HZ = 20;
const SIM_DT = 1 / SIM_HZ;
const MAX_SIM_STEPS_PER_FRAME = 5;
const ARROW_PAN_SPEED = 2.2; // radians/sec
const THIRD_PERSON_DISTANCE = 4.5;
const THIRD_PERSON_UP_OFFSET = 1.0;
const BIG_AQUATIC_SPAWN_SCAN_RADIUS = 110; // blocks around the player to look for deep water to spawn a shark/whale in
const MIN_RIDE_ZOOM = 0.5; // multiplier on a mount's own chase-cam distance, adjusted with the mouse wheel
const MAX_RIDE_ZOOM = 6;
const DRIVING_EYE_HEIGHT = 0.9; // camera anchor above a car's ground-snapped position
const ENTER_VEHICLE_RANGE = 3;
// Real (shader-evaluated) dynamic lights at once — see LightPool.ts: every extra one costs every lit fragment on screen, so lamps, camps, torches and headlights share this handful, re-aimed at whichever are nearest the camera.
const LIGHT_POOL_SIZE = 6;
const MAX_PIXEL_RATIO = 2;
const MIN_PIXEL_RATIO = 0.75;
const ADAPT_LOW_FPS = 38; // below this for 1.5s, drop the render resolution a step
const ADAPT_HIGH_FPS = 57; // at/above this for 15s, take a step back up
const CAR_COUNT = 6;
const CAR_COLORS = [0xc0392b, 0x2980b9, 0xf1c40f, 0x27ae60, 0xecf0f1, 0xe67e22];
const HOLD_REPEAT_INTERVAL = 0.15; // seconds between repeats while the primary action is held down

type ViewMode = "first" | "third";

function clamp1(v: number): number {
  return Math.max(-1, Math.min(1, v));
}

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
  private readonly fish: Fish[] = [];
  private fishSpawned = false;
  private readonly dragons: Dragon[];
  // Whatever the player is currently riding (an animal, a shark/whale, the
  // dragon) — cars are separate (drivingCar) since they're on rails and
  // have their own AI/parking rules.
  private mounted: Rideable | null = null;
  private rideCameraZoom = 1;
  private viewModeBeforeMount: ViewMode | null = null;
  // Set by teleportToCastle: the player is held in place (no gravity) until the destination's terrain has streamed in, then snapped onto the ground.
  private teleportPending: { x: number; z: number } | null = null;
  private lastMapYaw = 0;
  private readonly cars: Car[] = [];
  private carsSpawned = false;
  private drivingCar: Car | null = null;
  private readonly playerModel: PlayerModel;
  private readonly heldItem: HeldItem;
  private readonly clouds: Clouds;
  private readonly sky: Sky;
  private readonly campfires: CampfireVisual[];
  private readonly streetLamps: StreetLamp[];
  private readonly lightPool: LightPool;
  private readonly castleBanners: CastleBanners;
  private readonly miniMap: MiniMap;
  private customMarkers: MapMarkerRecord[] = [];
  private flagVisuals: Flag[] = [];
  private torchRecords: TorchRecord[] = [];
  private torchVisuals: Torch[] = [];
  private viewMode: ViewMode = "first";

  private readonly pressed = new Set<string>();
  private lastSpaceTapTime = 0;
  private currentTarget: RaycastHit | null = null;

  // Touch-input state (Part A/B/C of the mobile controls feature) — fed
  // by ui/TouchJoystick.tsx, TouchLookArea.tsx and TouchActionButtons.tsx
  // via engine/activeGameLoop.ts's handle, the same way the desktop path
  // populates `pressed` from keydown/keyup. Always zero/false on desktop
  // (nothing ever calls these setters there), so buildPlayerInput()
  // combining them with keyboard state below is a no-op on desktop.
  private touchMoveVector = { x: 0, y: 0 };
  private touchJumpHeld = false;
  private touchFlyUpHeld = false;
  private touchFlyDownHeld = false;

  // Whether the primary action (left mouse / the touch action button) is
  // currently held down — every mode repeats its action while it is (see
  // the frame loop's holdCooldown countdown below).
  private primaryActionHeld = false;
  private holdCooldown = 0;

  private simTick = 0;
  private accumulator = 0;
  private lastFrameTime = performance.now();
  private fpsFrameCount = 0;
  private fpsWindowStart = performance.now();
  private currentFps = 0;
  // Dynamic resolution: if the frame rate sags, render at a lower pixel ratio (crisp UI is DOM, so only the 3D view softens) and creep back up when there's headroom.
  private maxPixelRatio = 1;
  private pixelRatio = 1;
  private slowWindows = 0;
  private fastWindows = 0;
  private rafHandle = 0;
  private disposed = false;

  static async create(
    canvas: HTMLCanvasElement,
    minimapCanvas: HTMLCanvasElement,
    worldId: string,
    renderDistanceColumns: number = RENDER_DISTANCE_COLUMNS,
  ): Promise<GameLoop> {
    const saveManager = new SaveManager();
    const { seed, playerState } = await saveManager.load(worldId);
    return new GameLoop(canvas, minimapCanvas, seed, saveManager, playerState, renderDistanceColumns);
  }

  private constructor(
    canvas: HTMLCanvasElement,
    minimapCanvas: HTMLCanvasElement,
    seed: number,
    saveManager: SaveManager,
    playerState: Awaited<ReturnType<SaveManager["load"]>>["playerState"],
    renderDistanceColumns: number,
  ) {
    this.saveManager = saveManager;
    this.canvas = canvas;

    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.maxPixelRatio = Math.min(window.devicePixelRatio, MAX_PIXEL_RATIO);
    this.pixelRatio = this.maxPixelRatio;
    this.renderer.setPixelRatio(this.pixelRatio);
    this.renderer.setSize(window.innerWidth, window.innerHeight);

    this.scene = new THREE.Scene();

    this.camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 1000);
    // The camera itself needs to be part of the scene graph for its
    // children (the held-item viewmodel below) to render at all — a
    // camera doesn't have to be in the scene to be used for rendering,
    // but anything parented to it does.
    this.scene.add(this.camera);
    this.mouseLook = new MouseLook(this.camera, canvas);

    this.sky = new Sky(this.scene);
    this.lightPool = new LightPool(this.scene, LIGHT_POOL_SIZE);

    this.world = new World(seed);
    this.chunkManager = new ChunkManager(this.world, this.scene, saveManager, renderDistanceColumns);

    this.player = new Player();
    if (playerState) {
      this.player.position = { ...playerState.position };
      this.player.flying = playerState.flying;
      this.camera.rotation.set(playerState.pitch, playerState.yaw, 0, "YXZ");
      useHotbarStore.getState().select(playerState.selectedHotbarIndex);
      this.customMarkers = playerState.markers ? [...playerState.markers] : [];
      this.torchRecords = playerState.torches ? [...playerState.torches] : [];
    } else {
      const spawnHeight = sampleColumn(seed, 0, 0).height;
      this.world.spawnPoint = { x: 0.5, y: spawnHeight + 1, z: 0.5 };
      this.player.position = { ...this.world.spawnPoint };
    }
    this.chunkManager.update(this.player.position.x, this.player.position.z);
    this.lightPool.update(this.camera.position);

    const highlightGeometry = new THREE.EdgesGeometry(new THREE.BoxGeometry(1.002, 1.002, 1.002));
    this.highlightMesh = new THREE.LineSegments(highlightGeometry, new THREE.LineBasicMaterial({ color: 0x000000 }));
    this.highlightMesh.visible = false;
    this.scene.add(this.highlightMesh);

    this.playerModel = new PlayerModel();
    this.playerModel.visible = false; // first-person by default — see the F5 view-mode toggle
    this.scene.add(this.playerModel.group);

    this.heldItem = new HeldItem();
    this.camera.add(this.heldItem.group);

    this.clouds = new Clouds();
    this.scene.add(this.clouds.group);

    const { campfireYs, lampYs, peakY } = getStructureAnchors(seed);
    this.campfires = CAMPFIRE_SITES.map((site, i) => new CampfireVisual(site.x, campfireYs[i], site.z));
    for (const campfire of this.campfires) this.scene.add(campfire.group);

    this.streetLamps = LAMP_SITES.map((site, i) => new StreetLamp(site.x, lampYs[i], site.z, LAMP_POST_HEIGHT));
    for (const lamp of this.streetLamps) this.scene.add(lamp.group);

    this.castleBanners = new CastleBanners();
    this.scene.add(this.castleBanners.group);

    this.dragons = createDragons(peakY);
    for (const dragon of this.dragons) this.scene.add(dragon.mesh);

    this.syncFlagVisuals();
    this.syncTorchVisuals();

    this.miniMap = new MiniMap(minimapCanvas, seed);

    window.addEventListener("resize", this.handleResize);
    window.addEventListener("keydown", this.handleKeyDown);
    window.addEventListener("keyup", this.handleKeyUp);
    window.addEventListener("beforeunload", this.handleBeforeUnload);
    document.addEventListener("visibilitychange", this.handleBeforeUnload);
    canvas.addEventListener("mousedown", this.handleMouseDown);
    // On window, not canvas — releasing the button after dragging off
    // the canvas (or off-screen entirely) must still stop a held action
    // from repeating forever.
    window.addEventListener("mouseup", this.handleMouseUp);
    canvas.addEventListener("contextmenu", this.handleContextMenu);
    canvas.addEventListener("wheel", this.handleWheel);
  }

  private adaptResolution(fps: number): void {
    if (fps < ADAPT_LOW_FPS) {
      this.fastWindows = 0;
      if (++this.slowWindows >= 3 && this.pixelRatio > MIN_PIXEL_RATIO) {
        this.slowWindows = 0;
        this.setPixelRatio(Math.max(MIN_PIXEL_RATIO, this.pixelRatio - 0.25));
      }
    } else if (fps >= ADAPT_HIGH_FPS) {
      this.slowWindows = 0;
      if (++this.fastWindows >= 30 && this.pixelRatio < this.maxPixelRatio) {
        this.fastWindows = 0;
        this.setPixelRatio(Math.min(this.maxPixelRatio, this.pixelRatio + 0.25));
      }
    } else {
      this.slowWindows = 0;
      this.fastWindows = 0;
    }
  }

  private setPixelRatio(ratio: number): void {
    this.pixelRatio = ratio;
    this.renderer.setPixelRatio(ratio);
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  private handleResize = (): void => {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  };

  private handleContextMenu = (e: Event): void => e.preventDefault();

  private handleWheel = (e: WheelEvent): void => {
    if (this.mounted) {
      // The hotbar is idle while riding, so the wheel zooms the chase cam
      // instead: scroll down to pull back (far enough to see the whole
      // dragon), up to come in.
      const step = Math.max(-100, Math.min(100, e.deltaY));
      this.rideCameraZoom = Math.max(MIN_RIDE_ZOOM, Math.min(MAX_RIDE_ZOOM, this.rideCameraZoom * Math.exp(step * 0.0015)));
      return;
    }
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
    if (e.code === "KeyM" && !e.repeat) {
      // Full-screen map: M opens and closes it. It's a non-blocking
      // overlay (ui/FullMap.tsx), so the player keeps moving underneath —
      // don't clear held keys or ignore game input while it's open.
      useMinimapStore.getState().toggleFullMap();
      return;
    }
    if (e.code === "Escape") useMinimapStore.getState().closeFullMap();
    this.pressed.add(e.code);
    if (e.code === "F3") {
      e.preventDefault();
      useHudStore.getState().toggleDebug();
    }
    if (e.code === "Space" && !e.repeat) {
      // e.repeat guards against the browser's key-repeat firing keydown
      // continuously while held — without it, holding Space would flip
      // flying (or fire nitro) many times a second instead of once per
      // real tap.
      const now = performance.now();
      if (now - this.lastSpaceTapTime < 300) {
        // While driving, double-tap Space is nitro instead of the fly
        // toggle — flying isn't meaningful for a car, so the same
        // gesture is free to mean something else in that context. While
        // riding the dragon it's turbo; on any other mount Space is already
        // climb (buildRideInput) and the player's own flying state is
        // inert (position is glued to the mount), so the tap is ignored.
        if (this.drivingCar) this.drivingCar.activateNitro();
        else if (this.mounted) {
          if (this.mounted instanceof Dragon) this.mounted.toggleTurbo();
        } else this.player.flying = !this.player.flying;
      }
      this.lastSpaceTapTime = now;
    }
    if (e.code.startsWith("Digit")) {
      const n = Number(e.code.slice(5));
      if (n >= 1 && n <= HOTBAR_SLOTS.length) useHotbarStore.getState().select(n - 1);
    }
    if (e.code === "KeyB" && !e.repeat) {
      useHotbarStore.getState().cycleMode();
    }
    // Direct mode hotkeys, alongside B's cycle — Z/X/C/V mirrors the
    // Hotbar's Break/Build/Torch/Flag button order (see ui/Hotbar.tsx).
    if (e.code === "KeyZ" && !e.repeat) useHotbarStore.getState().setMode("break");
    if (e.code === "KeyX" && !e.repeat) useHotbarStore.getState().setMode("place");
    if (e.code === "KeyC" && !e.repeat) useHotbarStore.getState().setMode("torch");
    if (e.code === "KeyV" && !e.repeat) useHotbarStore.getState().setMode("flag");
    if (e.code === "KeyE" && !e.repeat) {
      this.handleInteractKey();
    }
    if (e.code === "KeyH" && !e.repeat) this.teleportToCastle();
    if (e.code === "KeyK" && !e.repeat) {
      this.toggleMarkerAtPlayer();
    }
    if (e.code === "Minus" && !e.repeat) useMinimapStore.getState().zoomOut();
    if (e.code === "Equal" && !e.repeat) useMinimapStore.getState().zoomIn();
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
      // Left click does whichever action the current mode selects — see
      // triggerPrimaryAction, shared with the touch action button below.
      // Held state drives the repeat-while-held loop in frame().
      this.primaryActionHeld = true;
      this.triggerPrimaryAction();
    } else if (e.button === 2) {
      // Right-click is a quick block-place shortcut for the break/place
      // modes only — Torch/Flag don't have a natural second action, so
      // it's left as a no-op there rather than surprising placing a
      // hotbar block instead.
      const mode = useHotbarStore.getState().mode;
      if (mode === "break" || mode === "place") this.placeSelectedBlock();
    }
  };

  private handleMouseUp = (e: MouseEvent): void => {
    if (e.button === 0) this.primaryActionHeld = false;
  };

  /** Touch counterpart to handleMouseUp/primaryActionHeld — see ui/TouchActionButtons.tsx's primary action button. */
  setPrimaryActionHeld(held: boolean): void {
    this.primaryActionHeld = held;
  }

  /**
   * Whichever action the current Build/Break mode selects (see
   * hotbarStore.ts) — shared by desktop's left-click (handleMouseDown
   * above) and the touch action button (ui/TouchActionButtons.tsx via
   * engine/activeGameLoop.ts), so both trigger identically instead of
   * touch inventing its own semantics. Fires once per call, matching
   * mousedown's own single fire; continued repeats while the button is
   * held come from the frame loop's holdCooldown countdown (see frame()
   * below), which calls back in with `isRepeat`. The initial call acts
   * immediately rather than waiting out that cooldown, and resets it so
   * the two don't double up.
   *
   * Torch/Flag are toggles on the first press (pressing on an existing
   * one removes it), but a *repeat* only ever adds — otherwise holding
   * the button over one spot would flip it on and off every interval.
   */
  triggerPrimaryAction(isRepeat = false): void {
    const mode = useHotbarStore.getState().mode;
    if (mode === "place") this.placeSelectedBlock();
    else if (mode === "break") this.breakTargetedBlock();
    else if (mode === "torch") this.placeTorchAtTarget(isRepeat);
    else if (mode === "flag") this.placeFlagAtTarget(isRepeat);
    this.holdCooldown = HOLD_REPEAT_INTERVAL;
  }

  /** Mirrors the desktop double-tap-Space gesture — a single tap is enough on touch, see ui/TouchActionButtons.tsx: nitro in a car, turbo on the dragon, otherwise the fly toggle. */
  toggleFlying(): void {
    if (this.drivingCar) this.drivingCar.activateNitro();
    else if (this.mounted) {
      if (this.mounted instanceof Dragon) this.mounted.toggleTurbo();
    } else this.player.flying = !this.player.flying;
  }

  /** The E key's action (hop in/out of a car, mount/dismount an animal or dragon) — the touch prompt button in ui/VehiclePrompt.tsx calls this. */
  interact(): void {
    this.handleInteractKey();
  }

  /** The F5 key's action: switch between first- and third-person views. */
  toggleViewMode(): void {
    this.viewMode = this.viewMode === "first" ? "third" : "first";
  }

  /** Feeds a raw touch-drag pixel delta through the exact same yaw/pitch math mouse-look uses — see Camera.ts's applyPointerDelta. */
  applyTouchLookDelta(deltaX: number, deltaY: number): void {
    this.mouseLook.applyPointerDelta(this.camera, deltaX, deltaY);
  }

  /** {x, y} already in buildPlayerInput()'s forward/right shape (see touchMath.ts's computeJoystickVector) — ui/TouchJoystick.tsx calls this on every drag/release. */
  setTouchMoveVector(x: number, y: number): void {
    this.touchMoveVector = { x, y };
  }

  setTouchJump(held: boolean): void {
    this.touchJumpHeld = held;
  }

  setTouchFlyUp(held: boolean): void {
    this.touchFlyUpHeld = held;
  }

  setTouchFlyDown(held: boolean): void {
    this.touchFlyDownHeld = held;
  }

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
  // exists to snap to) before scattering ambient passive creatures near
  // spawn — two of every species, wide enough to feel like a populated
  // world rather than a small huddle. Positions are randomized, not
  // seed-derived — creature placement isn't part of world generation's
  // determinism contract (spec/01-tech-stack-architecture.md §9 scopes
  // that to terrain only). updateAmbientCreatures keeps them "everywhere"
  // as the player roams: it despawns stragglers left far behind and
  // spawns fresh ones out ahead, capped so the population never grows
  // unbounded over a long session.
  private trySpawnCreatures(): void {
    if (this.creaturesSpawned || this.chunkManager.pendingCount > 0 || this.chunkManager.loadedChunkCount === 0) {
      return;
    }
    this.creaturesSpawned = true;

    const origin = this.player.position;
    for (const species of ALL_SPECIES) {
      for (let i = 0; i < 2; i++) {
        const angle = Math.random() * Math.PI * 2;
        const radius = 8 + Math.random() * 40;
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

  private static readonly MAX_CREATURES = 60;
  private static readonly CREATURE_SPAWN_INTERVAL = 5; // seconds
  private static readonly CREATURE_DESPAWN_RADIUS = 110;
  private creatureSpawnTimer = 0;

  private updateAmbientCreatures(dt: number): void {
    for (let i = this.creatures.length - 1; i >= 0; i--) {
      const creature = this.creatures[i];
      const dist = Math.hypot(creature.position.x - this.player.position.x, creature.position.z - this.player.position.z);
      if (dist <= GameLoop.CREATURE_DESPAWN_RADIUS) continue;
      this.scene.remove(creature.mesh);
      creature.dispose();
      this.creatures.splice(i, 1);
    }

    if (!this.creaturesSpawned) return; // wait for the initial batch first
    this.creatureSpawnTimer -= dt;
    if (this.creatureSpawnTimer > 0) return;
    this.creatureSpawnTimer = GameLoop.CREATURE_SPAWN_INTERVAL;

    const spawnCount = 1 + Math.floor(Math.random() * 3);
    for (let i = 0; i < spawnCount && this.creatures.length < GameLoop.MAX_CREATURES; i++) {
      const species = ALL_SPECIES[Math.floor(Math.random() * ALL_SPECIES.length)];
      const angle = Math.random() * Math.PI * 2;
      const radius = 20 + Math.random() * 55;
      const x = this.player.position.x + Math.cos(angle) * radius;
      const z = this.player.position.z + Math.sin(angle) * radius;
      const y = findSurfaceY(this.world, x, z);
      if (y === null) continue;

      const creature = new Creature(species, x, y, z);
      this.creatures.push(creature);
      this.scene.add(creature.mesh);
    }
  }

  // Same "wait for the world to exist" gating as trySpawnCreatures. Scans
  // for actual nearby water (findNearbyWaterSpots) rather than throwing
  // random darts at the map — swimmable water is a small fraction of the
  // surface, so a handful of random points almost always misses even a
  // real, nearby lake entirely (verified empirically: under 1% hit rate
  // at this search radius). A handful of fish per lake found reads as a
  // small school rather than one lone fish per body of water.
  private trySpawnFish(): void {
    if (this.fishSpawned || this.chunkManager.pendingCount > 0 || this.chunkManager.loadedChunkCount === 0) {
      return;
    }
    this.fishSpawned = true;

    const origin = this.player.position;
    const spots = findNearbyWaterSpots(this.world, origin.x, origin.z, 55, 150);
    for (const spot of sampleRandom(spots, 18)) {
      if (this.fish.length >= GameLoop.MAX_FISH) break;
      this.spawnFishAt(spot);
    }
  }

  private spawnFishAt(spot: { x: number; z: number; top: number; bottom: number }): void {
    const species = ALL_FISH_SPECIES[Math.floor(Math.random() * ALL_FISH_SPECIES.length)];
    this.addFish(new Fish(species, spot.x + Math.random(), pickSwimY(species, spot), spot.z + Math.random()));
  }

  private addFish(fish: Fish): void {
    this.fish.push(fish);
    this.scene.add(fish.mesh);
  }

  // Sharks and whales only live in the deep lake (worldgen/deepLake.ts) —
  // nowhere else is deep enough — so instead of the ambient near-the-player
  // scan they're topped back up to a fixed headcount by scanning the lake
  // itself, whenever the player is anywhere near it. Exempt from MAX_FISH
  // (that cap is about the swarm of tiny ones) and from the tighter
  // despawn radius below, so one doesn't vanish the moment the player
  // paddles across a lake that's wider than the reef fish's 90 blocks.
  private static readonly BIG_AQUATIC_TARGETS = { shark: 5, whale: 2 } as const;
  private static readonly BIG_AQUATIC_DESPAWN_RADIUS = 320;

  private topUpBigAquatics(): void {
    const p = this.player.position;
    if (Math.hypot(p.x - DEEP_LAKE_CENTER.x, p.z - DEEP_LAKE_CENTER.z) > DEEP_LAKE_RADIUS + 40) return;
    for (const species of BIG_AQUATIC_SPECIES) {
      const have = this.fish.filter((f) => f.species === species).length;
      if (have >= GameLoop.BIG_AQUATIC_TARGETS[species]) continue;
      // Scan around the player (where chunks are actually loaded), not the
      // lake's center, which can be far outside the loaded area now that the lake is so wide.
      const spots = findNearbyWaterSpots(this.world, p.x, p.z, BIG_AQUATIC_SPAWN_SCAN_RADIUS, 200, spawnDepthFor(species));
      const [spot] = sampleRandom(spots, 1);
      if (spot) this.addFish(new Fish(species, spot.x + Math.random(), pickSwimY(species, spot), spot.z + Math.random()));
    }
  }

  private static readonly MAX_FISH = 40;
  private static readonly FISH_SPAWN_INTERVAL = 6; // seconds
  private static readonly FISH_DESPAWN_RADIUS = 90;
  private fishSpawnTimer = 0;

  private updateAmbientFish(dt: number): void {
    for (let i = this.fish.length - 1; i >= 0; i--) {
      const f = this.fish[i];
      const dist = Math.hypot(f.position.x - this.player.position.x, f.position.z - this.player.position.z);
      if (dist <= (f.isBig ? GameLoop.BIG_AQUATIC_DESPAWN_RADIUS : GameLoop.FISH_DESPAWN_RADIUS)) continue;
      this.scene.remove(f.mesh);
      f.dispose();
      this.fish.splice(i, 1);
    }

    if (!this.fishSpawned) return; // wait for the initial batch first
    this.fishSpawnTimer -= dt;
    if (this.fishSpawnTimer > 0) return;
    this.fishSpawnTimer = GameLoop.FISH_SPAWN_INTERVAL;
    this.topUpBigAquatics();
    if (this.fish.length >= GameLoop.MAX_FISH) return;

    const spots = findNearbyWaterSpots(this.world, this.player.position.x, this.player.position.z, 40, 60);
    const spawnCount = 1 + Math.floor(Math.random() * 3);
    for (const spot of sampleRandom(spots, spawnCount)) {
      if (this.fish.length >= GameLoop.MAX_FISH) break;
      this.spawnFishAt(spot);
    }
  }

  /** What the full-screen map (ui/FullMap.tsx) needs each frame it's open: the seed to sample terrain from, where the player is and which way they face, and the live landmark markers (not the swarm of creatures/fish). */
  getMapSnapshot(): { seed: number; playerX: number; playerZ: number; playerYaw: number; markers: MiniMapMarker[] } {
    return {
      seed: this.world.seed,
      playerX: this.player.position.x,
      playerZ: this.player.position.z,
      playerYaw: this.lastMapYaw,
      markers: this.buildMiniMapMarkers().filter((m) => m.kind !== "creature" && m.kind !== "fish" && m.kind !== "torch"),
    };
  }

  /** Landmark + live-creature markers for the minimap. Cheap to rebuild every frame — a handful of fixed points plus one per creature/fish. */
  private buildMiniMapMarkers(): MiniMapMarker[] {
    const markers: MiniMapMarker[] = [{ x: CASTLE_CENTER.x, z: CASTLE_CENTER.z, kind: "castle" }];
    for (const dragon of this.dragons) markers.push({ x: dragon.position.x, z: dragon.position.z, kind: "dragon" });
    for (const site of CAMPFIRE_SITES) markers.push({ x: site.x, z: site.z, kind: "campfire" });
    for (const creature of this.creatures) markers.push({ x: creature.position.x, z: creature.position.z, kind: "creature" });
    for (const f of this.fish) markers.push({ x: f.position.x, z: f.position.z, kind: "fish" });
    for (const marker of this.customMarkers) markers.push({ x: marker.x, z: marker.z, kind: "custom" });
    for (const torch of this.torchRecords) markers.push({ x: torch.x, z: torch.z, kind: "torch" });
    return markers;
  }

  // Same "wait for ground to exist" gating as trySpawnCreatures. Cars are
  // spaced evenly around the loop road (worldgen/roads.ts) so they start
  // out already spread around the track their AI drives.
  private trySpawnCars(): void {
    if (this.carsSpawned || this.chunkManager.pendingCount > 0 || this.chunkManager.loadedChunkCount === 0) {
      return;
    }
    this.carsSpawned = true;

    for (let i = 0; i < CAR_COUNT; i++) {
      const progress = (LOOP_PERIMETER / CAR_COUNT) * i;
      const { x, z } = pointAtProgress(progress);
      const y = findSurfaceY(this.world, x, z) ?? roadDeckYAtProgress(progress);

      const car = new Car(CAR_COLORS[i % CAR_COLORS.length], y, progress);
      this.cars.push(car);
      this.scene.add(car.mesh);
    }
  }

  /** Nearest car the player is close enough to hop into, or null. */
  private findNearbyEnterableCar(): Car | null {
    let nearest: Car | null = null;
    let nearestDist = ENTER_VEHICLE_RANGE;
    for (const car of this.cars) {
      if (car.driven) continue;
      const d = Math.hypot(car.position.x - this.player.position.x, car.position.z - this.player.position.z);
      if (d < nearestDist) {
        nearest = car;
        nearestDist = d;
      }
    }
    return nearest;
  }

  private toggleDriving(): void {
    if (this.drivingCar) {
      const car = this.drivingCar;
      car.driven = false;
      car.parked = true; // stays put rather than resuming AI wandering from wherever it was left
      this.drivingCar = null;

      // Step out to the car's side, re-grounded independently in case the
      // car itself is resting on something a standing player wouldn't
      // (e.g. it nosed a little onto a ledge).
      const exitX = car.position.x + Math.sin(car.yaw + Math.PI / 2) * 1.5;
      const exitZ = car.position.z + Math.cos(car.yaw + Math.PI / 2) * 1.5;
      const groundY = findSurfaceY(this.world, exitX, exitZ) ?? car.position.y;
      this.player.position = { x: exitX, y: groundY, z: exitZ };
      this.player.velocity = { x: 0, y: 0, z: 0 };
      return;
    }

    const nearest = this.findNearbyEnterableCar();
    if (nearest) {
      nearest.driven = true;
      nearest.parked = false;
      this.drivingCar = nearest;
    }
  }

  /** Nearest rideable animal/creature/dragon within its own mount range (3D — the dragon and the sea life aren't on the ground), or null. */
  private findNearbyRideable(): Rideable | null {
    let nearest: Rideable | null = null;
    let nearestDist = Infinity;
    const p = this.player.position;
    const consider = (r: Rideable): void => {
      if (!r.rideable || r.ridden) return;
      const d = Math.hypot(r.position.x - p.x, r.position.y - p.y, r.position.z - p.z);
      if (d < r.mountRange && d < nearestDist) {
        nearest = r;
        nearestDist = d;
      }
    };
    for (const dragon of this.dragons) consider(dragon);
    for (const creature of this.creatures) consider(creature);
    for (const f of this.fish) consider(f);
    return nearest;
  }

  private mountRideable(target: Rideable): void {
    this.mounted = target;
    target.mount();
    // Chase cam to start with (the whole mount in view); F5 switches to
    // looking out from its head, for mounts that support it.
    this.viewModeBeforeMount = this.viewMode;
    this.viewMode = "third";
    // Riding isn't flying — drop the player's own fly toggle so it isn't
    // still on when they step off a grounded mount.
    this.player.flying = false;
  }

  /** Sends the player to just outside the castle gate, dropping whatever they were driving or riding. */
  teleportToCastle(): void {
    if (this.drivingCar) this.toggleDriving();
    if (this.mounted) this.dismountRideable();
    const { x, z } = CASTLE_GATE_SPAWN;
    const { castleBaseY } = getStructureAnchors(this.world.seed);
    this.player.position = { x, y: castleBaseY + 2, z };
    this.player.velocity = { x: 0, y: 0, z: 0 };
    this.player.flying = false;
    this.camera.rotation.set(0, 0, 0, "YXZ"); // facing -z, toward the castle
    this.teleportPending = { x, z };
    this.chunkManager.update(x, z); // start streaming the destination right away
  }

  private dismountRideable(): void {
    const mount = this.mounted;
    if (!mount) return;
    const spot = mount.dismount(this.world);
    mount.setFirstPersonView?.(false);
    this.mounted = null;
    if (this.viewModeBeforeMount) this.viewMode = this.viewModeBeforeMount;
    this.viewModeBeforeMount = null;
    this.player.position = { x: spot.x, y: spot.y, z: spot.z };
    this.player.flying = spot.flying;
    this.player.velocity = { x: 0, y: 0, z: 0 };
  }

  /** Routes E: get off whatever the player is on; otherwise hop in a nearby car (the original behavior), else climb onto the nearest rideable animal/dragon. */
  private handleInteractKey(): void {
    if (this.drivingCar) {
      this.toggleDriving();
      return;
    }
    if (this.mounted) {
      this.dismountRideable();
      return;
    }
    if (this.findNearbyEnterableCar()) {
      this.toggleDriving();
      return;
    }
    const target = this.findNearbyRideable();
    if (target) this.mountRideable(target);
  }

  private static readonly MARKER_TOGGLE_RANGE = 3;
  private static readonly TORCH_TOGGLE_RANGE = 1.5;

  /** K toggles a custom minimap marker at the player's current spot — same toggle Flag build mode uses at the raycast target instead (see placeFlagAtTarget). Saved immediately (not just on unload) so a remembered spot survives a crash or hard-close. */
  private toggleMarkerAtPlayer(): void {
    this.toggleMarkerAt(this.player.position.x, this.player.position.y, this.player.position.z);
  }

  /** Removes the nearest marker within range, or drops a new one — shared by the M key (at the player) and Flag build mode (at the raycast target). */
  private toggleMarkerAt(x: number, y: number, z: number, addOnly = false): void {
    let nearestIndex = -1;
    let nearestDist = GameLoop.MARKER_TOGGLE_RANGE;
    for (let i = 0; i < this.customMarkers.length; i++) {
      const marker = this.customMarkers[i];
      const dist = Math.hypot(marker.x - x, marker.z - z);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearestIndex = i;
      }
    }

    if (nearestIndex >= 0) {
      if (addOnly) return;
      this.customMarkers.splice(nearestIndex, 1);
    } else {
      this.customMarkers.push({ x, y, z, label: `Marker ${this.customMarkers.length + 1}` });
    }
    this.syncFlagVisuals();
    this.savePlayerStateNow();
  }

  /** Flag build mode: drop/pick up a flag (and its minimap marker) at whatever block the player is looking at. */
  private placeFlagAtTarget(addOnly = false): void {
    if (!this.currentTarget) return;
    const { x, y, z } = this.currentTarget.placeAt;
    this.toggleMarkerAt(x + 0.5, y, z + 0.5, addOnly);
  }

  private syncFlagVisuals(): void {
    for (const flag of this.flagVisuals) {
      this.scene.remove(flag.group);
      flag.dispose();
    }
    this.flagVisuals = this.customMarkers.map((marker) => {
      const y = marker.y ?? findSurfaceY(this.world, marker.x, marker.z) ?? this.player.position.y;
      const flag = new Flag(Math.floor(marker.x), y, Math.floor(marker.z));
      this.scene.add(flag.group);
      return flag;
    });
  }

  /** Torch build mode: place/remove a portable light at whatever block the player is looking at. */
  private placeTorchAtTarget(addOnly = false): void {
    if (!this.currentTarget) return;
    const { x, y, z } = this.currentTarget.placeAt;
    this.toggleTorchAt(x, y, z, addOnly);
  }

  private toggleTorchAt(x: number, y: number, z: number, addOnly = false): void {
    let nearestIndex = -1;
    let nearestDist = GameLoop.TORCH_TOGGLE_RANGE;
    for (let i = 0; i < this.torchRecords.length; i++) {
      const torch = this.torchRecords[i];
      const dist = Math.hypot(torch.x - x, torch.y - y, torch.z - z);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearestIndex = i;
      }
    }

    if (nearestIndex >= 0) {
      if (addOnly) return;
      this.torchRecords.splice(nearestIndex, 1);
    } else {
      this.torchRecords.push({ x, y, z });
    }
    this.syncTorchVisuals();
    this.savePlayerStateNow();
  }

  private syncTorchVisuals(): void {
    for (const torch of this.torchVisuals) {
      this.scene.remove(torch.group);
      torch.dispose();
    }
    this.torchVisuals = this.torchRecords.map((rec) => {
      const torch = new Torch(rec.x, rec.y, rec.z);
      this.scene.add(torch.group);
      return torch;
    });
  }

  private buildCarInput(): CarInput {
    return {
      throttle: clamp1((this.pressed.has("KeyW") ? 1 : 0) - (this.pressed.has("KeyS") ? 1 : 0) + this.touchMoveVector.y),
      steer: clamp1((this.pressed.has("KeyD") ? 1 : 0) - (this.pressed.has("KeyA") ? 1 : 0) + this.touchMoveVector.x),
    };
  }

  private buildRideInput(): RideInput {
    return {
      throttle: clamp1((this.pressed.has("KeyW") ? 1 : 0) - (this.pressed.has("KeyS") ? 1 : 0) + this.touchMoveVector.y),
      steer: clamp1((this.pressed.has("KeyD") ? 1 : 0) - (this.pressed.has("KeyA") ? 1 : 0) + this.touchMoveVector.x),
      // Same up/down keys as free flight: Space climbs, Shift (or Ctrl) descends.
      climb:
        (this.pressed.has("Space") || this.touchJumpHeld || this.touchFlyUpHeld ? 1 : 0) -
        (this.pressed.has("ShiftLeft") ||
        this.pressed.has("ShiftRight") ||
        this.pressed.has("ControlLeft") ||
        this.pressed.has("ControlRight") ||
        this.touchFlyDownHeld
          ? 1
          : 0),
    };
  }

  // Combines keyboard state with touch state (see the touch* fields
  // above) into the one PlayerInput both desktop and touch ultimately
  // feed through — not a second input-polling path, just a second
  // *source* merged into the existing one. On desktop the touch fields
  // never leave their zero/false defaults, so this combine is inert
  // there (keyboard's own values pass through unchanged).
  private buildPlayerInput(): PlayerInput {
    const keyboardForward = (this.pressed.has("KeyW") ? 1 : 0) - (this.pressed.has("KeyS") ? 1 : 0);
    const keyboardRight = (this.pressed.has("KeyD") ? 1 : 0) - (this.pressed.has("KeyA") ? 1 : 0);
    return {
      forward: clamp1(keyboardForward + this.touchMoveVector.y),
      right: clamp1(keyboardRight + this.touchMoveVector.x),
      jump: this.pressed.has("Space") || this.touchJumpHeld,
      sprint: this.pressed.has("ControlLeft") || this.pressed.has("ControlRight"),
      flyUp: this.pressed.has("Space") || this.touchFlyUpHeld,
      flyDown: this.pressed.has("ShiftLeft") || this.pressed.has("ShiftRight") || this.touchFlyDownHeld,
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
      // Walking keeps the yaw-only forward (pitch shouldn't slow down
      // ground movement or skew diagonals against the yaw-only right
      // vector); flying uses the full look direction so facing down and
      // holding forward actually dives.
      let forward3D = { x: axes.forward.x, y: 0, z: axes.forward.z };
      if (this.player.flying) {
        const lookDir = new THREE.Vector3();
        this.camera.getWorldDirection(lookDir);
        forward3D = lookDir;
      }
      if (this.drivingCar) {
        this.drivingCar.tickDriven(SIM_DT, this.world, this.buildCarInput());
        // Keep the player's own position (used for chunk streaming, HUD,
        // and save-on-exit) glued to the car while it's being driven.
        this.player.position = { ...this.drivingCar.position };
        this.player.velocity = { x: 0, y: 0, z: 0 };
      } else if (this.teleportPending) {
        // Hold still (no gravity) until the destination's ground exists, so
        // a long jump doesn't drop the player through unloaded terrain.
        const { x, z } = this.teleportPending;
        const groundY = findSurfaceY(this.world, x, z);
        if (groundY !== null) {
          this.player.position = { x, y: groundY, z };
          this.teleportPending = null;
        }
        this.player.velocity = { x: 0, y: 0, z: 0 };
      } else if (this.mounted) {
        // Movement itself is applied once per frame below (tickRide, same
        // cadence the dragon's autonomous flight already uses) — skip the
        // player's own ground/gravity physics here so nothing fights it.
        this.player.velocity = { x: 0, y: 0, z: 0 };
      } else {
        this.player.tick(SIM_DT, this.world, this.buildPlayerInput(), forward3D, axes.right);
      }
      for (const creature of this.creatures) creature.tick(SIM_DT, this.world);
      for (const f of this.fish) f.tick(SIM_DT, this.world);
      for (const car of this.cars) {
        if (car === this.drivingCar || car.parked) continue;
        car.tickAI(SIM_DT, this.world);
      }
      this.simTick++;
      this.accumulator -= SIM_DT;
      steps++;
    }

    // Ridden movement happens here — once per rendered frame, the same
    // cadence the dragon's autonomous flight already used — rather than
    // inside the fixed SIM_DT loop above. Runs before the camera/eye math
    // below so a ridden frame's camera follows where the mount actually
    // ends up this frame, not last frame's position. (The dragon's own
    // update() doubles as its tickRide, so it's only ticked separately
    // when it isn't the one being ridden.)
    if (this.mounted) {
      this.mounted.tickRide(dt, this.world, this.buildRideInput());
      this.player.position = { ...this.mounted.position };
      this.player.velocity = { x: 0, y: 0, z: 0 };
    }
    for (const dragon of this.dragons) if (dragon !== this.mounted) dragon.update(dt);

    const driving = this.drivingCar !== null;
    const mount = this.mounted;
    const riding = mount !== null;
    // Driving and riding use the third-person chase cam (mouse-look still
    // free-rotates the camera around its anchor, same as on foot) — except
    // mounts that can be seen out of (the dragon), which honor the F5 view
    // toggle so the rider can look from its head instead.
    const firstPersonRide = riding && mount.supportsFirstPerson === true && this.viewMode === "first";
    const activeViewMode: ViewMode = driving || (riding && !firstPersonRide) ? "third" : this.viewMode;
    if (riding) mount.setFirstPersonView?.(firstPersonRide);
    const eyeX = this.player.position.x;
    const eyeY = this.player.position.y + (mount ? mount.rideEyeHeight : driving ? DRIVING_EYE_HEIGHT : EYE_HEIGHT);
    const eyeZ = this.player.position.z;
    if (firstPersonRide && mount.firstPersonEye) {
      const eye = mount.firstPersonEye();
      this.camera.position.set(eye.x, eye.y, eye.z);
    } else if (activeViewMode === "first") {
      this.camera.position.set(eyeX, eyeY, eyeZ);
    } else {
      const forward = new THREE.Vector3();
      this.camera.getWorldDirection(forward);
      const distance = mount ? mount.rideCameraDistance * this.rideCameraZoom : THIRD_PERSON_DISTANCE;
      this.camera.position
        .set(eyeX, eyeY, eyeZ)
        .addScaledVector(forward, -distance)
        .add(new THREE.Vector3(0, THIRD_PERSON_UP_OFFSET, 0));
    }

    const bodyYaw = new THREE.Euler().setFromQuaternion(this.camera.quaternion, "YXZ").y;
    const horizontalSpeed = Math.hypot(this.player.velocity.x, this.player.velocity.z);
    this.playerModel.update(this.player.position, bodyYaw, horizontalSpeed, dt, this.player.flying);
    this.playerModel.visible = activeViewMode === "third" && !driving && !riding;

    const hotbarState = useHotbarStore.getState();
    this.heldItem.update(dt, hotbarState.mode, HOTBAR_SLOTS[hotbarState.selectedIndex], horizontalSpeed);
    this.heldItem.group.visible = activeViewMode === "first" && !driving && !riding;

    const timeState = useTimeStore.getState();
    const timeOfDay = timeState.mode === "manual" ? timeState.manualTimeOfDay : getSystemTimeOfDay();
    this.clouds.update(dt, this.player.position.x, this.player.position.z, timeOfDay);
    this.sky.update(this.player.position, timeOfDay);
    updateTexturedMaterial(performance.now() / 1000, 1 - dayFactorAt(timeOfDay));
    this.castleBanners.update(performance.now() / 1000);
    for (const campfire of this.campfires) campfire.update(dt);
    for (const torch of this.torchVisuals) torch.update(dt);
    for (const flag of this.flagVisuals) flag.update(dt);
    const dark = isNight(timeOfDay);
    for (const car of this.cars) car.setHeadlightsOn(dark);
    for (const lamp of this.streetLamps) lamp.setOn(dark);

    // While driving or riding, point the arrow at the vehicle's actual
    // heading rather than the free-look camera's yaw (see the
    // third-person chase cam above — mouse-look can face anywhere
    // independent of travel).
    // Vehicles/mounts keep their heading in the movement convention
    // (forward = (sin, cos)), the opposite of the camera's (forward =
    // (-sin, -cos)) that the minimap arrow expects — hence the half turn.
    const miniMapYaw = this.drivingCar ? this.drivingCar.yaw + Math.PI : mount ? mount.rideYaw + Math.PI : bodyYaw;
    this.lastMapYaw = miniMapYaw;
    this.miniMap.update(
      this.player.position.x,
      this.player.position.z,
      miniMapYaw,
      this.buildMiniMapMarkers(),
      useMinimapStore.getState().worldRange,
    );

    this.chunkManager.update(this.player.position.x, this.player.position.z);
    this.trySpawnCreatures();
    this.updateAmbientCreatures(dt);
    this.trySpawnFish();
    this.updateAmbientFish(dt);
    this.trySpawnCars();

    const rideTarget = driving || mount ? null : this.findNearbyEnterableCar() ? null : this.findNearbyRideable();
    useHudStore
      .getState()
      .setVehiclePrompt(
        driving
          ? "Press E to exit vehicle"
          : mount
            ? "Press E to dismount"
            : this.findNearbyEnterableCar()
              ? "Press E to drive"
              : rideTarget
                ? `Press E to ride the ${rideTarget.rideName}`
                : null,
      );

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

    // Hold-to-repeat for every mode: re-checked every frame against the
    // just-recomputed currentTarget above, so e.g. breaking through one
    // block immediately continues into whatever's now exposed behind it
    // instead of needing a fresh click per block.
    if (this.primaryActionHeld) {
      this.holdCooldown -= dt;
      if (this.holdCooldown <= 0) this.triggerPrimaryAction(true);
    } else {
      this.holdCooldown = 0;
    }

    this.renderer.render(this.scene, this.camera);

    this.fpsFrameCount++;
    const sinceWindowStart = frameStart - this.fpsWindowStart;
    if (sinceWindowStart >= 500) {
      this.currentFps = Math.round((this.fpsFrameCount * 1000) / sinceWindowStart);
      this.fpsFrameCount = 0;
      this.fpsWindowStart = frameStart;
      if (sinceWindowStart < 1500) this.adaptResolution(this.currentFps); // a longer window means the tab was hidden or stalled, not slow rendering
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
      carCount: this.cars.length,
      flying: this.player.flying,
      swimming: this.player.swimming,
      viewMode: this.viewMode,
      timeOfDay,
    });

    this.rafHandle = requestAnimationFrame(this.frame);
  };

  // Captures live position/look/mode into a save-ready snapshot. Called
  // both from a real page-unload (the only path guaranteed to fire on a
  // hard reload/tab close — React's unmount cleanup does not) and from
  // dispose() (dev HMR, or a future in-game "back to menu").
  private buildPlayerStateSnapshot() {
    const euler = new THREE.Euler().setFromQuaternion(this.camera.quaternion, "YXZ");
    return {
      position: this.player.position,
      yaw: euler.y,
      pitch: euler.x,
      flying: this.player.flying,
      selectedHotbarIndex: useHotbarStore.getState().selectedIndex,
      markers: this.customMarkers,
      torches: this.torchRecords,
    };
  }

  private savePlayerStateNow = (): void => {
    void this.saveManager.savePlayerState(this.buildPlayerStateSnapshot());
  };

  private handleBeforeUnload = (): void => {
    this.savePlayerStateNow();
  };

  /**
   * Awaits a full flush of player state + dirty chunk diffs to IndexedDB.
   * Unlike beforeunload/dispose's fire-and-forget saves (the page may be
   * gone before those land), this is used before operations that touch
   * this world's IndexedDB rows right afterward — switching/renaming/
   * pushing a world — where a write racing in after would be a real bug.
   */
  async flushAll(): Promise<void> {
    await this.saveManager.savePlayerState(this.buildPlayerStateSnapshot());
    await this.saveManager.flushDirtyChunks();
  }

  dispose(): void {
    this.disposed = true;
    cancelAnimationFrame(this.rafHandle);
    window.removeEventListener("resize", this.handleResize);
    window.removeEventListener("keydown", this.handleKeyDown);
    window.removeEventListener("keyup", this.handleKeyUp);
    window.removeEventListener("beforeunload", this.handleBeforeUnload);
    document.removeEventListener("visibilitychange", this.handleBeforeUnload);
    this.canvas.removeEventListener("mousedown", this.handleMouseDown);
    window.removeEventListener("mouseup", this.handleMouseUp);
    this.canvas.removeEventListener("contextmenu", this.handleContextMenu);
    this.canvas.removeEventListener("wheel", this.handleWheel);
    this.mouseLook.dispose();
    this.chunkManager.dispose();
    for (const creature of this.creatures) {
      this.scene.remove(creature.mesh);
      creature.dispose();
    }
    for (const f of this.fish) {
      this.scene.remove(f.mesh);
      f.dispose();
    }
    for (const car of this.cars) {
      this.scene.remove(car.mesh);
      car.dispose();
    }
    this.scene.remove(this.playerModel.group);
    this.playerModel.dispose();
    this.camera.remove(this.heldItem.group);
    this.heldItem.dispose();
    this.scene.remove(this.clouds.group);
    this.clouds.dispose();
    this.sky.dispose();
    for (const campfire of this.campfires) {
      this.scene.remove(campfire.group);
      campfire.dispose();
    }
    for (const lamp of this.streetLamps) {
      this.scene.remove(lamp.group);
      lamp.dispose();
    }
    this.scene.remove(this.castleBanners.group);
    this.castleBanners.dispose();
    for (const dragon of this.dragons) {
      this.scene.remove(dragon.mesh);
      dragon.dispose();
    }
    for (const flag of this.flagVisuals) {
      this.scene.remove(flag.group);
      flag.dispose();
    }
    for (const torch of this.torchVisuals) {
      this.scene.remove(torch.group);
      torch.dispose();
    }
    this.lightPool.dispose(this.scene);
    this.renderer.dispose();

    this.savePlayerStateNow();
    void this.saveManager.flushDirtyChunks();
    this.saveManager.dispose();
  }
}
