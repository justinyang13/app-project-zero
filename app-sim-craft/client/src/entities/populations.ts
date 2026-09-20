// The concrete spawn rules for each ambient population: land creatures,
// fish (plus the deep lake's sharks and whales) and the cars on the loop
// road. Placement is randomised, not seed-derived — entity placement isn't
// part of world generation's determinism contract (spec/01-tech-stack-
// architecture.md §9 scopes that to terrain only).
import { findNearbyWaterSpots, findSurfaceY } from "../core/worldQueries";
import { sampleRandom } from "../core/random";
import { DEEP_LAKE_CENTER, DEEP_LAKE_RADIUS } from "../worldgen/deepLake";
import { LOOP_PERIMETER, pointAtProgress, roadDeckYAtProgress } from "../worldgen/roads";
import { Car } from "./Car";
import { ALL_SPECIES, Creature } from "./Creature";
import { ALL_FISH_SPECIES, BIG_AQUATIC_SPECIES, Fish, pickSwimY, spawnDepthFor } from "./Fish";
import type { PopulationRules } from "./Population";

// --- Land creatures: two of every species scattered around spawn, then a slow ambient trickle ahead of the player.
const MAX_CREATURES = 60;
const CREATURE_SPAWN_INTERVAL = 5; // seconds
const CREATURE_DESPAWN_RADIUS = 110;

function randomPointAround(x: number, z: number, minRadius: number, maxRadius: number): { x: number; z: number } {
  const angle = Math.random() * Math.PI * 2;
  const radius = minRadius + Math.random() * (maxRadius - minRadius);
  return { x: x + Math.cos(angle) * radius, z: z + Math.sin(angle) * radius };
}

export const creatureRules: PopulationRules<Creature> = {
  max: MAX_CREATURES,
  interval: CREATURE_SPAWN_INTERVAL,
  despawnRadius: () => CREATURE_DESPAWN_RADIUS,
  spawnInitial({ world, playerX, playerZ }, group) {
    for (const species of ALL_SPECIES) {
      for (let i = 0; i < 2; i++) {
        const { x, z } = randomPointAround(playerX, playerZ, 8, 48);
        const y = findSurfaceY(world, x, z);
        if (y !== null) group.add(new Creature(species, x, y, z));
      }
    }
  },
  spawnAmbient({ world, playerX, playerZ }, group) {
    const spawnCount = 1 + Math.floor(Math.random() * 3);
    for (let i = 0; i < spawnCount && group.size < MAX_CREATURES; i++) {
      const species = ALL_SPECIES[Math.floor(Math.random() * ALL_SPECIES.length)];
      const { x, z } = randomPointAround(playerX, playerZ, 20, 75);
      const y = findSurfaceY(world, x, z);
      if (y !== null) group.add(new Creature(species, x, y, z));
    }
  },
};

// --- Fish. Scans for actual nearby water rather than throwing random darts at
// the map — swimmable water is a small fraction of the surface, so a handful
// of random points almost always misses even a real, nearby lake. A handful
// of fish per lake found reads as a small school rather than one lone fish.
const MAX_FISH = 40;
const FISH_SPAWN_INTERVAL = 6; // seconds
const FISH_DESPAWN_RADIUS = 90;
// Sharks and whales only live in the deep lake — nowhere else is deep enough —
// so they're topped back up to a fixed headcount whenever the player is near
// it. Exempt from MAX_FISH (that cap is about the swarm of tiny ones) and from
// the tighter despawn radius, so one doesn't vanish the moment the player
// paddles across a lake wider than the reef fish's range.
const BIG_AQUATIC_TARGETS = { shark: 5, whale: 2 } as const;
const BIG_AQUATIC_DESPAWN_RADIUS = 320;
const BIG_AQUATIC_SPAWN_SCAN_RADIUS = 110; // blocks around the player to look for deep water to spawn one in

type WaterSpot = { x: number; z: number; top: number; bottom: number };

function spawnFishAt(spot: WaterSpot, group: { add(fish: Fish): void }): void {
  const species = ALL_FISH_SPECIES[Math.floor(Math.random() * ALL_FISH_SPECIES.length)];
  group.add(new Fish(species, spot.x + Math.random(), pickSwimY(species, spot), spot.z + Math.random()));
}

export const fishRules: PopulationRules<Fish> = {
  max: MAX_FISH,
  interval: FISH_SPAWN_INTERVAL,
  despawnRadius: (fish) => (fish.isBig ? BIG_AQUATIC_DESPAWN_RADIUS : FISH_DESPAWN_RADIUS),
  spawnInitial({ world, playerX, playerZ }, group) {
    const spots = findNearbyWaterSpots(world, playerX, playerZ, 55, 150);
    for (const spot of sampleRandom(spots, 18)) {
      if (group.size >= MAX_FISH) break;
      spawnFishAt(spot, group);
    }
  },
  onInterval({ world, playerX, playerZ }, group) {
    if (Math.hypot(playerX - DEEP_LAKE_CENTER.x, playerZ - DEEP_LAKE_CENTER.z) > DEEP_LAKE_RADIUS + 40) return;
    for (const species of BIG_AQUATIC_SPECIES) {
      if (group.count((f) => f.species === species) >= BIG_AQUATIC_TARGETS[species]) continue;
      // Scan around the player (where chunks are actually loaded), not the lake's
      // center, which can be far outside the loaded area now that the lake is so wide.
      const spots = findNearbyWaterSpots(world, playerX, playerZ, BIG_AQUATIC_SPAWN_SCAN_RADIUS, 200, spawnDepthFor(species));
      const [spot] = sampleRandom(spots, 1);
      if (spot) group.add(new Fish(species, spot.x + Math.random(), pickSwimY(species, spot), spot.z + Math.random()));
    }
  },
  spawnAmbient({ world, playerX, playerZ }, group) {
    const spots = findNearbyWaterSpots(world, playerX, playerZ, 40, 60);
    const spawnCount = 1 + Math.floor(Math.random() * 3);
    for (const spot of sampleRandom(spots, spawnCount)) {
      if (group.size >= MAX_FISH) break;
      spawnFishAt(spot, group);
    }
  },
};

// --- Cars: spaced evenly around the loop road so they start out already spread
// around the track their AI drives. Spawned once; they never despawn.
const CAR_COUNT = 6;
const CAR_COLORS = [0xc0392b, 0x2980b9, 0xf1c40f, 0x27ae60, 0xecf0f1, 0xe67e22];

export const carRules: PopulationRules<Car> = {
  max: CAR_COUNT,
  interval: Infinity,
  despawnRadius: () => Infinity,
  spawnInitial({ world }, group) {
    for (let i = 0; i < CAR_COUNT; i++) {
      const progress = (LOOP_PERIMETER / CAR_COUNT) * i;
      const { x, z } = pointAtProgress(progress);
      const y = findSurfaceY(world, x, z) ?? roadDeckYAtProgress(progress);
      group.add(new Car(CAR_COLORS[i % CAR_COLORS.length], y, progress));
    }
  },
};
