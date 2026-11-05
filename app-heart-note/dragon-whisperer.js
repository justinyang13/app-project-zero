// Dragon Whisperer: an angry dragon. First let the steam out safely (stomp), then breathe with it (hold while it breathes in, let go while it breathes out) until it calms down.
const DW_KEY = "heartnote-dragons";
const root = document.getElementById("game"), stat = document.getElementById("stat");
G.wireSound(document.getElementById("sound"));
const DRAGONS = [["Ember", "#e8604a"], ["Fern", "#4cae6a"], ["Marina", "#3a9ad0"], ["Sunny", "#f0a830"], ["Frost", "#7ac0e8"], ["Stardust", "#a07ae0"]];
let S = G.load(DW_KEY, { calmed: [], stomps: 0 });
const save = () => G.save(DW_KEY, S);
function refresh() { stat.textContent = `Dragons calmed: ${S.calmed.length} of ${DRAGONS.length} · Safe stomps: ${S.stomps}`; }
const dragonSvg = (color, mood) => `<svg viewBox="0 0 240 200" class="dw-svg"><defs><radialGradient id="dwb" cx=".4" cy=".3" r=".9"><stop offset="0" stop-color="${color}" stop-opacity=".75"/><stop offset="1" stop-color="${color}"/></radialGradient></defs>
  <path d="M30 150Q4 150 8 120Q14 130 28 126z" fill="${color}"/><ellipse cx="120" cy="140" rx="70" ry="48" fill="url(#dwb)" stroke="rgba(0,0,0,.25)" stroke-width="2"/><ellipse cx="120" cy="156" rx="40" ry="30" fill="#ffe9b8" opacity=".85"/>
  <path d="M70 110L52 70L84 96zM170 110L188 70L156 96z" fill="${color}" opacity=".9"/><circle cx="120" cy="86" r="48" fill="url(#dwb)" stroke="rgba(0,0,0,.25)" stroke-width="2"/>
  <path d="M84 52L74 22L102 44zM156 52L166 22L138 44z" fill="#fff2cf" stroke="rgba(0,0,0,.25)" stroke-width="1.500"/>
  <ellipse cx="96" cy="188" rx="22" ry="9" fill="${color}"/><ellipse cx="144" cy="188" rx="22" ry="9" fill="${color}"/>
  ${mood === 0 ? `<path d="M88 74l22 10M152 74l-22 10" stroke="#2b1b24" stroke-width="5" stroke-linecap="round"/><circle cx="98" cy="88" r="7" fill="#2b1b24"/><circle cx="142" cy="88" r="7" fill="#2b1b24"/><path d="M98 118q22-16 44 0" stroke="#2b1b24" stroke-width="5" fill="none" stroke-linecap="round"/>`
  : mood === 1 ? `<path d="M88 78l22 4M152 78l-22 4" stroke="#2b1b24" stroke-width="4.500" stroke-linecap="round"/><circle cx="98" cy="90" r="7" fill="#2b1b24"/><circle cx="142" cy="90" r="7" fill="#2b1b24"/><path d="M102 116h36" stroke="#2b1b24" stroke-width="5" stroke-linecap="round"/>`
  : mood === 2 ? `<circle cx="98" cy="88" r="7" fill="#2b1b24"/><circle cx="142" cy="88" r="7" fill="#2b1b24"/><circle cx="100" cy="85" r="2.400" fill="#fff"/><circle cx="144" cy="85" r="2.400" fill="#fff"/><path d="M102 112q18 10 36 0" stroke="#2b1b24" stroke-width="5" fill="none" stroke-linecap="round"/>`
  : `<path d="M88 90q10-10 20 0M132 90q10-10 20 0" stroke="#2b1b24" stroke-width="5" fill="none" stroke-linecap="round"/><ellipse cx="86" cy="106" rx="9" ry="5" fill="#ff8fa8" opacity=".75"/><ellipse cx="154" cy="106" rx="9" ry="5" fill="#ff8fa8" opacity=".75"/><path d="M98 108q22 22 44 0z" fill="#7a2a3a"/>`}
  <ellipse cx="104" cy="120" rx="2.400" ry="3" fill="#00000030"/><ellipse cx="136" cy="120" rx="2.400" ry="3" fill="#00000030"/></svg>`;

