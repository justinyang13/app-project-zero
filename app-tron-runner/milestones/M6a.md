# M6a — HUD
Small focused task. Do NOT plan at length: start by writing code immediately, one file at a time, run tests after each file. The full SPEC.md is above; read STATE.md first. Parent milestone description for context: milestones/parents/M6.md (ONLY this sub-task).
Create client/src/ui/Hud.ts + ui/styles.css (score count-up, TARGET, progress bar + section name, multiplier SVG ring, integrity pips, contextual prompt panel, floating popups max 4, section banners, ?debug=1 fps/draw calls/triangles) and ui/prompts.ts (pure prompt selection logic) with prompts.test.ts. Hook score events, hit flash and section changes. Chamfered neon styling per SPEC §7.
Acceptance: files exist, lint+test+build pass, STATE.md updated, finish.
