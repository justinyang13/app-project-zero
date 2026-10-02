import * as THREE from 'three';
import { Scene, Vector3 } from 'three';
import { createPlayerState, stepPlayer, IDLE_ACTIONS, modeAt } from '../logic/player';
import type { PlayerState, PlayerActions, PlayerEnvironment } from '../logic/player';
import { buildLevel } from '../logic/level';
import type { Level } from '../logic/levelTypes';
import { isGapAt, firstSolidFloorAfter, wallStripAt, obstaclesInRange } from '../logic/levelTypes';
import { checkCollisions, createCollisionCtx } from '../logic/collision';
import type { CollisionCtx } from '../logic/collision';
import {
  createScoreState, addBit, addCore, addDistance, addNearMiss,
  addBoost, addWallRun, applyHit, addVictoryBonus, starRating,
} from '../logic/scoring';
import type { ScoreState } from '../logic/scoring';
import { SECTIONS, sectionSpeedAt, MAX_INTEGRITY } from '../config';
import { Input } from '../input/Input';
import type { Action } from '../input/InputBuffer';
import { Renderer } from '../render/Renderer';
import { PlayerModel } from '../render/PlayerModel';
import { RealisticRunner } from '../render/RealisticRunner';
import type { RunnerView } from '../render/runnerView';
import { CameraRig } from '../render/CameraRig';
import { Trail } from '../render/Trail';
import { Track } from '../render/Track';
import { SetPieces } from '../render/SetPieces';
import { Skyline } from '../render/Skyline';
import { Environment } from '../render/Environment';
import { ObstacleMeshes } from '../render/ObstacleMeshes';
import { BossView } from '../render/Boss';
import { FinishPortal } from '../render/Finish';
import { Particles } from '../render/Particles';
import { CycleModel } from '../render/CycleModel';
import {
  createBossState, attacksBefore, boltHitsPlayer, CORE_Z,
} from '../logic/boss';
import type { BossState } from '../logic/boss';
import { createBot, botActions } from '../logic/bot';
import type { Bot } from '../logic/bot';
import { Hud } from '../ui/Hud';
import { Screens } from '../ui/Screens';
import type { GameState, RunStats } from './state';
import { resetStats } from './state';
import { createPopupQueue, pushPopup, stepPopups, clearPopups } from './events';
import type { PopupQueue } from './events';
import { parseFlags } from './flags';
import { selectPrompt } from '../ui/prompts';
import { canvasStyle } from '../ui/layout';
import { initialFlow, transition } from './flow';
import type { FlowState, FlowAction } from './flow';
import { AudioEngine } from '../audio/AudioEngine';
import { Music } from '../audio/Music';
import { Sfx } from '../audio/Sfx';
import { beatPulse } from '../audio/beat';

const DT = 1 / 120;
const BOOST_DURATION = 1.5;
const BOOST_FACTOR = 1.3;

export class Game {
  private renderer: Renderer;
  private scene: Scene;
  private playerState: PlayerState;
  private playerModel: RunnerView;
  private classicModel: PlayerModel;
  private charChoice: 'real' | 'classic' = 'real';
  private charActive: 'real' | 'classic' = 'classic';
  private trail: Trail;
  private cameraRig: CameraRig;
  private track: Track;
  private setPieces: SetPieces;
  private skyline: Skyline;
  private environment: Environment;
  private obstacles: ObstacleMeshes;
  private hud: Hud;
  private screens: Screens;
  private flow: FlowState;
  private runStats: RunStats;
  private level: Level;
  private collisionCtx: CollisionCtx;
  private score: ScoreState;
  private lastTime = 0;
  private runTime = 0;
  private rafId = 0;
  private prevDist = 0;
  private particles: Particles;
  private popups: PopupQueue;
  private prevGrounded = true;
  private wallrunPopupTimer = 0;
  private boostTimer = 0;
  private glitchTimer = 0;
  private fps = 60;
  private fpsAccum = 0;
  private fpsFrames = 0;
  private debugEnabled = false;
  private tmpVec = new Vector3();
  private audio: AudioEngine;
  private music: Music;
  private sfx: Sfx;
  private prevLane = 0;
  private prevSliding = false;
  private prevWall = false;
  private cycleModel: CycleModel;
  private bossState: BossState = createBossState();
  private bossView: BossView;
  private finishPortal: FinishPortal;
  private victorySlowMo = -1; // seconds of slow-mo remaining, -1 = inactive
  private prevMode: 'runner' | 'cycle' = 'runner';
  private modeFlashTimer = 0;
  private botEnabled = false;
  private bot: Bot = createBot();
  private lowFpsTime = 0; // seconds of <40 fps during play (auto-downgrade, SPEC §8.1)

