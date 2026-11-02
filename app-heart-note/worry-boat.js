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

function stepSail() {
  const T = 40, SPEED = 72, GAP = 0.8; // 4 breaths of 10s; pearls every 0.8s
  root.innerHTML = `<div class="wb-river drive" id="river"><div class="wb-sun"></div><div class="wb-cloud c1"></div><div class="wb-cloud c2"></div><div class="wb-waves"></div>
    <svg class="wb-guide" id="guide"></svg><div class="wb-track" id="track"></div><div class="wb-boat" id="boat">${BOAT}</div>
    <div class="wb-hud"><span>Pearls <b id="pc">0</b></span><span id="combo"></span></div><div class="wb-count" id="count"></div></div>
    <div class="wb-breath"><p id="cue" class="g-label" style="text-align:center;margin:0">Hold the button to rise (breathe in). Let go to sink (breathe out). Follow the glowing path!</p>
    <div class="wb-dots" id="dots">${"<i></i>".repeat(4)}</div>
    <button class="btn wb-hold" id="hold" type="button">Hold to breathe in</button>
    <div class="g-row"><button class="btn primary" id="start" type="button">Start sailing</button><button class="btn" id="skip" type="button">Let it go now</button></div></div>`;
  const river = root.querySelector("#river"), track = root.querySelector("#track"), guide = root.querySelector("#guide"), boat = root.querySelector("#boat"), cue = root.querySelector("#cue");
  const dots = root.querySelectorAll("#dots i"), hold = root.querySelector("#hold"), pc = root.querySelector("#pc"), comboEl = root.querySelector("#combo"), count = root.querySelector("#count");
  const W = river.clientWidth || 600, H = river.clientHeight || 330, boatX = W * 0.2;
  const yFor = lv => H * 0.62 - lv * H * 0.36;              // boat top for a breath level 0..1
  const target = t => { const p = t % 10; return p < 4 ? p / 4 : 1 - (p - 4) / 6; };
  boat.style.left = boatX + "px"; boat.style.top = yFor(0) + "px";
  // guide path and pearls, laid out along the whole voyage
  let d = ""; for (let t = 0; t <= T + 4; t += 0.25) d += `${t ? "L" : "M"}${boatX + 60 + t * SPEED} ${yFor(target(t)) + 48}`;
  guide.setAttribute("viewBox", `0 0 ${W + (T + 4) * SPEED} ${H}`); guide.style.width = (W + (T + 4) * SPEED) + "px"; guide.innerHTML = `<path d="${d}" fill="none" stroke="rgba(255,255,255,.75)" stroke-width="3" stroke-dasharray="2 9" stroke-linecap="round"/>`;
  const pearls = []; for (let t = 1.2; t < T; t += GAP) { const e = G.el("i", "wb-pearl"); e.style.left = (boatX + 60 + t * SPEED) + "px"; e.style.top = (yFor(target(t)) + 40) + "px"; track.appendChild(e); pearls.push({ t, e, done: false }); }
  // friends drift by at random times: tap them to say hello
  const pool = G.shuffle(FRIENDS), seen = new Set(friendsMet().map(f => f.id));
  const order = [...pool.filter(f => !seen.has(f.id)), ...pool.filter(f => seen.has(f.id))].slice(0, 3);
  [8, 18, 29].forEach((t0, i) => { const f = order[i]; const tt = t0 + Math.random() * 3; const e = G.el("button", "wb-friend", giftArt({ kind: f.kind })); e.type = "button"; e.title = `Say hello to ${f.name}`;
    e.style.left = (boatX + 60 + tt * SPEED + 260) + "px"; e.style.top = (H * 0.66 + (Math.random() - 0.5) * 30) + "px"; track.appendChild(e);
    e.onclick = () => { if (e.dataset.met || !running) return; e.dataset.met = "1"; const all = friendsMet(); const isNew = !all.some(x => x.id === f.id); if (isNew) { all.push({ id: f.id, at: Date.now() }); G.save("heartnote-wb-friends", all); } voyage.friends.push(f.id);
      e.classList.add("met"); const say = G.el("span", "wb-say", `${G.esc(f.name)}: ${G.esc(f.say)}${isNew ? " ★ new friend!" : ""}`); e.appendChild(say); Sfx.preset(["boing", "squeak", "bubble", "chime"][i % 4], 500 + i * 120); setTimeout(() => say.remove(), 2600); }; });
  let hold_ = false, level = 0, t = 0, running = false, got = 0, combo = 0, last = 0, next = 0;
  const press = () => { hold_ = true; hold.classList.add("down"); hold.textContent = "Breathing in…"; };
  const release = () => { hold_ = false; hold.classList.remove("down"); hold.textContent = "Hold to breathe in"; };
  hold.addEventListener("pointerdown", e => { e.preventDefault(); press(); });
  river.addEventListener("pointerdown", e => { if (e.target.closest(".wb-friend")) return; press(); });
  ["pointerup", "pointerleave", "pointercancel"].forEach(ev => { hold.addEventListener(ev, release); river.addEventListener(ev, release); });
  const kd = e => { if (e.code === "Space" && !e.repeat) { e.preventDefault(); press(); } }, ku = e => { if (e.code === "Space") release(); };
  addEventListener("keydown", kd); addEventListener("keyup", ku); addEventListener("blur", release);
  const cleanup = () => { removeEventListener("keydown", kd); removeEventListener("keyup", ku); removeEventListener("blur", release); running = false; };
  const pop = (txt, cls) => { const e = G.el("span", "wb-pop " + (cls || ""), txt); e.style.left = (boatX + 40) + "px"; e.style.top = (parseFloat(boat.style.top) + 6) + "px"; river.appendChild(e); setTimeout(() => e.remove(), 900); };
  const finish = (skipped) => {
    cleanup(); river.classList.add("done"); boat.classList.add("wb-gone"); Sfx.preset("whoosh", 700);
    const pct = voyage.total ? got / voyage.total : 0; voyage.pearls = got; voyage.total = pearls.length;
    voyage.stars = skipped ? 0 : pct >= .85 ? 3 : pct >= .6 ? 2 : 1;
    setTimeout(() => { Sfx.preset("chime", 784); setTimeout(() => Sfx.preset("chime", 988), 160); setTimeout(() => Sfx.preset("chime", 1319), 340); stepVoyageDone(skipped); }, 2200);
  };
  voyage = { stars: 0, pearls: 0, total: pearls.length, friends: [] };
  const tick = now => {
    if (!running) return; const dt = Math.min(0.25, (now - last) / 1000); last = now; t += dt;
    level = Math.max(0, Math.min(1, level + (hold_ ? dt / 4 : -dt / 6)));
    boat.style.top = yFor(level) + "px"; boat.style.transform = `rotate(${(hold_ ? -4 : 4)}deg)`; track.style.transform = `translateX(${-t * SPEED}px)`; guide.style.transform = `translateX(${-t * SPEED}px)`;
    while (next < pearls.length && pearls[next].t <= t) { const p = pearls[next++]; const ok = Math.abs(level - target(p.t)) < 0.2;
      if (ok) { got++; combo++; p.e.classList.add("got"); pc.textContent = got; Sfx.preset("ding", 700 + Math.min(combo, 12) * 40); pop(combo > 2 ? `+1  x${combo}` : "+1", combo > 4 ? "hot" : ""); } else { combo = 0; p.e.classList.add("miss"); }
      comboEl.textContent = combo > 2 ? `Combo x${combo}` : ""; }
    dots.forEach((dEl, i) => dEl.classList.toggle("on", t >= (i + 1) * 10)); cue.textContent = target(t) >= 0 && (t % 10) < 4 ? "Breathe in… hold to rise" : "Breathe out… let go, glide down";
    if (t >= T) return finish(false); requestAnimationFrame(tick);
  };
  const begin = () => { let c = 3; count.textContent = c; Sfx.preset("ding", 520); const iv = setInterval(() => { c--; count.textContent = c > 0 ? c : "Sail!"; Sfx.preset("ding", c > 0 ? 520 : 880); if (c < 0) { clearInterval(iv); count.textContent = ""; running = true; last = performance.now(); requestAnimationFrame(tick); } }, 800); };
  root.querySelector("#start").onclick = e => { e.target.disabled = true; begin(); };
  root.querySelector("#skip").onclick = () => { if (running) { running = false; } finish(true); };
}

