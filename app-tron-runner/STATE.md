# NEON RUNNER - M14d Status

## M14d: cape removed

## M14c — Fix the realistic runner's look (DONE)

### 1. Trim lines (thin cyan lines, never white)
- **`src/logic/trimMask.ts`** rewritten: thin lines (half-width 0.010 m, soft
  edge 0.006 m) in rest-pose metres: leg outer lines (|x|≈0.185,
  |z+0.04|<0.03, y 0.12–0.95), arm top lines (y 1.49–1.52, |z+0.065|<0.03,
  |x| 0.28–0.69), chest ring (y 1.29–1.31, |x|<0.20 torso only), belt
  (y 0.96–0.98, |x|<0.20), spine line (|x|<0.010, z<-0.08, y 1.0–1.45).
  Collar V skipped (optional per milestone).
- **`RealisticRunner.ts`**: GLSL mirror regenerated from the same bands
  (`trimBand` + `trimRange`); emissive = cyan (0.10,0.95,1.0) × 1.6 × mask,
  clamped to 1 (never white); fresnel rim now power 4.0, intensity 0.30
  (was 0.8); body base 0x05070d, metalness 0.7, roughness 0.35,
  envMapIntensity 0.6.
- **`trimMask.test.ts`** rewritten: point on a line = 1, point 5 cm away = 0,
  torso side = 0, chest ring excluded on arms, spine line back-only,
  symmetry, [0,1] bounds.

### 2. Attachments from REST-POSE points
- **`RealisticRunner.ts`**: new `restLocal(bone, x, y, z)` — converts a
  rest-pose model-space point into bone-local space with the facing flip
  temporarily zeroed (orientation independent), called right after GLB load
  and BEFORE the mixer plays any clip.
- Helmet: sphere r 0.125, scale (1.0, 1.12, 1.08), black glossy, centred on
  rest point (0, 1.69, 0) on the `Head` bone.
- Visor: partial sphere r 0.13 (±55° horizontal, y 1.66–1.72) on the FRONT
  (+Z), emissive cyan 0x19f2ff intensity 3, DoubleSide — no white cap on top.
- Orange identity disc kept: torus r 0.16 at rest (0, 1.28, -0.14) on
  `spine_03`, facing -Z.
- Ankle rings: torus r 0.075 tube 0.008, cyan (not white), horizontal (axis
  Y), at rest (±0.114, 0.10, -0.06) on `foot_l`/`foot_r`.
- All attachments keep `if (missing bone) skip`.

### 3. Cape NaN fix + rest-pose placement
- **`src/logic/cloth.ts`**: dt clamped to [1/240, 1/30] with sub-stepping in
  `stepCloth`; zero-length constraints skipped (`d < 1e-6`); `sanitize()`
  resets any non-finite particle to its rest position (`restPos` added to
  `ClothSim`); particles initialised to the anchor-relative hanging shape
  (never 0,0,0); grid now 6 cols × 9 rows, 0.44 m wide × 0.85 m long.
- **`cloth.test.ts`**: +3 tests — 1000 steps with dt alternating 0/0.2/1/60
  all finite; zero-length constraint never produces NaN; free end ends up
  behind (+z) the anchor under wind (0,0,+6).
- **`Cape.ts`**: anchor now a REST-POSE model-space point (0, 1.40, -0.14)
  converted to world each frame via the model's `matrixWorld` (new
  `setAnchor(model, restPoint, ...)`); bounding sphere computed once at init,
  `frustumCulled = false`; dark 0x070a14 double-sided with cyan hem line.
- **`RealisticRunner.ts`**: new `getCapeAnchorRest()` + `getSceneObject()`.
- **`Game.ts`**: cape wired via the rest-pose anchor (replaces `setBone`).

### Verification
- `npm run lint` ✅, `npm test` ✅ (290 tests, 25 files), `npm run build` ✅.

### Deviations / known issues
- Collar V lines skipped (milestone marks them optional).
- Cape local axes assume world-aligned runner (unchanged from M14b).

---

# NEON RUNNER - M14b Status

## M14b — Cloth cape, wiring, fallback flag, camera (DONE)

### 1. Cloth cape
- **`src/logic/cloth.ts`** (new, PURE — no three/DOM): verlet cloth, 6 cols ×
  10 rows, 0.55 m wide × 0.9 m long, top row pinned to a moving anchor.
  Gravity −9 m/s², drag 0.985, wind = −anchor velocity (cape streams behind
  the runner, +z in world), 4 distance-constraint iterations, optional sphere
  collider (body centre). Preallocated `Float32Array`/`Uint16Array`, no
  per-frame allocation. API: `createCloth`, `stepCloth`, `moveAnchor`
  (translates cloth + prev, preserves velocity), `maxConstraintError`.
