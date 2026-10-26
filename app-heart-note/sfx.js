// Tiny Web Audio synth: a cute sound for every gift. No audio files needed.
const Sfx = (() => {
  let ctx = null, on = true;
  try { on = localStorage.getItem("heartnote-sound") !== "off"; } catch {}
  let master = null;
  const get = () => {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return null; ctx = new AC();
      // everything goes through a soft low-pass and a gentle limiter so nothing sounds sharp or snappy
      const lp = ctx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 3200; lp.Q.value = 0.4;
      const g = ctx.createGain(); g.gain.value = 0.75;
      lp.connect(g);
      if (ctx.createDynamicsCompressor) { const comp = ctx.createDynamicsCompressor(); g.connect(comp); comp.connect(ctx.destination); }
      else g.connect(ctx.destination);
      master = lp;
    }
    if (ctx.state === "suspended") ctx.resume();
    return ctx;
  };
  const tone = (f, t0, dur, { type = "sine", vol = 0.2, to = null, vib = 0 } = {}) => {
    const c = get(); if (!c || !on) return;
    const o = c.createOscillator(), g = c.createGain(), t = c.currentTime + t0;
    o.type = type; o.frequency.setValueAtTime(f, t);
    if (to) o.frequency.exponentialRampToValueAtTime(to, t + dur);
    if (vib) { const l = c.createOscillator(), lg = c.createGain(); l.frequency.value = vib; lg.gain.value = f * 0.04; l.connect(lg); lg.connect(o.frequency); l.start(t); l.stop(t + dur + 0.05); }
    const v = type === "square" ? vol * 0.45 : type === "sawtooth" ? vol * 0.6 : vol;
    const atk = Math.min(0.03, dur * 0.35);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v, t + atk);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(master || c.destination); o.start(t); o.stop(t + dur + 0.05);
  };
  const noise = (t0, dur, { f = 2000, q = 1, type = "bandpass", vol = 0.2, to = null } = {}) => {
    const c = get(); if (!c || !on) return;
    const n = Math.floor(c.sampleRate * dur), buf = c.createBuffer(1, n, c.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    const s = c.createBufferSource(), fl = c.createBiquadFilter(), g = c.createGain(), t = c.currentTime + t0;
    const cap = type === "highpass" ? 2500 : 3600;
    s.buffer = buf; fl.type = type; fl.Q.value = Math.min(q, 1.5); fl.frequency.setValueAtTime(Math.min(f, cap), t);
    if (to) fl.frequency.exponentialRampToValueAtTime(Math.min(to, cap), t + dur);
    const atk = Math.min(0.025, dur * 0.4), v = vol * 0.55;
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(v, t + atk); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(fl); fl.connect(g); g.connect(master || c.destination); s.start(t);
  };
  const seq = (notes, step, opt) => notes.forEach((f, i) => tone(f, i * step, step * 2.2, opt));

  const sounds = {
    tear: () => { noise(0, 0.28, { f: 900, to: 5000, q: 0.8, vol: 0.25 }); tone(140, 0, 0.12, { type: "triangle", vol: 0.2, to: 60 }); },
    arrive: () => tone(330, 0, 0.18, { type: "sine", vol: 0.16, to: 760 }),
    scroll: () => { [0, 0.07, 0.15].forEach(t => noise(t, 0.09, { f: 3200, q: 2, vol: 0.12 })); seq([784, 1175], 0.14, { vol: 0.12 }); },
    giftbox: () => seq([523, 659, 784, 1047], 0.09, { type: "triangle", vol: 0.16 }),
    heart: () => { [0, 0.24].forEach(t => { tone(95, t, 0.16, { vol: 0.35, to: 48 }); tone(85, t + 0.1, 0.14, { vol: 0.25, to: 45 }); }); },
    star: () => seq([1319, 1568, 1976, 2637], 0.07, { vol: 0.1 }),
    balloon: () => { tone(380, 0, 0.18, { vol: 0.14, to: 900 }); noise(0.2, 0.09, { f: 1200, type: "highpass", vol: 0.45 }); },
    flower: () => { tone(659, 0, 0.9, { vol: 0.14 }); tone(988, 0.04, 0.8, { vol: 0.08 }); },
    cookie: () => [0, 0.11, 0.24].forEach(t => noise(t, 0.06, { f: 2600 + Math.random() * 900, q: 3, vol: 0.4 })),
    cupcake: () => { tone(180, 0, 0.45, { type: "sine", vol: 0.25, to: 520, vib: 14 }); tone(1568, 0.4, 0.4, { vol: 0.08 }); },
    icecream: () => tone(950, 0, 0.55, { type: "triangle", vol: 0.16, to: 170, vib: 18 }),
    teddy: () => { tone(540, 0, 0.5, { type: "triangle", vol: 0.16, vib: 5 }); tone(430, 0.32, 0.6, { type: "triangle", vol: 0.16, vib: 5 }); },
    rainbow: () => { tone(300, 0, 0.9, { vol: 0.14, to: 1500 }); tone(1500, 0.85, 0.6, { vol: 0.08 }); },
    sun: () => [261, 329, 392].forEach(f => tone(f, 0, 1.0, { type: "triangle", vol: 0.13 })),
    moon: () => seq([523, 440, 392], 0.32, { vol: 0.12 }),
    butterfly: () => tone(1500, 0, 0.7, { type: "sine", vol: 0.1, vib: 28, to: 1800 }),
    duck: () => [0, 0.2].forEach(t => tone(430, t, 0.14, { type: "sawtooth", vol: 0.1, to: 250 })),
    mug: () => { noise(0, 0.35, { f: 400, to: 1400, type: "lowpass", vol: 0.25 }); tone(330, 0.36, 0.45, { type: "triangle", vol: 0.1, to: 280 }); },
    gem: () => { tone(2093, 0, 1.1, { vol: 0.1 }); tone(3136, 0.02, 0.8, { vol: 0.06 }); },
    lollipop: () => tone(500, 0, 0.7, { vol: 0.14, to: 1800, vib: 10 }),
    cloud: () => { for (let i = 0; i < 10; i++) noise(i * 0.07, 0.04, { f: 4500, q: 4, vol: 0.2 }); tone(220, 0, 0.7, { type: "sine", vol: 0.06 }); }
  };

  // object-specific sounds for the feeling-specific gifts: each imitates the real thing
  const rep = (n, gap, fn) => { for (let i = 0; i < n; i++) fn(i * gap, i); };
  const themed = {
    // sad
    umbrella: () => { noise(0, 0.14, { f: 500, to: 2600, q: 0.7, vol: 0.25 }); tone(120, 0.14, 0.12, { vol: 0.3, to: 70 }); rep(7, 0.06, t => noise(0.3 + t, 0.03, { f: 5200, q: 3, vol: 0.12 })); },
    tissues: () => { noise(0, 0.2, { f: 3200, to: 700, type: "lowpass", vol: 0.22 }); tone(620, 0.18, 0.06, { vol: 0.14, to: 300 }); },
    candle: () => { noise(0, 0.12, { f: 3500, type: "highpass", vol: 0.3 }); rep(5, 0.07, t => noise(0.18 + t, 0.03, { f: 1800 + Math.random() * 1500, q: 2, vol: 0.08 })); tone(392, 0.3, 0.7, { vol: 0.06 }); },
    raindrop: () => rep(3, 0.16, (t, i) => tone(900 - i * 150, t, 0.12, { vol: 0.18, to: 380 - i * 40 })),
    blanket: () => { noise(0, 0.35, { f: 500, to: 900, type: "lowpass", vol: 0.25 }); tone(180, 0.1, 0.8, { type: "triangle", vol: 0.06, vib: 5 }); },
    book: () => { noise(0, 0.18, { f: 1500, to: 6000, type: "highpass", vol: 0.2 }); rep(3, 0.07, t => noise(0.2 + t, 0.06, { f: 3000, q: 1.5, vol: 0.1 })); },
    // anxious
    feather: () => { noise(0, 0.7, { f: 4200, q: 0.5, vol: 0.05 }); tone(1568, 0.1, 0.6, { vol: 0.04 }); tone(2093, 0.35, 0.5, { vol: 0.03 }); },
    lavender: () => { noise(0, 0.5, { f: 2200, to: 1200, q: 0.6, vol: 0.05 }); [523, 659, 784].forEach((f, i) => tone(f, 0.05 + i * 0.12, 0.9, { vol: 0.07 })); },
    zenstones: () => rep(3, 0.2, (t, i) => { noise(t, 0.05, { f: 1100 + i * 250, q: 6, vol: 0.4 }); tone(180 + i * 40, t, 0.08, { type: "triangle", vol: 0.15 }); }),
    compass: () => { rep(7, 0.07, t => tone(2400, t, 0.02, { type: "square", vol: 0.05 })); tone(1568, 0.55, 0.9, { vol: 0.1 }); },
    wave: () => { noise(0, 1.0, { f: 300, to: 1800, type: "lowpass", vol: 0.3 }); noise(0.9, 0.9, { f: 1800, to: 250, type: "lowpass", vol: 0.25 }); },
    hourglass: () => { noise(0, 0.8, { f: 5200, type: "highpass", q: 0.4, vol: 0.07 }); tone(2637, 0.85, 0.5, { vol: 0.05 }); },
    // angry
    pillow: () => { tone(85, 0, 0.2, { type: "sine", vol: 0.4, to: 45 }); noise(0, 0.12, { f: 400, type: "lowpass", vol: 0.3 }); tone(80, 0.22, 0.2, { vol: 0.3, to: 45 }); },
    ice: () => { noise(0, 0.04, { f: 6000, type: "highpass", vol: 0.5 }); rep(3, 0.1, (t, i) => tone(3200 - i * 400, 0.06 + t, 0.18, { vol: 0.09 })); },
    glove: () => rep(2, 0.2, t => { tone(110, t, 0.16, { vol: 0.45, to: 50 }); noise(t, 0.05, { f: 1500, q: 1, vol: 0.4 }); }),
    volcano: () => { noise(0, 0.9, { f: 130, type: "lowpass", vol: 0.45 }); tone(55, 0, 0.9, { type: "sawtooth", vol: 0.18, to: 40, vib: 9 }); noise(0.7, 0.5, { f: 600, to: 4000, q: 0.7, vol: 0.25 }); },
    kettle: () => { noise(0, 0.9, { f: 6000, type: "highpass", vol: 0.08 }); tone(1400, 0.15, 0.9, { type: "sine", vol: 0.12, to: 1950, vib: 22 }); },
    thermometer: () => { tone(1500, 0, 0.45, { type: "triangle", vol: 0.14, to: 300 }); tone(1568, 0.5, 0.6, { vol: 0.08 }); },
    // lonely
    chat: () => { tone(1318, 0, 0.12, { vol: 0.14 }); tone(1760, 0.11, 0.3, { vol: 0.14 }); tone(1318, 0.45, 0.12, { vol: 0.1 }); tone(1760, 0.56, 0.3, { vol: 0.1 }); },
    lantern: () => { [392, 784].forEach((f, i) => tone(f, i * 0.04, 1.2, { vol: 0.08 })); rep(4, 0.12, t => noise(0.1 + t, 0.05, { f: 900, type: "lowpass", vol: 0.06 })); },
    plane: () => { noise(0, 0.8, { f: 1200, to: 3200, q: 0.6, vol: 0.12 }); tone(520, 0.1, 0.6, { vol: 0.03, to: 760 }); },
    mittens: () => { rep(3, 0.12, t => noise(t, 0.08, { f: 450, type: "lowpass", vol: 0.28 })); [330, 415, 494].forEach(f => tone(f, 0.3, 0.9, { type: "triangle", vol: 0.07 })); },
    postcard: () => { tone(110, 0, 0.14, { vol: 0.4, to: 60 }); noise(0, 0.05, { f: 800, type: "lowpass", vol: 0.3 }); noise(0.2, 0.25, { f: 3000, q: 1.5, vol: 0.12 }); },
    phone: () => rep(2, 0.55, t => { rep(6, 0.04, (u, i) => { tone(480, t + u, 0.03, { type: "square", vol: 0.05 }); tone(620, t + u, 0.03, { type: "square", vol: 0.05 }); }); }),
    // stressed
    checklist: () => { noise(0, 0.25, { f: 4000, q: 2, vol: 0.12 }); tone(1568, 0.3, 0.7, { vol: 0.11 }); },
    water: () => { rep(5, 0.09, (t, i) => tone(500 - i * 40, t, 0.12, { vol: 0.16, to: 300 })); tone(150, 0.55, 0.15, { vol: 0.2, to: 90 }); },
    headphones: () => { rep(2, 0.25, t => { tone(65, t, 0.2, { vol: 0.4, to: 40 }); }); seq([523, 659, 784, 1047], 0.08, { type: "square", vol: 0.04 }); },
    stressball: () => rep(2, 0.28, t => { tone(300, t, 0.2, { type: "triangle", vol: 0.18, to: 640 }); noise(t, 0.12, { f: 600, type: "lowpass", vol: 0.15 }); }),
    bubblebath: () => rep(8, 0.07, (t, i) => tone(500 + Math.random() * 500, t, 0.09, { vol: 0.12, to: 1400 })),
    plant: () => { noise(0, 0.5, { f: 6000, type: "highpass", vol: 0.1 }); tone(420, 0.5, 0.35, { vol: 0.12, to: 880 }); },
    // overwhelmed
    anchor: () => { rep(4, 0.07, (t, i) => noise(t, 0.06, { f: 700 + i * 120, q: 5, vol: 0.4 })); tone(60, 0.32, 0.3, { vol: 0.5, to: 35 }); noise(0.34, 0.45, { f: 1500, to: 200, type: "lowpass", vol: 0.25 }); },
    pause: () => { tone(900, 0, 0.04, { type: "square", vol: 0.08 }); tone(500, 0.06, 0.05, { type: "square", vol: 0.08 }); tone(220, 0.15, 0.9, { vol: 0.07, to: 160 }); },
    lighthouse: () => { tone(110, 0, 1.0, { type: "sawtooth", vol: 0.18, to: 98, vib: 3 }); tone(784, 0.9, 1.0, { vol: 0.06 }); },
    lifering: () => { noise(0, 0.4, { f: 1600, to: 250, type: "lowpass", vol: 0.35 }); tone(260, 0.3, 0.45, { vol: 0.15, to: 520, vib: 8 }); },
    snail: () => { noise(0, 0.9, { f: 500, to: 380, type: "lowpass", vol: 0.1 }); tone(150, 0, 0.9, { type: "sine", vol: 0.12, to: 110, vib: 4 }); },
    tree: () => { noise(0, 0.9, { f: 2600, q: 0.8, vol: 0.14 }); noise(0.3, 0.7, { f: 4200, q: 1.5, vol: 0.08 }); tone(140, 0.2, 0.6, { type: "sawtooth", vol: 0.05, to: 110, vib: 7 }); },
    // tired
    sleepmask: () => { tone(330, 0, 0.9, { type: "triangle", vol: 0.12, to: 170, vib: 5 }); noise(0.5, 0.5, { f: 600, type: "lowpass", vol: 0.07 }); },
    clock: () => rep(10, 0.07, (t, i) => tone(i % 2 ? 1000 : 1250, t, 0.06, { type: "square", vol: 0.06 })),
    battery: () => { rep(5, 0.1, (t, i) => tone(300 + i * 220, t, 0.12, { type: "triangle", vol: 0.1 })); noise(0.5, 0.1, { f: 4500, type: "highpass", vol: 0.15 }); tone(1568, 0.55, 0.6, { vol: 0.1 }); },
    bed: () => { tone(90, 0, 0.2, { vol: 0.35, to: 50 }); tone(220, 0.1, 0.5, { vol: 0.12, to: 150, vib: 12 }); tone(300, 0.5, 0.8, { type: "triangle", vol: 0.07, to: 180, vib: 5 }); },
    slippers: () => rep(5, 0.1, t => noise(t, 0.07, { f: 700, type: "lowpass", vol: 0.28 })),
    cat: () => { tone(650, 0, 0.5, { type: "sawtooth", vol: 0.08, to: 950, vib: 6 }); tone(950, 0.4, 0.45, { type: "sawtooth", vol: 0.08, to: 520, vib: 6 }); tone(95, 0.9, 0.7, { type: "sawtooth", vol: 0.05, vib: 24 }); },
    // guilty
    bandage: () => { noise(0, 0.28, { f: 2500, to: 6000, q: 0.8, vol: 0.22 }); tone(140, 0.32, 0.1, { vol: 0.25, to: 80 }); },
    eraser: () => rep(5, 0.07, (t, i) => noise(t, 0.06, { f: 3400, q: 1.2, vol: 0.14 })),
    dove: () => { rep(2, 0.45, t => tone(430, t, 0.3, { vol: 0.12, to: 360, vib: 9 })); noise(0.9, 0.3, { f: 900, to: 2000, q: 0.6, vol: 0.12 }); },
    key: () => { rep(6, 0.04, (t, i) => tone(2800 + Math.random() * 1200, t, 0.1, { vol: 0.06 })); tone(180, 0.35, 0.08, { type: "square", vol: 0.2, to: 120 }); tone(1568, 0.45, 0.6, { vol: 0.08 }); },
    lightbulb: () => { tone(900, 0, 0.03, { type: "square", vol: 0.1 }); tone(120, 0.05, 0.4, { type: "sawtooth", vol: 0.05 }); tone(1760, 0.45, 0.8, { vol: 0.1 }); },
    paperboat: () => { noise(0, 0.15, { f: 3000, q: 1.5, vol: 0.12 }); rep(3, 0.2, (t, i) => noise(0.2 + t, 0.18, { f: 1200 - i * 150, to: 500, type: "lowpass", vol: 0.15 })); },
    // happy
    partyhat: () => { tone(300, 0, 0.4, { type: "sawtooth", vol: 0.12, to: 780 }); noise(0.4, 0.08, { f: 1500, type: "highpass", vol: 0.45 }); rep(6, 0.05, t => noise(0.5 + t, 0.05, { f: 4000, q: 2, vol: 0.12 })); },
    camera: () => { noise(0, 0.03, { f: 3000, type: "highpass", vol: 0.5 }); noise(0.07, 0.04, { f: 2200, type: "highpass", vol: 0.4 }); tone(2400, 0.12, 0.25, { vol: 0.05, to: 3200 }); },
    trophy: () => { [523, 659, 784].forEach((f, i) => tone(f, i * 0.11, 0.25, { type: "sawtooth", vol: 0.07 })); [523, 659, 784, 1047].forEach(f => tone(f, 0.4, 0.9, { type: "sawtooth", vol: 0.05 })); tone(2093, 0.4, 0.9, { vol: 0.06 }); },
    sunglasses: () => { tone(310, 0, 0.5, { type: "triangle", vol: 0.16, to: 620, vib: 7 }); noise(0.55, 0.04, { f: 2400, q: 3, vol: 0.35 }); },
    kite: () => { noise(0, 0.8, { f: 700, to: 2600, q: 0.7, vol: 0.14 }); rep(6, 0.1, t => tone(900 + Math.random() * 300, 0.1 + t, 0.05, { vol: 0.04 })); },
    musicnote: () => seq([523, 659, 784, 659, 880], 0.14, { type: "triangle", vol: 0.12 }),
    // grateful
    card: () => { noise(0, 0.25, { f: 2800, q: 1.5, vol: 0.14 }); tone(587, 0.3, 0.5, { vol: 0.1 }); tone(784, 0.5, 0.8, { vol: 0.1 }); },
    seedling: () => { tone(220, 0, 0.35, { vol: 0.14, to: 700, vib: 6 }); rep(2, 0.12, (t, i) => tone(1200 + i * 300, 0.3 + t, 0.1, { vol: 0.07 })); },
    journal: () => { noise(0, 0.35, { f: 3600, q: 2, vol: 0.1 }); noise(0.4, 0.2, { f: 1800, to: 7000, type: "highpass", vol: 0.14 }); },
    sunflower: () => { [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.09, 0.9, { vol: 0.08 })); tone(131, 0, 1.0, { type: "triangle", vol: 0.07 }); },
    honey: () => { rep(3, 0.28, (t, i) => tone(260 - i * 25, t, 0.28, { vol: 0.2, to: 140 })); seq([880, 1109], 0.15, { vol: 0.07 }); },
    bouquet: () => { noise(0, 0.3, { f: 2600, q: 1, vol: 0.14 }); [659, 784, 988].forEach((f, i) => tone(f, 0.2 + i * 0.12, 0.8, { vol: 0.07 })); }
  };
  Object.assign(sounds, themed);
  // finishing a box: a soft whoosh when it slides, and a warm fanfare for the prize
  Object.assign(sounds, {
    slide: () => noise(0, 0.8, { f: 400, to: 1800, q: 0.5, vol: 0.2 }),
    prize: () => { seq([523, 659, 784, 1047], 0.13, { type: "triangle", vol: 0.12 }); [523, 659, 784, 1047].forEach(f => tone(f, 0.55, 1.2, { vol: 0.06 })); tone(2093, 0.6, 1.0, { vol: 0.04 }); }
  });

  // fallback sounds for gifts without their own recipe: preset(name, pitch)
  const presets = {
    ding: f => { tone(f, 0, 0.9, { vol: 0.12 }); tone(f * 1.5, 0.02, 0.6, { vol: 0.06 }); },
    chime: f => seq([f, f * 1.25, f * 1.5], 0.11, { vol: 0.1 }),
    boing: f => tone(f, 0, 0.5, { vol: 0.2, to: f * 2.2, vib: 12 }),
    pop: () => { noise(0, 0.07, { f: 1500, type: "highpass", vol: 0.4 }); tone(500, 0, 0.1, { vol: 0.12, to: 900 }); },
    whoosh: f => noise(0, 0.5, { f, to: f * 4, q: 0.7, vol: 0.2 }),
    thud: f => { tone(f, 0, 0.25, { vol: 0.4, to: f * 0.5 }); noise(0, 0.06, { f: 300, type: "lowpass", vol: 0.25 }); },
    bubble: f => [0, 0.12, 0.25].forEach((t, i) => tone(f + i * 140, t, 0.14, { vol: 0.14, to: f * 2 + i * 200 })),
    zap: f => { tone(f, 0, 0.3, { type: "sawtooth", vol: 0.1, to: f * 3 }); noise(0, 0.12, { f: 3000, type: "highpass", vol: 0.12 }); },
    rustle: f => [0, 0.08, 0.17, 0.27].forEach(t => noise(t, 0.09, { f, q: 2, vol: 0.14 })),
    ring: f => { for (let i = 0; i < 6; i++) tone(f, i * 0.09, 0.07, { type: "square", vol: 0.06 }); },
    squeak: f => tone(f, 0, 0.22, { type: "triangle", vol: 0.18, to: f * 1.8 }),
    purr: f => { tone(f, 0, 0.9, { type: "sawtooth", vol: 0.08, vib: 24 }); tone(f * 2, 0.1, 0.7, { type: "triangle", vol: 0.05, vib: 22 }); },
    whistle: f => tone(f, 0, 0.8, { vol: 0.14, to: f * 1.3, vib: 30 }),
    splash: f => { noise(0, 0.35, { f, to: f / 3, type: "lowpass", vol: 0.35 }); tone(300, 0, 0.15, { vol: 0.1, to: 120 }); }
  };
  return {
    preset(name, f) { try { (presets[name] || presets.ding)(f || 880); } catch {} },
    has(name) { return name in sounds; },
    play(name) { try { (sounds[name] || (() => {}))(); } catch {} },
    get on() { return on; },
    toggle() { on = !on; try { localStorage.setItem("heartnote-sound", on ? "on" : "off"); } catch {} if (on) get(); return on; }
  };
})();
