// The material behind the "textured" mesh layer (the castle's block
// palette): a MeshLambertMaterial patched to sample a 2D-array texture of
// pixel-art tiles instead of using flat vertex colors. What the patch
// adds on top of plain Lambert:
//  - per-vertex texture layer (+ frame count for animated tiles like lava
//    and flames), tiled once per block across greedy-merged quads via
//    fract() — sampled with explicit gradients so mip selection doesn't
//    seam at the block boundaries;
//  - alpha cut-out from the tile's alpha (lattice windows, iron grates,
//    flames), through the material's ordinary alphaTest;
//  - a parallel emissive texture array (lava, window glass, ember veins)
//    added on top of the lit result, so those pixels ignore the scene's
//    lighting;
//  - the baked block-light "glow" vertex color the mesher derives from
//    the castle's light map, added as warm firelight on lit surfaces.
// Main-thread only (builds GPU textures) — see engine/ChunkManager.ts.
import * as THREE from "three";
import { paintAllTiles } from "./blockPainter";
import { TEXTURE_LAYER_COUNT, TEXTURE_SIZE } from "../data/blockTextures";

const ANIMATION_FPS = 7;

const uniforms = {
  uTime: { value: 0 },
  uEmissiveGain: { value: 1 },
  uGlowGain: { value: 1 },
  uAlbedo: { value: null as THREE.DataArrayTexture | null },
  uEmissive: { value: null as THREE.DataArrayTexture | null },
};

function buildTextureArrays(): { albedo: THREE.DataArrayTexture; emissive: THREE.DataArrayTexture } {
  const tiles = paintAllTiles();
  const tileBytes = TEXTURE_SIZE * TEXTURE_SIZE * 4;
  const albedoData = new Uint8Array(tileBytes * TEXTURE_LAYER_COUNT);
  const emissiveData = new Uint8Array(tileBytes * TEXTURE_LAYER_COUNT);
  tiles.forEach((tile, i) => {
    albedoData.set(tile.albedo, i * tileBytes);
    emissiveData.set(tile.emissive, i * tileBytes);
  });

  const make = (data: Uint8Array<ArrayBuffer>): THREE.DataArrayTexture => {
    const texture = new THREE.DataArrayTexture(data, TEXTURE_SIZE, TEXTURE_SIZE, TEXTURE_LAYER_COUNT);
    texture.format = THREE.RGBAFormat;
    texture.type = THREE.UnsignedByteType;
    texture.colorSpace = THREE.SRGBColorSpace;
    // Crisp pixels up close, mip-blended (so they don't shimmer) at range.
    texture.magFilter = THREE.NearestFilter;
    texture.minFilter = THREE.NearestMipmapLinearFilter;
    texture.generateMipmaps = true;
    texture.anisotropy = 8;
    texture.wrapS = THREE.ClampToEdgeWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    texture.needsUpdate = true;
    return texture;
  };
  return { albedo: make(albedoData), emissive: make(emissiveData) };
}

let cached: THREE.MeshLambertMaterial | null = null;

export function getTexturedMaterial(): THREE.MeshLambertMaterial {
  if (cached) return cached;
  const arrays = buildTextureArrays();
  uniforms.uAlbedo.value = arrays.albedo;
  uniforms.uEmissive.value = arrays.emissive;

  const material = new THREE.MeshLambertMaterial({ vertexColors: true, alphaTest: 0.5 });
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);

    shader.vertexShader = shader.vertexShader
      .replace(
        "void main() {",
        `attribute vec2 tuv;
attribute vec2 tile;
attribute vec3 glow;
varying vec2 vTUv;
varying vec2 vTile;
varying vec3 vGlow;
void main() {
  vTUv = tuv;
  vTile = tile;
  vGlow = glow;`,
      );

    shader.fragmentShader = shader.fragmentShader
      .replace(
        "void main() {",
        `uniform float uTime;
uniform float uEmissiveGain;
uniform float uGlowGain;
uniform highp sampler2DArray uAlbedo;
uniform highp sampler2DArray uEmissive;
varying vec2 vTUv;
varying vec2 vTile;
varying vec3 vGlow;
void main() {`,
      )
      .replace(
        "#include <map_fragment>",
        `#include <map_fragment>
  // Tiles are painted top-row-first, texture "up" is -v; one tile per block.
  vec2 blockUv = vec2(vTUv.x, -vTUv.y);
  // vTile.y > 1: animation frames stepped by time; < -1: interchangeable variants picked per block by a position hash.
  float frameCount = floor(vTile.y + 0.5);
  float frame = 0.0;
  if (frameCount > 1.5) {
    frame = floor(mod(uTime * ${ANIMATION_FPS.toFixed(1)}, frameCount));
  } else if (frameCount < -1.5) {
    vec2 cell = floor(blockUv);
    float pick = fract(sin(dot(cell, vec2(127.1, 311.7))) * 43758.5453);
    frame = floor(pick * -frameCount);
  }
  vec3 tileCoord = vec3(fract(blockUv), floor(vTile.x + 0.5) + frame);
  vec2 gx = dFdx(blockUv);
  vec2 gy = dFdy(blockUv);
  vec4 tileTexel = textureGrad(uAlbedo, tileCoord, gx, gy);
  vec3 tileEmissive = textureGrad(uEmissive, tileCoord, gx, gy).rgb;
  diffuseColor *= tileTexel;`,
      )
      .replace(
        "#include <emissivemap_fragment>",
        `#include <emissivemap_fragment>
  totalEmissiveRadiance += tileEmissive * uEmissiveGain;
  totalEmissiveRadiance += vGlow * diffuseColor.rgb * uGlowGain;`,
      );
  };
  cached = material;
  return material;
}

/** Called every frame: advances the lava/flame animation and scales the emissive/baked glow with darkness (night = 1, full daylight = 0). */
export function updateTexturedMaterial(timeSeconds: number, night: number): void {
  uniforms.uTime.value = timeSeconds;
  uniforms.uEmissiveGain.value = 0.8 + 0.45 * night;
  uniforms.uGlowGain.value = 0.2 + 1.5 * night;
}