- **`src/logic/cloth.test.ts`** (new, 8 tests): grid size/rest lengths, pinned
  row never leaves the anchor (240 steps), settles under gravity, wind pushes
  free end to +z, constraint error < 5% after 200 steps, sphere collider keeps
  cloth out of the body, `moveAnchor` translation, determinism.
- **`src/render/Cape.ts`** (new): renders the sim as a custom indexed
  `BufferGeometry` (double-sided `MeshStandardMaterial` 0x070a14) + cyan
  (0x19f2ff, additive) `LineSegments` hem along bottom + side edges. Anchor
  attached to the `spine_03` bone (falls back to feet+1.5 m), body collider
  at anchor+(0,−0.5,0) r 0.42. Fixed 120 Hz sub-steps, all buffers
  preallocated, `computeVertexNormals` in place.

### 2. Cape attached to RealisticRunner
- `RealisticRunner.getAnchorBone()` returns `spine_03` (or null).
- Game.ts: cape created once, added to scene; enabled only when
  `charActive === 'real'` AND quality High AND not dead AND runner mode
  (disabled in cycle mode, on death/shatter, on Low — `Q` toggle and
  auto-downgrade both re-evaluate it). `reset()` on run reset.

### 3. Fallback flag
- **`src/game/flags.ts`**: `char: 'real' | 'classic'` from `?char=...`,
  default `real`; `parseFlags(search?)` now testable with an explicit search
  string. **`flags.test.ts`** rewritten with 5 real assertions.
- **`Game.ts`**: `playerModel` is now typed `RunnerView`. Classic
  `PlayerModel` is constructed and visible from frame 1; when `char ===
  'real'` a `RealisticRunner` is created and on `ready` the classic model is
  hidden and the GLB model swapped in (never a frame without a character).
  On load failure: one `console.warn`, classic model stays, camera reverts.
  `?debug=1` HUD now shows `CHAR REAL/CLASSIC` (Hud.ts `DebugInfo.char`).

### 4. Camera
- **`CameraRig.ts`**: new `setRealisticMode(on)` — runner mode with the
  realistic model uses offset (0, 2.6, 5.2), look-at 4.5 m ahead at y 1.2;
  classic keeps (0, 2.8, 5.5) / 5 m ahead at y 1.3. Cycle mode unchanged.
  Intro dolly uses the same look-ahead/look-Y fields.

### 5. README
- `client/README.md` + root `README.md`: new "Character models" section
  (realistic CC0 Quaternius default, `?char=classic` for procedural,
  automatic fallback). `public/assets/models/CREDITS.txt` untouched.

### Verification
- `npm run lint` ✅, `npm test` ✅ (282 tests, 25 files), `npm run build` ✅.

### Deviations / known issues
- Cape anchor velocity is a finite difference of the bone world position
  (clamped 40 m/s); wind = −velocity so the cape streams behind the runner.
- Cape local axes assume world-aligned runner (identity rotation on the cape
  group); wall-run rotation of the runner is not mirrored onto the cape
  (it hangs in world space, which reads fine and is simpler).
- Reviewer may still want numeric tweaks (facing flip via
  `RUNNER_FACING_FLIP` in config.ts, scale, suit lines).

---

# NEON RUNNER - M14a Status

## M14a — Realistic runner model (DONE)

New GLB-based runner (asset `public/assets/models/runner.glb`, CC0, loaded with
`GLTFLoader` + `MeshoptDecoder`). The old procedural `PlayerModel` is untouched
and still implements the shared interface.

- **`src/render/runnerView.ts`** (new): `RunnerView` interface — exactly what
  Game.ts calls (`getModel(): THREE.Object3D`, `reset()`,
  `update(state, dt, speed)`, `triggerShatter()`). `PlayerModel` now declares
  `implements RunnerView` with zero behaviour change.
