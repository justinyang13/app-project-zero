// Rain to Rainbow: name each raindrop feeling ("name it to tame it") and it turns into a band of color, until the rainbow comes out.
const RR_KEY = "heartnote-rainrainbow";
const root = document.getElementById("game"), stat = document.getElementById("stat");
G.wireSound(document.getElementById("sound"));
const BANDS = ["#e8404f", "#ff9a2e", "#ffd93a", "#4cc06a", "#4aa3f0", "#6a5ad8", "#b07bff"];
const CHIPS = ["I miss someone", "I feel left out", "I'm tired of trying", "Things didn't go right", "I feel alone", "I'm worried", "I'm just sad"];
let S = G.load(RR_KEY, { named: [], rainbows: 0 });
const save = () => G.save(RR_KEY, S);
function refresh() { stat.textContent = `Rainbows made: ${S.rainbows} · Feelings named: ${S.named.length}`; }

function window_() {
  let n = 0, spawnT = null;
  root.innerHTML = `<div class="g-stage rr-win" id="win"><div class="rr-sun" id="sun"></div><svg class="rr-arc" id="arc" viewBox="0 0 300 160" preserveAspectRatio="none">${BANDS.map((c, i) => `<path d="M${14 + i * 10} 160A${136 - i * 10} ${136 - i * 10} 0 0 1 ${286 - i * 10} 160" fill="none" stroke="${c}" stroke-width="9" stroke-linecap="round" stroke-dasharray="460" stroke-dashoffset="460" class="rr-band" id="b${i}"/>`).join("")}</svg><div class="rr-sill"></div><div class="rr-hint" id="hint">Tap a raindrop to name the feeling inside it.</div></div>
    <div class="g-row"><span class="g-stat">Each raindrop holds a feeling. Say what it is, and it turns into a color.</span><span class="g-grow"></span><span class="g-stat" id="prog">0 of 7 named</span></div>`;
  const win = root.querySelector("#win"), hint = root.querySelector("#hint"), prog = root.querySelector("#prog"), sun = root.querySelector("#sun");
  const drop = () => {
    if (!win.isConnected) return clearInterval(spawnT);
    if (win.querySelectorAll(".rr-drop").length >= 9 - Math.floor(n / 2)) return;
    const d = G.el("button", "rr-drop", `<svg viewBox="0 0 30 44"><path d="M15 2C9 14 3 21 3 29a12 12 0 0024 0c0-8-6-15-12-27z" fill="#8fb4d8" stroke="#5a84b0" stroke-width="1.500"/><path d="M9 28q0 6 6 8" stroke="#fff" stroke-opacity=".8" stroke-width="2" fill="none" stroke-linecap="round"/><path d="M11 24q4-2 8 0" stroke="#2b3a5a" stroke-width="1.600" fill="none"/><circle cx="11" cy="25" r="1.100" fill="#2b3a5a"/><circle cx="19" cy="25" r="1.100" fill="#2b3a5a"/></svg>`);
    d.type = "button"; d.setAttribute("aria-label", "A raindrop with a feeling inside. Tap to name it."); d.style.left = (6 + Math.random() * 84) + "%"; d.style.animationDuration = (7 + Math.random() * 4 + n * 0.4) + "s";
    d.onclick = () => name(d); win.appendChild(d); d.addEventListener("animationend", () => d.remove()); setTimeout(() => d.remove(), 13000);
  };
  const name = d => {
    Sfx.preset("softbell", 500); d.style.animationPlayState = "paused";
    const m = G.modal(`<h3>💧 What feeling is inside this drop?</h3><p class="g-stat">Naming a feeling helps it feel smaller. Pick one or write your own.</p><input class="g-field" id="t" maxlength="60" placeholder="This drop is…"><div class="g-chips">${G.shuffle(CHIPS).slice(0, 5).map(c => `<button type="button" class="g-chip">${G.esc(c)}</button>`).join("")}</div><div class="g-row"><button class="btn primary" id="ok" type="button">Turn it into color</button><button class="btn" id="x" type="button">Not now</button></div>`, () => { if (d.isConnected && !d.dataset.done) d.style.animationPlayState = "running"; });
    const t = m.box.querySelector("#t"); t.focus(); m.box.querySelectorAll(".g-chip").forEach(c => c.onclick = () => { t.value = c.textContent; }); m.box.querySelector("#x").onclick = m.close;
    m.box.querySelector("#ok").onclick = () => { const text = t.value.trim(); if (!text) { t.focus(); return; }
      d.dataset.done = "1"; S.named.push({ text, color: BANDS[n], at: Date.now() }); save(); m.close(); d.classList.add("melt"); setTimeout(() => d.remove(), 900);
      const band = root.querySelector("#b" + n); band.style.strokeDashoffset = 0; Sfx.preset("softbell", 520 + n * 70); n++; prog.textContent = `${n} of 7 named`; refresh();
      sun.style.opacity = Math.min(1, n / 5); hint.textContent = ["A first color!", "The rain is getting lighter…", "Look at that color.", "The sun is peeking out…", "Almost there.", "One more!", ""][n - 1] || "";
      if (n === 7) setTimeout(done, 1200); };
  };
  const done = () => { clearInterval(spawnT); win.querySelectorAll(".rr-drop").forEach(d => d.remove()); S.rainbows++; save(); refresh(); win.classList.add("clear"); Sfx.preset("twin", 784); setTimeout(() => Sfx.preset("softbell", 1175), 500); hint.textContent = "The rain stopped, and there's a rainbow.";
    setTimeout(() => { const m = G.modal(`<div style="text-align:center"><h3>🌈 A whole rainbow!</h3><p>You named seven feelings. They're still real, but now each one has a color instead of just a weight.</p><div class="g-row" style="justify-content:center"><button class="btn primary" id="again" type="button">Watch a new rain</button><button class="btn" id="x" type="button">Stay a moment</button></div></div>`); m.box.querySelector("#again").onclick = () => { m.close(); window_(); }; m.box.querySelector("#x").onclick = m.close; }, 2600); };
  spawnT = setInterval(drop, 900); for (let i = 0; i < 3; i++) setTimeout(drop, i * 300);
}
document.getElementById("mine").onclick = () => {
  const m = G.modal(`<h3>🌈 My rainbows</h3><p class="g-stat">${S.rainbows} rainbow${S.rainbows === 1 ? "" : "s"} · ${S.named.length} feelings named</p><ul class="g-list">${[...S.named].reverse().map(x => `<li style="border-left:6px solid ${x.color}"><strong>${G.esc(x.text)}</strong><small>${G.date(x.at)}</small></li>`).join("") || "<li>None yet.</li>"}</ul><div class="g-row"><button class="btn" id="x" type="button">Close</button></div>`);
  m.box.querySelector("#x").onclick = m.close;
};
refresh(); window_();
