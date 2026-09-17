// Player physics per spec/05-player-mechanics.md §1, §5: AABB-vs-voxel
// collision resolved axis-by-axis (X, then Z, then Y), fixed-tick gravity
// and jump, a simple instant-teleport step-up (a simplification of the
// spec's smooth 1-block auto-step), a Creative-style fly toggle (§1's
// "Fly (Creative Mode only)"), and basic swimming (liquid blocks are
// passable rather than solid, with slower movement and gentle buoyancy
// instead of gravity while submerged). Sneak/climb/fall-damage/stamina
// are still out of scope for this pass — see 07-survival-systems.md and
// 17-game-modes-progression.md for the systems this will plug into once
// gathered items, food, and Survival/Creative mode selection exist.
import type { World } from "./World";
import { isLiquid } from "../data/blocks";

export const PLAYER_WIDTH = 0.6;
export const PLAYER_HEIGHT = 1.8;
export const EYE_HEIGHT = 1.6;
const HALF_WIDTH = PLAYER_WIDTH / 2;

const WALK_SPEED = 4.3;
const SPRINT_SPEED = 5.6;
const FLY_SPEED = 10.8;
const SWIM_SPEED = 2.6; // water resists movement — slower than even a walk
const SWIM_VERTICAL_SPEED = 3.0; // deliberate rise/dive while holding flyUp/flyDown in water
// Buoyancy, not gravity — much weaker downward pull, clamped to a slow
// drift in either direction, so treading water (no vertical input) sinks
// gently instead of free-falling or hanging perfectly still.
const SWIM_GRAVITY = 4;
const SWIM_DRIFT_TERMINAL = 1.2;
// Derived from spec's jump height (1.25 blocks) + airtime (~0.6s) via
// h = v0^2/(2g), airtime = 2*v0/g — see engine/Player.ts commit notes.
const GRAVITY = 27.8;
const JUMP_VELOCITY = 8.33;
const FALL_TERMINAL = 15; // < 1 block/tick at 20Hz, so per-tick collision can't tunnel through a 1-thick floor

export interface PlayerInput {
  forward: number; // -1..1
  right: number; // -1..1
  jump: boolean;
  sprint: boolean;
  flyUp: boolean;
  flyDown: boolean;
}

export class Player {
  position = { x: 0, y: 96, z: 0 }; // feet position
  velocity = { x: 0, y: 0, z: 0 };
  onGround = false;
  flying = false;
  swimming = false;

  private intersectsSolid(world: World, x: number, y: number, z: number): boolean {
    const minX = Math.floor(x - HALF_WIDTH);
    const maxX = Math.floor(x + HALF_WIDTH);
    const minY = Math.floor(y);
    const maxY = Math.floor(y + PLAYER_HEIGHT - 0.001);
    const minZ = Math.floor(z - HALF_WIDTH);
    const maxZ = Math.floor(z + HALF_WIDTH);

    for (let bx = minX; bx <= maxX; bx++) {
      for (let by = minY; by <= maxY; by++) {
        for (let bz = minZ; bz <= maxZ; bz++) {
          const id = world.getBlock(bx, by, bz);
          // Liquids are swum through, not walked into like a wall — see
          // isInLiquid below for the swim-state check itself.
          if (id !== 0 && !isLiquid(id)) return true;
        }
      }
    }
    return false;
  }

  private isInLiquid(world: World, x: number, y: number, z: number): boolean {
    const minX = Math.floor(x - HALF_WIDTH);
    const maxX = Math.floor(x + HALF_WIDTH);
    const minY = Math.floor(y);
    const maxY = Math.floor(y + PLAYER_HEIGHT - 0.001);
    const minZ = Math.floor(z - HALF_WIDTH);
    const maxZ = Math.floor(z + HALF_WIDTH);

    for (let bx = minX; bx <= maxX; bx++) {
      for (let by = minY; by <= maxY; by++) {
        for (let bz = minZ; bz <= maxZ; bz++) {
          if (isLiquid(world.getBlock(bx, by, bz))) return true;
        }
      }
    }
    return false;
  }

