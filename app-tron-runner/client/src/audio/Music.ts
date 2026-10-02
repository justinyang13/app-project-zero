/**
 * Music — run/boss tracks from assets/audio (SPEC §9, §5.1).
 *
 * - Two looping <audio> elements routed through Web Audio
 *   (MediaElementAudioSourceNode → bus gain → low-pass → master).
 * - 2 s crossfade to boss.mp3 at 3700 m.
 * - Duck to 0.3 for 0.5 s on hits.
 * - Low-pass sweep + fade to 0.2 on game over.
 * - Fade-out + synthesized chime arpeggio on victory.
 * - getBeat() with a timer fallback when audio is unavailable.
 *
 * Never throws: if audio is blocked or files are missing the game keeps
 * running and getBeat() falls back to a wall-clock timer.
 */

import type { AudioEngine } from './AudioEngine';
import { beatAt, trackForDist, RUN_BPM, BOSS_BPM } from './beat';
import type { BeatInfo } from './beat';

const MUSIC_VOLUME = 0.55;
const CROSSFADE_SECONDS = 2;
const DUCK_LEVEL = 0.3;
const DUCK_SECONDS = 0.5;
const GAMEOVER_LEVEL = 0.2;

type TrackName = 'run' | 'boss';

interface TrackSlot {
  name: TrackName;
  element: HTMLAudioElement | null;
  source: MediaElementAudioSourceNode | null;
  bpm: number;
}

export class Music {
  private engine: AudioEngine;
  private base: string;
  private bus: GainNode | null = null;
  private lowpass: BiquadFilterNode | null = null;
  private tracks: Record<TrackName, TrackSlot>;
  private active: TrackName = 'run';
  private fading: TrackName | null = null;
  private duckTimer = 0;
  private gameOver = false;
  private victory = false;
  private started = false;
  private paused = false;
  // Timer fallback clock (seconds of music elapsed).
  private fallbackClock = 0;

  constructor(engine: AudioEngine, base: string) {
    this.engine = engine;
    this.base = base;
    this.tracks = {
      run: { name: 'run', element: null, source: null, bpm: RUN_BPM },
      boss: { name: 'boss', element: null, source: null, bpm: BOSS_BPM },
    };
  }

  /** Build audio elements + Web Audio graph. Call after engine.unlock(). */
  unlock(): void {
    if (this.bus) return;
    const ctx = this.engine.context;
    if (!ctx || !this.engine.masterGain) return;
    try {
      this.bus = ctx.createGain();
      this.bus.gain.value = 0;
      this.lowpass = ctx.createBiquadFilter();
      this.lowpass.type = 'lowpass';
      this.lowpass.frequency.value = 20000;
      this.bus.connect(this.lowpass);
      this.lowpass.connect(this.engine.masterGain);

      for (const name of ['run', 'boss'] as TrackName[]) {
        const el = new Audio(`${this.base}assets/audio/${name}.mp3`);
        el.loop = true;
        el.preload = 'auto';
        el.volume = 1;
        el.addEventListener('error', () => undefined); // missing file: stay silent
        const source = ctx.createMediaElementSource(el);
        source.connect(this.bus);
        this.tracks[name] = { ...this.tracks[name], element: el, source };
      }
    } catch {
      this.bus = null;
      this.lowpass = null;
    }
  }

  /** Start the run track from the beginning (countdown → playing). */
  startRun(): void {
    this.started = true;
    this.gameOver = false;
    this.victory = false;
    this.fading = null;
    this.duckTimer = 0;
    this.active = 'run';
    this.fallbackClock = 0;
    this.setBusTarget(0, 0.05);
    try {
      const run = this.tracks.run.element;
      const boss = this.tracks.boss.element;
      if (boss) { boss.pause(); boss.currentTime = 0; }
      if (run) {
        run.currentTime = 0;
        void run.play().catch(() => undefined);
      }
    } catch {
      // audio blocked — timer fallback keeps beats alive
    }
    if (this.started) this.setBusTarget(MUSIC_VOLUME, 0.4);
  }

  /** Per-frame update: crossfade at 3700 m, duck decay, fallback clock. */
  update(dist: number, dt: number): void {
    const target = trackForDist(dist);
    if (target !== this.active && !this.fading) {
      this.startCrossfade(target);
    }
    if (this.duckTimer > 0) {
      this.duckTimer = Math.max(0, this.duckTimer - dt);
      if (this.duckTimer === 0 && !this.gameOver && !this.victory) {
        this.setBusTarget(MUSIC_VOLUME, 0.15);
      }
    }
    // Timer fallback clock (used by getBeat when the element is not playing).
    if (!this.elementPlaying()) {
      this.fallbackClock += dt;
    }
  }

