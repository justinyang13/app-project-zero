// Lantern Friends: send a kind lantern into the night sky, and let the Lantern Keepers' lanterns find you.
// Replies are written messages from fictional Lantern Keepers (nobody else can read yours). Real hellos are the real goal.
const LF_KEY = "heartnote-lanterns";
const root = document.getElementById("game"), stat = document.getElementById("stat");
G.wireSound(document.getElementById("sound"));
const COLORS = [["#ffb84a", "Amber"], ["#ff8aa8", "Rose"], ["#7fd0ff", "Sky"], ["#a58bff", "Violet"], ["#7ae0a8", "Mint"], ["#ffe27a", "Gold"],
  ["#ff7a6a", "Coral"], ["#5fd8d0", "Teal"], ["#d9a8ff", "Lilac"], ["#ffc8a0", "Peach"], ["#b8e860", "Lime"], ["#ff5d8a", "Cherry"]];
const KEEPERS = [
  ["Pip the Owl", "Hoo! You are not as alone as you feel. I flew over just to say hello."],
  ["Pip the Owl", "Quiet nights are good for noticing who cares about you. I do."],
  ["Mira", "Hi! Your lantern made my night a little brighter. Thank you for sending it."],
  ["Mira", "I felt lonely today too. Want to share a quiet moment, even from far away?"],
  ["Juno the Fox", "Being on your own isn't the same as being unwanted. You are wanted."],
  ["Juno the Fox", "Try this: say hello to one person tomorrow. Small hellos are brave."],
  ["Sol", "I'm sending you a little warmth. Hold it close for a minute."],
  ["Sol", "You reached out tonight. That took courage, and I noticed."],
  ["Bram the Bear", "Big hug from me, wherever you are. You're good company."],
  ["Bram the Bear", "Sometimes the best friends are the ones who haven't met you yet."],
  ["Wren", "Hi, I'm Wren. I like cloud shapes and warm blankets. What do you like?"],
  ["Wren", "I think kind people find each other, even if it takes a while."],
  ["Luna Moth", "I'm drawn to your light. That's a sign you shine."],
  ["Luna Moth", "Rest if you're tired. Friends will still be here when you wake."],
  ["Otto", "Fun fact: an octopus has three hearts, so I have lots of love to spare. Here's some."],
  ["Otto", "You are easy to like. I looked it up. It's true."],
  ["Kiki", "Wishing you a snack, a laugh and someone to tell your day to."],
  ["Kiki", "Tomorrow could hold a new friend. Stay curious."],
  ["Nell the Lamb", "You don't have to be loud to be worth hearing. I'm listening."],
  ["Nell the Lamb", "Thank you for being gentle with the world. It notices."]
];
const HELLOS = ["Hey, I was thinking about you. How are you doing?", "I'd love to hang out sometime this week. Are you free?", "No need to reply. I just wanted you to know I'm glad you're in my life."];
const WISHES = ["Hi, whoever sees this. I hope your day is kind.", "I hope someone is thinking of me, and I'm thinking of you.", "May you feel less alone tonight."];
// a round, smiling paper lantern with a warm glow, ribbon and tassel
const lanternSvg = c => { const id = "lg" + c.slice(1); return `<svg viewBox="0 0 64 90"><defs>
  <radialGradient id="${id}" cx=".5" cy=".42" r=".7"><stop offset="0" stop-color="#fffbe8"/><stop offset=".55" stop-color="${c}"/><stop offset="1" stop-color="${c}" stop-opacity=".82"/></radialGradient>
  <radialGradient id="${id}h" cx=".3" cy=".25" r=".5"><stop offset="0" stop-color="#fff" stop-opacity=".85"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient></defs>
  <path d="M32 3v7" stroke="#7a5a3a" stroke-width="2" stroke-linecap="round"/><circle cx="32" cy="3" r="2.600" fill="none" stroke="#7a5a3a" stroke-width="1.500"/>
  <rect x="19" y="9" width="26" height="8" rx="4" fill="#6a4426"/><rect x="21" y="10" width="22" height="2" rx="1" fill="#fff" opacity=".25"/>
  <ellipse cx="32" cy="44" rx="25" ry="29" fill="url(#${id})" stroke="#6a4426" stroke-width="1.600"/>
  <path d="M32 15c-14 8-14 52 0 60M32 15c14 8 14 52 0 60M32 15v60M12 32c12 5 28 5 40 0M12 56c12-5 28-5 40 0" stroke="#6a4426" stroke-opacity=".22" stroke-width="1" fill="none"/>
  <ellipse cx="22" cy="28" rx="8" ry="11" fill="url(#${id}h)"/>
  <ellipse cx="24" cy="44" rx="3.600" ry="4.400" fill="#2b1b24"/><ellipse cx="40" cy="44" rx="3.600" ry="4.400" fill="#2b1b24"/><circle cx="25.200" cy="42.400" r="1.300" fill="#fff"/><circle cx="41.200" cy="42.400" r="1.300" fill="#fff"/>
  <ellipse cx="17" cy="53" rx="4.600" ry="2.800" fill="#ff7d96" opacity=".6"/><ellipse cx="47" cy="53" rx="4.600" ry="2.800" fill="#ff7d96" opacity=".6"/><path d="M27 53q5 5.500 10 0" stroke="#2b1b24" stroke-width="2" fill="none" stroke-linecap="round"/>
  <rect x="19" y="71" width="26" height="8" rx="4" fill="#6a4426"/><rect x="21" y="72" width="22" height="2" rx="1" fill="#fff" opacity=".25"/>
  <path d="M32 79v6M26 79l-3 7M38 79l3 7" stroke="${c}" stroke-width="2.400" stroke-linecap="round"/><circle cx="32" cy="86" r="2.600" fill="${c}" stroke="#6a4426" stroke-width="1"/>
  <path d="M52 16l1.400 3.200 3.200 1.400-3.200 1.400L52 25l-1.400-3-3.200-1.400 3.200-1.400z" fill="#fff" opacity=".9"/></svg>`; };

