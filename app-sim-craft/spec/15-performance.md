# 15 — Performance

## 1. Target hardware & budget

Baseline target: 60fps on a mid-range laptop from ~2020 onward (integrated
GPU class, e.g. Intel Iris Xe / Apple M1 tier) at a "Medium" preset
render distance (§3), and a stretch target of 60fps on a 2018-era device
at "Low" preset. Frame budget at 60fps is 16.6ms; the rendering pipeline
(see [10 — Lighting & Rendering](10-lighting-rendering.md)) targets no
more than ~10ms of that for render + simulation combined on the main
thread, leaving headroom for browser/OS overhead and avoiding the
perceptible-stutter zone. This budget, not raw feature count, is what
governs every "should this be on by default" call in this chapter and
elsewhere (e.g. water refraction faked rather than ray-marched, see
[10](10-lighting-rendering.md) §5).

## 2. Memory budget

- A chunk's raw block array is `32×32×32×2 bytes (Uint16) = 65,536
  bytes` (64KB), plus light data (`32³ × 2 bytes` for sky+block light
  packed = 32KB, or 16KB if packed 4-bits-each into one byte, the
  preferred approach) ≈ **~80KB per loaded chunk** of CPU-side data.
- At a "Medium" render distance of 12 chunks radius (§3), a roughly
  cylindrical loaded volume (columns loaded out to that radius, 8 chunks
  tall) is on the order of ~3,600 chunk columns × 8 = ~29,000 chunks in
  the *theoretical* full volume, but the great majority of those are
  either fully air (sky) or fully opaque-buried and are never resident as
  full chunk objects — practical loaded-chunk counts in typical terrain
  are far lower (see §3's chunk-skip rule); the budget is monitored via
  the debug overlay's loaded-chunk counter (see
  [12 — UI/UX](12-ui-ux.md) §10) rather than a hard cap alone.
- **GPU memory:** the texture atlas (see
  [10](10-lighting-rendering.md) §2) is the single largest fixed GPU
  memory cost, sized to balance texel density against atlas dimensions
  (target: a single 2048×2048 mipmapped atlas covers the full MVP block
  catalog from [03](03-blocks-materials.md) at a 16×16px-per-face texel
  density, matching the genre-standard resolution — see
  [18 — Visual & Art Direction](18-visual-art-direction.md) §1).
- A soft total-resident-chunk-mesh-vertex-buffer budget is enforced by
  render-distance settings (§3) rather than a separate manual cap, since
  render distance is already the dominant lever on both CPU chunk memory
  and GPU mesh memory simultaneously.

## 3. Render distance & LOD tiers

| Preset | Full-detail radius | LOD radius (beyond full-detail) | Target hardware |
|---|---|---|---|
| Low | 6 chunks | +4 chunks (4×4×4 LOD) | 2018-era integrated GPU |
| Medium (default) | 10 chunks | +6 chunks (2×2×2 LOD) | 2020-era integrated GPU |
| High | 16 chunks | +8 chunks (2×2×2 LOD) | Discrete GPU |
| Extreme | 24 chunks | +8 chunks (2×2×2 LOD) | High-end discrete GPU |

A chunk fully surrounded by opaque neighbors on all 6 faces (buried,
never visible regardless of camera angle — see
[10](10-lighting-rendering.md) §2) is skipped for meshing/upload
entirely regardless of preset, which in practice removes the large
majority of deep-underground chunk volume from the active budget.

## 4. Particle budget

A shared, pooled particle system (see
[10](10-lighting-rendering.md) §6) caps total live particles (default
~2,000, scaling down automatically on Low preset to ~500) with a
priority system — gameplay-relevant particles (block-break debris,
active weather) evict decorative/ambient ones (distant smoke wisps) first
when the cap is reached, so the budget never causes a *functional* cue
(e.g. seeing that a block you just broke actually broke) to silently
disappear.

## 5. Entity & AI budget

- **Soft mob cap:** a global cap on simultaneously loaded/simulated
  creatures (default 60, tuned lower on Low preset), enforced by pausing
  *new* natural spawns (see [08 — Mobs & Creatures](08-mobs-creatures.md)
  §4) once reached — never by despawning existing tamed/named creatures,
  which are always exempt from the cap.
- **Pathfinding throttling:** not every active creature re-plans a path
  every simulation tick; pathfinding requests are round-robin spread
  across ticks (e.g. at most ~8 creature path-replans per tick) so a
  sudden cluster of creatures (e.g. a large farm) can't spike a single
  tick's cost — a creature simply continues its last-known path for a
  few extra ticks if its turn hasn't come up yet, which is imperceptible
  in practice.
- **Distant creature simplification:** creatures beyond a moderate
  distance from the player tick at a reduced rate (position/AI updates
  every 4th tick instead of every tick, interpolated visually) rather
  than full-rate simulation, since fine-grained behavior far from the
  player is imperceptible.

## 6. Automation (Sparkwire) budget

Signal propagation (see
[09 — Logic & Automation](09-redstone-automation.md) §6) and fluid/fire/
crop ticking (see [11 — Physics & Fluids](11-physics-fluids.md) §5) both
use the shared dirty-queue tick scheduler specifically so their cost
scales with *active* contraption size, not total world size — verified
in [20 — Testing & QA](20-testing-qa.md) §4's stress-test scenario (a
large automated farm build) as part of the performance test suite, with
an explicit regression budget (e.g. "a 64×64 fully-wired signal grid must
not exceed 3ms of tick time").

## 7. Load-time budget

- **First load (cold cache):** target under 5 seconds to interactive main
  menu on a typical broadband connection, achieved by code-splitting
  (route-level: main menu / world-select don't need the full rendering
  engine bundle loaded yet) and lazy-loading non-critical assets (music
  tracks, per
  [13 — Audio](13-audio.md) §5; less-common block textures if the atlas
  is itself split — evaluated during implementation against the single-
  atlas simplicity tradeoff).
- **Subsequent loads:** the Service Worker (see
  [21 — Deployment & DevOps](21-deployment-devops.md) §4) caches the full
  app shell and asset bundle after first visit, making a return visit
  near-instant and fully offline-capable.
- **World load (entering a save):** target under 2 seconds from clicking
  Play to being able to move — achieved by only synchronously loading the
  small set of chunks immediately around the spawn/last-position point
  before handing control to the player, streaming the rest of the render-
  distance radius in over the following seconds via the worker pool (see
  [01](01-tech-stack-architecture.md) §5), same as the steady-state
  chunk-streaming behavior during normal play.

## 8. Profiling & regression guardrails

The debug overlay's frame-time breakdown (§10 of
[12 — UI/UX](12-ui-ux.md)) is treated as a first-class dev tool, not just
a player curiosity feature — it's the same instrumentation used during
development to catch regressions, backed by the automated performance
smoke tests described in
[20 — Testing & QA](20-testing-qa.md) §4 (scripted scenarios — e.g.
"stand at world spawn on a freshly generated Standard world, Medium
preset, and hold 60fps for 30 seconds" — run in CI against a headless
browser where feasible, or as a manual pre-release checklist item where
CI-headless WebGL isn't reliable).
