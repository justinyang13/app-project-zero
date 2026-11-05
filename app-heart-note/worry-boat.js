// Worry Boat: write a worry, fold it into a paper boat, breathe it down the river, then decide what is yours to do.
const WB_KEY = "heartnote-boats", WB_DRAFT = "heartnote-wb-draft";
const root = document.getElementById("game"), stat = document.getElementById("stat");
let boats = G.load(WB_KEY, []);
const draft = G.load(WB_DRAFT, { text: "", size: "medium" });
let worry = draft.text, size = draft.size;
G.wireSound(document.getElementById("sound"));

// ---- art ----
const PAPER = [
  `<svg viewBox="0 0 320 230"><rect x="14" y="14" width="292" height="202" rx="6" fill="#fffdf4" stroke="#cdbf94" stroke-width="2"/><path d="M14 14h292" stroke="#e8dcb4" stroke-width="2"/></svg>`,
  `<svg viewBox="0 0 320 230"><rect x="14" y="60" width="292" height="156" rx="6" fill="#fffdf4" stroke="#cdbf94" stroke-width="2"/><path d="M14 60h292" stroke="#b8a870" stroke-width="3"/><path d="M14 60l12-22h268l12 22z" fill="#f2e9c8" stroke="#cdbf94" stroke-width="2"/></svg>`,
  `<svg viewBox="0 0 320 230"><path d="M30 190L160 40l130 150z" fill="#fffdf4" stroke="#cdbf94" stroke-width="2" stroke-linejoin="round"/><path d="M30 190h260v26H30z" fill="#f2e9c8" stroke="#cdbf94" stroke-width="2"/><path d="M160 40v150" stroke="#e0d4a8" stroke-width="2"/></svg>`,
  `<svg viewBox="0 0 320 230"><path d="M160 22L248 150H160z" fill="#fffdf4" stroke="#cdbf94" stroke-width="2" stroke-linejoin="round"/><path d="M150 40L80 150h70z" fill="#f2e9c8" stroke="#cdbf94" stroke-width="2" stroke-linejoin="round"/><path d="M40 160h240l-34 46H74z" fill="#ffffff" stroke="#cdbf94" stroke-width="2" stroke-linejoin="round"/><path d="M160 22v138" stroke="#b8a870" stroke-width="2"/><path d="M60 175h200" stroke="#e0d4a8" stroke-width="2"/></svg>`
];
const BOAT = `<svg viewBox="0 0 320 230"><path d="M160 22L248 150H160z" fill="#fffdf4" stroke="#cdbf94" stroke-width="3" stroke-linejoin="round"/><path d="M150 40L80 150h70z" fill="#f2e9c8" stroke="#cdbf94" stroke-width="3" stroke-linejoin="round"/><path d="M40 160h240l-34 46H74z" fill="#ffffff" stroke="#cdbf94" stroke-width="3" stroke-linejoin="round"/><path d="M160 22v138" stroke="#b8a870" stroke-width="3"/></svg>`;

