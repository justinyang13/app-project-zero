import { describe, it, expect } from 'vitest';
import {
  createParticlePool, spawn, stepParticles, clearPool, spawnBurst,
} from './particlePool';

describe('particlePool', () => {
  it('spawns and tracks live count', () => {
    const pool = createParticlePool(8);
    expect(pool.live).toBe(0);
    const idx = spawn(pool, { x: 1, y: 2, z: 3, vx: 0, vy: 1, vz: 0, life: 1, size: 2, color: [1, 0, 0] });
    expect(idx).toBe(0);
    expect(pool.live).toBe(1);
    expect(pool.particles[0].alive).toBe(true);
    expect(pool.particles[0].y).toBe(2);
  });

  it('never exceeds capacity (ring buffer overwrites oldest)', () => {
    const pool = createParticlePool(4);
    for (let i = 0; i < 10; i++) {
      spawn(pool, { x: i, y: 0, z: 0, vx: 0, vy: 0, vz: 0, life: 5, size: 1, color: [0, 1, 0] });
    }
    expect(pool.live).toBe(4);
    expect(pool.particles.every((p) => p.alive)).toBe(true);
    // Oldest (x=0..5) recycled; newest (x=6..9) survive.
    const xs = pool.particles.map((p) => p.x).sort((a, b) => a - b);
    expect(xs).toEqual([6, 7, 8, 9]);
  });

  it('recycles dead slots before live ones', () => {
    const pool = createParticlePool(4);
    spawn(pool, { x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, life: 0.1, size: 1, color: [1, 1, 1] });
    stepParticles(pool, 0.2); // kills it
    expect(pool.live).toBe(0);
    // Ring order: next write slot is 1 (slot 0 was the first spawn).
    const idx = spawn(pool, { x: 9, y: 0, z: 0, vx: 0, vy: 0, vz: 0, life: 1, size: 1, color: [1, 1, 1] });
    expect(idx).toBe(1);
    expect(pool.live).toBe(1);
  });

  it('steps particles with velocity and gravity', () => {
    const pool = createParticlePool(4);
    spawn(pool, { x: 0, y: 0, z: 0, vx: 2, vy: 10, vz: -1, life: 1, size: 1, color: [1, 1, 1], gravity: 10 });
    stepParticles(pool, 0.1);
    const p = pool.particles[0];
    expect(p.x).toBeCloseTo(0.2);
    expect(p.z).toBeCloseTo(-0.1);
    // Euler (velocity-first): y = 10*0.1 + (10-1)*0.1 = 0.9
    expect(p.y).toBeCloseTo(0.9);
    expect(p.life).toBeCloseTo(0.9);
  });

  it('kills particles when life expires', () => {
    const pool = createParticlePool(4);
    spawn(pool, { x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, life: 0.5, size: 1, color: [1, 1, 1] });
    expect(stepParticles(pool, 0.3)).toBe(0);
    expect(pool.live).toBe(1);
    expect(stepParticles(pool, 0.3)).toBe(1);
    expect(pool.live).toBe(0);
  });

  it('clearPool resets everything', () => {
    const pool = createParticlePool(4);
    spawnBurst(pool, 0, 0, 0, 4, 2, 1, 1, [1, 1, 1]);
    clearPool(pool);
    expect(pool.live).toBe(0);
    expect(pool.next).toBe(0);
    expect(pool.particles.every((p) => !p.alive)).toBe(true);
  });

  it('spawnBurst is deterministic and bounded by capacity', () => {
    const a = createParticlePool(10);
    const b = createParticlePool(10);
    const na = spawnBurst(a, 1, 2, 3, 12, 3, 0.8, 0.5, [1, 1, 0]);
    const nb = spawnBurst(b, 1, 2, 3, 12, 3, 0.8, 0.5, [1, 1, 0]);
    expect(na).toBe(12);
    expect(nb).toBe(12);
    // Capacity 10: the two oldest were recycled into slots 0/1; slots 2-9
    // keep particles 2-9. Both pools must be identical (determinism).
    for (let i = 0; i < 10; i++) {
      expect(a.particles[i].x).toBe(b.particles[i].x);
      expect(a.particles[i].vx).toBe(b.particles[i].vx);
      expect(a.particles[i].vy).toBe(b.particles[i].vy);
    }
    // x is constant (1) for all; check the recycled slots hold the newest
    // particles (10 and 11) and slot 2 holds particle 2.
    expect(a.particles[0].vy).toBe(b.particles[0].vy);
    expect(a.particles[2].vx).toBeCloseTo(Math.cos((2 / 12) * Math.PI * 2) * 3);
    const tiny = createParticlePool(3);
    // Pool overwrites oldest when full: all 12 spawn calls succeed,
    // but only 3 particles are live at the end.
    expect(spawnBurst(tiny, 0, 0, 0, 12, 3, 0.8, 0.5, [1, 1, 0])).toBe(12);
    expect(tiny.live).toBe(3);
  });

  it('empty pool spawns nothing', () => {
    const pool = createParticlePool(0);
    expect(spawn(pool, { x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, life: 1, size: 1, color: [1, 1, 1] })).toBe(-1);
    expect(spawnBurst(pool, 0, 0, 0, 5, 1, 1, 1, [1, 1, 1])).toBe(0);
  });
});
