// A single, unique, giant landmark creature — not part of the ambient
// Creature.ts roster (species table, wander AI, ground-snapping — see that
// file's own notes on scope). The dragon lives in the cave carved into
// worldgen/mountain.ts's mountain: it rests on the chamber's dais most of
// the time and periodically launches out through the cave mouth to circle
// the peak before returning. Position/orientation are driven by a small
// explicit state machine keyed on elapsed time within the current state,
// not a physics or pathfinding system — good enough for a scripted,
// decorative flight loop that always starts and ends at the same two
// anchored points (the dais and the cave mouth).
import * as THREE from "three";
import { CAVE_MOUTH, DRAGON_FLIGHT_ALTITUDE_ABOVE_PEAK, DRAGON_FLIGHT_RADIUS, DRAGON_PERCH, MOUNTAIN_CENTER } from "./worldgen/mountain";

type DragonState = "perched" | "launching" | "flying" | "landing";

const BODY_COLOR = 0x2a1c12;
const BELLY_COLOR = 0x4a3222;
const DARK_COLOR = 0x15100c;
const HORN_COLOR = 0x3a2a1c;
const WING_BONE_COLOR = 0x6b4a30;
const WING_MEMBRANE_COLOR = 0x3fae3e;
const EYE_COLOR = 0xd6ff4a;

const LEG_HEIGHT = 5.4; // ground clearance under the belly — everything else is built upward from here
const LAUNCH_DURATION = 9;
const LANDING_DURATION = 9;
const FLY_MIN_DURATION = 45;
const LOOP_PERIOD = 42; // seconds per full circuit of the mountain while flying
const FLAP_SPEED = 2.6; // rad/sec
const FLAP_AMPLITUDE = 0.62;
const BANK_ANGLE = 0.22;

const BREATH_DURATION = 2.4;
const BREATH_MIN_INTERVAL = 7;
const BREATH_MAX_INTERVAL = 16;

// Player-ridden flight — an arcade throttle/steer/climb scheme, the same
// idea as Car's driven mode (CarInput) but in 3D since the dragon isn't
// confined to a road or the ground.
const RIDE_MAX_SPEED = 26; // blocks/sec
const RIDE_REVERSE_MAX_SPEED = 8;
const RIDE_ACCEL = 16;
const RIDE_FRICTION = 10;
const RIDE_TURN_RATE = 1.6; // radians/sec
const RIDE_CLIMB_SPEED = 14; // blocks/sec
const RIDE_BANK_ANGLE = 0.5;
const DISMOUNT_NEAR_PERCH_DIST = 3; // close enough to the dais that landing is skipped in favor of just settling there directly

export interface DragonRideInput {
  throttle: number; // -1..1
  steer: number; // -1..1
  climb: number; // -1..1
}

interface Vec3 {
  x: number;
  y: number;
  z: number;
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function smoothstep(t: number): number {
  const c = Math.max(0, Math.min(1, t));
  return c * c * (3 - 2 * c);
}

/** Quadratic Bezier through three keyframe points — used for both the launch (dais -> mouth -> sky) and landing (sky -> mouth -> dais) arcs. */
function bezier(p0: Vec3, p1: Vec3, p2: Vec3, u: number): Vec3 {
  const a = (1 - u) * (1 - u);
  const b = 2 * (1 - u) * u;
  const c = u * u;
  return { x: a * p0.x + b * p1.x + c * p2.x, y: a * p0.y + b * p1.y + c * p2.y, z: a * p0.z + b * p1.z + c * p2.z };
}

function addBox(
  parent: THREE.Object3D,
  w: number,
  h: number,
  d: number,
  material: THREE.Material,
  x: number,
  y: number,
  z: number,
  rx = 0,
  ry = 0,
  rz = 0,
): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  mesh.position.set(x, y, z);
  mesh.rotation.set(rx, ry, rz);
  parent.add(mesh);
  return mesh;
}

interface WingParts {
  pivot: THREE.Group; // shoulder joint: rotation.z flaps, rotation.y folds in/out
}

