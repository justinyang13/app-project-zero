# M7a — Audio engine and music
Small focused task. Do NOT plan at length: start by writing code immediately, one file at a time, run tests after each file. The full SPEC.md is above; read STATE.md first. Parent milestone description for context: milestones/parents/M7.md (ONLY this sub-task).
Create client/src/audio/AudioEngine.ts (context unlock on first key, master gain, mute M), Music.ts (run/boss tracks from assets/audio, loop, 2 s crossfade at 3700 m, ducking on hit, low-pass on gameover, pause/resume, getBeat() with timer fallback) and pure helper audio/beat.ts with tests. Wire beat pulse into Environment. Must not throw if audio is blocked/missing.
Acceptance: files exist, lint+test+build pass, STATE.md updated, finish.
