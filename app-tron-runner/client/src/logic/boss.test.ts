import { describe, it, expect } from 'vitest';
import {
  BOSS_Z0, BOSS_Z1, BOSS_SHATTER_Z, TELEGRAPH_TIME,
  CORE_Z, CORE_LANES, PHASES,
  bossPhaseAt, createBossState, isOverloaded, attackInterval,
  attacksBefore, activeTelegraph, boltPosition, boltImpactZ,
  boltHitsPlayer, bossShattered, coreAt,
} from './boss';

describe('boss phases', () => {
  it('has three phases covering 6700–7700', () => {
    expect(PHASES).toHaveLength(3);
    expect(PHASES[0]).toMatchObject({ index: 1, z0: 6700, z1: 7050, interval: 2.4 });
    expect(PHASES[1]).toMatchObject({ index: 2, z0: 7050, z1: 7400, interval: 2.0 });
    expect(PHASES[2]).toMatchObject({ index: 3, z0: 7400, z1: 7700, interval: 1.6 });
  });

  it('bossPhaseAt maps distances to phases', () => {
    expect(bossPhaseAt(6700)?.index).toBe(1);
    expect(bossPhaseAt(7049)?.index).toBe(1);
    expect(bossPhaseAt(7050)?.index).toBe(2);
    expect(bossPhaseAt(7399)?.index).toBe(2);
    expect(bossPhaseAt(7400)?.index).toBe(3);
    expect(bossPhaseAt(7699)?.index).toBe(3);
    expect(bossPhaseAt(6699)).toBeNull();
    expect(bossPhaseAt(7700)).toBeNull();
  });

  it('boss section spans 6700–7800 with shatter at 7700', () => {
    expect(BOSS_Z0).toBe(6700);
    expect(BOSS_Z1).toBe(7800);
    expect(BOSS_SHATTER_Z).toBe(7700);
  });
});

describe('cores and overload', () => {
  it('cores are at 6900 / 7250 / 7600', () => {
    expect([...CORE_Z]).toEqual([6900, 7250, 7600]);
    expect(CORE_Z.length).toBe(3);
    expect(CORE_LANES).toHaveLength(3);
  });

  it('coreAt finds each core and rejects others', () => {
    expect(coreAt(6900)?.index).toBe(0);
    expect(coreAt(7250)?.index).toBe(1);
    expect(coreAt(7600)?.index).toBe(2);
    expect(coreAt(7000)).toBeNull();
    expect(coreAt(6900.4)?.index).toBe(0);
    expect(coreAt(6900.6)).toBeNull();
  });

  it('overload requires all three cores and halves phase-3 interval', () => {
    const s = createBossState();
    expect(isOverloaded(s)).toBe(false);
    s.coresCollected = [0, 1];
    expect(isOverloaded(s)).toBe(false);
    s.coresCollected = [0, 1, 2];
    expect(isOverloaded(s)).toBe(true);
    expect(attackInterval(7500, s)).toBe(0.8); // 1.6 / 2
    expect(attackInterval(7500, createBossState())).toBe(1.6);
    // Only phase 3 is affected.
    expect(attackInterval(7100, s)).toBe(2.0);
  });
});

describe('attack schedule', () => {
  it('telegraph lasts 1.0 s (30 m at 30 m/s) and bolts fire after it', () => {
    const s = createBossState();
    const a = attacksBefore(6700 + 20 + 30 + 1, s)[0];
    expect(a).toBeDefined();
    expect(a.fireZ - a.telegraphZ).toBeCloseTo(TELEGRAPH_TIME * 30, 5);
  });

  it('attacks are spaced by the phase interval in metres', () => {
    const s = createBossState();
    const attacks = attacksBefore(7000, s);
    expect(attacks.length).toBeGreaterThan(3);
    for (let i = 1; i < attacks.length; i++) {
      const gap = attacks[i].telegraphZ - attacks[i - 1].telegraphZ;
      // 2.4 s interval in phase 1 → 72 m
      expect(gap).toBeCloseTo(72, 3);
    }
  });

  it('is deterministic', () => {
    const a = attacksBefore(7300, createBossState());
    const b = attacksBefore(7300, createBossState());
    expect(a).toEqual(b);
  });

  it('phase 3 telegraphs two lanes', () => {
    const s = createBossState();
    const a = attacksBefore(7600, s).at(-1)!;
    expect(a.lanes).toHaveLength(2);
  });

  it('activeTelegraph returns the attack in its telegraph window', () => {
    const s = createBossState();
    const first = attacksBefore(6700 + 20 + 1, s)[0];
    const t = activeTelegraph(first.telegraphZ + 1, s);
    expect(t?.index).toBe(first.index);
    expect(activeTelegraph(first.fireZ + 1, s)).not.toBe(first);
  });
});

describe('bolt flight and hit rule', () => {
  const s = createBossState();
  const a = attacksBefore(6700 + 20 + 30 + 1, s)[0];
  const impact = boltImpactZ(a);

  it('bolt spawns 70 m ahead and closes at 70 m/s', () => {
    const atFire = boltPosition(a.fireZ, s);
    expect(atFire).not.toBeNull();
    expect(atFire!.z - a.fireZ).toBeCloseTo(70, 3);
    // 0.35 s after firing (10.5 m of player travel): bolt moved 24.5 m.
    const mid = boltPosition(a.fireZ + 10.5, s);
    expect(mid!.z).toBeCloseTo(a.fireZ + 70 - 24.5, 3);
  });

  it('impact is 21 m after fire (0.7 s at 30 m/s)', () => {
    expect(impact - a.fireZ).toBeCloseTo(21, 5);
  });

  it('hits a grounded player in the telegraphed lane at impact', () => {
    expect(boltHitsPlayer(impact, a.lanes[0], 0, s)).toBe(true);
    expect(boltHitsPlayer(impact, a.lanes[0], 0.5, s)).toBe(true);
  });

  it('does not hit a player airborne above 1.4 m', () => {
    expect(boltHitsPlayer(impact, a.lanes[0], 1.5, s)).toBe(false);
    expect(boltHitsPlayer(impact, a.lanes[0], 2.0, s)).toBe(false);
  });

  it('does not hit a player in another lane', () => {
    const safe = a.lanes.includes(0) ? 1 : 0;
    expect(boltHitsPlayer(impact, safe, 0, s)).toBe(false);
  });

  it('no hit before fire or after impact', () => {
    expect(boltHitsPlayer(a.fireZ - 1, a.lanes[0], 0, s)).toBe(false);
    expect(boltHitsPlayer(impact + 1, a.lanes[0], 0, s)).toBe(false);
  });

  it('no bolts after the boss is shattered', () => {
    expect(bossShattered(7700)).toBe(true);
    expect(bossShattered(7699)).toBe(false);
    expect(boltPosition(7750, s)).toBeNull();
    expect(boltHitsPlayer(7750, 0, 0, s)).toBe(false);
  });
});
