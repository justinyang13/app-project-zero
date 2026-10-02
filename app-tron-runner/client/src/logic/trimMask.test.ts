import { describe, it, expect } from 'vitest';
import { trimMask, TRIM_BANDS } from './trimMask';

describe('trimMask (M14c thin lines)', () => {
  it('returns 0 far from any line', () => {
    expect(trimMask(0.5, 0.5, 0.5)).toBe(0);
    expect(trimMask(1.0, 1.0, 1.0)).toBe(0);
    expect(trimMask(0.0, 0.5, 0.0)).toBe(0); // torso side, no line there
  });

  it('lights a point on the leg outer line', () => {
    const v = trimMask(0.19, 0.5, -0.04);
    expect(v).toBeGreaterThan(0.9);
  });

  it('is 0 at a point 5 cm off the leg line', () => {
    expect(trimMask(0.19 + 0.05, 0.5, -0.04)).toBe(0);
    expect(trimMask(0.19, 0.5, -0.04 + 0.05)).toBe(0);
  });

  it('does not light the leg line outside its y range', () => {
    expect(trimMask(0.19, 1.2, -0.04)).toBe(0);
    expect(trimMask(0.19, 0.05, -0.04)).toBe(0);
  });

  it('lights a point on the arm top line', () => {
    const v = trimMask(0.45, 1.505, -0.065);
    expect(v).toBeGreaterThan(0.9);
  });

  it('does not light the arm line below its y range or outside x range', () => {
    expect(trimMask(0.45, 1.2, -0.065)).toBe(0);
    expect(trimMask(0.1, 1.505, -0.065)).toBe(0); // inside armX0
    expect(trimMask(0.9, 1.505, -0.065)).toBe(0); // beyond hand
  });

  it('is symmetric in x (both sides of the body)', () => {
    expect(trimMask(0.19, 0.5, -0.04)).toBeCloseTo(trimMask(-0.19, 0.5, -0.04));
    expect(trimMask(0.45, 1.505, -0.065)).toBeCloseTo(trimMask(-0.45, 1.505, -0.065));
  });

  it('lights the chest ring band on the torso', () => {
    const v = trimMask(0.1, 1.30, 0.05);
    expect(v).toBeGreaterThan(0.9);
  });

  it('does not light the chest ring on the arms (|x| > 0.20)', () => {
    expect(trimMask(0.45, 1.30, 0.0)).toBe(0);
  });

  it('lights the belt band on the torso', () => {
    const v = trimMask(0.1, 0.97, 0.0);
    expect(v).toBeGreaterThan(0.9);
  });

  it('does not light chest/belt bands far from the torso', () => {
    expect(trimMask(0.8, 1.30, 0.0)).toBe(0);
    expect(trimMask(0.8, 0.97, 0.0)).toBe(0);
  });

  it('lights the spine line down the back', () => {
    const v = trimMask(0.0, 1.2, -0.12);
    expect(v).toBeGreaterThan(0.9);
  });

  it('does not light the spine line on the front (z > -0.08)', () => {
    expect(trimMask(0.0, 1.2, 0.05)).toBe(0);
  });

  it('fades with a soft edge (point 5 cm away is 0)', () => {
    const on = trimMask(0.19, 0.5, -0.04);
    const off = trimMask(0.19 - 0.05, 0.5, -0.04);
    expect(on).toBeGreaterThan(0.9);
    expect(off).toBe(0);
  });

  it('always returns a value in [0, 1]', () => {
    for (let i = -6; i <= 6; i++) {
      for (let j = 0; j <= 20; j++) {
        for (const z of [-0.2, -0.04, 0.0, 0.2]) {
          const v = trimMask(i * 0.05, j * 0.1, z);
          expect(v).toBeGreaterThanOrEqual(0);
          expect(v).toBeLessThanOrEqual(1);
        }
      }
    }
  });

  it('exposes the expected band constants', () => {
    expect(TRIM_BANDS.legX).toBeCloseTo(0.185, 5);
    expect(TRIM_BANDS.halfWidth).toBeCloseTo(0.010, 5);
    expect(TRIM_BANDS.soft).toBeCloseTo(0.006, 5);
  });
});
