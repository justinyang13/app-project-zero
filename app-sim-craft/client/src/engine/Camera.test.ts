import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { MouseLook } from "./Camera";

// PointerLockControls (three/examples/jsm/controls/PointerLockControls.js)
// only touches domElement.addEventListener/removeEventListener and
// domElement.ownerDocument.addEventListener/removeEventListener during
// construction/connect/dispose — this fake satisfies exactly that, no
// jsdom needed.
function createFakeDomElement(): HTMLElement {
  const noop = () => {};
  return {
    addEventListener: noop,
    removeEventListener: noop,
    ownerDocument: { addEventListener: noop, removeEventListener: noop },
  } as unknown as HTMLElement;
}

function yawPitchOf(camera: THREE.PerspectiveCamera): { yaw: number; pitch: number } {
  const euler = new THREE.Euler().setFromQuaternion(camera.quaternion, "YXZ");
  return { yaw: euler.y, pitch: euler.x };
}

describe("MouseLook.applyPointerDelta", () => {
  it("matches the exact yaw/pitch panBy() produces for the equivalent radians (same underlying math, different units)", () => {
    const camera = new THREE.PerspectiveCamera();
    const mouseLook = new MouseLook(camera, createFakeDomElement());

    const deltaX = 37;
    const deltaY = -22;
    const sensitivity = 0.002; // mirrors PointerLockControls' internal constant
    const pointerSpeed = mouseLook.controls.pointerSpeed; // 1.0 by default

    const cameraA = camera.clone();
    mouseLook.applyPointerDelta(cameraA, deltaX, deltaY);

    const cameraB = camera.clone();
    const deltaYaw = deltaX * sensitivity * pointerSpeed;
    const deltaPitch = -deltaY * sensitivity * pointerSpeed;
    mouseLook.panBy(cameraB, deltaYaw, deltaPitch);

    const a = yawPitchOf(cameraA);
    const b = yawPitchOf(cameraB);
    expect(a.yaw).toBeCloseTo(b.yaw, 10);
    expect(a.pitch).toBeCloseTo(b.pitch, 10);

    mouseLook.dispose();
  });

  it("dragging right turns the camera right (matches a mouse moving right)", () => {
    const camera = new THREE.PerspectiveCamera();
    const mouseLook = new MouseLook(camera, createFakeDomElement());

    const before = yawPitchOf(camera);
    mouseLook.applyPointerDelta(camera, 50, 0);
    const after = yawPitchOf(camera);

    expect(after.yaw).not.toBeCloseTo(before.yaw, 5);
    expect(after.pitch).toBeCloseTo(before.pitch, 10);

    mouseLook.dispose();
  });

  it("clamps pitch to the same [-90°, 90°] range panBy uses, regardless of how large the delta is", () => {
    const camera = new THREE.PerspectiveCamera();
    const mouseLook = new MouseLook(camera, createFakeDomElement());

    mouseLook.applyPointerDelta(camera, 0, -1_000_000);
    expect(yawPitchOf(camera).pitch).toBeCloseTo(Math.PI / 2, 10);

    mouseLook.applyPointerDelta(camera, 0, 2_000_000);
    expect(yawPitchOf(camera).pitch).toBeCloseTo(-Math.PI / 2, 10);

    mouseLook.dispose();
  });
});
