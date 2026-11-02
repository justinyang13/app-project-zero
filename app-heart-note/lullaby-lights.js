// Lullaby Lights: echo the sleepy stars. Each round the sky dims and slows until your sleepy friend drifts off.
const LL_KEY = "heartnote-lullaby", ROUNDS = 7;
const root = document.getElementById("game"), stat = document.getElementById("stat");
G.wireSound(document.getElementById("sound"));
const NOTES = [392, 440, 494, 587, 659];
const SPOTS = [[18, 42], [36, 22], [55, 38], [72, 22], [84, 46]];
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
let S = G.load(LL_KEY, { nights: 0, pets: [], current: null });
const save = () => G.save(LL_KEY, S);
const starSvg = `<svg viewBox="0 0 64 64"><path class="core" d="M32 6l7 16 17 2-13 11 4 17-15-9-15 9 4-17L8 24l17-2z" stroke="#fff3a0" stroke-width="1.500" stroke-linejoin="round"/></svg>`;

function refresh(extra = "") {
  stat.textContent = `Nights completed: ${S.nights} · Sleepy friends met: ${S.pets.length} of ${PET_IDS.length}${extra ? " · " + extra : ""}`;
}
function nextPet() {
  const unmet = PET_IDS.filter(p => !S.pets.includes(p));
  return G.pick(unmet.length ? unmet : PET_IDS);
}

function scene() {
  root.innerHTML = `<div class="g-stage ll-sky" id="sky"><div class="ll-moon" id="moon"></div><div class="ll-dim" id="dim"></div>
    ${SPOTS.map(([x, y], i) => `<button class="ll-star" type="button" data-i="${i}" style="left:${x}%;top:${y}%" aria-label="Star ${i + 1}">${starSvg}</button>`).join("")}
    <div class="ll-pet show" id="pet"></div><div class="ll-zzz" id="zzz">Z z z</div><div class="ll-cue" id="cue"></div></div>
    <div class="g-row"><button class="btn primary" id="begin" type="button">Begin the night</button><button class="btn" id="skip" type="button" hidden>Skip to goodnight</button><span class="g-grow"></span><span class="g-stat" id="round"></span></div>`;
}

function play() {
  scene();
  const pet = nextPet(); S.current = pet; save();
  const sky = root.querySelector("#sky"), dim = root.querySelector("#dim"), cue = root.querySelector("#cue"), petEl = root.querySelector("#pet"), zzz = root.querySelector("#zzz"), roundEl = root.querySelector("#round");
  const stars = [...root.querySelectorAll(".ll-star")], begin = root.querySelector("#begin"), skip = root.querySelector("#skip");
  petEl.innerHTML = PETS[pet].art; cue.textContent = `${PETS[pet].name} is sleepy. Can you help them drift off?`;
  let round = 1, seq = [], pos = 0, accepting = false, stopped = false;
  const light = (i, ms = 420) => { const s = stars[i]; s.classList.add("lit"); Sfx.preset("ding", NOTES[i]); setTimeout(() => s.classList.remove("lit"), ms); };
  const makeSeq = () => { seq = []; for (let i = 0; i < round + 1; i++) { let n; do { n = Math.floor(Math.random() * 5); } while (seq.length && n === seq[seq.length - 1]); seq.push(n); } };
  const listen = () => {
    if (stopped) return; accepting = false; pos = 0;
    roundEl.textContent = `Round ${round} of ${ROUNDS}`;
    cue.textContent = "Listen to the stars…"; const gap = 650 + round * 110;
    seq.forEach((n, k) => setTimeout(() => { if (!stopped) light(n, gap * 0.6); }, 900 + k * gap));
    setTimeout(() => { if (stopped) return; accepting = true; cue.textContent = "Your turn. Tap the stars in the same order."; }, 900 + seq.length * gap + 200);
  };
  const nextRound = () => {
    dim.style.opacity = Math.min(0.78, round / (ROUNDS + 1) * 0.85);
    root.querySelector("#moon").style.opacity = Math.max(0.35, 1 - round / (ROUNDS + 2));
    cue.textContent = "Lovely. Breathe out slowly…"; Sfx.preset("chime", 523);
    if (round >= ROUNDS) return setTimeout(goodnight, 2300);
    round++; makeSeq(); setTimeout(listen, 2300);
  };
  const goodnight = () => {
    stopped = true; accepting = false; skip.hidden = true;
    dim.style.opacity = 0.84; petEl.querySelector(".eo").style.display = "none"; petEl.querySelector(".ec").style.display = "";
    zzz.style.visibility = "visible";
    cue.textContent = `${PETS[pet].name} is fast asleep. Rest is allowed. Goodnight.`;
    Sfx.preset("chime", 392); setTimeout(() => Sfx.preset("chime", 330), 500); setTimeout(() => Sfx.preset("chime", 262), 1100);
    S.nights++; const isNew = !S.pets.includes(pet); if (isNew) S.pets.push(pet); S.current = null; save();
    refresh(isNew ? `You met ${PETS[pet].name}!` : "");
    begin.disabled = false; begin.textContent = "Another night"; begin.onclick = play; begin.hidden = false;
    roundEl.textContent = isNew ? `New friend: ${PETS[pet].name}` : "";
  };
  stars.forEach((s, i) => s.onclick = () => {
    if (!accepting) { light(i, 300); return; }
    if (i === seq[pos]) {
      light(i); pos++;
      if (pos === seq.length) { accepting = false; setTimeout(nextRound, 700); }
    } else {
      accepting = false; s.classList.add("oops"); setTimeout(() => s.classList.remove("oops"), 500); Sfx.preset("purr", 140);
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
document.getElementById("mine").onclick = friends;
play();
