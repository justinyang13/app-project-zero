// Joy Jar: catch good moments like fireflies, savor each one, keep them in a glowing jar, and let them go when you're ready.
// Filling a jar earns a Firefly Gift for your collection.
const JJ_KEY = "heartnote-joyjars", JJ_GIFTS = "heartnote-joygifts", CAP = 10;
const root = document.getElementById("game"), stat = document.getElementById("stat");
G.wireSound(document.getElementById("sound"));
const IDEAS = ["A hug", "A good meal", "Sunshine on my face", "Laughing with someone", "A kind word", "Finishing something hard", "Time with a pet", "A song I love", "Something I'm proud of", "Fresh air", "A cozy moment", "Learning something new", "Someone smiled at me", "Being outside"];

// the gifts a full jar can give: each one is a joyful keepsake with a note
const FF_GIFTS = [
  { id: "star", kind: "star", name: "Wishing Star", note: "Every good moment you save is a star you can wish on. Make one small wish tonight, and thank yourself for noticing the good." },
  { id: "heart", kind: "heart", name: "Warm Heart", note: "A full jar means a full heart. Keep this one close and remember that joy doesn't have to be big to be real." },
  { id: "rainbow", kind: "rainbow", name: "Pocket Rainbow", note: "You collected colors on ordinary days. Rainbows are just light that kept going through the rain." },
  { id: "sun", kind: "sun", name: "Little Sun", note: "When days feel gray, look at your jar. It's proof that warm light is always somewhere close." },
  { id: "balloon", kind: "balloon", name: "Happy Balloon", note: "Joy feels lighter when you let it lift you. Float for a minute, then come back down with a smile." },
  { id: "cupcake", kind: "cupcake", name: "Celebration Cupcake", note: "Ten good moments is worth celebrating. You don't need a big reason to treat yourself to something sweet." },
  { id: "pinwheel", kind: "pinwheel", name: "Joy Pinwheel", note: "A pinwheel spins on the smallest breeze. Notice what gets your spirit spinning, and make a little room for it this week." },
  { id: "kite", kind: "kite", name: "Sky Kite", note: "Good feelings fly best when you run toward them. What is one playful thing you could do today?" },
  { id: "discoball", kind: "discoball", name: "Mini Disco Ball", note: "You turned ordinary moments into sparkle. Put on your favorite song and let some of that glitter land on you." },
  { id: "icepop", kind: "icepop", name: "Sunny Ice Pop", note: "Slow down and enjoy the sweet things before they melt. You've been collecting them, so you know how." },
  { id: "sunflower", kind: "sunflower", name: "Sunflower Smile", note: "Sunflowers turn toward the light. So do you, every time you stop to catch a good moment." },
  { id: "confettipopper", kind: "confettipopper", name: "Confetti Popper", note: "Pop! You filled a whole jar with joy. Say it out loud: I noticed the good, and I kept it." }
];
const giftById = id => FF_GIFTS.find(g => g.id === id);

let S = G.load(JJ_KEY, { jars: [{ id: 1, name: "", memories: [], sealed: false }], pendingGift: null });
if (!S.jars.some(j => !j.sealed)) S.jars.push({ id: Date.now(), name: "", memories: [], sealed: false });
let gifts = G.load(JJ_GIFTS, []);
const save = () => G.save(JJ_KEY, S), saveGifts = () => G.save(JJ_GIFTS, gifts);
const cur = () => S.jars.find(j => !j.sealed);
const jarCount = j => j.memories.reduce((n, m) => n + (m.golden ? 2 : 1), 0); // a golden moment fills two spots

