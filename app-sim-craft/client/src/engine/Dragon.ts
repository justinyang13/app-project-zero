// The giant landmark dragons — not part of the ambient Creature.ts roster
// (species table, wander AI, ground-snapping — see that file's own notes
// on scope). There are two, sharing everything but a DragonConfig: the
// original lives in the cave carved into worldgen/mountain.ts's mountain,
// resting on the chamber's dais and periodically launching out through
// the cave mouth to circle the peak; the crimson one roosts on a platform
// at the summit and circles wider and higher, the other way round.
// Position/orientation are driven by a small explicit state machine keyed
// on elapsed time within the current state, not a physics or pathfinding
// system — good enough for a scripted, decorative flight loop that always
// starts and ends at the same two anchored points (its perch and the
// waypoint its launch/landing arcs pass through).
import * as THREE from "three";
import type { World } from "./World";
import { findSurfaceY } from "./Creature";
import type { DismountSpot, Rideable, RideInput } from "./Rideable";
import {
  CAVE_MOUTH,
  DRAGON_FLIGHT_ALTITUDE_ABOVE_PEAK,
  DRAGON_FLIGHT_RADIUS,
  DRAGON_PERCH,
  MOUNTAIN_CENTER,
  SUMMIT_DRAGON_ALTITUDE_ABOVE_PEAK,
  SUMMIT_DRAGON_FLIGHT_RADIUS,
} from "./worldgen/mountain";
import { buildWing, getWingTexture, makeWingMaterial, type WingParts } from "./DragonWing";

type DragonState = "perched" | "launching" | "flying" | "landing";

interface DragonPalette {
  body: number;
  belly: number;
  dark: number;
  horn: number;
  wingBone: number;
  wingDark: number; // membrane at the veins/arm
  wingRed: number; // membrane toward the trailing edge
  eye: number;
  glowAccents: boolean; // red glowing scale plates, chest gem and tail fin
}

const BROWN_PALETTE: DragonPalette = {
  body: 0x2a1c12,
  belly: 0x4a3222,
  dark: 0x15100c,
  horn: 0x3a2a1c,
  wingBone: 0x4a2a1c,
  wingDark: 0x2a0606,
  wingRed: 0xc41818,
  eye: 0xd6ff4a,
  glowAccents: false,
};

const CRIMSON_PALETTE: DragonPalette = {
  body: 0x150a0b,
  belly: 0x4a0e10,
  dark: 0x0a0405,
  horn: 0x3a0c0e,
  wingBone: 0x2a0a0c,
  wingDark: 0x1a0203,
  wingRed: 0xe01418,
  eye: 0xffa63a,
  glowAccents: true,
};

/** Everything that differs between one dragon and the next: how it looks, where it lives, and the circuit it flies. */
export interface DragonConfig {
  name: string;
  palette: DragonPalette;
  perch: Vec3;
  perchYaw: number;
  waypoint: Vec3; // launch/landing arcs pass through here (the cave mouth, or above the summit)
  flightCenter: { x: number; z: number };
  flightRadius: number;
  flightAltitude: number;
  startTheta: number; // where on the circuit it joins/leaves
  direction: 1 | -1; // which way round
  firstLaunchDelay: number;
}

