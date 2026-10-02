// Pure pitch / envelope / noise helpers for procedural SFX (SPEC §9).
// No DOM or Web Audio imports — unit-testable in Node.

/** Bit-ping pitch: rises with the streak (higher streak = higher pitch). */
export function bitPingFreq(streak: number): number {
  const s = Math.max(0, Math.min(streak, 24));
  // 520 Hz at streak 0, doubling to 1040 Hz at streak 24 (one octave).
  return 520 * Math.pow(2, s / 24);
}

/**
 * ADSR envelope value at time `t` (seconds) for a note of total duration
 * `dur`. All times in seconds; sustain is a level in [0, 1].
 */
export function adsr(
  t: number,
  attack: number,
  decay: number,
  sustain: number,
  release: number,
  dur: number
): number {
  if (t < 0 || dur <= 0) return 0;
  if (t < attack) return attack > 0 ? t / attack : 1;
  if (t < attack + decay) {
    return decay > 0 ? 1 - (1 - sustain) * ((t - attack) / decay) : sustain;
  }
  const relStart = dur - release;
  if (t < relStart) return sustain;
  if (t < dur) return release > 0 ? sustain * (1 - (t - relStart) / release) : 0;
  return 0;
}

/**
 * Exponential frequency sweep from `f0` at `t0` to `f1` at `t1`.
 * `curve` > 1 accelerates toward the end, < 1 decelerates.
 */
export function sweep(t: number, t0: number, t1: number, f0: number, f1: number, curve = 1): number {
  if (f0 <= 0 || f1 <= 0) return Math.max(f0, f1);
  if (t1 <= t0) return f0;
  const u = Math.min(1, Math.max(0, (t - t0) / (t1 - t0)));
  return f0 * Math.pow(f1 / f0, Math.pow(u, curve));
}

/** Deterministic white-noise samples in [-1, 1] (mulberry32 seeded). */
export function noiseData(seed: number, length: number): number[] {
  let a = seed >>> 0;
  const out: number[] = [];
  for (let i = 0; i < length; i++) {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    out.push((((t ^ (t >>> 14)) >>> 0) / 4294967296) * 2 - 1);
  }
  return out;
}

/** Countdown beep frequency: 3-2-1 are 660 Hz, GO is 990 Hz. */
export function countdownFreq(step: number): number {
  return step > 0 ? 660 : 990;
}

export interface FanfareNote {
  freq: number;
  at: number;
  dur: number;
}

/** Victory fanfare: rising C-major arpeggio (C5 E5 G5 C6 E6). */
export function fanfare(): FanfareNote[] {
  const notes = [523.25, 659.25, 783.99, 1046.5, 1318.51];
  return notes.map((freq, i) => ({ freq, at: i * 0.12, dur: 0.35 }));
}

/** Game-over descending sweep (sawtooth 440 → 55 Hz over 1.2 s). */
export function gameOverSweep(): { f0: number; f1: number; dur: number } {
  return { f0: 440, f1: 55, dur: 1.2 };
}
