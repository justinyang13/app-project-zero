/**
 * Pure game-flow state machine (SPEC §2).
 *
 * States: title → countdown → playing ⇄ paused → (gameover | victory)
 *         gameover / victory → countdown (on retry)
 *
 * No DOM, no three.js — fully unit-testable. `Game.ts` calls `transition`
 * for every state change and reacts to the returned `effects`.
 */

import type { GameState } from './state';

export type FlowAction =
  | { type: 'start' }        // Enter on title
  | { type: 'countdownDone' } // 3-2-1-GO finished
  | { type: 'pause' }        // Esc / P while playing
  | { type: 'resume' }       // Esc / P while paused
  | { type: 'restart' }      // R on paused / gameover / victory
  | { type: 'hit' }          // integrity reached 0 while playing
  | { type: 'finish' };      // crossed the finish gate while playing

export interface FlowState {
  state: GameState;
  /** Number of times a run has been restarted (R). */
  retries: number;
  /** True when the run state (player, score, HUD…) must be reset. */
  resetRun: boolean;
  /** True when the 3-2-1-GO sequence should (re)start. */
  startCountdown: boolean;
  /** True when the HUD should be hidden. */
  hideHud: boolean;
  /** True when the HUD should be shown. */
  showHud: boolean;
}

export const initialFlow: FlowState = {
  state: 'title',
  retries: 0,
  resetRun: false,
  startCountdown: false,
  hideHud: false,
  showHud: false,
};

/** Actions that are legal from each state (everything else is ignored). */
export const legalActions: Record<GameState, readonly FlowAction['type'][]> = {
  title: ['start'],
  countdown: ['countdownDone'],
  playing: ['pause', 'hit', 'finish'],
  paused: ['resume', 'restart'],
  gameover: ['restart'],
  victory: ['restart'],
};

export function canDo(state: GameState, action: FlowAction['type']): boolean {
  return legalActions[state].includes(action);
}

function freshEffects(): Omit<FlowState, 'state' | 'retries'> {
  return { resetRun: false, startCountdown: false, hideHud: false, showHud: false };
}

/**
 * Advance the flow state machine. Illegal actions are ignored (state is
 * returned unchanged, with all effects cleared).
 */
export function transition(prev: FlowState, action: FlowAction): FlowState {
  if (!canDo(prev.state, action.type)) {
    return { ...prev, ...freshEffects() };
  }

  switch (action.type) {
    case 'start':
      return {
        state: 'countdown',
        retries: prev.retries,
        resetRun: true,
        startCountdown: true,
        hideHud: true,
        showHud: false,
      };

    case 'countdownDone':
      return {
        state: 'playing',
        retries: prev.retries,
        resetRun: false,
        startCountdown: false,
        hideHud: false,
        showHud: true,
      };

    case 'pause':
      return {
        state: 'paused',
        retries: prev.retries,
        resetRun: false,
        startCountdown: false,
        hideHud: false,
        showHud: false,
      };

    case 'resume':
      return {
        state: 'playing',
        retries: prev.retries,
        resetRun: false,
        startCountdown: false,
        hideHud: false,
        showHud: true,
      };

    case 'restart':
      return {
        state: 'countdown',
        retries: prev.retries + 1,
        resetRun: true,
        startCountdown: true,
        hideHud: true,
        showHud: false,
      };

    case 'hit':
      return {
        state: 'gameover',
        retries: prev.retries,
        resetRun: false,
        startCountdown: false,
        hideHud: true,
        showHud: false,
      };

    case 'finish':
      return {
        state: 'victory',
        retries: prev.retries,
        resetRun: false,
        startCountdown: false,
        hideHud: true,
        showHud: false,
      };
  }
}