/** The two dragons of the mountain, built from the anchors getStructureAnchors reports. */
export function createDragons(caveFloorY: number, peakY: number): Dragon[] {
  return [
    new Dragon({
      name: "dragon",
      palette: BROWN_PALETTE,
      perch: { x: DRAGON_PERCH.x, y: caveFloorY + 3, z: DRAGON_PERCH.z },
      perchYaw: Math.PI,
      waypoint: { x: CAVE_MOUTH.x, y: caveFloorY + 2, z: CAVE_MOUTH.z },
      flightCenter: MOUNTAIN_CENTER,
      flightRadius: DRAGON_FLIGHT_RADIUS,
      flightAltitude: peakY + DRAGON_FLIGHT_ALTITUDE_ABOVE_PEAK,
      startTheta: 0,
      direction: 1,
      firstLaunchDelay: 8 + Math.random() * 20,
    }),
    new Dragon({
      name: "crimson dragon",
      palette: CRIMSON_PALETTE,
      perch: { x: MOUNTAIN_CENTER.x, y: peakY + 1, z: MOUNTAIN_CENTER.z },
      perchYaw: 0,
      waypoint: { x: MOUNTAIN_CENTER.x, y: peakY + 32, z: MOUNTAIN_CENTER.z + 18 },
      flightCenter: MOUNTAIN_CENTER,
      flightRadius: SUMMIT_DRAGON_FLIGHT_RADIUS,
      flightAltitude: peakY + SUMMIT_DRAGON_ALTITUDE_ABOVE_PEAK,
      startTheta: 0,
      direction: -1,
      firstLaunchDelay: 20 + Math.random() * 25,
    }),
  ];
}

const LEG_HEIGHT = 5.4; // ground clearance under the belly — everything else is built upward from here
// Its own flight is deliberately slower than the player's (Player.ts's
// FLY_SPEED is 10.8 blocks/sec) so a player who takes off after it can
// actually catch up and mount it. Launch and landing arcs are timed from
// their length at TRANSIT_SPEED rather than a fixed duration, so a long
// trip home (after being ridden far away) doesn't turn into a sprint —
// the smoothstep easing peaks at ~1.5x the average, still under the
// player's speed.
const DRAGON_TRANSIT_SPEED = 5; // blocks/sec average along a launch/landing arc
const DRAGON_CRUISE_SPEED = 5.5; // blocks/sec circling the mountain
const MIN_TRANSIT_DURATION = 6;
const FLY_MIN_DURATION = 45;
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

// Double-tap Space while riding toggles turbo: 400x the normal top speed
// and acceleration (and coast-down friction, so letting go of W still
// stops it in about a second instead of coasting for minutes).
const TURBO_MULTIPLIER = 400;

// Riding camera: high and far enough back that the raised neck/head and
// the spread wings sit below the line of sight instead of filling it.
const RIDE_EYE_HEIGHT = 16;
const RIDE_CAMERA_DISTANCE = 26;

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
  neckSegments: THREE.Group[]; // each one's rotation.x is one link of the neck's curve
  head: THREE.Group;
  legs: DragonLeg[];
  // Materials for the neck and head only (clones, not the torso's), so they
  // can be faded out while the player rides without the body going see-through.
  fadeMats: THREE.Material[];
}

interface DragonLeg {
  root: THREE.Group; // hip
  knee: THREE.Group;
  front: boolean;
  side: number; // -1 left, +1 right
}