// ---- the old wooden boat: patched parchment sail with your worry on it, painted cute eyes, a glowing lantern ----
// deco 0..3 grows with your sailor rank: red pennant, golden trim and brass lantern, a golden star figurehead
const rankLevel = n => (n >= 10 ? 3 : n >= 6 ? 2 : n >= 3 ? 1 : 0);
function boatSvg(worry = "", deco = 0) {
  const words = String(worry).trim().split(/\s+/).filter(Boolean); const lines = []; let cur = "";
  words.forEach(w => { if ((cur + " " + w).trim().length > 11) { if (cur) lines.push(cur); cur = w.slice(0, 11); } else cur = (cur + " " + w).trim(); }); if (cur) lines.push(cur);
  const txt = lines.slice(0, 3).map((l, i) => `<text x="147" y="${64 + i * 9}" text-anchor="middle" font-size="7" fill="#5a3a22" opacity=".75" font-family="cursive">${G.esc(l)}</text>`).join("");
  const flag = deco >= 1 ? "#e8445f" : "#4a7ee0", trim = deco >= 2 ? "#f2c24a" : "#e0a868";
  return `<svg viewBox="0 0 240 190" class="oldboat"><defs>
    <linearGradient id="obw" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#d79a58"/><stop offset=".55" stop-color="#a8683a"/><stop offset="1" stop-color="#6a3c1c"/></linearGradient>
    <linearGradient id="obm" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#6a3c1c"/><stop offset=".5" stop-color="#b87a44"/><stop offset="1" stop-color="#6a3c1c"/></linearGradient>
    <linearGradient id="obs" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff6d8"/><stop offset=".6" stop-color="#f0dba4"/><stop offset="1" stop-color="#d8b878"/></linearGradient>
    <radialGradient id="oblg" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#fff6b0"/><stop offset="1" stop-color="#ffb02e" stop-opacity="0"/></radialGradient></defs>
  <path d="M120 16L232 98M120 16L18 114" stroke="#4a2a12" stroke-width="1.100" fill="none" opacity=".7"/>
  <path d="M118 20Q80 54 74 108H118z" fill="url(#obs)" stroke="#b8985a" stroke-width="1.200"/>
  <path d="M124 20Q184 50 176 108H124z" fill="url(#obs)" stroke="#b8985a" stroke-width="1.200"/>
  <g stroke="#7a5a2a" stroke-width=".8" stroke-dasharray="2 1.600"><rect x="84" y="62" width="16" height="15" fill="#bcd8f0" opacity=".9"/><rect x="152" y="80" width="15" height="14" fill="#cfe8b8" opacity=".9"/><rect x="128" y="92" width="14" height="12" fill="#f0c0c8" opacity=".9"/><path d="M96 90l10 6-10 6z" fill="#f4d890" opacity=".9"/></g>
  <path d="M118 30V108M124 28V108M146 40Q150 70 148 108" stroke="#b8985a" stroke-opacity=".35" stroke-width=".7" fill="none"/>${txt}
  <rect x="114" y="14" width="10" height="102" rx="3" fill="url(#obm)" stroke="#4a2a12" stroke-width="1"/><circle cx="119" cy="12" r="4.200" fill="${trim}" stroke="#7a5200" stroke-width=".8"/>
  <rect x="66" y="40" width="108" height="5" rx="2.500" fill="url(#obm)" stroke="#4a2a12" stroke-width=".8"/>
  <path d="M124 14q16-6 32 2q-8 4-10 12q-12-6-22-4z" fill="${flag}" stroke="#7a1a2a" stroke-width=".8" class="pennant"/><path d="M137 20c-3-3-6-1-5 1.800 1 1.700 4 3 5 3 1-.1 4-1.500 5-3 1-2.800-2-4.800-5-1.800z" fill="#fff" opacity=".85" transform="scale(.6) translate(90 12)"/>
  <path d="M10 118H214Q226 118 232 98Q232 146 198 164Q120 188 42 164Q10 148 10 118z" fill="url(#obw)" stroke="#4a2a12" stroke-width="2" stroke-linejoin="round"/>
  <path d="M10 118H214Q226 118 232 98" fill="none" stroke="${trim}" stroke-width="5" stroke-linecap="round"/><path d="M14 119H214" stroke="#fff" stroke-opacity=".25" stroke-width="1.500"/>
  <path d="M16 133Q120 150 224 124M24 148Q120 166 214 140M42 162Q120 178 198 158" fill="none" stroke="#4a2a12" stroke-opacity=".5" stroke-width="1.200"/>
  <g fill="#3a2010" opacity=".55"><circle cx="30" cy="122" r="1.100"/><circle cx="60" cy="123" r="1.100"/><circle cx="90" cy="124" r="1.100"/><circle cx="120" cy="124" r="1.100"/><circle cx="150" cy="124" r="1.100"/><circle cx="180" cy="123" r="1.100"/><circle cx="206" cy="121" r="1.100"/></g>
  <g stroke="#7a5a2a" stroke-width=".8" stroke-dasharray="2 1.600"><rect x="44" y="136" width="22" height="16" rx="1" fill="#d8b878" transform="rotate(-6 55 144)"/></g>
  <path d="M70 154q4-3 9 0M90 160q3-2 6 0M180 150q4-3 8 0" fill="none" stroke="#e8f4e0" stroke-width="2" stroke-linecap="round" opacity=".7"/>
  <path d="M30 128l24 4M120 150l30 6" stroke="#3a2010" stroke-opacity=".18" stroke-width="3" stroke-linecap="round"/>
  <g><ellipse cx="148" cy="138" rx="9" ry="10" fill="#fff"/><ellipse cx="178" cy="132" rx="9" ry="10" fill="#fff"/><circle cx="150" cy="140" r="5.200" fill="#2b1b24"/><circle cx="180" cy="134" r="5.200" fill="#2b1b24"/><circle cx="152" cy="137.500" r="1.900" fill="#fff"/><circle cx="182" cy="131.500" r="1.900" fill="#fff"/>
  <ellipse cx="136" cy="150" rx="5" ry="3" fill="#ff8fa8" opacity=".65"/><ellipse cx="192" cy="144" rx="5" ry="3" fill="#ff8fa8" opacity=".65"/><path d="M155 152q9 8 18 0" stroke="#2b1b24" stroke-width="2.200" fill="none" stroke-linecap="round"/></g>
  <path d="M216 100v-22" stroke="#4a2a12" stroke-width="2.400"/><path d="M216 78q-9 0-9 6" stroke="#4a2a12" stroke-width="1.600" fill="none"/>
  <circle cx="207" cy="94" r="17" fill="url(#oblg)" class="lamp"/><rect x="202" y="86" width="10" height="13" rx="3" fill="#ffe27a" stroke="${deco >= 2 ? "#b8860b" : "#4a2a12"}" stroke-width="1.500"/><rect x="200" y="84" width="14" height="3" rx="1.500" fill="${deco >= 2 ? "#e0aa24" : "#4a2a12"}"/><rect x="204" y="89" width="2" height="7" fill="#fff" opacity=".6"/>
  <g transform="translate(62 108)"><ellipse cx="0" cy="0" rx="9" ry="3" fill="#6a3c1c"/><path d="M-9 0v-12q9-4 18 0v12" fill="#a8683a" stroke="#4a2a12" stroke-width="1"/><path d="M-9-8h18M-9-3h18" stroke="#3a2010" stroke-width="1.400"/><ellipse cx="0" cy="-12" rx="9" ry="3" fill="#c98a4a" stroke="#4a2a12" stroke-width="1"/></g>
  ${deco >= 3 ? `<g transform="translate(231 96)"><path d="M0-12l3.200 7 7.600.8-5.700 5 1.700 7.500L0 3l-6.800 4 1.700-7.500-5.700-5 7.600-.8z" fill="#ffd23f" stroke="#b8860b" stroke-width="1"/></g>` : ""}
  <ellipse class="foam" cx="120" cy="170" rx="104" ry="5" fill="#fff" opacity=".35"/></svg>`;
}

const harborBoat = c => `<svg viewBox="0 0 320 230"><path d="M160 22L248 150H160z" fill="${c}" stroke="#7a6a3a" stroke-width="6"/><path d="M150 40L80 150h70z" fill="#f2e9c8" stroke="#7a6a3a" stroke-width="6"/><path d="M40 160h240l-34 46H74z" fill="#fff" stroke="#7a6a3a" stroke-width="6"/></svg>`;
const SIZES = { small: "A little worry", medium: "A medium worry", big: "A big worry" };

function refreshStat() {
  const n = boats.length, done = boats.filter(b => b.step && b.done).length;
  stat.textContent = n ? `You've sailed ${n} worr${n === 1 ? "y" : "ies"}${done ? ` and finished ${done} small step${done === 1 ? "" : "s"}` : ""} · Rank: ${rankFor(n)} · Sea friends met: ${friendsMet().length} of ${FRIENDS.length}.` : "Your harbor is empty. Sail your first worry whenever you're ready.";
}

