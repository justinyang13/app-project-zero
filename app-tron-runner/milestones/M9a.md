# M9a — Cycle mode, rivals, boss logic
Small focused task. Do NOT plan at length: start by writing code immediately, one file at a time, run tests after each file. The full SPEC.md is above; read STATE.md first. Parent milestone description for context: milestones/parents/M9.md (ONLY this sub-task).
Logic: cycle mode in player.ts (hop v0=9, no slide/wall, speed 36, auto transitions at section 4 bounds), rival obstacle + section 4 recipe, logic/boss.ts (phases, telegraph 1.0 s, bolt 70 m/s, hit rule, cores at 6900/7250/7600, overload) + boss.test.ts, section 6 recipe, full 7-section buildLevel() solvable and ideal score in range, duration test: sum(section length/speed) between 255 and 300 s.
Acceptance: files exist, lint+test+build pass, STATE.md updated, finish.
