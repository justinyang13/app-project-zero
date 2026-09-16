# 27 — Risks & Open Questions

Every non-trivial spec has places where a decision was made under
uncertainty, or where a real tension exists between two things this
project wants. Surfacing those explicitly here — rather than letting them
hide as an unstated assumption inside some other chapter — is meant to
save an implementer from re-discovering them the hard way mid-build.

## 1. Technical risks

### 1.1 JS/TS meshing performance may not hit budget on low-end hardware

[01 — Tech Stack & Architecture](01-tech-stack-architecture.md) §6 and
[15 — Performance](15-performance.md) §1 both assume the TypeScript
greedy-meshing implementation, run in a worker, is fast enough on
2018–2020-era integrated GPUs. This is a reasonable bet (the algorithm is
well-understood and TypeScript with typed arrays can get close to native
speed for this workload) but it's untested until real profiling happens
against real hardware. **Mitigation already in the spec:** the WASM
upgrade path (§6 of chapter 01) exists specifically as the fallback, and
the worker message-passing boundary is designed so swapping in a WASM
implementation later doesn't require touching any calling code — this
risk is acknowledged and pre-mitigated, not ignored, but it is not
*eliminated* by the spec, only made cheap to respond to.

### 1.2 IndexedDB behavior varies meaningfully across browsers

[14 — Persistence & Saves](14-persistence-saves.md) and
[21 — Deployment & DevOps](21-deployment-devops.md) §5 both note Safari's
historically stricter/different IndexedDB quota and eviction behavior
(particularly around Intelligent Tracking Prevention potentially
affecting storage persistence for a site visited infrequently). A
player who doesn't return to SimCraft for a long period on Safari is a
plausible scenario for unexpected data eviction that wouldn't occur on
Chrome/Firefox. **Mitigation already in the spec:** the
`navigator.storage.persist()` request (§7 of chapter 14) and the
explicit Export flow are both direct responses to this risk, but neither
fully eliminates it — this is flagged as a known cross-browser edge case
worth extra manual QA attention (§5 of
[20 — Testing & QA](20-testing-qa.md)) rather than a solved problem.

### 1.3 Chunk-diff storage could still grow large in a heavily-built, long-running world

The sparse-diff-vs-full-array storage choice in
[14 — Persistence & Saves](14-persistence-saves.md) §2 keeps storage cost
proportional to *edits*, not world size — but a genuinely long-running,
heavily-built single world (many hours of terraforming, large builds)
will still accumulate real storage over time, and there's no currently
specced mechanism for the game to warn a player *proactively* as a
specific world's save approaches a size that risks browser quota
pressure (only the general Settings → Storage visibility from §7 of the
same chapter, which requires the player to go looking). **Open
question:** whether a per-world storage-size warning threshold (e.g. a
toast the first time a single world's save crosses some size, prompting
an export-as-backup suggestion) is worth adding — left as a candidate
for [22 — Roadmap & Milestones](22-roadmap-milestones.md) Phase 5 polish
rather than specced with a concrete threshold now, since the right
threshold depends on real-world save-size data this spec doesn't have
yet.

## 2. Design tensions

### 2.1 Auto-mine-similar and other QoL toggles vs. "manual feel"