let S = G.load(LF_KEY, { lanterns: [], pending: [], lastVisit: Date.now(), hellos: 0, constellations: [] });
S.constellations = S.constellations || [];
const save = () => G.save(LF_KEY, S);

function place() { // find a spot that isn't crowded
  let best = null, bestD = -1;
  for (let i = 0; i < 25; i++) {
    const p = { x: 8 + Math.random() * 84, y: 14 + Math.random() * 56 };
    const d = Math.min(99, ...S.lanterns.map(l => Math.hypot(l.x - p.x, (l.y - p.y) * 1.4)));
    if (d > bestD) { bestD = d; best = p; }
  }
  return best;
}
function addKeeper(label) {
  const used = new Set(S.lanterns.map(l => l.text));
  const [name, text] = G.pick(KEEPERS.filter(k => !used.has(k[1])).length ? KEEPERS.filter(k => !used.has(k[1])) : KEEPERS);
  const p = place();
  const l = { id: Date.now() + Math.random(), from: "keeper", name, text, color: G.pick(COLORS)[0], x: p.x, y: p.y, at: Date.now(), read: false };
  S.lanterns.push(l); save(); return l;
}

// things that arrived while you were away or are due now
function catchUp() {
  const now = Date.now(); let n = 0;
  S.pending = S.pending.filter(t => { if (t <= now) { addKeeper(); n++; return false; } return true; });
  const away = Math.min(3, Math.floor((now - S.lastVisit) / (8 * 3600 * 1000)));
  for (let i = 0; i < away; i++) { addKeeper(); n++; }
  S.lastVisit = now; save(); return n;
}

// ---- scene ----
root.innerHTML = `<div class="g-stage lf-sky" id="sky"><svg class="lf-lines" id="lines" viewBox="0 0 100 100" preserveAspectRatio="none"></svg><div class="lf-hint" id="hint"></div></div>
  <div class="g-row"><button class="btn primary" id="release" type="button">🏮 Release a lantern</button><span class="g-grow"></span><button class="btn" id="cons" type="button">✨ Constellations <span class="badge" id="conscount">0</span></button><button class="btn" id="hello" type="button">💌 Send a real hello</button></div>`;
