// Pure particle pool logic (SPEC §8.5) — no three/DOM imports, unit-testable.
// Fixed-capacity ring buffer: spawning beyond capacity overwrites the oldest
// live particle, so the pool never grows and never allocates per frame.

export interface Particle {
  alive: boolean;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  life: number; // remaining seconds
  maxLife: number;
  size: number;
  r: number;
  g: number;
  b: number;
  gravity: number;
}

export interface SpawnParams {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  life: number;
  size: number;
  color: [number, number, number];
  gravity?: number;
}

export interface ParticlePool {
  capacity: number;
  particles: Particle[];
  next: number; // ring-buffer write index
  live: number;
}

export function createParticlePool(capacity: number): ParticlePool {
  const particles: Particle[] = [];
  for (let i = 0; i < capacity; i++) {
    particles.push({
      alive: false, x: 0, y: 0, z: 0,
      vx: 0, vy: 0, vz: 0,
      life: 0, maxLife: 1, size: 1,
      r: 1, g: 1, b: 1, gravity: 0,
    });
  }
  return { capacity, particles, next: 0, live: 0 };
}

/**
 * Spawn one particle. If the pool is full the oldest live slot (ring order)
 * is recycled. Returns the index written, or -1 for an empty pool.
 */
export function spawn(pool: ParticlePool, p: SpawnParams): number {
  if (pool.capacity === 0) return -1;
  // Prefer the first dead slot in ring order; if the pool is full,
  // overwrite the oldest live particle (next in ring order).
  let idx = -1;
  for (let k = 0; k < pool.capacity; k++) {
    const i = (pool.next + k) % pool.capacity;
    if (!pool.particles[i].alive) { idx = i; break; }
  }
  if (idx === -1) {
    for (let k = 0; k < pool.capacity; k++) {
      const i = (pool.next + k) % pool.capacity;
      if (pool.particles[i].alive) { idx = i; break; }
    }
  }
  const pt = pool.particles[idx];
  if (!pt.alive) pool.live += 1;
  pt.alive = true;
  pt.x = p.x; pt.y = p.y; pt.z = p.z;
  pt.vx = p.vx; pt.vy = p.vy; pt.vz = p.vz;
  pt.life = p.life; pt.maxLife = p.life;
  pt.size = p.size;
  pt.r = p.color[0]; pt.g = p.color[1]; pt.b = p.color[2];
  pt.gravity = p.gravity === undefined ? 0 : p.gravity;
  pool.next = (idx + 1) % pool.capacity;
  return idx;
}

/** Advance all live particles by dt (Euler, optional gravity). Returns deaths. */
export function stepParticles(pool: ParticlePool, dt: number): number {
  let deaths = 0;
  for (let i = 0; i < pool.capacity; i++) {
    const p = pool.particles[i];
    if (!p.alive) continue;
    p.life -= dt;
    if (p.life <= 0) {
      p.alive = false;
      pool.live -= 1;
      deaths += 1;
      continue;
    }
    p.vy -= p.gravity * dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.z += p.vz * dt;
  }
  return deaths;
}

/** Kill every particle (run reset). */
export function clearPool(pool: ParticlePool): void {
  for (let i = 0; i < pool.capacity; i++) {
    pool.particles[i].alive = false;
  }
  pool.live = 0;
  pool.next = 0;
}

/**
 * Spawn a radial burst of `count` particles around (x, y, z).
 * Deterministic: direction index i drives the angle (no RNG).
 * Returns the number actually spawned (bounded by pool capacity).
 */
export function spawnBurst(
  pool: ParticlePool,
  x: number, y: number, z: number,
  count: number,
  speed: number,
  life: number,
  size: number,
  color: [number, number, number],
  gravity = 0,
): number {
  let n = 0;
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2;
    const up = 0.35 + 0.65 * ((i * 7919) % 100) / 100; // deterministic spread
    const idx = spawn(pool, {
      x, y, z,
      vx: Math.cos(a) * speed,
      vy: up * speed,
      vz: Math.sin(a) * speed * 0.6,
      life, size, color, gravity,
    });
    if (idx >= 0) n += 1;
  }
  return n;
}
