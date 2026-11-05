// Lullaby Lights: echo the sleepy stars. Each round the sky dims and slows until your sleepy friend drifts off.
const LL_KEY = "heartnote-lullaby", ROUNDS = 7;
const root = document.getElementById("game"), stat = document.getElementById("stat");
G.wireSound(document.getElementById("sound"));
// seven stars, and each one sings its own little lullaby phrase (a few soft music-box notes), so echoing them plays a lullaby
const SPOTS = [[10, 44], [24, 20], [38, 42], [52, 16], [66, 40], [78, 30], [91, 56]];
const MOTIFS = [[330, 392, 330], [392, 440, 392, 330], [262, 330, 392], [440, 392, 330, 294], [523, 440, 392], [294, 330, 392, 330], [392, 523, 440, 392]];
// every sleepy friend has its own sky, so no two nights look alike
const hill = (c, y, d) => `<path d="${d}" fill="${c}"/>`;
const pines = Array.from({ length: 11 }, (_, i) => { const x = 4 + i * 9.5, h = 14 + (i * 7 % 9); return `<path d="M${x} 30 L${x + 4.5} ${30 - h} L${x + 9} 30z" fill="#0a1f26"/>`; }).join("");
const roofs = [[0, 16, 12], [11, 8, 17], [22, 12, 11], [32, 6, 20], [44, 14, 9], [53, 9, 15], [64, 13, 12], [75, 7, 18], [85, 12, 13]].map(([x, h, w]) => `<rect x="${x}" y="${30 - h}" width="${w}" height="${h}" fill="#10142e"/>${Array.from({ length: 3 }, (_, k) => `<rect x="${x + 2 + k * 3.4}" y="${30 - h + 3 + (k % 2) * 4}" width="1.600" height="2" fill="#ffd86a" opacity="${k % 2 ? .9 : .6}"/>`).join("")}`).join("");
const SKIES = {
  bunny: { name: "meadow dusk", bg: "linear-gradient(#3a2a6a, #a85a96 70%, #e89aa6)", core: "#c2a8d8", moon: "crescent:#fff0c8", fx: ["firefly", 14], scenery: hill("#2a1850", 0, "M0 30Q16 10 32 22T62 18T100 12V30z") + hill("#1a0f38", 0, "M0 30Q22 20 44 26T100 21V30z") },
  bear: { name: "forest night", bg: "linear-gradient(#0c2a34, #1c5048 75%, #2a6a5a)", core: "#8fc4b0", moon: "full:#e8f8d8", fx: ["firefly", 16], scenery: pines },
  fox: { name: "autumn dusk", bg: "linear-gradient(#3a2058, #c0603a 72%, #f0a060)", core: "#e8b8a0", moon: "full:#ffb86a", fx: ["leaf", 14], scenery: hill("#3a1a24", 0, "M0 30Q20 8 42 20T80 16T100 10V30z") + hill("#240f1a", 0, "M0 30Q25 18 52 24T100 20V30z") },
  owl: { name: "deep starry night", bg: "linear-gradient(#02061a, #0e1a5a 70%, #24388a)", core: "#a8b4f0", moon: "crescent:#e8eeff", fx: ["twinkle", 46], scenery: `<path d="M0 30V8Q8 6 10 12Q16 4 22 12Q24 20 28 30z" fill="#05081c"/><path d="M0 16h14M4 10l10 6" stroke="#05081c" stroke-width="1.200"/>` },
  cat: { name: "rooftop night", bg: "linear-gradient(#141446, #34528a 75%, #5a82b0)", core: "#9fb4e0", moon: "full:#f4f0d8", fx: ["twinkle", 22], scenery: roofs },
  lamb: { name: "snowy night", bg: "linear-gradient(#26366a, #6a82c0 72%, #b8c8e8)", core: "#cfd8f4", moon: "full:#fffbe8", fx: ["snow", 26], scenery: hill("#e8eefc", 0, "M0 30Q18 14 36 24T70 20T100 16V30z") + hill("#c8d4f0", 0, "M0 30Q26 22 52 27T100 24V30z") }
};
function applySky(skyEl, moonEl, pet) {
  const sk = SKIES[pet]; skyEl.style.background = sk.bg; skyEl.style.setProperty("--sc", sk.core);
  skyEl.querySelectorAll(".ll-scene, .ll-fx").forEach(e => e.remove());
  const [shape, col] = sk.moon.split(":"); moonEl.style.background = shape === "crescent" ? `radial-gradient(circle at 70% 34%, transparent 47%, ${col} 49%)` : `radial-gradient(circle at 36% 32%, #fff, ${col} 60%)`; moonEl.style.boxShadow = `0 0 40px ${col}66`;
  skyEl.insertAdjacentHTML("afterbegin", `<svg class="ll-scene" viewBox="0 0 100 30" preserveAspectRatio="none">${sk.scenery}</svg>`);
  const [kind, n] = sk.fx; for (let i = 0; i < n; i++) { const e = G.el("i", `ll-fx ${kind}`); e.style.cssText = `left:${Math.random() * 100}%;top:${kind === "firefly" ? 40 + Math.random() * 50 : kind === "twinkle" ? Math.random() * 70 : -6}%;animation-delay:${(-Math.random() * 8).toFixed(2)}s;animation-duration:${(kind === "snow" ? 6 : kind === "leaf" ? 8 : kind === "firefly" ? 5 : 3) + Math.random() * 4}s`; skyEl.appendChild(e); }
}
const eyes = (x1, x2, y) => `<g class="eo"><circle cx="${x1}" cy="${y}" r="3.200" fill="#2b1b24"/><circle cx="${x2}" cy="${y}" r="3.200" fill="#2b1b24"/><circle cx="${x1 + 1}" cy="${y - 1}" r="1" fill="#fff"/><circle cx="${x2 + 1}" cy="${y - 1}" r="1" fill="#fff"/></g><g class="ec" style="display:none" fill="none" stroke="#2b1b24" stroke-width="2" stroke-linecap="round"><path d="M${x1 - 3.500} ${y}q3.500 3.500 7 0"/><path d="M${x2 - 3.500} ${y}q3.500 3.500 7 0"/></g>`;
const blush = (a, b, y) => `<ellipse cx="${a}" cy="${y}" rx="4" ry="2.400" fill="#ff8fa8" opacity=".5"/><ellipse cx="${b}" cy="${y}" rx="4" ry="2.400" fill="#ff8fa8" opacity=".5"/>`;
const PETS = {
  bunny: { name: "Hop the Bunny", art: `<svg viewBox="0 0 100 90"><ellipse cx="34" cy="20" rx="8" ry="22" fill="#fff" stroke="#d8c8d8"/><ellipse cx="66" cy="20" rx="8" ry="22" fill="#fff" stroke="#d8c8d8"/><ellipse cx="34" cy="22" rx="3.500" ry="15" fill="#ffc0d0"/><ellipse cx="66" cy="22" rx="3.500" ry="15" fill="#ffc0d0"/><ellipse cx="50" cy="58" rx="34" ry="28" fill="#fff" stroke="#d8c8d8" stroke-width="1.500"/>${eyes(38, 62, 54)}${blush(30, 70, 64)}<ellipse cx="50" cy="62" rx="3.500" ry="2.600" fill="#ff8fa8"/><path d="M50 65v4M44 70q6 4 12 0" stroke="#b08a98" stroke-width="1.500" fill="none" stroke-linecap="round"/></svg>` },
  bear: { name: "Bruno the Bear", art: `<svg viewBox="0 0 100 90"><circle cx="24" cy="26" r="14" fill="#a8703a"/><circle cx="76" cy="26" r="14" fill="#a8703a"/><circle cx="24" cy="26" r="7" fill="#e8b888"/><circle cx="76" cy="26" r="7" fill="#e8b888"/><ellipse cx="50" cy="55" rx="38" ry="31" fill="#c4884a" stroke="#8a5a2a" stroke-width="1.500"/><ellipse cx="50" cy="66" rx="16" ry="12" fill="#f0d4a8"/>${eyes(35, 65, 50)}${blush(28, 72, 62)}<ellipse cx="50" cy="60" rx="5" ry="3.500" fill="#3a2314"/><path d="M50 63v4M44 68q6 5 12 0" stroke="#3a2314" stroke-width="1.500" fill="none" stroke-linecap="round"/></svg>` },
  fox: { name: "Rusty the Fox", art: `<svg viewBox="0 0 100 90"><path d="M16 8l22 24-24 8z" fill="#e8742a"/><path d="M84 8L62 32l24 8z" fill="#e8742a"/><path d="M20 16l12 14-12 4z" fill="#3a2314"/><path d="M80 16L68 30l12 4z" fill="#3a2314"/><path d="M10 52c0-22 20-30 40-30s40 8 40 30c0 18-16 30-40 30S10 70 10 52z" fill="#f08a3a" stroke="#b85a14" stroke-width="1.500"/><path d="M10 58c10 4 22 8 40 22 18-14 30-18 40-22 0 14-16 26-40 26S10 72 10 58z" fill="#fff4e0"/>${eyes(35, 65, 50)}${blush(26, 74, 62)}<ellipse cx="50" cy="66" rx="4" ry="3" fill="#2b1b24"/></svg>` },
  owl: { name: "Hoot the Owl", art: `<svg viewBox="0 0 100 90"><path d="M20 12l14 14M80 12L66 26" stroke="#6a4a2a" stroke-width="8" stroke-linecap="round"/><ellipse cx="50" cy="52" rx="38" ry="34" fill="#8a6038" stroke="#5a3a1a" stroke-width="1.500"/><ellipse cx="50" cy="66" rx="22" ry="20" fill="#e8d0a0"/><circle cx="34" cy="46" r="14" fill="#fff4d8"/><circle cx="66" cy="46" r="14" fill="#fff4d8"/>${eyes(34, 66, 46)}<path d="M50 52l-6 8h12z" fill="#f0a020" stroke="#b87008"/>${blush(30, 70, 58)}</svg>` },
  cat: { name: "Mochi the Cat", art: `<svg viewBox="0 0 100 90"><path d="M16 36L20 6l24 18z" fill="#9aa4b8"/><path d="M84 36L80 6 56 24z" fill="#9aa4b8"/><path d="M22 26l2-12 12 8z" fill="#ffb0c0"/><path d="M78 26l-2-12-12 8z" fill="#ffb0c0"/><ellipse cx="50" cy="56" rx="38" ry="30" fill="#b4bccb" stroke="#7a8498" stroke-width="1.500"/>${eyes(35, 65, 52)}${blush(27, 73, 63)}<path d="M47 60l3 3 3-3z" fill="#ff8fa8"/><path d="M50 63v3M44 67q6 4 12 0" stroke="#5a6478" stroke-width="1.500" fill="none"/><path d="M14 58h14M14 64l14-2M86 58H72M86 64l-14-2" stroke="#7a8498" stroke-width="1.200" stroke-linecap="round"/></svg>` },
  lamb: { name: "Woolly the Lamb", art: `<svg viewBox="0 0 100 90"><g fill="#fffaf0" stroke="#e0d8c8" stroke-width="1.500"><circle cx="24" cy="40" r="16"/><circle cx="40" cy="22" r="17"/><circle cx="62" cy="22" r="17"/><circle cx="78" cy="40" r="16"/><circle cx="30" cy="62" r="16"/><circle cx="70" cy="62" r="16"/></g><ellipse cx="50" cy="56" rx="26" ry="28" fill="#3a3a48"/><ellipse cx="50" cy="60" rx="22" ry="22" fill="#5a5a6a"/><path d="M18 36q-10-2-8 8M82 36q10-2 8 8" stroke="#3a3a48" stroke-width="7" fill="none" stroke-linecap="round"/>${eyes(40, 60, 54).replace(/#2b1b24/g, "#fff")}${blush(34, 66, 64)}<path d="M46 68q4 3 8 0" stroke="#fff" stroke-width="1.500" fill="none" stroke-linecap="round"/></svg>` }
};
const PET_IDS = Object.keys(PETS);
let S = G.load(LL_KEY, { nights: 0, pets: [], current: null, dust: 0, room: [] });
S.dust = S.dust || 0; S.room = S.room || [];
// the sleepy room: spend dream stars on things that stay in your sleepy friends' room, night after night
const ROOM = [
  { id: "slippers", name: "Fuzzy slippers", cost: 2, kind: "slippers", pos: [36, 6] }, { id: "nightlamp", name: "Night lamp", cost: 3, kind: "nightlamp", pos: [7, 14] },
  { id: "cloudpillow", name: "Cloud pillow", cost: 3, kind: "cloudpillow", pos: [66, 8] }, { id: "sleepmask", name: "Sleep mask", cost: 3, kind: "sleepmask", pos: [84, 20] },
  { id: "teddy", name: "Teddy bear", cost: 4, kind: "teddy", pos: [20, 4] }, { id: "blanket", name: "Cozy blanket", cost: 4, kind: "blanket", pos: [50, 2] }
];
const REVERSE_ROUNDS = [4, 7]; // on these rounds you echo the stars backwards
const save = () => G.save(LL_KEY, S);
const starSvg = `<svg viewBox="0 0 64 64"><path class="core" d="M32 6l7 16 17 2-13 11 4 17-15-9-15 9 4-17L8 24l17-2z" stroke="#fff3a0" stroke-width="1.500" stroke-linejoin="round"/></svg>`;

