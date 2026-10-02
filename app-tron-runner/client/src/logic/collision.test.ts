import { describe, it, expect } from 'vitest';
import { checkCollisions, createCollisionCtx, playerBox } from './collision';
import { createPlayerState } from './player';
import type { Level, Obstacle } from './levelTypes';

function makeLevel(obstacles: Obstacle[]): Level {
  return { length: 7800, seed: 1337, obstacles, wallStrips: [] };
}

function stateAt(
  x: number,
  y: number,
  opts: { sliding?: boolean; invuln?: number; onWall?: boolean; wallSide?: -1 | 1; wallRow?: 'low' | 'high' } = {},
): ReturnType<typeof createPlayerState> {
  const s = createPlayerState();
  s.x = x;
  s.y = y;
  s.lane = Math.round(x / 3);
  s.isSliding = !!opts.sliding;
  s.invulnerabilityTimer = opts.invuln ?? 0;
  s.isWallRunning = !!opts.onWall;
  s.wallSide = opts.wallSide ?? 1;
  s.wallRow = opts.wallRow ?? 'low';
  return s;
}

describe('playerBox', () => {
  it('uses full height when standing', () => {
    const s = createPlayerState();
    const b = playerBox(s);
    expect(b.h).toBe(1.8);
    expect(b.w).toBe(0.9);
    expect(b.d).toBe(0.9);
  });

  it('uses reduced height when sliding', () => {
    const s = createPlayerState();
    s.isSliding = true;
    expect(playerBox(s).h).toBe(0.8);
  });
});

describe('checkCollisions — barrier', () => {
  it('hits a grounded player in the same lane', () => {
    const level = makeLevel([{ id: 1, type: 'barrier', z: 100, lane: 0 }]);
    const s = stateAt(0, 0);
    const events = checkCollisions(s, 99, 101, level, createCollisionCtx());
    expect(events).toContainEqual({ kind: 'hit', obstacleId: 1 });
  });

  it('does not hit a player jumping over it (y >= 1.0)', () => {
    const level = makeLevel([{ id: 1, type: 'barrier', z: 100, lane: 0 }]);
    const s = stateAt(0, 1.5);
    const events = checkCollisions(s, 99, 101, level, createCollisionCtx());
    expect(events).toEqual([]);
  });

  it('does not hit a player in another lane', () => {
    const level = makeLevel([{ id: 1, type: 'barrier', z: 100, lane: 0 }]);
    const s = stateAt(3, 0);
    const events = checkCollisions(s, 99, 101, level, createCollisionCtx());
    expect(events.filter((e) => e.kind === 'hit')).toEqual([]);
  });
});

describe('checkCollisions — beam', () => {
  it('is safe when sliding (box top 0.8 < 1.1)', () => {
    const level = makeLevel([{ id: 2, type: 'beam', z: 100, lane: 0 }]);
    const s = stateAt(0, 0, { sliding: true });
    const events = checkCollisions(s, 99, 101, level, createCollisionCtx());
    expect(events.filter((e) => e.kind === 'hit')).toEqual([]);
  });

  it('hits a standing player (box top 1.8 > 1.1)', () => {
    const level = makeLevel([{ id: 2, type: 'beam', z: 100, lane: 0 }]);
    const s = stateAt(0, 0);
    const events = checkCollisions(s, 99, 101, level, createCollisionCtx());
    expect(events).toContainEqual({ kind: 'hit', obstacleId: 2 });
  });

  it('hits in any lane when lane is "all"', () => {
    const level = makeLevel([{ id: 3, type: 'beam', z: 100, lane: 'all' }]);
    const s = stateAt(3, 0);
    const events = checkCollisions(s, 99, 101, level, createCollisionCtx());
    expect(events).toContainEqual({ kind: 'hit', obstacleId: 3 });
  });
});

describe('checkCollisions — block', () => {
  it('hits a player in the same lane at any height below 3', () => {
    const level = makeLevel([{ id: 4, type: 'block', z: 100, lane: 1 }]);
    const s = stateAt(3, 0.5);
    const events = checkCollisions(s, 99, 101, level, createCollisionCtx());
    expect(events).toContainEqual({ kind: 'hit', obstacleId: 4 });
  });

  it('does not hit a player in another lane', () => {
    const level = makeLevel([{ id: 4, type: 'block', z: 100, lane: 1 }]);
    const s = stateAt(0, 0);
    const events = checkCollisions(s, 99, 101, level, createCollisionCtx());
    expect(events.filter((e) => e.kind === 'hit')).toEqual([]);
  });
});