/** One wing, built from a tapering arm+forearm "bone" chain plus a fan of finger bones, with a translucent membrane panel filling each gap between them — the same silhouette idea as a bat/dragon wing, all done in boxes to match this engine's voxel-cube visual language. side: -1 = left (-x), +1 = right (+x). */
function buildWing(side: number, boneMat: THREE.Material, membraneMat: THREE.Material): WingParts {
  const pivot = new THREE.Group();

  // Scaled up from the original 11/14/15-block bones — a noticeably
  // bigger wing silhouette without changing the wing's overall rig
  // (shoulder/elbow/finger hierarchy, membrane construction).
  const upperLen = 18;
  const foreLen = 23;
  // Upper-arm bone, laid out along the pivot's local +/-x axis — BoxGeometry's long axis is
  // depth/Z by default, so it's pitched 90 degrees around Y to point sideways instead.
  addBox(pivot, 1.7, 1.7, upperLen, boneMat, side * (upperLen / 2), 0, 0, 0, Math.PI / 2, 0);

  const elbow = new THREE.Group();
  elbow.position.set(side * upperLen, 0, 0);
  elbow.rotation.z = side > 0 ? -0.35 : 0.35;
  pivot.add(elbow);

  addBox(elbow, 1.3, 1.3, foreLen, boneMat, side * (foreLen / 2), 0, 0, 0, Math.PI / 2, 0);

  const fingerCount = 4;
  const fingerBaseLen = 25;
  const fingerStep = 3.6;
  for (let i = 0; i < fingerCount; i++) {
    const spread = (i / (fingerCount - 1) - 0.5) * 1.35; // fan the fingers out from the wrist
    const len = fingerBaseLen - i * fingerStep;
    const finger = new THREE.Group();
    finger.position.set(side * foreLen, 0, 0);
    finger.rotation.y = side * (0.15 + i * 0.28);
    finger.rotation.z = spread * 0.5;
    addBox(finger, 0.7, 0.7, len, boneMat, 0, 0, side * (len / 2), 0, Math.PI / 2, 0);
    elbow.add(finger);
  }

  // Membrane: a thin, wide panel spanning from the forearm out past the fingertips, and one
  // triangular-ish panel (an angled box) between each adjacent pair of fingers, so the whole
  // trailing edge reads as one continuous sail rather than bare bones.
  const mainSail = addBox(elbow, foreLen * 0.9, 0.15, fingerBaseLen * 0.85, membraneMat, side * (foreLen * 0.5), 0, side * (fingerBaseLen * 0.32));
  mainSail.rotation.y = side * 0.12;
  for (let i = 0; i < fingerCount - 1; i++) {
    const lenA = fingerBaseLen - i * fingerStep;
    const lenB = fingerBaseLen - (i + 1) * fingerStep;
    const panel = addBox(
      elbow,
      4.6,
      0.12,
      Math.max(lenA, lenB) * 0.92,
      membraneMat,
      side * (foreLen + Math.min(lenA, lenB) * 0.1),
      0,
      side * (Math.max(lenA, lenB) * 0.46),
    );
    panel.rotation.y = side * (0.15 + i * 0.28 + 0.14);
  }

  return { pivot };
}

interface FireBreathParts {
  group: THREE.Group;
  light: THREE.PointLight;
}

// Bright near the mouth, cooling to a dull ember red at the far tip —
// same gradient idea as a real flame, just stretched into a long jet
// instead of Torch/CampfireVisual's short upward lick.
const FIRE_COLORS = [0xfff3b0, 0xffd24a, 0xff8c2a, 0xd94a1a, 0x8a2a12];

/**
 * A tapering stream of translucent cones plus a warm point light — the
 * fire-breath counterpart to Torch/CampfireVisual's flicker-cone flames,
 * just much longer and aimed forward out of the mouth instead of
 * straight up. Built once (like every other body part) and toggled by
 * Dragon.updateFireBreath's visibility/scale, not rebuilt per breath.
 */