// ---- 1. write ----
function stepWrite() {
  root.innerHTML = `<div class="wb-write">
    <label class="g-label" for="worry">What's weighing on you right now?</label>
    <textarea class="g-field" id="worry" rows="3" maxlength="160" placeholder="e.g. I'm nervous about tomorrow's test"></textarea>
    <p class="g-label" style="margin-top:12px">How big does it feel?</p>
    <div class="g-chips" id="sizes">${Object.entries(SIZES).map(([k, v]) => `<button type="button" class="g-chip" data-s="${k}" aria-pressed="${k === size}">${v}</button>`).join("")}</div>
    <p class="g-stat">It stays on this device. Nobody else can see it.</p>
    <div class="g-row"><button class="btn primary" id="fold" type="button">Fold it into a boat →</button></div></div>`;
  const ta = root.querySelector("#worry"); ta.value = worry;
  ta.oninput = () => { worry = ta.value; G.save(WB_DRAFT, { text: worry, size }); };
  root.querySelectorAll(".g-chip").forEach(b => b.onclick = () => { size = b.dataset.s; root.querySelectorAll(".g-chip").forEach(x => x.setAttribute("aria-pressed", String(x === b))); G.save(WB_DRAFT, { text: worry, size }); });
  root.querySelector("#fold").onclick = () => { if (!worry.trim()) { ta.focus(); ta.placeholder = "Type a worry first, even a small one"; return; } stepFold(); };
}

// ---- 2. fold ----
function stepFold() {
  let f = 0;
  root.innerHTML = `<div class="wb-fold"><p class="g-label" id="foldcue" style="text-align:center">Tap the paper to fold it (1 of 3)</p>
    <div class="wb-paper" id="paper" role="button" tabindex="0" aria-label="Fold the paper">${PAPER[0]}<div class="wb-text">${G.esc(worry)}</div></div>
    <div class="g-row" style="justify-content:center"><button class="btn" id="sail" type="button" hidden>Set sail →</button></div></div>`;
  const paper = root.querySelector("#paper"), cue = root.querySelector("#foldcue"), sail = root.querySelector("#sail");
  const fold = () => {
    if (f >= 3) return;
    f++; Sfx.preset("rustle", 3000);
    const svg = paper.querySelector("svg"); svg.outerHTML = PAPER[f]; paper.querySelector("svg").classList.add("swap");
    if (f >= 2) paper.querySelector(".wb-text").style.opacity = 0;
    cue.textContent = f < 3 ? `Fold it again (${f + 1} of 3)` : "Your worry is a paper boat. It's lighter now.";
    if (f === 3) { Sfx.preset("chime", 659); sail.hidden = false; sail.classList.add("primary"); }
  };
  paper.onclick = fold; paper.onkeydown = e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fold(); } };
  sail.onclick = stepSail;
}

// ---- 3. sail: steer with your breath. Hold to breathe in (the boat rises), let go to breathe out (it sinks). ----
// Follow the glowing path and collect pearls. The path rises for 4 seconds and falls for 6: a slow, calm breath.
const FRIENDS = [
  { id: "duck", name: "Ducky", kind: "duck", say: "Quack! You're doing great." }, { id: "paperboat", name: "Pip the little boat", kind: "paperboat", say: "Another boat! Safe travels." },
  { id: "lifering", name: "Buoy", kind: "lifering", say: "I'll keep you afloat." }, { id: "snail", name: "Slowpoke", kind: "snail", say: "Slow is just fine." },
  { id: "cloud", name: "Fluff", kind: "cloud", say: "Clouds pass. So do worries." }, { id: "balloon", name: "Bobby", kind: "balloon", say: "Up, up and away!" },
  { id: "wave", name: "Splash", kind: "wave", say: "Ride the wave!" }, { id: "bubblewand", name: "Bubbles", kind: "bubblewand", say: "Blow slowly. Pop, pop!" }
];
const friendsMet = () => G.load("heartnote-wb-friends", []);
const RANKS = [[0, "Little Sailor"], [3, "Brave Sailor"], [6, "Calm Captain"], [10, "Harbor Hero"]];
const rankFor = n => [...RANKS].reverse().find(r => n >= r[0])[1];
let voyage = { stars: 0, pearls: 0, total: 0, friends: [] };

// the Worry Cloud: your worry, as a grumpy storm cloud that shrinks and cheers up as you stay calm
const cloudSvg = mood => { const face = [
  `<path d="M34 34l14 6M86 34l-14 6" stroke="#2b1b24" stroke-width="3.200" stroke-linecap="round"/><circle cx="43" cy="44" r="4" fill="#2b1b24"/><circle cx="77" cy="44" r="4" fill="#2b1b24"/><path d="M48 62q12-9 24 0" stroke="#2b1b24" stroke-width="3" fill="none" stroke-linecap="round"/>`,
  `<path d="M34 38l14-5M86 38l-14-5" stroke="#2b1b24" stroke-width="2.800" stroke-linecap="round"/><circle cx="43" cy="45" r="4" fill="#2b1b24"/><circle cx="77" cy="45" r="4" fill="#2b1b24"/><path d="M50 62q4-5 8 0t8 0 8 0" stroke="#2b1b24" stroke-width="2.600" fill="none" stroke-linecap="round"/>`,
  `<circle cx="43" cy="44" r="4" fill="#2b1b24"/><circle cx="77" cy="44" r="4" fill="#2b1b24"/><path d="M50 62h20" stroke="#2b1b24" stroke-width="3" stroke-linecap="round"/>`,
  `<circle cx="43" cy="44" r="4.400" fill="#2b1b24"/><circle cx="77" cy="44" r="4.400" fill="#2b1b24"/><circle cx="44.600" cy="42.600" r="1.500" fill="#fff"/><circle cx="78.600" cy="42.600" r="1.500" fill="#fff"/><path d="M50 58q10 8 20 0" stroke="#2b1b24" stroke-width="3" fill="none" stroke-linecap="round"/>`,
  `<path d="M36 44q7-8 14 0M70 44q7-8 14 0" stroke="#2b1b24" stroke-width="3.200" fill="none" stroke-linecap="round"/><ellipse cx="34" cy="55" rx="6" ry="3.400" fill="#ff8fa8" opacity=".7"/><ellipse cx="86" cy="55" rx="6" ry="3.400" fill="#ff8fa8" opacity=".7"/><path d="M48 54q12 14 24 0z" fill="#7a2a3a"/>`][mood];
  return `<svg viewBox="0 0 120 84"><path d="M26 74C8 74 2 52 20 46C16 28 38 18 50 28C58 10 88 12 92 32C112 32 116 58 100 66C98 72 92 74 86 74z" style="fill:var(--cc,#6a7088)" stroke="rgba(30,30,60,.55)" stroke-width="2.500" stroke-linejoin="round"/>${face}</svg>`; };