[05 — Player Mechanics](05-player-mechanics.md) §4 and
[16 — Controls & Accessibility](16-controls-accessibility.md) §4 both
specify convenience toggles (auto-mine-similar, toggle-vs-hold sprint)
as off-by-default opt-ins specifically to avoid diluting the genre's
traditionally manual, tactile feel for players who want that — but this
is a judgment call, not a settled question. A future playtesting pass
might find the opt-in default itself is the wrong choice (e.g. if most
players who'd benefit from a QoL toggle never find it in Settings). This
is flagged rather than resolved because it's fundamentally a
playtesting question, not something resolvable from the design desk
alone.

### 2.2 Stamina's pacing value vs. its "one more system to learn" cost

The genre-original Stamina mechanic
([05 — Player Mechanics](05-player-mechanics.md) §3) is justified in
[26 — Genre Analysis](26-genre-analysis.md) §7 as pure upside in a
single-player context, but "pure upside" only holds if it's tuned
lightly enough to be barely noticed by players who aren't sprint-
spamming — if playtesting shows it reads as an annoying extra bar to
manage rather than an invisible soft-pacing nudge, the spec's fallback
position (stated in [07 — Survival Systems](07-survival-systems.md) §7)
of disabling it entirely on Peaceal/Creative and tuning its drain rate
conservatively should be leaned on further, up to and including cutting
it from non-Hard difficulties if it doesn't earn its complexity in
practice.

### 2.3 Pre-built Logic Gates vs. discovery-driven design purism

[09 — Logic & Automation](09-redstone-automation.md) §3 explicitly
departs from genre-baseline purism by shipping pre-built Gate items,
justified in [26 — Genre Analysis](26-genre-analysis.md) §5 and §7 as an
accessibility win that doesn't remove the underlying general system. A
reasonable counter-position exists: that *rediscovering* boolean logic
from raw wire primitives is itself a celebrated part of the genre's
appeal for the automation-focused subset of players, and pre-built Gates
could be seen as spoiling that specific discovery moment. The spec's
resolution (requiring a one-time demonstrated raw-wiring unlock before
Gates become craftable, per §3 of chapter 09) is a compromise, not a
proof that the tension is fully resolved — noted here so a future
revision has the reasoning available if this needs revisiting.

### 2.4 How much combat depth is "secondary" without becoming an afterthought

[00 — Vision & Scope](00-vision-and-scope.md) §4 is explicit that combat
is not a pillar, but a full creature catalog, weapon variety (Blade/
Spear/Longshot/Sling), and a mini-boss (Voidmaw Lurker) all exist in
this spec — which is a meaningfully complete combat system by most
measures, even while being explicitly positioned as secondary to
building. **Open question:** whether the current scope undershoots or
overshoots "secondary but not an afterthought" — this can really only be
judged once Phase 4/5 content (
[22 — Roadmap & Milestones](22-roadmap-milestones.md)) is playable
end-to-end, not from the spec alone.

## 3. Scope risks

### 3.1 The ~420-block, ~200-item, 28-biome, 20+-creature content volume is a lot for a solo/small build

This spec's content tables (chapters 02–04, 08) enumerate genre-typical
content *volume*, which is substantial — a solo implementer (or a small
AI-assisted effort) building every enumerated block, biome, and creature
to full polish is a real, multi-phase undertaking, honestly reflected in
[22 — Roadmap & Milestones](22-roadmap-milestones.md)'s six-phase
structure rather than hidden. **Mitigation already in the spec:** each
phase in that roadmap has its own concrete acceptance criterion and is
independently playable, specifically so the project has value at every
checkpoint rather than requiring full completion before anything is
"done" — an implementer who only completes through Phase 2 still has a
complete, playable survival-loop game, not an unfinished fragment.

### 3.2 Original-asset production (art, audio) is scoped but not detailed as a production plan

[18 — Visual & Art Direction](18-visual-art-direction.md) §5 acknowledges
that hand-authoring ~420 blocks' worth of original 16×16px textures (plus
creature models and a full sound catalog per
[13 — Audio](13-audio.md)) is a real production cost this spec doesn't
fully solve — it offers the procedural/parameterized production
shortcut as a mitigation but doesn't provide a detailed asset-production
schedule or budget. This is intentional scope-boundary discipline (a
design/engineering spec is not an art production plan) but is flagged
here so it isn't mistaken for solved.

### 3.3 Modding API (chapter 19) sandboxing claims need real security review before shipping

[19 — Modding & Scripting API](19-modding-api.md) describes a Worker-
based sandbox with no network/DOM access as the safety boundary for
running untrusted community scripts — this is a sound *starting*
architecture, but the chapter's own framing as a "furthest-out stretch
goal" (§4) is deliberate: actually shipping arbitrary untrusted script
execution, even sandboxed, warrants a dedicated security review pass
before release that is out of scope for this spec to perform. **This
system should not ship without that review, regardless of how far along
the rest of the roadmap is.**

## 4. What would change this spec

Concretely, the kinds of new information that should trigger a revision
pass rather than being absorbed silently: real performance profiling
data that contradicts §1.1's assumption; real playtesting feedback on
§2.1–2.4's open design tensions; and any decision to actually pursue
multiplayer, cloud save, or monetization, each of which is currently
excluded by [00 — Vision & Scope](00-vision-and-scope.md) §4 specifically
*because* they weren't part of this project's brief — reintroducing any
of them isn't a small addition to this spec, it's a different project
brief, and would warrant treating this document as a v1 baseline to
branch from rather than a document to edit in place.
