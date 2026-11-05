// Brave Light: shine a flashlight on scary shadows and hold it steady. Looked at calmly, each one turns out to be something friendly.
const BL_KEY = "heartnote-bravelight";
const root = document.getElementById("game"), stat = document.getElementById("stat");
G.wireSound(document.getElementById("sound"));
const SPOTS = [[12, 56], [28, 32], [44, 62], [60, 30], [76, 58], [90, 36], [20, 80], [66, 80]];
const ROOMS = [
  { id: "bedroom", name: "The Bedroom", bg: "linear-gradient(#171636, #2c2352)", floor: "#241c44", things: [["socks", "a lonely sock", "Ha! It was just a sock."], ["teddy", "a teddy bear", "It was a teddy bear, waiting for a hug."], ["plant", "a houseplant", "A houseplant. It's not scary, it's thirsty."], ["nightlamp", "a lamp", "Only a lamp. It helps you see!"], ["slippers", "your slippers", "Just your slippers. They kept your spot warm."], ["cat", "a sleepy cat", "A sleepy cat. It was keeping you company."], ["cloudpillow", "a pillow", "A fluffy pillow. Soft as a cloud."], ["organizer", "a box of toys", "A box of toys. Playtime is coming."]] },
  { id: "attic", name: "The Attic", bg: "linear-gradient(#241a14, #3d2c22)", floor: "#2e2018", things: [["windchime", "a wind chime", "A wind chime, singing in the draft."], ["journal", "an old book", "An old storybook full of adventures."], ["umbrella", "an umbrella", "An umbrella, ready for rainy days."], ["blanket", "a cozy blanket", "A blanket, with room for you."], ["lantern", "a lantern", "A lantern. It lights the way."], ["teacup", "a teacup", "A teacup. Someone loved a cup of tea here."], ["mittens", "a pair of mittens", "Mittens! Two warm friends."], ["bench", "a little bench", "A bench to sit and rest on."]] },
  { id: "forest", name: "The Forest Path", bg: "linear-gradient(#0b2230, #19453f)", floor: "#123a2c", things: [["tree", "a tree stump", "A tree, just standing quietly."], ["snail", "a snail", "A snail, going slowly home."], ["dandelion", "a dandelion", "A dandelion puff. Make a wish!"], ["zenstones", "a stack of stones", "Balanced stones, someone's little art."], ["campfire", "a campfire", "A campfire, warm and cozy."], ["cocoon", "a cocoon", "A cocoon. Something wonderful is growing."], ["hammock", "a hammock", "A hammock, swinging gently."], ["bubblewand", "a bubble wand", "A bubble wand. Pop pop!"]] }
];
let S = G.load(BL_KEY, { done: [], found: [] });
const save = () => G.save(BL_KEY, S);
const SILH = [
  `<svg viewBox="0 0 80 100"><path d="M40 4C22 4 14 24 18 44c-8 6-12 24-6 48h56c6-24 2-42-6-48C70 24 58 4 40 4z" fill="#05050c"/></svg>`,
  `<svg viewBox="0 0 80 100"><path d="M10 96C4 60 20 30 40 22c20 8 36 38 30 74z" fill="#05050c"/><path d="M20 30L8 8l22 12zM60 30l12-22-22 12z" fill="#05050c"/></svg>`,
  `<svg viewBox="0 0 80 100"><path d="M34 98V50C20 46 10 30 14 6c8 14 16 18 26 14 10 4 18 0 26-14 4 24-6 40-20 44v48z" fill="#05050c"/></svg>`,
  `<svg viewBox="0 0 80 100"><ellipse cx="40" cy="62" rx="34" ry="34" fill="#05050c"/><path d="M12 40l6-20 14 14zM68 40l-6-20-14 14z" fill="#05050c"/></svg>`
];
function refresh() { stat.textContent = `Rooms cleared: ${S.done.length} of ${ROOMS.length} · Friendly surprises found: ${S.found.length}`; }