const BOTTLE = `<svg viewBox="0 0 40 70"><path d="M15 6h10v8q8 4 8 18v28q0 6-6 6H13q-6 0-6-6V32q0-14 8-18z" fill="#bfe9ff" fill-opacity=".7" stroke="#6aa8c8" stroke-width="2"/><rect x="14" y="2" width="12" height="8" rx="2" fill="#c98a4a" stroke="#7a4a22"/><rect x="14" y="30" width="12" height="22" rx="1" fill="#fff8e0" stroke="#c9a050" transform="rotate(-8 20 41)"/><path d="M16 36h8M16 41h8M16 46h6" stroke="#b09a68" stroke-width="1" stroke-linecap="round" transform="rotate(-8 20 41)"/><path d="M11 24v30" stroke="#fff" stroke-opacity=".8" stroke-width="2.500" stroke-linecap="round"/></svg>`;
const BOTTLE_NOTES = ["You're doing better than you think.", "Breathe. This moment is enough.", "Worries shrink when you say them out loud.", "Be as kind to yourself as you'd be to a friend.", "You've handled hard days before, and you can handle this one.", "You don't have to fix it all today.", "Small steps still count as moving forward.", "Someone is glad you exist.", "It's okay to rest in the middle of a storm.", "Not every thought is true. Let the scary ones float by.", "Calm isn't the absence of worry. It's choosing to breathe through it.", "You are braver than your worry.", "This feeling will change, because feelings always do.", "You asked for help from yourself today. That counts."];
const bottlesFound = () => G.load("heartnote-wb-bottles", []);
const DOLPHIN = `<svg viewBox="0 0 120 70"><defs><linearGradient id="dolg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7ec4f0"/><stop offset="1" stop-color="#3a86c8"/></linearGradient></defs><path d="M6 44Q10 12 52 12Q88 12 108 34L118 22L116 48L106 40Q88 62 52 60Q20 60 6 44z" fill="url(#dolg)" stroke="#2a5a98" stroke-width="2" stroke-linejoin="round"/><path d="M14 50Q50 66 100 42" fill="#eaf6ff" opacity=".8"/><path d="M50 14Q58 2 70 14" fill="#3a86c8" stroke="#2a5a98" stroke-width="2"/><circle cx="26" cy="34" r="4" fill="#2b1b24"/><circle cx="27.200" cy="32.800" r="1.400" fill="#fff"/><ellipse cx="34" cy="44" rx="4.400" ry="2.800" fill="#ff8fa8" opacity=".7"/><path d="M12 46q8 6 16 2" stroke="#2a5a98" stroke-width="2" fill="none" stroke-linecap="round"/></svg>`;
const FISH = `<svg viewBox="0 0 60 36"><path d="M6 18Q20 2 40 14L56 4L52 18L56 32L40 22Q20 36 6 18z" fill="#ffb347" stroke="#c9680a" stroke-width="1.500" stroke-linejoin="round"/><circle cx="16" cy="16" r="3" fill="#fff"/><circle cx="16.600" cy="16" r="1.600" fill="#2b1b24"/><path d="M26 10q4 8 0 16M32 11q4 7 0 14" stroke="#c9680a" stroke-width="1" fill="none" opacity=".6"/></svg>`;
const lerpHex = (a, b, f) => { const p = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16)); const x = p(a), y = p(b); return "#" + x.map((v, i) => Math.round(v + (y[i] - v) * f).toString(16).padStart(2, "0")).join(""); };
// the voyage runs from sunset, through night, to dawn
const SKY = [[0, "#ff9a6a", "#ffd0a0", "#5aa8c8", "#2a6890"], [0.25, "#7a4a9a", "#e8909a", "#3a6a9a", "#1f4570"], [0.5, "#0e1440", "#243a7a", "#1f3a6a", "#0f2048"], [0.8, "#3a3a7a", "#d88aa0", "#3a5a8a", "#1f3a60"], [1, "#ffc890", "#fff0c8", "#7fd0e8", "#3a96c8"]];
const skyAt = f => { let i = 0; while (i < SKY.length - 2 && f > SKY[i + 1][0]) i++; const a = SKY[i], b = SKY[i + 1], k = Math.max(0, Math.min(1, (f - a[0]) / (b[0] - a[0]))); return [1, 2, 3, 4].map(n => lerpHex(a[n], b[n], k)); };

