// Deterministic seeded RNG (mulberry32) + small helpers. Pure TS, no DOM.

export type Rng = () => number;

/** mulberry32: small fast 32-bit seeded PRNG returning floats in [0, 1). */
export function mulberry32(seed: number): Rng {
  let a = seed >>> 0;
  return function next(): number {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Uniform float in [min, max). */
export function rangeF(rng: Rng, min: number, max: number): number {
  return min + (max - min) * rng();
}

/** Uniform integer in [min, max] (inclusive). */
export function rangeInt(rng: Rng, min: number, max: number): number {
  return min + Math.floor(rng() * (max - min + 1));
}

/** Pick a random element from a non-empty array. */
export function pick<T>(rng: Rng, arr: readonly T[]): T {
  return arr[Math.floor(rng() * arr.length)];
}

/** Random phase in [0, 2π). */
export function phase(rng: Rng): number {
  return rng() * Math.PI * 2;
}