- **`src/logic/animMap.ts`** (new, pure) + **`animMap.test.ts`** (16 tests):
  `chooseClip(state, speed, prev, ctx)` → `{ clip, loop, timeScale, fade,
  oneShotThen? }`. Table per M14a: grounded → `Sprint_Loop`
  (timeScale clamp(speed/24, 0.8, 1.6)); jump start → `Jump_Start` (1.6,
  one-shot) → `Jump_Loop`; falling → `Jump_Loop`; landing → `Jump_Land`
  (2.2, one-shot) → `Sprint_Loop`; slide → `Slide_Start` → `Slide_Loop`,
  exit → `Slide_Exit` → `Sprint_Loop`; wall-run → `Sprint_Loop`; hit
  (invulnerability just started, timer > 1.9) → `Hit_Chest` overlay (0.05 s
  fade); integrity 0 → `Death01` (non-loop, wins over all); phase idle →
  `Idle_Loop`, victory → `Dance_Loop`. Fades 0.12 s (0.05 hits).
- **`src/render/RealisticRunner.ts`** (new): `RealisticRunner implements
  RunnerView`. Async GLB load (`ready: Promise<void>`, `isReady()`).
  `AnimationMixer` with cross-fades driven by `chooseClip`; one-shot clips
  chain via `oneShotThen` + mixer `finished` event. Wall-run: outer group
  rotated ±90° about z (eased 0.25 s); lane lean ±~12° damped; invulnerability
  flicker (40 Hz); death = `Death01` for 0.6 s then 60-cube shatter burst.
  M14b added `getAnchorBone()` for the cape.
- **Tron suit material**: `onBeforeCompile` patch of `MeshStandardMaterial`
  (0x05070d, metalness 0.85, roughness 0.3, keeps loaded normalMap/
  roughnessMap, envMapIntensity 1). Cyan (0x19f2ff) trim lines from rest-pose
  `vObjPos` (leg/arm outer vertical lines, chest ring, belt) at intensity
  2.2 + fresnel rim. Formula lives in **`src/logic/trimMask.ts`** (pure, +
  `trimMask.test.ts`, 11 tests) and is mirrored into the GLSL string from the
  same `TRIM_BANDS` constants.
- **Helmet & disc**: black glossy helmet + cyan emissive visor band on the
  `Head` bone; orange identity disc (torus + core) on `spine_03`; cyan ankle
  rings on `foot_l`/`foot_r`. Missing bones skipped silently.
- **`src/config.ts`**: `RUNNER_FACING_FLIP = false` (applied as
  `inner.rotation.y = flip ? π : 0`) for the reviewer to toggle.

### Deviations / known issues
- `chooseClip` needs a `ctx.phase` ('idle' | 'victory') for title/victory
  clips since PlayerState has no game-phase field; default is run mapping.
- Hit detection in `chooseClip` uses `invulnerabilityTimer > 1.9` (timer is
  set to exactly 2.0 on hit) — deterministic at 120 Hz.

---

# NEON RUNNER - M13 Status

## M13 — Scenery fix, round 2 (DONE)

Reviewer diagnosis: 16 m flat teal wall slabs filled the screen sides and hid
the sky/skyline. Fixed in `client/src/render/` (render-only, no logic changes):

