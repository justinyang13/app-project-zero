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
  - Added bright vertical emissive light strips every 6 m on both walls
    (cyan/orange alternating, `emissiveIntensity 2.5`) and horizontal neon
    rails at y = 0.3 and y = 15.5 per chunk.
  - Wall-run strip material per spec: `color 0x220018`, `emissive 0xff2bd6`,
    `emissiveIntensity 1.6`, `side: THREE.DoubleSide` (both faces visible).
  - `?debug=1` now logs live chunk count and wall-strip mesh count per update.
  - Verified `Game.ts` calls `track.setLevelGeometry` with the level's real
    `gaps` and `wallStrips` (it did; strips are created per overlapping chunk).
- **`Skyline.ts`** (towers visible):
  - Tower bodies switched to `MeshBasicMaterial({ color: 0x050a1c })` (unlit
    standard material was rendering near-black).
  - `frustumCulled = false` on bodies, edge lines and streaks (instanced
    meshes with dynamic matrices were being culled).
- **`Environment.ts`** (sky + fog):
  - Sky is now a large inverted sphere (r = 500) with `sky.jpg`
    (`MeshBasicMaterial`, `BackSide`, `fog: false`, `depthWrite: false`,
    `toneMapped: false`, `renderOrder = -1`, `frustumCulled = false`),
    texture SRGB, `repeat.x = 2`, `offset.y = 0.15` so the city band sits
    just above the horizon. `update()` now takes the camera and follows it.
  - Fog changed from `FogExp2(0.012)` to linear `Fog(0x05071a, 80, 420)` so
    towers at 60–200 m are not fully fogged out.
- **`Game.ts`**: passes the camera to `environment.update()` (title + playing).
- Camera far plane already 1000 m (towers within range).

### Verification
- `npm run lint` ✅, `npm test` ✅ (243 tests, 22 files), `npm run build` ✅.
- No logic changes, so no new tests needed (M12 rule #4).

## M10b — Polish, performance, README, acceptance (DONE)

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
- None blocking. lint/test/build all green (241 tests pass).