describe('checkCollisions — near miss', () => {
  it('fires when passing within 0.5 m of the obstacle edge in an adjacent lane', () => {
    const level = makeLevel([{ id: 5, type: 'barrier', z: 100, lane: 1 }]);
    // Player mid lane-change at x = 1.0: edge at 1.45, obstacle edge at 1.5 → gap 0.05 m.
    const s = stateAt(1.0, 0);
    const ctx = createCollisionCtx();
    const events = checkCollisions(s, 99, 101, level, ctx);
    expect(events).toContainEqual({ kind: 'nearMiss', obstacleId: 5 });
    expect(events.filter((e) => e.kind === 'hit')).toEqual([]);
  });

  it('fires only once per obstacle id', () => {
    const level = makeLevel([{ id: 5, type: 'barrier', z: 100, lane: 1 }]);
    const s = stateAt(1.0, 0);
    const ctx = createCollisionCtx();
    checkCollisions(s, 99, 101, level, ctx);
    const second = checkCollisions(s, 99, 101, level, ctx);
    expect(second.filter((e) => e.kind === 'nearMiss')).toEqual([]);
  });

  it('does not fire when the player is far away', () => {
    const level = makeLevel([{ id: 5, type: 'barrier', z: 100, lane: 1 }]);
    const s = stateAt(-3, 0);
    const events = checkCollisions(s, 99, 101, level, createCollisionCtx());
    expect(events.filter((e) => e.kind === 'nearMiss')).toEqual([]);
  });
});

describe('checkCollisions — pickups', () => {
  it('collects a ground bit in the same lane', () => {
    const level = makeLevel([{ id: 10, type: 'bit', z: 100, lane: 0, y: 0 }]);
    const s = stateAt(0, 0);
    const events = checkCollisions(s, 99, 101, level, createCollisionCtx());
    expect(events).toContainEqual({ kind: 'bit', id: 10 });
  });

  it('collects a bit only once', () => {
    const level = makeLevel([{ id: 10, type: 'bit', z: 100, lane: 0, y: 0 }]);
    const s = stateAt(0, 0);
    const ctx = createCollisionCtx();
    checkCollisions(s, 99, 101, level, ctx);
    const second = checkCollisions(s, 99, 101, level, ctx);
    expect(second.filter((e) => e.kind === 'bit')).toEqual([]);
  });

  it('does not collect a high bit while grounded', () => {
    const level = makeLevel([{ id: 11, type: 'bit', z: 100, lane: 0, y: 2.5 }]);
    const s = stateAt(0, 0);
    const events = checkCollisions(s, 99, 101, level, createCollisionCtx());
    expect(events.filter((e) => e.kind === 'bit')).toEqual([]);
  });

  it('collects a repair pickup', () => {
    const level = makeLevel([{ id: 12, type: 'repair', z: 100, lane: 0 }]);
    const s = stateAt(0, 0);
    const events = checkCollisions(s, 99, 101, level, createCollisionCtx());
    expect(events).toContainEqual({ kind: 'repair', id: 12 });
  });

  it('collects a boost pad', () => {
    const level = makeLevel([{ id: 13, type: 'boost', z: 100, lane: 1 }]);
    const s = stateAt(3, 0);
    const events = checkCollisions(s, 99, 101, level, createCollisionCtx());
    expect(events).toContainEqual({ kind: 'boost', id: 13 });
  });

  it('collects a core', () => {
    const level = makeLevel([{ id: 14, type: 'core', z: 100, lane: -1 }]);
    const s = stateAt(-3, 0);
    const events = checkCollisions(s, 99, 101, level, createCollisionCtx());
    expect(events).toContainEqual({ kind: 'core', id: 14 });
  });

  it('hits a rival cycle in the same lane (tall — jump is not enough)', () => {
    const level = makeLevel([{ id: 15, type: 'rival', z: 100, lane: 0, speedFactor: 0.6 }]);
    const s = stateAt(0, 0);
    const events = checkCollisions(s, 99, 101, level, createCollisionCtx());
    expect(events).toContainEqual({ kind: 'hit', obstacleId: 15 });
    // Even airborne the rival is tall enough to hit.
    const s2 = stateAt(0, 1.0);
    const events2 = checkCollisions(s2, 99, 101, level, createCollisionCtx());
    expect(events2).toContainEqual({ kind: 'hit', obstacleId: 15 });
  });

  it('does not hit a rival in another lane', () => {
    const level = makeLevel([{ id: 15, type: 'rival', z: 100, lane: 0, speedFactor: 0.6 }]);
    const s = stateAt(3, 0);
    const events = checkCollisions(s, 99, 101, level, createCollisionCtx());
    expect(events.filter((e) => e.kind === 'hit')).toEqual([]);
  });
});