// ---- art ----
// a cute, lifelike firefly: translucent veined wings, a segmented body, a glowing tail, big friendly eyes
const fireflySvg = `<svg viewBox="0 0 64 64" class="ff">
  <defs><radialGradient id="ffbelly" cx=".5" cy=".4" r=".7"><stop offset="0" stop-color="#fffde0"/><stop offset=".45" stop-color="#e6ff5a"/><stop offset="1" stop-color="#9ad820"/></radialGradient>
  <linearGradient id="ffwing" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffffff" stop-opacity=".85"/><stop offset="1" stop-color="#cfe8ff" stop-opacity=".35"/></linearGradient>
  <radialGradient id="ffbody" cx=".4" cy=".3" r=".9"><stop offset="0" stop-color="#8a6a48"/><stop offset="1" stop-color="#3a2a1c"/></radialGradient></defs>
  <g class="wing wl"><path d="M30 30C22 20 10 12 5 18c-3 6 6 16 24 15z" fill="url(#ffwing)" stroke="#a8c4e0" stroke-width=".8"/><path d="M29 31C20 24 12 20 8 20M29 32C20 29 12 27 8 25" stroke="#a8c4e0" stroke-width=".6" fill="none" opacity=".7"/></g>
  <g class="wing wr"><path d="M34 30C42 20 54 12 59 18c3 6-6 16-24 15z" fill="url(#ffwing)" stroke="#a8c4e0" stroke-width=".8"/><path d="M35 31C44 24 52 20 56 20M35 32C44 29 52 27 56 25" stroke="#a8c4e0" stroke-width=".6" fill="none" opacity=".7"/></g>
  <path d="M26 36c-1 8 2 16 6 18 4-2 7-10 6-18z" fill="#ffffc0" opacity=".0"/>
  <ellipse class="belly" cx="32" cy="46" rx="8" ry="10" fill="url(#ffbelly)"/><ellipse cx="29" cy="43" rx="2.600" ry="4" fill="#fff" opacity=".7"/>
  <path d="M24.500 41h15M24 46h16M25 51h14" stroke="#7a9a10" stroke-opacity=".35" stroke-width=".8" fill="none"/>
  <path d="M26 34c0-3 12-3 12 0v6H26z" fill="url(#ffbody)"/><path d="M25 38l-5 3M25 36l-6 0M39 38l5 3M39 36l6 0" stroke="#3a2a1c" stroke-width="1.200" stroke-linecap="round"/>
  <circle cx="32" cy="24" r="10" fill="url(#ffbody)"/><path d="M26 15q-4-6-8-7M38 15q4-6 8-7" stroke="#3a2a1c" stroke-width="1.200" fill="none" stroke-linecap="round"/><circle cx="18" cy="8" r="1.700" fill="#e6ff5a"/><circle cx="46" cy="8" r="1.700" fill="#e6ff5a"/>
  <circle cx="27.500" cy="24" r="3.600" fill="#fff"/><circle cx="36.500" cy="24" r="3.600" fill="#fff"/><circle cx="28" cy="24.500" r="2.100" fill="#2b1b24"/><circle cx="36" cy="24.500" r="2.100" fill="#2b1b24"/><circle cx="28.700" cy="23.700" r=".8" fill="#fff"/><circle cx="36.700" cy="23.700" r=".8" fill="#fff"/>
  <ellipse cx="24" cy="29" rx="2.400" ry="1.400" fill="#ff8fa8" opacity=".75"/><ellipse cx="40" cy="29" rx="2.400" ry="1.400" fill="#ff8fa8" opacity=".75"/><path d="M29.500 29q2.500 2.600 5 0" stroke="#2b1b24" stroke-width="1.200" fill="none" stroke-linecap="round"/></svg>`;
const jarSvg = (label = "") => `<svg viewBox="0 0 130 160"><defs><linearGradient id="jg" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#dff1ff" stop-opacity=".55"/><stop offset=".45" stop-color="#ffffff" stop-opacity=".18"/><stop offset="1" stop-color="#a8cce8" stop-opacity=".5"/></linearGradient></defs>
  <rect x="34" y="6" width="62" height="16" rx="5" fill="#c9985f" stroke="#7a5a2c" stroke-width="2"/><rect x="40" y="20" width="50" height="12" fill="#e8f4ff" fill-opacity=".5" stroke="#9cc0dc" stroke-width="2"/>
  <path d="M30 32h70c14 10 20 26 20 48v50c0 14-10 24-24 24H34c-14 0-24-10-24-24V80c0-22 6-38 20-48z" fill="url(#jg)" stroke="#9cc0dc" stroke-width="3"/>
  <path d="M22 60v70" stroke="#fff" stroke-opacity=".8" stroke-width="5" stroke-linecap="round"/>${label ? `<rect x="36" y="96" width="58" height="26" rx="4" fill="#fff8e0" stroke="#c9a050"/><text x="65" y="113" text-anchor="middle" font-size="11" fill="#5a3a22" font-family="cursive">${G.esc(label.slice(0, 11))}</text>` : ""}</svg>`;