function buildDragonMesh(palette: DragonPalette): DragonMeshParts {
  const group = new THREE.Group();

  const bodyMat = new THREE.MeshLambertMaterial({ color: palette.body });
  const bellyMat = new THREE.MeshLambertMaterial({ color: palette.belly });
  const darkMat = new THREE.MeshLambertMaterial({ color: palette.dark });
  const hornMat = new THREE.MeshLambertMaterial({ color: palette.horn });
  const boneMat = new THREE.MeshLambertMaterial({ color: palette.wingBone });
  const membraneMat = makeWingMaterial(getWingTexture(palette.wingDark, palette.wingRed));
  const eyeMat = new THREE.MeshBasicMaterial({ color: palette.eye });
  const neckBodyMat = bodyMat.clone();
  const neckHornMat = hornMat.clone();
  const headBodyMat = bodyMat.clone();
  const headDarkMat = darkMat.clone();
  const headHornMat = hornMat.clone();
  const fadeMats: THREE.Material[] = [neckBodyMat, neckHornMat, headBodyMat, headDarkMat, headHornMat, eyeMat];

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
  const neckSegmentCount = 4;
  const neckSegments: THREE.Group[] = [];
  for (let i = 0; i < neckSegmentCount; i++) {
    const len = 3.4;
    const w = 3.2 - i * 0.4;
    addBox(neckCursor, w, w, len, neckBodyMat, 0, len * 0.18, len / 2);
    addBox(neckCursor, 0.4, w * 0.5, 0.8, neckHornMat, 0, w * 0.55, len * 0.6, 0.4, 0, 0); // small neck spike
    const next = new THREE.Group();
    next.position.set(0, len * 0.36, len);
    next.rotation.x = -0.22; // curve the neck upward segment by segment (animated per frame — see Dragon.animateNeck)
    neckCursor.add(next);
    neckSegments.push(next);
    neckCursor = next;
  }

  // Head, on the end of the neck chain.
  const head = new THREE.Group();
  neckCursor.add(head);
  addBox(head, 3.4, 3, 4.6, headBodyMat, 0, 0.9, 2.2); // skull
  addBox(head, 2.2, 1.9, 3.4, headBodyMat, 0, 0.4, 5.4); // snout
  const jaw = addBox(head, 2, 0.9, 3, headDarkMat, 0, -0.75, 5.3);
  for (const sx of [-1, 1]) {
    addBox(head, 0.4, 0.5, 3, headDarkMat, sx * 1.1, -0.35, 6.7); // small lower fangs, purely decorative
    addBox(head, 0.55, 0.55, 0.4, eyeMat, sx * 1.55, 1.3, 3.6); // eyes
    addBox(head, 0.55, 2.6, 0.55, headHornMat, sx * 1.1, 2.8, 0.6, -0.3, 0, sx * 0.35); // brow horns sweeping back
    addBox(head, 0.4, 2, 0.4, headHornMat, sx * 1.6, 2.3, 1.6, -0.5, 0, sx * 0.5); // secondary smaller horn
  }

  const fireBreath = buildFireBreath();
  fireBreath.group.position.set(0, -0.05, 7.2); // just past the snout tip, between the jaws
  head.add(fireBreath.group);

  // Legs: hind legs are noticeably heavier (haunches) than the front legs, matching a typical
  // wyvern-ish stance where the back legs carry most of the weight. Each leg hangs straight down
  // from its hip attachment (torso-local y=0, since `torso` itself already carries the LEG_HEIGHT
  // offset from the ground) with upperLen+lowerLen+footThick summing to exactly LEG_HEIGHT so
  // every foot reaches the ground at world y=0 regardless of how the segments are proportioned.
  function buildLeg(
    upperW: number,
    upperLen: number,
    lowerW: number,
    lowerLen: number,
    footLen: number,
    footThick: number,
    front: boolean,
    side: number,
  ): DragonLeg {
    const root = new THREE.Group();
    addBox(root, upperW, upperLen, upperW, bodyMat, 0, -upperLen / 2, 0);
    // The knee is its own pivot so the lower leg + foot can fold when the
    // legs tuck up in flight (see Dragon.animateLegs).
    const knee = new THREE.Group();
    knee.position.y = -upperLen;
    root.add(knee);
    addBox(knee, lowerW, lowerLen, lowerW, bodyMat, 0, -lowerLen / 2, 0);
    const footY = -lowerLen - footThick / 2;
    addBox(knee, lowerW * 1.15, footThick, footLen, darkMat, 0, footY, footLen * 0.2);
    for (const cx of [-1, 0, 1]) {
      addBox(knee, 0.4, 0.32, 1.1, darkMat, cx * lowerW * 0.35, footY - footThick * 0.3, footLen * 0.75, 0.4, 0, 0); // claws
    }
    return { root, knee, front, side };
  }

  const legs: DragonLeg[] = [
    buildLeg(2.1, 2.6, 1.7, 2.0, 3.2, 0.8, true, -1),
    buildLeg(2.1, 2.6, 1.7, 2.0, 3.2, 0.8, true, 1),
    buildLeg(3, 3.0, 2.4, 1.6, 3.8, 0.8, false, -1),
    buildLeg(3, 3.0, 2.4, 1.6, 3.8, 0.8, false, 1),
  ];
  legs[0].root.position.set(-3.4, 0, 5.4);
  legs[1].root.position.set(3.4, 0, 5.4);
  legs[2].root.position.set(-3.6, 0, -6.4);
  legs[3].root.position.set(3.6, 0, -6.4);
  for (const leg of legs) torso.add(leg.root);

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

  if (palette.glowAccents) {
    // Glowing red scale plates down the back, on the flanks and along the
    // tail, a burning gem on the chest, and a red fin at the tail tip —
    // unlit (MeshBasic) so they glow at night the way the wing membrane does.
    const glowA = new THREE.MeshBasicMaterial({ color: 0xd41818 });
    const glowB = new THREE.MeshBasicMaterial({ color: 0x8e0c10 });
    for (let i = 0; i < 6; i++) {
      addBox(torso, 0.9, 0.5, 1.5, i % 2 ? glowA : glowB, 0, 8.05 - i * 0.35, 7.2 - i * 2.6, 0.5, 0, 0);
    }
    for (let row = 0; row < 7; row++) {
      for (let lvl = 0; lvl < 3; lvl++) {
        for (const sx of [-1, 1]) {
          const mat = (row + lvl) % 2 ? glowA : glowB;
          const z = 6.2 - row * 2.0;
          const y = 2.2 + lvl * 1.9 + (row % 2) * 0.6;
          const halfWidth = z > 0 ? 3.78 : 3.18;
          addBox(torso, 0.16, 1.0, 1.0, mat, sx * halfWidth, y, z, Math.PI / 4, 0, 0);
        }
      }
    }
    addBox(torso, 1.7, 1.7, 0.4, glowA, 0, 4.6, 8.2, 0, 0, Math.PI / 4); // chest gem
    addBox(torso, 1.0, 1.0, 0.45, glowB, 0, 4.6, 8.25, 0, 0, Math.PI / 4);
    for (const rz of [-0.55, 0, 0.55]) addBox(tailCursor, 0.25, 2.8, 2.4, glowA, 0, 0, -1.6, 0, 0, rz); // tail fin
  }

  // Wings: shoulder pivots mounted high on the chest, angled slightly up and back.
  const leftWing = buildWing(-1, boneMat, membraneMat);
  leftWing.pivot.position.set(-2.6, 7.2, 3);
  torso.add(leftWing.pivot);
  const rightWing = buildWing(1, boneMat, membraneMat);
  rightWing.pivot.position.set(2.6, 7.2, 3);
  torso.add(rightWing.pivot);

  return { group, leftWing, rightWing, tailPivot, neckPivot, jaw, fireBreath, neckSegments, head, legs, fadeMats };
}