function play() {
  const pick = G.pick(DRAGONS.filter(d => !S.calmed.includes(d[0])).length ? DRAGONS.filter(d => !S.calmed.includes(d[0])) : DRAGONS);
  let anger = 1, stomps = 0, phase = "stomp";
  root.innerHTML = `<div class="g-stage dw-stage" id="st"><div class="dw-flame" id="fl"></div><div class="dw-dragon" id="dr"></div><div class="dw-steam" id="steam"></div><div class="dw-meter"><span>Anger</span><div><i id="am"></i></div></div><div class="dw-msg" id="msg"></div></div>
    <div class="g-row" id="ctl" style="justify-content:center"></div>`;
  const st = root.querySelector("#st"), dr = root.querySelector("#dr"), fl = root.querySelector("#fl"), steam = root.querySelector("#steam"), am = root.querySelector("#am"), msg = root.querySelector("#msg"), ctl = root.querySelector("#ctl");
  const say = t => { msg.textContent = t; msg.classList.remove("show"); void msg.offsetWidth; msg.classList.add("show"); };
  const paint = () => { const mood = anger > 0.75 ? 0 : anger > 0.45 ? 1 : anger > 0.12 ? 2 : 3; if (dr.dataset.m != mood) { dr.dataset.m = mood; dr.innerHTML = dragonSvg(lerpHex("#e8445f", pick[1], 1 - anger), mood); }
    fl.style.setProperty("--f", anger.toFixed(2)); am.style.width = (anger * 100) + "%"; am.style.background = `hsl(${(1 - anger) * 120}, 80%, 50%)`; };
  const lerpHex = (a, b, f) => { const p = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16)); const x = p(a), y = p(b); return "#" + x.map((v, i) => Math.round(v + (y[i] - v) * f).toString(16).padStart(2, "0")).join(""); };
  const puff = () => { for (let i = 0; i < 4; i++) { const s = G.el("i", "dw-puff"); s.style.left = (30 + Math.random() * 40) + "%"; s.style.setProperty("--dx", ((Math.random() - 0.5) * 120) + "px"); steam.appendChild(s); setTimeout(() => s.remove(), 1200); } };
  // phase 1: stomp the anger out where nobody gets hurt
  const stompPhase = () => {
    phase = "stomp"; say("The dragon is furious! Let the steam out: stomp!");
    ctl.innerHTML = `<button class="btn primary wb-hold" id="stomp" type="button">Stomp! <span id="sc">0/10</span></button>`;
    const b = ctl.querySelector("#stomp"), sc = ctl.querySelector("#sc");
    const hit = () => { if (phase !== "stomp") return; stomps++; S.stomps++; anger = Math.max(0.62, anger - 0.038); paint(); puff(); sc.textContent = stomps + "/10"; Sfx.preset("thud", 90); dr.classList.remove("shake"); void dr.offsetWidth; dr.classList.add("shake"); if (stomps >= 10) { save(); refresh(); breathPhase(); } };
    b.onclick = hit; dr.onclick = hit;
  };
  // phase 2: breathe with the dragon: hold while it breathes in (4s), let go while it breathes out (6s)
  const breathPhase = () => {
    phase = "breath"; say("The steam is out. Now breathe with the dragon. Hold while the ring grows. Let go as it shrinks.");
    ctl.innerHTML = `<div style="display:grid;justify-items:center;gap:8px"><div class="wb-ring" id="ring">Ready</div><p class="g-stat" id="bt">Calm it with 4 matching breaths</p><button class="btn wb-hold" id="hold" type="button">Hold to breathe in</button><div class="g-row"><button class="btn primary" id="start" type="button">Start breathing</button></div></div>`;
    const ring = ctl.querySelector("#ring"), bt = ctl.querySelector("#bt"), hold = ctl.querySelector("#hold"), start = ctl.querySelector("#start");
    let down = null, iv = [], good = 0, cs = 0, running = false;
    const press = () => { if (down == null) { down = performance.now(); hold.classList.add("down"); hold.textContent = "Breathing in…"; } }, release = () => { if (down != null) { iv.push([down, performance.now()]); down = null; hold.classList.remove("down"); hold.textContent = "Hold to breathe in"; } };
    hold.addEventListener("pointerdown", e => { e.preventDefault(); press(); }); ["pointerup", "pointerleave", "pointercancel"].forEach(t => hold.addEventListener(t, release));
    const kd = e => { if (e.code === "Space" && !e.repeat) { e.preventDefault(); press(); } }, ku = e => { if (e.code === "Space") release(); }; addEventListener("keydown", kd); addEventListener("keyup", ku);
    const ov = (t0, t1) => iv.reduce((s, [x, y]) => s + Math.max(0, Math.min(y, t1) - Math.max(x, t0)), 0);
    const cycle = () => { if (!ring.isConnected) return; iv = []; if (down != null) down = performance.now(); cs = performance.now(); ring.classList.remove("go"); void ring.offsetWidth; ring.classList.add("go"); ring.textContent = "In…"; setTimeout(() => { ring.textContent = "Out…"; }, 4000);
      setTimeout(() => { if (down != null) { iv.push([down, performance.now()]); down = performance.now(); } const inh = ov(cs, cs + 4000) / 4000, exh = ov(cs + 4000, cs + 10000) / 6000;
        if (inh >= 0.55 && exh <= 0.3) { good++; anger = Math.max(0, 0.62 - good * 0.16); paint(); Sfx.preset("softbell", 440 + good * 90); bt.textContent = `Good breath! ${good} of 4`; say(["The flames are shrinking.", "Its shoulders are dropping.", "The dragon is almost calm.", ""][good - 1] || ""); } else { Sfx.preset("hum", 160); bt.textContent = "Try to match the ring: hold while it grows, let go while it shrinks."; }
        if (good >= 4) return calm(); cycle(); }, 10000); };
    const calm = () => { removeEventListener("keydown", kd); removeEventListener("keyup", ku); anger = 0; paint(); phase = "done"; ring.classList.remove("go"); S.calmed.includes(pick[0]) || S.calmed.push(pick[0]); save(); refresh(); Sfx.preset("twin", 784); setTimeout(() => Sfx.preset("softbell", 1047), 400);
      say(`${pick[0]} is calm. It nuzzles you.`); ctl.innerHTML = `<div style="text-align:center"><p><strong>You calmed ${pick[0]}!</strong> Anger isn't bad. It just needed somewhere safe to go, and some slow breaths.</p><div class="g-row" style="justify-content:center"><button class="btn primary" id="again" type="button">Meet another dragon</button></div></div>`; ctl.querySelector("#again").onclick = play; };
    start.onclick = () => { if (running) return; running = true; start.disabled = true; cycle(); };
  };
  paint(); stompPhase(); refresh();
}
document.getElementById("mine").onclick = () => {
  const m = G.modal(`<h3>🐉 My dragons</h3><p class="g-stat">${S.calmed.length} of ${DRAGONS.length} calmed. Every dragon you calm becomes a friend.</p><div class="dw-grid">${DRAGONS.map(([n, c]) => `<div class="${S.calmed.includes(n) ? "" : "locked"}">${S.calmed.includes(n) ? dragonSvg(c, 3) : `<div class="dw-q">?</div>`}<span>${S.calmed.includes(n) ? n : "???"}</span></div>`).join("")}</div><div class="g-row"><button class="btn" id="x" type="button">Close</button></div>`);
  m.box.querySelector("#x").onclick = m.close;
};
play();