const garden = G.el("div", "g-stage jj-garden");
garden.innerHTML = `<div class="jj-glow" id="glow"></div><div class="jj-jar" id="jar"><div class="jj-inside" id="inside"></div>${jarSvg()}</div>`;
root.appendChild(garden);
root.appendChild(G.el("div", "g-row", `<button class="btn" id="open" type="button">🫙 Open the jar</button><button class="btn primary" id="rand" type="button">Read a good moment</button><button class="btn" id="giftbtn" type="button">Firefly Gift Collection <span class="badge" id="giftcount">0</span></button><span class="g-grow"></span><span class="g-stat">Move gently: fireflies come close when you are calm and flit away when you rush. Golden ones are rare!</span>`));
const inside = garden.querySelector("#inside"), glow = garden.querySelector("#glow"), jar = garden.querySelector("#jar");
for (let i = 0; i < 30; i++) { const s = G.el("i", "lf-star"); s.style.cssText = `left:${Math.random() * 100}%;top:${Math.random() * 45}%;animation-delay:${Math.random() * 3}s`; garden.appendChild(s); }
const toast = t => { const d = G.el("div", "g-toast", G.esc(t)); garden.appendChild(d); setTimeout(() => d.remove(), 3300); };

function paintJar() {
  const j = cur(); inside.innerHTML = "";
  j.memories.forEach((m, i) => { const d = G.el("span", "jj-mini" + (m.golden ? " golden" : ""), fireflySvg); d.style.left = (4 + (i * 37) % 62) + "%"; d.style.top = (6 + ((i * 53) % 62)) + "%"; d.style.animationDelay = (i * 0.37) + "s"; inside.appendChild(d); });
  glow.style.opacity = Math.min(1, jarCount(j) / CAP);
  const all = S.jars.reduce((n, x) => n + x.memories.length, 0), sealed = S.jars.filter(x => x.sealed).length;
  stat.textContent = `Good moments saved: ${all} · This jar: ${jarCount(j)} of ${CAP}${sealed ? ` · Jars sealed: ${sealed}` : ""}`;
  document.getElementById("giftcount").textContent = gifts.length;
}

