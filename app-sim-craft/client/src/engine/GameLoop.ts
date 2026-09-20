// Composition root and heartbeat: builds the world and every system that acts
// on it, then runs the fixed-timestep sim tick and the per-frame update, per
// spec/01-tech-stack-architecture.md §2 and §8. React never drives this loop —
// it only reads what HudPublisher projects into the Zustand stores.
//
// Each concern lives in its own module and is only wired together here:
//   RenderView        renderer, resolution, FPS         CameraRig     camera placement + FOV
//   InputManager      keys / mouse / touch → actions    PlayerController  on foot / riding / teleporting
//   BuildTools        target, break/place/torch/flag    PlacedSet     flags + torches the player placed
//   ChunkManager      terrain streaming                 EntityGroup + Population   creatures, fish, cars, dragons
//   WorldProps        campfires, lamps, banners         HudPublisher  state → UI
import * as THREE from "three";
import { World } from "../core/World";
import { CHUNK_SIZE } from "../core/Chunk";
import { findSurfaceY } from "../core/worldQueries";
import { MouseLook } from "./Camera";
import { cameraPitch, cameraYaw, CameraRig } from "./CameraRig";
import { ChunkManager, RENDER_DISTANCE_COLUMNS } from "./ChunkManager";
import { BuildTools } from "./BuildTools";
import { PlacedSet } from "./PlacedSet";
import { PlayerController, type MovementBasis } from "./PlayerController";
import { RenderView } from "./RenderView";
import { HudPublisher } from "./HudPublisher";
import { WorldProps } from "./WorldProps";
import { collectMapMarkers, landmarkMarkers } from "./mapMarkers";
import { InputManager, type GameActions } from "../input/InputManager";
import type { Creature } from "../entities/Creature";
import type { Fish } from "../entities/Fish";
import { createDragons, type Dragon } from "../entities/Dragon";
import type { Car } from "../entities/Car";
import { EntityGroup } from "../entities/EntityGroup";
import { Population, type SpawnContext } from "../entities/Population";
import { carRules, creatureRules, fishRules } from "../entities/populations";
import { LightPool } from "../rendering/LightPool";
import { updateTexturedMaterial } from "../rendering/texturedMaterial";
import { useGraphicsStore, type GraphicsSettings } from "../state/graphicsStore";
import { useTimeStore } from "../state/timeStore";
import { useHotbarStore, HOTBAR_SLOTS } from "../state/hotbarStore";
import { useMinimapStore } from "../state/minimapStore";
import { PlayerModel } from "./PlayerModel";
import { HeldItem } from "./HeldItem";
import { Clouds } from "./Clouds";
import { Sky, dayFactorAt, getSystemTimeOfDay, isNight } from "./Sky";
import { Flag } from "./Flag";
import { Torch } from "./Torch";
import { MiniMap, type MiniMapMarker } from "./MiniMap";
import { CASTLE_GATE_SPAWN, getStructureAnchors } from "../worldgen/structures";
import { sampleColumn } from "../worldgen/terrain";
import { SaveManager } from "../persistence/SaveManager";
import type { MapMarkerRecord, TorchRecord } from "../persistence/db";

const SIM_HZ = 20;
const SIM_DT = 1 / SIM_HZ;
const MAX_SIM_STEPS_PER_FRAME = 5;
const ARROW_PAN_SPEED = 2.2; // radians/sec
const CAMERA_NEAR = 0.1;
const CAMERA_FAR = 1000;
const BASE_FOV = 70;
const MARKER_TOGGLE_RANGE = 3;
const TORCH_TOGGLE_RANGE = 1.5;

type LoadedPlayerState = Awaited<ReturnType<SaveManager["load"]>>["playerState"];

const scratchLook = new THREE.Vector3();

export class GameLoop implements GameActions {
  private readonly view: RenderView;
  private readonly scene: THREE.Scene;
  private readonly camera: THREE.PerspectiveCamera;
  private readonly mouseLook: MouseLook;
  private readonly cameraRig: CameraRig;
  private readonly world: World;
  private readonly chunkManager: ChunkManager;
  private readonly saveManager: SaveManager;
  private readonly controller: PlayerController;
  private readonly input: InputManager;
  private readonly build: BuildTools;
  private readonly markers: PlacedSet<MapMarkerRecord, Flag>;
  private readonly torches: PlacedSet<TorchRecord, Torch>;
  // Every simulated creature lives in a group (owns its scene membership and
  // disposal); a Population decides how many exist and where they appear.
  private readonly creatures: EntityGroup<Creature>;
  private readonly fish: EntityGroup<Fish>;
  private readonly dragons: EntityGroup<Dragon>;
  private readonly cars: EntityGroup<Car>;
  private readonly creaturePopulation: Population<Creature>;
  private readonly fishPopulation: Population<Fish>;
  private readonly carPopulation: Population<Car>;
  private readonly playerModel: PlayerModel;
  private readonly heldItem: HeldItem;
  private readonly clouds: Clouds;
  private readonly sky: Sky;
  private readonly props: WorldProps;
  private readonly lightPool: LightPool;
  private readonly miniMap: MiniMap;
  private readonly hud: HudPublisher;
  private readonly unsubscribeGraphics: () => void;

