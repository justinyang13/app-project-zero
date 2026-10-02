/**
 * Game state types and constants
 * Implements SPEC §2 game flow and screens
 */

export type GameState = 
  | 'title'
  | 'countdown'
  | 'playing'
  | 'paused'
  | 'gameover'
  | 'victory';

export interface RunStats {
  score: number;
  distance: number; // meters
  integrity: number;
  multiplier: number;
  section: number;
  time: number; // seconds
  bitsCollected: number;
  nearMisses: number;
  bestMultiplier: number;
  combo: number;
}

export interface GameDebug {
  state: GameState;
  score: number;
  mult: number;
  dist: number;
  integrity: number;
  section: number;
  fps: number;
  finished: boolean;
  gameOver: boolean;
  quality: 'High' | 'Low';
  startRun: () => void;
  setBot: (on: boolean) => void;
  teleport: (distMeters: number) => void;
}

export const resetStats = (): RunStats => ({
  score: 0,
  distance: 0,
  integrity: 3,
  multiplier: 1,
  section: 0,
  time: 0,
  bitsCollected: 0,
  nearMisses: 0,
  bestMultiplier: 1,
  combo: 0
});