// ---- fireflies ----
const flies = new Set();
function wander(b) {
  if (!b.isConnected || b.dataset.held) return;
  const x = 6 + Math.random() * 62, old = parseFloat(b.style.left);
  b.firstChild.style.transform = x < old ? "scaleX(-1)" : "scaleX(1)"; // face the way it flies
  b.style.left = x + "%"; b.style.top = (8 + Math.random() * 62) + "%"; setTimeout(() => wander(b), 1900 + Math.random() * 1700);
}
function spawn() {
  if (flies.size >= 5) return;
  const roll = Math.random(), type = roll < 0.12 ? "golden" : roll < 0.4 ? "shy" : "normal";
  const b = G.el("button", "jj-fly", fireflySvg); b.type = "button"; b.dataset.type = type; b.setAttribute("aria-label", type === "golden" ? "Catch a rare golden moment" : "Catch a good moment");
  b.style.left = (6 + Math.random() * 62) + "%"; b.style.top = (8 + Math.random() * 62) + "%"; b.style.transition = "left 2.6s ease-in-out, top 2.6s ease-in-out";
  b.style.setProperty("--d", (Math.random() * 2).toFixed(2) + "s");
  b.onclick = () => {
    const chance = { normal: 0.2, shy: 0.4, golden: 0.55 }[type]; b._dodged = b._dodged || 0;
    if (b._dodged < 2 && Math.random() < chance) { // whoosh: it slips away, try again gently
      b._dodged++; const nx = 6 + Math.random() * 62, ny = 8 + Math.random() * 58; b.style.transition = "left .5s ease-out, top .5s ease-out"; b.style.left = nx + "%"; b.style.top = ny + "%"; b.classList.add("spooked");
      setTimeout(() => { b.classList.remove("spooked"); b.style.transition = "left 2.6s ease-in-out, top 2.6s ease-in-out"; }, 600); Sfx.preset("hush"); toast(["Too quick! Try again, gently.", "It slipped away! Move slowly.", "Oops! Be calm and it will stay."][b._dodged % 3]); return; }
    catchFly(b); };
  garden.appendChild(b); flies.add(b); setTimeout(() => wander(b), 80);
}
// the fireflies react to your pointer: move gently and they come close, rush at them and they flit away
const ptr = { x: -999, y: -999, v: 0, t: 0 };
garden.addEventListener("pointermove", e => { const r = garden.getBoundingClientRect(), nx = e.clientX - r.left, ny = e.clientY - r.top, now = performance.now(); const dt = Math.max(1, now - ptr.t); ptr.v = Math.hypot(nx - ptr.x, ny - ptr.y) / dt * 0.7 + ptr.v * 0.3; ptr.x = nx; ptr.y = ny; ptr.t = now; });
garden.addEventListener("pointerleave", () => { ptr.x = ptr.y = -999; });
setInterval(() => { // slow the "speed" reading down when the pointer stops moving
  if (performance.now() - ptr.t > 150) ptr.v *= 0.6;
  const g = garden.getBoundingClientRect();
  flies.forEach(b => { if (b.dataset.held || !b.isConnected) return;
    const r = b.getBoundingClientRect(), cx = r.left - g.left + r.width / 2, cy = r.top - g.top + r.height / 2, d = Math.hypot(cx - ptr.x, cy - ptr.y), type = b.dataset.type;
    const scare = type === "normal" ? 0.45 : 0.25;                                 // shy and golden fireflies spook more easily
    if (d < 210 && ptr.v > scare) { // spooked: dart away from the pointer
      const ang = Math.atan2(cy - ptr.y, cx - ptr.x), nx = Math.max(4, Math.min(72, (cx + Math.cos(ang) * 260) / g.width * 100)), ny = Math.max(6, Math.min(66, (cy + Math.sin(ang) * 200) / g.height * 100));
      b.style.transition = "left .55s ease-out, top .55s ease-out"; b.style.left = nx + "%"; b.style.top = ny + "%"; b.classList.add("spooked"); setTimeout(() => { b.classList.remove("spooked"); b.style.transition = "left 2.6s ease-in-out, top 2.6s ease-in-out"; }, 650);
    } else if (Math.random() < 0.45 && (d < 230 && d > 46 && ptr.v < 0.1 && type !== "shy" || (type === "shy" && d < 170 && d > 46 && ptr.v < 0.04))) { // curious: drift closer when you're gentle and still
      const nx = (cx + (ptr.x - cx) * 0.35) / g.width * 100, ny = (cy + (ptr.y - cy) * 0.35) / g.height * 100;
      b.style.transition = "left 2.2s ease-in-out, top 2.2s ease-in-out"; b.style.left = Math.max(4, Math.min(72, nx)) + "%"; b.style.top = Math.max(6, Math.min(66, ny)) + "%"; b.classList.add("curious"); setTimeout(() => b.classList.remove("curious"), 1600);
    } });
}, 140);
setInterval(spawn, 5000); for (let i = 0; i < 4; i++) setTimeout(spawn, i * 400);

