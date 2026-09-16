# 08 — Mobs & Creatures

All creature names below are original to SimCraft — no genre-trademarked
creature names are used anywhere (see
[00 — Vision & Scope](00-vision-and-scope.md) §5).

## 1. Creature data model

Every creature type defines: category (Passive/Neutral/Hostile/Aquatic),
health, movement speed, damage (if applicable), AI behavior profile (§2),
eligible spawn biomes, spawn conditions (light level, surface/underground,
time of day), drop table, and (for tameable/breedable types) taming item
and breeding item. Full schema in
[23 — Data Schema Reference](23-data-schema-reference.md) §6.

## 2. AI behavior states

A simple finite-state machine shared across all creatures, with per-type
parameters (detection radius, flee threshold, attack range/cooldown):

- **Idle/Wander** — default state; picks a random nearby point
  periodically and paths toward it (simple A* over the walkable-block
  graph within a limited radius, re-planned if blocked).
- **Alert** — a Neutral or Hostile creature has detected the player (or,
  for Neutral types, been attacked) within its detection radius; turns to
  face and begins closing distance or preparing to flee, depending on
  type.
- **Flee** — Passive creatures (and Neutral creatures below a health
  threshold) run directly away from the threat's last known position for
  a few seconds, then re-evaluate.
- **Attack** — Hostile creatures (and provoked Neutral ones) path toward
  the player and, within attack range, perform a melee or ranged attack
  on a per-type cooldown.
- **Follow** (tamed creatures only) — paths toward the owning player,
  maintaining a short trailing distance, teleporting to catch up if it
  falls too far behind across a loaded-chunk boundary.
- **Sit/Stay** (tamed creatures only) — holds position until released.

Pathing runs on the simulation tick (20Hz, see
[01](01-tech-stack-architecture.md) §8), not every render frame, and is
capped to a small number of active pathfinding creatures per tick (spread
across ticks) to keep worst-case cost bounded — see
[15 — Performance](15-performance.md) §5.

## 3. Creature catalog

### 3.1 Passive (surface, day-favoring)

