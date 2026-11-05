// One Thing Jar: put everything that is swirling around into the jar, then shake it and do just ONE small thing.
const OT_KEY = "heartnote-onething";
const root = document.getElementById("game"), stat = document.getElementById("stat");
G.wireSound(document.getElementById("sound"));
const COLORS = ["#ff7a9a", "#6fb3ff", "#ffd45e", "#7be0a0", "#b07bff", "#ff9a5e", "#5fd8d0", "#f08ad0"];
let S = G.load(OT_KEY, { jar: [], done: [] });
const save = () => G.save(OT_KEY, S);
function refresh() { stat.textContent = `In the jar: ${S.jar.length} · Things done: ${S.done.length}`; }
const marble = (t, c, i) => `<i class="ot-marble" title="${G.esc(t)}" style="background:radial-gradient(circle at 32% 28%, #fff, ${c} 60%);left:${10 + (i % 5) * 17 + (i % 2) * 4}%;bottom:${6 + Math.floor(i / 5) * 15}%"></i>`;

function render() {
  root.innerHTML = `<div class="ot-wrap"><div class="ot-left"><label class="g-label" for="t">Everything swirling in your head? Put it in the jar.</label><div class="g-row"><input class="g-field" id="t" maxlength="50" placeholder="One thing at a time…"><button class="btn primary" id="put" type="button">Put it in</button></div>
    <p class="g-stat">You don't have to do it all. You only have to do <strong>one</strong> thing. Shake the jar to see which.</p><div class="g-row"><button class="btn primary" id="shake" type="button">🫙 Shake the jar</button></div><p class="g-label" style="margin-top:14px">Done so far:</p><div class="ot-stars" id="stars"></div></div>
    <div class="ot-jarbox"><div class="ot-jar" id="jar">${S.jar.map((x, i) => marble(x.text, COLORS[i % 8], i)).join("")}</div><div class="ot-lid"></div></div></div>`;
  const t = root.querySelector("#t"), jar = root.querySelector("#jar");
  const put = () => { const v = t.value.trim(); if (!v || S.jar.length >= 15) return; S.jar.push({ text: v, id: Date.now() }); save(); t.value = ""; Sfx.preset("softbell", 500 + S.jar.length * 25); render(); root.querySelector("#t").focus(); };
  root.querySelector("#put").onclick = put; t.addEventListener("keydown", e => { if (e.key === "Enter") put(); });
  root.querySelector("#stars").innerHTML = S.done.slice(-12).map(() => `<span class="ot-star">★</span>`).join("") || `<span class="g-stat">Nothing yet. That's okay.</span>`;
  root.querySelector("#shake").onclick = () => {
    if (!S.jar.length) { t.focus(); return; }
    Sfx.preset("hush"); jar.classList.add("shaking"); setTimeout(() => { jar.classList.remove("shaking"); one(S.jar[Math.floor(Math.random() * S.jar.length)]); }, G.reduced() ? 100 : 1100);
  };
  refresh();
}
function one(item) {
  Sfx.preset("softbell", 784);
  const m = G.modal(`<div style="text-align:center"><p class="g-stat" style="margin:0">Out of everything in the jar, just this one:</p><h3 style="font-size:1.4rem;margin:8px 0">${G.esc(item.text)}</h3><p>Everything else can stay in the jar. What's the <strong>tiniest first step</strong>?</p><input class="g-field" id="s" maxlength="60" placeholder="e.g. open the document"><div class="g-row" style="justify-content:center"><button class="btn primary" id="do" type="button">Do it for 5 minutes</button><button class="btn" id="back" type="button">Shake again</button></div></div>`);
  m.box.querySelector("#back").onclick = m.close;
  m.box.querySelector("#do").onclick = () => { const step = m.box.querySelector("#s").value.trim(); let left = 300;
    m.box.innerHTML = `<div style="text-align:center"><h3>${G.esc(item.text)}</h3>${step ? `<p>First step: <strong>${G.esc(step)}</strong></p>` : ""}<div class="ot-timer" id="tm">5:00</div><p class="g-stat">Just this, just for five minutes. Nothing else exists right now.</p><div class="g-row" style="justify-content:center"><button class="btn primary" id="did" type="button">I did it!</button><button class="btn" id="giveup" type="button">Not today</button></div></div>`;
    const tm = m.box.querySelector("#tm"), iv = setInterval(() => { left--; if (!tm.isConnected) return clearInterval(iv); tm.textContent = `${Math.floor(left / 60)}:${String(left % 60).padStart(2, "0")}`; if (left <= 0) { clearInterval(iv); tm.textContent = "Time!"; Sfx.preset("twin", 660); } }, 1000);
    m.box.querySelector("#giveup").onclick = () => { clearInterval(iv); m.close(); };
    m.box.querySelector("#did").onclick = () => { clearInterval(iv); S.jar = S.jar.filter(x => x.id !== item.id); S.done.push({ text: item.text, step, at: Date.now() }); save(); Sfx.preset("twin", 880); setTimeout(() => Sfx.preset("softbell", 1175), 300); m.box.innerHTML = `<div style="text-align:center"><h3>⭐ One thing done!</h3><p>You did <strong>${G.esc(item.text)}</strong>. That's real progress. The rest of the jar can wait until you're ready.</p><div class="g-row" style="justify-content:center"><button class="btn primary" id="ok" type="button">Back to the jar</button></div></div>`; m.box.querySelector("#ok").onclick = m.close; render(); }; };
}
document.getElementById("mine").onclick = () => {
  const m = G.modal(`<h3>⭐ Things I did</h3><p class="g-stat">${S.done.length} thing${S.done.length === 1 ? "" : "s"}, one at a time.</p><ul class="g-list">${[...S.done].reverse().map(d => `<li><strong>${G.esc(d.text)}</strong><small>${d.step ? "First step: " + G.esc(d.step) + " · " : ""}${G.date(d.at)}</small></li>`).join("") || "<li>None yet.</li>"}</ul><div class="g-row"><button class="btn" id="x" type="button">Close</button></div>`);
  m.box.querySelector("#x").onclick = m.close;
};
render();
