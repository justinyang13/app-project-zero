/// <reference types="node" />
// Guards the layering the codebase was restructured around. Each top-level
// folder under src/ is a layer that may only import from the layers listed for
// it below; a new import that crosses the line fails here, so the structure
// can't quietly erode back into one tangled ball. If a new dependency is
// genuinely right, add it to ALLOWED (and to ARCHITECTURE.md) on purpose.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, normalize, relative, sep } from "node:path";
import { describe, expect, it } from "vitest";

const SRC = join(__dirname);

/** layer -> the layers it may import from (its own folder is always fine). */
const ALLOWED: Record<string, string[]> = {
  data: [],
  platform: [],
  core: ["data"],
  worldgen: ["core", "data"],
  rendering: ["core", "data"],
  workers: ["core", "data", "rendering", "worldgen"],
  map: ["core", "data", "worldgen", "workers"],
  entities: ["core", "data", "rendering", "worldgen"],
  persistence: ["core", "data", "worldgen"],
  sync: ["persistence"],
  input: ["core", "data", "state"],
  state: ["core", "data", "platform"],
  hooks: ["platform"],
  engine: ["core", "data", "entities", "input", "map", "persistence", "rendering", "state", "workers", "worldgen"],
  session: ["core", "map", "persistence", "sync"],
  ui: ["core", "data", "hooks", "input", "map", "platform", "session", "state"],
};
// Files directly in src/ (main.tsx, App.tsx, ...) are the composition root: they may import anything.
const ROOT = "(root)";

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return sourceFiles(path);
    return /\.(ts|tsx)$/.test(name) && !/\.test\.tsx?$/.test(name) ? [path] : [];
  });
}

function layerOf(path: string): string {
  const parts = relative(SRC, path).split(sep);
  return parts.length === 1 ? ROOT : parts[0];
}

const IMPORT = /(?:from\s+|import\(\s*|new URL\(\s*)["'](\.{1,2}\/[^"']*|\.{1,2})["']/g;

describe("architecture", () => {
  const violations: string[] = [];
  const unknownLayers = new Set<string>();

  for (const file of sourceFiles(SRC)) {
    const from = layerOf(file);
    if (from === ROOT) continue;
    if (!(from in ALLOWED)) {
      unknownLayers.add(from);
      continue;
    }
    for (const match of readFileSync(file, "utf8").matchAll(IMPORT)) {
      const to = layerOf(normalize(join(dirname(file), match[1])));
      if (to === from || to === ROOT) {
        if (to === ROOT) violations.push(`${relative(SRC, file)} imports the app root (${match[1]})`);
        continue;
      }
      if (!ALLOWED[from].includes(to)) violations.push(`${relative(SRC, file)}: ${from} must not import from ${to} (${match[1]})`);
    }
  }

  it("every folder is a declared layer", () => {
    expect([...unknownLayers]).toEqual([]);
  });

  it("no layer imports from a layer it is not allowed to", () => {
    expect(violations).toEqual([]);
  });

  it("the allowed dependencies form a DAG (no layer can depend on itself through others)", () => {
    const visiting = new Set<string>();
    const done = new Set<string>();
    const cycle: string[] = [];
    const visit = (layer: string, trail: string[]): void => {
      if (done.has(layer) || cycle.length > 0) return;
      if (visiting.has(layer)) {
        cycle.push(...trail, layer);
        return;
      }
      visiting.add(layer);
      for (const next of ALLOWED[layer] ?? []) visit(next, [...trail, layer]);
      visiting.delete(layer);
      done.add(layer);
    };
    for (const layer of Object.keys(ALLOWED)) visit(layer, []);
    expect(cycle).toEqual([]);
  });
});
