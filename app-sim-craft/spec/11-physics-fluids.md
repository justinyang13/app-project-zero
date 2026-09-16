# 11 — Physics & Fluids

## 1. Fluid model

Water and Lava each exist as a **Source** block (`level: 0`, the
"fullest" state, never dries up on its own) and 8 **Flowing** states
(`level: 1–8`, decreasing "fullness," rendered as progressively thinner
liquid surface height within the block) — the same layered-flow model the
genre baseline uses, reimplemented from first principles:

- Each simulation tick (20Hz, see
  [01 — Tech Stack & Architecture](01-tech-stack-architecture.md) §8), a
  dirty-block queue of fluid blocks that changed last tick (not the whole
  world) is processed:
  - A **Source** block spreads to any adjacent air block on the same Y
    level (up to 4 horizontal neighbors) as a `level: 1` Flowing block,
    and downward (if the block below is air) as a `level: 0`-equivalent
    falling column (falling fluid always renders/propagates as "full,"
    matching genre convention that downward flow doesn't lose strength).
  - A **Flowing** block spreads similarly, but each further horizontal
    hop increases its level by 1 (thinning it out) until `level: 8`,
    beyond which it doesn't spread further; a Flowing block with no
    adjacent higher-level (lower-number) fluid feeding it, and not fed
    from directly above, reverts to air after a short delay (it "dries
    up" once its source path is cut).
  - **Source regeneration:** two or more Source blocks of the same fluid
    adjacent to a Flowing block of that fluid on the same horizontal
    plane convert it into a new Source block — the standard "infinite
    water source from two buckets" mechanic, intentionally kept in for
    genre-familiarity and because it gives early-game players a cheap,
    reliable water supply for farming.
- **Water vs. Lava interaction:** when flowing Water contacts Lava (or
  vice versa) at the same block position:
  - Water (any level) touching a Lava **Source** turns the lava into
    Basalt (steam particle burst, sound cue).
  - Water touching **Flowing** Lava turns it into Voidglass (Obsidian-
    equivalent) instead of Basalt — mirrors genre convention that
    source-vs-flowing contact yields different results, and gives
    Voidglass a discoverable, slightly fiddly crafting method.
  - Lava touching Water (either direction of contact) never destroys the
    water; water always "wins" the conversion.
- **Fluid flow around obstacles:** flow-fill treats any solid block as
  impassable and any non-solid, non-fluid block (torches, signs, etc.) as
  destroyed-and-replaced when fluid flows into its position (matching
  genre convention — decorative attachments don't block fluid, they pop
  off as a dropped item instead).

## 2. Player interaction with fluids

- **Swimming:** see [05 — Player Mechanics](05-player-mechanics.md) §1
  and §5 for movement speed and buoyancy; a Source or Flowing block at
  `level ≤ 4` and at least 2 blocks deep counts as "swimmable" (below
  that depth, the player wades rather than swims).
- **Bucket interaction:** an Empty Bucket used on a Source block picks it
  up (removing the source, becoming a Water/Lava Bucket item); a filled
  Bucket used against a valid target placement position places a new
  Source block. Buckets cannot pick up Flowing (non-source) fluid blocks.
- **Boats:** float on Water source/flowing blocks above a minimum depth,
  buoyancy-simulated (a simple spring-damper toward the water surface
  height), player-steerable while riding, collide with terrain and
  fluid-adjacent blocks.
- **Currents:** flowing (non-source) water applies a small directional
  push force to entities and dropped items within it, in the direction of
  flow (derived from the level-gradient between neighboring fluid
  blocks) — used for simple item-sorting/transport builds as well as
  natural river flow carrying a boat downstream.

## 3. Gravity-affected blocks

Sand, Deep Sand, Gravel, and Snow Layer (when unsupported) are
**gravity-affected**: when a block update check (see
[03](03-blocks-materials.md) §4) finds the block directly below one of
these is air or a non-solid block (including flowing fluid), the block
converts into a **falling entity** (a small physics-simulated block-mesh
entity, not part of the chunk data while falling) that free-falls under
gravity until it lands on a solid surface (re-placing itself as a static
block, displacing/breaking any non-solid block already occupying that
space, e.g. crushing Tall Grass) or falls into fluid (floats momentarily
before settling on the fluid bed below, or is carried by current if the
fluid is flowing). A falling gravity block deals no damage on landing on
an entity in SimCraft (a deliberate simplification — see
[00](00-vision-and-scope.md) §4 on keeping combat/hazard depth secondary)
but does briefly suffocate a player it lands directly on top of until
they dig free or it's removed.

## 4. Fire & flammability

- Fire is a non-solid, light-emitting (level 15), damaging-on-contact
  entity/block that can be ignited on any `flammable: true` block (see
  [03](03-blocks-materials.md) §1) by: Lava contact, a Launcher-fired
  ignition charge, lightning strikes (see
  [07 — Survival Systems](07-survival-systems.md) §4), or player use of a
  Flint & Striker item.
- **Spread:** each simulation tick, a lit Fire block has a per-neighbor-
  block chance (weighted by that neighbor's `flammable.spreadChance`
  value — Wood-family blocks spread readily, Leaves spread but burn out
  fast, Wool spreads very readily as a deliberate hazard/tool trade-off)
  to ignite adjacent flammable blocks, and a chance each tick to burn out
  the block it's currently on (converting it to Ash, or Air for blocks
  that don't leave Ash).
- **Extinguishing:** any Water contact (source or flowing) instantly
  extinguishes adjacent Fire blocks; rain (see
  [07](07-survival-systems.md) §4) extinguishes exposed (sky-light-
  visible) Fire and Campfire blocks over a short window and prevents new
  fire spread in the open during the storm.
- **Fire safety design note:** unlike Powder Charge detonations (see
  [09](09-redstone-automation.md) §5), fire spread has no fuse/warning —
  this is intentional (fire is meant to be a real hazard a player must
  manage, e.g. by not building entirely out of Wool near lava), but its
  spread chance is tuned conservatively (verified in playtesting, see
  [20 — Testing & QA](20-testing-qa.md) §3) so an unlucky spark doesn't
  routinely consume an entire base before a player can react.

## 5. Block update tick scheduling

A single shared **tick scheduler** (see
[23 — Data Schema Reference](23-data-schema-reference.md) §7 for its
interface) backs fluids, gravity blocks, fire spread, crop growth (see
[04](04-items-inventory-crafting.md) §5 / farming), Mycelium spread (see
[03](03-blocks-materials.md) §2.1), and Sparkwire signal propagation (see
[09](09-redstone-automation.md) §6): a per-chunk queue of `(position,
tickType, dueAtTick)` entries, drained in due-order each simulation tick,
with new entries appended when a relevant block change occurs nearby.
This avoids the far more expensive alternative of scanning every loaded
block every tick — cost scales with *active* systems (how much fluid is
currently flowing, how many crops are currently growing), not with total
world size, which is the property that keeps a large built-up world
performant late into a save (see [15 — Performance](15-performance.md)
§6).
