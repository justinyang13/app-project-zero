# 25 — Worked Examples

Every earlier chapter specs one system at a time. This chapter walks
through several concrete scenarios end-to-end, showing how systems from
different chapters combine in practice — both as a sanity check on the
spec's internal consistency and as onboarding material for an
implementer who wants to see the pieces fit together before diving into
any one chapter's detail.

## 1. First session, minute by minute

A new player creates a Standard-type Survival world on Normal difficulty
(see [12 — UI/UX](12-ui-ux.md) §2) with a random seed.

1. **World creation** hashes the seed string, initializes every noise
   field (see [02 — World Generation](02-world-generation.md) §8),
   searches outward from origin for a valid spawn column (§9 of the same
   chapter), and generates the small set of chunks immediately around it
   synchronously before handing control to the player — the rest of the
   render-distance radius streams in over the next second or two via the
   worker pool (see [15 — Performance](15-performance.md) §7).
2. The player spawns standing on a Meadow biome's Loam surface at full
   health/hunger/stamina, `worldTime` initialized to mid-morning (a
   deliberate choice so a fresh player always gets close to a full day to
   prepare before the first sunset, rather than spawning near dusk).
3. A dismissible onboarding toast appears the first time the player
   breaks a block (see [12](12-ui-ux.md) §11): "Right-click to place a
   block." The player punches a nearby Greenwood tree — each hit against
   the Log block runs the break-progress calculation from
   [03 — Blocks & Materials](03-blocks-materials.md) §4 (bare-hand
   `toolMultiplierInverse` is the slowest available, so this takes a few
   seconds per log), each successful break spawning a DroppedItem entity
   (see [04 — Items, Inventory & Crafting](04-items-inventory-crafting.md)
   §1) that the player walks over to auto-collect.
4. With enough Greenwood Log in inventory, the player opens the 2×2
   quick-craft grid directly from their inventory screen (no Workbench
   needed yet, see [04](04-items-inventory-crafting.md) §4) and crafts
   Planks, then a Workbench, placing it on the ground — a `BlockDef`
   lookup confirms it's a valid, non-solid target position (§4 of chapter
   03) and the placed block immediately becomes interactive (right-click
   opens its 3×3 crafting UI, see [12](12-ui-ux.md) §6).
5. A Timberwrought Pickaxe and Axe get crafted at the Workbench. The
   player mines nearby Stone (now yielding drops, since a Tier-1 tool
   meets Stone's `toolTier` requirement — see
   [03](03-blocks-materials.md) §1), crafts Stoneforged tools, and digs a
   small shelter into a hillside.
6. As `worldTime` approaches dusk (see
   [07 — Survival Systems](07-survival-systems.md) §1), the sky's
   directional light warms and dims (see
   [10 — Lighting & Rendering](10-lighting-rendering.md) §4), and the
   player places a crafted Torch at the shelter entrance — its
   `lightEmission: 14` immediately triggers a local light-propagation
   flood-fill (§1 of chapter 10), raising the light level in and around
   the shelter above the hostile-spawn threshold of 7 (see
   [08 — Mobs & Creatures](08-mobs-creatures.md) §4), which is precisely
   why a lit shelter is safe and a dark one isn't — the spawning rule and
   the lighting rule are the same mechanic viewed from two angles.
7. Full night falls; outside the lit radius, the hostile-spawn check now
   succeeds at valid dark surface positions, and a Gloomlurker spawns at
   the edge of the player's render distance and begins pathing toward the
   shelter once it enters detection range (see
   [08](08-mobs-creatures.md) §2). The player, safely behind a placed
   Door, survives the first night — triggering the "Survived first night"
   Milestone toast (see [17 — Game Modes & Progression](17-game-modes-progression.md)
   §2).

## 2. Worked contraption: an automatic Sparkwire farm gate

Demonstrates [09 — Logic & Automation](09-redstone-automation.md) and
[11 — Physics & Fluids](11-physics-fluids.md) composing with the
building tools from [06 — Building Tools](06-building-tools.md):

1. The player places a Pressure Plate just inside a fenced farm entrance,
   Sparkwire running from it to a Door.
2. Standing on the plate sources strength 15 (§2 of chapter 09); the
   propagation algorithm (§1 of the same chapter) decays that strength by
   1 per Sparkwire block traveled, reaching the Door at, say, strength 12
   after a 3-block run — still ≥ 1, so the door receives power and opens
   (doors accept any nonzero signal, not a strength threshold, per the
   mechanism note in §4 of chapter 09).
