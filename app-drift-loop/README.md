# Drift Loop 🏎️

A 3D drift-racing game with a behind-the-car chase camera: race one AI
opponent around a hand-built test track, sliding through corners with an
arcade drift model. Built with Godot 4 and C#.

Standalone game project — no dependency on any other app in this repo. Not
part of the CI/deploy workflow yet (see "Explicitly out of scope for now"
below); run it locally in the Godot editor.

## Prerequisites

- [Godot 4.7 with C# support](https://godotengine.org/download) (the
  "Godot_mono" build — plain Godot without Mono/.NET support can't run this
  project). Installed here via `brew install --cask godot-mono`.
- [.NET SDK 8.0](https://dotnet.microsoft.com/download/dotnet/8.0) or later.
  Godot 4.7's C# support targets `net8.0` specifically — this is
  independent of the `net10.0` used by this repo's other backends
  (`app-hello-world`, `app-loot-raider`); both SDKs install side by side
  without conflict. Only .NET 10 is installed in this repo's dev
  environment, so `DriftLoop.csproj` sets `<RollForward>LatestMajor</RollForward>`
  to let the `net8.0`-targeted game assembly run on it.

## How to run

Open `project.godot` in Godot, then press **Play** (F5). On first open,
Godot builds the C# project automatically.

## How to play

- **W/↑** accelerate, **S/↓** reverse/brake, **A/D** or **←/→** steer.
- Hold **Space** to loosen traction and drift through corners.
- Race the red AI car around the track. First to complete 3 laps wins (the
  HUD shows your lap count and elapsed time; there's no separate AI-lap
  display yet). The AI drives at full grip (no drift) for reliable
  cornering — only the player can drift.

## Project structure

```
project.godot          # Godot project config + RaceManager autoload
scenes/
  Main.tscn             # entry scene — instances TestTrack.tscn
  car/                  # PlayerCar (with the chase camera rig), AICar, Checkpoint
  track/TestTrack.tscn  # ground, walls, the AI racing line, checkpoints, both cars, HUD
  ui/Hud.tscn           # lap/timer/status display (a CanvasLayer overlay, unaffected by 2D/3D)
scripts/
  Car/                  # CarController (shared 3D drift physics), PlayerInput, AIDriver
  Race/                 # RaceManager (autoload) and CheckpointArea
  Track/                # TrackLayout — builds the AI curve, starts the race
  Ui/                   # Hud.cs
assets/                 # sprites/ and audio/ — currently empty, see below
```

The player and AI cars are separate scenes that both attach the same
`CarController.cs` — the only place drift/movement math lives — so there is
exactly one physics implementation regardless of who's driving. The chase
camera (`SpringArm3D` + `Camera3D`) lives only on `PlayerCar.tscn` and is
rigidly parented to the car (no smoothing/lag yet — a reasonable simple
first pass, not just a placeholder).

## Explicitly out of scope for now

- **Art/audio assets.** `assets/sprites/` and `assets/audio/` are placeholders;
  the car and track currently render as flat-colored boxes. Kenney's free
  CC0 3D racing pack and jsfxr-generated SFX are the intended source per
  the project's tech decisions, added in a follow-up pass.
- **Track editor.** There's no in-game editor UI — tracks are hand-built
  directly in the Godot editor using 3D nodes (`StaticBody3D` walls,
  `Path3D` for the AI line), saved as `.tscn` scenes (`TestTrack.tscn` is
  the first one).
- **Camera smoothing.** The chase camera rotates rigidly with the car; a
  lerped/decoupled follow rig is a later polish pass, not now.
- **Web/WASM export**, a hub card on `app-project-zero-hub`, and any
  `ci.yml`/`deploy.yml` job — all deferred until an export pipeline is
  worth setting up.
- Multiple/variable-difficulty AI opponents, a track-selection menu, a main
  menu, and gamepad/touch input.
