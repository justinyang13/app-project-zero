# 09 — Logic & Automation ("Sparkwire" system)

SimCraft's automation layer is an original-named but mechanically
familiar signal-propagation system, giving Pillar 4 ("systems that
combine," see [00](00-vision-and-scope.md) §2) a concrete toy to build
with — doors, farms, traps, elevators, and small computational
contraptions, all from a small set of composable primitives.

## 1. Core model: signal strength

- Every logic block carries a **signal strength** from 0 (off) to 15
  (full power), stored per-block alongside its type (a parallel
  `Uint8Array` per chunk, same storage pattern as light levels — see
  [10 — Lighting & Rendering](10-lighting-rendering.md) §1, and in fact
  computed by a near-identical propagation/decay algorithm run on the
  20Hz simulation tick rather than every render frame).
- **Sparkwire** (the wire block) propagates signal strength from a
  powered source, decaying by 1 per block traveled, until it reaches 0 —
  identical mental model to the genre-standard redstone dust, renamed.
- A block is considered "powered" if its signal strength is ≥ 1;
  strength-sensitive components (see §3) read the exact 0–15 value rather
  than just on/off.

## 2. Component catalog

| Component | Behavior |
|---|---|
| Spark Emitter | Constant strength-15 source block, always on |
| Lever | Player-toggled on/off source, strength 15 when on |
| Button (wood/stone variants) | Momentary source, strength 15 for a short pulse then auto-off; stone variant has a shorter pulse than wood |
| Pressure Plate (wood/stone/weighted) | Sources strength while an entity stands on it; wood triggers for any entity, stone only for players/creatures (not dropped items), weighted variants (light/heavy) scale output strength with the number of entities on the plate |
| Sparkwire | Signal-carrying wire, decays 1 strength/block, visually brightens with strength for readability |
| Pulse Relay (repeater-analog) | Restores signal to strength 15 after a configurable 1–4 tick delay; also acts as a one-way signal diode (blocks backward flow) |
| Signal Gauge (comparator-analog) | Reads either the strength of the block behind it, or the "fullness" of an adjacent container (Storage Crate/Barrel/Chute fill level, mapped to 0–15) — outputs that value, or (in subtract mode) the difference between two side inputs |
| Sparklight Lamp | Lights up (light level 15) while powered, otherwise dark — the simplest visible output |
| Piston / Sticky Piston | Extends a 1-block pushing arm when powered (pushes up to 12 blocks in a line, stops at an unpushable block or the push limit); Sticky variant also retracts the block it's touching when unpowered |
| Dropper | Ejects one item from its internal slot into the world (or into a container it faces) when pulsed |
| Launcher (dispenser-analog) | Same trigger as Dropper, but performs the held item's "use" action facing outward — fires Flint Bolts, places Water/Lava from a held Bucket, ignites TNT-equivalent Powder Charge blocks, etc. |
| Chute (hopper-analog) | Slowly transfers items from a container/entity above it into a container below or in front of it, one item at a time per tick-interval; can be powered off to pause transfer |
| Rail / Powered Rail / Detector Rail | Track for the Rail Sled entity; Powered Rail accelerates or brakes a sled depending on power state, Detector Rail outputs signal strength while a sled sits on it |
| Chime Block | Plays a pitched tone (pitch selectable per-block, cycled by right-click) when pulsed — used for note-block-style music contraptions and audible alarms |
| Signal Drum (target-block analog) | Outputs a momentary pulse with strength proportional to how precisely a projectile (Flint Bolt) hits its center — a skill-based trigger for minigames/traps |
| Tripwire (string + hook) | A stretched line between two Tripwire Hooks that sources signal when any entity crosses it — a stealthier alternative to a Pressure Plate |
| Daylight Sensor | Outputs signal strength proportional to ambient sky light (usable to build sunrise/sunset-triggered contraptions), with an invert toggle |

## 3. Logic gates

Rather than requiring the player to derive NOT/AND/OR/XOR from raw
Sparkwire timing tricks alone (as the genre baseline effectively does),
SimCraft also ships four pre-built, single-block **Logic Gate** items
(craftable at the Workbench once the player has demonstrated the
underlying wiring — see the Survival unlock note below), each a compact
1-block component with 2 inputs (sides) and 1 output (front):

| Gate | Truth behavior |
|---|---|
| NOT Gate | Output = 15 when input is unpowered, 0 when input is powered (a manufactured, compact version of the classic "torch inverter" trick) |
| AND Gate | Output = 15 only when both inputs are powered |
| OR Gate | Output = 15 when either input is powered |
| XOR Gate | Output = 15 when exactly one input is powered |

Design rationale: the raw Sparkwire/component primitives remain fully
capable of building any of these from scratch (nothing is removed or
gatekept), but the pre-built Gate items exist so a builder who wants to
wire up, say, a 4-digit combination lock doesn't have to first rediscover
digital logic design from first principles — they can start from
readable boolean primitives and focus creative effort on the contraption,
not the gate. This is a deliberate, original accessibility improvement
over the genre baseline.

**Survival unlock:** raw Sparkwire/Spark Emitter/Lever/Button are
available from an early Workbench tier; Pulse Relay and Signal Gauge
require a Bronzecast-tier crafting unlock; the 4 Logic Gate items require
having crafted at least one working NOT-gate-equivalent from raw
components first (tracked as a quiet one-time achievement-style flag, see
[17](17-game-modes-progression.md) §2) — ensuring players meet the
underlying mechanic before the shortcut becomes available, rather than
skipping the learning moment entirely.

## 4. Mechanisms built from the above

Documented as worked examples (not separate blocks — every one of these
is assembled from §2/§3 components) since they're the payoff the whole
system exists for:

- **Automatic door:** Pressure Plate → Sparkwire → Door (doors accept
  direct power to open).
- **Elevator (original mechanic, no direct genre-baseline equivalent):**
  a vertical shaft lined with a new block type, **Lift Rail**, which a
  player holding a **Lift Baton** item can ascend/descend at a controlled
  speed while powered from the top or bottom — SimCraft's answer to
  vertical movement automation without needing water-elevator or
  piston-stacking workarounds.
- **Sorting system:** Chutes feeding into Signal-Gauge-gated Storage
  Crates, filtering by item type via a comparator-style side-input trick
  — an advanced, player-discovered technique the system supports but
  doesn't explicitly teach, intentionally (this is where genre mastery
  and creativity lives).
