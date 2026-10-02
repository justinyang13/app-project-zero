/**
 * Pure beat-math helpers (SPEC §8.2 "Beat pulse", §9 `getBeat()`).
 * No DOM / Web Audio imports — unit-testable in Node.
 */

export interface BeatInfo {
  bpm: number;
  /** Position within the current beat, 0 (inclusive) .. 1 (exclusive). */
  phase: number;
  /** Total number of beats elapsed since the track started (0-based). */
  beatIndex: number;
}

/** BPM per SPEC §9: run.mp3 = 120, boss.mp3 = 140. */
export const RUN_BPM = 120;
export const BOSS_BPM = 140;

/**
 * Compute beat position from an elapsed time (seconds since track start).
 * Deterministic and pure.
 */
export function beatAt(elapsed: number, bpm: number): BeatInfo {
  if (!(bpm > 0)) throw new Error('bpm must be positive');
  if (elapsed < 0) elapsed = 0;
  const secondsPerBeat = 60 / bpm;
  const beats = elapsed / secondsPerBeat;
  const beatIndex = Math.floor(beats);
  const phase = beats - beatIndex;
  return { bpm, phase, beatIndex };
}

/**
 * Visual pulse envelope from a beat phase: sharp attack at phase 0,
 * exponential-ish decay to the floor by the end of the beat.
 * Returns a value in [floor, 1].
 */
export function beatPulse(phase: number, floor = 0.8): number {
  const p = phase - Math.floor(phase); // wrap into [0,1)
  const decay = Math.exp(-6 * p);
  return floor + (1 - floor) * decay;
}

/**
 * Choose the music track for a distance (SPEC §5.1: crossfade to boss at 3700 m).
 */
export function trackForDist(dist: number, crossfadeAt = 3700): 'run' | 'boss' {
  return dist >= crossfadeAt ? 'boss' : 'run';
}
