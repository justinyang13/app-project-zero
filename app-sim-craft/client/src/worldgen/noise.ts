// Deterministic noise per spec/01-tech-stack-architecture.md §9: a pure
// function of (seed, coordinate), no Math.random/Date.now anywhere here.
// Uses simplex-noise seeded via a small PRNG (mulberry32) driven by the
// world seed XOR'd with a per-field salt (spec/02-world-generation.md §8),
// so tuning one noise layer never correlates the others.
import { createNoise2D, type NoiseFunction2D } from "simplex-noise";

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Building a noise function shuffles a permutation table, and worldgen asks
// for one per column sample — so build each (seed ^ salt) field once. The
// result is a pure function of its coordinates, safe to share.
const noiseCache = new Map<number, NoiseFunction2D>();
const MAX_CACHED_NOISE_FIELDS = 64;

export function seededNoise2D(seed: number, salt: number): NoiseFunction2D {
  const combined = (seed ^ salt) >>> 0;
  let noise = noiseCache.get(combined);
  if (!noise) {
    if (noiseCache.size >= MAX_CACHED_NOISE_FIELDS) noiseCache.clear();
    noise = createNoise2D(mulberry32(combined));
    noiseCache.set(combined, noise);
  }
  return noise;
}

/** Fractal Brownian motion: layered octaves of a 2D noise field, in [-1, 1]. */
export function fbm2D(
  noise: NoiseFunction2D,
  x: number,
  z: number,
  octaves: number,
  frequency: number,
  persistence = 0.5,
): number {
  let amplitude = 1;
  let freq = frequency;
  let sum = 0;
  let maxAmplitude = 0;
  for (let i = 0; i < octaves; i++) {
    sum += noise(x * freq, z * freq) * amplitude;
    maxAmplitude += amplitude;
    amplitude *= persistence;
    freq *= 2;
  }
  return sum / maxAmplitude;
}

/** Hashes an arbitrary seed string down to a 32-bit numeric seed (FNV-1a). */
export function hashSeedString(input: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}
