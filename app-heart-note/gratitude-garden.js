// Gratitude Garden: plant something you're thankful for. Your garden is saved and keeps growing a little each day you come back.
// Water it once a day to see a past thank-you and to bring a butterfly.
const GG_KEY = "heartnote-gratgarden", PLOTS = 20;
const root = document.getElementById("game"), stat = document.getElementById("stat");
G.wireSound(document.getElementById("sound"));
const CATS = [["A person", "sunflower"], ["A place", "tree"], ["Something I did", "rose"], ["A small thing", "dandelion"], ["Nature", "lavender"], ["Something I have", "bouquet"]];
const SUGG = ["A friend who listened", "A warm meal", "Sunshine today", "Something I learned", "A good song", "My bed", "A kind word", "A pet", "Something I'm proud of"];
let S = G.load(GG_KEY, { plants: [], waters: [] });
const save = () => G.save(GG_KEY, S);
const day = t => new Date(t).toISOString().slice(0, 10), today = () => day(Date.now());
const streak = () => { let n = 0, d = new Date(); const set = new Set(S.waters); if (!set.has(today())) d.setDate(d.getDate() - 1); while (set.has(d.toISOString().slice(0, 10))) { n++; d.setDate(d.getDate() - 1); } return n; };
function refresh() { stat.textContent = `Plants: ${S.plants.length} of ${PLOTS} · Days watered: ${S.waters.length} · Streak: ${streak()} day${streak() === 1 ? "" : "s"}`; }
const age = p => Math.floor((Date.now() - p.at) / 86400000);

