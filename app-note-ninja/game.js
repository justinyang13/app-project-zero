'use strict';

/* ===================== NOTE DATA ===================== */

const CHROMATIC = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const NATURAL = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];

const DIFFICULTY = {
  easy: {
    label: 'Natural notes only, one comfortable octave.',
    chromatic: false,
    octaves: [4],
  },
  medium: {
    label: 'Natural notes, spread across three octaves.',
    chromatic: false,
    octaves: [3, 4, 5],
  },
  hard: {
    label: 'Sharps & flats included, across three octaves.',
    chromatic: true,
    octaves: [3, 4, 5],
  },
};

const MASCOTS = {
  idle: '🐱',
  happy: '😻',
  sad: '🙀',
  excited: '🎉',
};

/* ===================== STATE ===================== */

const state = {
  mode: 1,
  difficulty: 'easy',
  roundsPerPlayer: 10,
  players: [
    { name: 'Player 1', score: 0, streak: 0 },
    { name: 'Player 2', score: 0, streak: 0 },
  ],
  turnCount: 0,
  totalTurns: 10,
  currentNote: null, // { name, midi }
  answered: false,
  audioCtx: null,
};

/* ===================== AUDIO ===================== */

function getAudioCtx() {
  if (!state.audioCtx) {
    state.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (state.audioCtx.state === 'suspended') {
    state.audioCtx.resume();
  }
  return state.audioCtx;
}

function midiToFreq(midi) {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

function playTone(midi, duration = 1.3) {
  const ctx = getAudioCtx();
  const freq = midiToFreq(midi);
  const now = ctx.currentTime;

  const master = ctx.createGain();
  master.gain.setValueAtTime(0, now);
  master.gain.linearRampToValueAtTime(0.35, now + 0.015);
  master.gain.exponentialRampToValueAtTime(0.09, now + 0.35);
  master.gain.exponentialRampToValueAtTime(0.0001, now + duration);
  master.connect(ctx.destination);

  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = freq * 6;
  filter.connect(master);

  const harmonics = [
    { mult: 1, type: 'triangle', gain: 1 },
    { mult: 2, type: 'sine', gain: 0.25 },
    { mult: 3, type: 'sine', gain: 0.12 },
  ];

  harmonics.forEach((h) => {
    const osc = ctx.createOscillator();
    osc.type = h.type;
    osc.frequency.value = freq * h.mult;
    const g = ctx.createGain();
    g.gain.value = h.gain;
    osc.connect(g);
    g.connect(filter);
    osc.start(now);
    osc.stop(now + duration + 0.05);
  });
}

function pickRandomNote() {
  const config = DIFFICULTY[state.difficulty];
  const pool = config.chromatic ? CHROMATIC : NATURAL;
  const name = pool[Math.floor(Math.random() * pool.length)];
  const octave = config.octaves[Math.floor(Math.random() * config.octaves.length)];
  const noteIndex = CHROMATIC.indexOf(name);
  const midi = (octave + 1) * 12 + noteIndex;
  return { name, midi };
}

/* ===================== DOM REFS ===================== */

const screens = {
  menu: document.getElementById('screen-menu'),
  game: document.getElementById('screen-game'),
  results: document.getElementById('screen-results'),
};

const el = {
  modeToggle: document.getElementById('mode-toggle'),
  namesGroup: document.getElementById('names-group'),
  p2Label: document.getElementById('p2-label'),
  p1Name: document.getElementById('p1-name'),
  p2Name: document.getElementById('p2-name'),
  difficultyToggle: document.getElementById('difficulty-toggle'),
  difficultyHint: document.getElementById('difficulty-hint'),
  roundsToggle: document.getElementById('rounds-toggle'),
  startBtn: document.getElementById('start-btn'),

  scoreboard: document.getElementById('scoreboard'),
  roundCounter: document.getElementById('round-counter'),
  turnBanner: document.getElementById('turn-banner'),
  gameMascot: document.getElementById('game-mascot'),
  replayBtn: document.getElementById('replay-btn'),
  anchorBtn: document.getElementById('anchor-btn'),
  feedback: document.getElementById('feedback'),
  piano: document.getElementById('piano'),
  nextBtn: document.getElementById('next-btn'),

  resultsTitle: document.getElementById('results-title'),
  resultsBody: document.getElementById('results-body'),
  playAgainBtn: document.getElementById('play-again-btn'),

  confettiLayer: document.getElementById('confetti-layer'),
  menuMascot: document.getElementById('menu-mascot'),
};

/* ===================== MENU SETUP ===================== */

el.modeToggle.addEventListener('click', (e) => {
  const btn = e.target.closest('.pill');
  if (!btn) return;
  [...el.modeToggle.children].forEach((c) => c.classList.remove('active'));
  btn.classList.add('active');
  state.mode = Number(btn.dataset.mode);
  el.namesGroup.style.display = state.mode === 2 ? '' : 'none';
  el.p2Label.style.display = state.mode === 2 ? '' : 'none';
  el.p2Name.style.display = state.mode === 2 ? '' : 'none';
});
// initialize: 1-player mode hides player 2 fields
el.p2Label.style.display = 'none';
el.p2Name.style.display = 'none';

el.difficultyToggle.addEventListener('click', (e) => {
  const btn = e.target.closest('.pill');
  if (!btn) return;
  [...el.difficultyToggle.children].forEach((c) => c.classList.remove('active'));
  btn.classList.add('active');
  state.difficulty = btn.dataset.difficulty;
  el.difficultyHint.textContent = DIFFICULTY[state.difficulty].label;
});

el.roundsToggle.addEventListener('click', (e) => {
  const btn = e.target.closest('.pill');
  if (!btn) return;
  [...el.roundsToggle.children].forEach((c) => c.classList.remove('active'));
  btn.classList.add('active');
  state.roundsPerPlayer = Number(btn.dataset.rounds);
});

el.startBtn.addEventListener('click', () => {
  getAudioCtx(); // unlock audio on user gesture

  state.players[0].name = el.p1Name.value.trim() || 'Player 1';
  state.players[1].name = el.p2Name.value.trim() || 'Player 2';
  state.players.forEach((p) => { p.score = 0; p.streak = 0; });
  state.turnCount = 0;
  state.totalTurns = state.roundsPerPlayer * state.mode;

  buildPiano();
  showScreen('game');
  startTurn();
});

/* ===================== PIANO BUILD ===================== */

function buildPiano() {
  el.piano.innerHTML = '';
  const chromatic = DIFFICULTY[state.difficulty].chromatic;

  const whiteContainer = document.createElement('div');
  whiteContainer.style.display = 'flex';
  whiteContainer.style.gap = '4px';
  el.piano.appendChild(whiteContainer);

  NATURAL.forEach((name) => {
    const key = document.createElement('button');
    key.className = 'key white';
    key.dataset.note = name;
    key.textContent = name;
    key.addEventListener('click', () => handleAnswer(name));
    whiteContainer.appendChild(key);
  });

  if (chromatic) {
    // black keys positioned between the relevant white keys
    const blackAfter = { 'C': 'C#', 'D': 'D#', 'F': 'F#', 'G': 'G#', 'A': 'A#' };
    const whiteKeyWidth = 48;
    const gap = 4;
    let index = 0;
    NATURAL.forEach((name) => {
      if (blackAfter[name]) {
        const sharp = blackAfter[name];
        const key = document.createElement('button');
        key.className = 'key black';
        key.dataset.note = sharp;
        key.textContent = sharp;
        const leftPos = (index + 1) * (whiteKeyWidth + gap) - 15 - gap / 2;
        key.style.left = `${leftPos}px`;
        key.addEventListener('click', (ev) => { ev.stopPropagation(); handleAnswer(sharp); });
        el.piano.appendChild(key);
      }
      index++;
    });
  }
}

/* ===================== GAME FLOW ===================== */

function currentPlayerIndex() {
  return state.turnCount % state.mode;
}

function startTurn() {
  state.answered = false;
  state.currentNote = pickRandomNote();

  const roundNum = Math.floor(state.turnCount / state.mode) + 1;
  el.roundCounter.textContent = `Round ${roundNum} / ${state.roundsPerPlayer}`;

  const pIndex = currentPlayerIndex();
  const player = state.players[pIndex];

  el.turnBanner.textContent = state.mode === 2
    ? `🎧 ${player.name}'s turn — listen up!`
    : `🎧 Listen closely...`;

  renderScoreboard();
  setMascot('idle');
  el.feedback.textContent = '';
  el.feedback.className = 'feedback';
  el.nextBtn.classList.add('hidden');
  clearKeyStates();
  setKeysEnabled(true);

  setTimeout(() => playTone(state.currentNote.midi), 300);
}

function renderScoreboard() {
  el.scoreboard.innerHTML = '';
  const activeIdx = currentPlayerIndex();
  const playersToShow = state.mode === 2 ? state.players : [state.players[0]];
  playersToShow.forEach((p, i) => {
    const chip = document.createElement('div');
    chip.className = 'score-chip' + (state.mode === 2 && i === activeIdx ? ' active-turn' : '');
    chip.textContent = `${p.name}: ${p.score}${p.streak >= 3 ? ' 🔥' : ''}`;
    el.scoreboard.appendChild(chip);
  });
}

function setKeysEnabled(enabled) {
  el.piano.querySelectorAll('.key').forEach((k) => { k.disabled = !enabled; });
}

function clearKeyStates() {
  el.piano.querySelectorAll('.key').forEach((k) => {
    k.classList.remove('reveal-correct', 'reveal-wrong');
  });
}

function setMascot(kind) {
  el.gameMascot.textContent = MASCOTS[kind] || MASCOTS.idle;
}

el.replayBtn.addEventListener('click', () => {
  if (state.currentNote) playTone(state.currentNote.midi);
});

el.anchorBtn.addEventListener('click', () => {
  playTone(60, 1.0); // Middle C = MIDI 60
});

function handleAnswer(guessName) {
  if (state.answered) return;
  state.answered = true;
  setKeysEnabled(false);

  const correctName = state.currentNote.name;
  const isCorrect = guessName === correctName;
  const pIndex = currentPlayerIndex();
  const player = state.players[pIndex];

  const guessedKey = el.piano.querySelector(`.key[data-note="${guessName}"]`);
  const correctKey = el.piano.querySelector(`.key[data-note="${correctName}"]`);

  if (isCorrect) {
    player.score += 1;
    player.streak += 1;
    if (guessedKey) guessedKey.classList.add('reveal-correct');
    el.feedback.textContent = pickCorrectPhrase(player.streak);
    el.feedback.className = 'feedback correct';
    setMascot('happy');
    burstConfetti();
  } else {
    player.streak = 0;
    if (guessedKey) guessedKey.classList.add('reveal-wrong');
    if (correctKey) correctKey.classList.add('reveal-correct');
    el.feedback.textContent = `Close! That was ${correctName}. You'll get the next one! 💪`;
    el.feedback.className = 'feedback wrong';
    setMascot('sad');
  }

  renderScoreboard();
  el.nextBtn.classList.remove('hidden');
}

function pickCorrectPhrase(streak) {
  if (streak >= 5) return `🔥 ${streak} in a row! You're a Note Ninja!`;
  if (streak >= 3) return `🎵 Nice streak! (${streak} in a row)`;
  const phrases = ['✨ Correct!', '🎯 Nailed it!', '⭐ Great ear!', '🥳 Yes!'];
  return phrases[Math.floor(Math.random() * phrases.length)];
}

el.nextBtn.addEventListener('click', () => {
  state.turnCount += 1;
  if (state.turnCount >= state.totalTurns) {
    showResults();
  } else {
    startTurn();
  }
});

/* ===================== RESULTS ===================== */

function showResults() {
  showScreen('results');

  if (state.mode === 1) {
    const p = state.players[0];
    const total = state.totalTurns;
    const pct = Math.round((p.score / total) * 100);
    el.resultsTitle.textContent = pct >= 80 ? '🏆 Amazing Ears! 🏆' : '🎉 Great Job! 🎉';
    el.resultsBody.innerHTML = `
      <div>${p.name} scored</div>
      <div style="font-size:2.2rem;font-weight:800;">${p.score} / ${total}</div>
      <div>(${pct}% correct)</div>
    `;
  } else {
    const [p1, p2] = state.players;
    el.resultsTitle.textContent = '🎉 Game Over! 🎉';
    let winnerLine;
    if (p1.score === p2.score) {
      winnerLine = `🤝 It's a tie! You're both Note Ninjas!`;
    } else {
      const winner = p1.score > p2.score ? p1 : p2;
      winnerLine = `🏆 ${winner.name} wins!`;
    }
    el.resultsBody.innerHTML = `
      <div>${p1.name}: <strong>${p1.score}</strong> / ${state.roundsPerPlayer}</div>
      <div>${p2.name}: <strong>${p2.score}</strong> / ${state.roundsPerPlayer}</div>
      <div class="winner-line">${winnerLine}</div>
    `;
  }

  burstConfetti(40);
}

el.playAgainBtn.addEventListener('click', () => {
  showScreen('menu');
});

/* ===================== CONFETTI ===================== */

function burstConfetti(count = 18) {
  const emojis = ['✨', '🎉', '🌟', '💖', '🎈'];
  for (let i = 0; i < count; i++) {
    const piece = document.createElement('div');
    piece.className = 'confetti-piece';
    piece.textContent = emojis[Math.floor(Math.random() * emojis.length)];
    piece.style.left = `${Math.random() * 100}%`;
    piece.style.animationDuration = `${1.2 + Math.random() * 1.2}s`;
    piece.style.fontSize = `${1 + Math.random() * 1.2}rem`;
    el.confettiLayer.appendChild(piece);
    setTimeout(() => piece.remove(), 2600);
  }
}

/* ===================== UTIL ===================== */

function showScreen(name) {
  Object.values(screens).forEach((s) => s.classList.add('hidden'));
  screens[name].classList.remove('hidden');
}