function buildFireBreath(): FireBreathParts {
  const group = new THREE.Group();

  let z = 0.4;
  const segments = FIRE_COLORS.length;
  for (let i = 0; i < segments; i++) {
    const t = i / (segments - 1);
    const radius = lerp(1.15, 0.12, t);
    const length = lerp(1.7, 2.3, t);
    const mat = new THREE.MeshBasicMaterial({
      color: FIRE_COLORS[i],
      transparent: true,
      opacity: lerp(0.95, 0.35, t),
    });
    const cone = new THREE.Mesh(new THREE.ConeGeometry(radius, length, 10), mat);
    // Apex points away from the mouth (+Z) so the stream narrows into the
    // distance; the wide base faces back toward the source.
    cone.rotation.x = Math.PI / 2;
    cone.position.z = z + length / 2;
    group.add(cone);
    z += length * 0.7; // overlap segments so the stream reads as continuous, not stacked cones
  }

  const light = new THREE.PointLight(0xff8c2a, 0, 16, 2);
  light.position.z = z * 0.4;
  group.add(light);

  group.visible = false;
  return { group, light };
}

interface DragonMeshParts {
  group: THREE.Group;
  leftWing: WingParts;
  rightWing: WingParts;
  tailPivot: THREE.Group;
  neckPivot: THREE.Group;
  jaw: THREE.Mesh;
  fireBreath: FireBreathParts;
}

