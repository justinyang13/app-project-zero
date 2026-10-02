/**
 * Sfx — procedural sound effects via Web Audio oscillators / noise buffers
 * (SPEC §9). No audio files. Every method is defensive: if the AudioContext
 * is unavailable or blocked the game keeps running silently.
 */

import type { AudioEngine } from './AudioEngine';
import {
  bitPingFreq,
  countdownFreq,
  fanfare,
  gameOverSweep,
  noiseData,
} from './sfxParams';

interface ToneOpts {
  type: OscillatorType;
  f0: number;
  f1?: number; // optional sweep target
  at?: number; // start offset (s)
  dur: number;
  gain?: number;
  attack?: number;
  decay?: number;
  sustain?: number;
  release?: number;
  curve?: number;
}

interface NoiseOpts {
  at?: number;
  dur: number;
  gain?: number;
  filterType?: BiquadFilterType;
  f0?: number;
  f1?: number;
  q?: number;
  seed?: number;
}

export class Sfx {
  private engine: AudioEngine;
  private humNodes: { src: AudioBufferSourceNode; gain: GainNode } | null = null;

  constructor(engine: AudioEngine) {
    this.engine = engine;
  }

  // ---------------------------------------------------------------- helpers

  private tone(o: ToneOpts): void {
    const ctx = this.engine.context;
    const master = this.engine.masterGain;
    if (!ctx || !master || ctx.state !== 'running') return;
    try {
      const t0 = ctx.currentTime + (o.at ?? 0);
      const osc = ctx.createOscillator();
      osc.type = o.type;
      const f1 = o.f1 ?? o.f0;
      osc.frequency.setValueAtTime(Math.max(1, o.f0), t0);
      if (f1 !== o.f0) {
        osc.frequency.setValueAtTime(Math.max(1, o.f0), t0);
        osc.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t0 + o.dur);
      }
      const g = ctx.createGain();
      const attack = o.attack ?? 0.005;
      const decay = o.decay ?? 0.02;
      const sustain = o.sustain ?? 0.6;
      const release = o.release ?? Math.min(0.08, o.dur * 0.4);
      const peak = o.gain ?? 0.3;
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.linearRampToValueAtTime(peak, t0 + attack);
      g.gain.setTargetAtTime(peak * sustain, t0 + attack, decay);
      g.gain.setTargetAtTime(0.0001, t0 + o.dur, release / 3);
      osc.connect(g);
      g.connect(master);
      osc.start(t0);
      osc.stop(t0 + o.dur + release + 0.1);
    } catch {
      // ignore — audio must never break the game
    }
  }

  private noise(o: NoiseOpts): void {
    const ctx = this.engine.context;
    const master = this.engine.masterGain;
    if (!ctx || !master || ctx.state !== 'running') return;
    try {
      const t0 = ctx.currentTime + (o.at ?? 0);
      const len = Math.max(1, Math.floor(ctx.sampleRate * o.dur));
      const buf = ctx.createBuffer(1, len, ctx.sampleRate);
      const data = buf.getChannelData(0);
      const samples = noiseData(o.seed ?? 1337, len);
      for (let i = 0; i < len; i++) data[i] = samples[i];
      const src = ctx.createBufferSource();
      src.buffer = buf;
      const filter = ctx.createBiquadFilter();
      filter.type = o.filterType ?? 'bandpass';
      const f0 = o.f0 ?? 1000;
      const f1 = o.f1 ?? f0;
      filter.frequency.setValueAtTime(Math.max(20, f0), t0);
      if (f1 !== f0) {
        filter.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t0 + o.dur);
      }
      filter.Q.value = o.q ?? 1;
      const g = ctx.createGain();
      const peak = o.gain ?? 0.25;
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.linearRampToValueAtTime(peak, t0 + 0.01);
      g.gain.setTargetAtTime(0.0001, t0 + o.dur, 0.03);
      src.connect(filter);
      filter.connect(g);
      g.connect(master);
      src.start(t0);
      src.stop(t0 + o.dur + 0.2);
    } catch {
      // ignore
    }
  }

  // ---------------------------------------------------------------- effects

  /** Bit pickup: rising sine ping, pitch rises with the streak. */
  bitPing(streak: number): void {
    const f = bitPingFreq(streak);
    this.tone({ type: 'sine', f0: f, f1: f * 1.5, dur: 0.12, gain: 0.22 });
  }

  /** Jump: filtered noise whoosh sweep up. */
  jump(): void {
    this.noise({ dur: 0.18, gain: 0.18, filterType: 'bandpass', f0: 400, f1: 2400, q: 1.2 });
  }

  /** Land: low thud (sine drop) + short noise burst. */
  land(): void {
    this.tone({ type: 'sine', f0: 160, f1: 50, dur: 0.16, gain: 0.35 });
    this.noise({ dur: 0.08, gain: 0.12, filterType: 'lowpass', f0: 500 });
  }

  /** Slide: hissy noise sweep down. */
  slide(): void {
    this.noise({ dur: 0.3, gain: 0.14, filterType: 'highpass', f0: 3000, f1: 1200 });
  }

  /** Lane change: short tick. */
  laneTick(): void {
    this.tone({ type: 'square', f0: 880, dur: 0.05, gain: 0.08 });
  }

  /** Wall-run hum: looped filtered noise while on the wall. */
  wallHumStart(): void {
    const ctx = this.engine.context;
    const master = this.engine.masterGain;
    if (!ctx || !master || ctx.state !== 'running') return;
    this.wallHumStop();
    try {
      const len = Math.floor(ctx.sampleRate * 1);
      const buf = ctx.createBuffer(1, len, ctx.sampleRate);
      const data = buf.getChannelData(0);
      const samples = noiseData(7, len);
      for (let i = 0; i < len; i++) data[i] = samples[i];
      const src = ctx.createBufferSource();
      src.buffer = buf;
      src.loop = true;
      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = 900;
      filter.Q.value = 2;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, ctx.currentTime);
      g.gain.setTargetAtTime(0.1, ctx.currentTime, 0.05);
      src.connect(filter);
      filter.connect(g);
      g.connect(master);
      src.start();
      this.humNodes = { src, gain: g };
    } catch {
      this.humNodes = null;
    }
  }

  wallHumStop(): void {
    const ctx = this.engine.context;
    if (!this.humNodes || !ctx) {
      this.humNodes = null;
      return;
    }
    try {
      const { src, gain } = this.humNodes;
      gain.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.05);
      src.stop(ctx.currentTime + 0.3);
    } catch {
      // ignore
    }
    this.humNodes = null;
  }

  /** Hit: distorted square + noise burst. */
  hit(): void {
    this.tone({ type: 'square', f0: 220, f1: 60, dur: 0.3, gain: 0.3 });
    this.tone({ type: 'sawtooth', f0: 110, f1: 40, dur: 0.35, gain: 0.2 });
    this.noise({ dur: 0.25, gain: 0.25, filterType: 'lowpass', f0: 3000, f1: 300 });
  }

  /** Boost: rising saw sweep. */
  boost(): void {
    this.tone({ type: 'sawtooth', f0: 200, f1: 1600, dur: 0.4, gain: 0.2 });
    this.tone({ type: 'sine', f0: 400, f1: 3200, dur: 0.4, gain: 0.12 });
  }

  /** Laser on/off buzz. */
  laserBuzz(): void {
    this.tone({ type: 'sawtooth', f0: 120, dur: 0.25, gain: 0.12 });
    this.tone({ type: 'square', f0: 240, dur: 0.25, gain: 0.06 });
  }

  /** Boss telegraph: rising whine. */
  telegraph(): void {
    this.tone({ type: 'sine', f0: 300, f1: 1800, dur: 0.9, gain: 0.15, sustain: 0.8 });
    this.tone({ type: 'sine', f0: 302, f1: 1810, dur: 0.9, gain: 0.1, sustain: 0.8 });
  }

  /** Plasma bolt fire: sharp zap. */
  bolt(): void {
    this.tone({ type: 'sawtooth', f0: 2000, f1: 200, dur: 0.25, gain: 0.25 });
    this.noise({ dur: 0.15, gain: 0.2, filterType: 'highpass', f0: 2000 });
  }

  /** Repair pickup: two-note chime. */
  repair(): void {
    this.tone({ type: 'sine', f0: 660, dur: 0.15, gain: 0.2 });
    this.tone({ type: 'sine', f0: 990, at: 0.12, dur: 0.25, gain: 0.2 });
  }

  /** Multiplier up: bright two-note chime. */
  multUp(): void {
    this.tone({ type: 'triangle', f0: 880, dur: 0.1, gain: 0.18 });
    this.tone({ type: 'triangle', f0: 1320, at: 0.09, dur: 0.18, gain: 0.18 });
  }

  /** Countdown beep: 3-2-1 low, GO high. */
  countdown(step: number): void {
    this.tone({ type: 'square', f0: countdownFreq(step), dur: 0.15, gain: 0.15 });
  }

  /** Game over: descending saw sweep. */
  gameOver(): void {
    const s = gameOverSweep();
    this.tone({ type: 'sawtooth', f0: s.f0, f1: s.f1, dur: s.dur, gain: 0.25, sustain: 0.7 });
    this.tone({ type: 'sine', f0: s.f0 / 2, f1: s.f1 / 2, dur: s.dur, gain: 0.2, sustain: 0.7 });
  }

  /** Victory: rising C-major arpeggio. */
  victory(): void {
    for (const n of fanfare()) {
      this.tone({ type: 'sine', f0: n.freq, at: n.at, dur: n.dur, gain: 0.2 });
      this.tone({ type: 'triangle', f0: n.freq / 2, at: n.at, dur: n.dur, gain: 0.1 });
    }
  }

  /** Stop all looping sounds (pause / dispose). */
  stopAll(): void {
    this.wallHumStop();
  }
}