describe('checkCollisions — rules', () => {
  it('suppresses hits while invulnerable', () => {
    const level = makeLevel([{ id: 1, type: 'barrier', z: 100, lane: 0 }]);
    const s = stateAt(0, 0, { invuln: 1.0 });
    const events = checkCollisions(s, 99, 101, level, createCollisionCtx());
    expect(events.filter((e) => e.kind === 'hit')).toEqual([]);
  });

  it('ignores obstacles outside the step range', () => {
    const level = makeLevel([{ id: 1, type: 'barrier', z: 200, lane: 0 }]);
    const s = stateAt(0, 0);
    const events = checkCollisions(s, 99, 101, level, createCollisionCtx());
    expect(events).toEqual([]);
  });

  it('does not hit a barrier the player has not reached yet', () => {
    const level = makeLevel([{ id: 1, type: 'barrier', z: 105, lane: 0 }]);
    const s = stateAt(0, 0);
    const events = checkCollisions(s, 90, 95, level, createCollisionCtx());
    expect(events.filter((e) => e.kind === 'hit')).toEqual([]);
  });
});

describe('checkCollisions — drone (timed sine patrol)', () => {
  const drone = { id: 20, type: 'drone' as const, lane: 0 as const, z: 100, phase: 0, period: 2.4 };
  const ctxAt = (t: number) => ({ ...createCollisionCtx(), time: t });

  it('hits a grounded player when the drone is in their lane', () => {
    // t = 0 → x = 0 (center lane). Player at x = 0, grounded.
    const level = makeLevel([drone]);
    const s = stateAt(0, 0);
    const events = checkCollisions(s, 99, 101, level, ctxAt(0));
    expect(events).toContainEqual({ kind: 'hit', obstacleId: 20 });
  });

  it('is safe when the drone has patrolled to the other side', () => {
    // t = 0.6 → x = 3·sin(π/2) = 3 (right lane). Player in center lane.
    const level = makeLevel([drone]);
    const s = stateAt(0, 0);
    const events = checkCollisions(s, 99, 101, level, ctxAt(0.6));
    expect(events.filter((e) => e.kind === 'hit')).toEqual([]);
  });

  it('is safe when the player jumps above the drone (y > 1.7)', () => {
    const level = makeLevel([drone]);
    const s = stateAt(0, 2.0);
    const events = checkCollisions(s, 99, 101, level, ctxAt(0));
    expect(events.filter((e) => e.kind === 'hit')).toEqual([]);
  });

  it('is deterministic: same time → same outcome', () => {
    const level = makeLevel([drone]);
    const s = stateAt(0, 0);
    const a = checkCollisions(s, 99, 101, level, ctxAt(1.2));
    const b = checkCollisions(s, 99, 101, level, ctxAt(1.2));
    expect(a).toEqual(b);
    // t = 1.2 → x = 3·sin(π) = 0 → hit again
    expect(a).toContainEqual({ kind: 'hit', obstacleId: 20 });
  });

  it('phase shifts the patrol deterministically', () => {
    const d2 = { ...drone, id: 21, phase: Math.PI / 2 };
    const level = makeLevel([d2]);
    const s = stateAt(0, 0);
    // t = 0 → x = 3 → safe in center lane
    expect(checkCollisions(s, 99, 101, level, ctxAt(0)).filter((e) => e.kind === 'hit')).toEqual([]);
    // t = 0.6 → x = 3·sin(π/2 + π/2) = 0 → hit
    expect(checkCollisions(s, 99, 101, level, ctxAt(0.6))).toContainEqual({ kind: 'hit', obstacleId: 21 });
  });
});

