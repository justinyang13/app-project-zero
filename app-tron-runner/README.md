# NEON RUNNER

A single-level, ~5-minute, third-person 3D "parkour runner" in a Tron-inspired digital
world. Built with **Vite + TypeScript (strict) + three.js** — no other runtime
dependencies, no backend, no persistence.

## Run it

```bash
npm install
npm run dev        # local dev server
npm run build      # production build (dist/)
npm test           # vitest unit tests (240 tests)
npm run lint       # oxlint
```

Open the dev URL in a browser. Press **Enter** on the title screen to start.

### URL flags (debug / verification)

| Flag | Effect |
|---|---|
| `?bot=1` | Autostart with the auto-pilot bot enabled (skips title + countdown) |
| `?debug=1` | Show FPS / draw calls / triangles / quality / mute state (bottom-right) |
| `?section=N` | Start the run at section N's start distance (0–6) |
| `?mute=1` | Start with audio muted |

### `window.__game` (always exposed)

```js
__game.state          // 'title' | 'countdown' | 'playing' | 'paused' | 'gameover' | 'victory'
__game.score, __game.mult, __game.dist, __game.integrity, __game.section
__game.fps, __game.finished, __game.gameOver, __game.quality
__game.startRun()     // start / restart the run
__game.setBot(on)     // toggle the auto-pilot
__game.teleport(m)    // jump the run to a distance (spawns the right chunks)
```

## Controls

| Action | Keys |
|---|---|
| Move left / right (lane change, wall hop) | `A`/`←`, `D`/`→` |
| Jump (floor) / climb wall row | `W`/`↑`/`Space` |
| Slide (floor) / drop wall row | `S`/`↓`/`Shift` |
| Pause / resume | `Esc` or `P` |
| Restart (pause / game over / victory) | `R` |
| Mute music | `M` |
| Toggle graphics quality (High/Low) | `Q` |
| Start / confirm | `Enter` |

## The game

Run 7800 m through 7 sections — BOOT SEQUENCE, CIRCUIT ALLEY, WALL-RUN CANYON,
DATA CHASM, LIGHT CYCLE HIGHWAY (you ride a light cycle), REINTEGRATION GAUNTLET
and THE SENTINEL (boss) — collecting data bits, avoiding barriers, beams, blocks,
gaps, drones, laser gates and rival cycles, wall-running magenta grid walls, and
dodging the Sentinel's plasma bolts. 3 integrity pips; at 0 you are derezzed.
Score with a 1×–15× multiplier (every 8 bits without a hit), near misses, boost
pads, wall-run trickle, and victory bonuses. 3 stars for clearing the target
score.

## Architecture

- `src/logic/` — **pure TypeScript, zero three.js/DOM imports**, unit-tested:
  player state machine (`player.ts`), collision (`collision.ts`), level build
  (`level.ts`, `patterns.ts`, seeded `rng.ts`, seed 1337), solvability planner
  (`solvable.ts`), scoring (`scoring.ts`), boss (`boss.ts`), auto-pilot bot
  (`bot.ts`), particle pool (`particlePool.ts`).
- `src/render/` — three.js: `Renderer` + post-processing (bloom, NeonPost
  chromatic aberration/glitch/scanlines, SMAA), `Environment` (sky, fog,
  section palettes, beat pulse), `Track` (streaming 40 m chunks), `Skyline`,
  `SetPieces` (arches, hologram, waterfall), `PlayerModel` / `CycleModel`
  (procedural animation), `CameraRig` (chase, roll, FOV, shake), `Particles`,
  `Trail`, `ObstacleMeshes` (InstancedMesh pools), `Boss`, `Finish`.
- `src/game/` — `Game.ts` (120 Hz fixed-timestep loop, wiring), `flow.ts`
  (pure state machine), `state.ts`, `events.ts`, `flags.ts`.
- `src/audio/` — `AudioEngine` (Web Audio unlock/mute), `Music` (run/boss
  crossfade, duck, beat clock), `Sfx` (fully procedural SFX), `beat.ts`.
- `src/ui/` — `Hud.ts` (score/target/progress, multiplier ring, integrity
  pips, prompts, popups, banners), `Screens.ts` (title/countdown/pause/
  game over/victory), `prompts.ts` (pure prompt selection), `styles.css`.
- `src/input/` — keyboard → edge-triggered buffered actions (0.15 s buffer).

## Performance

- 120 Hz fixed-timestep simulation, render per animation frame, delta clamped 0.1 s.
- `InstancedMesh` pools for all repeated obstacles/bits; chunked streaming
  (~220 m ahead / 40 m behind); pooled particles (4000 High / 1500 Low caps).
- No per-frame object allocation in hot paths (reused `Vector3`/`Matrix4` temps).
- Quality toggle (`Q`) and auto-downgrade to Low if average fps < 40 for 3 s.
- Auto-pause when the tab is hidden.

## Character models

The runner uses the realistic CC0 Quaternius character (GLB, `public/assets/models/runner.glb`)
by default, with a Tron suit, helmet and glowing trim; no cloth cape.
Use `?char=classic` for the original procedural runner. If the GLB fails to load,
the game automatically falls back to the classic model.

## Credits

All assets (textures, music) are locally generated and shipped in
`public/assets/` — no external downloads. Music: `run.mp3` (120 BPM synthwave)
and `boss.mp3` (140 BPM) crossfade at 3700 m. SFX are synthesized in Web Audio.