function refresh(extra = "") {
  stat.textContent = `Nights completed: ${S.nights} · Sleepy friends met: ${S.pets.length} of ${PET_IDS.length} · Dream stars: ${S.dust} · Room items: ${S.room.length} of ${ROOM.length}${extra ? " · " + extra : ""}`;
}
function nextPet() { // new friends first, and never the same friend (so never the same sky) two nights in a row
  const others = PET_IDS.filter(p => p !== S.last), unmet = others.filter(p => !S.pets.includes(p));
  return G.pick(unmet.length ? unmet : others);
}

function scene() {
  root.innerHTML = `<div class="g-stage ll-sky" id="sky"><div class="ll-moon" id="moon"></div><div class="ll-dim" id="dim"></div>
    ${SPOTS.map(([x, y], i) => `<button class="ll-star" type="button" data-i="${i}" style="left:${x}%;top:${y}%" aria-label="Star ${i + 1}">${starSvg}</button>`).join("")}
    <svg class="ll-lines" id="llines" viewBox="0 0 100 100" preserveAspectRatio="none"></svg>${S.room.map(id => { const it = ROOM.find(r => r.id === id); return `<div class="ll-item" data-id="${id}" style="left:${it.pos[0]}%;bottom:${it.pos[1] + 38}px">${giftArt({ kind: it.kind })}</div>`; }).join("")}<div class="ll-pet show" id="pet"></div><div class="ll-zzz" id="zzz">Z z z</div><div class="ll-cue" id="cue"></div></div>
    <div class="g-row"><button class="btn primary" id="begin" type="button">Begin the night</button><button class="btn" id="skip" type="button" hidden>Skip to goodnight</button><button class="btn" id="roombtn" type="button">🛏 Sleepy room</button><span class="g-grow"></span><span class="g-stat" id="round"></span></div>`;
}

