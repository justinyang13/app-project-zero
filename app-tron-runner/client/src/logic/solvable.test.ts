import { describe, it, expect } from 'vitest';
import { buildLevel } from './level';
import { isLevelSolvable, findFirstBlocker, findWallBlocker } from './solvable';
import type { Level, Obstacle } from './levelTypes';

let nextId = 1;
function makeLevel(obstacles: Obstacle[], wallStrips: Level['wallStrips'] = []): Level {
  const obs = obstacles.map((o) => ({ ...o, id: nextId++ }));
  obs.sort((a, b) => a.z - b.z);
  return { length: 7800, seed: 0, obstacles: obs, wallStrips };
}

describe('isLevelSolvable', () => {
  it('real buildLevel() is solvable', () => {
    const level = buildLevel();
    expect(isLevelSolvable(level)).toBe(true);
    expect(findFirstBlocker(level)).toBeNull();
  });

  it('blocks in all 3 lanes at the same z are unsolvable', () => {
    const level = makeLevel([
      { id: 0, type: 'block', lane: -1, z: 100 },
      { id: 0, type: 'block', lane: 0, z: 100 },
      { id: 0, type: 'block', lane: 1, z: 100 },
    ]);
    expect(isLevelSolvable(level)).toBe(false);
  });

  it('barrier+beam same lane within 2 m kills that lane but level is passable by changing lane', () => {
    const level = makeLevel([
      { id: 0, type: 'barrier', lane: 0, z: 100 },
      { id: 0, type: 'beam', lane: 0, z: 102 },
    ]);
    // Lane 0 is dead (jump+slide within 4 m), but lanes -1 and 1 survive.
    expect(isLevelSolvable(level)).toBe(true);
    // And the same pair in ALL lanes is unsolvable.
    const allLanes = makeLevel([
      { id: 0, type: 'barrier', lane: -1, z: 100 },
      { id: 0, type: 'beam', lane: -1, z: 102 },
      { id: 0, type: 'barrier', lane: 0, z: 100 },
      { id: 0, type: 'beam', lane: 0, z: 102 },
      { id: 0, type: 'barrier', lane: 1, z: 100 },
      { id: 0, type: 'beam', lane: 1, z: 102 },
    ]);
    expect(isLevelSolvable(allLanes)).toBe(false);
  });

  it('a single gap (len <= 10) is solvable (jump)', () => {
    const level = makeLevel([{ id: 0, type: 'gap', z: 100, len: 8 }]);
    expect(isLevelSolvable(level)).toBe(true);
  });

  it('a longGap without a wall strip is unsolvable', () => {
    const level = makeLevel([{ id: 0, type: 'longGap', z: 100, len: 24 }]);
    expect(isLevelSolvable(level)).toBe(false);
  });

  it('a longGap covered by a wall strip is solvable (wall-run)', () => {
    const level = makeLevel(
      [{ id: 0, type: 'longGap', z: 100, len: 24 }],
      [{ side: 1, z0: 90, z1: 140 }],
    );
    expect(isLevelSolvable(level)).toBe(true);
  });

  it('findFirstBlocker returns the z of the first unsolvable cluster', () => {
    const level = makeLevel([
      { id: 0, type: 'barrier', lane: 0, z: 50 }, // solvable
      { id: 0, type: 'block', lane: -1, z: 200 },
      { id: 0, type: 'block', lane: 0, z: 200 },
      { id: 0, type: 'block', lane: 1, z: 200 }, // first blocker
    ]);
    const blocker = findFirstBlocker(level);
    expect(blocker).not.toBeNull();
    expect(blocker!.z).toBe(200);
    expect(blocker!.reason).toContain('200');
  });

  it('a beam spanning all lanes is solvable (slide)', () => {
    const level = makeLevel([{ id: 0, type: 'beam', lane: 'all', z: 100 }]);
    expect(isLevelSolvable(level)).toBe(true);
  });

  it('a rival in one lane is solvable (lane change), rivals in all lanes are not', () => {
    const one = makeLevel([{ id: 0, type: 'rival', lane: 0, z: 100, speedFactor: 0.6 }]);
    expect(isLevelSolvable(one)).toBe(true);
    const all = makeLevel([
      { id: 0, type: 'rival', lane: -1, z: 100, speedFactor: 0.6 },
      { id: 0, type: 'rival', lane: 0, z: 100, speedFactor: 0.6 },
      { id: 0, type: 'rival', lane: 1, z: 100, speedFactor: 0.6 },
    ]);
    expect(isLevelSolvable(all)).toBe(false);
  });

  it('a drone in one lane is solvable (jump over / time the patrol)', () => {
    const level = makeLevel([{ id: 0, type: 'drone', lane: 0, z: 100, phase: 0, period: 2.4 }]);
    expect(isLevelSolvable(level)).toBe(true);
  });

  it('a laser gate is solvable (slide under / time the off window)', () => {
    const level = makeLevel([{ id: 0, type: 'laser', z: 100, phase: 0 }]);
    expect(isLevelSolvable(level)).toBe(true);
  });

  it('drone + laser in the same lane is solvable (both timed, passable)', () => {
    const level = makeLevel([
      { id: 0, type: 'drone', lane: 0, z: 100, phase: 0, period: 2.4 },
      { id: 0, type: 'laser', z: 102, phase: 0 },
    ]);
    expect(isLevelSolvable(level)).toBe(true);
  });

  it('a wallBlock on one row is solvable (switch to the other row)', () => {
    const level = makeLevel(
      [{ id: 0, type: 'wallBlock', side: 1, row: 'low', z: 100, len: 8 }],
      [{ side: 1, z0: 90, z1: 120 }],
    );
    expect(isLevelSolvable(level)).toBe(true);
    expect(findWallBlocker(level)).toBeNull();
  });

  it('a wallBlock with no wall strip is unsolvable', () => {
    const level = makeLevel(
      [{ id: 0, type: 'wallBlock', side: 1, row: 'low', z: 100, len: 8 }],
    );
    expect(isLevelSolvable(level)).toBe(false);
    expect(findWallBlocker(level)).not.toBeNull();
  });

  it('wallBlocks on both rows of the same side are unsolvable', () => {
    const level = makeLevel(
      [
        { id: 0, type: 'wallBlock', side: 1, row: 'low', z: 100, len: 8 },
        { id: 0, type: 'wallBlock', side: 1, row: 'high', z: 102, len: 8 },
      ],
      [{ side: 1, z0: 90, z1: 120 }],
    );
    expect(isLevelSolvable(level)).toBe(false);
    expect(findWallBlocker(level)).not.toBeNull();
  });

  it('wallBlocks on both rows of different sides are solvable', () => {
    const level = makeLevel(
      [
        { id: 0, type: 'wallBlock', side: 1, row: 'low', z: 100, len: 8 },
        { id: 0, type: 'wallBlock', side: -1, row: 'high', z: 102, len: 8 },
      ],
      [
        { side: 1, z0: 90, z1: 120 },
        { side: -1, z0: 90, z1: 120 },
      ],
    );
    expect(isLevelSolvable(level)).toBe(true);
  });
});
