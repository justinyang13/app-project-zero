// Contextual HUD prompt selection (SPEC §7) — pure, no DOM.
// Given the level, the player's distance/lane and a few flags, pick the
// single most relevant prompt to show right-middle of the screen.

import type { Level } from '../logic/levelTypes';
import { obstaclesInRange, wallStripAt } from '../logic/levelTypes';

export interface Prompt {
  key: string; // key-cap label, e.g. "→" or "SPACE"
  action: string; // action name, e.g. "WALLRUN"
  hint: string; // short hint, e.g. "PRESS BUTTON"
}

export interface PromptContext {
  level: Level;
  dist: number; // current distance in metres
  lane: number; // -1 | 0 | 1
  isWallRunning: boolean;
  wallSide: number; // -1 | 1 (only meaningful while wall-running)
  wallRow: 'low' | 'high';
}

const WALLRUN_AHEAD = 25; // metres — strip must be within this range
const HAZARD_AHEAD = 30; // metres — obstacle prompts trigger this early

function wallrunPrompt(side: -1 | 1): Prompt {
  return {
    key: side === 1 ? '→' : '←',
    action: 'WALLRUN',
    hint: 'PRESS BUTTON',
  };
}

/**
 * Choose the prompt to display, or null when nothing is relevant.
 * Priority: wall-run (strip ahead in matching outer lane) > tutorial
 * prompts (section 0) > nearest hazard ahead (barrier/beam/gap/boost)
 * > wall-row swap while wall-running > default lane-change hint.
 */
export function selectPrompt(ctx: PromptContext): Prompt | null {
  const { level, dist, lane, isWallRunning, wallSide, wallRow } = ctx;

  // 1) Wall-run: strip within 25 m ahead and player in the matching outer lane.
  if (!isWallRunning) {
    if (lane === 1) {
      const strip = wallStripAt(level, dist + WALLRUN_AHEAD, 1);
      if (strip && strip.z0 - dist <= WALLRUN_AHEAD) return wallrunPrompt(1);
    } else if (lane === -1) {
      const strip = wallStripAt(level, dist + WALLRUN_AHEAD, -1);
      if (strip && strip.z0 - dist <= WALLRUN_AHEAD) return wallrunPrompt(-1);
    }
  } else {
    // On the wall: suggest a row swap when a wallBlock is close in the current row.
    const blocks = obstaclesInRange(level, dist, dist + HAZARD_AHEAD).filter(
      (o) => o.type === 'wallBlock' && o.side === wallSide && o.row === wallRow,
    );
    if (blocks.length > 0) {
      return wallRow === 'low'
        ? { key: 'W', action: 'CLIMB', hint: 'TO HIGH ROW' }
        : { key: 'S', action: 'DROP', hint: 'TO LOW ROW' };
    }
  }

  // 2) Tutorial prompts (section 0, SPEC §10).
  if (dist < 60) return { key: 'A D', action: 'CHANGE LANE', hint: 'USE [A]/[D]' };
  if (dist >= 140 && dist < 165) return { key: 'SPACE', action: 'JUMP', hint: 'OVER THE BAR' };
  if (dist >= 250 && dist < 275) return { key: 'S', action: 'SLIDE', hint: 'UNDER THE BEAM' };

  // 3) Nearest actionable hazard ahead in the player's lane (or all-lane).
  const ahead = obstaclesInRange(level, dist, dist + HAZARD_AHEAD);
  let best: { z: number; prompt: Prompt } | null = null;
  for (const o of ahead) {
    const inLane =
      o.type === 'gap' || o.type === 'longGap' || o.type === 'laser' ||
      ('lane' in o && (o.lane === 'all' || o.lane === lane));
    if (!inLane) continue;
    let prompt: Prompt | null = null;
    if (o.type === 'barrier') prompt = { key: 'SPACE', action: 'JUMP', hint: 'LOW BAR' };
    else if (o.type === 'beam') prompt = { key: 'S', action: 'SLIDE', hint: 'HIGH BEAM' };
    else if (o.type === 'gap') prompt = { key: 'SPACE', action: 'JUMP', hint: 'GAP' };
    else if (o.type === 'longGap') {
      const side: -1 | 1 = lane === -1 ? -1 : 1;
      prompt = { key: side === 1 ? '→' : '←', action: 'WALLRUN', hint: 'CROSS THE VOID' };
    } else if (o.type === 'boost') prompt = { key: '', action: 'BOOST', hint: 'RIDE THE PAD' };
    if (prompt && (!best || o.z < best.z)) best = { z: o.z, prompt };
  }
  if (best) return best.prompt;

  // 4) Default: gentle lane-change hint.
  return { key: 'A D', action: 'CHANGE LANE', hint: 'USE [A]/[D]' };
}