function buildDragonMesh(): DragonMeshParts {
  const group = new THREE.Group();

  const bodyMat = new THREE.MeshLambertMaterial({ color: BODY_COLOR });
  const bellyMat = new THREE.MeshLambertMaterial({ color: BELLY_COLOR });
  const darkMat = new THREE.MeshLambertMaterial({ color: DARK_COLOR });
  const hornMat = new THREE.MeshLambertMaterial({ color: HORN_COLOR });
  const boneMat = new THREE.MeshLambertMaterial({ color: WING_BONE_COLOR });
  const membraneMat = new THREE.MeshLambertMaterial({
    color: WING_MEMBRANE_COLOR,
    transparent: true,
    opacity: 0.82,
    side: THREE.DoubleSide,
  });
  const eyeMat = new THREE.MeshBasicMaterial({ color: EYE_COLOR });

  // Torso: two overlapping tapered boxes (broad chest, narrower hips) instead of one uniform
  // box, so the body reads as a tapering animal shape rather than a brick.
  const torso = new THREE.Group();
  torso.position.y = LEG_HEIGHT;
  group.add(torso);
  addBox(torso, 7.5, 7.8, 9, bodyMat, 0, 3.9, 3.6);
  addBox(torso, 6.2, 6.6, 9, bodyMat, 0, 3.3, -4.2);
  addBox(torso, 5.2, 3, 15.5, bellyMat, 0, 1.1, 0.2); // belly plate underside

  // Spine ridge spikes: a row of backswept plates down the torso, tapering toward the hips.
  for (let i = 0; i < 6; i++) {
    const z = 7.5 - i * 2.6;
    const size = 2.3 - i * 0.22;
    addBox(torso, 0.5, size, 1.1, hornMat, 0, 7.6 - i * 0.35 + size / 2, z, 0.5, 0, 0);
  }

  // Neck: a chain of tapering segments curving up and forward from the chest to the head.
  const neckPivot = new THREE.Group();
  neckPivot.position.set(0, 6.6, 8.2);
  torso.add(neckPivot);
  let neckCursor = new THREE.Group();
  neckPivot.add(neckCursor);
  const neckSegments = 4;
  for (let i = 0; i < neckSegments; i++) {
    const len = 3.4;
    const w = 3.2 - i * 0.4;
    addBox(neckCursor, w, w, len, bodyMat, 0, len * 0.18, len / 2);
    addBox(neckCursor, 0.4, w * 0.5, 0.8, hornMat, 0, w * 0.55, len * 0.6, 0.4, 0, 0); // small neck spike
    const next = new THREE.Group();
    next.position.set(0, len * 0.36, len);
    next.rotation.x = -0.22; // curve the neck upward segment by segment
    neckCursor.add(next);
    neckCursor = next;
  }

  // Head, on the end of the neck chain.
  const head = new THREE.Group();
  neckCursor.add(head);
  addBox(head, 3.4, 3, 4.6, bodyMat, 0, 0.9, 2.2); // skull
  addBox(head, 2.2, 1.9, 3.4, bodyMat, 0, 0.4, 5.4); // snout
  const jaw = addBox(head, 2, 0.9, 3, darkMat, 0, -0.75, 5.3);
  for (const sx of [-1, 1]) {
    addBox(head, 0.4, 0.5, 3, darkMat, sx * 1.1, -0.35, 6.7); // small lower fangs, purely decorative
    addBox(head, 0.55, 0.55, 0.4, eyeMat, sx * 1.55, 1.3, 3.6); // eyes
    addBox(head, 0.55, 2.6, 0.55, hornMat, sx * 1.1, 2.8, 0.6, -0.3, 0, sx * 0.35); // brow horns sweeping back
    addBox(head, 0.4, 2, 0.4, hornMat, sx * 1.6, 2.3, 1.6, -0.5, 0, sx * 0.5); // secondary smaller horn
  }

  const fireBreath = buildFireBreath();
  fireBreath.group.position.set(0, -0.05, 7.2); // just past the snout tip, between the jaws
  head.add(fireBreath.group);

  // Legs: hind legs are noticeably heavier (haunches) than the front legs, matching a typical
  // wyvern-ish stance where the back legs carry most of the weight. Each leg hangs straight down
  // from its hip attachment (torso-local y=0, since `torso` itself already carries the LEG_HEIGHT
  // offset from the ground) with upperLen+lowerLen+footThick summing to exactly LEG_HEIGHT so
  // every foot reaches the ground at world y=0 regardless of how the segments are proportioned.
  function buildLeg(upperW: number, upperLen: number, lowerW: number, lowerLen: number, footLen: number, footThick: number): THREE.Group {
    const leg = new THREE.Group();
    addBox(leg, upperW, upperLen, upperW, bodyMat, 0, -upperLen / 2, 0);
    addBox(leg, lowerW, lowerLen, lowerW, bodyMat, 0, -upperLen - lowerLen / 2, 0);
    const footY = -upperLen - lowerLen - footThick / 2;
    addBox(leg, lowerW * 1.15, footThick, footLen, darkMat, 0, footY, footLen * 0.2);
    for (const cx of [-1, 0, 1]) {
      addBox(leg, 0.4, 0.32, 1.1, darkMat, cx * lowerW * 0.35, footY - footThick * 0.3, footLen * 0.75, 0.4, 0, 0); // claws
    }
    return leg;
  }

  const frontLeg = () => buildLeg(2.1, 2.6, 1.7, 2.0, 3.2, 0.8);
  const hindLeg = () => buildLeg(3, 3.0, 2.4, 1.6, 3.8, 0.8);

  const frontL = frontLeg();
  frontL.position.set(-3.4, 0, 5.4);
  torso.add(frontL);
  const frontR = frontLeg();
  frontR.position.set(3.4, 0, 5.4);
  torso.add(frontR);
  const hindL = hindLeg();
  hindL.position.set(-3.6, 0, -6.4);
  torso.add(hindL);
  const hindR = hindLeg();
  hindR.position.set(3.6, 0, -6.4);
  torso.add(hindR);

  // Tail: a long tapering chain drooping down and back from the hips, with a small spade tip.
  const tailPivot = new THREE.Group();
  tailPivot.position.set(0, 3.6, -8.6);
  torso.add(tailPivot);
  let tailCursor = new THREE.Group();
  tailPivot.add(tailCursor);
  const tailSegments = 7;
  for (let i = 0; i < tailSegments; i++) {
    const len = 3.2;
    const w = 2.6 - i * 0.32;
    addBox(tailCursor, w, w, len, bodyMat, 0, 0, -len / 2);
    if (i > 1) addBox(tailCursor, 0.35, w * 0.6, 0.7, hornMat, 0, w * 0.5, -len * 0.5, -0.4, 0, 0);
    const next = new THREE.Group();
    next.position.set(0, -len * 0.12, -len);
    next.rotation.x = 0.1;
    tailCursor.add(next);
    tailCursor = next;
  }
  addBox(tailCursor, 1.6, 0.3, 1.4, hornMat, 0, 0.5, -0.5, -0.5, 0, 0);
  addBox(tailCursor, 1.6, 0.3, 1.4, hornMat, 0, -0.5, -0.5, 0.5, 0, 0);

  // Wings: shoulder pivots mounted high on the chest, angled slightly up and back.
  const leftWing = buildWing(-1, boneMat, membraneMat);
  leftWing.pivot.position.set(-2.6, 7.2, 3);
  torso.add(leftWing.pivot);
  const rightWing = buildWing(1, boneMat, membraneMat);
  rightWing.pivot.position.set(2.6, 7.2, 3);
  torso.add(rightWing.pivot);

  return { group, leftWing, rightWing, tailPivot, neckPivot, jaw, fireBreath };
}

