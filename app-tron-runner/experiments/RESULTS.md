# Local-LLM build experiment: Neon Runner (qwen3-coder:30b vs qwen3.8:27b)

Goal of the test: can a local LLM, driven by Claude as orchestrator only (spec, milestones, harness, validation; no game code written by Claude), build a ~10k-line three.js game? Spec: `../SPEC.md`. Plan: `../milestones/plan.txt`. Raw data: `experiments/*.jsonl` (per Ollama call), `RUNLOG_*.md` (every tool call), `A_coder.*` (trial A).
Hardware: Mac M5 Max, 64 GB. Ollama 0.35.0, flash attention, q8_0 KV cache.

## Outcome
- All milestones M1-M10b built, plus three visual fix passes after Claude's browser review (M11 canvas/exposure/scanlines, M12 first scenery try, M13 scenery diagnosis + fix; ~10 min of Qwen each).
- Final repo: 10.3k lines TypeScript, 22 test files, 243 unit tests, lint/test/build green, production bundle 7.9 MB (4.8 MB music, 2 MB images), 60 fps, ~180-240 draw calls, ~65-75k triangles on High, no console errors across a full bot run and teleports to sections 2/4/6.
- Final look (verified in a real browser): neon circuit-board floor, paneled neon corridor walls with light strips and section tints (magenta canyon, red hot section, cyan highway), skyline towers, arches, boss silhouette at the end, HUD matching the reference layout. Known weaknesses: the runner is still box-built (character upgrade deferred), the sky is subdued, and TARGET_SCORE is 1.5M (Qwen's ideal-run tuning) instead of the spec's 250k.
- A headless bot (written by Qwen) clears the full 7,800 m level with integrity 3 (test-enforced); the level is proven solvable by a checker (also Qwen).
- Wall clock: ~15 h from first line to final fix pass, of which roughly 5 h was wasted on harness flaws and stalls described below (see "What went wrong").

## Model comparison (same harness, tool-calling agent)
| | qwen3-coder:30b (MoE, ~3B active) | qwen3.8:27b (dense) |
|---|---|---|
| Per-call speed | ~10 s/step, 32 tok/s generated | 30-38 tok/s generated once uncontended; steps 5-120 s |
| Behaviour | Fast, makes many small edits, but thrashes: M3 took >4 h, tests and code kept disagreeing, errors went 59 -> 49 in 22 min (trial A) and rose again | Slower per step but converges: same stuck M3 code went 73 -> 3 TS errors and all tests green in ~1 h after one review round |
| Thinking | none | ~60-90% of generated tokens are reasoning even with `think:false` in agent context (flag works in a plain chat, not in a long tool conversation) |
| Verdict | OK for small single-file work; poor at cross-file consistency | Clearly better coder for integration/debugging; use it as default builder |
Trial B/C (qwen3.8 with think off/on, 30 min each) were skipped by the user after trial A; the production run used qwen3.8 think=0 (flag ineffective, see above).

Aggregate (qwen3.8:27b, production run): ~1,150 calls, ~860k generated tokens, ~9.6 h of model time, 25-38 tok/s, prefill 6-25% of wall time once the prompt cache works.

## Milestone timing with qwen3.8:27b (minutes, includes interventions)
M4a 32, M4b2 7, M4c 73, M5a 9, M5b 16, M6a/b ~25 each, M7a 11, M7b 12, M8a 42, M8b 22, M9a 33, M9b 55 (after one restart), M10a ~120 (two restarts), M10b 9, M11 10. Small, well-specified tasks take 7-15 min; integration or "design it yourself" tasks take 1-2 h or stall.

## What went wrong (and the fix) - the useful part
1. **Another client sharing Ollama destroyed throughput.** A second app using `qwen3.8:27b` with Ollama's default 262k context forced reloads (65k vs 262k) and wiped the prompt cache: steps went from ~10 s to 80-365 s. Fix: use the same `num_ctx` (262144) as the default; check `/opt/homebrew/var/log/ollama.log` for `n_ctx_slot` changes and "loaded runners" bursts. Always make sure nothing else talks to the model.
2. **Context compaction every step killed the KV prefix cache** (prefill ~70 s on a 26k prompt). Fix: compact only when the context is large and in one batch.
3. **False "done".** A reply truncated at the 8,192-token output cap while the model was reasoning (no tool call) was counted as "finished"; the gate (lint/test/build) passed vacuously because no files existed. M4 was falsely marked done. Fix: truncation is detected (`done_reason == length`) and answered with a "stop planning, act now" nudge; **every milestone gate now checks required files exist** (`plan.txt`); an empty `npm test` is not a pass.
4. **Big, open-ended milestones stall; small explicit ones don't.** Tasks with a decided design (exact algorithm, API, file order) finished in 7-15 min. Tasks like "integrate the boss" or "write a bot" made the model read the same files for 30-50 min and truncate on 12k-token reasoning. Fix: split milestones, put the decided design in the task text, and add a **read budget**: after 8 consecutive read-only calls the harness injects "your next call must be write_file" (this alone unblocked M10a).
5. **Self-written tests are the main source of thrash.** Qwen's own tests encoded wrong contracts (`toBeCloseTo` precision misuse, holding edge-triggered input across steps). Claude's fix was to state the contract explicitly in the milestone ("pass the action on the first step only, then idle"). After that tests went green in minutes.
6. **Green tests did not mean a working game.** 241 passing tests, yet the first browser run showed a black screen: the canvas was appended below a 100vh div (off-screen), then an over-exposed white-orange haze (bloom threshold, floor emissive), scanline banding, and invisible scenery (dark unlit walls/towers). Unit tests, lint and build cannot see rendering. **Rule: an orchestrator must run the thing in a browser and screenshot it before declaring done**, then hand specific numeric fixes back to the local model (exposure 0.85, bloom threshold 0.75, emissive intensities...). With explicit numbers Qwen fixed the whole look in 10 minutes.
7. Qwen emits some tool calls as text (`<function=...>`); the harness parses these. Qwen sometimes ends with a text-only reply instead of `finish`; the gate decides.
9. **Visual review loop is Claude's job and needs diagnosis, not just 'it looks bad'.** M12 failed because the instruction said 'walls invisible'; reading the code and the screenshot showed the walls were flat teal slabs hiding the sky. M13 with the real diagnosis plus exact numbers (wall height 16 -> 6 m, emissive 0.8 -> 0.35, panel texture) fixed it in one 7-minute pass. Three screenshot rounds (M11-M13) took the game from black screen to the reference look.
8. Qwen3.8 does not actually obey `think:false` inside a long tool-calling context; a short "think at most 3 sentences" system instruction reduced but did not remove it.

## Recommendations for the next local-LLM build
- Claude writes: SPEC with exact constants, per-milestone task files with decided designs and acceptance checks, the harness. Keep milestones to one concern (a file or two) and 10-20 min.
- Harness must have: required-files gate, truncation handling, read budget, cache-friendly compaction, per-call metrics (`CODER_METRICS`), repeated-call detection.
- Use qwen3.8:27b as the builder (ctx 262144, nothing else on Ollama); keep qwen3-coder:30b for quick single-file scripts.
- Pre-write the toolchain scaffold (package.json, tsconfig, vite config) so the model does not burn time on setup.
- Run the app in a browser after every few visual milestones, not only at the end; give the local model concrete screenshots-derived values.
- Ask the model for pure-logic modules + tests first (it does this well: 241 tests), rendering last.
- When a model stalls 30+ min on the same error, stop it and give specific feedback (it works every time) instead of waiting.