| Creature | Biomes | Drops | Tame/Breed |
|---|---|---|---|
| Woolback Grazer (sheep-analog) | Meadow, Plains, Savanna | Haunch, Fiber Tuft | Breed: Wildflower bundle |
| Longhorn (cattle-analog) | Meadow, Plains | Haunch, Hidecloth | Breed: Wheatgrass bundle |
| Snuffler (pig-analog) | Meadow, Forest | Haunch | Breed: Gourd Slice |
| Cluckbird (chicken-analog) | Meadow, Plains, Savanna | Fowl Cut, Egg (periodic drop) | Breed: any Crop seed |
| Duskhopper (rabbit-analog) | Forest, Tundra | Haunch (small), Marrow Shard (rare) | Breed: Root Tuber |
| Glowfin Koi | Rivers, ponds | n/a (catch-and-release or Fish Fillet if caught with Angler's Line) | Not tameable |
| Wayfarer Tender ("Villager"-analog) | Hearthstead structures | n/a | Not tameable; trades goods for a barter currency, "Amber Beads," found as loot or crafted from Aurum scraps |

### 3.2 Neutral (react only if provoked, or territorial)

| Creature | Biomes | Behavior notes |
|---|---|---|
| Cave Drifter (bat-analog) | Underground | Purely ambient/harmless, flees light |
| Tuskback Boar | Forest, Bramblewild | Neutral until attacked, then charges; fast |
| Reef Warden | Ocean, Coral Shallows | Neutral unless the player lingers too close to coral nests, then attacks; strong swimmer |
| Duskpine Stag | Taiga, Forest | Territorial toward other Stags during a seasonal "rut" window (cosmetic AI flavor), harmless to player |

### 3.3 Hostile (night/dark-spawning)

| Creature | Biomes/Conditions | Behavior notes |
|---|---|---|
| Gloomlurker | Any, low light | Baseline melee hostile, slow, moderate damage — the "default" night threat |
| Bonecrawler | Underground, any depth | Faster than Gloomlurker, weaker per-hit, attacks in small packs |
| Emberwisp | Emberglade, Ashfall, caves near lava | Ranged fire-bolt attack, explodes into a small harmless ash puff on death (visual only, no block damage — deliberately not a terrain-destroying explosive creature, keeping builds safe from accidental griefing by design) |
| Snarefang | Swamp, dark forest | Applies a brief "Snared" slow-status on hit rather than heavy damage; found near Snarevine hazard blocks |
| Frostbrute | Tundra, Glacier, night | High health, slow, heavy damage, immune to Chilled status |
| Deepstalker | Hollow Reach band only | Rare, strong, drops the best crafting materials for Rune upgrades; SimCraft's closest analog to an "elite" mob, not a scripted boss |
| Sunscar Skitterer | Desert caves, Sun Temple interiors | Fast, low health, attacks in swarms, weak individually |
| Voidmaw Lurker (rare "mini-boss," Deepstone Vault guardian) | Spawns only inside Deepstone Vault structures | Highest health/damage in the game, telegraphed heavy attack with a wind-up animation (fair, readable, not a cheap-shot design), guards the vault's best loot |

### 3.4 Aquatic (non-combat / ambient)

Glowfin Koi (see 3.1), Inkwell Drifter (squid-analog, drops Squidmurk
Ink, flees via a quick ink-cloud dash when startled), Reef Warden (see
3.2), Shellback Crab (small, scuttling, harmless, decorative/ambient,
found on beaches and shallow ocean floor).

## 4. Spawning rules

- **Hostile spawns:** require light level ≤ 7 (see
  [10 — Lighting & Rendering](10-lighting-rendering.md) §1) and a
  sufficient open space (per-creature bounding-box check against nearby
  blocks) at a valid surface-or-cave location within a ring around the
  player (not directly adjacent — a minimum spawn-distance keeps ambushes
  fair — and not beyond render distance, so spawns are never wasted on
  unloaded chunks). A soft per-chunk-column cap limits total hostile
  density so night doesn't become an overwhelming swarm.
- **Passive spawns:** occur at world/chunk generation time (see
  [02](02-world-generation.md) §1 step 9's decoration pass handles initial
  population; ongoing natural passive spawning also runs at a slow
  background rate in daylight on eligible biome surface blocks, capped
  per-biome-per-chunk) rather than continuously respawning aggressively,
  keeping animal density realistic.
- **Mob cap:** a global soft cap on simultaneously loaded creatures
  (tuned in [15 — Performance](15-performance.md) §5) prevents runaway
  entity counts from farms or dense spawn areas degrading framerate.
- **Despawning:** hostile creatures beyond a distance from the player, or
  that have been idle/unable-to-path for an extended period, despawn
  after a timeout, unless named (see §6) or tamed.

## 5. Taming & breeding

- **Taming:** feeding a creature's designated tame-item repeatedly (per-
  type success chance per feeding) transitions it to "Tamed," tinting a
  small collar/marking visual and enabling Follow/Sit AI states, Tether
  item interaction, and exemption from natural despawning.
- **Breeding:** feeding two adult tamed (or, for farm animals, any two
  adult) creatures of the same type their breeding item within a short
  window of each other spawns a juvenile of that type nearby, which grows
  to adult size/stats over an in-game-time duration. This is the core
  loop behind sustainable food farming in Survival Mode.
- **Naming:** a Name Tag-equivalent "Marking Collar" item (rare, crafted
  from Amber Beads + Sinew) can rename a tamed creature via a text-input
  UI and exempts it from despawn entirely, even if untamed at the time of
  naming.

## 6. Companion mechanics (original — light pet-following system)

Any tamed creature follows the player across loaded chunks and can be
told to Sit at a location, extending the genre-baseline taming concept
slightly toward a lightweight companion system: a tamed Duskhopper or
Cluckbird sitting on a windowsill, or a tamed Tuskback Boar as a mobile
loot-mule (a tamed Boar can carry a small 6-slot saddlebag inventory,
original to SimCraft), are intended as expressive/building-adjacent uses
of the system rather than combat pets — no tamed creature fights on the
player's behalf, keeping combat depth intentionally secondary per
[00 — Vision & Scope](00-vision-and-scope.md) §4.