export class Dragon {
  readonly mesh: THREE.Group;
  position: Vec3;
  private yaw = 0;
  private bank = 0;

  private state: DragonState = "perched";
  private stateTime = 0;
  private restTimer = 8 + Math.random() * 20; // first launch comes fairly soon so the player doesn't have to wait long to see it fly
  private flapPhase = 0;
  private idlePhase = Math.random() * Math.PI * 2;

  private breathing = false;
  private breathElapsed = 0;
  private breathTimer = 3 + Math.random() * 5; // first breath comes soon after spawn
  private firePhase = 0;

  // True while the player has mounted it — see mount()/dismount() below.
  // While ridden, update() runs tickRidden's player-controlled movement
  // instead of the perched/launching/flying/landing state machine, which
  // stays frozen at whatever state it was in (dismount() resumes it
  // sensibly rather than wherever it happened to be paused).
  ridden = false;
  private rideSpeed = 0;

  private readonly parts: DragonMeshParts;
  private readonly perch: Vec3;
  private readonly mouthGround: Vec3;
  private readonly skyJoin: Vec3;
  // The landing arc's start point — normally this.skyJoin (see the
  // "flying" state below), but dismount() points it at wherever the
  // player actually left the dragon, so a landing flown after a ride
  // arcs back from there instead of teleporting to the sky-circle first.
  private landingStart: Vec3;

  constructor(caveFloorY: number, peakY: number) {
    this.parts = buildDragonMesh();
    this.mesh = this.parts.group;

    const daisTop = caveFloorY + 3;
    this.perch = { x: DRAGON_PERCH.x, y: daisTop, z: DRAGON_PERCH.z };
    this.mouthGround = { x: CAVE_MOUTH.x, y: caveFloorY + 2, z: CAVE_MOUTH.z };
    const flightAltitude = peakY + DRAGON_FLIGHT_ALTITUDE_ABOVE_PEAK;
    this.skyJoin = { x: MOUNTAIN_CENTER.x, y: flightAltitude, z: MOUNTAIN_CENTER.z + DRAGON_FLIGHT_RADIUS };
    this.landingStart = this.skyJoin;

    this.position = { ...this.perch };
    this.mesh.position.set(this.position.x, this.position.y, this.position.z);
  }

  /** Player mounts up — called by GameLoop once it's confirmed the player is within range. */
  mount(): void {
    this.ridden = true;
    this.rideSpeed = 0;
  }

  /** Player dismounts. Close to the dais already, it just settles there; otherwise it flies itself home via the normal landing arc, now starting from wherever it actually is instead of the sky-circle. */
  dismount(): void {
    this.ridden = false;
    const distFromPerch = Math.hypot(this.position.x - this.perch.x, this.position.y - this.perch.y, this.position.z - this.perch.z);
    if (distFromPerch < DISMOUNT_NEAR_PERCH_DIST) {
      this.state = "perched";
      this.stateTime = 0;
      this.restTimer = 20 + Math.random() * 40;
    } else {
      this.landingStart = { ...this.position };
      this.state = "landing";
      this.stateTime = 0;
    }
  }