function catchFly(b) {
  if (jarCount(cur()) >= CAP) { sealJar(); return; } // a full jar must be sealed before filling a new one
  Sfx.preset("softbell", 784);
  const ideas = G.shuffle(IDEAS).slice(0, 6);
  const golden = b.dataset.type === "golden";
  const m = G.modal(`<h3>${golden ? "🌟 A rare golden moment!" : "✨ You caught a good moment!"}</h3><p class="g-stat">${golden ? "Golden moments fill two spots in your jar. What made this one shine?" : "What was it? It can be tiny."}</p>
    <input class="g-field" id="t" maxlength="90" placeholder="Something good that happened…"><div class="g-chips">${ideas.map(i => `<button type="button" class="g-chip">${G.esc(i)}</button>`).join("")}</div>
    <div class="g-row"><button class="btn primary" id="add" type="button">Savor it →</button><button class="btn" id="x" type="button">Let it go</button></div>`);
  const t = m.box.querySelector("#t"); t.focus();
  m.box.querySelectorAll(".g-chip").forEach(c => c.onclick = () => { t.value = c.textContent; });
  m.box.querySelector("#x").onclick = m.close;
  m.box.querySelector("#add").onclick = () => {
    const text = t.value.trim(); if (!text) { t.focus(); return; }
    m.box.innerHTML = `<h3>Take a breath and feel it</h3><p>“${G.esc(text)}”</p><p class="g-stat">Close your eyes if you like. Notice how this feels in your body. Five slow seconds.</p>
      <div style="display:grid;place-items:center;margin:10px 0"><svg width="90" height="90" viewBox="0 0 90 90"><circle cx="45" cy="45" r="38" fill="none" stroke="#c9d6e8" stroke-width="6"/><circle id="ringp" cx="45" cy="45" r="38" fill="none" stroke="#ffd45e" stroke-width="6" stroke-linecap="round" stroke-dasharray="239" stroke-dashoffset="239" transform="rotate(-90 45 45)"/></svg></div>
      <div class="g-row"><button class="btn" id="go" type="button">Skip</button></div>`;
    m.box.querySelector("#ringp").animate([{ strokeDashoffset: 239 }, { strokeDashoffset: 0 }], { duration: 5000, fill: "forwards" });
    Sfx.preset("hum", 196); let done = false;
    const finish = () => { if (done) return; done = true; m.close(); intoJar(b, text, golden); };
    const tm = setTimeout(finish, 5000); m.box.querySelector("#go").onclick = () => { clearTimeout(tm); finish(); };
  };
}
function intoJar(b, text, golden = false) {
  // save the moment right away, so it's kept even if the page is hidden mid-animation
  const before = jarCount(cur()); b.dataset.held = "1"; cur().memories.push({ text, at: Date.now(), golden }); save();
  const a = b.getBoundingClientRect(), j = jar.getBoundingClientRect();
  const dx = j.left + j.width / 2 - (a.left + a.width / 2), dy = j.top + j.height * 0.55 - (a.top + a.height / 2);
  b.style.transition = "none"; Sfx.preset("hush");
  let landed = false;
  const land = () => {
    if (landed) return; landed = true;
    b.remove(); flies.delete(b); paintJar();
    Sfx.preset("softbell", 1047);
    jar.animate([{ transform: "scale(1)" }, { transform: "scale(1.08)" }, { transform: "scale(1)" }], { duration: 450 });
    const now = jarCount(cur()); const MS = [[3, "Your jar is starting to glow!"], [6, "Halfway there. Look how bright it is getting!"], [9, "Almost full! You found so much good."]]; MS.forEach(([n, msg]) => { if (before < n && now >= n) { toast(msg); jar.animate([{ filter: "brightness(1)" }, { filter: "brightness(1.8)" }, { filter: "brightness(1)" }], { duration: 900 }); } });
    if (now >= CAP) sealJar();
  };
  if (G.reduced()) return land();
  b.animate([{ transform: "translate(0,0) scale(1)" }, { transform: `translate(${dx * 0.5}px,${dy * 0.5 - 60}px) scale(1.4)`, offset: .5 }, { transform: `translate(${dx}px,${dy}px) scale(.5)` }], { duration: 1200, easing: "ease-in-out" }).onfinish = land;
  setTimeout(land, 1800); // backup in case the animation never reports finishing
}

// ---- releasing: let a good moment fly back out into the night ----
function flyAway(delay = 0) {
  const a = jar.getBoundingClientRect(), g = garden.getBoundingClientRect();
  const f = G.el("div", "jj-free", fireflySvg);
  f.style.left = (a.left - g.left + a.width / 2) + "px"; f.style.top = (a.top - g.top + a.height * 0.45) + "px"; f.style.opacity = 0;
  garden.appendChild(f);
  const x = (Math.random() - 0.35) * 260, y = -(160 + Math.random() * 150);
  const anim = f.animate([
    { transform: "translate(0,0) scale(.5)", opacity: 0 }, { transform: `translate(${x * 0.2}px,${y * 0.25}px) scale(1.1)`, opacity: 1, offset: .2 },
    { transform: `translate(${x * 0.6}px,${y * 0.55 + 20}px) scale(1)`, opacity: 1, offset: .6 }, { transform: `translate(${x}px,${y}px) scale(.6)`, opacity: 0 }
  ], { duration: 3200 + Math.random() * 800, delay, easing: "ease-out", fill: "backwards" });
  anim.onfinish = () => f.remove(); setTimeout(() => f.remove(), 5500 + delay);
}
function release(j, idx, rerender) {
  j.memories.splice(idx, 1); save(); paintJar(); Sfx.preset("hush"); setTimeout(() => Sfx.preset("softbell", 659), 250);
  if (!G.reduced()) flyAway(); toast("Released. It still happened, and it still counts. ✨"); rerender();
}
function releaseAll(j, rerender) {
  const n = j.memories.length; j.memories = []; save(); paintJar(); Sfx.preset("hush");
  for (let i = 0; i < Math.min(n, 10); i++) { if (!G.reduced()) flyAway(i * 220); setTimeout(() => Sfx.preset("softbell", 523 + i * 60), 250 + i * 320); }
  toast(`${n} good moments flew out into the night. ✨`); rerender();
}

