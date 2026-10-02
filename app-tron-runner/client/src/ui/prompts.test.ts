import { describe, it, expect } from 'vitest';
import { selectPrompt } from './prompts';
import type { PromptContext } from './prompts';
import type { Level, Obstacle } from '../logic/levelTypes';

function level(obstacles: Obstacle[], wallStrips: Level['wallStrips'] = []): Level {
  return { length: 7800, seed: 1337, obstacles, wallStrips };
}

function ctx(over: Partial<PromptContext> = {}): PromptContext {
  return {
    level: level([]),
    dist: 500,
    lane: 0,
    isWallRunning: false,
    wallSide: 1,
    wallRow: 'low',
    ...over,
  };
}

describe('selectPrompt', () => {
  it('shows wall-run prompt when a right strip is within 25 m and lane is 1', () => {
    const lv = level([], [{ side: 1, z0: 510, z1: 600 }]);
    const p = selectPrompt(ctx({ level: lv, dist: 500, lane: 1 }));
    expect(p).not.toBeNull();
    expect(p!.action).toBe('WALLRUN');
    expect(p!.key).toBe('→');
  });

  it('shows left wall-run prompt for a left strip in lane -1', () => {
    const lv = level([], [{ side: -1, z0: 520, z1: 600 }]);
    const p = selectPrompt(ctx({ level: lv, dist: 500, lane: -1 }));
    expect(p!.key).toBe('←');
    expect(p!.action).toBe('WALLRUN');
  });

  it('does not show wall-run prompt for a strip on the opposite side', () => {
    const lv = level([], [{ side: -1, z0: 510, z1: 600 }]);
    const p = selectPrompt(ctx({ level: lv, dist: 500, lane: 1 }));
    expect(p?.action).not.toBe('WALLRUN');
  });

  it('does not show wall-run prompt when the strip starts beyond 25 m', () => {
    const lv = level([], [{ side: 1, z0: 540, z1: 600 }]);
    const p = selectPrompt(ctx({ level: lv, dist: 500, lane: 1 }));
    expect(p?.action).not.toBe('WALLRUN');
  });

  it('suggests row swap on the wall when a wallBlock is ahead in the current row', () => {
    const lv = level(
      [{ id: 1, type: 'wallBlock', side: 1, row: 'low', z: 510, len: 8 }],
      [{ side: 1, z0: 500, z1: 600 }],
    );
    const p = selectPrompt(ctx({ level: lv, dist: 500, isWallRunning: true, wallSide: 1, wallRow: 'low' }));
    expect(p!.action).toBe('CLIMB');
    expect(p!.key).toBe('W');
  });

  it('suggests drop when on the high row with a high wallBlock ahead', () => {
    const lv = level(
      [{ id: 1, type: 'wallBlock', side: 1, row: 'high', z: 510, len: 8 }],
      [{ side: 1, z0: 500, z1: 600 }],
    );
    const p = selectPrompt(ctx({ level: lv, dist: 500, isWallRunning: true, wallSide: 1, wallRow: 'high' }));
    expect(p!.action).toBe('DROP');
  });

  it('shows tutorial lane-change prompt early in section 0', () => {
    const p = selectPrompt(ctx({ dist: 30 }));
    expect(p!.action).toBe('CHANGE LANE');
  });

  it('shows jump tutorial prompt near the 180 m barrier', () => {
    const p = selectPrompt(ctx({ dist: 150 }));
    expect(p!.action).toBe('JUMP');
    expect(p!.key).toBe('SPACE');
  });

  it('shows slide tutorial prompt near the 280 m beam', () => {
    const p = selectPrompt(ctx({ dist: 260 }));
    expect(p!.action).toBe('SLIDE');
  });

  it('prioritises the nearest same-lane barrier with a jump prompt', () => {
    const lv = level([
      { id: 1, type: 'barrier', z: 520, lane: 0 },
      { id: 2, type: 'beam', z: 540, lane: 0 },
    ]);
    const p = selectPrompt(ctx({ level: lv, dist: 500, lane: 0 }));
    expect(p!.action).toBe('JUMP');
  });

  it('shows slide prompt for an all-lane beam', () => {
    const lv = level([{ id: 1, type: 'beam', z: 520, lane: 'all' }]);
    const p = selectPrompt(ctx({ level: lv, dist: 500, lane: 1 }));
    expect(p!.action).toBe('SLIDE');
  });

  it('ignores hazards in other lanes', () => {
    const lv = level([{ id: 1, type: 'barrier', z: 520, lane: -1 }]);
    const p = selectPrompt(ctx({ level: lv, dist: 500, lane: 1 }));
    expect(p!.action).toBe('CHANGE LANE');
  });

  it('shows jump prompt for a gap ahead', () => {
    const lv = level([{ id: 1, type: 'gap', z: 520, len: 6 }]);
    const p = selectPrompt(ctx({ level: lv, dist: 500, lane: 0 }));
    expect(p!.action).toBe('JUMP');
    expect(p!.hint).toBe('GAP');
  });

  it('shows boost prompt for a boost pad in the player lane', () => {
    const lv = level([{ id: 1, type: 'boost', z: 520, lane: 0 }]);
    const p = selectPrompt(ctx({ level: lv, dist: 500, lane: 0 }));
    expect(p!.action).toBe('BOOST');
  });

  it('falls back to the lane-change hint when nothing is ahead', () => {
    const p = selectPrompt(ctx({ dist: 500 }));
    expect(p!.action).toBe('CHANGE LANE');
  });
});