function play() {
  scene();
  const pet = nextPet(); S.current = pet; S.last = pet; save();
  const sky = root.querySelector("#sky"), dim = root.querySelector("#dim"), cue = root.querySelector("#cue"), petEl = root.querySelector("#pet"), zzz = root.querySelector("#zzz"), roundEl = root.querySelector("#round");
  const stars = [...root.querySelectorAll(".ll-star")], begin = root.querySelector("#begin"), skip = root.querySelector("#skip");
  applySky(sky, root.querySelector("#moon"), pet); petEl.innerHTML = PETS[pet].art; cue.textContent = `${PETS[pet].name} is sleepy. Each star sings a little lullaby.`;
  let round = 1, seq = [], want = [], pos = 0, accepting = false, stopped = false, mistakes = 0, nightMistakes = 0, prev = -1;
  const linesEl = root.querySelector("#llines"), isRev = () => REVERSE_ROUNDS.includes(round);
  const earn = (n, why) => { S.dust += n; save(); refresh(); const t = G.el("div", "g-toast", `+${n} dream star${n > 1 ? "s" : ""} ✦ ${G.esc(why)}`); sky.appendChild(t); setTimeout(() => t.remove(), 3300); Sfx.preset("chime", 1319); };
  root.querySelector("#roombtn").onclick = roomShop;
  const light = (i, ms = 420) => { const s = stars[i]; s.classList.add("lit"); Sfx.melody(MOTIFS[i]); setTimeout(() => s.classList.remove("lit"), ms); };
  const makeSeq = () => { seq = []; for (let i = 0; i < round + 1; i++) { let n; do { n = Math.floor(Math.random() * SPOTS.length); } while (seq.length && n === seq[seq.length - 1]); seq.push(n); } };
  const listen = () => {
    if (stopped) return; accepting = false; pos = 0; prev = -1; mistakes = 0; linesEl.innerHTML = ""; want = isRev() ? seq.slice().reverse() : seq;
    roundEl.textContent = `Round ${round} of ${ROUNDS} · ${SKIES[pet].name}`;
    cue.textContent = isRev() ? "Backwards night! Listen, then tap them in REVERSE." : "Listen to the stars…"; const gap = 650 + round * 110;
    seq.forEach((n, k) => setTimeout(() => { if (!stopped) light(n, gap * 0.6); }, 900 + k * gap));
    setTimeout(() => { if (stopped) return; accepting = true; cue.textContent = isRev() ? "Your turn. Start from the LAST star you heard!" : "Your turn. Tap the stars in the same order."; }, 900 + seq.length * gap + 200);
  };
  const nextRound = () => {
    dim.style.opacity = Math.min(0.78, round / (ROUNDS + 1) * 0.85);
    root.querySelector("#moon").style.opacity = Math.max(0.35, 1 - round / (ROUNDS + 2));
    cue.textContent = "Lovely. Breathe out slowly…"; Sfx.preset("chime", 523); petEl.classList.add("yawn"); setTimeout(() => petEl.classList.remove("yawn"), 2200); earn(mistakes === 0 ? 2 : 1, mistakes === 0 ? "a perfect round!" : "round complete");
    if (round >= ROUNDS) return setTimeout(goodnight, 2300);
    round++; makeSeq(); setTimeout(listen, 2300);
  };
  const goodnight = () => {
    stopped = true; accepting = false; skip.hidden = true;
    dim.style.opacity = 0.84; petEl.querySelector(".eo").style.display = "none"; petEl.querySelector(".ec").style.display = "";
    zzz.style.visibility = "visible";
    cue.textContent = `${PETS[pet].name} is fast asleep. Rest is allowed. Goodnight.`;
    Sfx.preset("chime", 392); setTimeout(() => Sfx.preset("chime", 330), 500); setTimeout(() => Sfx.preset("chime", 262), 1100);
    if (nightMistakes === 0 && round >= ROUNDS) earn(2, "a perfect night!"); S.nights++; const isNew = !S.pets.includes(pet); if (isNew) S.pets.push(pet); S.current = null; save();
    refresh(isNew ? `You met ${PETS[pet].name}!` : "");
    begin.disabled = false; begin.textContent = "Another night"; begin.onclick = play; begin.hidden = false;
    roundEl.textContent = isNew ? `New friend: ${PETS[pet].name}` : "";
  };
  stars.forEach((s, i) => s.onclick = () => {
    if (!accepting) { light(i, 300); return; }
    if (i === want[pos]) {
      light(i); pos++; petEl.classList.remove("nod"); void petEl.offsetWidth; petEl.classList.add("nod");
      if (prev >= 0) { const a = SPOTS[prev], b = SPOTS[i]; linesEl.insertAdjacentHTML("beforeend", `<line x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}" stroke="rgba(255,240,170,.8)" stroke-width="1.100" stroke-linecap="round" vector-effect="non-scaling-stroke" style="stroke-width:2.500"/>`); } prev = i;
      if (pos === want.length) { accepting = false; setTimeout(nextRound, 700); }
    } else {
      accepting = false; mistakes++; nightMistakes++; s.classList.add("oops"); setTimeout(() => s.classList.remove("oops"), 500); Sfx.preset("purr", 140);
      cue.textContent = "That's okay. Let's listen once more…"; setTimeout(listen, 1700);
    }
  });
  begin.onclick = () => { begin.hidden = true; skip.hidden = false; makeSeq(); listen(); };
  skip.onclick = () => { stopped = true; goodnight(); };
  refresh();
}

