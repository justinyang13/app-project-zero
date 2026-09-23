# SimCraft — hybrid build workflow

How this project is built using two agents on one clone: **Claude Code**
(cloud, Sonnet) as planner and reviewer for hard work, and **OpenCode +
a local LLM** (Mac Studio, Qwen3.8-27B) as the executor for routine work.
This is a process document — see [`ARCHITECTURE.md`](ARCHITECTURE.md) for
what the code does, and [`spec/`](spec/) for the design intent.

## Why split the work

Claude Code sessions on this project run long: an average context of
~355K tokens, some over 900K, because each session tends to bundle
several features before compacting. A local 27B model can't hold that
much context usefully and reasons less reliably across many files, but
it's free to run and doesn't count against usage limits. The split plays
each system to its strength:

- **Claude Code decides.** Architecture, anything touching the mesher,
  the workers, the shaders or persistence, coordinate-system reasoning,
  debugging, and design judged by eye (does this look right against the
  reference image).
- **OpenCode + local model executes.** Well-scoped, single-purpose steps
  against a plan someone else already wrote.

## Hardware and model

- **Machine:** Mac Studio, M5 Max, 64GB unified memory (614GB/s
  bandwidth).
- **Model:** Qwen3.8-27B (Apache 2.0, 262,144-token native context),
  served locally via MLX or llama.cpp at Q4 (~18GB weights).
- **Context budget:** cap sessions around 64–128K tokens. That's roughly
  8GB of KV cache at fp16 — leaves headroom under the ~56GiB practical
  model budget on this machine. Going toward the 262K native ceiling is
  possible but slow (prefill on comparable Apple Silicon chips runs
  roughly 90–190 tok/s) and untested here.
- **Harness:** OpenCode, pointed at the local server's OpenAI-compatible
  endpoint.

These are working assumptions, not measured on this exact machine —
recalibrate after the first week of real use (see **Escalation** below).

## Task complexity tiers

Triage every feature before starting. Use the git history as the
calibration: the dark castle (23 files, ~2.7K lines, a new render layer,
new lighting model, coordinate traps, cross-cutting solidity checks) is
the canonical "hardest tier" example.

| Tier | Route | Examples from this repo |
|---|---|---|
| **Hardest** — new architecture, cross-cutting invariants, design judged visually | Claude plans and splits into steps; Claude or close review on each step | Dark castle, 60fps light pool, cloud sync protocol, the original world sandbox |
| **Middle** — real logic, but scoped to a known area | Local executes against a written plan | Transparent water, winding road + bridge, rideable mounts, village/mountain generation |
| **Easy** — follows an existing pattern, single file or two | Local, no plan needed | New block textures, new tree species, HUD panels, hotkeys, minimap controls, CI/config fixes |

When in doubt, route up a tier. Rework from a wrong local attempt costs
more than the tokens saved.

## Repo setup for two tools on one clone

Both tools are just processes editing the working tree; git is the
shared state. Rules:

1. **Don't run both against the same working tree at once.** Use a git
   worktree per tool for anything that might overlap:

   ```bash
   git worktree add ../Project-Zero-local -b local/<feature-name>
   ```

   Claude Code works the main clone; OpenCode works the worktree. Each
   worktree needs its own `npm install` and dev-server port. Merge
   through git.

2. **One instructions file, two entry points.** OpenCode reads
   `AGENTS.md`; Claude Code reads `CLAUDE.md`. Keep the actual content in
   `AGENTS.md` and have `CLAUDE.md` import it, so the traps below live in
   one place and can't drift out of sync.

3. **Commit after every gate pass**, from either tool, so the other can
   always pick up from a known-good point.

## The traps (put these in `AGENTS.md`)

Learned the hard way while building the castle and the rest of the
world — a local model without this list will rediscover them by
breaking something:

- **Block IDs are append-only.** They're persisted in save data; never
  renumber or reuse one.
- **Solidity is checked in three places**: player collision, the
  raycaster, and creature/fish movement. Use `isSolidBlock`, and update
  all three or none.
- **Coordinates**: cells vs. cell-boundary floats are different things.
  The castle plan is symmetric about cell `c ↔ -c` — get this backwards
  and placements mirror wrong.
- **Each worker thread builds its own copy** of generated structures
  (e.g. the castle plan) — don't assume state built on the main thread
  is visible in a worker.
- **`erasableSyntaxOnly` is on** — no constructor parameter properties;
  declare fields explicitly.
- **Don't reload the dev server repeatedly** while testing in the
  browser — Chrome will block WebGL on the page ("context loss") after
  enough reloads. Navigate away and back to recover.
- **`npm run lint && npm test && npm run build` is the gate** — run it
  before considering any step done, local or Claude.

## Per-feature loop

1. **Triage** into a tier (above).
2. **Ticket** — a short file: goal, files likely touched, how to verify,
   what's explicitly out of scope. For hardest-tier work, Claude writes
   this as a step-by-step plan instead of a single ticket.
3. **One step per session.** A step is commit-sized: 3–5 files, one
   gate pass, one commit. Don't let a session run long enough to need
   mid-session compaction — that's a signal the step was too big.
4. **Gate every step**:

   ```bash
   npm run lint && npm test && npm run build
   ```

5. **Visual checks are manual.** Run the dev server yourself and give
   concrete feedback ("banner sits two blocks too high"), rather than
   looping a tool through repeated screenshots — see the WebGL trap
   above.
6. **Leave notes before clearing context.** A line in `WISHLIST.md`'s
   Shipped section or a new trap in `AGENTS.md`. This is what actually
   carries across a context reset — nothing else does.

## Escalation — send it to Claude when

- The same failure survives two local attempts.
- The diff touches more files than the ticket named.
- The work reaches into the mesher, workers, shaders, or persistence
  layer.
- It needs profiling (e.g. the light-pool 60fps work) rather than a
  direct fix.
- It's genuinely hardest-tier and was mis-triaged.

## Known gaps in this workflow

- Local-model context caps (~262K native, budgeted much lower here in
  practice) mean it cannot hold a whole hardest-tier feature the way a
  single long Claude session has — hence the plan-then-execute split
  rather than "give the local model the same prompt."
- No screenshot-in-the-loop verification is assumed for the local tool;
  confirm your OpenCode + server setup actually passes images through
  before relying on it for visual work.
- Token/speed figures above are drawn from public benchmarks and
  third-party measurements on comparable (not identical) hardware, not
  from profiling this machine — treat them as a starting point.
