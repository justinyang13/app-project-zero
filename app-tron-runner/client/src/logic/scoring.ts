// Scoring rules (SPEC §6) — pure TS, no three/DOM imports. Deterministic.

import { TARGET_SCORE, MAX_INTEGRITY, sectionSpeedAt } from '../config';
import type { Level } from './levelTypes';

export interface ScoreState {
  score: number;
  mult: number; // 1..15
  streak: number; // consecutive bits without a hit
  bestMult: number;
  bits: number;
  nearMisses: number;
}

export function createScoreState(): ScoreState {
  return { score: 0, mult: 1, streak: 0, bestMult: 1, bits: 0, nearMisses: 0 };
}

/** Bit collected: +100 × mult, streak++, mult rises every 8 bits. */
export function addBit(s: ScoreState): void {
  s.score += 100 * s.mult;
  s.bits += 1;
  s.streak += 1;
  if (s.streak % 8 === 0 && s.mult < 15) s.mult += 1;
  if (s.mult > s.bestMult) s.bestMult = s.mult;
}

/** Core collected: +5000 × mult (does not affect streak). */
export function addCore(s: ScoreState): void {
  s.score += 5000 * s.mult;
  if (s.mult > s.bestMult) s.bestMult = s.mult;
}

/** Distance trickle: 2 × mult per metre. */
export function addDistance(s: ScoreState, metres: number): void {
  s.score += 2 * s.mult * metres;
}

/** Near miss: +250 × mult (once per obstacle, enforced by caller). */
export function addNearMiss(s: ScoreState): void {
  s.score += 250 * s.mult;
  s.nearMisses += 1;
}

/** Boost pad: +500 × mult. */
export function addBoost(s: ScoreState): void {
  s.score += 500 * s.mult;
}

/** Perfect gap clear: +300 × mult. */
export function addPerfectGap(s: ScoreState): void {
  s.score += 300 * s.mult;
}

/** Wall-run trickle: 60 × mult per second on the wall. */
export function addWallRun(s: ScoreState, seconds: number): void {
  s.score += 60 * s.mult * seconds;
}

/** A hit: streak and multiplier reset to 1. */
export function applyHit(s: ScoreState): void {
  s.streak = 0;
  s.mult = 1;
}

/**
 * Victory bonus: +10000 × integrity remaining, + max(0, 120 − seconds) × 100.
 * Returns the bonus added.
 */
export function addVictoryBonus(s: ScoreState, integrity: number, seconds: number): number {
  const bonus = 10000 * integrity + Math.max(0, 120 - seconds) * 100;
  s.score += bonus;
  return bonus;
}

/** Stars on victory: 1 for finishing, 2 for ≥70% target, 3 for ≥ target. */
export function starRating(score: number): number {
  if (score >= TARGET_SCORE) return 3;
  if (score >= 0.7 * TARGET_SCORE) return 2;
  return 1;
}

export interface IdealRunResult {
  score: number;
  bits: number;
  boosts: number;
  perfectGaps: number;
  wallRunSeconds: number;
  time: number;
}

/**
 * Perfect-run simulator (SPEC §6): collects every bit and boost, clears every
 * gap perfectly, wall-runs every longGap, takes no hits. Deterministic.
 */
export function simulateIdealRun(level: Level): IdealRunResult {
  const s = createScoreState();
  const bits = level.obstacles.filter((o) => o.type === 'bit').length;
  const boosts = level.obstacles.filter((o) => o.type === 'boost').length;
  const cores = level.obstacles.filter((o) => o.type === 'core').length;
  const perfectGaps = level.obstacles.filter((o) => o.type === 'gap').length;
  let wallRunSeconds = 0;
  for (const o of level.obstacles) {
    if (o.type === 'longGap') wallRunSeconds += o.len / 26;
  }

  // Time: integrate dt = dz / speed(z) over the level.
  let time = 0;
  for (let z = 0; z < level.length; z += 1) {
    time += 1 / sectionSpeedAt(z);
  }

  // Distance trickle (mult rises with bits; bits are spread along the level,
  // so approximate by applying the average multiplier over the run).
  let multSum = 0;
  let mult = 1;
  for (let i = 0; i < bits; i++) {
    multSum += mult;
    if ((i + 1) % 8 === 0 && mult < 15) mult += 1;
  }
  const avgMult = bits > 0 ? multSum / bits : 1;
  s.score += 2 * avgMult * level.length;

  for (let i = 0; i < bits; i++) addBit(s);
  for (let i = 0; i < boosts; i++) addBoost(s);
  for (let i = 0; i < cores; i++) addCore(s);
  for (let i = 0; i < perfectGaps; i++) addPerfectGap(s);
  addWallRun(s, wallRunSeconds);
  addVictoryBonus(s, MAX_INTEGRITY, time);

  return {
    score: s.score,
    bits,
    boosts,
    perfectGaps,
    wallRunSeconds,
    time,
  };
}

export { TARGET_SCORE, MAX_INTEGRITY };
