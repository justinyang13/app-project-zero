# 17 — Game Modes & Progression

## 1. Game modes

| Mode | Health/Hunger | Building tools | Inventory | Combat |
|---|---|---|---|---|
| **Survival** | Full model, per selected difficulty (see [07](07-survival-systems.md) §7) | Manual placement + Blueprint system only (see [06](06-building-tools.md) §2.4); Mason's Wand/Terra Brush locked out | Finite, earned through gathering/crafting | Full, creatures deal/take damage normally |
| **Creative** | Disabled (full health/hunger always, no drain) | Full toolkit unlocked (Mason's Wand, Terra Brush, unlimited Blueprint placement — see [06](06-building-tools.md) §2) | Unlimited Creative Inventory (see [12](12-ui-ux.md) §5) | Player takes no damage from creatures/fall/fire/drowning by default (a per-world toggle can re-enable creature damage specifically for players who want Creative's building freedom with survival stakes) |
| **Adventure** | Full model, like Survival | Placement/breaking disabled by default except via specifically flagged "editable" blocks (a mode intended for curated experiences — e.g. loading an exported world built by the player themself as a walkthrough-only showcase) | Finite, no crafting-station restrictions removed, just world-editing restricted | Full |
| **Spectator** | N/A — no physical presence | N/A — cannot place/break anything | N/A — no inventory | N/A — cannot be damaged, passes through blocks (no-clip fly camera) |

Mode is chosen at world creation (see [12](12-ui-ux.md) §2) and can be
changed mid-game via Settings or the console (`/gamemode`, see
[12](12-ui-ux.md) §12) if cheats are enabled for that world.

## 2. Progression model (Survival)

SimCraft deliberately has **no experience-point grind or level number**
as the primary progression currency (a genre-baseline XP-level system
exists mostly to gate enchanting cost, which here is reframed — see
below). Progression is instead expressed through three parallel,
mutually reinforcing tracks:

- **Material tier progression** — the 6-tier tool/armor ladder from
  [04 — Items, Inventory & Crafting](04-items-inventory-crafting.md) §3 is
  the primary "am I getting stronger" feedback loop, gated by what the
  player has actually mined and smelted, not by a grind timer.
- **Insight** — the Runeforge's resource (see
  [04](04-items-inventory-crafting.md) §8), earned in small amounts from
  a wide variety of actions (smelting ore for the first time of a given
  type per session, defeating a hostile creature, harvesting a crop,
  discovering a new biome for the first time in that world, opening a
  structure's loot room) rather than a single dominant XP-farming
  activity — deliberately avoids the genre-common "grind a mob farm for
  hours" pattern by spreading Insight gains thin across many different
  play activities, each individually small.
- **Milestones** (achievement-style, single-player, purely for the
  player's own record — no online leaderboard or social sharing system,
  consistent with [00 — Vision & Scope](00-vision-and-scope.md) §4): a
  checklist of concrete accomplishments (first Workbench, first tool of
  each tier, first Rune applied, first structure type of each kind
  found, first tamed creature of each type, first full armor set,
  survived first night, reached Y -64 in an Extended Depth world, built
  and successfully triggered a Sparkwire contraption with 3+ component
  types, etc.), each triggering a small toast notification (see
  [13 — Audio](13-audio.md) §2 for its sound cue) and permanently logged
  in a Milestones screen accessible from the pause menu. Milestones are
  cosmetic record-keeping, not gates on content — everything a milestone
  tracks is achievable regardless of whether the milestone system is
  even open.

## 3. Stats tracking

A lightweight, always-on stats screen (pause menu) tracks purely
informational counters per world: play time, blocks placed/broken (total
and top-5 by type), distance traveled (walked/swum/flown/by-sled),
creatures defeated/tamed/bred (by type), items crafted (total and top-5),
deaths (and cause-of-death breakdown), nights survived. Entirely
observational — no gameplay system reads or reacts to these numbers; they
exist for the player's own curiosity and a satisfying sense of
accumulated history in a long-running save.

## 4. Session structure & pacing

Per Pillar 3 ([00](00-vision-and-scope.md) §2), the intended arc of a
fresh Survival world's early hours is: gather basic wood/stone (minutes),
craft first tools and a shelter before the first sunset (the ~10-minute
day length from [07](07-survival-systems.md) §1 is tuned specifically to
make this a real, achievable-but-real deadline), survive the first night,
then expand outward at the player's own pace into farming, automation,
deeper mining, and building — with no forced pacing gate beyond that
first-night moment. Long-session/idle players (building for many hours
without "progressing" materially) are fully supported and not
discouraged by any system — building itself is a valid, complete way to
spend a session, matching Pillar 1's priority over combat/grind depth.