export class Dragon implements Rideable {
  readonly mesh: THREE.Group;
  position: Vec3;
  private yaw = 0;
  private bank = 0;

  private state: DragonState = "perched";
  private stateTime = 0;
  private restTimer = 0; // set from the config: the first launch comes fairly soon so the player doesn't have to wait long to see it fly
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
  turbo = false;
  private rideSpeed = 0;
  // 0 → 1 as the player mounts: drives the lowered neck and the faded
  // neck/head, eased so mounting doesn't snap the pose.
  private rideBlend = 0;

  readonly rideable = true;
  readonly rideName: string;
  readonly mountRange = 14; // generous — it's huge and often airborne, unlike a parked car
  readonly rideEyeHeight = RIDE_EYE_HEIGHT;
  readonly rideCameraDistance = RIDE_CAMERA_DISTANCE;
  get rideYaw(): number {
    return this.yaw;
  }

  private readonly parts: DragonMeshParts;
  private readonly config: DragonConfig;
  private readonly loopPeriod: number; // seconds per full circuit of the mountain while flying
  private readonly perch: Vec3;
  private readonly mouthGround: Vec3;
  private readonly skyJoin: Vec3;
  // The landing arc's start point — normally this.skyJoin (see the
  // "flying" state below), but dismount() points it at wherever the
  // player actually left the dragon, so a landing flown after a ride
  // arcs back from there instead of teleporting to the sky-circle first.
  private landingStart: Vec3;
  private launchDuration = MIN_TRANSIT_DURATION;
  private landingDuration = MIN_TRANSIT_DURATION;

