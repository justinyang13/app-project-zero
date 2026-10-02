export type PlayerMode = 'runner' | 'cycle';

export interface PlayerState {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  isGrounded: boolean;
  isJumping: boolean;
  isSliding: boolean;
  slideTimer: number;
  isWallRunning: boolean;
  wallSide: number;
  wallRow: 'low' | 'high';
  wallEntryTimer: number;
  wallTransitionTimer: number;
  targetLane: number;
  lane: number;
  lastLaneChangeTime: number;
  integrity: number;
  invulnerabilityTimer: number;
  respawnTimer: number;
  speedMultiplier: number;
  speedMultiplierRecoveryTimer: number;
  mode: PlayerMode;
  combo: number;
  maxCombo: number;
  wallRunComboTimer: number;
  wallRunSeconds: number;
  falling: boolean;
  isFallingIntoGap: boolean;
}

export interface WallStrip {
  side: -1 | 1;
  z0: number;
  z1: number;
}

export interface PlayerActions {
  left: boolean;
  right: boolean;
  jump: boolean;
  slide: boolean;
}