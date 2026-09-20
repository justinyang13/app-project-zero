// Small randomness helpers for the simulation (worldgen never touches these —
// it must stay a pure function of the seed).

/** Picks up to `count` random, non-repeating entries from `list` — used to scatter spawns across whatever water spots were found rather than clustering on the first ones scanned. */
export function sampleRandom<T>(list: T[], count: number): T[] {
  const pool = [...list];
  const result: T[] = [];
  while (result.length < count && pool.length > 0) {
    const idx = Math.floor(Math.random() * pool.length);
    result.push(pool.splice(idx, 1)[0]);
  }
  return result;
}