  constructor(config: DragonConfig) {
    this.config = config;
    this.rideName = config.name;
    this.parts = buildDragonMesh(config.palette);
    this.mesh = this.parts.group;

    this.perch = { ...config.perch };
    this.mouthGround = { ...config.waypoint };
    this.loopPeriod = (2 * Math.PI * config.flightRadius) / DRAGON_CRUISE_SPEED;
    this.skyJoin = this.circlePoint(config.startTheta, config.flightAltitude);
    this.landingStart = this.skyJoin;
    this.launchDuration = this.transitDuration(this.perch, this.skyJoin);
    this.restTimer = config.firstLaunchDelay;

    this.position = { ...this.perch };
    this.mesh.position.set(this.position.x, this.position.y, this.position.z);
  }

  /** Player mounts up — called by GameLoop once it's confirmed the player is within range. */
  mount(): void {
    this.ridden = true;
    this.turbo = false;
    this.rideSpeed = 0;
  }

  /** How long an arc through the cave mouth from `from` to `to` takes at the dragon's own (slower-than-the-player) transit speed. */
  private transitDuration(from: Vec3, to: Vec3): number {
    const d = (a: Vec3, b: Vec3): number => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
    return Math.max(MIN_TRANSIT_DURATION, (d(from, this.mouthGround) + d(this.mouthGround, to)) / DRAGON_TRANSIT_SPEED);
  }

  /** Starts a landing from wherever it is right now — the end of a normal flight, or where a rider dismounted. */
  private beginLanding(): void {
    this.landingStart = { ...this.position };
    this.landingDuration = this.transitDuration(this.landingStart, this.perch);
    this.state = "landing";
    this.stateTime = 0;
  }

  /** Double-tap Space while riding (see GameLoop's Space handler). */
  toggleTurbo(): void {
    if (this.ridden) this.turbo = !this.turbo;
  }

  /** Player dismounts. Close to the dais already, it just settles there; otherwise it flies itself home via the normal landing arc, now starting from wherever it actually is instead of the sky-circle. Returns where to put the player. */
  dismount(world: World): DismountSpot {
    // Beside the dragon, on the ground if it's close enough to safely step
    // down to — but dismounted mid-flight there's no ground under it at
    // all, so the player is left flying in place rather than dropped.
    const exitX = this.position.x + Math.sin(this.yaw + Math.PI / 2) * 4;
    const exitZ = this.position.z + Math.cos(this.yaw + Math.PI / 2) * 4;
    const groundY = findSurfaceY(world, exitX, exitZ);
    const spot: DismountSpot =
      groundY !== null && this.position.y - groundY < 20
        ? { x: exitX, y: groundY, z: exitZ, flying: false }
        : { x: exitX, y: this.position.y, z: exitZ, flying: true };

    this.ridden = false;
    this.turbo = false;
    const distFromPerch = Math.hypot(this.position.x - this.perch.x, this.position.y - this.perch.y, this.position.z - this.perch.z);
    if (distFromPerch < DISMOUNT_NEAR_PERCH_DIST) {
      this.state = "perched";
      this.stateTime = 0;
      this.restTimer = 20 + Math.random() * 40;
    } else {
      this.beginLanding();
    }
    return spot;
  }

  tickRide(dt: number, _world: World, input: RideInput): void {
    this.update(dt, input);
  }

