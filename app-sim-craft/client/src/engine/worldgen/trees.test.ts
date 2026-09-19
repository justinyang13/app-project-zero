import { describe, expect, it } from "vitest";
import { planTrees, treesMaxY } from "./trees";
import { drawTree, TREE_HEIGHT, TREE_REACH, type TreeKind, type TreeSpec } from "./treeShapes";
import { sampleColumn } from "./terrain";
import { getBlockById } from "../../data/blocks";
import { leafPixel } from "../../rendering/leafTexture";

const KINDS: TreeKind[] = ["oak", "grandOak", "birch", "maple", "cherry", "willow", "pine", "spruce", "frostBirch", "shrub", "snowShrub"];

/** Every block a tree draws; `hard` collects the ones that overwrite whatever is there (trunks, limbs) rather than only filling air. */
function draw(spec: TreeSpec, hard?: Set<string>): Map<string, number> {
  const cells = new Map<string, number>();
  const put = (x: number, y: number, z: number, block: number, onlyIfAir: boolean): void => {
    const key = `${x},${y},${z}`;
    if (onlyIfAir && cells.has(key)) return;
    cells.set(key, block);
    if (!onlyIfAir) hard?.add(key);
  };
  drawTree(spec, put, () => spec.y);
  return cells;
}

describe("tree shapes", () => {
  it("never exceed their declared reach or height (the bounds chunk generation relies on)", () => {
    for (const kind of KINDS) {
      let maxReach = 0;
      let maxUp = 0;
      for (let s = 1; s <= 60; s++) {
        const spec: TreeSpec = { kind, x: 1000, z: -500, y: 70, seed: s * 2654435761, palette: s % 3 === 0 ? "gold" : s % 2 ? "green" : "autumn", snowy: s % 2 === 0 };
        const hard = new Set<string>();
        const cells = draw(spec, hard);
        expect(cells.size).toBeGreaterThan(4);
        // Trunks and limbs never dig into the ground (leaf curtains and vines only fill air, so terrain stops them).
        for (const key of hard) expect(Number(key.split(",")[1])).toBeGreaterThan(spec.y);
        for (const key of cells.keys()) {
          const [x, y, z] = key.split(",").map(Number);
          maxReach = Math.max(maxReach, Math.abs(x - spec.x), Math.abs(z - spec.z));
          maxUp = Math.max(maxUp, y - spec.y);
        }
      }
      expect(maxReach, `${kind} reach`).toBeLessThanOrEqual(TREE_REACH[kind]);
      expect(maxUp, `${kind} height`).toBeLessThanOrEqual(TREE_HEIGHT[kind]);
    }
  });

  it("is deterministic: the same spec draws the same tree", () => {
    const spec: TreeSpec = { kind: "maple", x: 10, z: 20, y: 70, seed: 12345, palette: "green", snowy: false };
    expect([...draw(spec)]).toEqual([...draw(spec)]);
  });

  it("gives each species its own look: different woods and leaves", () => {
    const woods = new Map<TreeKind, string>();
    for (const kind of ["oak", "birch", "cherry", "willow", "maple"] as TreeKind[]) {
      const cells = draw({ kind, x: 0, z: 0, y: 70, seed: 99, palette: "green", snowy: false });
      const keys = new Set([...cells.values()].map((id) => getBlockById(id).key));
      woods.set(kind, [...keys].sort().join(","));
    }
    expect(new Set(woods.values()).size).toBe(5);
    const cherry = draw({ kind: "cherry", x: 0, z: 0, y: 70, seed: 99, palette: "green", snowy: false });
    expect([...cherry.values()].some((id) => getBlockById(id).key === "glow_vine")).toBe(true); // hanging vines
    const willow = draw({ kind: "willow", x: 0, z: 0, y: 70, seed: 99, palette: "green", snowy: false });
    expect([...willow.values()].filter((id) => getBlockById(id).key.startsWith("leaves_willow")).length).toBeGreaterThan(60); // curtains
    const pine = draw({ kind: "pine", x: 0, z: 0, y: 70, seed: 99, palette: "green", snowy: true });
    expect([...pine.values()].some((id) => getBlockById(id).key === "leaves_snowy")).toBe(true); // snow on the boughs
  });
});

describe("tree placement", () => {
  it("lists the same tree from every chunk column it reaches into (so no crown is cut at a chunk edge)", () => {
    const seed = 424242;
    for (let cx = -3; cx <= 3; cx++) {
      const here = planTrees(seed, cx, 2);
      const east = planTrees(seed, cx + 1, 2);
      for (const tree of here) {
        const reachesEast = tree.x + TREE_REACH[tree.kind] >= (cx + 1) * 32;
        if (reachesEast) expect(east.some((t) => t.x === tree.x && t.z === tree.z && t.kind === tree.kind)).toBe(true);
      }
    }
  });

  it("grows woods, groves of several species, and snow trees on snowy ground — but none in water, on roads or in the village", () => {
    const seed = 777;
    const kinds = new Set<TreeKind>();
    for (let cx = -8; cx <= 8; cx++) {
      for (let cz = -8; cz <= 8; cz++) {
        for (const t of planTrees(seed, cx, cz)) {
          kinds.add(t.kind);
          const s = sampleColumn(seed, t.x, t.z);
          expect(s.height).toBeGreaterThanOrEqual(64);
          expect(s.village).toBeLessThanOrEqual(0.02);
          if (t.snowy) expect(["pine", "spruce", "frostBirch", "snowShrub"]).toContain(t.kind);
        }
      }
    }
    for (const kind of ["oak", "birch", "maple", "cherry", "pine"] as TreeKind[]) expect(kinds.has(kind), kind).toBe(true);
  });

  it("sizes the column for the tallest tree that reaches it", () => {
    const trees = planTrees(31, 0, 0);
    expect(treesMaxY(trees)).toBeGreaterThan(Math.min(...trees.map((t) => t.y)));
    expect(treesMaxY([])).toBe(0);
  });
});

describe("leaf texture", () => {
  it("is a mix of leaf clumps in several tones and see-through gaps", () => {
    let gaps = 0;
    const tones = new Set<number>();
    for (let y = 0; y < 16; y++) {
      for (let x = 0; x < 16; x++) {
        const v = leafPixel(x, y);
        if (v < 0) gaps++;
        else tones.add(Math.floor(v / 24));
      }
    }
    expect(gaps).toBeGreaterThan(256 * 0.06);
    expect(gaps).toBeLessThan(256 * 0.45);
    expect(tones.size).toBeGreaterThanOrEqual(4);
  });
});
