import { describe, expect, it } from "vitest";
import { Player, type PlayerInput } from "./Player";
import type { World } from "../core/World";

/** A flat world: solid ground up to and including y = 63, air above. */
const flatWorld = { getBlock: (_x: number, y: number) => (y <= 63 ? 3 : 0) } as unknown as World;

const idle: PlayerInput = { forward: 0, right: 0, jump: false, sprint: false, flyUp: false, flyDown: false };
const dt = 1 / 60;
const forwardVec = { x: 0, y: 0, z: -1 };
const rightVec = { x: 1, z: 0 };

function flyer(): Player {
  const p = new Player();
  p.position = { x: 0.5, y: 120, z: 0.5 };
  p.flying = true;
  return p;
}

describe("flight", () => {
  it("cruises at the normal fly speed", () => {
    const p = flyer();
    p.tick(dt, flatWorld, { ...idle, forward: 1 }, forwardVec, rightVec);
    expect(Math.hypot(p.velocity.x, p.velocity.z)).toBeCloseTo(10.8, 5);
  });

  it("goes much faster with turbo, and turbo ends when flight does", () => {
    const p = flyer();
    p.turbo = true;
    p.tick(dt, flatWorld, { ...idle, forward: 1 }, forwardVec, rightVec);
    expect(Math.hypot(p.velocity.x, p.velocity.z)).toBeGreaterThan(25);
    // Vertical control is boosted too.
    p.tick(dt, flatWorld, { ...idle, flyUp: true }, forwardVec, rightVec);
    expect(p.velocity.y).toBeGreaterThan(25);
    p.flying = false;
    p.tick(dt, flatWorld, idle, forwardVec, rightVec);
    expect(p.turbo).toBe(false);
  });

  it("lands when you fly down into the ground", () => {
    const p = flyer();
    p.turbo = true;
    p.position.y = 66;
    for (let i = 0; i < 120 && p.flying; i++) p.tick(dt, flatWorld, { ...idle, flyDown: true }, forwardVec, rightVec);
    expect(p.flying).toBe(false);
    expect(p.turbo).toBe(false);
    expect(p.onGround).toBe(true);
    expect(p.position.y).toBeCloseTo(64, 5);
  });

  it("keeps flying while hovering or climbing", () => {
    const p = flyer();
    for (let i = 0; i < 60; i++) p.tick(dt, flatWorld, { ...idle, flyUp: true }, forwardVec, rightVec);
    expect(p.flying).toBe(true);
  });
});