  constructor() {
    this.flow = { ...initialFlow };
    this.runStats = resetStats();
    this.level = buildLevel();
    this.collisionCtx = createCollisionCtx();
    this.score = createScoreState();

    this.scene = new Scene();
    this.renderer = new Renderer();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    const canvas = this.renderer.getRenderer().domElement;
    Object.assign(canvas.style, canvasStyle());
    document.body.appendChild(canvas);

    this.environment = new Environment(this.scene);
    this.track = new Track(this.scene, import.meta.env.BASE_URL);
    this.setPieces = new SetPieces(this.scene);
    this.track.setLevelGeometry({
      gaps: this.level.obstacles
        .filter((o) => o.type === 'gap' || o.type === 'longGap')
        .map((o) => ({ z0: o.z, z1: o.z + (o as { len: number }).len })),
      wallStrips: this.level.wallStrips,
    });
    this.skyline = new Skyline(this.scene);
    this.obstacles = new ObstacleMeshes(this.scene, this.level);
    this.bossView = new BossView(this.scene);
    this.finishPortal = new FinishPortal(this.scene);
    this.particles = new Particles(this.scene, this.renderer.getQuality());
    this.popups = createPopupQueue();

    this.playerState = createPlayerState();
    // M14b: character selection. `?char=real` (default) uses the realistic
    // GLB runner; `?char=classic` keeps the procedural model. Until the GLB
    // is ready (or if it fails to load) the classic model is shown so there
    // is never a frame without a character.
    this.classicModel = new PlayerModel();
    this.playerModel = this.classicModel;
    this.scene.add(this.classicModel.getModel());
    this.cycleModel = new CycleModel();
    this.cycleModel.getModel().visible = false;
    this.scene.add(this.cycleModel.getModel());
    this.trail = new Trail();
    this.scene.add(this.trail.getModel());
    this.cameraRig = new CameraRig();
    this.renderer.attach(this.scene, this.cameraRig.getCamera());

    // Quick construction sanity check (only with ?debug=1, M11 fix #4).
    if (new URLSearchParams(window.location.search).get('debug') === '1') {
      let meshes = 0;
      this.scene.traverse((o) => { if ((o as THREE.Mesh).isMesh) meshes++; });
      console.info(
        `[neon-runner] scene children=${this.scene.children.length} meshes=${meshes} ` +
        `background=${this.scene.background ? 'sky.jpg' : 'MISSING'} ` +
        `fog=${this.scene.fog ? 'ok' : 'MISSING'}`,
      );
    }

    this.hud = new Hud();
    this.hud.hide();
    const flags = parseFlags();
    this.debugEnabled = flags.debug;
    if (this.debugEnabled) this.hud.setDebug(true);
    this.charChoice = flags.char;
    if (this.charChoice === 'real') this.startRealisticRunner();

    // Audio (SPEC §9): context unlocks on the first key press.
    this.audio = new AudioEngine();
    this.music = new Music(this.audio, import.meta.env.BASE_URL);
    this.sfx = new Sfx(this.audio);
    if (flags.mute) this.audio.setMuted(true);
    this.screens = new Screens();
    this.screens.show('title');

    // Bot mode (SPEC §12): ?bot=1 autostarts and the bot drives the game.
    if (flags.bot) {
      this.botEnabled = true;
      this.doFlow({ type: 'start' });
    }

    // Section flag: start at that section's start distance.
    if (flags.section !== null && flags.section >= 0 && flags.section < SECTIONS.length) {
      this.teleport(SECTIONS[flags.section].z0);
    }

    this.setupInput();
    window.addEventListener('resize', () => {
      this.renderer.setSize(window.innerWidth, window.innerHeight);
      this.cameraRig.setAspect(window.innerWidth / window.innerHeight);
    });

    // Robustness: auto-pause when the tab is hidden (SPEC M10b).
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && this.gameState === 'playing') this.doFlow({ type: 'pause' });
    });

    this.lastTime = performance.now();
    this.loop = this.loop.bind(this);
    this.rafId = requestAnimationFrame(this.loop);
  }

  get gameState(): GameState {
    return this.flow.state;
  }

  /** Run a flow action and apply its effects (HUD visibility, run reset, countdown, screen). */
  private doFlow(action: FlowAction): void {
    const next = transition(this.flow, action);
    this.flow = next;
    if (next.resetRun) this.resetRun();
    if (next.hideHud) this.hud.hide();
    if (next.showHud) this.hud.show();
    if (action.type === 'start' || action.type === 'restart') {
      this.music.startRun();
    }
    if (action.type === 'resume') {
      this.music.resume();
    }
    switch (next.state) {
      case 'paused':
        this.screens.show('paused');
        this.music.pause();
        break;
      case 'gameover':
        this.music.onGameOver();
        this.sfx.gameOver();
        this.sfx.stopAll();
        this.screens.show('gameover', {
          score: Math.round(this.score.score),
          dist: this.prevDist,
          bestMult: this.runStats.bestMultiplier,
        });
        break;
      case 'victory':
        this.music.onVictory();
        this.sfx.victory();
        this.sfx.stopAll();
        this.screens.show('victory', {
          stats: {
            score: Math.round(this.score.score),
            bits: this.score.bits,
            nearMisses: this.score.nearMisses,
            bestMult: this.runStats.bestMultiplier,
            time: this.runTime,
            integrity: this.playerState.integrity,
            stars: starRating(this.score.score),
          },
        });
        break;
      case 'playing':
        this.screens.show('none');
        break;
      default:
        break;
    }
    if (next.startCountdown) {
      if (this.botEnabled) {
        // Bot mode: skip the 3-2-1-GO countdown, go straight to playing.
        this.screens.show('none');
        this.doFlow({ type: 'countdownDone' });
      } else {
        this.screens.runCountdown((n: number) => {
          this.sfx.countdown(n);
        }, () => {
          this.doFlow({ type: 'countdownDone' });
        });
      }
    }
  }

  /**
   * M14b: load the realistic runner asynchronously. The classic model stays
   * visible until the GLB is ready (swap on ready), and if the load fails
   * (network/decoder error) we fall back to the classic model with one
   * console.warn.
   */
  private startRealisticRunner(): void {
    const runner = new RealisticRunner();
    runner.ready.then(() => {
      if (this.charChoice !== 'real') return;
      this.charActive = 'real';
      this.classicModel.getModel().visible = false;
      this.scene.add(runner.getModel());
      this.playerModel = runner;
      this.cameraRig.setRealisticMode(true);
    }).catch((err: unknown) => {
      console.warn('[neon-runner] realistic runner failed to load, falling back to classic model:', err);
      this.charActive = 'classic';
      this.classicModel.getModel().visible = true;
      this.playerModel = this.classicModel;
      this.cameraRig.setRealisticMode(false);
    });
  }

  private setupInput(): void {
    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.repeat) return;
      // First user gesture: unlock Web Audio (browser autoplay rule, SPEC §9).
      this.audio.unlock();
      this.music.unlock();
      const key = event.key;
      const gameKeys = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', ' ', 'a', 'd', 'w', 's', 'A', 'D', 'W', 'S', 'Shift'];
      if (gameKeys.includes(key)) event.preventDefault();

      switch (key) {
        case 'ArrowLeft': case 'a': case 'A': Input.add('left'); break;
        case 'ArrowRight': case 'd': case 'D': Input.add('right'); break;
        case 'ArrowUp': case 'w': case 'W': case ' ': Input.add('jump'); break;
        case 'ArrowDown': case 's': case 'S': case 'Shift': Input.add('slide'); break;
        case 'Escape': case 'p': case 'P':
          if (this.gameState === 'playing') this.doFlow({ type: 'pause' });
          else if (this.gameState === 'paused') this.doFlow({ type: 'resume' });
          break;
        case 'r': case 'R':
          if (this.gameState === 'gameover' || this.gameState === 'victory' || this.gameState === 'paused') {
            this.screens.cancelCountdown();
            this.doFlow({ type: 'restart' });
          }
          break;
        case 'q': case 'Q': {
          const q = this.renderer.toggleQuality();
          this.particles.setQuality(q);
          break;
        }
        case 'm': case 'M':
          this.audio.toggleMuted();
          break;
        case 'Enter':
          if (this.gameState === 'title') this.doFlow({ type: 'start' });
          break;
        default:
          return;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
  }

  private resetRun(): void {
    this.playerState = createPlayerState();
    this.playerModel.reset();
    this.playerModel.getModel().visible = true;
    this.cycleModel.getModel().visible = false;
    this.cameraRig.setCycleMode(false);
    this.trail.reset();
    this.runStats = resetStats();
    this.score = createScoreState();
    this.collisionCtx = createCollisionCtx();
    this.bossState = createBossState();
    this.bot = createBot();
    this.bossView.reset();
    this.finishPortal.reset();
    this.victorySlowMo = -1;
    this.prevMode = 'runner';
    this.modeFlashTimer = 0;
    this.runTime = 0;
    this.prevDist = 0;
    this.boostTimer = 0;
    this.glitchTimer = 0;
    this.obstacles.reset(0);
    this.particles.reset();
    clearPopups(this.popups);
    this.prevGrounded = true;
    this.prevLane = 0;
    this.prevSliding = false;
    this.prevWall = false;
    this.wallrunPopupTimer = 0;
    this.sfx.stopAll();
    this.hud.reset();
    this.track.update(0);
    this.setPieces.update(0, 0);
    this.skyline.update(0);
    this.environment.setSection(0);
    this.track.setSection(0);
  }

  private buildEnv(): PlayerEnvironment {
    const level = this.level;
    const speed = sectionSpeedAt(this.prevDist)
      * (this.boostTimer > 0 ? BOOST_FACTOR : 1)
      * this.playerState.speedMultiplier;
    return {
      isGapAt: (z: number) => isGapAt(level, z),
      wallStripAt: (z: number, side: number) => wallStripAt(level, z, side as -1 | 1),
      firstSolidFloorAfter: (z: number) => firstSolidFloorAfter(level, z),
      speed,
      mode: 'runner',
    };
  }

  private consumeActions(): PlayerActions {
    const buffered = Input.get();
    const actions: PlayerActions = { ...IDLE_ACTIONS };
    for (const a of buffered) {
      actions[a as Action] = true;
    }
    Input.clear();
    return actions;
  }

  private applyHit(): void {
    const s = this.playerState;
    s.integrity = Math.max(0, s.integrity - 1);
    s.speedMultiplier = 0.65;
    s.invulnerabilityTimer = 2.0;
    applyHit(this.score);
    this.glitchTimer = 0.35;
    this.cameraRig.addShake(0.5, 0.5);
    this.music.duck();
    this.hud.flashHit();
    pushPopup(this.popups, 'HIT!', 'danger');
  }

  private handleEvents(prevDist: number, dist: number): void {
    this.collisionCtx.time = this.runTime;
    const events = checkCollisions(this.playerState, prevDist, dist, this.level, this.collisionCtx);
    const s = this.playerState;
    for (const e of events) {
      switch (e.kind) {
        case 'hit':
          this.applyHit();
          this.sfx.hit();
          break;
        case 'nearMiss':
          addNearMiss(this.score);
          pushPopup(this.popups, '+250 NEAR MISS');
          this.sfx.laneTick();
          break;
        case 'bit':
          addBit(this.score);
          this.particles.bitPickup(s.x, s.y + 1, s.z);
          this.sfx.bitPing(this.score.streak);
          if (this.score.mult > this.runStats.bestMultiplier) {
            this.runStats.bestMultiplier = this.score.mult;
            pushPopup(this.popups, `MULTIPLIER ×${this.score.mult}`, 'good');
            this.sfx.multUp();
          }
          break;
        case 'core': {
          addCore(this.score);
          this.particles.bitPickup(s.x, s.y + 1, s.z);
          pushPopup(this.popups, 'CORE +5000', 'good');
          this.sfx.multUp();
          const d = -s.z;
          for (let i = 0; i < 3; i++) {
            if (Math.abs(d - CORE_Z[i]) < 5 && !this.bossState.coresCollected.includes(i)) {
              this.bossState.coresCollected.push(i);
            }
          }
          if (this.bossState.coresCollected.length === 3) {
            this.hud.showBanner('SENTINEL OVERLOAD');
            pushPopup(this.popups, 'SENTINEL OVERLOAD', 'good');
          }
          break;
        }
        case 'repair':
          s.integrity = Math.min(MAX_INTEGRITY, s.integrity + 1);
          this.particles.bitPickup(s.x, s.y + 1, s.z);
          pushPopup(this.popups, 'REPAIR +1', 'good');
          this.sfx.repair();
          break;
        case 'boost':
          addBoost(this.score);
          this.boostTimer = BOOST_DURATION;
          this.particles.boost(s.x, s.y, s.z);
          pushPopup(this.popups, 'BOOST +500', 'good');
          this.sfx.boost();
          break;
        default:
          break;
      }
    }
  }

  private loop(now: number): void {
    this.rafId = requestAnimationFrame(this.loop);
    const dt = Math.min(0.1, (now - this.lastTime) / 1000);
    this.lastTime = now;

    // FPS tracking.
    if (dt > 0) {
      this.fpsAccum += dt;
      this.fpsFrames += 1;
      if (this.fpsAccum >= 0.5) {
        this.fps = Math.round(this.fpsFrames / this.fpsAccum);
        this.fpsAccum = 0;
        this.fpsFrames = 0;
      }
    }

    // Auto-downgrade to Low if average fps < 40 for 3 s during play (SPEC §8.1).
    if (this.gameState === 'playing' && this.fps > 0 && this.fps < 40) {
      this.lowFpsTime += dt;
      if (this.lowFpsTime >= 3 && this.renderer.getQuality() === 'High') {
        this.renderer.setQuality('Low');
        this.particles.setQuality('Low');
      }
    } else {
      this.lowFpsTime = 0;
    }

    if (this.gameState === 'title') {
      // Attract mode: slow orbit behind the title screen.
      this.cameraRig.updateAttract(dt, this.tmpVec.set(0, 1, -20));
      this.track.update(20);
      this.setPieces.update(20, dt);
      this.skyline.update(20);
      this.environment.update(20, this.cameraRig.getCamera());
      this.obstacles.update(20, now / 1000, this.collisionCtx.collected);
    } else if (this.gameState === 'countdown') {
      this.cameraRig.updateIntro(dt, this.tmpVec.set(this.playerState.x, this.playerState.y, this.playerState.z));
    } else if (this.gameState === 'playing') {
      this.updatePlaying(dt);
    } else if (this.gameState === 'gameover' || this.gameState === 'victory') {
      // Keep effects (death shatter, victory bits) animating behind the panel.
      this.particles.update(dt, this.playerState.x, this.playerState.y, this.playerState.z);
      this.bossView.update(this.prevDist, this.bossState, dt);
      this.finishPortal.update(this.prevDist, dt);
      stepPopups(this.popups, dt);
      this.hud.renderPopups(this.popups);
    }

    // Post FX: chromatic aberration scales with speed, glitch decays on hits.
    const speed = this.gameState === 'playing'
      ? sectionSpeedAt(this.prevDist) * this.playerState.speedMultiplier
      : 20;
    const chromatic = 0.0006 + (speed / 36) * 0.0019;
    if (this.glitchTimer > 0) this.glitchTimer = Math.max(0, this.glitchTimer - dt);
    this.renderer.setPostFX(now / 1000, chromatic, this.glitchTimer > 0 ? 1 : 0);

    this.renderer.render();

    // Debug panel (SPEC §12: ?debug=1 shows fps/draw calls/triangles).
    if (this.debugEnabled) {
      const info = this.renderer.getRenderer().info.render;
      this.hud.setDebug(true, {
        fps: this.fps,
        drawCalls: info.calls,
        triangles: info.triangles,
        quality: this.renderer.getQuality(),
        muted: this.audio.isMuted,
        char: this.charActive,
      });
    }
  }

  private updatePlaying(dt: number): void {
    this.runTime += dt;
    if (this.boostTimer > 0) this.boostTimer = Math.max(0, this.boostTimer - dt);
    const actions = this.botEnabled
      ? botActions(this.bot, this.playerState, this.level, this.prevDist, this.runTime)
      : this.consumeActions();
    const env = this.buildEnv();
    const frameStartDist = this.prevDist;
    // Victory slow-mo: scale simulation time to 0.3 for the 1.5 s run-in.
    const simDt = this.victorySlowMo > 0 ? dt * 0.3 : dt;

    // Fixed-timestep simulation at 120 Hz with an accumulator.
    let acc = simDt;
    let first = true;
    let stepDist = this.prevDist;
    while (acc >= DT) {
      // Drive forward motion: player runs toward -Z (SPEC §1), dist = -z.
      this.playerState.vz = -env.speed;
      stepPlayer(this.playerState, first ? actions : IDLE_ACTIONS, DT, env);
      first = false;
      acc -= DT;
      stepDist = -this.playerState.z;
      this.handleEvents(this.prevDist, stepDist);
      this.prevDist = stepDist;
      if (this.playerState.integrity <= 0) break;
    }

    const dist = -this.playerState.z;

    // Game over at integrity 0.
    if (this.playerState.integrity <= 0) {
      this.playerModel.triggerShatter();
      this.particles.deathBurst(this.playerState.x, this.playerState.y, this.playerState.z);
      this.glitchTimer = 1.5;
      this.doFlow({ type: 'hit' });
      return;
    }

    // Victory at the finish gate: 1.5 s slow-mo run-in, then the victory screen.
    if (this.victorySlowMo < 0 && dist >= this.level.length) {
      this.victorySlowMo = 1.5;
      this.particles.deathBurst(this.playerState.x, this.playerState.y, this.playerState.z);
      return;
    }
    if (this.victorySlowMo > 0) {
      this.victorySlowMo -= dt;
      // Keep the camera and portal animating during the slow-mo run-in.
      this.cameraRig.update(this.playerState, dt, env.speed * this.playerState.speedMultiplier);
      this.finishPortal.update(dist, dt);
      this.bossView.update(dist, this.bossState, dt);
      if (this.victorySlowMo <= 0) {
        this.victorySlowMo = -1;
        addVictoryBonus(this.score, this.playerState.integrity, this.runTime);
        this.doFlow({ type: 'finish' });
      }
      return;
    }

    // Section tracking + banner.
    let sectionIdx = 0;
    for (let i = 0; i < SECTIONS.length; i++) {
      if (dist >= SECTIONS[i].z0 && dist < SECTIONS[i].z1) { sectionIdx = i; break; }
    }
    if (sectionIdx !== this.runStats.section) {
      this.runStats.section = sectionIdx;
      this.hud.showBanner(`SECTION ${sectionIdx} — ${SECTIONS[sectionIdx].name}`);
      this.environment.setSection(sectionIdx);
      this.track.setSection(sectionIdx);
    }

    // Cycle-mode auto transition at section 4 bounds (SPEC §4.4).
    const mode = modeAt(dist);
    if (mode !== this.prevMode) {
      this.playerState.mode = mode;
      this.playerModel.getModel().visible = mode === 'runner';
      this.cycleModel.getModel().visible = mode === 'cycle';
      this.cameraRig.setCycleMode(mode === 'cycle');
      this.modeFlashTimer = 1.0;
      pushPopup(this.popups, mode === 'cycle' ? 'LIGHT CYCLE' : 'RUNNER', 'good');
      this.prevMode = mode;
    }
    if (this.modeFlashTimer > 0) this.modeFlashTimer = Math.max(0, this.modeFlashTimer - dt);

    // Boss: telegraph whine + plasma bolt hits (SPEC §5.4).
    this.updateBoss(dist, dt);

    // Laser gate buzz when passing through one.
    for (const o of obstaclesInRange(this.level, frameStartDist, dist)) {
      if (o.type === 'laser' && o.z > frameStartDist && o.z <= dist) this.sfx.laserBuzz();
    }

    // Score: distance trickle + wall-run trickle.
    addDistance(this.score, Math.max(0, dist - frameStartDist));
    if (this.playerState.isWallRunning) {
      addWallRun(this.score, dt);
      this.wallrunPopupTimer += dt;
      if (this.wallrunPopupTimer >= 0.5) {
        this.wallrunPopupTimer = 0;
        pushPopup(this.popups, `WALLRUN ${Math.round(60 * this.score.mult * 0.5)}`, 'good');
      }
      this.particles.wallRunSparks(
        this.playerState.x, this.playerState.y, this.playerState.z,
        this.playerState.wallSide,
      );
    }

    // Landing shockwave (grounded transition) + SFX.
    if (this.prevGrounded && !this.playerState.isGrounded) {
      this.sfx.jump();
    } else if (!this.prevGrounded && this.playerState.isGrounded) {
      this.particles.landing(this.playerState.x, this.playerState.y, this.playerState.z);
      this.sfx.land();
    }
    this.prevGrounded = this.playerState.isGrounded;

    // Slide start SFX.
    if (this.playerState.isSliding && !this.prevSliding) this.sfx.slide();
    this.prevSliding = this.playerState.isSliding;

    // Lane change tick.
    if (this.playerState.lane !== this.prevLane) this.sfx.laneTick();
    this.prevLane = this.playerState.lane;

    // Wall-run hum loop.
    if (this.playerState.isWallRunning && !this.prevWall) this.sfx.wallHumStart();
    else if (!this.playerState.isWallRunning && this.prevWall) this.sfx.wallHumStop();
    this.prevWall = this.playerState.isWallRunning;

    // Slide sparks.
    if (this.playerState.slideTimer > 0 && this.playerState.isGrounded) {
      this.particles.slideSparks(this.playerState.x, this.playerState.y, this.playerState.z);
    }

    // Popup queue: age + render.
    stepPopups(this.popups, dt);
    this.hud.renderPopups(this.popups);

    this.runStats.score = this.score.score;
    this.runStats.bestMultiplier = this.score.bestMult;
    this.runStats.distance = dist;
    this.runStats.integrity = this.playerState.integrity;
    this.runStats.multiplier = this.score.mult;
    this.runStats.time = this.runTime;
    this.runStats.bitsCollected = this.score.bits;
    this.runStats.nearMisses = this.score.nearMisses;

    // Contextual prompts (pure selection in ui/prompts.ts).
    const s = this.playerState;
    this.hud.setPrompt(selectPrompt({
      level: this.level,
      dist,
      lane: s.lane,
      isWallRunning: s.isWallRunning,
      wallSide: s.wallSide,
      wallRow: s.wallRow,
    }));

    this.hud.update(
      this.score.score,
      this.playerState.integrity,
      this.score.mult,
      this.score.streak,
      dist,
      SECTIONS[sectionIdx].name,
      dt,
    );

    // Render updates.
    if (this.playerState.mode === 'runner') {
      this.playerModel.update(this.playerState, dt, env.speed);
      this.trail.update(this.tmpVec.set(this.playerState.x, this.playerState.y, this.playerState.z));
    } else {
      this.cycleModel.update(this.playerState);
    }
    this.cameraRig.update(this.playerState, dt, env.speed * this.playerState.speedMultiplier);
    this.track.update(dist);
    this.setPieces.update(dist, dt);
    this.skyline.update(dist);
    this.music.update(dist, dt);
    const beat = this.music.getBeat();
    this.environment.setBeat(beatPulse(beat.phase));
    this.environment.update(dist, this.cameraRig.getCamera());
    this.obstacles.update(dist, this.runTime, this.collisionCtx.collected);
    this.bossView.update(dist, this.bossState, dt);
    this.finishPortal.update(dist, dt);
    this.particles.update(dt, this.playerState.x, this.playerState.y, this.playerState.z);
  }

  public getGameState(): GameState {
    return this.gameState;
  }

  /**
   * Boss encounter (SPEC §5.4): play the telegraph whine when a new attack
   * fires and apply a hit when a plasma bolt reaches the player (in a
   * telegraphed lane, below 1.4 m, not invulnerable).
   */
  private updateBoss(dist: number, dt: number): void {
    if (dist < 6700 || dist >= 7700) return;
    const attacks = attacksBefore(dist, this.bossState);
    const last = attacks[attacks.length - 1];
    if (last && last.fireZ > this.bossState.lastFireZ) {
      this.bossState.lastFireZ = last.fireZ;
      this.sfx.telegraph();
      this.sfx.bolt();
    }
    const s = this.playerState;
    if (s.invulnerabilityTimer <= 0 && boltHitsPlayer(dist, s.lane, s.y, this.bossState)) {
      this.applyHit();
    }
    void dt;
  }

  public getPlayerState(): PlayerState {
    return this.playerState;
  }

  public getScore(): number {
    return this.score.score;
  }

  public getMult(): number {
    return this.score.mult;
  }

  public getBits(): number {
    return this.score.bits;
  }

  public getNearMisses(): number {
    return this.score.nearMisses;
  }

  public getMaxMult(): number {
    return this.score.bestMult;
  }

  public getDist(): number {
    return this.prevDist;
  }

  public getSection(): number {
    return this.runStats.section;
  }

  public getFps(): number {
    return this.fps;
  }

  public getQuality(): 'High' | 'Low' {
    return this.renderer.getQuality();
  }

  public startRun(): void {
    if (this.gameState === 'title') this.doFlow({ type: 'start' });
    else if (this.gameState === 'gameover' || this.gameState === 'victory') {
      this.screens.cancelCountdown();
      this.doFlow({ type: 'restart' });
    }
  }

  /** Enable/disable the auto-pilot bot (SPEC §12). */
  public setBot(on: boolean): void {
    this.botEnabled = on;
    if (on) this.bot = createBot();
  }

  public teleport(distMeters: number): void {
    const d = Math.max(0, Math.min(this.level.length, distMeters));
    this.playerState.z = -d;
    this.playerState.x = 0;
    this.playerState.y = 0;
    this.playerState.lane = 0;
    this.playerState.vy = 0;
    this.playerState.isGrounded = true;
    this.prevDist = d;
    this.obstacles.reset(d);
    this.track.update(d);
    this.setPieces.update(d, 0);
    this.skyline.update(d);
  }

  public dispose(): void {
    cancelAnimationFrame(this.rafId);
    this.hud.destroy();
    this.setPieces.dispose();
    this.bossView.dispose();
    this.finishPortal.dispose();
    this.renderer.dispose();
  }
}