  private tickRidden(dt: number, input: RideInput): void {
    const boost = this.turbo ? TURBO_MULTIPLIER : 1;
    if (input.throttle !== 0) {
      this.rideSpeed += input.throttle * RIDE_ACCEL * boost * dt;
    } else if (this.rideSpeed !== 0) {
      const decel = RIDE_FRICTION * boost * dt;
      this.rideSpeed = Math.abs(this.rideSpeed) <= decel ? 0 : this.rideSpeed - Math.sign(this.rideSpeed) * decel;
    }
    this.rideSpeed = THREE.MathUtils.clamp(this.rideSpeed, -RIDE_REVERSE_MAX_SPEED, RIDE_MAX_SPEED * boost);

    this.yaw -= input.steer * RIDE_TURN_RATE * dt;
    this.bank = THREE.MathUtils.clamp(-input.steer * RIDE_BANK_ANGLE, -RIDE_BANK_ANGLE, RIDE_BANK_ANGLE);

    this.position.x += Math.sin(this.yaw) * this.rideSpeed * dt;
    this.position.z += Math.cos(this.yaw) * this.rideSpeed * dt;
    this.position.y += input.climb * RIDE_CLIMB_SPEED * dt;
  }

  private circlePoint(theta: number, altitude: number): Vec3 {
    return {
      x: this.config.flightCenter.x + Math.sin(theta) * this.config.flightRadius,
      y: altitude,
      z: this.config.flightCenter.z + Math.cos(theta) * this.config.flightRadius,
    };
  }

  private facePoints(from: Vec3, to: Vec3): void {
    const dx = to.x - from.x;
    const dz = to.z - from.z;
    if (Math.hypot(dx, dz) < 1e-4) return;
    this.yaw = Math.atan2(dx, dz);
  }