const sky = document.getElementById("sky"), hint = document.getElementById("hint"), lines = document.getElementById("lines");
for (let i = 0; i < 46; i++) { const s = G.el("i", "lf-star"); s.style.cssText = `left:${Math.random() * 100}%;top:${Math.random() * 90}%;animation-delay:${Math.random() * 3}s;width:${1 + Math.random() * 1.6}px;height:${1 + Math.random() * 1.6}px`; sky.appendChild(s); }
const els = new Map();

function showLantern(l, rise) {
  const b = G.el("button", "lf-lantern" + (l.from === "keeper" && !l.read ? " new" : ""), lanternSvg(l.color));
  b.type = "button"; b.style.setProperty("--glow", l.color); b.style.left = l.x + "%"; b.style.top = l.y + "%";
  b.style.animationDelay = (Math.random() * 3) + "s"; b.title = l.from === "you" ? "Your lantern" : l.from === "golden" ? "A golden lantern" : `A lantern from ${l.name}`;
  if (l.from === "keeper" && !l.read) b.insertAdjacentHTML("beforeend", `<span class="tag">${G.esc(l.name)}</span>`);
  b.onclick = () => readLantern(l, b);
  sky.appendChild(b); els.set(l.id, b);
  if (rise && !G.reduced()) b.animate([{ top: "108%", opacity: .4 }, { top: l.y + "%", opacity: 1 }], { duration: 3600, easing: "cubic-bezier(.2,.7,.3,1)" });
  return b;
}
let linesOn = false;
function drawLines() {
  lines.innerHTML = "";
  if (!linesOn) return;
  const pts = [...S.lanterns].sort((a, b) => a.x - b.x);
  const d = pts.map((p, i) => `${i ? "L" : "M"}${p.x} ${p.y}`).join("");
  lines.innerHTML = `<path d="${d}" fill="none" stroke="rgba(255,236,170,.65)" stroke-dasharray="1 1" vector-effect="non-scaling-stroke" style="stroke-width:1.6"/>`;
}
function refresh() {
  const unread = S.lanterns.filter(l => l.from === "keeper" && !l.read).length, read = S.lanterns.filter(l => l.from === "keeper" && l.read).length;
  stat.textContent = `Sky: ${S.lanterns.length} lantern${S.lanterns.length === 1 ? "" : "s"}${unread ? ` · ${unread} new` : ""} · Kind notes read: ${read} · Real hellos sent: ${S.hellos} · Constellations: ${S.constellations.length}`;
  hint.textContent = S.lanterns.length ? `Light ${Math.max(0, 12 - S.lanterns.length)} more lantern${12 - S.lanterns.length === 1 ? "" : "s"} to join them into a constellation.` : S.constellations.length ? "A fresh sky. Light 12 lanterns to make another constellation." : "The sky is waiting for your first lantern.";
  document.getElementById("conscount").textContent = S.constellations.length;
  drawLines();
}
function toast(t) { const d = G.el("div", "g-toast", G.esc(t)); sky.appendChild(d); setTimeout(() => d.remove(), 3300); }

