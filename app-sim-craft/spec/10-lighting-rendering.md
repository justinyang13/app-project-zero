# 10 — Lighting & Rendering

## 1. Lighting model

Two independent 4-bit (0–15) light channels per voxel, stored as two
parallel `Uint8Array`s per chunk (packable into a single `Uint8Array`
with 4 bits each, if memory profiling calls for it — see
[15](15-performance.md) §2):

- **Sky light:** flood-filled downward from the topmost non-opaque block
  of each column at chunk-generation time (see
  [02](02-world-generation.md) §2 step 10), decaying by 1 per block of
  vertical travel through non-opaque blocks, and propagating sideways
  through open space with the same decay rule via a breadth-first flood
  fill. Scaled at render time by the current time-of-day sun brightness
  (§4) — sky light of 15 reads as full daylight at noon and near-black at
  midnight, without needing to re-flood-fill the whole world every tick.
- **Block light:** flood-filled outward from every light-emitting block
  (`lightEmission` > 0, see [03](03-blocks-materials.md) §1) at its own
  emission level, decaying by 1 per block through non-opaque blocks,
  breadth-first, same algorithm as sky light minus the time-of-day scale.
- **Combined light level** used for rendering a voxel's face brightness
  and for hostile-spawn eligibility (see
  [08](08-mobs-creatures.md) §4) is `max(scaledSkyLight, blockLight)`.
- **Propagation updates:** placing/breaking a light-emitting or opaque
  block triggers a local re-flood (breadth-first from the changed block
  outward until decay reaches 0 or hits an already-correct value — not a
  full chunk re-flood), queued on the simulation tick alongside block
  updates (see [03](03-blocks-materials.md) §4).
- **Removal propagation:** removing a light source (or placing an opaque
  block that cuts off a light path) requires a two-phase update — first a
  "darken" flood that un-lights every voxel whose light traced back
  through the removed source, then a "re-light" flood from any
  still-valid neighboring sources found at the darken frontier. This is
  the standard correct algorithm for voxel light removal (a naive
  decay-only re-flood undercounts and leaves incorrect bright spots).

## 2. Rendering pipeline overview

- **Renderer:** Three.js `WebGLRenderer` (WebGL2 context), one `Scene`,
  one perspective `Camera` matching the player's view (see
  [05](05-player-mechanics.md) §2).
- **Per-chunk mesh:** one `THREE.Mesh` (occasionally two, if transparent
  blocks like water/glass are split into a separate pass — see §3) per
  loaded chunk, built by the greedy mesher (§3) in a worker and uploaded
  as a `BufferGeometry` with position, normal, UV, and a packed per-vertex
  light/AO byte.
- **Texture atlas:** every block's face textures are packed into a single
  square atlas texture (mipmapped, nearest-neighbor filtering for the
  crisp voxel-art look — see [18](18-visual-art-direction.md) §1) so an
  entire chunk mesh (and, ideally, the entire visible world) can render
  in as few draw calls/material switches as possible; UVs baked into the
  mesh reference atlas sub-rectangles per block-face.
- **Frustum & occlusion culling:** Three.js's built-in frustum culling
  per chunk mesh handles the coarse case; additionally, a chunk-column
  visibility pass (skip generating/uploading chunks fully enclosed by
  opaque neighbors on all 6 sides with no light path — never visible
  regardless of camera angle) avoids wasted GPU upload for buried chunks.
- **Level of detail (LOD):** chunks beyond a configurable near-distance
  render at full per-block mesh detail; chunks in an outer ring (up to
  the render-distance setting) use a coarser LOD mesh (2×2×2 or 4×4×4
  block-averaged "super-voxels," same greedy-meshing algorithm applied
  to a downsampled block grid) — see [15](15-performance.md) §3 for the
  distance thresholds this is tuned against.

## 3. Greedy meshing algorithm

The core performance technique, run per chunk (and per LOD level) inside
`mesh.worker.ts`:

1. For each of the 6 face directions (±X, ±Y, ±Z), sweep through the
   chunk one axis-aligned slice at a time.
2. Within each slice, build a 2D boolean/ID mask of "does this voxel have
   a visible face in this direction" (true only if the voxel is solid/
   opaque-enough and its neighbor in that direction is air, transparent,
   or a different-enough block to require a face — see
   [03](03-blocks-materials.md) §1 `transparentToRender`).
3. Greedily merge adjacent mask cells with the same block type (and same
   lighting bucket, see below) into the largest possible rectangle,
   emitting one quad per merged rectangle instead of one quad per voxel
   face — this is what turns a solid 32×32 wall's ~1,024 unmeshed faces
   into as few as one quad.
4. Repeat for all 6 directions, accumulating into the chunk's vertex/
   index buffers.
5. **Lighting caveat:** naive greedy merging would visibly flatten
   lighting gradients across a merged quad. To avoid that, the mask
   comparison in step 3 also requires matching (or close-enough,
   quantized) combined light level and ambient-occlusion value between
   cells — trading a small amount of merge efficiency in lit/shadowed
   transition areas for correct-looking lighting elsewhere.
- **Ambient occlusion:** a cheap per-vertex AO term computed from the
  solidity of the up-to-3 blocks diagonally adjacent to each face corner
  (the standard "voxel AO" trick), baked into the vertex color/light byte
  alongside the propagated light level — gives corners and crevices a
  soft darkening without any real-time AO pass.

## 4. Sky, time-of-day, and fog

- **Sky dome:** a large inverted sphere with a custom gradient shader
  (horizon-to-zenith color, parameterized by time-of-day and weather
  state), plus a billboard sun and moon mesh positioned by `worldTime`
  (see [07](07-survival-systems.md) §1).
- **Directional light:** intensity, color temperature, and angle all
  driven continuously by `worldTime`; a secondary dim ambient/hemisphere
  light provides a floor so fully shadowed areas aren't pure black.
- **Fog:** distance fog matched to the current render-distance setting
  (see [15](15-performance.md) §3), color-matched to the sky at the
  horizon, used both for atmospheric effect and to hide the chunk-pop-in
  edge at the render horizon; fog density/color also shifts for
  underwater (blue-green, dense) and weather (gray, denser during rain/
  sandstorm — see [07](07-survival-systems.md) §4).

## 5. Water & special material shaders

- **Water:** a dedicated transparent material with animated surface
  normal perturbation (scrolling normal-map noise, cheap and framerate-
  stable rather than true wave simulation), a depth-based color/opacity
  gradient (shallow water reads lighter/clearer, deep water darker), and
  screen-space-adjacent refraction faked via a simple UV-offset sampling
  trick rather than a full refraction render pass (kept cheap
  deliberately — see [15](15-performance.md) §1's performance-over-
  fidelity stance for underwater rendering specifically).
- **Lava:** similar scrolling-noise animated material, opaque, with an
  emissive component (it's a light source, see §1) and a slow bubbling
  particle emitter.
- **Leaves:** alpha-tested (not alpha-blended) transparency for
  performance, with a wind-sway vertex-shader offset (a small per-vertex
  sine-wave displacement driven by a global time uniform and each leaf
  block's world position as a phase offset) for ambient motion.
- **Glass/Stained Glass:** alpha-blended transparent material, tinted per
  dye color.

## 6. Particle systems

A shared, pooled particle system (fixed-size typed-array-backed particle
buffers, no per-particle object allocation) drives: block-break debris
(a handful of small cubes matching the broken block's texture, with
simple gravity + fade-out), footstep dust, campfire smoke, lava
bubbles/embers, weather (rain streaks, snow flakes, sandstorm haze),
water splashes, and Powder Charge detonation smoke — see
[15 — Performance](15-performance.md) §4 for the particle-count budget.