- **`Track.ts`** (M13 #1, #2, #5):
  - Walls lowered 16 m → **6 m**: wall box `(0.1, 6, CHUNK)` at y = 3; light
    strips `(0.35, 5.4, 0.22)` at y = 3 (wider + brighter, `emissiveIntensity 3`
    via existing strip mats); top rail y 15.5 → 5.7; wall-run strips
    `(0.12, 6, len)` at y = 3 (same height as walls).
  - Flat teal wall material replaced with a procedural 512×256 `CanvasTexture`
    (`makeWallTexture()`: dark navy #070b18 panels, 1 px seams every 64 px,
    small cyan/orange "screen" rectangles), used as both `map` and
    `emissiveMap`, `emissiveIntensity 0.35`, one tile per 12 m of wall.
  - New `Track.setSection(n)` tints the wall emissive with the section
    palette `wall` colour (magenta in section 2, red in 3, cyan in 4);
    `SECTION_PALETTES` exported from `Environment.ts`.
- **`Environment.ts`** (M13 #3): sky sphere texture `repeat (1,1)`,
  `offset (0,0)`, `wrapS = RepeatWrapping`; sphere rotated
  `(-0.15, π/2, 0)` so the green beam faces −z (ahead) and the city/grid
  horizon band sits just above the horizontal view line. `fog: false`,
  `toneMapped: false` kept. Fog lightened to `0x0a1030`, linear (80, 420).
- **`Skyline.ts`** (M13 #4): tower body `MeshBasicMaterial({ color: 0x06091a })`;
  bright cyan/orange/magenta edge lines (already present, additive, `fog: false`);
  26 towers per side across 420 m → ≥ 4 per side visible in first 150 m;
  flying streaks kept.
- **`Game.ts`**: calls `track.setSection(...)` alongside
  `environment.setSection(...)` on section change and on run reset.

### Verification
- `npm run lint` ✅, `npm test` ✅ (243 tests, 22 files), `npm run build` ✅.
- No logic changes → no new tests needed (M13 rule #6).

---

# NEON RUNNER - M12 Status

## M12 — Scenery visibility fix (DONE)

Reviewer found the world looked like a floating strip in a black void: walls,
skyline and sky were invisible. Fixed in `client/src/render/`:

- **`Track.ts`** (walls visible):
  - Normal wall material now `color 0x1a2233`, `emissive 0x0a6c78`
    (teal) `emissiveIntensity 0.8` — no longer black.
  - Added bright vertical emissive light strips
    (cyan `0x19f2ff` / orange `0xff7a18`, `emissiveIntensity 2.2`) every
    12 m on both walls, plus a continuous top rail at y = 15.5.
  - Wall-run strips: `emissiveIntensity` raised 1.8 → 2.6 and a bright pink
    floor-level rail added along the strip.
- **`Skyline.ts`** (towers visible):
  - Tower bodies were `MeshBasicMaterial` black with `fog: true` → now
    `color 0x0d1424` (dark blue-grey, visible against the sky) and edge
    lines `fog: false` so they stay bright at distance.
  - Tower count 14 → 26 per side, spread over 420 m (was 600 m) so towers
    are visible from the start of the level.
  - Flying streaks: `fog: false` + `emissiveIntensity`-style brightening
    (basic material color 0x9ff / 0xff9).
- **`Environment.ts`** (sky visible):
  - Sky sphere radius 400 → 700, `fog: false` on the sky material so the
    neon city/grid horizon is not eaten by FogExp2.
  - Fog density 0.012 → 0.006 (SPEC said ~0.012 but it hid everything;
    0.006 keeps the "track fades into haze" look while letting the skyline
    and sky read).
  - Hemisphere light intensity raised (sky 0x223355, ground 0x332211, 0.6).
- **`Game.ts`**: `?debug=1` now also logs a one-time construction sanity
  check (scene children, mesh count, background/fog present) to the console.

### Verification
- `npm run lint` ✅, `npm test` ✅ (241 tests, 21 files), `npm run build` ✅.
- No logic changes → no new tests needed (M12 rule #6).

---

# NEON RUNNER - M11 Status

## M11 — Performance, robustness, README (DONE)

### Changes
- **`client/src/render/Trail.ts`**: removed per-frame `Vector3.clone()` allocation —
  history ring now stores plain `{x,y,z}` objects (SPEC §0.9 no per-frame allocation).
- **`client/src/render/Boss.ts`**: shatter-burst base position now uses a reused
  `shatterBase` Vector3 instead of a per-frame `new THREE.Vector3`.
- **`client/src/render/Particles.ts`**: new `setQuality(q)` — rebuilds the particle
  pool at 4000 (High) / 1500 (Low) capacity when quality changes (SPEC §8.1).
- **`client/src/game/Game.ts`**:
  - Auto-pause when the tab is hidden (`visibilitychange` → pause if playing) —
    robustness requirement.
  - Auto-downgrade to Low quality if average fps < 40 for 3 consecutive seconds
    during play (SPEC §8.1); `Q` toggle now also re-sizes the particle pool.
  - `trail.update()` reuses `tmpVec` (no per-frame allocation).
- **`client/src/logic/bot.test.ts`**: `SimResult` now reports `time`; new test
  asserts the bot finishes in 4.5–5.5 minutes (SPEC §13.3).
- **`client/README.md`** (new): how to run, controls, URL flags, `window.__game`,
  game overview, architecture/file map, performance notes, credits (SPEC §13.9).

### Verification
- `npm run lint` ✅, `npm test` ✅ (241 tests, 21 files), `npm run build` ✅.
- Bot headless sim: reaches 7800 m, integrity 3, 0 hits, score ≥ 50 % target,
  deterministic, duration within 4.5–5.5 min.

### SPEC §13 acceptance checklist
1. ✅ `npm run lint`, `npm test`, `npm run build` all pass with zero errors.
2. ✅ Title screen with live 3D attract-mode background; Enter → countdown → run
   (Screens.ts + Game.ts doFlow; verified in code, flow.test.ts covers transitions).
3. ✅ Bot completes the level in 4.5–5.5 min without damage (bot.test.ts, 120 Hz
   headless sim: reaches 7800 m, integrity 3, 0 hits, duration in range).
4. ✅ All obstacle types (barrier, beam, block, gap, longGap, wallBlock, drone,
   laser, rival, boost, bit, core, repair), wall-run strips, light-cycle segment
   (3700–5000), drones, lasers, boss attacks, finish gate — present in
   `logic/level.ts` + `render/ObstacleMeshes.ts` + `Boss.ts` + `Finish.ts`,
   tested via solvable/ideal-run/boss tests.
5. ✅ Visuals: bloom (UnrealBloomPass), FogExp2, emissive circuit floor
   (floor.jpg + emissiveMap), magenta grid wall strips (wall.jpg), skyline
   towers (Skyline.ts), animated humanoid runner (PlayerModel.ts), chromatic
   aberration + glitch (postfx.ts NeonPost), particle sparks (Particles.ts),
   camera roll/FOV (CameraRig.ts). No per-frame allocations in hot paths
   (fixed this milestone: Trail, Boss, Game trail update).
6. ✅ HUD per §7 (score/target/progress top-left, multiplier ring top-right,
   integrity pips top-center, contextual prompts, popups, section banners) —
   Hud.ts + prompts.ts (tested).
7. ✅ Music crossfade run→boss at 3700 m, procedural SFX, `M` mute (Music.ts,
   Sfx.ts, beat.test.ts).
8. ✅ Performance: InstancedMesh pools, chunked streaming, pooled particles,
   quality toggle + auto-downgrade, pixel-ratio cap; fps shown via `?debug=1`.
   (Live 55 fps check requires a browser run; budgets are met by design.)
9. ✅ `README.md` documents run/controls/structure/credits.

### Re-work (gate fix)
- Gate `test -s README.md` checks the **repo root**, but the README only existed
  in `client/`. Copied it to `README.md` (root). Gate now passes:
  `lint && test && build && test -s README.md` ✅.

### Deviations / notes
- §13.8 live fps measurement is a manual browser check; all structural
  performance requirements (pools, no per-frame allocation, draw-call budget
  via InstancedMesh, auto-downgrade) are implemented and the debug HUD reports
  fps/draw calls/triangles.
- Auto-pause on hidden tab is a robustness addition (not in original spec text,
  required by M10b).

---

# NEON RUNNER - M10a Status

## M10a — Bot and headless full-level test (DONE)
- **`client/src/logic/bot.ts`**: pure deterministic auto-pilot. Boss avoidance,
  longGap wall-run, lane costing, in-lane reactions (jump/slide/row-switch),
  cycle-mode rules.
- **`client/src/logic/bot.test.ts`**: headless full-level sim — reaches 7800 m,
  integrity 3, 0 hits, score ≥ 50 % target, deterministic, duration 4.5–5.5 min.
- **`client/src/game/Game.ts`**: `?bot=1` autostart, `setBot(on)` wiring.

## M9b — Boss, finish gate, victory visuals (DONE)
- `render/Boss.ts` (Sentinel, telegraphs, bolts, shatter), `render/Finish.ts`
  (portal ring, swirl, 300 m beam), victory slow-mo run-in in Game.ts.

## M9a — Cycle mode, rivals, boss logic (DONE)
- `logic/boss.ts` (phases, telegraph, bolts, cores, overload), rival obstacle,
  cycle mode in player.ts, section-4/6 recipes.

## M7a — Audio (DONE)
- `audio/AudioEngine.ts`, `audio/Music.ts` (crossfade/duck/beat), `audio/Sfx.ts`
  (procedural), `audio/beat.ts` + tests.

## M6b — Screens and game flow (DONE)
- `ui/Screens.ts` (all §2 screens), `game/flow.ts` pure state machine + tests
  (incl. 5-retry loop), Game.ts `doFlow()` wiring.

## Earlier milestones (M3–M6a, summarized)
- M3: player state machine, PlayerModel/CycleModel/Trail, CameraRig, Game loop,
  URL flags.
- M4a: rng, levelTypes, patterns (26), level (seed 1337, 7800 m, 700–900 bits,
  5 repairs), collision, solvable — all pure with tests.
- M4b/M5: scoring (TARGET_SCORE), particle pool, ObstacleMeshes, Particles,
  Track, Skyline, Renderer + postfx (bloom, NeonPost, SMAA, quality toggle).
- M6a: HUD per §7.

## Known issues
- None blocking. lint/test/build all green (282 tests pass).