- **Crop farm auto-harvester:** Piston row triggered by a Daylight
  Sensor + Pulse Relay timer, breaking mature crops into a Chute-fed
  collection system.
- **Security trap:** Tripwire → Signal Drum/Launcher combination firing
  Flint Bolts at an intruder — flagged in design as intentionally weak
  (low damage) so traps are a fun toy, not a way to grief a
  single-player save against oneself in a frustrating way (there being no
  other player to trap makes this squarely a "cool contraption" feature,
  not a PvP one).

## 5. Powder Charge (explosive) blocks

- **Powder Charge Block** (TNT-analog): placeable, ignitable via fire
  contact, Launcher-fired ignition-flag item, or Spark-powered detonator
  variant. On detonation, destroys blocks in a radius (excluding
  Foundation Stone/unbreakable blocks) below a per-block blast-resistance
  threshold (soft blocks like Loam/Sand destroyed easily, Stone/Deepstone
  highly resistant, matching hardness-correlated blast resistance so
  players can build blast-proof bunkers meaningfully) and applies
  radius-falloff damage to nearby entities.
- Because griefing risk in a single-player game is really "accidentally
  blowing up my own build," detonation always has a short (1.5s) fuse
  with an audible ticking cue and a visual spark-trail once lit, giving
  the player a fair window to retreat — never an instant, surprise
  explosion from environmental triggers alone.

## 6. Tick scheduling & performance

Signal propagation runs on the 20Hz simulation tick (see
[01](01-tech-stack-architecture.md) §8), using a dirty-block queue (only
blocks whose signal state might have changed this tick are re-evaluated,
via a breadth-first propagation from the actual sources that changed —
never a full-world re-scan) so large builds with hundreds of Sparkwire
blocks don't scale linearly with total world size, only with the size of
the contraption actually changing state. See
[15 — Performance](15-performance.md) §6 for the specific budget this is
held to.
