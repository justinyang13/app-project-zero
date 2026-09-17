// A small procedural, tileable alpha-cutout leaf pattern — no external
// image assets in this project yet (see data/blocks.ts's "placeholder
// flat color until textures land" note on BlockDef.color), so this is
// drawn on a canvas at runtime instead. White where a leaf clump covers
// the cell, so the block's own tinted vertex color shows through
// unmodified, and fully transparent in the gaps — cut out via the
// material's alphaTest rather than alpha blending, so there's no
// transparency sort order to get wrong against the rest of the chunk
// (see engine/ChunkManager.ts's foliageMaterial). Main-thread only
// (uses the DOM canvas API) — call this from ChunkManager, not from
// inside the mesh worker.
import * as THREE from "three";

const GRID = 8; // logical cells across one tile
const CELL_PX = 4; // pixels per cell — small and blocky, not photographic
const SIZE = GRID * CELL_PX;

// Deterministic "is this cell a gap" pattern — no Math.random, since
// the texture must look identical on every load rather than reshuffle
// per session.
function isGap(cx: number, cy: number): boolean {
  const h = (cx * 13 + cy * 7 + cx * cy * 5) % 10;
  return h < 3; // ~30% of cells are see-through gaps
}

let cached: THREE.CanvasTexture | null = null;

export function getLeafTexture(): THREE.CanvasTexture {
  if (cached) return cached;

  const canvas = document.createElement("canvas");
  canvas.width = SIZE;
  canvas.height = SIZE;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("leafTexture: 2D canvas context unavailable");

  ctx.fillStyle = "#ffffff";
  for (let cy = 0; cy < GRID; cy++) {
    for (let cx = 0; cx < GRID; cx++) {
      if (isGap(cx, cy)) continue;
      // Slightly inset so adjacent filled cells don't fuse into one
      // solid block — keeps individual leaf-clump shapes readable.
      ctx.fillRect(cx * CELL_PX + 0.5, cy * CELL_PX + 0.5, CELL_PX - 1, CELL_PX - 1);
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;
  texture.generateMipmaps = false;
  texture.needsUpdate = true;
  cached = texture;
  return texture;
}