  /** Duck music to 0.3 for 0.5 s (hit). */
  duck(): void {
    if (!this.started || this.gameOver || this.victory) return;
    this.duckTimer = DUCK_SECONDS;
    this.setBusTarget(DUCK_LEVEL, 0.05);
  }

  /** Game over: low-pass sweep + fade to 0.2 (SPEC §9). */
  onGameOver(): void {
    this.gameOver = true;
    this.victory = false;
    this.duckTimer = 0;
    this.setBusTarget(GAMEOVER_LEVEL, 0.8);
    const ctx = this.engine.context;
    if (ctx && this.lowpass) {
      try {
        const now = ctx.currentTime;
        this.lowpass.frequency.cancelScheduledValues(now);
        this.lowpass.frequency.setValueAtTime(this.lowpass.frequency.value, now);
        this.lowpass.frequency.exponentialRampToValueAtTime(180, now + 1.2);
      } catch {
        // ignore
      }
    }
  }

  /** Victory: fade out + synthesized chime arpeggio (SPEC §9). */
  onVictory(): void {
    this.victory = true;
    this.gameOver = false;
    this.duckTimer = 0;
    this.setBusTarget(0, 1.2);
    try {
      const run = this.tracks.run.element;
      const boss = this.tracks.boss.element;
      if (run) run.pause();
      if (boss) boss.pause();
    } catch {
      // ignore
    }
    this.playChime();
  }

  pause(): void {
    this.paused = true;
    this.engine.suspend();
  }

  resume(): void {
    this.paused = false;
    this.engine.resume();
  }

  /** Current beat info (SPEC §9 getBeat). Never throws. */
  getBeat(): BeatInfo {
    const slot = this.tracks[this.active];
    const el = slot.element;
    let elapsed: number;
    if (el && !el.paused && el.currentTime > 0) {
      elapsed = el.currentTime;
    } else {
      elapsed = this.fallbackClock;
    }
    return beatAt(elapsed, slot.bpm);
  }

  get isPaused(): boolean {
    return this.paused;
  }

  // ---------------------------------------------------------------- internals

  private elementPlaying(): boolean {
    const el = this.tracks[this.active].element;
    return !!el && !el.paused;
  }

  private startCrossfade(target: TrackName): void {
    this.fading = target;
    const ctx = this.engine.context;
    const from = this.tracks[this.active];
    const to = this.tracks[target];
    try {
      const el = to.element;
      if (el) {
        el.currentTime = 0;
        void el.play().catch(() => undefined);
      }
    } catch {
      // ignore
    }
    if (ctx) {
      void ctx; // (kept for API symmetry; ramps are JS-driven below)
      if (from.element) {
        const fromEl = from.element;
        fromEl.volume = MUSIC_VOLUME;
        fromEl.muted = false;
        this.rampElementVolume(fromEl, 0, CROSSFADE_SECONDS, () => {
          fromEl.pause();
        });
      }
      if (to.element) {
        to.element.volume = 0;
        this.rampElementVolume(to.element, MUSIC_VOLUME, CROSSFADE_SECONDS, () => undefined);
      }
    }
    this.active = target;
    this.fading = null;
  }

  /** JS-driven volume ramp (HTMLAudioElement.volume is not Web-Audio animatable). */
  private rampElementVolume(
    el: HTMLAudioElement,
    target: number,
    duration: number,
    onDone: () => void,
  ): void {
    const start = el.volume;
    const t0 = performance.now();
    const step = (): void => {
      const t = Math.min(1, (performance.now() - t0) / (duration * 1000));
      el.volume = start + (target - start) * t;
      if (t < 1) {
        window.setTimeout(step, 33);
      } else {
        onDone();
      }
    };
    step();
  }

  private setBusTarget(value: number, timeConstant: number): void {
    const ctx = this.engine.context;
    if (!ctx || !this.bus) return;
    try {
      this.bus.gain.setTargetAtTime(value, ctx.currentTime, timeConstant);
    } catch {
      // ignore
    }
  }

  /** Synthesized victory chime arpeggio (SPEC §9). */
  private playChime(): void {
    const ctx = this.engine.context;
    if (!ctx || !this.engine.masterGain) return;
    try {
      const notes = [523.25, 659.25, 783.99, 1046.5, 1318.5]; // C5 E5 G5 C6 E6
      const now = ctx.currentTime;
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = freq;
        const t = now + i * 0.12;
        gain.gain.setValueAtTime(0, t);
        gain.gain.linearRampToValueAtTime(0.18, t + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.9);
        osc.connect(gain);
        gain.connect(this.engine.masterGain as GainNode);
        osc.start(t);
        osc.stop(t + 1);
      });
    } catch {
      // ignore
    }
  }
}