3. The player wants the gate to stay open a beat longer than "player is
   standing on the plate," so they insert a Pulse Relay configured to a
   2-tick delay between the plate and door — this doesn't change *how
   long* the door stays open by itself (a Wood Pressure Plate's source
   duration is tied to occupancy, not the relay), but shows the delay
   component in a real placement, matching its documented behavior in the
   component catalog exactly.
4. To automatically water the farm plot behind the gate, the player
   places a Water Source at the high end of a gently sloped trench; the
   fluid tick scheduler (§5 of chapter 11) propagates Flowing states
   downhill each simulation tick until reaching the configured 8-level
   spread limit, irrigating the crop row planted alongside it (crop
   growth requires adjacency to a hydration source — see
   [07 — Survival Systems](07-survival-systems.md) §3's farming note,
   cross-referenced from [04](04-items-inventory-crafting.md) §5).
5. This entire structure — plate, wire, relay, door, trench, crops — is
   selected with the Mason's Wand and saved as a Blueprint (§2.4 of
   chapter 06) once built, so the player can stamp copies of the same
   farm-gate design elsewhere without manually re-wiring each one; the
   Blueprint format stores the exact block+state data needed to
   reproduce every logic and fluid block correctly on placement.

## 3. Worked scenario: mining into the Hollow Reach band

Demonstrates world generation depth bands, tool tiers, and creature
danger scaling composing together:

1. A player on an Extended Depth world (see
   [02 — World Generation](02-world-generation.md) §7) digs down past Y 0
   with a Ferrite Pickaxe (tier 4), able to harvest Deepstone (which
   requires tier 2+, comfortably met) but not yet Lumen Crystal veins
   they pass (which require a tier-5 Lumenforged pick to actually yield a
   drop, per [03](03-blocks-materials.md) §1's `toolTier` rule — breaking
   it anyway with the Ferrite pick destroys the ore with no drop, which
   is a deliberate, honest-feeling rule rather than an invisible wall).
2. Below Y -1, the player has entered the Hollow Reach band (§4 of
   chapter 02): ambient light drops toward zero (no sky-light
   contribution at all this deep unless directly under an open shaft),
   the hostile-creature spawn table shifts to include Deepstalkers (§3.3
   of chapter 08), and cavern chambers are larger and more frequent per
   the band's generation rules.
3. The player places Torches as they go, both for light (visibility) and
   as a deliberate safety measure against the spawn-condition light
   threshold from §4 of chapter 08 — the same light-level number governs
   both what the player can see and what's allowed to spawn nearby,
   reinforcing the "a small number of consistent rules compose" design
   pillar directly (see [00 — Vision & Scope](00-vision-and-scope.md)
   §2, Pillar 4).
4. Eventually locating a Deepstone Vault structure (§6 of chapter 02),
   the player solves its logic-circuit puzzle door (built from the same
   Sparkwire primitives as chapter 09, just pre-assembled into a
   structure schematic rather than player-built) and faces the Voidmaw
   Lurker guardian (§3.3 of chapter 08) — its telegraphed heavy-attack
   wind-up (a deliberate fairness design choice noted in that section)
   gives the player a readable window to react, consistent with
   [00 — Vision & Scope](00-vision-and-scope.md) §4's stance that combat
   depth stays secondary and fair rather than becoming a genre pillar in
   its own right.

## 4. Worked scenario: saving, closing the tab, and returning a week later

Demonstrates the persistence model end-to-end:

1. Mid-session, the 2-minute autosave timer fires (see
   [14 — Persistence & Saves](14-persistence-saves.md) §3): only chunks
   flagged dirty since the last save are diffed and written, along with
   the player's current position/inventory/stats and `worldTime`.
2. The player closes the browser tab; a `beforeunload` best-effort flush
   catches any remaining dirty state from the last few seconds of play.
3. A week later, the player reopens the app; the Service Worker (see
   [21 — Deployment & DevOps](21-deployment-devops.md) §4) serves the
   cached app shell instantly, even if the device is briefly offline, and
   the World Select screen (§2 of chapter 12) lists the world with its
   cached thumbnail and "last played" date from a week prior.
4. Clicking Play loads the `WorldStateRecord` and the set of modified
   `ChunkRecord`s for the area around the player's saved position (§4 of
   chapter 14); any chunk the player explored but never modified simply
   isn't in the database at all and is regenerated fresh, byte-identical
   to how it looked a week ago, from the same seed via the deterministic
   pipeline (§9 of chapter 01) — the player can't tell the difference
   between "this chunk was stored" and "this chunk was regenerated,"
   which is exactly the point.
5. If the app's `schemaVersion` has advanced since the save was last
   written (a hypothetical future update), each affected record type
   runs its migration chain (§5 of chapter 14) transparently before the
   world state is handed to the running game — the player experiences
   this only as a brief "Loading…" pause, never as a corrupted or
   rejected save.