function stepSail() {
  const T = 40, SPEED = 72, GAP = 0.8; // 4 breaths of 10s; a pearl every 0.8s
  let hold_ = false, level = 0, eff = 0, t = 0, running = false, got = 0, combo = 0, last = 0, next = 0;
  let mode = G.load("heartnote-wb-mode", "cozy"), boostUntil = 0, r = 1; // r = how big the worry cloud still is (1 = full size)
  const crewN = () => voyage.friends.length;
  const tol = () => (mode === "cozy" ? 0.26 : 0.19) + 0.035 * crewN() + (t < boostUntil ? 0.14 : 0); // friends and calm boosts make pearls easier to catch
  root.innerHTML = `<div class="wb-river drive" id="river"><div class="wb-stars" id="skystars"></div><div class="wb-orb moon" id="moon"></div><div class="wb-orb sun" id="sun"></div><div class="wb-cloud c1"></div><div class="wb-cloud c2"></div><div class="wb-waves"></div>
    <svg class="wb-guide" id="guide"></svg><div class="wb-track" id="track"></div><div class="wb-boat" id="boat">${boatSvg(worry, rankLevel(boats.length))}<div class="wb-crew" id="crew"></div></div>
    <div class="wb-wcloud" id="wcloud"></div><div class="wb-hud"><span>Pearls <b id="pc">0</b></span><span>Crew <b id="cc">0</b></span><span>Worry cloud <b id="wp">100</b>%</span><span id="combo"></span></div><div class="wb-count" id="count"></div><div class="wb-tip" id="tip"></div></div>
    <div class="wb-breath"><div class="g-chips" id="modes" style="justify-content:center"><button type="button" class="g-chip" data-m="cozy" aria-pressed="true">Cozy (easier)</button><button type="button" class="g-chip" data-m="adventure" aria-pressed="false">Adventure (wind gusts, tighter path)</button></div><div class="wb-how"><strong>How to play:</strong> <span>① Hold to rise (breathe in), let go to sink (breathe out) and follow the glowing path.</span> <span>② Collect pearls. Golden ones are worth 3!</span> <span>🌩 Your worry is the grumpy cloud. Every pearl you catch shrinks it and cheers it up!</span> <span>③ <b>Tap sea friends</b> when they float by to invite them aboard. They join your crew and help you catch more pearls. Tap jumping fish and floating bottles (they hold kind notes) for bonus pearls and to shrink the cloud faster.</span></div>
    <p id="cue" class="g-label" style="text-align:center;margin:0">Ready when you are.</p>
    <div class="wb-dots" id="dots">${"<i></i>".repeat(4)}</div>
    <button class="btn wb-hold" id="hold" type="button">Hold to breathe in</button>
    <div class="g-row"><button class="btn primary" id="start" type="button">Start sailing</button><button class="btn" id="skip" type="button">Let it go now</button></div></div>`;
  const river = root.querySelector("#river"), track = root.querySelector("#track"), guide = root.querySelector("#guide"), boat = root.querySelector("#boat"), cue = root.querySelector("#cue"), crew = root.querySelector("#crew");
  const dots = root.querySelectorAll("#dots i"), hold = root.querySelector("#hold"), pc = root.querySelector("#pc"), cc = root.querySelector("#cc"), comboEl = root.querySelector("#combo"), count = root.querySelector("#count"), tip = root.querySelector("#tip");
  const wcloud = root.querySelector("#wcloud"), wp = root.querySelector("#wp"), modeBtns = root.querySelectorAll("#modes .g-chip");
  const SIZEK = { small: 0.8, medium: 1.05, big: 1.35 }[size] || 1.05;
  const paintCloud = () => { const mood = r > .75 ? 0 : r > .5 ? 1 : r > .3 ? 2 : r > .12 ? 3 : 4; if (wcloud.dataset.mood != mood) { wcloud.dataset.mood = mood; wcloud.innerHTML = cloudSvg(mood); }
    wcloud.style.setProperty("--cc", lerpHex("#e8e6ff", "#5a6078", Math.min(1, r * 1.1))); wcloud.style.setProperty("--s", (SIZEK * (0.28 + 0.72 * r)).toFixed(2)); wcloud.classList.toggle("rain", r > .5); wp.textContent = Math.round(r * 100); };
  const shrink = v => { r = Math.max(0, r - v); paintCloud(); }, worryUp = v => { r = Math.min(1, r + v); paintCloud(); };
  const setMode = m => { mode = m; G.save("heartnote-wb-mode", m); modeBtns.forEach(b => b.setAttribute("aria-pressed", String(b.dataset.m === m))); };
  modeBtns.forEach(b => b.onclick = () => { if (!running) setMode(b.dataset.m); }); setMode(mode);
  const sunEl = root.querySelector("#sun"), moonEl = root.querySelector("#moon"), stars = root.querySelector("#skystars");
  for (let i = 0; i < 36; i++) { const s = G.el("i"); s.style.cssText = `left:${Math.random() * 100}%;top:${Math.random() * 34}%;width:${1 + Math.random() * 2}px;height:${1 + Math.random() * 2}px;animation-delay:${Math.random() * 3}s`; stars.appendChild(s); }
  const W = river.clientWidth || 600, H = river.clientHeight || 330, boatX = W * 0.2;
  const yFor = lv => H * 0.5 - lv * H * 0.32;               // top of the boat for a breath level 0..1
  const OFF = 70;                                           // from the boat's top to its middle
  const target = t => { const p = t % 10; return p < 4 ? p / 4 : 1 - (p - 4) / 6; };
  boat.style.left = boatX + "px"; boat.style.top = yFor(0) + "px";
  const setSky = f => { const [s1, s2, w1, w2] = skyAt(f); river.style.setProperty("--s1", s1); river.style.setProperty("--s2", s2); river.style.setProperty("--w1", w1); river.style.setProperty("--w2", w2);
    const night = Math.max(0, 1 - Math.abs(f - 0.5) / 0.32); stars.style.opacity = night; moonEl.style.opacity = night; moonEl.style.top = (16 - night * 4) + "%";
    sunEl.style.top = (f < 0.5 ? 14 + f * 90 : 14 + (1 - f) * 90) + "%"; sunEl.style.opacity = f < 0.3 || f > 0.75 ? 1 : 0; };
  setSky(0);
  // guide path and pearls
  let d = ""; for (let t = 0; t <= T + 4; t += 0.25) d += `${t ? "L" : "M"}${boatX + 70 + t * SPEED} ${yFor(target(t)) + OFF}`;
  guide.setAttribute("viewBox", `0 0 ${W + (T + 4) * SPEED} ${H}`); guide.style.width = (W + (T + 4) * SPEED) + "px"; guide.innerHTML = `<path d="${d}" fill="none" stroke="rgba(255,255,255,.8)" stroke-width="3" stroke-dasharray="2 9" stroke-linecap="round"/>`;
  const pearls = []; let idx = 0, total = 0;
  for (let t = 1.2; t < T; t += GAP, idx++) { const gold = idx % 7 === 6, v = gold ? 3 : 1; const e = G.el("i", "wb-pearl" + (gold ? " gold" : "")); e.style.left = (boatX + 70 + t * SPEED) + "px"; e.style.top = (yFor(target(t)) + OFF) + "px"; track.appendChild(e); pearls.push({ t, e, v }); total += v; }
  // sea friends: they drift by on the water. Tap one and it joins your crew.
  const pool = G.shuffle(FRIENDS), seen = new Set(friendsMet().map(f => f.id));
  const order = [...pool.filter(f => !seen.has(f.id)), ...pool.filter(f => seen.has(f.id))].slice(0, 3);
  [6, 17, 28].forEach((t0, i) => { const f = order[i]; const tt = t0 + Math.random() * 3; const e = G.el("button", "wb-friend", giftArt({ kind: f.kind }) + `<span class="wb-tap">Tap me!</span>`); e.type = "button"; e.title = `Invite ${f.name} aboard`;
    e.style.left = (boatX + 70 + tt * SPEED + 330) + "px"; e.style.top = (H * 0.7 + (Math.random() - 0.5) * 24) + "px"; track.appendChild(e);
    e.onclick = e2 => { e2.stopPropagation(); if (e.dataset.met || !running) return; e.dataset.met = "1"; const all = friendsMet(); const isNew = !all.some(x => x.id === f.id); if (isNew) { all.push({ id: f.id, at: Date.now() }); G.save("heartnote-wb-friends", all); } voyage.friends.push(f.id);
      e.querySelector(".wb-tap")?.remove(); e.classList.add("met"); const say = G.el("span", "wb-say", `${G.esc(f.name)}: ${G.esc(f.say)}${isNew ? " ★ new friend!" : ""}`); e.appendChild(say); Sfx.preset(["boing", "squeak", "bubble", "chime"][i % 4], 500 + i * 120);
      // the friend hops aboard and rides on deck
      const s = G.el("span", "wb-crewmate", giftArt({ kind: f.kind })); s.style.left = (16 + (crewN() - 1) * 26) + "%"; crew.appendChild(s); cc.textContent = crewN(); showTip(`${f.name} joined your crew! You can catch more pearls now.`);
      setTimeout(() => { say.remove(); e.style.opacity = 0; }, 2000); }; });
  const showTip = txt => { tip.textContent = txt; tip.classList.remove("show"); void tip.offsetWidth; tip.classList.add("show"); };
  // jumping fish for bonus pearls
  const GUSTS = [11, 23, 35], fishTimes = [9, 21, 33].map(x => x + Math.random() * 3); let fishI = 0;
  const spawnFish = () => { const e = G.el("button", "wb-fish", FISH); e.type = "button"; e.title = "Tap the fish!"; e.style.left = (W * (0.38 + Math.random() * 0.45)) + "px"; e.style.top = (H * 0.62) + "px"; river.appendChild(e);
    e.onclick = ev => { ev.stopPropagation(); if (e.dataset.got) return; e.dataset.got = "1"; got += 2; pc.textContent = got; shrink(0.03); Sfx.preset("bubble", 900); const p = G.el("span", "wb-pop hot", "+2 fish!"); p.style.left = e.style.left; p.style.top = (e.getBoundingClientRect().top - river.getBoundingClientRect().top) + "px"; river.appendChild(p); setTimeout(() => p.remove(), 900); e.remove(); };
    e.animate([{ transform: "translate(0,40px) rotate(-40deg)", opacity: 0 }, { transform: "translate(40px,-70px) rotate(0)", opacity: 1, offset: .45 }, { transform: "translate(80px,40px) rotate(45deg)", opacity: 0 }], { duration: 2000, easing: "ease-in-out" }).onfinish = () => e.remove(); setTimeout(() => e.remove(), 2400); };
  // messages in bottles drift by: tap one to read a kind note
  const bottleTimes = [14, 31].map(x => x + Math.random() * 3);
  bottleTimes.forEach(tb => { const e = G.el("button", "wb-friend wb-bottle", BOTTLE + `<span class="wb-tap">A note!</span>`); e.type = "button"; e.title = "A message in a bottle";
    e.style.left = (boatX + 70 + tb * SPEED + 330) + "px"; e.style.top = (H * 0.72 + (Math.random() - 0.5) * 20) + "px"; track.appendChild(e);
    e.onclick = ev => { ev.stopPropagation(); if (e.dataset.met || !running) return; e.dataset.met = "1"; const found = bottlesFound(); const left = BOTTLE_NOTES.map((n, k) => k).filter(k => !found.includes(k)); const k = G.pick(left.length ? left : BOTTLE_NOTES.map((n, k2) => k2)); if (!found.includes(k)) { found.push(k); G.save("heartnote-wb-bottles", found); }
      e.querySelector(".wb-tap")?.remove(); e.classList.add("met"); got += 3; pc.textContent = got; shrink(0.05); Sfx.preset("chime", 880); setTimeout(() => Sfx.preset("chime", 1175), 150); showTip(`📜 “${BOTTLE_NOTES[k]}”`); setTimeout(() => { e.style.opacity = 0; }, 1500); }; });
  // a dolphin leaps when you hold a calm streak
  const leap = () => { const e = G.el("div", "wb-dolphin", DOLPHIN); e.style.left = (boatX + 80) + "px"; e.style.top = (H * 0.62) + "px"; river.appendChild(e); Sfx.preset("whoosh", 500); setTimeout(() => Sfx.preset("chime", 988), 450); got += 3; pc.textContent = got;
    e.animate([{ transform: "translate(0,40px) rotate(-30deg)", opacity: 0 }, { transform: "translate(70px,-70px) rotate(-5deg)", opacity: 1, offset: .5 }, { transform: "translate(150px,40px) rotate(35deg)", opacity: 0 }], { duration: 1500, easing: "ease-out" }).onfinish = () => e.remove(); setTimeout(() => e.remove(), 2000);
    const p = G.el("span", "wb-pop hot", "Calm streak! +3"); p.style.left = (boatX + 20) + "px"; p.style.top = (H * 0.3) + "px"; river.appendChild(p); setTimeout(() => p.remove(), 1200); };
  
  const press = () => { hold_ = true; hold.classList.add("down"); hold.textContent = "Breathing in…"; };
  const release = () => { hold_ = false; hold.classList.remove("down"); hold.textContent = "Hold to breathe in"; };
  hold.addEventListener("pointerdown", e => { e.preventDefault(); press(); });
  river.addEventListener("pointerdown", e => { if (e.target.closest(".wb-friend, .wb-fish")) return; press(); });
  ["pointerup", "pointerleave", "pointercancel"].forEach(ev => { hold.addEventListener(ev, release); river.addEventListener(ev, release); });
  const kd = e => { if (e.code === "Space" && !e.repeat) { e.preventDefault(); press(); } }, ku = e => { if (e.code === "Space") release(); };
  addEventListener("keydown", kd); addEventListener("keyup", ku); addEventListener("blur", release);
  const cleanup = () => { removeEventListener("keydown", kd); removeEventListener("keyup", ku); removeEventListener("blur", release); running = false; };
  const pop = (txt, cls) => { const e = G.el("span", "wb-pop " + (cls || ""), txt); e.style.left = (boatX + 40) + "px"; e.style.top = (parseFloat(boat.style.top) + 6) + "px"; river.appendChild(e); setTimeout(() => e.remove(), 900); };
  const finish = skipped => {
    cleanup(); river.classList.add("done"); boat.classList.add("wb-gone"); Sfx.preset("whoosh", 700); setSky(1);
    const pct = total ? Math.min(1, got / total) : 0; voyage.pearls = got; voyage.total = total;
    voyage.stars = skipped ? 0 : pct >= .85 ? 3 : pct >= .6 ? 2 : 1; voyage.shrunk = skipped ? 0 : Math.round((1 - r) * 100); if (!skipped) { r = Math.min(r, 0.1); paintCloud(); }
    setTimeout(() => { Sfx.preset("chime", 784); setTimeout(() => Sfx.preset("chime", 988), 160); setTimeout(() => Sfx.preset("chime", 1319), 340); stepVoyageDone(skipped); }, 2200);
  };
  voyage = { stars: 0, pearls: 0, total, friends: [], shrunk: 0 }; paintCloud();
  const tick = now => {
    if (!running) return; const dt = Math.min(0.25, (now - last) / 1000); last = now; t += dt;
    level = Math.max(0, Math.min(1, level + (hold_ ? dt / 4 : -dt / 6)));
    // adventure mode: wind gusts shove the boat up or down for a couple of seconds, so you have to steer back
    let gust = 0; if (mode === "adventure") GUSTS.forEach((g, gi) => { const u = (t - g) / 2.4; if (u > -0.5 && u < 0 && !river.classList.contains("gust")) { river.classList.add("gust"); showTip("Wind gust! Steer back to the path."); } if (u >= 0 && u <= 1) gust += (gi % 2 ? -1 : 1) * 0.3 * Math.sin(Math.PI * u); if (u > 1) river.classList.remove("gust"); });
    eff = Math.max(0, Math.min(1, level + gust));
    boat.style.top = yFor(eff) + "px"; boat.classList.toggle("boost", t < boostUntil); boat.style.transform = `rotate(${(hold_ ? -3 : 3)}deg)`; track.style.transform = `translateX(${-t * SPEED}px)`; guide.style.transform = `translateX(${-t * SPEED}px)`; setSky(t / T);
    while (next < pearls.length && pearls[next].t <= t) { const p = pearls[next++]; const ok = Math.abs(eff - target(p.t)) < tol();
      if (ok) { got += p.v; combo++; p.e.classList.add("got"); pc.textContent = got; Sfx.preset("ding", p.v > 1 ? 1320 : 700 + Math.min(combo, 12) * 40); pop(p.v > 1 ? "+3 GOLD!" : combo > 2 ? `+1  x${combo}` : "+1", p.v > 1 || combo > 4 ? "hot" : ""); shrink(p.v / total * 1.0); if (combo > 0 && combo % 10 === 0) { leap(); boostUntil = t + 4; showTip("Calm Boost! Pearls are easier to catch for a few seconds."); } } else { combo = 0; p.e.classList.add("miss"); worryUp(0.012); }
      comboEl.textContent = combo > 2 ? `Combo x${combo}` : ""; }
    if (fishI < fishTimes.length && t >= fishTimes[fishI]) { fishI++; spawnFish(); }
    dots.forEach((dEl, i) => dEl.classList.toggle("on", t >= (i + 1) * 10)); cue.textContent = (t % 10) < 4 ? "Breathe in… hold to rise" : "Breathe out… let go, glide down";
    if (t >= T) return finish(false); requestAnimationFrame(tick);
  };
  const begin = () => { let c = 3; count.textContent = c; Sfx.preset("ding", 520); showTip("Sea friends will float by. Tap them to invite them aboard!"); const iv = setInterval(() => { c--; count.textContent = c > 0 ? c : "Sail!"; Sfx.preset("ding", c > 0 ? 520 : 880); if (c < 0) { clearInterval(iv); count.textContent = ""; running = true; last = performance.now(); requestAnimationFrame(tick); } }, 800); };
  root.querySelector("#start").onclick = e => { e.target.disabled = true; begin(); };
  root.querySelector("#skip").onclick = () => { if (running) { running = false; } finish(true); };
}