// ---- 12 lanterns become a constellation: it is saved (notes and all), then the sky clears ----
const CONS_NAMES = ["The Kind Cluster", "Little Lights", "Brave Hello", "Warm Wishes", "The Gentle Crown", "Night Friends", "Sparkle Path", "Hope Heights"];
let completing = false;
function checkSky() { if (!completing && S.lanterns.length >= 12) { completing = true; setTimeout(completeConstellation, 1800); } }
function completeConstellation() {
  linesOn = true; drawLines(); els.forEach(b => b.classList.add("shine"));
  toast("Your lanterns joined into a constellation ✨"); Sfx.preset("chime", 1047); setTimeout(() => Sfx.preset("chime", 1319), 200); setTimeout(() => Sfx.preset("chime", 1568), 420);
  setTimeout(() => {
    let saved = false;
    const commit = name => {
      if (saved) return; saved = true;
      S.constellations.push({ id: Date.now(), at: Date.now(), name: (name || "").trim() || `Constellation ${S.constellations.length + 1}`, lanterns: S.lanterns.map(l => ({ ...l, read: true })) });
      clearSky();
    };
    const m = G.modal(`<h3>✨ A constellation!</h3><p>Twelve lanterns now shine together. Give it a name and it will be kept in <strong>Constellations</strong>, with every note still readable. Then the sky will be cleared for new lanterns.</p>
      <input class="g-field" id="cn" maxlength="28" value="${G.esc(CONS_NAMES[S.constellations.length % CONS_NAMES.length])}"><div class="g-chips">${CONS_NAMES.slice(0, 4).map(n => `<button type="button" class="g-chip">${n}</button>`).join("")}</div>
      <div class="g-row"><button class="btn primary" id="keep" type="button">Save it and clear the sky</button></div>`, () => commit(m.box.querySelector("#cn")?.value));
    const cn = m.box.querySelector("#cn"); cn.select();
    m.box.querySelectorAll(".g-chip").forEach(c => c.onclick = () => { cn.value = c.textContent; });
    m.box.querySelector("#keep").onclick = () => { commit(cn.value); m.close(); };
  }, 2600);
}
function clearSky() {
  S.lanterns = []; save(); completing = false; linesOn = false; drawLines();
  Sfx.preset("whoosh", 700);
  [...els.values()].forEach((b, i) => {
    const done = () => b.remove();
    if (G.reduced()) return done();
    const a = b.animate([{ top: getComputedStyle(b).top, opacity: 1 }, { top: "-25%", opacity: 0 }], { duration: 2600 + Math.random() * 900, delay: i * 90, easing: "ease-in", fill: "forwards" });
    a.onfinish = done; setTimeout(done, 6500);
  });
  els.clear(); refresh(); toast("Saved to Constellations. The sky is clear for new lanterns ✨");
}

function letterModal(l) {
  const mine = l.from === "you", golden = l.from === "golden";
  const m = G.modal(`<h3>${golden ? "A golden lantern" : mine ? "Your lantern" : "A lantern from " + G.esc(l.name)}</h3><p class="g-stat">${mine ? "You wrote this on " + G.date(l.at) : golden ? "For reaching out" : "Written for you by a Lantern Keeper · " + G.date(l.at)}</p>
    <div class="lf-letter">${G.esc(l.text)}</div><div class="g-row"><button class="btn primary" id="x" type="button">Thank you</button></div>`);
  m.box.querySelector("#x").onclick = m.close; return m;
}
function readLantern(l, b) {
  Sfx.preset("ding", 988); letterModal(l);
  if (!l.read) { l.read = true; save(); b.classList.remove("new"); b.querySelector(".tag")?.remove(); refresh(); }
}