function friends() {
  const m = G.modal(`<h3>🌙 My sleepy friends</h3><p class="g-stat">${S.pets.length} of ${PET_IDS.length} met · ${S.nights} night${S.nights === 1 ? "" : "s"} of rest</p>
    <div class="ll-pets">${PET_IDS.map(id => `<div class="${S.pets.includes(id) ? "" : "locked"}">${PETS[id].art}<br>${S.pets.includes(id) ? PETS[id].name : "???"}</div>`).join("")}</div>
    <div class="g-row"><button class="btn" id="x" type="button">Close</button></div>`);
  m.box.querySelector("#x").onclick = m.close;
}
function roomShop() {
  const draw = () => {
    m.box.innerHTML = `<h3>🛏 Sleepy room</h3><p class="g-stat">Spend dream stars ✦ on things for your sleepy friends' room. You have <strong>${S.dust}</strong>. Earn more by completing rounds, and perfect rounds earn extra.</p>
      <div class="ll-shop">${ROOM.map(it => { const own = S.room.includes(it.id); return `<div class="ll-shopitem ${own ? "own" : ""}"><div class="ll-shopart">${giftArt({ kind: it.kind })}</div><strong>${it.name}</strong><button class="btn ${own ? "" : S.dust >= it.cost ? "primary" : ""}" data-id="${it.id}" type="button" ${own || S.dust < it.cost ? "disabled" : ""}>${own ? "In your room ✓" : `Buy · ${it.cost} ✦`}</button></div>`; }).join("")}</div>
      <div class="g-row"><button class="btn" id="x" type="button">Close</button></div>`;
    m.box.querySelector("#x").onclick = m.close;
    m.box.querySelectorAll("button[data-id]").forEach(b => b.onclick = () => { const it = ROOM.find(r => r.id === b.dataset.id); if (S.dust < it.cost || S.room.includes(it.id)) return; S.dust -= it.cost; S.room.push(it.id); save(); refresh(); Sfx.preset("chime", 880); setTimeout(() => Sfx.preset("chime", 1175), 140);
      const sk = root.querySelector("#sky"); if (sk && !sk.querySelector(`.ll-item[data-id="${it.id}"]`)) sk.insertAdjacentHTML("beforeend", `<div class="ll-item" data-id="${it.id}" style="left:${it.pos[0]}%;bottom:${it.pos[1] + 38}px">${giftArt({ kind: it.kind })}</div>`); draw(); });
  };
  const m = G.modal(""); draw();
}
document.getElementById("mine").onclick = friends;
play();