// ---- sealing a full jar, and the gift it gives ----
function sealJar() {
  const j = cur(); Sfx.preset("twin", 784);
  const m = G.modal(`<h3>🫙 Your jar is full!</h3><p>${CAP} good moments, glowing together. Give this jar a name, then seal it. You'll get a firefly gift for filling it.</p>
    <input class="g-field" id="n" maxlength="22" value="Jar ${S.jars.filter(x => x.sealed).length + 1}"><div class="g-row"><button class="btn primary" id="seal" type="button">Seal the jar</button></div>`, null);
  const n = m.box.querySelector("#n"); n.select();
  m.box.querySelector("#seal").onclick = () => {
    j.name = n.value.trim() || "My jar"; j.sealed = true; j.sealedAt = Date.now();
    S.jars.push({ id: Date.now(), name: "", memories: [], sealed: false });
    // the gift is saved right away, then shown (and shown again next visit if you leave before collecting it)
    const owned = new Set(gifts.map(g => g.id)), fresh = FF_GIFTS.filter(g => !owned.has(g.id));
    const g = G.pick(fresh.length ? fresh : FF_GIFTS);
    gifts.push({ id: g.id, at: Date.now(), jar: j.name }); saveGifts(); S.pendingGift = g.id; save(); paintJar(); m.close(); Sfx.preset("softbell", 784);
    setTimeout(() => showGift(g), 350);
  };
}
function showGift(g) {
  Sfx.preset("twin", 988);
  const m = G.modal(`<div style="text-align:center"><p class="g-stat" style="margin:0">Your jar gave you a firefly gift!</p>
    <div class="jj-giftart" id="art">${giftArt({ kind: g.kind })}</div><h3 style="margin:6px 0">${G.esc(g.name)}</h3><p>${G.esc(g.note)}</p>
    <div class="g-row" style="justify-content:center"><button class="btn primary" id="keep" type="button">Add to my Firefly Gift Collection</button></div></div>`, () => { S.pendingGift = null; save(); paintJar(); });
  m.box.querySelector("#art").animate([{ transform: "scale(.2) rotate(-180deg)", opacity: 0 }, { transform: "scale(1.2) rotate(10deg)", opacity: 1, offset: .65 }, { transform: "none" }], { duration: 900, easing: "ease-out" });
  m.box.querySelector("#keep").onclick = () => { Sfx.preset("softbell", 1175); m.close(); toast("Added to your Firefly Gift Collection ✨"); };
}
function giftCollection() {
  const got = new Map(); gifts.forEach(x => got.set(x.id, x));
  const m = G.modal(`<h3>✨ Firefly Gift Collection</h3><p class="g-stat">${got.size} of ${FF_GIFTS.length} gifts · one for every jar you fill</p>
    <div class="jj-gifts">${FF_GIFTS.map(g => got.has(g.id) ? `<div class="jj-gift" data-id="${g.id}" tabindex="0"><div class="jj-gart">${giftArt({ kind: g.kind })}</div><strong>${G.esc(g.name)}</strong><small>${G.esc(g.note)}</small><small class="from">From ${G.esc(got.get(g.id).jar)} · ${G.date(got.get(g.id).at)}</small></div>` : `<div class="jj-gift locked"><div class="jj-gart">?</div><strong>Mystery gift</strong><small>Fill a jar to find it.</small></div>`).join("")}</div>
    <div class="g-row"><button class="btn" id="x" type="button">Close</button></div>`);
  m.box.querySelector("#x").onclick = m.close;
  m.box.querySelectorAll(".jj-gift[data-id]").forEach(c => c.onclick = () => { c.animate([{ transform: "scale(1)" }, { transform: "scale(1.08) rotate(-3deg)" }, { transform: "scale(1)" }], { duration: 450 }); Sfx.preset("softbell", 880); });
}

