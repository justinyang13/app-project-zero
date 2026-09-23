# SimCraft Wish List

Running list of feature/polish ideas, not yet scoped or built. Add to it
freely; move an item out (or check it off) once it ships.

1. Ice castle, as big as the current (dark) castle. Ask the user for a
   reference image before designing it. Needs secret passageways. Must
   include a big, tall library room filled with books, at least 3
   stories tall.
2. A beach biome/shoreline with palm trees
3. An island in the middle of the deep lake
4. New creatures: unicorns, alicorns, pegasus
5. Pet system: a creature found in the wild can be asked to follow the
   player around. Only one pet at a time.
6. Bug: whales and sharks can't swim past the bridge. Clear the invisible
   underwater structures (likely leftovers), especially under the bridge.

_(add new ideas above this line)_

## Shipped

- The dark castle (replaces the grey box castle): a fixed, seed-independent
  fortress on a terraced crag at (-100, -30) — banner-hung curtain wall
  with glowing pagoda pavilions, a three-tier keep with a crowned spire,
  a lava-river courtyard with brazier pillars and a bridge, an outer wall
  and gatehouse, a great hall, interior stairs, and lava cascading down
  the cliffs. Built on a new "textured" render layer: pixel-art block
  textures, see-through lattice windows and iron grates, self-lit
  (emissive) lava/windows/flames with animated frames, and baked,
  occlusion-aware block light from every glowing block (see
  src/engine/worldgen/castle/ and src/rendering/texturedMaterial.ts).
  Banners are thin swaying cloth planes (src/engine/CastleBanners.ts).
  The H key / minimap button now teleports to the castle's outer gate.
  Three campfire camps that stood where the crag now is were moved.

- Hotkeys for tool selection (Z/X/C/V for Break/Build/Torch/Flag,
  alongside B's existing cycle)
- Minimap zoom in/out feature (+/- buttons on the minimap, or the
  +/- keys)
- Water is transparent (its own translucent mesh/material) and swimmable
  (liquid blocks are passable, with slower swim movement and gentle
  buoyancy instead of gravity) — depth already varies shallow-to-deep
  from the existing heightmap, now visible through the transparency
- Clouds drift on their own wind (not just tracking the player), slowly
  billow/change shape and breathe in and out of opacity, and tint from
  a dim night shade to bright white following the same day/night curve
  as the sky and sun/moon lighting. The scatter field now re-centers on
  the player only when they wander past its edge instead of every
  frame, so it reads as anchored to the world rather than glued to the
  camera.
- Street lamps now anchor to the loop road's flattened elevation instead
  of the natural terrain height at their shoulder offset, so they sit at
  actual road level (previously floating above or buried below it
  wherever the road cut through a hill or causewayed over water) and
  their point light now reaches the pavement. Midnight is meaningfully
  darker (lower night ambient/moon light) instead of a mild dimming, and
  sunset/dawn now pass through a warm, soft purple-pink sky/fog gradient
  instead of fading straight from night-blue to day-blue.
- Animals now stay grounded around trees instead of teleporting onto
  their canopy: their ground-height scan (which just finds "the first
  solid block straight down," so a tree's leaves/trunk read the same as
  actual terrain) is now rejected as an obstacle whenever it implies a
  step taller than ~1 block, the same way they already avoided water —
  they stop and turn instead of snapping up onto a tree, cliff, or wall.
- Leaves render with a procedural alpha-cutout texture (own mesh/
  material, tiled once per block across greedy-merged quads via
  RepeatWrapping) instead of a flat solid-colored cube, so tree canopies
  read as patterned and see-through rather than a block wall of color.