// ---- release a lantern ----
function releaseDialog() {
  let color = COLORS[0][0];
  const m = G.modal(`<h3>🏮 Release a lantern</h3><p class="g-stat">Write a hello, a wish, or a kind word. It can be for someone, or for you.</p>
    <textarea class="g-field" id="w" rows="3" maxlength="140" placeholder="Be kind. It will light up the sky."></textarea>
    <div class="g-chips">${WISHES.map(w => `<button type="button" class="g-chip sug">${G.esc(w)}</button>`).join("")}</div>
    <p class="g-label">Pick a color</p><div class="g-chips" id="cols">${COLORS.map(([c, n], i) => `<button type="button" class="g-chip" data-c="${c}" aria-pressed="${i === 0}" style="border-color:${c}">${n}</button>`).join("")}</div>
    <div class="g-row"><button class="btn primary" id="go" type="button">Let it go</button><button class="btn" id="x" type="button">Cancel</button></div>`);
  const w = m.box.querySelector("#w"); w.focus();
  m.box.querySelectorAll(".sug").forEach(b => b.onclick = () => { w.value = b.textContent; });
  m.box.querySelectorAll("#cols .g-chip").forEach(b => b.onclick = () => { color = b.dataset.c; m.box.querySelectorAll("#cols .g-chip").forEach(x => x.setAttribute("aria-pressed", String(x === b))); });
  m.box.querySelector("#x").onclick = m.close;
  m.box.querySelector("#go").onclick = () => {
    const text = w.value.trim(); if (!text) { w.focus(); return; }
    const p = place(); const l = { id: Date.now(), from: "you", name: "You", text, color, x: p.x, y: p.y, at: Date.now(), read: true };
    S.lanterns.push(l); S.pending.push(Date.now() + 7000 + Math.random() * 5000); save(); m.close();
    showLantern(l, true); Sfx.preset("whoosh", 600); setTimeout(() => Sfx.preset("chime", 784), 700);
    checkSky(); refresh(); scheduleReplies();
  };
}
let timers = new Set();
function scheduleReplies() {
  S.pending.forEach(t => { const key = "t" + t; if (timers.has(key)) return; timers.add(key);
    setTimeout(() => { const i = S.pending.indexOf(t); if (i < 0) return; S.pending.splice(i, 1); const l = addKeeper(); showLantern(l, true); toast(`A lantern drifted over from ${l.name}…`); Sfx.preset("chime", 880); checkSky(); refresh(); }, Math.max(0, t - Date.now())); });
}

// ---- a real hello (the real point) ----
function helloDialog() {
  const m = G.modal(`<h3>💌 Send a real hello</h3><p>Lanterns are lovely, but real people are even better. Pick a message, copy it, and send it to someone you know.</p>
    <ul class="g-list">${HELLOS.map((h, i) => `<li>${G.esc(h)}<div class="g-row"><button class="btn copy" data-i="${i}" type="button">Copy</button></div></li>`).join("")}</ul>
    <div class="g-row"><button class="btn primary" id="sent" type="button">I sent one</button><button class="btn" id="x" type="button">Close</button></div>`);
  m.box.querySelectorAll(".copy").forEach(b => b.onclick = async () => { try { await navigator.clipboard.writeText(HELLOS[+b.dataset.i]); b.textContent = "Copied ✓"; } catch { b.textContent = "Copy it by hand"; } Sfx.preset("ding", 1175); });
  m.box.querySelector("#x").onclick = m.close;
  m.box.querySelector("#sent").onclick = () => {
    S.hellos++; const p = place();
    const l = { id: Date.now(), from: "golden", name: "Golden lantern", text: "You reached out. That took courage, and someone's day just got better because of you.", color: "#ffd45e", x: p.x, y: p.y, at: Date.now(), read: true };
    S.lanterns.push(l); save(); m.close(); showLantern(l, true); Sfx.preset("chime", 1047); setTimeout(() => Sfx.preset("chime", 1319), 220);
    toast("A golden lantern for reaching out ✨"); checkSky(); refresh();
  };
}

// ---- list of lanterns (the "My lanterns" button): the current sky and every saved constellation ----
function listDialog() {
  const row = l => `<li><strong>${l.from === "you" ? "You" : G.esc(l.name)}</strong> <small>${G.date(l.at)}</small>${G.esc(l.text)}</li>`;
  const sections = [`<h4 style="margin:12px 0 4px">In the sky now (${S.lanterns.length})</h4><ul class="g-list">${[...S.lanterns].reverse().map(row).join("") || "<li>No lanterns in the sky right now.</li>"}</ul>`]
    .concat(S.constellations.slice().reverse().map(c => `<h4 style="margin:14px 0 4px">✨ ${G.esc(c.name)} (${c.lanterns.length})</h4><ul class="g-list">${c.lanterns.map(row).join("")}</ul>`));
  const m = G.modal(`<h3>🏮 My lanterns</h3><p class="g-stat">Every note you've sent or received, including the ones saved in constellations.</p>${sections.join("")}<div class="g-row"><button class="btn" id="x" type="button">Close</button></div>`);
  m.box.querySelector("#x").onclick = m.close;
}

