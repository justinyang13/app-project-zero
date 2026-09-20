import { describe, expect, it } from "vitest";
import { clampToRadius, computeJoystickVector } from "./touchMath";

describe("computeJoystickVector", () => {
  it("returns zero at the pad center", () => {
    expect(computeJoystickVector(0, 0, 60)).toEqual({ x: 0, y: 0 });
  });

  it("pushing straight up (negative dy) is full forward, no strafe", () => {
    const v = computeJoystickVector(0, -60, 60);
    expect(v.x).toBeCloseTo(0);
    expect(v.y).toBeCloseTo(1);
  });

  it("pushing straight down is full backward", () => {
    const v = computeJoystickVector(0, 60, 60);
    expect(v.x).toBeCloseTo(0);
    expect(v.y).toBeCloseTo(-1);
  });

  it("pushing straight right is full right, no forward", () => {
    const v = computeJoystickVector(60, 0, 60);
    expect(v.x).toBeCloseTo(1);
    expect(v.y).toBeCloseTo(0);
  });

  it("scales linearly inside the radius", () => {
    const v = computeJoystickVector(0, -30, 60);
    expect(v.y).toBeCloseTo(0.5);
  });

  it("clamps magnitude to 1 for drags beyond the radius, preserving direction", () => {
    const v = computeJoystickVector(0, -600, 60);
    expect(v.y).toBeCloseTo(1);
    const diag = computeJoystickVector(600, -600, 60);
    expect(Math.hypot(diag.x, diag.y)).toBeCloseTo(1);
    expect(diag.x).toBeCloseTo(diag.y); // equal magnitude components preserved
  });

  it("a zero-radius pad never produces a non-zero vector", () => {
    expect(computeJoystickVector(10, 10, 0)).toEqual({ x: 0, y: 0 });
  });
});

describe("clampToRadius", () => {
  it("leaves points inside the radius untouched", () => {
    expect(clampToRadius(10, 20, 60)).toEqual({ x: 10, y: 20 });
  });

  it("clamps points beyond the radius onto its edge, preserving direction", () => {
    const p = clampToRadius(0, 120, 60);
    expect(p.x).toBeCloseTo(0);
    expect(p.y).toBeCloseTo(60);
  });

  it("leaves the origin untouched", () => {
    expect(clampToRadius(0, 0, 60)).toEqual({ x: 0, y: 0 });
  });
});