// ---- voyage results: stars, pearls, friends, rank ----
function stepVoyageDone(skipped) {
  const met = voyage.friends.map(id => FRIENDS.find(f => f.id === id)).filter(Boolean);
  const msg = skipped ? "You let it go." : ["", "You made it. Every breath counts.", "Steady sailing!", "Perfectly calm. Beautiful."][voyage.stars];
  root.innerHTML = `<div class="wb-reflect" style="text-align:center"><p style="font-size:1.4rem;margin:4px 0"><strong>${msg}</strong></p>
    <div class="wb-endcloud">${cloudSvg(skipped ? 2 : voyage.shrunk >= 70 ? 4 : voyage.shrunk >= 40 ? 3 : 2)}</div><p style="margin:2px 0"><strong>${skipped ? "You let your worry cloud float away." : voyage.shrunk >= 70 ? "Your worry cloud shrank to a tiny happy cloud!" : voyage.shrunk >= 40 ? "Your worry cloud shrank a lot and cheered up." : "Your worry cloud got a little smaller."}</strong></p>${skipped ? "" : `<div class="wb-shrink" aria-label="Worry shrank by ${voyage.shrunk} percent"><i id="shrinkbar"></i></div><p class="g-stat" style="margin:0">Worry shrank by ${voyage.shrunk}%</p>`}<div class="wb-stars" aria-label="${voyage.stars} of 3 stars">${[1, 2, 3].map(i => `<span class="${i <= voyage.stars ? "on" : ""}" style="animation-delay:${i * 0.25}s">★</span>`).join("")}</div>
    ${skipped ? "" : `<p>Pearls collected: <strong>${voyage.pearls}</strong> <span class="g-stat">(golden pearls, fish and dolphin bonuses included)</span></p>`}
    ${met.length ? `<p>Your crew this trip: ${met.map(f => `<strong>${G.esc(f.name)}</strong>`).join(", ")}</p>` : `<p class="g-stat">No sea friends tapped this time. Next voyage, tap them when they float by!</p>`}
    <p class="g-stat">Sailor rank: ${rankFor(boats.length)} · ${boats.length} voyage${boats.length === 1 ? "" : "s"} so far</p>
    <div class="g-row" style="justify-content:center"><button class="btn primary" id="next" type="button">Next: is this worry yours to fix? →</button></div></div>`;
  root.querySelector("#next").onclick = stepReflect; setTimeout(() => { const b = root.querySelector("#shrinkbar"); if (b) b.style.width = voyage.shrunk + "%"; }, 150);
}