// ---- reading and releasing ----
function openJar(j = cur()) {
  const draw = () => {
    m.box.innerHTML = `<h3>🫙 ${j.sealed ? G.esc(j.name) : "The jar you're filling"}</h3><p class="g-stat">${j.memories.length} good moment${j.memories.length === 1 ? "" : "s"}${j.sealed ? " · sealed " + G.date(j.sealedAt) : ""}. Release one whenever you're ready to let it go.</p>
      <ul class="g-list">${j.memories.map((x, i) => `<li><div class="jj-row"><span>${G.esc(x.text)}<small>${G.date(x.at)}</small></span><button class="btn rel" data-i="${i}" type="button">Release</button></div></li>`).join("") || "<li>Nothing here. Catch a firefly!</li>"}</ul>
      <div class="g-row">${j.memories.length ? `<button class="btn" id="all" type="button">Release all</button>` : ""}<span class="g-grow"></span><button class="btn" id="x" type="button">Close</button></div>`;
    m.box.querySelector("#x").onclick = m.close;
    m.box.querySelectorAll(".rel").forEach(b => b.onclick = () => {
      if (!b.dataset.sure) { b.dataset.sure = "1"; b.textContent = "Really release?"; b.classList.add("primary"); setTimeout(() => { if (b.isConnected) { delete b.dataset.sure; b.textContent = "Release"; b.classList.remove("primary"); } }, 3500); return; }
      release(j, +b.dataset.i, draw);
    });
    const all = m.box.querySelector("#all");
    if (all) all.onclick = () => { if (!all.dataset.sure) { all.dataset.sure = "1"; all.textContent = `Really release all ${j.memories.length}?`; all.classList.add("primary"); setTimeout(() => { if (all.isConnected) { delete all.dataset.sure; all.textContent = "Release all"; all.classList.remove("primary"); } }, 3500); return; } releaseAll(j, draw); };
  };
  const m = G.modal("");
  draw();
}
function randomMoment() {
  const all = S.jars.flatMap(j => j.memories); if (!all.length) { openJar(); return; }
  const x = G.pick(all); Sfx.preset("softbell", 880);
  const m = G.modal(`<h3>A good moment, just for you</h3><div class="lf-letter" style="text-align:center;font-size:1.2rem">${G.esc(x.text)}</div><p class="g-stat" style="text-align:center">You caught this on ${G.date(x.at)}. It still happened, and it still counts.</p>
    <div class="g-row"><button class="btn primary" id="again" type="button">Another one</button><button class="btn" id="x" type="button">Close</button></div>`);
  m.box.querySelector("#x").onclick = m.close; m.box.querySelector("#again").onclick = () => { m.close(); randomMoment(); };
}
function shelf() {
  const sealed = S.jars.filter(j => j.sealed);
  const m = G.modal(`<h3>🫙 My jars</h3><p class="g-stat">${sealed.length} sealed · 1 filling</p>
    <div class="jj-shelf"><button type="button" data-id="${cur().id}">${jarSvg()}Filling<br>${cur().memories.length}/${CAP}</button>${sealed.map(j => `<button type="button" data-id="${j.id}">${jarSvg(j.name)}${G.esc(j.name)}<br>${j.memories.length} left</button>`).join("")}</div><div class="g-row"><button class="btn" id="x" type="button">Close</button></div>`);
  m.box.querySelector("#x").onclick = m.close;
  m.box.querySelectorAll(".jj-shelf button").forEach(b => b.onclick = () => { const j = S.jars.find(x => x.id == b.dataset.id); m.close(); openJar(j); });
}
root.querySelector("#open").onclick = () => openJar();
root.querySelector("#rand").onclick = randomMoment;
root.querySelector("#giftbtn").onclick = giftCollection;
document.getElementById("mine").onclick = shelf;
paintJar();
if (S.pendingGift && giftById(S.pendingGift)) setTimeout(() => showGift(giftById(S.pendingGift)), 600); // you left before collecting your gift