function render() {
  root.innerHTML = `<div class="g-stage gg-stage" id="st"><div class="gg-sky"></div><div class="gg-grid" id="grid"></div><div class="gg-flyers" id="fl"></div><div class="gg-msg" id="msg"></div></div>
    <div class="g-row"><button class="btn primary" id="water" type="button">💧 Water the garden</button><span class="g-grow"></span><span class="g-stat" id="hint"></span></div>`;
  const grid = root.querySelector("#grid"), msg = root.querySelector("#msg"), fl = root.querySelector("#fl"), hint = root.querySelector("#hint"), water = root.querySelector("#water");
  const say = t => { msg.textContent = t; msg.classList.remove("show"); void msg.offsetWidth; msg.classList.add("show"); };
  const draw = () => {
    grid.innerHTML = ""; for (let i = 0; i < PLOTS; i++) { const p = S.plants[i];
      const b = G.el("button", "gg-plot" + (p ? " grown" : ""), p ? `<div class="gg-plant" style="--g:${Math.min(1, 0.8 + age(p) * 0.05).toFixed(2)}">${giftArt({ kind: CATS.find(c => c[0] === p.cat)[1] })}</div>` : `<span>+</span>`); b.type = "button"; b.title = p ? p.text : "Plant something you're thankful for";
      b.onclick = () => (p ? read(p) : plant(i)); grid.appendChild(b); }
    fl.innerHTML = ""; const bf = Math.min(6, S.waters.length); for (let i = 0; i < bf; i++) { const f = G.el("span", "gg-bfly", `<svg viewBox="0 0 40 30"><path d="M20 15C10 2 2 6 3 14c1 8 9 8 17 1z M20 15C30 2 38 6 37 14c-1 8-9 8-17 1z" fill="${["#ffb347", "#ff8ac0", "#8fc8ff", "#b07bff", "#7be0a0", "#ffe27a"][i]}" stroke="#7a4a2a" stroke-width="1"/><path d="M20 8v14" stroke="#4a2a1a" stroke-width="2"/></svg>`); f.style.left = (8 + i * 15) + "%"; f.style.top = (10 + (i % 3) * 14) + "%"; f.style.animationDelay = (-i * 1.3) + "s"; fl.appendChild(f); }
    const watered = S.waters.includes(today()); water.disabled = watered || !S.plants.length; water.textContent = watered ? "💧 Watered today ✓" : "💧 Water the garden";
    hint.textContent = !S.plants.length ? "Tap a spot to plant your first thank-you." : watered ? "Come back tomorrow: water it again and a new butterfly arrives." : "Water it once a day to see a past thank-you and bring a butterfly."; refresh(); };
  const plant = i => {
    Sfx.preset("softbell", 520); let cat = CATS[0][0];
    const m = G.modal(`<h3>🌱 Plant a thank-you</h3><p class="g-stat">What are you thankful for right now? It can be tiny.</p><input class="g-field" id="t" maxlength="70" placeholder="I'm thankful for…"><div class="g-chips">${G.shuffle(SUGG).slice(0, 4).map(s => `<button type="button" class="g-chip sug">${G.esc(s)}</button>`).join("")}</div><p class="g-label">What kind of thing is it?</p><div class="g-chips" id="cats">${CATS.map(([c], k) => `<button type="button" class="g-chip" data-c="${c}" aria-pressed="${k === 0}">${c}</button>`).join("")}</div><div class="g-row"><button class="btn primary" id="ok" type="button">Plant it</button><button class="btn" id="x" type="button">Not now</button></div>`);
    const t = m.box.querySelector("#t"); t.focus(); m.box.querySelectorAll(".sug").forEach(c => c.onclick = () => { t.value = c.textContent; });
    m.box.querySelectorAll("#cats .g-chip").forEach(b => b.onclick = () => { cat = b.dataset.c; m.box.querySelectorAll("#cats .g-chip").forEach(x => x.setAttribute("aria-pressed", String(x === b))); }); m.box.querySelector("#x").onclick = m.close;
    m.box.querySelector("#ok").onclick = () => { const text = t.value.trim(); if (!text) { t.focus(); return; } S.plants[i] = { text, cat, at: Date.now() }; save(); m.close(); draw(); Sfx.preset("softbell", 700); setTimeout(() => Sfx.preset("softbell", 1000), 160); say("It's planted. Thank you for noticing."); };
  };
  const read = p => { const m = G.modal(`<div style="text-align:center"><h3>${G.esc(p.text)}</h3><p class="g-stat">${G.esc(p.cat)} · planted ${G.date(p.at)}${age(p) ? ` · ${age(p)} day${age(p) === 1 ? "" : "s"} old` : ""}</p><p>Thankful things grow stronger every time you remember them.</p><div class="g-row" style="justify-content:center"><button class="btn" id="x" type="button">Close</button></div></div>`); Sfx.preset("softbell", 880); m.box.querySelector("#x").onclick = m.close; };
  water.onclick = () => { if (S.waters.includes(today()) || !S.plants.length) return; S.waters.push(today()); save(); Sfx.preset("hush"); setTimeout(() => Sfx.preset("softbell", 784), 300); draw();
    if (!G.reduced()) grid.querySelectorAll(".gg-plant").forEach((e, i) => e.animate([{ transform: "scale(1)" }, { transform: "scale(1.18) rotate(4deg)" }, { transform: "scale(1)" }], { duration: 700, delay: i * 60 }));
    const past = G.shuffle(S.plants).slice(0, 3); const m = G.modal(`<div style="text-align:center"><h3>💧 Your garden drinks it in</h3><p>A butterfly arrived. Here ${past.length === 1 ? "is something" : "are some things"} you were thankful for:</p><ul class="g-list" style="text-align:left">${past.map(p => `<li>${G.esc(p.text)}<small>${G.esc(p.cat)} · ${G.date(p.at)}</small></li>`).join("")}</ul><p class="g-stat">Take a slow breath and feel one of them again.</p><div class="g-row" style="justify-content:center"><button class="btn primary" id="x" type="button">Thank you</button></div></div>`); m.box.querySelector("#x").onclick = m.close; };
  draw();
}
document.getElementById("mine").onclick = () => {
  const m = G.modal(`<h3>🌻 My gratitude</h3><p class="g-stat">${S.plants.length} thing${S.plants.length === 1 ? "" : "s"} planted · ${S.waters.length} day${S.waters.length === 1 ? "" : "s"} watered</p><ul class="g-list">${[...S.plants].filter(Boolean).reverse().map(p => `<li><strong>${G.esc(p.text)}</strong><small>${G.esc(p.cat)} · ${G.date(p.at)}</small></li>`).join("") || "<li>Nothing planted yet.</li>"}</ul><div class="g-row"><button class="btn" id="x" type="button">Close</button></div>`);
  m.box.querySelector("#x").onclick = m.close;
};
refresh(); render();