function enterRoom(room) {
  root.innerHTML = `<div class="g-stage bl-room" id="room" style="background:${room.bg}"><div class="bl-floor" style="background:${room.floor}"></div><div class="bl-dark" id="dark"></div><div class="bl-msg" id="msg"></div><div class="bl-count" id="cnt"></div></div>
    <div class="g-row"><span class="g-stat">Move the light over a shadow, then hold it <strong>steady</strong>. Rushing makes shadows jump. Go slowly and breathe.</span><span class="g-grow"></span><button class="btn" id="leave" type="button">Choose another room</button></div>`;
  const rm = root.querySelector("#room"), dark = root.querySelector("#dark"), msg = root.querySelector("#msg"), cnt = root.querySelector("#cnt");
  let found = 0; const px = { x: -999, y: -999, v: 0, t: 0 };
  const shadows = G.shuffle(SPOTS).map((p, i) => {
    const [kind, name, say] = room.things[i];
    const e = G.el("div", "bl-shadow", `<div class="bl-sil">${SILH[i % SILH.length]}</div><i class="bl-eye l"></i><i class="bl-eye r"></i><svg class="bl-ring" viewBox="0 0 40 40"><circle cx="20" cy="20" r="17" fill="none" stroke="rgba(255,255,255,.2)" stroke-width="3"/><circle class="arc" cx="20" cy="20" r="17" fill="none" stroke="#ffe27a" stroke-width="3" stroke-linecap="round" stroke-dasharray="107" stroke-dashoffset="107" transform="rotate(-90 20 20)"/></svg>`);
    e.style.left = p[0] + "%"; e.style.top = p[1] + "%"; e.style.setProperty("--d", (Math.random() * 2).toFixed(2) + "s"); rm.appendChild(e);
    return { e, kind, name, say, lit: 0, done: false, arc: e.querySelector(".arc") };
  });
  cnt.textContent = `0 of ${shadows.length} found`;
  rm.appendChild(dark);
  const move = ev => { const r = rm.getBoundingClientRect(), x = ev.clientX - r.left, y = ev.clientY - r.top, now = performance.now(); const dt = Math.max(1, now - px.t); px.v = Math.hypot(x - px.x, y - px.y) / dt * 0.7 + px.v * 0.3; px.x = x; px.y = y; px.t = now; dark.style.setProperty("--x", x + "px"); dark.style.setProperty("--y", y + "px"); };
  rm.addEventListener("pointermove", move); rm.addEventListener("pointerdown", move); rm.addEventListener("pointerleave", () => { px.x = px.y = -999; });
  dark.style.setProperty("--x", "-200px"); dark.style.setProperty("--y", "-200px");
  const flash = t => { msg.textContent = t; msg.classList.remove("show"); void msg.offsetWidth; msg.classList.add("show"); };
  const iv = setInterval(() => {
    if (!rm.isConnected) { clearInterval(iv); return; }
    if (performance.now() - px.t > 120) px.v *= 0.55;
    const r = rm.getBoundingClientRect();
    shadows.forEach(s => { if (s.done) return; const b = s.e.getBoundingClientRect(), cx = b.left - r.left + b.width / 2, cy = b.top - r.top + b.height / 2, d = Math.hypot(cx - px.x, cy - px.y);
      const inLight = d < 78; s.e.classList.toggle("lit", inLight);
      if (inLight && px.v < 0.22) { s.lit = Math.min(1, s.lit + 0.05 / 1.4); } else if (inLight && px.v > 0.55) { s.lit = Math.max(0, s.lit - 0.04); s.e.classList.add("startled"); setTimeout(() => s.e.classList.remove("startled"), 300); } else { s.lit = Math.max(0, s.lit - 0.012); }
      s.arc.style.strokeDashoffset = 107 * (1 - s.lit); s.e.style.setProperty("--sc", (1 - s.lit * 0.35).toFixed(2));
      if (s.lit >= 1) reveal(s); });
  }, 50);
  const reveal = s => {
    s.done = true; found++; cnt.textContent = `${found} of ${shadows.length} found`; Sfx.preset("hush"); setTimeout(() => Sfx.preset("softbell", 560 + found * 50), 160);
    s.e.className = "bl-shadow revealed"; s.e.innerHTML = `<div class="bl-thing">${giftArt({ kind: s.kind })}</div><span class="bl-name">${G.esc(s.name)}</span>`; flash(s.say);
    if (!S.found.includes(s.kind)) { S.found.push(s.kind); save(); refresh(); }
    if (found === shadows.length) setTimeout(() => cleared(room), 900);
  };
  root.querySelector("#leave").onclick = () => { clearInterval(iv); lobby(); };
}
function cleared(room) {
  if (!S.done.includes(room.id)) { S.done.push(room.id); save(); refresh(); }
  Sfx.preset("twin", 784); const dark = root.querySelector("#dark"); if (dark) dark.style.opacity = 0;
  const m = G.modal(`<div style="text-align:center"><h3>💡 The lights are on!</h3><p>${G.esc(room.name)} was full of friendly things, not monsters. Shadows look bigger in the dark, and smaller once you look at them calmly and steadily.</p><p class="g-stat">Brave badge earned: ${S.done.length} of ${ROOMS.length}</p><div class="g-row" style="justify-content:center"><button class="btn primary" id="ok" type="button">Next room</button></div></div>`, lobby);
  m.box.querySelector("#ok").onclick = m.close;
}
function lobby() {
  root.innerHTML = `<div class="bl-lobby"><p class="g-label">Which room will you explore?</p><div class="bl-rooms">${ROOMS.map(r => `<button class="bl-card ${S.done.includes(r.id) ? "done" : ""}" data-id="${r.id}" type="button" style="background:${r.bg}"><strong>${r.name}</strong><span>${S.done.includes(r.id) ? "★ Brave badge earned" : "8 shadows to look at"}</span></button>`).join("")}</div>
    <p class="g-stat" style="text-align:center">You'll need a steady hand. Take a slow breath in and out before you start.</p></div>`;
  root.querySelectorAll(".bl-card").forEach(b => b.onclick = () => enterRoom(ROOMS.find(r => r.id === b.dataset.id)));
  refresh();
}
document.getElementById("mine").onclick = () => {
  const NAMES = {}; ROOMS.forEach(r => r.things.forEach(t => NAMES[t[0]] = t[1]));
  const m = G.modal(`<h3>🔦 Things I found</h3><p class="g-stat">Shadows that looked scary but weren't. ${S.found.length} found.</p><div class="bl-found">${S.found.map(k => `<div>${giftArt({ kind: k })}<span>${G.esc(NAMES[k] || k)}</span></div>`).join("") || "<p>Nothing yet. Go find some!</p>"}</div><div class="g-row"><button class="btn" id="x" type="button">Close</button></div>`);
  m.box.querySelector("#x").onclick = m.close;
};
lobby();