// ---- voyage results: stars, pearls, friends, rank ----
function stepVoyageDone(skipped) {
  const met = voyage.friends.map(id => FRIENDS.find(f => f.id === id)).filter(Boolean);
  const msg = skipped ? "You let it go." : ["", "You made it. Every breath counts.", "Steady sailing!", "Perfectly calm. Beautiful."][voyage.stars];
  root.innerHTML = `<div class="wb-reflect" style="text-align:center"><p style="font-size:1.4rem;margin:4px 0"><strong>${msg}</strong></p>
    <div class="wb-stars" aria-label="${voyage.stars} of 3 stars">${[1, 2, 3].map(i => `<span class="${i <= voyage.stars ? "on" : ""}" style="animation-delay:${i * 0.25}s">★</span>`).join("")}</div>
    ${skipped ? "" : `<p>Pearls collected: <strong>${voyage.pearls}</strong> of ${voyage.total}</p>`}
    ${met.length ? `<p>Friends you said hello to: ${met.map(f => `<strong>${G.esc(f.name)}</strong>`).join(", ")}</p>` : ""}
    <p class="g-stat">Sailor rank: ${rankFor(boats.length)} · ${boats.length} voyage${boats.length === 1 ? "" : "s"} so far</p>
    <div class="g-row" style="justify-content:center"><button class="btn primary" id="next" type="button">Next: is this worry yours to fix? →</button></div></div>`;
  root.querySelector("#next").onclick = stepReflect;
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
      const rec = { id: Date.now(), at: Date.now(), worry, size, can, step: can ? (root.querySelector("#step")?.value || "").trim() : "", done: false, friend: host.querySelector("#friend").value.trim(), stars: voyage.stars, pearls: voyage.pearls, friends: voyage.friends };
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
  const rows = [...boats].reverse().map(b => `<li data-id="${b.id}"><strong>${G.esc(b.worry)}</strong><small>${SIZES[b.size] || ""} · ${G.date(b.at)}${b.stars ? " · " + "★".repeat(b.stars) : ""}</small>
    ${b.step ? `<label style="display:block;margin-top:6px"><input type="checkbox" class="stepdone" ${b.done ? "checked" : ""}> ${G.esc(b.step)}</label>` : b.can === false ? `<small>Let go ✓</small>` : ""}
    ${b.friend ? `<small>To a friend: “${G.esc(b.friend)}”</small>` : ""}</li>`).join("");
  const m = G.modal(`<h3>⚓ My harbor</h3><p class="g-stat">${boats.length ? "Every boat here is a worry you faced." : "No boats yet. Sail your first worry!"}</p>
    <div class="wb-harbor">${boats.map((b, i) => harborBoat(["#fffdf4", "#ffe8c8", "#e8f4ff", "#ffe0ec"][i % 4])).join("")}</div><p class="g-stat">Sailor rank: <strong>${rankFor(boats.length)}</strong> · Sea friends met: ${friendsMet().length} of ${FRIENDS.length}</p><div class="wb-sea">${FRIENDS.map(f => `<div class="${friendsMet().some(x => x.id === f.id) ? "" : "locked"}">${giftArt({ kind: f.kind })}<br>${friendsMet().some(x => x.id === f.id) ? G.esc(f.name) : "???"}</div>`).join("")}</div><ul class="g-list">${rows}</ul><div class="g-row"><button class="btn" id="x" type="button">Close</button></div>`);
  m.box.querySelector("#x").onclick = m.close;
  m.box.querySelectorAll(".stepdone").forEach(c => c.onchange = () => { const id = +c.closest("li").dataset.id; const b = boats.find(x => x.id === id); b.done = c.checked; G.save(WB_KEY, boats); refreshStat(); if (c.checked) Sfx.preset("ding", 1320); });
}
document.getElementById("mine").onclick = openHarbor;
refreshStat();
stepWrite();
