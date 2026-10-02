# M5a — Scoring logic
Small focused task. Do NOT plan at length: start by writing code immediately, one file at a time, run tests after each file. The full SPEC.md is above; read STATE.md first. Parent milestone description for context: milestones/parents/M5.md (ONLY this sub-task).
Create client/src/logic/scoring.ts per SPEC §6 (multiplier/streak, all point sources, victory bonus, stars, simulateIdealRun(level)) with scoring.test.ts including the ideal-score vs TARGET_SCORE check; tune bit density/constants in patterns/level until it passes. Integrate: Game tracks score, mult, bits, nearMisses, maxMult; expose via window.__game.
Acceptance: files exist, lint+test+build pass, STATE.md updated, finish.