  private tickRidden(dt: number, input: DragonRideInput): void {
    if (input.throttle !== 0) {
      this.rideSpeed += input.throttle * RIDE_ACCEL * dt;
    } else if (this.rideSpeed !== 0) {
      const decel = RIDE_FRICTION * dt;
      this.rideSpeed = Math.abs(this.rideSpeed) <= decel ? 0 : this.rideSpeed - Math.sign(this.rideSpeed) * decel;
    }
    this.rideSpeed = THREE.MathUtils.clamp(this.rideSpeed, -RIDE_REVERSE_MAX_SPEED, RIDE_MAX_SPEED);

    this.yaw -= input.steer * RIDE_TURN_RATE * dt;
    this.bank = THREE.MathUtils.clamp(-input.steer * RIDE_BANK_ANGLE, -RIDE_BANK_ANGLE, RIDE_BANK_ANGLE);

    this.position.x += Math.sin(this.yaw) * this.rideSpeed * dt;
    this.position.z += Math.cos(this.yaw) * this.rideSpeed * dt;
    this.position.y += input.climb * RIDE_CLIMB_SPEED * dt;
  }

  private circlePoint(theta: number, altitude: number): Vec3 {
    return {
      x: MOUNTAIN_CENTER.x + Math.sin(theta) * DRAGON_FLIGHT_RADIUS,
      y: altitude,
      z: MOUNTAIN_CENTER.z + Math.cos(theta) * DRAGON_FLIGHT_RADIUS,
    };
  }

  private facePoints(from: Vec3, to: Vec3): void {
    const dx = to.x - from.x;
    const dz = to.z - from.z;
    if (Math.hypot(dx, dz) < 1e-4) return;
    this.yaw = Math.atan2(dx, dz);
  }

