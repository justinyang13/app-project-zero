// My Own Garden: grow flowers from true, good things about you. Peeking over the fence at the neighbor's perfect garden
// makes your own garden droop, and then you find out the neighbor is looking at yours.
const MG_KEY = "heartnote-owngarden", PLOTS = 6;
const root = document.getElementById("game"), stat = document.getElementById("stat");
G.wireSound(document.getElementById("sound"));
const KINDS = ["sunflower", "rose", "flower", "lavender", "dandelion", "bouquet"];
const CHIPS = ["I'm kind", "I keep trying", "I made someone smile", "I'm a good friend", "I'm creative", "I try new things", "I'm a good listener", "I'm funny"];
const INSIGHTS = ["You're only seeing their highlights.", "Every garden has weeds you can't see from here.", "Their garden grew with time and care, just like yours.", "Looking over the fence makes your own flowers feel smaller.", "What do you actually want from that garden?"];
let S = G.load(MG_KEY, { cur: { plots: Array(PLOTS).fill(null), peeks: 0 }, done: [] });
if (!S.cur || !Array.isArray(S.cur.plots)) S.cur = { plots: Array(PLOTS).fill(null), peeks: 0 };
const save = () => G.save(MG_KEY, S);
function refresh() { stat.textContent = `Flowers in this garden: ${S.cur.plots.filter(Boolean).length} of ${PLOTS} · Gardens in full bloom: ${S.done.length} · Peeks over the fence: ${S.cur.peeks}`; }

