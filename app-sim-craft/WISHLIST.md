# SimCraft Wish List

Running list of feature/polish ideas, not yet scoped or built. Add to it
freely; move an item out (or check it off) once it ships.

1. Custom tree-leaf block with a see-through/patterned texture (alpha
   cutout) instead of a solid block, for more realistic-looking trees
2. Animals should stay grounded — currently can walk over trees; needs
   proper terrain/obstacle collision so they path around instead

## Shipped

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