// ---- 4. reflect: what's yours to do? ----
function stepReflect() {
  root.innerHTML = `<div class="wb-reflect"><p class="g-label">Your boat is on its way. One question before you go:</p>
    <p>Is there anything about this worry you can do something about today?</p>
    <div class="g-chips"><button class="g-chip" id="yes" type="button">Yes, a little</button><button class="g-chip" id="no" type="button">No, it's out of my hands</button></div>
    <div id="more"></div></div>`;
  let can = null; const more = root.querySelector("#more");
  root.querySelector("#yes").onclick = () => {
    can = true; Sfx.preset("ding", 880);
    more.innerHTML = `<label class="g-label" for="step" style="margin-top:14px">What is one small step you could take?</label><input class="g-field" id="step" maxlength="120" placeholder="e.g. Study for 15 minutes tonight"><div id="friendbox"></div>`;
    more.querySelector("#step").focus();
    showFriendInto(more.querySelector("#friendbox"));
  };
  root.querySelector("#no").onclick = () => { can = false; Sfx.preset("chime", 523); more.innerHTML = `<p style="margin-top:14px"><strong>Then it's okay to let the river carry it.</strong> You don't have to hold what isn't yours to fix.</p><div id="friendbox"></div>`; const f = more.querySelector("#friendbox"); showFriendInto(f); };
  function showFriendInto(host) {
    host.innerHTML = `<label class="g-label" for="friend" style="margin-top:14px">What would you tell a friend who had this same worry? <span class="g-stat">(optional)</span></label>
      <textarea class="g-field" id="friend" rows="2" maxlength="200" placeholder="You'd probably be kind..."></textarea>
      <div class="g-row"><button class="btn primary" id="save" type="button">Add to my harbor</button></div>`;
    host.querySelector("#save").onclick = () => {
      const rec = { id: Date.now(), at: Date.now(), worry, size, can, step: can ? (root.querySelector("#step")?.value || "").trim() : "", done: false, friend: host.querySelector("#friend").value.trim(), stars: voyage.stars, pearls: voyage.pearls, friends: voyage.friends, shrunk: voyage.shrunk };
      boats.push(rec); G.save(WB_KEY, boats); worry = ""; G.save(WB_DRAFT, { text: "", size }); refreshStat(); stepDone(rec);
    };
  }
}