describe('checkCollisions — laser (on/off + flicker)', () => {
  const laser = { id: 30, type: 'laser' as const, z: 100, phase: 0 };
  const ctxAt = (t: number) => ({ ...createCollisionCtx(), time: t });

  it('hits a standing player while the laser is on', () => {
    const level = makeLevel([laser]);
    const s = stateAt(0, 0);
    const events = checkCollisions(s, 99, 101, level, ctxAt(0.5)); // on
    expect(events).toContainEqual({ kind: 'hit', obstacleId: 30 });
  });

  it('is safe while sliding (box top 0.8 < harmful core 0.9)', () => {
    const level = makeLevel([laser]);
    const s = stateAt(0, 0, { sliding: true });
    const events = checkCollisions(s, 99, 101, level, ctxAt(0.5)); // on
    expect(events.filter((e) => e.kind === 'hit')).toEqual([]);
  });

  it('is safe while the laser is off', () => {
    const level = makeLevel([laser]);
    const s = stateAt(0, 0);
    const events = checkCollisions(s, 99, 101, level, ctxAt(1.8)); // off
    expect(events.filter((e) => e.kind === 'hit')).toEqual([]);
  });

  it('is safe when jumping above the gate (y > 1.4)', () => {
    const level = makeLevel([laser]);
    const s = stateAt(0, 1.8);
    const events = checkCollisions(s, 99, 101, level, ctxAt(0.5)); // on
    expect(events.filter((e) => e.kind === 'hit')).toEqual([]);
  });

  it('is deterministic: same time → same outcome, repeats every 2.4 s', () => {
    const level = makeLevel([laser]);
    const s = stateAt(0, 0);
    const a = checkCollisions(s, 99, 101, level, ctxAt(0.5));
    const b = checkCollisions(s, 99, 101, level, ctxAt(2.9)); // 0.5 + 2.4 → on again
    expect(a).toEqual(b);
    const off = checkCollisions(s, 99, 101, level, ctxAt(1.5));
    expect(off.filter((e) => e.kind === 'hit')).toEqual([]);
  });

  it('phase shifts the schedule deterministically', () => {
    const l2 = { ...laser, id: 31, phase: 1.2 }; // starts in the off window
    const level = makeLevel([l2]);
    const s = stateAt(0, 0);
    expect(checkCollisions(s, 99, 101, level, ctxAt(0)).filter((e) => e.kind === 'hit')).toEqual([]);
    // t = 1.2 → (1.2 + 1.2) % 2.4 = 0 → on
    expect(checkCollisions(s, 99, 101, level, ctxAt(1.2))).toContainEqual({ kind: 'hit', obstacleId: 31 });
  });
});

describe('checkCollisions — wallBlock (by row)', () => {
  const lowBlock = { id: 40, type: 'wallBlock' as const, side: 1 as const, row: 'low' as const, z: 100, len: 6 };
  const highBlock = { id: 41, type: 'wallBlock' as const, side: 1 as const, row: 'high' as const, z: 100, len: 6 };

  it('hits a player on the low row of the same side', () => {
    const level = makeLevel([lowBlock]);
    const s = stateAt(4.2, 1.6, { onWall: true, wallSide: 1, wallRow: 'low' });
    const events = checkCollisions(s, 99, 101, level, createCollisionCtx());
    expect(events).toContainEqual({ kind: 'hit', obstacleId: 40 });
  });

  it('is safe on the high row (row switch)', () => {
    const level = makeLevel([lowBlock]);
    const s = stateAt(4.2, 4.8, { onWall: true, wallSide: 1, wallRow: 'high' });
    const events = checkCollisions(s, 99, 101, level, createCollisionCtx());
    expect(events.filter((e) => e.kind === 'hit')).toEqual([]);
  });

  it('is safe on the opposite wall side', () => {
    const level = makeLevel([lowBlock]);
    const s = stateAt(-4.2, 1.6, { onWall: true, wallSide: -1, wallRow: 'low' });
    const events = checkCollisions(s, 99, 101, level, createCollisionCtx());
    expect(events.filter((e) => e.kind === 'hit')).toEqual([]);
  });

  it('is safe for a floor player (wallBlock lives on the wall)', () => {
    const level = makeLevel([lowBlock, highBlock]);
    const s = stateAt(0, 0);
    const events = checkCollisions(s, 99, 101, level, createCollisionCtx());
    expect(events.filter((e) => e.kind === 'hit')).toEqual([]);
  });

  it('hits only within the block span', () => {
    const level = makeLevel([lowBlock]);
    const s = stateAt(4.2, 1.6, { onWall: true, wallSide: 1, wallRow: 'low' });
    // step well past the block (z 100–106)
    const events = checkCollisions(s, 110, 112, level, createCollisionCtx());
    expect(events.filter((e) => e.kind === 'hit')).toEqual([]);
  });
});