  update(dt: number, rideInput?: DragonRideInput): void {
    this.idlePhase += dt;
    let wingOpenness = 0;

    if (this.ridden && rideInput) {
      this.tickRidden(dt, rideInput);
      // Keeps flapping even while slow/hovering under player control, not
      // fully folded the way idle-perched wings are.
      const speedFrac = Math.min(1, Math.abs(this.rideSpeed) / RIDE_MAX_SPEED);
      wingOpenness = 0.55 + speedFrac * 0.45;
    } else {
      this.stateTime += dt;
      if (this.state === "perched") {
        this.restTimer -= dt;
        this.position = { ...this.perch };
        this.bank = 0;
        // Slow idle sway — a faint breathing/settling motion rather than a dead statue.
        this.yaw = Math.PI + Math.sin(this.idlePhase * 0.15) * 0.25;
        wingOpenness = 0;
        if (this.restTimer <= 0) {
          this.state = "launching";
          this.stateTime = 0;
        }
      } else if (this.state === "launching") {
        const u = smoothstep(this.stateTime / LAUNCH_DURATION);
        const pos = bezier(this.perch, this.mouthGround, this.skyJoin, u);
        const posAhead = bezier(this.perch, this.mouthGround, this.skyJoin, Math.min(1, u + 0.01));
        this.position = pos;
        this.facePoints(pos, posAhead);
        wingOpenness = smoothstep((u - 0.3) / 0.5);
        this.bank = 0;
        if (this.stateTime >= LAUNCH_DURATION) {
          this.state = "flying";
          this.stateTime = 0;
        }
      } else if (this.state === "flying") {
        const theta = (this.stateTime / LOOP_PERIOD) * Math.PI * 2;
        const bob = Math.sin(this.stateTime * 0.6) * 1.5;
        const pos = this.circlePoint(theta, this.skyJoin.y + bob);
        const posAhead = this.circlePoint(theta + 0.02, this.skyJoin.y + bob);
        this.position = pos;
        this.facePoints(pos, posAhead);
        this.bank = BANK_ANGLE;
        wingOpenness = 1;
        const loopsDone = this.stateTime / LOOP_PERIOD;
        const nearSouthPoint = Math.abs(((theta % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2)) < 0.12;
        if (this.stateTime >= FLY_MIN_DURATION && loopsDone >= 1 && nearSouthPoint) {
          this.landingStart = { ...this.position };
          this.state = "landing";
          this.stateTime = 0;
        }
      } else {
        // landing
        const u = smoothstep(this.stateTime / LANDING_DURATION);
        const pos = bezier(this.landingStart, this.mouthGround, this.perch, u);
        const posAhead = bezier(this.landingStart, this.mouthGround, this.perch, Math.min(1, u + 0.01));
        this.position = pos;
        this.facePoints(pos, posAhead);
        wingOpenness = 1 - smoothstep((u - 0.5) / 0.45);
        this.bank = 0;
        if (this.stateTime >= LANDING_DURATION) {
          this.state = "perched";
          this.stateTime = 0;
          this.restTimer = 30 + Math.random() * 60;
        }
      }
    }

    this.flapPhase += dt * FLAP_SPEED * (0.3 + wingOpenness * 0.7);
    const flap = Math.sin(this.flapPhase) * FLAP_AMPLITUDE * wingOpenness;
    const foldAngle = lerp(Math.PI * 0.42, 0, wingOpenness); // folded flat against the body when resting, spread flat when flying
    this.parts.leftWing.pivot.rotation.z = -foldAngle - flap;
    this.parts.leftWing.pivot.rotation.y = lerp(0.5, 0, wingOpenness);
    this.parts.rightWing.pivot.rotation.z = foldAngle + flap;
    this.parts.rightWing.pivot.rotation.y = lerp(-0.5, 0, wingOpenness);

    this.parts.tailPivot.rotation.y = Math.sin(this.idlePhase * 0.5) * 0.18 * (1 - wingOpenness * 0.5) + this.bank * -0.6;
    this.parts.neckPivot.rotation.y = Math.sin(this.idlePhase * 0.35) * 0.12;
    this.parts.neckPivot.rotation.x = wingOpenness > 0.5 ? 0.1 : Math.sin(this.idlePhase * 0.2) * 0.05;

    // Fire breath: while ridden, or while perched/actually flying on its
    // own — not mid launch/landing, where the dragon is transiting the
    // tunnel and a jet of flame would clip oddly through the cave walls.
    const canBreathe = this.ridden || this.state === "perched" || this.state === "flying";
    if (this.breathing) {
      this.breathElapsed += dt;
      if (this.breathElapsed >= BREATH_DURATION || !canBreathe) {
        this.breathing = false;
        this.breathTimer = BREATH_MIN_INTERVAL + Math.random() * (BREATH_MAX_INTERVAL - BREATH_MIN_INTERVAL);
      }
    } else if (canBreathe) {
      this.breathTimer -= dt;
      if (this.breathTimer <= 0) {
        this.breathing = true;
        this.breathElapsed = 0;
      }
    }
    this.updateFireBreath(dt);
    this.parts.jaw.rotation.x = this.breathing ? -0.2 * Math.min(1, this.breathElapsed / 0.2) : 0;

    this.mesh.position.set(this.position.x, this.position.y, this.position.z);
    this.mesh.rotation.set(0, this.yaw, this.bank);
  }

  private updateFireBreath(dt: number): void {
    const fire = this.parts.fireBreath;
    fire.group.visible = this.breathing;
    if (!this.breathing) {
      fire.light.intensity = 0;
      return;
    }
    this.firePhase += dt * 16;
    const flicker = 1 + Math.sin(this.firePhase) * 0.18 + Math.sin(this.firePhase * 2.6) * 0.1;
    // Quick fade in/out rather than an abrupt pop when the breath starts/ends.
    const fadeIn = Math.min(1, this.breathElapsed / 0.25);
    const fadeOut = Math.min(1, (BREATH_DURATION - this.breathElapsed) / 0.35);
    const envelope = Math.max(0, Math.min(fadeIn, fadeOut));
    fire.group.scale.set(flicker, flicker, envelope);
    fire.light.intensity = 7 * envelope;
  }

  dispose(): void {
    this.mesh.traverse((obj) => {
      if (obj instanceof THREE.Mesh) obj.geometry.dispose();
    });
  }
}