// ---- 5. done ----
function stepDone(rec) {
  root.innerHTML = `<div class="wb-reflect" style="text-align:center"><p style="font-size:1.3rem;margin:6px 0"><strong>Your worry has sailed.</strong></p>
    <p>${rec.can && rec.step ? `Your small step: <em>${G.esc(rec.step)}</em>. Check it off in your harbor when you've done it.` : rec.can ? "Take your small step whenever you're ready." : "You let go of what wasn't yours to carry."}</p>
    ${rec.friend ? `<p class="g-stat">What you'd tell a friend: “${G.esc(rec.friend)}” — that's worth telling yourself too.</p>` : ""}
    <div class="g-row" style="justify-content:center"><button class="btn primary" id="again" type="button">Sail another worry</button><button class="btn" id="open" type="button">See my harbor</button></div></div>`;
  Sfx.preset("chime", 784); setTimeout(() => Sfx.preset("chime", 988), 160);
  root.querySelector("#again").onclick = () => { worry = ""; stepWrite(); };
  root.querySelector("#open").onclick = openHarbor;
}

// ---- harbor ----
function openHarbor() {
  const rows = [...boats].reverse().map(b => `<li data-id="${b.id}"><strong>${G.esc(b.worry)}</strong><small>${SIZES[b.size] || ""} · ${G.date(b.at)}${b.stars ? " · " + "★".repeat(b.stars) : ""}${b.shrunk ? " · shrank " + b.shrunk + "%" : ""}</small>
    ${b.step ? `<label style="display:block;margin-top:6px"><input type="checkbox" class="stepdone" ${b.done ? "checked" : ""}> ${G.esc(b.step)}</label>` : b.can === false ? `<small>Let go ✓</small>` : ""}
    ${b.friend ? `<small>To a friend: “${G.esc(b.friend)}”</small>` : ""}</li>`).join("");
  const m = G.modal(`<h3>⚓ My harbor</h3><p class="g-stat">${boats.length ? "Every boat here is a worry you faced." : "No boats yet. Sail your first worry!"}</p>
    <div class="wb-harbor">${boats.map((b, i) => boatSvg("", rankLevel(i))).join("")}</div><p class="g-stat">Notes found in bottles: ${bottlesFound().length} of ${BOTTLE_NOTES.length}</p>${bottlesFound().length ? `<ul class="g-list">${bottlesFound().map(k => `<li>📜 ${G.esc(BOTTLE_NOTES[k])}</li>`).join("")}</ul>` : ""}<p class="g-stat">Sailor rank: <strong>${rankFor(boats.length)}</strong> · Sea friends met: ${friendsMet().length} of ${FRIENDS.length}</p><div class="wb-sea">${FRIENDS.map(f => `<div class="${friendsMet().some(x => x.id === f.id) ? "" : "locked"}">${giftArt({ kind: f.kind })}<br>${friendsMet().some(x => x.id === f.id) ? G.esc(f.name) : "???"}</div>`).join("")}</div><ul class="g-list">${rows}</ul><div class="g-row"><button class="btn" id="x" type="button">Close</button></div>`);
  m.box.querySelector("#x").onclick = m.close;
  m.box.querySelectorAll(".stepdone").forEach(c => c.onchange = () => { const id = +c.closest("li").dataset.id; const b = boats.find(x => x.id === id); b.done = c.checked; G.save(WB_KEY, boats); refreshStat(); if (c.checked) Sfx.preset("ding", 1320); });
}
document.getElementById("mine").onclick = openHarbor;
refreshStat();
stepWrite();
