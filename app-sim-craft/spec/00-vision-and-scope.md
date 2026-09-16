# 00 — Vision & Scope

## 1. What SimCraft is

SimCraft is a single-player, browser-based, voxel sandbox game. The player
spawns into a procedurally generated 3D world made of 1×1×1 unit blocks,
and can mine, gather, craft, build, farm, automate, and survive in it, with
no other players, no server, and no account required. Closing the tab and
reopening it later resumes exactly where the player left off, because the
entire world lives in the browser's local storage. It is, in spirit, a
love letter to the voxel-sandbox genre that Minecraft popularized —
survival-driven emergent building, a satisfying gather-craft-build loop,
and a world that rewards curiosity — built from scratch as its own game,
with its own name, its own block/creature identities, and its own visual
language.

## 2. Design pillars

Every feature decision in this spec, and every implementation decision
downstream of it, should trace back to one of these five pillars. If a
feature doesn't serve any of them, it doesn't belong in SimCraft, no
matter how "on brand" for the genre it might seem.

### Pillar 1 — Build without friction

The core fantasy is building things. Placing and removing blocks must feel
instant (sub-16ms input-to-visual-feedback), the building toolkit must let
a player go from "I have an idea" to "it's built" without fighting the UI,
and Creative Mode must be a first-class way to play, not an afterthought
bolted onto Survival. See [06 — Building Tools](06-building-tools.md).

### Pillar 2 — A world worth exploring

Procedural generation should produce a world that feels handcrafted in
moments — a ravine that cuts dramatically into a cliff biome, a desert
temple half-buried in sand, a mushroom grove glowing faintly at night —
without ever repeating a seed's exact layout. See
[02 — World Generation](02-world-generation.md).

### Pillar 3 — Survival with a rhythm, not a grind

Hunger, health, day/night danger, and gear progression exist to give the
player's actions stakes and pacing, not to punish them with tedium. Numbers
are tuned so that a session has a natural arc (gather → build a shelter →
survive a night → expand) rather than an infinite treadmill. See
[07 — Survival Systems](07-survival-systems.md).

### Pillar 4 — Systems that combine

Blocks, items, creatures, fluids, and the logic/automation layer should
compose: water flows and can be redirected to farm crops or power a
device; a logic circuit can open a door, which a rail cart can pass
through, which a pressure-plate can trigger. Emergent complexity should
come from a small number of consistent rules, not from special-cased
features. See [09 — Logic & Automation](09-redstone-automation.md) and
[11 — Physics & Fluids](11-physics-fluids.md).

### Pillar 5 — It's just a browser tab

No install, no launcher, no account, no server round-trip for anything
that matters to single-player gameplay. A player should be able to open a
URL and be placing blocks within seconds, and get 60fps on mid-range
hardware from ~2020 onward. See
[01 — Tech Stack & Architecture](01-tech-stack-architecture.md) and
[15 — Performance](15-performance.md).

## 3. Target player

One person, playing alone, on a desktop or laptop browser as the primary
target (mobile/touch is a supported secondary target — see
[16 — Controls & Accessibility](16-controls-accessibility.md)). No
assumption of prior voxel-game experience is made, but the pacing and
depth are tuned for a player who already knows the genre's basic verbs
(mine, craft, place) and wants a deep, long-session game rather than a
five-minute browser toy.

## 4. Explicitly out of scope

Stating what SimCraft is *not* trying to be is as important as the pillars
above, because scope creep in this genre is enormous. The following are
deliberately excluded from this spec, not oversights:

- **Multiplayer, netcode, or any server-authoritative state.** SimCraft is
  single-player by design (per this project's brief). There is no
  matchmaking, no shared world, no chat with other humans. A future spec
  could add multiplayer, but it would be a separate, additive spec with
  its own architecture chapter — nothing here assumes it's coming, and no
  system should be built "multiplayer-ready" at the cost of single-player
  simplicity.
- **Accounts, cloud saves, telemetry, or any first-party backend service.**
  All persistence is local (see
  [14 — Persistence & Saves](14-persistence-saves.md)). Export/import of a
  world file is the supported way to move a world between devices.
- **Monetization of any kind.** No IAP, no ads, no battle pass. This is a
  personal/portfolio project.
- **Combat depth as a genre pillar.** Hostile creatures and a health/damage
  model exist (see [08 — Mobs & Creatures](08-mobs-creatures.md)) because
  they give night-time stakes, but SimCraft is not aiming to be a combat-
  or PvE-boss-focused game. Combat is simple, readable, and secondary to
  building and survival.
- **Narrative campaign / quests / dialogue systems.** The "story" is
  whatever the player builds. No NPCs with dialogue trees, no quest log.
- **Ray-traced/path-traced rendering, or any tech requiring WebGPU as a
  hard dependency.** WebGL2 (via Three.js) is the baseline renderer so the
  game runs everywhere a modern browser runs; a WebGPU renderer is at most
  a stretch-goal alternate backend (see
  [15 — Performance](15-performance.md)), never a requirement.
- **A full general-purpose modding marketplace.** A scoped, sandboxed
  scripting/resource-pack API is in scope as a stretch goal (see
  [19 — Modding & Scripting API](19-modding-api.md)), but it is not a
  priority for the core game and ships, if at all, after everything else.

## 5. Originality / IP stance

SimCraft is unambiguously *inspired by* the voxel-sandbox genre that
Minecraft (Mojang/Microsoft) established and popularized — this spec's own
title says as much, and the mechanics it specs (block-by-block building,
gather/craft/survive loops, a signal-based automation layer, procedurally
generated biomes) are genre conventions at this point, the same way
"jump on enemies to defeat them" is a platformer convention. That said,
implementation must not reuse or imitate Minecraft's *protected*
expression:

- **No Minecraft name, logo, or trademarked terms** anywhere in the
  product, code, or marketing (no "Creeper," "Redstone," "Nether,"
  "Enderman," etc. — every creature, block-family, and mechanic in this
  spec has its own original name; see the naming tables throughout).
- **No copied textures, models, sounds, or music.** All art assets
  described in [18 — Visual & Art Direction](18-visual-art-direction.md)
  are original, produced for SimCraft, with their own distinct palette
  and style (this spec leans toward a slightly stylized, warmer-toned
  palette than Minecraft's, described in that chapter).
- **No copied source code.** The engine described in
  [01 — Tech Stack & Architecture](01-tech-stack-architecture.md) is built
  from first principles on top of Three.js and this project's own
  algorithms (greedy meshing, noise-based terrain, etc. are all
  well-documented, unprotectable *techniques* — implementing them from
  the published theory, not from Minecraft's code, is what keeps this
  clean).
- **Mechanical inspiration is fine; asset and branding copying is not.**
  The rule of thumb used throughout this spec: if a feature is a
  well-known genre convention (crafting grids, chunk-based infinite
  terrain, day/night hostile spawns), it's in bounds. If a feature is a
  specific, recognizable piece of Minecraft's *expression* (its exact
  creature designs and names, its exact block textures, its exact
  soundtrack), SimCraft has its own original version instead, never a
  reskin.

## 6. Success criteria for the spec itself

This spec is "done" when a competent implementer — human or an AI coding
agent — could pick any single chapter, read it in isolation, and start
writing code against it without needing to ask clarifying questions about
*what* to build (only *how*, which is an implementation-time judgment
call). Concretely, that means every system chapter includes: the
mechanic's rules in plain language, the concrete data it operates over
(block tables, recipe tables, numeric tuning values), and its integration
points with the other systems it touches. The
[23 — Data Schema Reference](23-data-schema-reference.md) chapter exists
specifically so an implementer has one place to find every ID, enum, and
TypeScript interface referenced elsewhere in the spec.