  /**
   * One fixed-timestep physics update. `forwardVec` is the camera's full
   * look direction (pitch included) — while flying, moving "forward"
   * follows wherever you're actually looking (look down, you dive; look
   * up, you climb), matching walking's ground-relative feel otherwise.
   * `rightVec` stays yaw-only in both modes — strafing doesn't tilt.
   */
  tick(
    dt: number,
    world: World,
    input: PlayerInput,
    forwardVec: { x: number; y: number; z: number },
    rightVec: { x: number; z: number },
  ): void {
    // Safety net: if the player is ever found embedded in solid terrain
    // (a corrupted/stale save, or a future bug elsewhere), the normal
    // per-axis collision resolver below can't help — it only prevents
    // moving *into* a collision, and every candidate position while
    // embedded still collides, discrete-per-tick, effectively trapping
    // them. Push straight up out of it before anything else this tick.
    let unstickGuard = 0;
    while (this.intersectsSolid(world, this.position.x, this.position.y, this.position.z) && unstickGuard < 64) {
      this.position.y += 1;
      unstickGuard++;
    }

    // Flying takes priority over swimming (Creative flight through a lake
    // shouldn't downgrade to swim speed/buoyancy).
    this.swimming = !this.flying && this.isInLiquid(world, this.position.x, this.position.y, this.position.z);
    const swimming = this.swimming;

    const speed = this.flying ? FLY_SPEED : swimming ? SWIM_SPEED : input.sprint ? SPRINT_SPEED : WALK_SPEED;
    let wishX = forwardVec.x * input.forward + rightVec.x * input.right;
    let wishZ = forwardVec.z * input.forward + rightVec.z * input.right;
    let wishY = 0;

    if (this.flying) {
      // Full 3D normalize here (forward's pitch component included) so
      // looking straight down and holding forward dives at full speed
      // instead of adding an extra vertical burst on top of level flight.
      wishY = forwardVec.y * input.forward;
      const len = Math.hypot(wishX, wishY, wishZ);
      if (len > 0) {
        wishX /= len;
        wishY /= len;
        wishZ /= len;
      }
    } else {
      const len = Math.hypot(wishX, wishZ);
      if (len > 0) {
        wishX /= len;
        wishZ /= len;
      }
    }

    this.velocity.x = wishX * speed;
    this.velocity.z = wishZ * speed;

    if (this.flying) {
      // Space/Shift still give pure vertical control on top of whatever
      // looking up/down already contributes — handy for climbing/
      // descending straight while looking level.
      this.velocity.y = wishY * speed + ((input.flyUp ? 1 : 0) - (input.flyDown ? 1 : 0)) * FLY_SPEED;
    } else if (swimming) {
      // Reuses flying's Space/Shift vertical keys as swim up/dive down —
      // holding neither drifts gently instead of free-falling (gravity)
      // or hanging motionless.
      const vertical = (input.flyUp ? 1 : 0) - (input.flyDown ? 1 : 0);
      if (vertical !== 0) {
        this.velocity.y = vertical * SWIM_VERTICAL_SPEED;
      } else {
        this.velocity.y -= SWIM_GRAVITY * dt;
        if (this.velocity.y < -SWIM_DRIFT_TERMINAL) this.velocity.y = -SWIM_DRIFT_TERMINAL;
        if (this.velocity.y > SWIM_DRIFT_TERMINAL) this.velocity.y = SWIM_DRIFT_TERMINAL;
      }
    } else {
      if (this.onGround && input.jump) {
        this.velocity.y = JUMP_VELOCITY;
      } else {
        this.velocity.y -= GRAVITY * dt;
        if (this.velocity.y < -FALL_TERMINAL) this.velocity.y = -FALL_TERMINAL;
      }
    }

    // X axis, with a simple step-up onto 1-block ledges while grounded.
    const nx = this.position.x + this.velocity.x * dt;
    if (this.intersectsSolid(world, nx, this.position.y, this.position.z)) {
      if (this.onGround && !this.intersectsSolid(world, nx, this.position.y + 1, this.position.z)) {
        this.position.y += 1;
      } else {
        this.velocity.x = 0;
      }
    }
    if (!this.intersectsSolid(world, nx, this.position.y, this.position.z)) this.position.x = nx;

    // Z axis, same pattern.
    const nz = this.position.z + this.velocity.z * dt;
    if (this.intersectsSolid(world, this.position.x, this.position.y, nz)) {
      if (this.onGround && !this.intersectsSolid(world, this.position.x, this.position.y + 1, nz)) {
        this.position.y += 1;
      } else {
        this.velocity.z = 0;
      }
    }
    if (!this.intersectsSolid(world, this.position.x, this.position.y, nz)) this.position.z = nz;

    // Y axis.
    let ny = this.position.y + this.velocity.y * dt;
    if (this.intersectsSolid(world, this.position.x, ny, this.position.z)) {
      if (this.velocity.y < 0) {
        ny = Math.floor(ny) + 1;
        this.onGround = true;
      } else if (this.velocity.y > 0) {
        ny = Math.floor(ny + PLAYER_HEIGHT) - PLAYER_HEIGHT;
      }
      this.velocity.y = 0;
    } else {
      this.onGround = false;
    }
    this.position.y = ny;
  }
}
