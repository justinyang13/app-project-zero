# 18 — Visual & Art Direction

## 1. Art style

SimCraft's visual identity is **stylized voxel-realism with a warm,
slightly saturated palette** — recognizably part of the voxel-sandbox
genre visual language (1×1×1 cube blocks, 16×16px-per-face textures, no
smooth-shaded organic geometry outside of creature/entity models) but
deliberately distinct from Minecraft's own look (see
[00 — Vision & Scope](00-vision-and-scope.md) §5 on originality — no
copied textures under any circumstance):

- **Texture resolution:** 16×16px per block face, hand-authored (or
  hand-authored-style procedurally generated, see §5), nearest-neighbor
  filtered (no smoothing/blur) for crisp pixel-art edges, matching genre
  convention for readability at a distance — this resolution is also
  what the texture-atlas budget in
  [15 — Performance](15-performance.md) §2 is planned around.
- **Palette:** warmer and slightly more saturated than the genre
  baseline's palette — Loam reads as a richer amber-brown rather than a
  flat gray-brown, Meadow grass leans toward a warm spring-green,
  Sunscar Desert sand leans toward a warm gold rather than pale tan. This
  is both an originality differentiator and a deliberate mood choice
  (SimCraft aims to feel inviting/cozy even in its "default" look, with
  individual biomes like Frostreach Tundra or Hollow Reach providing
  cooler/starker palette contrast where the biome calls for it).
- **Creature/entity models:** simple blocky low-poly forms (not
  full-cube-only like terrain blocks, but not smooth/organic either — a
  middle ground of chunky rounded-box proportions, similar spirit to the
  genre baseline's creature silhouettes but with SimCraft's own original
  proportions and color markings per creature, see
  [08 — Mobs & Creatures](08-mobs-creatures.md) §3).
- **UI visual language:** rounded-corner panels with a warm parchment/
  wood-grain background texture for menus (reinforcing the "handcrafted"
  building-game mood), clean flat iconography for HUD elements (no
  skeuomorphic gloss), consistent with a cozy-but-competent tone rather
  than a stark sci-fi or hyper-minimal aesthetic.

## 2. Lighting & mood

Time-of-day lighting (see
[10 — Lighting & Rendering](10-lighting-rendering.md) §4) is tuned to
emphasize warm golden-hour lighting at dawn/dusk more strongly than a
strictly "realistic" color-temperature curve would — a deliberate mood
choice reinforcing the cozy tone, at the cost of slight physical
inaccuracy, which is an acceptable and common trade in this genre's
visual language.

## 3. Resource pack system

Textures, per-block color tints, and (optionally) simple sound
replacements are data-driven, not hardcoded — every block/item texture
reference in `data/blocks.ts` / `data/items.ts` points to a named atlas
region rather than a baked-in file path, and the atlas itself is built
from a folder of individual per-block-face PNGs at build/load time (see
[19 — Modding & Scripting API](19-modding-api.md) §2 for the exact
resource-pack folder format). This means:

- Swapping the *entire* game's look for a different original palette
  (e.g. an alternate "high-contrast" or "muted realism" pack) is a
  content-only change, not a code change, and requires no rendering-
  pipeline changes.
- Players can install a community/self-made resource pack (subject to
  the sandboxing rules in
  [19 — Modding & Scripting API](19-modding-api.md) §1) without touching
  game logic.
- The MVP ships with exactly one first-party pack (the default style
  described in §1 above); resource-pack *selection UI* and *installation
  flow* is speced now so the underlying texture-atlas system is built
  data-driven from day one rather than retrofitted later, but shipping a
  second pack is not itself an MVP content requirement.

## 4. Original creature & block naming discipline

As a concrete production rule (not just a legal one): every asset name
used in code, data tables, and UI strings is checked against genre-
trademarked terms before being finalized. The naming pattern used
throughout this spec — descriptive-original names that hint at the
familiar mechanic without reusing protected names (`Gloomlurker` not
`Zombie`, `Sparkwire` not `Redstone`, `Lumen Crystal` not `Diamond`) — is
the house style for any new content added beyond what's already
enumerated in this spec.

## 5. Procedural vs. hand-authored texture production

For an implementer without dedicated pixel-art time budgeted, §1's
16×16px textures can reasonably be produced via a mix of: hand-authored
key textures for high-visibility/high-frequency blocks (Loam, Stone,
each Wood family, Water/Lava surface), and a procedural/parameterized
generation approach (noise-based texture synthesis with a per-block-
family palette and grain pattern) for the long tail of variant blocks
(the 8 Terracotta color bands, the 16 Wool/dye colors, ore-in-stone
variants) — keeping the *palette* consistent (per §1) while reducing
hand-authoring burden. This is an implementation-time production
decision, not a spec requirement either way, called out here so it isn't
overlooked when scoping the art pass.

## 6. UI iconography

Item/block inventory icons are rendered as small isometric snapshots of
the actual in-game block/item model (consistent with genre convention —
what you see in your inventory matches what you'll place in the world
exactly, no separate icon-art pass needed for the ~420 block catalog from
[03 — Blocks & Materials](03-blocks-materials.md) §3) rather than
hand-drawn 2D icons; tools/weapons/armor/misc items that aren't blocks do
get dedicated hand-authored (or procedurally styled, per §5) 2D icons
since they don't have a natural in-world block form to snapshot.
