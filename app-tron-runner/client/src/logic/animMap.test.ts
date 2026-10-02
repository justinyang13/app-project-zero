import { describe, it, expect } from 'vitest';
import { chooseClip, INITIAL_CLIP_STATE, type ClipState } from './animMap';
import { createPlayerState, type PlayerState } from './player';

function st(patch: Partial<PlayerState>): PlayerState {
  return { ...createPlayerState(), ...patch };
}

function prev(patch: Partial<ClipState>): ClipState {
  return { ...INITIAL_CLIP_STATE, ...patch };
}

describe('chooseClip', () => {
  it('idle phase plays Idle_Loop', () => {
    const c = chooseClip(st({}), 20, INITIAL_CLIP_STATE, { phase: 'idle' });
    expect(c.clip).toBe('Idle_Loop');
    expect(c.loop).toBe(true);
  });

  it('victory phase plays Dance_Loop', () => {
    const c = chooseClip(st({}), 20, INITIAL_CLIP_STATE, { phase: 'victory' });
    expect(c.clip).toBe('Dance_Loop');
    expect(c.loop).toBe(true);
  });

  it('death (integrity 0) plays Death01 non-looping', () => {
    const c = chooseClip(st({ integrity: 0 }), 20, INITIAL_CLIP_STATE);
    expect(c.clip).toBe('Death01');
    expect(c.loop).toBe(false);
  });

  it('death wins over everything else', () => {
    const c = chooseClip(st({ integrity: 0, isSliding: true, isWallRunning: true }), 20, prev({ clip: 'Slide_Loop' }));
    expect(c.clip).toBe('Death01');
  });

  it('grounded running plays Sprint_Loop with clamped timeScale', () => {
    const c = chooseClip(st({}), 24, INITIAL_CLIP_STATE);
    expect(c.clip).toBe('Sprint_Loop');
    expect(c.loop).toBe(true);
    expect(c.timeScale).toBeCloseTo(1.0);
  });

  it('timeScale clamps low and high', () => {
    expect(chooseClip(st({}), 5, INITIAL_CLIP_STATE).timeScale).toBeCloseTo(0.8);
    expect(chooseClip(st({}), 100, INITIAL_CLIP_STATE).timeScale).toBeCloseTo(1.6);
  });

  it('jump start (rising, was grounded) plays Jump_Start one-shot then Jump_Loop', () => {
    const c = chooseClip(st({ isGrounded: false, vy: 10 }), 20, INITIAL_CLIP_STATE);
    expect(c.clip).toBe('Jump_Start');
    expect(c.loop).toBe(false);
    expect(c.timeScale).toBeCloseTo(1.6);
    expect(c.oneShotThen).toBe('Jump_Loop');
  });

  it('airborne falling plays Jump_Loop', () => {
    const c = chooseClip(st({ isGrounded: false, vy: -5 }), 20, prev({ clip: 'Jump_Start' }));
    expect(c.clip).toBe('Jump_Loop');
    expect(c.loop).toBe(true);
  });

  it('landing after airborne plays Jump_Land one-shot then Sprint_Loop', () => {
    const c = chooseClip(st({ isGrounded: true, vy: 0 }), 20, prev({ clip: 'Jump_Loop' }));
    expect(c.clip).toBe('Jump_Land');
    expect(c.loop).toBe(false);
    expect(c.timeScale).toBeCloseTo(2.2);
    expect(c.oneShotThen).toBe('Sprint_Loop');
  });

  it('slide entry plays Slide_Start then Slide_Loop', () => {
    const c = chooseClip(st({ isSliding: true }), 20, INITIAL_CLIP_STATE);
    expect(c.clip).toBe('Slide_Start');
    expect(c.oneShotThen).toBe('Slide_Loop');
  });

  it('slide continuation stays on Slide_Loop', () => {
    const c = chooseClip(st({ isSliding: true }), 20, prev({ clip: 'Slide_Start' }));
    expect(c.clip).toBe('Slide_Loop');
  });

  it('slide end plays Slide_Exit then Sprint_Loop', () => {
    const c = chooseClip(st({ isSliding: false }), 20, prev({ clip: 'Slide_Loop' }));
    expect(c.clip).toBe('Slide_Exit');
    expect(c.oneShotThen).toBe('Sprint_Loop');
  });

  it('wall-running keeps Sprint_Loop', () => {
    const c = chooseClip(st({ isWallRunning: true, isGrounded: false, wallSide: 1 }), 26, INITIAL_CLIP_STATE);
    expect(c.clip).toBe('Sprint_Loop');
    expect(c.loop).toBe(true);
  });

  it('hit (invulnerability just started) overlays Hit_Chest with fast fade', () => {
    const c = chooseClip(st({ invulnerabilityTimer: 1.95 }), 20, INITIAL_CLIP_STATE);
    expect(c.clip).toBe('Hit_Chest');
    expect(c.loop).toBe(false);
    expect(c.fade).toBeCloseTo(0.05);
  });

  it('hit overlay does not retrigger while already playing', () => {
    const c = chooseClip(st({ invulnerabilityTimer: 1.95 }), 20, prev({ clip: 'Hit_Chest', hitOverlay: true }));
    expect(c.clip).not.toBe('Hit_Chest');
  });

  it('normal fades are 0.12 s', () => {
    const c = chooseClip(st({}), 20, INITIAL_CLIP_STATE);
    expect(c.fade).toBeCloseTo(0.12);
  });
});