// ---- Constellations: every sky you completed, with all the notes still readable ----
const miniMap = c => { const pts = [...c.lanterns].sort((a, b) => a.x - b.x); return `<svg viewBox="0 0 100 100" preserveAspectRatio="none"><path d="${pts.map((p, i) => `${i ? "L" : "M"}${p.x} ${p.y}`).join("")}" fill="none" stroke="rgba(255,236,170,.6)" stroke-width="1" stroke-dasharray="2 2"/>${c.lanterns.map(l => `<circle cx="${l.x}" cy="${l.y}" r="3.200" fill="${l.color}"/>`).join("")}</svg>`; };
function consDialog() {
  const m = G.modal(`<h3>✨ Constellations</h3><p class="g-stat">${S.constellations.length ? "Every time 12 lanterns join together, they're saved here. Open one to read its notes again." : "No constellations yet. Light 12 lanterns and they'll be saved here."}</p>
    <div class="lf-cons">${S.constellations.map((c, i) => `<button type="button" class="lf-con" data-i="${i}"><span class="lf-mini">${miniMap(c)}</span><strong>${G.esc(c.name)}</strong><small>${c.lanterns.length} lanterns · ${G.date(c.at)}</small></button>`).join("")}</div>
    <div class="g-row"><button class="btn" id="x" type="button">Close</button></div>`);
  m.box.querySelector("#x").onclick = m.close;
  m.box.querySelectorAll(".lf-con").forEach(b => b.onclick = () => { m.close(); viewConstellation(S.constellations[+b.dataset.i]); });
}
function viewConstellation(c) {
  const m = G.modal(`<h3>✨ ${G.esc(c.name)}</h3><p class="g-stat">${c.lanterns.length} lanterns · ${G.date(c.at)} · Tap any lantern to read its note.</p>
    <div class="lf-sky lf-view" id="vsky"><svg class="lf-lines" viewBox="0 0 100 100" preserveAspectRatio="none">${(() => { const pts = [...c.lanterns].sort((a, b) => a.x - b.x); return `<path d="${pts.map((p, i) => `${i ? "L" : "M"}${p.x} ${p.y}`).join("")}" fill="none" stroke="rgba(255,236,170,.6)" stroke-dasharray="1 1" vector-effect="non-scaling-stroke" style="stroke-width:1.6"/>`; })()}</svg></div>
    <div class="g-row"><button class="btn" id="back" type="button">← All constellations</button><span class="g-grow"></span><button class="btn" id="x" type="button">Close</button></div>`);
  m.box.style.maxWidth = "760px";
  const vs = m.box.querySelector("#vsky");
  for (let i = 0; i < 30; i++) { const s = G.el("i", "lf-star"); s.style.cssText = `left:${Math.random() * 100}%;top:${Math.random() * 90}%;animation-delay:${Math.random() * 3}s`; vs.appendChild(s); }
  c.lanterns.forEach(l => {
    const b = G.el("button", "lf-lantern", lanternSvg(l.color)); b.type = "button"; b.style.setProperty("--glow", l.color); b.style.left = l.x + "%"; b.style.top = l.y + "%"; b.style.animationDelay = (Math.random() * 3) + "s";
    b.title = l.from === "you" ? "Your lantern" : l.from === "golden" ? "A golden lantern" : `A lantern from ${l.name}`; b.onclick = () => { Sfx.preset("ding", 988); letterModal(l); }; vs.appendChild(b);
  });
  m.box.querySelector("#x").onclick = m.close; m.box.querySelector("#back").onclick = () => { m.close(); consDialog(); };
}

document.getElementById("release").onclick = releaseDialog;
document.getElementById("hello").onclick = helloDialog;
document.getElementById("cons").onclick = consDialog;
document.getElementById("mine").onclick = listDialog;
const arrived = catchUp();
S.lanterns.forEach(l => showLantern(l, false));
if (arrived) toast(arrived === 1 ? "A new lantern arrived while you were away" : `${arrived} new lanterns arrived while you were away`);
scheduleReplies(); refresh(); checkSky(); // a full sky from an earlier visit becomes a constellation now