function render() {
  let compare = 0, shown = 0; const planted = () => S.cur.plots.filter(Boolean).length;
  root.innerHTML = `<div class="g-stage mg-stage" id="st"><div class="mg-mine" id="mine2"><div class="mg-title">Your garden</div><div class="mg-plots" id="plots"></div></div><div class="mg-fence"></div>
    <button class="mg-neighbor" id="nb" type="button" aria-label="Peek at the neighbor's garden"><div class="mg-title">The neighbor's garden <span>(looks perfect!)</span></div><div class="mg-nbflowers" id="nbf"></div><div class="mg-weeds" id="weeds"></div><div class="mg-bubble" id="bub"></div></button>
    <div class="mg-meter"><span>Comparing</span><div><i id="cm"></i></div></div><div class="mg-msg" id="msg"></div></div>
    <div class="g-row"><span class="g-stat">Tap an empty spot in <strong>your</strong> garden to plant something true about you. Careful: peeking at the neighbor's garden dims your light.</span></div>`;
  const plots = root.querySelector("#plots"), st = root.querySelector("#st"), msg = root.querySelector("#msg"), cm = root.querySelector("#cm"), nb = root.querySelector("#nb"), bub = root.querySelector("#bub"), weeds = root.querySelector("#weeds");
  const nbf = root.querySelector("#nbf"); KINDS.concat(KINDS).forEach((k, i) => { const d = G.el("span", "mg-nbf", giftArt({ kind: KINDS[(i * 5) % 6] })); d.style.animationDelay = (i * 0.2) + "s"; nbf.appendChild(d); });
  const say = t => { msg.textContent = t; msg.classList.remove("show"); void msg.offsetWidth; msg.classList.add("show"); };
  const paint = () => { cm.style.width = compare + "%"; st.style.setProperty("--c", (compare / 100).toFixed(2)); st.classList.toggle("sad", compare > 45); };
  const drawPlots = () => { plots.innerHTML = ""; S.cur.plots.forEach((p, i) => { const b = G.el("button", "mg-plot" + (p ? " grown" : ""), p ? `<div class="mg-flower">${giftArt({ kind: p.kind })}</div><span>${G.esc(p.text)}</span>` : `<div class="mg-soil"></div><span>Plant something true</span>`); b.type = "button"; b.title = p ? p.text : "Plant something good about you"; b.onclick = () => (p ? say(`“${p.text}”: that's part of you.`) : plant(i)); plots.appendChild(b); }); refresh(); };
  const plant = i => {
    Sfx.preset("softbell", 520);
    const m = G.modal(`<h3>🌱 Plant a flower</h3><p class="g-stat">What is something good about you, or something you did lately, that is yours and no one else's?</p><input class="g-field" id="t" maxlength="60" placeholder="Something true about me…"><div class="g-chips">${G.shuffle(CHIPS).slice(0, 5).map(c => `<button type="button" class="g-chip">${G.esc(c)}</button>`).join("")}</div><div class="g-row"><button class="btn primary" id="ok" type="button">Plant it</button><button class="btn" id="x" type="button">Not now</button></div>`);
    const t = m.box.querySelector("#t"); t.focus(); m.box.querySelectorAll(".g-chip").forEach(c => c.onclick = () => { t.value = c.textContent; });
    m.box.querySelector("#x").onclick = m.close;
    m.box.querySelector("#ok").onclick = () => { const text = t.value.trim(); if (!text) { t.focus(); return; }
      S.cur.plots[i] = { text, kind: KINDS[i % KINDS.length] }; save(); m.close(); compare = Math.max(0, compare - 45); paint(); drawPlots(); Sfx.preset("softbell", 700 + planted() * 60); setTimeout(() => Sfx.preset("softbell", 1000 + planted() * 40), 180);
      say(["It's growing!", "Look at it bloom.", "That's a good one.", "Your garden is yours.", "Almost there!", "In full bloom!"][planted() - 1] || "Lovely."); if (planted() === PLOTS) setTimeout(bloom, 1100); };
  };
  const bloom = () => {
    S.done.push({ at: Date.now(), plots: S.cur.plots }); S.cur = { plots: Array(PLOTS).fill(null), peeks: S.cur.peeks }; save(); refresh(); Sfx.preset("twin", 784); setTimeout(() => Sfx.preset("softbell", 1175), 500);
    for (let i = 0; i < 30 && !G.reduced(); i++) { const c = G.el("i", "mg-conf"); c.style.cssText = `left:${Math.random() * 100}%;background:${["#ff5d73", "#ffd23f", "#4fb0ff", "#7be07b", "#b07bff"][i % 5]};animation-delay:${Math.random() * .6}s`; st.appendChild(c); setTimeout(() => c.remove(), 3200); }
    const m = G.modal(`<div style="text-align:center"><h3>🌻 Your garden is in full bloom!</h3><p>Six flowers, all made from things that are true about you. Nobody else has this garden. Keep it in mind next time you start peeking over the fence.</p><div class="g-row" style="justify-content:center"><button class="btn primary" id="again" type="button">Plant a new garden</button><button class="btn" id="x" type="button">Admire it a moment</button></div></div>`);
    m.box.querySelector("#again").onclick = () => { m.close(); render(); }; m.box.querySelector("#x").onclick = m.close;
  };
  nb.onclick = () => {
    S.cur.peeks++; save(); compare = Math.min(100, compare + 26); paint(); refresh(); Sfx.preset("purr", 150); say(INSIGHTS[(S.cur.peeks - 1) % INSIGHTS.length]);
    if (S.cur.peeks >= 3 && !shown) { shown = 1; weeds.classList.add("show"); bub.textContent = "Psst! I was just looking at YOUR garden. I wish I had flowers like yours."; bub.classList.add("show"); setTimeout(() => say("The neighbor has weeds too, and is comparing too."), 1800); }
  };
  const iv = setInterval(() => { if (!st.isConnected) return clearInterval(iv); if (compare > 0) { compare = Math.max(0, compare - 1.4); paint(); } }, 400);
  drawPlots(); paint();
}
document.getElementById("mine").onclick = () => {
  const m = G.modal(`<h3>🌻 My gardens</h3><p class="g-stat">${S.done.length} in full bloom.</p>${S.done.map((g, i) => `<h4 style="margin:12px 0 4px">Garden ${i + 1} · ${G.date(g.at)}</h4><ul class="g-list">${g.plots.filter(Boolean).map(p => `<li>${G.esc(p.text)}</li>`).join("")}</ul>`).reverse().join("") || "<p>None yet. Plant six flowers to finish one.</p>"}<div class="g-row"><button class="btn" id="x" type="button">Close</button></div>`);
  m.box.querySelector("#x").onclick = m.close;
};
refresh(); render();