  private lastMapYaw = 0;
  private simTick = 0;
  private accumulator = 0;
  private lastFrameTime = performance.now();
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
    playerState: LoadedPlayerState,
    renderDistanceColumns: number,
  ) {
    this.saveManager = saveManager;

    const initialGraphics = useGraphicsStore.getState().settings;
    this.view = new RenderView(canvas, initialGraphics, (width, height) => {
      this.camera.aspect = width / height;
      this.camera.updateProjectionMatrix();
    });

    this.scene = new THREE.Scene();
    this.creatures = new EntityGroup<Creature>(this.scene);
    this.fish = new EntityGroup<Fish>(this.scene);
    this.dragons = new EntityGroup<Dragon>(this.scene);
    this.cars = new EntityGroup<Car>(this.scene);
    this.creaturePopulation = new Population(this.creatures, creatureRules);
    this.fishPopulation = new Population(this.fish, fishRules);
    this.carPopulation = new Population(this.cars, carRules);

    const { width, height } = this.view.size;
    this.camera = new THREE.PerspectiveCamera(BASE_FOV, width / height, CAMERA_NEAR, CAMERA_FAR);
    // The camera itself needs to be part of the scene graph for its children (the held-item viewmodel
    // below) to render at all — a camera doesn't have to be in the scene to be used for rendering,
    // but anything parented to it does.
    this.scene.add(this.camera);
    this.mouseLook = new MouseLook(this.camera, canvas);
    this.cameraRig = new CameraRig(this.camera);

    this.sky = new Sky(this.scene);
    this.lightPool = new LightPool(this.scene, initialGraphics.lights);

    this.world = new World(seed);
    this.chunkManager = new ChunkManager(this.world, this.scene, saveManager, renderDistanceColumns);

    this.controller = new PlayerController([this.dragons, this.creatures, this.fish, this.cars]);
    const player = this.controller.player;
    if (playerState) {
      player.position = { ...playerState.position };
      player.flying = playerState.flying;
      this.camera.rotation.set(playerState.pitch, playerState.yaw, 0, "YXZ");
      useHotbarStore.getState().select(playerState.selectedHotbarIndex);
    } else {
      const spawnHeight = sampleColumn(seed, 0, 0).height;
      this.world.spawnPoint = { x: 0.5, y: spawnHeight + 1, z: 0.5 };
      player.position = { ...this.world.spawnPoint };
    }
    this.chunkManager.update(player.position.x, player.position.z);

    // Flags (which double as minimap markers) and torches are saved the moment they change, so a
    // remembered spot survives a crash or hard-close.
    const saveNow = (): void => this.savePlayerStateNow();
    this.markers = new PlacedSet<MapMarkerRecord, Flag>(
      this.scene,
      {
        toggleRange: MARKER_TOGGLE_RANGE,
        distance: (marker, x, _y, z) => Math.hypot(marker.x - x, marker.z - z),
        createRecord: (x, y, z, count) => ({ x, y, z, label: `Marker ${count + 1}` }),
        // A marker saved before markers recorded a height falls back to the ground there.
        createVisual: (marker) =>
          new Flag(Math.floor(marker.x), marker.y ?? findSurfaceY(this.world, marker.x, marker.z) ?? player.position.y, Math.floor(marker.z)),
      },
      playerState?.markers ?? [],
      saveNow,
    );
    this.torches = new PlacedSet<TorchRecord, Torch>(
      this.scene,
      {
        toggleRange: TORCH_TOGGLE_RANGE,
        distance: (torch, x, y, z) => Math.hypot(torch.x - x, torch.y - y, torch.z - z),
        createRecord: (x, y, z) => ({ x, y, z }),
        createVisual: (torch) => new Torch(torch.x, torch.y, torch.z),
      },
      playerState?.torches ?? [],
      saveNow,
    );
    this.build = new BuildTools({
      world: this.world,
      chunkManager: this.chunkManager,
      scene: this.scene,
      camera: this.camera,
      player,
      markers: this.markers,
      torches: this.torches,
    });

    this.playerModel = new PlayerModel();
    this.playerModel.visible = false; // first-person by default — see the F5 view-mode toggle
    this.scene.add(this.playerModel.group);

    this.heldItem = new HeldItem();
    this.camera.add(this.heldItem.group);

    this.clouds = new Clouds();
    this.scene.add(this.clouds.group);

    const anchors = getStructureAnchors(seed);
    this.props = new WorldProps(this.scene, anchors);
    for (const dragon of createDragons(anchors.peakY)) this.dragons.add(dragon);

    this.miniMap = new MiniMap(minimapCanvas, seed);
    this.hud = new HudPublisher({
      world: this.world,
      player,
      camera: this.camera,
      chunkManager: this.chunkManager,
      mouseLook: this.mouseLook,
      carCount: () => this.cars.size,
    });

    this.applyGraphics(initialGraphics);
    this.unsubscribeGraphics = useGraphicsStore.subscribe((state, previous) => {
      if (state.settings !== previous.settings) this.applyGraphics(state.settings);
    });

    this.input = new InputManager(canvas, this);
    window.addEventListener("beforeunload", this.handleBeforeUnload);
    document.addEventListener("visibilitychange", this.handleBeforeUnload);
  }

  /** Applies the player's graphics settings (see state/graphicsStore.ts) to the running game — at startup and whenever they change. */
  private applyGraphics(settings: GraphicsSettings): void {
    const p = this.controller.player.position;
    this.chunkManager.setRenderDistance(settings.renderDistance, p.x, p.z);
    this.sky.setViewDistance(settings.renderDistance * CHUNK_SIZE);
    this.lightPool.setSize(this.scene, settings.lights);
    this.clouds.setQuality(settings.clouds);
    this.view.configure(settings);
  }

  // ---------------------------------------------------------------------------
  // Actions — what input (keys, mouse, and the touch controls in ui/) asks the
  // game to do. GameActions covers the keyboard/mouse path; the rest are the
  // touch UI's entry points, reached through engine/activeGameLoop.ts.
  // ---------------------------------------------------------------------------

  /** The E key's action (hop in/out of a car, mount/dismount an animal or dragon) — the touch prompt button in ui/VehiclePrompt.tsx calls this. */
  interact(): void {
    this.controller.interact(this.world);
  }

  /** The double-tap-Space gesture — a single tap is enough on touch, see ui/TouchActionButtons.tsx: nitro in a car, turbo on the dragon, and on foot it starts flying, then toggles turbo flight (landing is flying down into the ground, like on desktop). */
  toggleFlying(): void {
    const mount = this.controller.mounted;
    // While riding, the tap is the mount's own boost (nitro for a car, turbo for the dragon): flying isn't
    // meaningful for a mount, so the gesture is free to mean something else. A mount with nothing to boost
    // ignores it — Space is already climb, and the player's own flying state is inert while glued to the mount.
    if (mount) mount.boost?.();
    else {
      const player = this.controller.player;
      if (player.flying) player.turbo = !player.turbo;
      else player.flying = true;
    }
  }

  /** The F5 key's action: switch between first- and third-person views. */
  toggleViewMode(): void {
    this.cameraRig.toggleViewMode();
  }

  /** Sends the player to just outside the castle gate, dropping whatever they were driving or riding. */
  teleportToCastle(): void {
    const { x, z } = CASTLE_GATE_SPAWN;
    const { castleBaseY } = getStructureAnchors(this.world.seed);
    this.controller.teleportTo({ x, y: castleBaseY + 2, z }, this.world);
    this.camera.rotation.set(0, 0, 0, "YXZ"); // facing -z, toward the castle
    this.chunkManager.update(x, z); // start streaming the destination right away
  }

  toggleMarkerAtPlayer(): void {
    this.build.toggleMarkerAtPlayer();
  }

  /** Left click / the touch action button — see BuildTools.primaryAction. */
  primaryAction(): void {
    this.build.primaryAction();
  }

  triggerPrimaryAction(isRepeat = false): void {
    this.build.primaryAction(isRepeat);
  }

  secondaryAction(): void {
    this.build.secondaryAction();
  }

  wheel(deltaY: number): void {
    if (this.controller.mounted) this.cameraRig.zoomRide(deltaY);
    else useHotbarStore.getState().cycle(Math.sign(deltaY));
  }

  /** Touch counterpart to mouse-up/down — see ui/TouchActionButtons.tsx's primary action button. */
  setPrimaryActionHeld(held: boolean): void {
    this.input.setPrimaryActionHeld(held);
  }

  /** Feeds a raw touch-drag pixel delta through the exact same yaw/pitch math mouse-look uses — see Camera.ts's applyPointerDelta. */
  applyTouchLookDelta(deltaX: number, deltaY: number): void {
    this.mouseLook.applyPointerDelta(this.camera, deltaX, deltaY);
  }

  /** {x, y} already in forward/right shape (see touchMath.ts's computeJoystickVector) — ui/TouchJoystick.tsx calls this on every drag/release. */
  setTouchMoveVector(x: number, y: number): void {
    this.input.setTouchMoveVector(x, y);
  }

  setTouchJump(held: boolean): void {
    this.input.setTouchJump(held);
  }

  /** What the full-screen map (ui/FullMap.tsx) needs each frame it's open: the seed to sample terrain from, where the player is and which way they face, and the live landmark markers (not the swarm of creatures/fish). */
  getMapSnapshot(): { seed: number; playerX: number; playerZ: number; playerYaw: number; markers: MiniMapMarker[] } {
    const position = this.controller.player.position;
    return {
      seed: this.world.seed,
      playerX: position.x,
      playerZ: position.z,
      playerYaw: this.lastMapYaw,
      markers: landmarkMarkers(this.mapMarkers()),
    };
  }

  private mapMarkers(): MiniMapMarker[] {
    return collectMapMarkers({
      dragons: this.dragons,
      creatures: this.creatures,
      fish: this.fish,
      customMarkers: this.markers.records,
      torches: this.torches.records,
    });
  }

  // ---------------------------------------------------------------------------
  // The loop
  // ---------------------------------------------------------------------------

  start(): void {
    this.rafHandle = requestAnimationFrame(this.frame);
  }

  private frame = (now: number): void => {
    if (this.disposed) return;
    const frameStart = performance.now();
    const dt = Math.min((now - this.lastFrameTime) / 1000, 0.25);
    this.lastFrameTime = now;

    this.accumulator += dt;
    for (let steps = 0; this.accumulator >= SIM_DT && steps < MAX_SIM_STEPS_PER_FRAME; steps++) {
      this.simStep();
      this.accumulator -= SIM_DT;
    }

    // Ridden movement happens here — once per rendered frame, the same cadence the dragon's autonomous
    // flight uses — rather than inside the fixed step. Runs before the camera math below so a ridden
    // frame's camera follows where the mount actually ends up this frame, not last frame's position.
    const player = this.controller.player;
    this.controller.frameStep(dt, this.world, this.input.rideInput());
    this.dragons.updateAll(dt, this.world);

    const viewMode = this.cameraRig.update(dt, player, this.controller.mounted);
    const mount = this.controller.mounted;
    const bodyYaw = cameraYaw(this.camera);
    const horizontalSpeed = Math.hypot(player.velocity.x, player.velocity.z);
    this.playerModel.update(player.position, bodyYaw, horizontalSpeed, dt, player.flying);
    this.playerModel.visible = viewMode === "third" && !mount;
    const hotbar = useHotbarStore.getState();
    this.heldItem.update(dt, hotbar.mode, HOTBAR_SLOTS[hotbar.selectedIndex], horizontalSpeed);
    this.heldItem.group.visible = viewMode === "first" && !mount;

    const timeState = useTimeStore.getState();
    const timeOfDay = timeState.mode === "manual" ? timeState.manualTimeOfDay : getSystemTimeOfDay();
    const night = isNight(timeOfDay);
    const nowSeconds = performance.now() / 1000;
    this.clouds.update(dt, player.position.x, player.position.z, timeOfDay);
    this.sky.update(player.position, timeOfDay);
    updateTexturedMaterial(nowSeconds, 1 - dayFactorAt(timeOfDay));
    this.props.update(dt, nowSeconds, night);
    this.markers.update(dt);
    this.torches.update(dt);
    for (const car of this.cars) car.setHeadlightsOn(night);
    this.lightPool.update(this.camera.position);

    // While driving or riding, point the minimap arrow at the mount's actual heading rather than the
    // free-look camera's yaw. Mounts keep their heading in the movement convention (forward = (sin, cos)),
    // the opposite of the camera's (forward = (-sin, -cos)) that the arrow expects — hence the half turn.
    this.lastMapYaw = mount ? mount.rideYaw + Math.PI : bodyYaw;
    this.miniMap.update(player.position.x, player.position.z, this.lastMapYaw, this.mapMarkers(), useMinimapStore.getState().worldRange);

    this.chunkManager.update(player.position.x, player.position.z);
    const spawnContext: SpawnContext = {
      world: this.world,
      playerX: player.position.x,
      playerZ: player.position.z,
      // Ground exists to snap spawns to once the initial chunk load settles.
      worldReady: this.chunkManager.pendingCount === 0 && this.chunkManager.loadedChunkCount > 0,
    };
    this.creaturePopulation.update(spawnContext, dt);
    this.fishPopulation.update(spawnContext, dt);
    this.carPopulation.update(spawnContext, dt);

    this.hud.publishPrompt(this.controller.prompt());
    this.build.update(dt, this.input.primaryActionHeld);

    this.view.render(this.scene, this.camera);
    this.view.recordFrame(frameStart);
    this.hud.publishDebug({
      fps: this.view.fps,
      frameTimeMs: performance.now() - frameStart,
      simTick: this.simTick,
      timeOfDay,
      viewMode: this.cameraRig.viewMode,
      target: this.build.target,
    });

    this.rafHandle = requestAnimationFrame(this.frame);
  };

  /** One fixed-timestep step: pan and walk the player, then advance everything that simulates at the sim rate. */
  private simStep(): void {
    const pan = this.input.panAxes();
    if (pan.yaw !== 0 || pan.pitch !== 0) {
      this.mouseLook.panBy(this.camera, pan.yaw * ARROW_PAN_SPEED * SIM_DT, pan.pitch * ARROW_PAN_SPEED * SIM_DT);
    }
    // Movement runs regardless of Pointer Lock state — mouse-look is a bonus on top of WASD, never a prerequisite for it.
    this.controller.simStep(SIM_DT, this.world, this.input.walkInput(), this.movementBasis());

    this.creatures.updateAll(SIM_DT, this.world);
    this.fish.updateAll(SIM_DT, this.world);
    this.cars.updateAll(SIM_DT, this.world);
    this.simTick++;
  }

  /** Walking keeps the yaw-only forward (pitch shouldn't slow down ground movement or skew diagonals against the yaw-only right vector); flying uses the full look direction so facing down and holding forward actually dives. */
  private movementBasis(): MovementBasis {
    const axes = this.mouseLook.getMoveAxes(this.camera);
    if (this.controller.player.flying) {
      this.camera.getWorldDirection(scratchLook);
      return { forward: { x: scratchLook.x, y: scratchLook.y, z: scratchLook.z }, right: axes.right };
    }
    return { forward: { x: axes.forward.x, y: 0, z: axes.forward.z }, right: axes.right };
  }

  // ---------------------------------------------------------------------------
  // Persistence hooks and teardown
  // ---------------------------------------------------------------------------

  // Captures live position/look/mode into a save-ready snapshot. Called both from a real page-unload
  // (the only path guaranteed to fire on a hard reload/tab close — React's unmount cleanup does not)
  // and from dispose() (dev HMR, or a future in-game "back to menu").
  private buildPlayerStateSnapshot() {
    const player = this.controller.player;
    return {
      position: player.position,
      yaw: cameraYaw(this.camera),
      pitch: cameraPitch(this.camera),
      flying: player.flying,
      selectedHotbarIndex: useHotbarStore.getState().selectedIndex,
      markers: [...this.markers.records],
      torches: [...this.torches.records],
    };
  }

  private savePlayerStateNow(): void {
    void this.saveManager.savePlayerState(this.buildPlayerStateSnapshot());
  }

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
    window.removeEventListener("beforeunload", this.handleBeforeUnload);
    document.removeEventListener("visibilitychange", this.handleBeforeUnload);
    this.input.dispose();
    this.mouseLook.dispose();
    this.chunkManager.dispose();
    this.creatures.dispose();
    this.fish.dispose();
    this.cars.dispose();
    this.dragons.dispose();
    this.props.dispose();
    this.markers.dispose();
    this.torches.dispose();
    this.build.dispose();
    this.scene.remove(this.playerModel.group);
    this.playerModel.dispose();
    this.camera.remove(this.heldItem.group);
    this.heldItem.dispose();
    this.scene.remove(this.clouds.group);
    this.clouds.dispose();
    this.sky.dispose();
    this.unsubscribeGraphics();
    this.lightPool.dispose(this.scene);
    this.view.dispose();

    this.savePlayerStateNow();
    void this.saveManager.flushDirtyChunks();
    this.saveManager.dispose();
  }
}
