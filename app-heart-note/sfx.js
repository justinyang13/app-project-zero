// Tiny Web Audio synth: a cute sound for every gift. No audio files needed.
const Sfx = (() => {
  let ctx = null, on = true;
  try { on = localStorage.getItem("heartnote-sound") !== "off"; } catch {}
  const get = () => {
    if (!ctx) { const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return null; ctx = new AC(); }
    if (ctx.state === "suspended") ctx.resume();
    return ctx;
  };
  const tone = (f, t0, dur, { type = "sine", vol = 0.2, to = null, vib = 0 } = {}) => {
    const c = get(); if (!c || !on) return;
    const o = c.createOscillator(), g = c.createGain(), t = c.currentTime + t0;
    o.type = type; o.frequency.setValueAtTime(f, t);
    if (to) o.frequency.exponentialRampToValueAtTime(to, t + dur);
    if (vib) { const l = c.createOscillator(), lg = c.createGain(); l.frequency.value = vib; lg.gain.value = f * 0.04; l.connect(lg); lg.connect(o.frequency); l.start(t); l.stop(t + dur + 0.05); }
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(c.destination); o.start(t); o.stop(t + dur + 0.05);
  };
  const noise = (t0, dur, { f = 2000, q = 1, type = "bandpass", vol = 0.2, to = null } = {}) => {
    const c = get(); if (!c || !on) return;
    const n = Math.floor(c.sampleRate * dur), buf = c.createBuffer(1, n, c.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    const s = c.createBufferSource(), fl = c.createBiquadFilter(), g = c.createGain(), t = c.currentTime + t0;
    s.buffer = buf; fl.type = type; fl.Q.value = q; fl.frequency.setValueAtTime(f, t);
    if (to) fl.frequency.exponentialRampToValueAtTime(to, t + dur);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(fl); fl.connect(g); g.connect(c.destination); s.start(t);
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
  // reusable cute sounds for the feeling-specific gifts: preset(name, pitch)
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
    play(name) { try { (sounds[name] || (() => {}))(); } catch {} },
    get on() { return on; },
    toggle() { on = !on; try { localStorage.setItem("heartnote-sound", on ? "on" : "off"); } catch {} if (on) get(); return on; }
  };
})();
