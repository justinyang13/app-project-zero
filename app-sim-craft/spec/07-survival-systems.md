# 07 — Survival Systems

## 1. Day/night cycle

- A full cycle is 20 real-world minutes (matching genre convention:
  10 minutes day, 1.5 minutes sunset/dusk, 7 minutes night, 1.5 minutes
  sunrise/dawn), tracked as a `worldTime` tick counter (24,000 ticks/day
  at the 20Hz simulation rate from
  [01 — Tech Stack & Architecture](01-tech-stack-architecture.md) §8),
  persisted in the save file.
- Sun and moon are simple billboard-textured meshes on a rotating sky
  dome; directional light angle, color temperature, and intensity are
  driven continuously off `worldTime` (warm low-angle light at dawn/dusk,
  cool dim blue-gray at night, neutral bright at midday) — see
  [10 — Lighting & Rendering](10-lighting-rendering.md) §4.
- Night is when most hostile creature spawning is active (see
  [08 — Mobs & Creatures](08-mobs-creatures.md) §4), giving the day/night
  cycle real mechanical stakes, not just a visual backdrop.
- A moon-phase cycle (8 phases over 8 in-game days) modulates night-time
  hostile spawn rate slightly (full-moon-equivalent "Höllow Moon" nights
  spawn ~20% more) — a light, optional-feeling variation rather than a
  major mechanic.

## 2. Health regeneration

- **Natural regen:** if hunger ≥ 18/20 and the player has taken no damage
  in the last 10 seconds, health regenerates 1 point per 4 seconds up to
  the max.
- **Saturation-boosted regen:** if the player's hidden saturation value
  (see §3) is above zero, regen is faster (1 point per 2 seconds) and
  drains saturation instead of hunger while doing so — rewards eating
  high-saturation food ahead of a fight, not just topping off the hunger
  bar.
- **Starvation:** at 0 hunger, the player instead slowly loses health (1
  point per ~4 seconds) down to a floor of 1 (can't starve to death
  outright on Normal difficulty — see §6; Hard difficulty removes this
  floor).
- **Instant regen sources:** Vigor Tonic (see
  [04](04-items-inventory-crafting.md) §7), Golden Sunberry.

## 3. Hunger

- Drains via a per-action cost model layered on top of a small constant
  passive drain: sprinting adds a per-second cost, jumping/sprint-jumping
  adds a per-jump cost, mining/attacking adds a small per-action cost,
  regenerating health (§2) drains extra. Standing still/walking only
  incurs the passive drain.
- **Saturation** is a hidden secondary value (0 to current hunger level)
  that acts as a buffer — hunger only visibly ticks down once saturation
  from recently eaten food is exhausted. This is why the food table in
  [04](04-items-inventory-crafting.md) §5 lists both nutrition and
  saturation: nutrition refills the visible bar, saturation determines
  how long it stays full.
- Eating requires hunger below max (can't overeat) and takes a short
  fixed duration (~1.6s) during which movement speed is reduced,
  discouraging eating mid-combat as a free panic button.

## 4. Weather

- **Rain** (temperate/warm biomes) — ambient particle + sound layer,
  gradually fills exposed Storage Crates/Barrels placed outdoors with a
  small amount of water (a light, original touch encouraging roofed
  builds), extinguishes exposed Campfires and fire spread, increases
  Fishing (Angler's Line) catch rate slightly.
- **Snow** (cold biomes) — same trigger system as rain but deposits Snow
  Layer blocks on exposed horizontal surfaces over time, capped
  accumulation depth.
- **Thunderstorm** (rare, escalates from rain) — occasional lightning
  strikes at random surface-exposed columns; a strike ignites flammable
  blocks at the strike point and has a small chance to transform a
  nearby Woolback Grazer into a charged variant dropping bonus Sparkstone
  (a light, whimsical original touch, not a core mechanic).
- **Sandstorm** (Desert/Dune biomes only, original to SimCraft — no
  direct genre-baseline equivalent) — temporarily reduces visibility
  (dense fog-like particle screen) and disables ranged-weapon accuracy
  slightly; encourages waiting it out in shelter, giving desert biomes a
  distinct hazard identity.
- Weather is chosen per-region by a slow-changing 2D noise field sampled
  alongside climate (see [02](02-world-generation.md) §2), so weather
  fronts move across the world coherently rather than toggling randomly.

## 5. Temperature & environmental hazards

- **Cold exposure** (Tundra/Glacier biomes, night in any cold-leaning
  biome): without sufficient warmth (standing near a light-emitting heat
  source, or wearing any full armor set), the player accumulates a
  "Chilled" status after a sustained period, applying a slow movement
  and mining-speed penalty until warmed. Not lethal on its own — a
  friction mechanic, not a hard fail state.
- **Heat exposure** (Desert/Volcanic biomes, midday): similarly, sustained
  exposure without shade or an Emberward Tonic applies a "Overheated"
  status (increased hunger drain) — mirrors cold exposure as a matched
  pair of biome-appropriate soft hazards.
- **Fire:** contact with fire/lava ignites the player (a burning status
  applying damage-over-time until extinguished by water contact or the
  status timer expiring); Emberward Tonic or full Emberproof-Runed armor
  mitigates.
- **Drowning:** an oxygen meter (separate from health) depletes while
  fully submerged without an air pocket above; reaching zero deals
  repeating damage until the player surfaces or dies. Aqualung Tonic
  pauses depletion.
- **Suffocation:** standing inside a solid, non-air block (e.g. if
  terrain generates around the player unexpectedly, extremely rare)
  deals slow damage — an edge-case safety mechanic more than a designed
  hazard.

## 6. Sleeping & spawn point

- A placed Bed block, when used at night (or during a thunderstorm) with
  no hostile creatures nearby, skips forward to morning (fades to a
  loading-style transition, ticks the world forward without simulating
  the skipped time frame-by-frame, but still advances crop growth/
  furnace progress/etc. as if that time had passed) and sets the player's
  respawn point to that bed's location.
- Sleeping during the day, or with hostiles nearby, is disallowed with a
  clear on-screen reason (keeps the mechanic legible rather than silently
  failing).

## 7. Difficulty levels

Selected at world creation, changeable later in Settings:

| Difficulty | Hostile spawns | Starvation floor | Hunger drain | Notes |
|---|---|---|---|---|
| Peaceful | None spawn; existing hostiles despawn | n/a (hunger doesn't drain) | Off | Pure building/exploration, no combat or hunger pressure at all |
| Easy | Reduced | Health floor 5 | Reduced | Gentle stakes |
| Normal | Standard | Health floor 1 | Standard | Default |
| Hard | Increased, some creatures gain buffs at night | No floor (can starve to death) | Increased | Full challenge |

Creative Mode implicitly disables hunger/health-loss regardless of the
selected difficulty label (see
[17 — Game Modes & Progression](17-game-modes-progression.md) §1).
