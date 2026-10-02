# NEON RUNNER — Game Specification (v1)

A single-level, ~5-minute, third-person 3D "parkour runner" in a Tron-inspired digital world, running in the
browser. Static site, no backend, no accounts, no persistence. Built with **Vite + TypeScript + three.js**.
Reference mood: neon-lit circuit corridors, glowing orange traces on dark floors, magenta/cyan neon grid walls,
a runner in a black suit with cyan light lines, wall-running along magenta grid walls, bloom everywhere.

**Audience of this document:** an autonomous coding agent (qwen3-coder) working milestone by milestone. Everything
needed is here. When something is ambiguous, pick the simplest option consistent with this spec, note it in
`STATE.md`, and keep going. Never ask questions.

---------------------------------------------------------------------------------------------------------------------

## 0. Hard rules

1. All code lives in `client/` (this folder's `client/`). Do not touch anything outside `app-tron-runner/`.
2. Stack is fixed: `three` (^0.180), TypeScript (strict), Vite, Vitest, oxlint. **No other runtime dependencies** (no React,
   no physics engine, no postprocessing library — use three's own `three/examples/jsm/...` modules, imported as
   `three/examples/jsm/postprocessing/EffectComposer.js` etc., or `three/addons/...` which also resolves).
3. Game logic (player physics, collision, level generation, scoring, boss, bot) is **pure TypeScript with no three.js or DOM
   imports** in `src/logic/`, so it is unit-testable in Node. Rendering and DOM live elsewhere.
4. Every milestone ends green: `npm run lint && npm test && npm run build` (run from `client/`). Never leave the build broken.
5. Write real code. No placeholders, no `TODO`, no stubs, no "implement later". Each source file < 400 lines; split if bigger.
6. Tests are part of the job: every `src/logic/*.ts` file has a `*.test.ts` next to it with meaningful assertions.
7. Assets already exist in `client/public/assets/` (see §9). Do NOT regenerate or download anything. Load them with
   URLs built from `import.meta.env.BASE_URL` (the site is deployed under a sub-path), e.g.
   `` `${import.meta.env.BASE_URL}assets/img/sky.jpg` ``.
8. Keep `STATE.md` (in this folder) updated at the end of every milestone: what is done, file map, deviations, known issues.
9. Performance budget: 60 fps on a 2021+ laptop GPU at 1080p. Fewer than 250 draw calls, fewer than 600k triangles. No
   per-frame object allocation in hot paths (reuse `Vector3` etc.). Use `InstancedMesh` for repeated obstacles/bits/towers.

---------------------------------------------------------------------------------------------------------------------

## 1. World, units, coordinates

- Units are metres. Right-handed three.js axes: **+X right, +Y up, the player runs toward −Z**. Distance travelled `dist` = −z.
- Fixed-timestep simulation at 120 Hz (`DT = 1/120`) with an accumulator; render once per animation frame with
  interpolation optional. Clamp frame delta to 0.1 s.
- Floor surface is at y = 0. Track has **3 lanes**: lane index −1, 0, +1 at x = −3, 0, +3 (lane width 3).
  Floor half-width 4.5 (floor spans x ∈ [−4.5, 4.5]).
- **Side walls** at x = ±4.5, height 16. Some wall stretches are **wall-run strips** (magenta grid glowing walls, §4.3).
  Elsewhere walls are dark panels with orange/teal light strips and cannot be run on.
- The level is **7800 m long**. Finish gate at z = −7800.

---------------------------------------------------------------------------------------------------------------------

## 2. Game flow and screens (DOM overlays above the canvas)

States: `title → countdown → playing ⇄ paused → (gameover | victory)`; `gameover/victory → countdown` on retry.

- **Title screen**: full-screen `title.jpg` background (cover, darkened), large glowing title "NEON RUNNER" (CSS text-shadow glow,
  letter-spaced, system font stack with `'Orbitron','Rajdhani','Eurostile','Segoe UI',sans-serif`), subtitle
  "Reach the portal. Stay derezzed-free.", blinking "PRESS ENTER TO START", a controls panel (§3). The 3D scene runs
  live and slowly orbits behind a translucent dark layer (attract mode). Music does not start until the first key press
  (browser autoplay rule).
- **Countdown**: 3-2-1-GO big centered numbers (1 s each, scale/fade animation), the camera does a short dolly-in. Input
  ignored except Esc.
- **Playing**: HUD (§7).
- **Paused** (Esc or P): dim overlay, "PAUSED", buttons text "Resume (Esc)", "Restart (R)". Simulation and music pause.
- **Game over** (integrity 0): glitch/derez effect (player shatters into cubes, 1.5 s), then panel "DEREZZED" with final score,
  distance reached as %, best combo, "PRESS R TO RETRY". There is no checkpointing in v1: retry restarts the level.
- **Victory** (cross finish gate): "GRID CLEARED", star rating (§6.4), stat table (score, bits collected, near misses,
  best multiplier, time, integrity left), "PRESS R TO PLAY AGAIN".
- Score is shown for the current run only. **No localStorage**, no saves.

---------------------------------------------------------------------------------------------------------------------

## 3. Controls (keyboard only)

| Action | Keys |
|---|---|
| Move left / right (lane change, or wall hop) | `A`/`←`, `D`/`→` |
| Jump (floor) / climb to upper wall row (wall-run) | `W`/`↑`/`Space` |
| Slide (floor) / drop to lower wall row (wall-run) | `S`/`↓`/`Shift` |
| Pause | `Esc` or `P` |
| Restart | `R` (on pause / game over / victory) |
| Mute music | `M` |
| Toggle graphics quality (High/Low) | `Q` |
| Start / confirm | `Enter` |

Input layer: `keydown` events produce **edge-triggered actions** (`left`, `right`, `jump`, `slide`) placed in a small
buffer (max 2 queued, each expires after 0.15 s) so quick taps are never lost. `preventDefault` on game keys
(Space/arrows) so the page never scrolls. Ignore `event.repeat`.

---------------------------------------------------------------------------------------------------------------------

## 4. Player mechanics (all in `src/logic/player.ts`, pure and deterministic)

### 4.1 Floor movement
- Auto-run forward at current `speed` (§5). The player cannot stop.
- **Lane change**: pressing left/right moves to the adjacent lane. Lateral motion is smooth: `x` approaches target lane x with
  a critically-damped/lerp style move taking **0.14 s**. Ignore a lane press if already moving in that direction's last
  lane (at lane ±1 with a wall-run strip beside: see §4.3, otherwise a small "bump" visual with no penalty).
- **Jump**: initial vertical velocity `v0 = 14`, gravity `g = 36` → airtime ≈ 0.78 s, apex ≈ 2.7 m. Only when grounded
  (allow 0.08 s coyote time and the 0.15 s input buffer). Pressing slide while airborne = fast-fall (sets vy = −22).
- **Slide**: lasts 0.6 s, collision box height drops from 1.8 m to 0.8 m. Cannot jump out of a slide until 0.2 s have
  elapsed; pressing jump after that cancels the slide into a jump.
- Collision box (AABB, centered on `x`, standing on `y`): width 0.9, depth 0.9, height 1.8 (0.8 sliding).

### 4.2 Hits, integrity, invulnerability
- Player has **3 integrity** (shown as pips). On any harmful collision: integrity −1, speed multiplier drops to 0.65 and
  recovers to 1.0 over 1.5 s, combo streak resets (multiplier back to 1), **2.0 s invulnerability** (model flickers, no
  further damage), strong camera shake + glitch post effect (§8.5).
- At integrity 0: game over.
- **Falling into a gap** (floor missing under the player while y ≤ −0.3 with no wall support): integrity −1 and the player
  is placed back on the floor at the first solid floor point after the gap in the center lane with 2 s invulnerability
  after a 0.8 s fade-out/fade-in (unless integrity is 0 → game over).
- **Repair pickups** (green plus-shaped glowing item) restore 1 integrity up to the max of 3. There are 5 in the level (§10).

### 4.3 Wall-run
- Wall-run strips exist only where the level data says so (`wallStrips`: list of `{ side: -1|1, z0, z1 }`). The wall's surface in these
  zones uses the magenta grid texture and glows.
- From lane ±1, pressing the direction **toward the strip's side** while inside a strip's z-range puts the player **on the wall**:
  state `wall`, side ±1. Transition takes 0.18 s (player rotates 90° around Z, travels from x = ±3 to x = ±4.2). The camera
  rolls toward the wall (§8.4).
- On the wall the player runs along the wall surface. The wall has **two rows**: `low` at height y = 1.6 and `high` at y = 4.8.
  Starts on `low`. `W/↑/Space` → `high`, `S/↓/Shift` → `low` (transition 0.15 s). Obstacles on walls occupy one row (§5.2).
- Pressing the direction **away from the wall** (or leaving the strip's z range) drops the player back to the adjacent floor
  lane (`±1`) with a short fall (0.3 s). If the floor below has a gap at that moment the normal fall rule applies.
- While on a wall: score trickle (§6) and the wall-run combo timer ticks; the floor is ignored, so **long gaps (§5.2 `longGap`)
  can only be crossed on the wall**.
- If the player is on the wall and the strip ends, they drop to the floor lane automatically.

### 4.4 Light-cycle segment
During section 5 ("Light Cycle Highway") the player rides a light cycle: same lane-change controls, jump becomes a small hop
(`v0 = 9`, airtime 0.5 s), slide is disabled (ignore key), wall-run disabled, speed higher, rival cycles act as moving
obstacles (§5.2). The transition is automatic at section boundaries with a 1 s flash/morph effect (model swap).

---------------------------------------------------------------------------------------------------------------------

## 5. Level (single, fixed, deterministic) — `src/logic/level.ts`, `patterns.ts`

### 5.1 Sections, speeds, music
`speed` is in m/s and is eased between sections over 40 m. Total ≈ 4.6–5 minutes without hits.

| # | Name | z range (distance m) | Speed | Music | Contents |
|---|---|---|---|---|---|
| 0 | BOOT SEQUENCE | 0 – 400 | 20 | run | Gentle intro. Only bits and 3 timed tutorial prompts (lane change at 40 m, jump at 150 m, slide at 260 m). 1 low barrier at 180 m, 1 high beam at 280 m. |
| 1 | CIRCUIT ALLEY | 400 – 1500 | 24 | run | Barriers, beams, blocks in all lanes, escalating. Bit trails following safe paths. 1 repair pickup. |
| 2 | WALL-RUN CANYON | 1500 – 2600 | 26 | run | Prompt "WALLRUN" at 1500. Alternating left/right wall strips (80–160 m long). Wall obstacles (low/high rows). One `longGap` (24 m) at 2200 that requires wall-run. 1 repair. |
| 3 | DATA CHASM | 2600 – 3700 | 28 | run (music switch to boss at 3700) | Floor gaps (6–10 m), boost pads, laser gates, patrolling disc drones, combos of jump+slide. 1 repair. |
| 4 | LIGHT CYCLE HIGHWAY | 3700 – 5000 | 36 | boss | Cycle mode. Rival cycles in lanes (moving obstacles), short gaps, ramps feel (hops), boost pads, dense bit arcs. 1 repair. |
| 5 | REINTEGRATION GAUNTLET | 5000 – 6700 | 30 | boss | Everything mixed: wall strips with obstacles, drones, lasers, gaps, barriers, beams. Fastest pattern density. 1 repair. |
| 6 | THE SENTINEL | 6700 – 7800 | 30 | boss | Boss encounter (§5.4) then finish gate at 7800. |

Music: `run.mp3` plays from the start through 3700 m, crossfades (2 s) to `boss.mp3` at 3700 m, continues to the end.
Loop either track if it ends before its section does.

### 5.2 Obstacle types (data model in `logic/level.ts`)
All obstacles have: `id`, `type`, `z` (distance start, positive metres), `lane` (−1/0/1, or `wall`+`side`+`row`), and type-specific
fields. All are generated at level-build time into a flat array sorted by `z`.

| type | geometry / rule | how to avoid |
|---|---|---|
| `barrier` | low neon bar, height 1.0, depth 0.6, spans one lane | jump, or change lane |
| `beam` | overhead bar, bottom at y = 1.1, thick 0.5, spans one lane or all three lanes | slide, or change lane (if one lane) |
| `block` | tall block 3 wide × 3 high × 1.2 deep in one lane | change lane |
| `gap` | floor missing for `len` m (4–10) across all lanes | jump (len ≤ 10 at speed ≤ 36 is always clearable) |
| `longGap` | floor missing for 24 m across all lanes, inside a wall strip of the same range plus 10 m margins both sides | wall-run |
| `wallBlock` | block on wall, spanning one row (`low`/`high`) for 6–10 m along the wall | switch row (or drop off wall) |
| `drone` | spinning glowing disc, radius 0.8, hovers at y = 0.9 and **patrols laterally** across the track x ∈ [−3, 3] with a sine, period 2.4 s, per-drone phase | time the crossing, or jump over (y top 1.7 — jumping at the right time clears) or lane-wait |
| `laser` | horizontal laser gate across all 3 lanes at y = 0.5 – 1.4 that toggles: on 1.2 s / off 1.2 s with phase; flicker warning during the last 0.3 s of the off phase | slide or jump through while it is off |
| `rival` (cycle mode) | rival light cycle moving at 60% of player speed in its lane, length 2.2 | change lane, or hop is NOT enough (it is tall); lane change only |
| `boost` | boost pad on floor in a lane (not harmful) | step on it: speed ×1.3 for 1.5 s, +500 × multiplier points |
| `bit` | data bit collectible (small yellow glowing octahedron), radius 0.35 | touch it |
| `core` | big golden collectible (boss section only), radius 0.6 | touch it |
| `repair` | green plus pickup | touch it |

Every obstacle row **must be survivable**: `logic/solvable.ts` provides `isLevelSolvable(level)` which simulates the player state
machine with a simple planner and returns `true` only if a collision-free path exists for the whole level. A unit test asserts
`isLevelSolvable(buildLevel())` is true and that deliberately-unsolvable synthetic levels return false.
A "safe path" always exists in every pattern (e.g. never fill all 3 lanes with a block row; never place a barrier row followed by
a beam row closer than 12 m on the same lane; keep ≥ 14 m between unrelated hazards in sections 0–2, ≥ 10 m later).

### 5.3 Patterns and RNG
`logic/patterns.ts` holds a hand-written library of **at least 24 named patterns** (each a function producing obstacles
relative to z = 0, with a declared `length`): e.g. `jumpOverCenter`, `slideLeftLane`, `slalom3`, `zigzagBlocks`, `jumpSlideCombo`,
`gapAndBits`, `wallHopLeft`, `wallLowHighSwap`, `droneCrossing`, `laserPair`, `boostArcBits`, `rivalWeave`, etc.
`logic/rng.ts`: `mulberry32(seed)` seeded RNG; the level uses seed **1337** so it is identical on every run. `buildLevel()`
composes each section from the pattern library using the section recipe table in `level.ts` (list of allowed patterns, min spacing,
density that rises through the section). Bits are laid as trails/arcs/lines along the path of safe actions (jump arcs go up in
the air above barriers; slide trails low). Target total ≈ 700–900 bits.

### 5.4 Boss: The Sentinel (z 6700–7800)
- A huge angular glowing black/red-orange "Sentinel" (primitives: tall tapered body, floating blades, a glowing eye) hovers
  ~70 m ahead of the player and drifts lane to lane. It is a visual + attack source; the player can't damage it.
- Attack cycle (pure logic in `logic/boss.ts`, deterministic): every 2.4 s (2.0 s in phase 2, 1.6 s in phase 3) it **telegraphs**
  one lane (or two in phase 3) for 1.0 s: the lane lights red with a rising whine, then fires a **plasma bolt** that travels down
  the lane toward the player (speed 70 m/s). Hit if the player is in that lane at impact and not airborne above 1.4 m.
  Phase 1: 6700–7050, phase 2: 7050–7400, phase 3: 7400–7700. Also standard barrier/beam patterns between attacks at low density.
- 3 **cores** (golden) are placed at 6900, 7250, 7600 in risky lanes: +5000 × multiplier each; collecting all three triggers a
  "SENTINEL OVERLOAD" banner and halves boss attack frequency for the last phase.
- At 7700 the boss is "shattered" by the player passing the final ramp: 2 s particle explosion, bloom flash. 7700–7800 is a
  victory run-in with bit shower, the finish gate (huge glowing portal ring, green light beam, as in the reference image's
  green beam in the distance) at 7800.

---------------------------------------------------------------------------------------------------------------------

## 6. Scoring — `src/logic/scoring.ts`

- **Multiplier** `mult` 1…15. Streak counts consecutive collected bits without taking a hit: every 8 bits `mult += 1`. A hit
  resets streak and mult to 1. Display the ring progress (streak mod 8 / 8) around the "×N" value in the HUD (top-right).
- Points:
  - Bit: `100 × mult`
  - Core: `5000 × mult`
  - Distance: `2 × mult` per metre travelled (accrued continuously)
  - Wall-run: `60 × mult` per second on the wall, plus a "Wallrun N" floating counter (N = seconds×10 accumulated points/10…
    simply show the running points of the current wall-run, as in the reference screenshot "Wallrun 43")
  - Near miss (passing within 0.5 m of a harmful obstacle's edge without hitting it, once per obstacle): `+250 × mult`, popup
  - Boost pad: `+500 × mult`
  - Perfect jump over a gap (cleared while y > 0.3 for the whole gap): `+300 × mult`
  - Victory bonus: `+10000 × integrity remaining` and `+ max(0, 120 − seconds) × 100` time bonus.
- **Target score**: shown under the score as "TARGET 250,000" (constant `TARGET_SCORE` in `config.ts`). A test uses a perfect-run
  simulator (`simulateIdealRun(level)` in `scoring.ts` or `solvable.ts`) that collects every bit and obeys the rules and asserts the
  ideal score is within 80%–130% of `TARGET_SCORE`; tune pattern density and constants so the assertion holds (tune
  `TARGET_SCORE` to ≈ 0.75 × the ideal score if needed, rounded to the nearest 5,000).
- **Stars** on victory: 1 star for finishing, 2 stars for score ≥ 70% of target, 3 stars for score ≥ target.

---------------------------------------------------------------------------------------------------------------------

## 7. HUD (DOM, `src/ui/Hud.ts` + `ui/styles.css`) — modelled on the reference screenshot

Neon HUD panels with angled/chamfered edges (CSS `clip-path`), thin cyan borders, dark translucent fill, glow.
- **Top-left**: current score in large digits with thousands separators (count-up animation), "TARGET 250,000" below in small
  dim caps, below that a thin progress bar showing level progress % with the current section name.
- **Top-right**: multiplier ring (SVG circle with stroke-dasharray progress, yellow `#ffe600`) with "×N" next to it.
  Pulses each time multiplier rises.
- **Top-center**: integrity as 3 chevron/bar pips (cyan = full, dark = lost); flash red on hit.
- **Right-middle contextual prompt** panel: a key-cap icon + action name + hint, e.g. "[→] WALLRUN — PRESS BUTTON" shown when a
  wall strip is within 25 m and the player is in the matching outer lane; "[SPACE] JUMP", "[S] SLIDE" for the tutorial prompts
  in section 0; "[A][D] CHANGE LANE".
- **Floating text popups** (bottom-center-left, like "Wallrun 43"): "+250 NEAR MISS", "BOOST +500", "WALLRUN 43", "MULTIPLIER ×4",
  "SENTINEL OVERLOAD". Float up, fade, max 4 visible.
- Bottom-right small: FPS (only if `?debug=1`), quality "HIGH/LOW", mute icon state.
- Resizes cleanly 1280×720 up to 2560×1440 and down to 900×600 (use `clamp()`/`vmin` units). Prefer text over images.
- **Section banners**: at each section start a large centered title banner "SECTION 2 — WALL-RUN CANYON" fades in/out over 2.5 s.

---------------------------------------------------------------------------------------------------------------------

## 8. Graphics ("amazing 3D") — highest priority after correctness

### 8.1 Renderer and post-processing (`src/render/Renderer.ts`, `postfx.ts`)
- `WebGLRenderer({ antialias: false, powerPreference: 'high-performance' })`, `outputColorSpace = SRGBColorSpace`,
  `toneMapping = ACESFilmicToneMapping` (exposure 1.1), pixel ratio `min(devicePixelRatio, 2)`.
- `EffectComposer` pipeline: `RenderPass` → `UnrealBloomPass` (strength 1.15, radius 0.6, threshold 0.15; half-res) →
  custom `ShaderPass` "NeonPost" (chromatic aberration scaled by speed (0.0006 → 0.0025) plus extra on hits, vignette,
  subtle scanlines, tiny film grain, optional glitch displacement uniform driven by hit effect) → `OutputPass`.
  Use FXAA or SMAA pass (`SMAAPass`) on High quality.
- **Quality manager**: `High` (all passes) / `Low` (no bloom resolution scale 0.5, no SMAA, pixel ratio 1, fewer particles).
  `Q` toggles. Auto-downgrade to Low if average fps < 40 for 3 consecutive seconds during play.

### 8.2 Environment (`src/render/Environment.ts`, `Track.ts`, `Skyline.ts`)
- Background/sky: large inverted sphere or `scene.background` using `sky.jpg` (neon city and grid horizon), slightly
  parallaxing (moves with the camera, rotates very slowly), tinted per section (palette table below).
- Fog: `FogExp2` dark indigo (`#05071a`), density ~0.012 so the track fades into a glowing haze at distance; section tint.
- **Floor**: dark metal with glowing orange circuit traces: `MeshStandardMaterial` with `floor.jpg` as `map` and `emissiveMap`
  (emissive color orange `#ff7a18`, intensity ~1.6), roughness 0.35, metalness 0.8, tiled so the texture repeats every 12 m along z
  and 9 m across; texture is scrolled with distance (or the floor is built in chunks that recycle). Cyan emissive **lane divider lines**
  (thin boxes, `#19f2ff`) between lanes, brighter edge rails at x = ±4.5. Subtle reflective sheen: use a cheap fake — an extra
  additive transparent plane with a gradient, or `envMap` from a generated cube/PMREM of the sky texture.
- **Gaps**: floor chunks omitted; below the gap draw a deep dark void with a glowing orange/magenta grid far below (y = −30) so
  falling looks dramatic; gap edges have bright orange edge strips.
- **Walls**: non-run stretches: dark panels with vertical orange/teal emissive light strips and pulsing tech detail
  (generated with `CanvasTexture` or geometry). Wall-run strips: `wall.jpg` magenta grid, emissive magenta `#ff2bd6` intensity 1.8,
  plus a bright pink floor-level rail. Walls rise 16 m then a ceiling opening to sky (no ceiling), with layered
  background towers.
- **Skyline / parallax**: two or three layers of instanced boxes (towers) on both sides beyond the walls (x ∈ ±[12, 90]),
  heights 20–140 m, dark bodies with emissive edge lines (use `EdgesGeometry`/`LineSegments` merged, or emissive thin boxes) in cyan,
  orange and magenta; they recycle as the player advances (pool). Occasional **light cars** (thin glowing streaks) flying by in the
  distance, and floating holographic rings/arches over the track every 60–90 m with slow-moving light.
- **Lighting**: `HemisphereLight` (dim blue/orange), one directional rim light cyan, `PointLight`s are expensive — max 3,
  attached to the player (cyan glow), moving with the camera. Most glow comes from emissive materials + bloom.
- **Beat pulse**: all emissive intensities on lane lines, rails, arches pulse by ~20% on every beat of the current music (BPM 120
  for `run`, 140 for `boss`, derived from the audio clock; fall back to a timer if audio is not playing).
- **Section palettes** (floor trace / wall accent / sky tint): 0 orange/cyan/blue; 1 orange/teal/blue; 2 magenta-led (walls
  magenta) with orange floor; 3 red-orange/violet (hot); 4 cyan/cyan (cold, blue-white); 5 orange+magenta+cyan mix, high contrast;
  6 deep red/orange with a bright green portal beam far ahead.

### 8.3 Player model and animation (`src/render/PlayerModel.ts`)
Built from primitives, ~0.9 m wide, 1.8 m tall: black glossy suit (`MeshStandardMaterial` metalness 0.9 roughness 0.25), head with a
slim helmet with a thin cyan visor line, torso, upper/lower arms, upper/lower legs, boots; **cyan emissive light lines** (thin
box strips/tubes) running down arms, legs, chest and a ring on the chest; **orange glowing identity disc** on the back (torus + disc).
Procedural animation (no external animation files), driven by player state:
- run cycle: legs/arms swing opposite, torso lean forward 12°, stride rate scales with speed;
- lane change: body roll ±15° toward the move;
- jump: tuck knees, arms up (rise), stretch (fall); land squash;
- slide: low crouch, one leg extended, ~70° back lean;
- wall-run: body rotated 90° onto the wall, legs mid-stride, arm toward wall extended;
- hit: brief white flash + flicker during invulnerability;
- death: split into ~60 emissive cubes that fly outward and fade (particle burst).
- Light-cycle mode: low-slung cycle (stretched capsule body, two torus wheels with emissive rims, canopy), rider in tuck; a glowing
  **light-wall trail** (vertical quad strip, 1.2 m tall, bright cyan/orange, additive) extends behind it for 40 m.
- A soft **trail ribbon** behind the runner (additive cyan strip fading over ~1.2 s) in normal mode too.

### 8.4 Camera (`src/render/CameraRig.ts`)
Chase camera behind and above: offset (0, 3.4, 7.5) looking at a point 6 m ahead of the player (y ≈ 1.3). Smooth follow
(exponential smoothing, x follows lane with a lag so the player is slightly off-center during lane changes). FOV 68° at base speed,
increasing to 86° with speed/boost. **Roll** up to 22° toward the wall during wall-run, ease 0.25 s. Slight vertical bob with the
run cycle (tiny), jump lifts camera partially, **shake** on hits (decay 0.5 s), landing thump. Lower camera (0, 2.6, 6) and wider FOV
in light-cycle mode. Attract-mode orbit on the title screen. Intro dolly during the countdown.

### 8.5 Effects (`src/render/Particles.ts`, `Trail.ts`)
- Bit pickup: burst of 12 small yellow sparks + a short expanding ring, "ping" sfx.
- Wall-run: continuous white/pink sparks flying off the wall under the feet; soft magenta glow on the wall near the player.
- Landing: ring shockwave + dust of cyan particles; slide: orange sparks from the floor.
- Boost: cyan speed lines (stretched additive quads) around the screen edge plus FOV punch and radial blur-ish effect via the
  post pass.
- Hit: glitch post effect (RGB split + horizontal slice displacement for 0.35 s), red vignette pulse, screen shake.
- Obstacles use emissive hot colors: barriers/beams orange-red `#ff4d1a`, blocks dark with red edge lines, lasers red `#ff1744`,
  drones red-orange with a spinning ring, rivals orange cycles with trails. Boost pads cyan chevrons that animate. Bits yellow
  `#ffd400`, cores gold, repair green `#2bff88`.
- Particle system: one `Points`/`InstancedMesh` pool per effect type, no per-frame allocations, capped at ~4000 live particles
  total on High, 1500 on Low.
- Finish: portal ring (big torus + inner swirling additive plane + green vertical light beam of 300 m) visible from far ahead
  starting from 6500 m (fog-exempt or additive).
- Section transitions: a quick horizontal "scan line" sweeping across the track and a banner (§7).

### 8.6 Streaming
The level is 7800 m, but only ~220 m ahead and ~40 m behind are instantiated at a time (chunk size 40 m). Chunks are
pooled/recycled. Obstacle meshes use `InstancedMesh` per type with fixed capacity (e.g. barriers 64, beams 64, blocks 48, bits 600,
drones 16, lasers 16, wallBlocks 32, boosts 16) and instance matrices are updated only on chunk change; moving obstacles
(drones, lasers, rivals) are animated through uniform/instance updates for visible ones only.

---------------------------------------------------------------------------------------------------------------------

## 9. Audio (`src/audio/`)

- **Music**: two files exist: `assets/audio/run.mp3` (150 s, 120 BPM, A minor synthwave) and `assets/audio/boss.mp3` (150 s,
  140 BPM, E minor, intense). Play with Web Audio (`AudioContext` + `MediaElementAudioSourceNode` or `decodeAudioData` +
  `AudioBufferSourceNode` with loop). Start on first user key press (title → Enter). Crossfade 2 s between tracks per §5.1.
  Music volume 0.55. Duck music to 0.3 for 0.5 s on hits. Pause/resume with game pause. `M` mutes. On game over: low-pass
  filter sweep and fade to 0.2. On victory: fade the boss track out and play a synthesized chime arpeggio.
- **SFX are procedural** (no files): `Sfx` class with Web Audio oscillators/noise buffers: bit ping (rising sine, pitch rising with
  streak), jump whoosh (filtered noise sweep), land thud, slide hiss, lane-change tick, wall-run hum (looped filtered noise while on
  wall), hit (distorted square + noise burst), boost (rising saw sweep), laser on/off buzz, boss telegraph whine, plasma bolt,
  repair chime, multiplier-up chime, countdown beeps, game-over descending tone, victory fanfare. Master gain 0.5.
- Expose `getBeat(): { bpm, phase, beatIndex }` using the audio clock and track start time for visual beat pulses.
- If audio cannot start (blocked), the game must still run normally.

---------------------------------------------------------------------------------------------------------------------

## 10. Level content details to guarantee a "feature-rich" five minutes

- Repair pickups at 900, 2000, 3200, 4400, 5800 m (lanes chosen safely).
- Boost pads: ≥ 12 in the level, strategically in sections 3–5.
- Tutorial prompts (section 0): lane change at 40 m, jump at 150 m, slide at 260 m, wall-run in section 2 at 1500 m,
  "BOOST" label when the first pad is approached.
- Visual set pieces: arches every ~80 m (rings of light the player runs through), a giant rotating hologram of a grid sphere at
  ~1100 m, a "data waterfall" (falling vertical light streaks) beside the canyon at 1700–2000 m, a huge digital sun/portal ring in
  the distance in section 6, floating discs/ships in the sky in section 4.
- The **bot** (see §12) must be able to finish the whole level without taking damage.

---------------------------------------------------------------------------------------------------------------------

## 11. Architecture and file map

```
client/
  index.html            (already created)
  vite.config.ts        (already created — base path for deploy)
  package.json          (already created — do not add runtime deps)
  public/assets/img/    sky.jpg floor.jpg wall.jpg title.jpg
  public/assets/audio/  run.mp3 boss.mp3
  src/
    main.ts             bootstrap: create Game, mount
    config.ts           all constants (lanes, speeds, DT, TARGET_SCORE, colors, section table)
    game/Game.ts        main loop, state machine, wiring of logic/render/ui/audio
    game/state.ts       GameState / RunStats types, reset
    input/Input.ts      keyboard → buffered actions
    logic/              rng.ts player.ts collision.ts level.ts patterns.ts solvable.ts scoring.ts boss.ts bot.ts  (+ *.test.ts)
    render/             Renderer.ts postfx.ts Environment.ts Track.ts Skyline.ts PlayerModel.ts CycleModel.ts CameraRig.ts
                        Particles.ts Trail.ts ObstacleMeshes.ts Boss.ts Finish.ts assets.ts
    audio/              Music.ts Sfx.ts AudioEngine.ts
    ui/                 Hud.ts Screens.ts styles.css
README.md               (this folder, app readme — write it at the end)
```
Naming may deviate slightly if needed; keep the layering (logic has zero three/DOM imports) and record the final file map in
`STATE.md`.

---------------------------------------------------------------------------------------------------------------------

## 12. Debug hooks, bot and URL flags (required — used for automated verification)

- `window.__game` is exposed always (cheap): `{ state, score, mult, dist, integrity, section, fps, finished, gameOver, quality,
  startRun(), setBot(on:boolean), teleport(distMeters) }`. `teleport` jumps the run to a distance (spawning the right chunks) —
  used to inspect later sections quickly.
- URL flags: `?bot=1` autostart with bot enabled and skip the title; `?debug=1` shows fps/draw calls/triangles; `?section=N`
  starts at that section's start distance; `?mute=1`.
- **Bot** (`logic/bot.ts`, pure): given player state + level, outputs actions each tick. It looks ahead ~35 m, picks the lane
  path with no hazards, jumps barriers/gaps, slides beams, climbs/drops wall rows, wall-runs for `longGap`s, times drones
  and lasers, avoids rivals, avoids boss telegraph lanes, and prefers lanes with bits. A unit test runs the **headless full-level
  simulation** (logic only, 120 Hz) with the bot and asserts: reaches distance 7800, integrity stays 3, score > 0.8 × TARGET_SCORE?
  (assert ≥ 50% of target at least).
- **Ideal-run determinism**: the sim with identical inputs gives identical results (test).

---------------------------------------------------------------------------------------------------------------------

## 13. Quality bar / acceptance criteria for the whole game

1. `npm run lint`, `npm test`, `npm run build` all pass with zero errors.
2. Opening `npm run dev` shows the title screen with live 3D background, Enter starts the countdown then the run.
3. All controls in §3 work. The level can be completed (victory screen) in 4.5–5.5 minutes by the bot, without damage.
4. All obstacle types, boost pads, wall-run strips, light-cycle segment, drones, lasers, boss attacks and the finish gate exist
   and behave per this spec.
5. Visuals: bloom, fog, emissive circuit floor, magenta grid wall-run walls, skyline towers, animated humanoid runner,
   chromatic aberration, particle sparks, camera roll/FOV effects — visibly present. No z-fighting, no black screen, no
   console errors/warnings during a full run.
6. HUD matches §7 (score top-left with target, multiplier ring top-right, prompts, popups), screens match §2.
7. Music plays and crossfades; procedural SFX play; mute works.
8. Stable ≥ 55 fps average at 1080p on this Mac (M-series) with High quality (the reviewer will check `?debug=1`).
9. `README.md` documents how to run, controls, structure, and credits (assets locally generated, music locally generated).