  update(dt: number, rideInput?: RideInput): void {
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
        this.yaw = this.config.perchYaw + Math.sin(this.idlePhase * 0.15) * 0.25;
        wingOpenness = 0;
        if (this.restTimer <= 0) {
          this.state = "launching";
          this.stateTime = 0;
        }
      } else if (this.state === "launching") {
        const u = smoothstep(this.stateTime / this.launchDuration);
        const pos = bezier(this.perch, this.mouthGround, this.skyJoin, u);
        const posAhead = bezier(this.perch, this.mouthGround, this.skyJoin, Math.min(1, u + 0.01));
        this.position = pos;
        this.facePoints(pos, posAhead);
        wingOpenness = smoothstep((u - 0.3) / 0.5);
        this.bank = 0;
        if (this.stateTime >= this.launchDuration) {
          this.state = "flying";
          this.stateTime = 0;
        }
      } else if (this.state === "flying") {
        const dir = this.config.direction;
        const phase = (this.stateTime / this.loopPeriod) * Math.PI * 2; // how far round the circuit, direction-independent
        const theta = this.config.startTheta + dir * phase;
        const bob = Math.sin(this.stateTime * 0.6) * 1.5;
        const pos = this.circlePoint(theta, this.skyJoin.y + bob);
        const posAhead = this.circlePoint(theta + dir * 0.02, this.skyJoin.y + bob);
        this.position = pos;
        this.facePoints(pos, posAhead);
        this.bank = BANK_ANGLE * dir;
        wingOpenness = 1;
        const loopsDone = this.stateTime / this.loopPeriod;
        const nearStartPoint = phase % (Math.PI * 2) < 0.12; // back around to where it joined the circuit
        if (this.stateTime >= FLY_MIN_DURATION && loopsDone >= 1 && nearStartPoint) {
          this.beginLanding();
        }
      } else {
        // landing
        const u = smoothstep(this.stateTime / this.landingDuration);
        const pos = bezier(this.landingStart, this.mouthGround, this.perch, u);
        const posAhead = bezier(this.landingStart, this.mouthGround, this.perch, Math.min(1, u + 0.01));
        this.position = pos;
        this.facePoints(pos, posAhead);
        wingOpenness = 1 - smoothstep((u - 0.5) / 0.45);
        this.bank = 0;
        if (this.stateTime >= this.landingDuration) {
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
    // Folded, the wings also draw in along their span instead of standing up at full size.
    const span = lerp(0.4, 1, wingOpenness);
    this.parts.leftWing.pivot.scale.x = span;
    this.parts.rightWing.pivot.scale.x = span;
    this.parts.rightWing.pivot.rotation.z = foldAngle + flap;
    this.parts.rightWing.pivot.rotation.y = lerp(-0.5, 0, wingOpenness);

    this.parts.tailPivot.rotation.y = Math.sin(this.idlePhase * 0.5) * 0.18 * (1 - wingOpenness * 0.5) + this.bank * -0.6;
    this.rideBlend += ((this.ridden ? 1 : 0) - this.rideBlend) * Math.min(1, dt * 4);
    const flyBlend = smoothstep((wingOpenness - 0.15) / 0.6); // 0 perched -> 1 airborne
    this.animateLegs(flyBlend);
    this.animateNeckAndHead(flyBlend);

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

  /** Standing legs settle with a faint weight shift; in the air they fold up — front paws tucked under the chest, hind legs trailing back — and pump gently with the wingbeat. */
  private animateLegs(flyBlend: number): void {
    for (const leg of this.parts.legs) {
      const tuckRoot = leg.front ? -0.25 : 0.55;
      const tuckKnee = leg.front ? 1.35 : 0.95;
      const pump = Math.sin(this.flapPhase - (leg.front ? 0 : 0.9) + leg.side * 0.3) * 0.12 * flyBlend;
      const idle = Math.sin(this.idlePhase * 0.6 + leg.side * 1.7 + (leg.front ? 0 : 1)) * 0.03 * (1 - flyBlend);
      leg.root.rotation.x = lerp(idle, tuckRoot + pump, flyBlend);
      leg.knee.rotation.x = lerp(0, tuckKnee + pump * 1.5, flyBlend);
    }
  }

  /**
   * The neck ripples with a wave that travels down it from the shoulders
   * (stronger in flight, tied to the wingbeat) and the head counter-bobs
   * and looks around — idly when perched, less so airborne. Breathing
   * fire rears the head up. While ridden the neck drops forward-and-down
   * and the head levels out, and neck/head fade to mostly see-through so
   * they can't fill the rider's view (see rideBlend).
   */
  private animateNeckAndHead(flyBlend: number): void {
    const breathEnv = this.breathing ? Math.min(1, this.breathElapsed / 0.3, (BREATH_DURATION - this.breathElapsed) / 0.4) : 0;
    const rideBlend = this.rideBlend;
    const segs = this.parts.neckSegments;
    const baseCurve = lerp(lerp(-0.22, -0.12, flyBlend), 0.2, rideBlend); // negative curls up, positive droops
    for (let i = 0; i < segs.length; i++) {
      const wave = Math.sin(this.flapPhase * 0.5 - i * 0.75) * 0.07 * (0.3 + flyBlend * 0.9);
      const idleWave = Math.sin(this.idlePhase * 0.5 - i * 0.6) * 0.03;
      segs[i].rotation.x = baseCurve + wave + idleWave - breathEnv * 0.1 * (1 - rideBlend);
      segs[i].rotation.y = Math.sin(this.idlePhase * 0.45 - i * 0.6) * 0.06 + Math.sin(this.flapPhase * 0.25 - i * 0.5) * 0.04 * flyBlend;
    }
    this.parts.neckPivot.rotation.y = Math.sin(this.idlePhase * 0.35) * 0.08;
    this.parts.neckPivot.rotation.x = Math.sin(this.idlePhase * 0.2) * 0.04 * (1 - flyBlend);

    const head = this.parts.head;
    head.rotation.x =
      Math.sin(this.flapPhase - 2.4) * 0.09 * (0.3 + flyBlend) - breathEnv * 0.2 - rideBlend * 0.55;
    head.rotation.y = Math.sin(this.idlePhase * 0.3) * 0.4 * (1 - flyBlend) + Math.sin(this.idlePhase * 0.9) * 0.05;
    head.rotation.z = Math.sin(this.idlePhase * 0.23) * 0.08;

    const opacity = lerp(1, 0.16, rideBlend);
    for (const mat of this.parts.fadeMats) {
      const transparent = opacity < 0.999;
      if (mat.opacity !== opacity) mat.opacity = opacity;
      if (mat.transparent !== transparent) {
        mat.transparent = transparent;
        mat.needsUpdate = true;
      }
    }
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
