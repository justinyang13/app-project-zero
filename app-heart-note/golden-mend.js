// Golden Mend: a favorite plate is broken. Mend each piece with a kind step (sorry, make it right, learn, be fair, forgive yourself)
// and golden seams, like kintsugi, make it whole and more beautiful.
const GM_KEY = "heartnote-goldenmend";
const root = document.getElementById("game"), stat = document.getElementById("stat");
G.wireSound(document.getElementById("sound"));
const STEPS = [
  { name: "Say sorry", q: "If you owe someone a sorry, who is it, and what could you say?", chips: ["I'm sorry I hurt you", "I'm sorry, and I'll do better", "Can we talk about it?"], none: "I don't owe anyone a sorry" },
  { name: "Make it right", q: "What is one thing you can do to make it right?", chips: ["Fix what I broke", "Be kinder next time", "Ask what they need"], none: "There's nothing to fix" },
  { name: "Learn", q: "What did you learn from this?", chips: ["To think before I speak", "To ask for help", "To slow down"], none: "I'm still figuring it out" },
  { name: "Be fair", q: "What part of this was not your fault, or something you couldn't have known?", chips: ["I didn't know then what I know now", "Other people were part of it too", "I was doing my best"], none: "I'm not sure yet" },
  { name: "Forgive yourself", q: "Finish the sentence: I forgive myself for…", chips: ["not being perfect", "making a mistake", "not knowing then what I know now"], none: "I'm working on it" }
];
let S = G.load(GM_KEY, { mended: [] });
const save = () => G.save(GM_KEY, S);
function refresh() { stat.textContent = `Plates mended: ${S.mended.length}`; }
const R = 120, C = 150, pt = a => [C + R * Math.cos(a * Math.PI / 180), C + R * Math.sin(a * Math.PI / 180)];

function play() {
  const answers = Array(5).fill(null), done = [];
  const pieces = STEPS.map((st, i) => { const a0 = -90 + i * 72, a1 = a0 + 72, mid = (a0 + a1) / 2 * Math.PI / 180, [x0, y0] = pt(a0), [x1, y1] = pt(a1);
    const dx = Math.cos(mid) * 46 + (Math.random() - 0.5) * 14, dy = Math.sin(mid) * 46 + (Math.random() - 0.5) * 14, rot = (Math.random() - 0.5) * 24;
    const tx = C + Math.cos(mid) * 72, ty = C + Math.sin(mid) * 72;
    return `<g class="gm-piece" data-i="${i}" tabindex="0" role="button" aria-label="Mend this piece: ${st.name}" style="transform: translate(${dx}px, ${dy}px) rotate(${rot}deg)"><path d="M${C} ${C}L${x0} ${y0}A${R} ${R} 0 0 1 ${x1} ${y1}Z" fill="url(#plate)" stroke="#9a8a6a" stroke-width="1.500" stroke-linejoin="round"/><text x="${tx}" y="${ty}" text-anchor="middle" font-size="11" font-weight="800" fill="#fff" stroke="#1f3a6a" stroke-width="3" paint-order="stroke">${i + 1}. ${st.name}</text><path class="seam" d="M${C} ${C}L${x0} ${y0}M${C} ${C}L${x1} ${y1}" fill="none" stroke="#f2c24a" stroke-width="4" stroke-linecap="round" stroke-dasharray="130" stroke-dashoffset="130" /></g>`; }).join("");
  root.innerHTML = `<div class="g-stage gm-stage" id="st"><svg viewBox="-30 -30 360 360" class="gm-svg" id="svg"><defs><radialGradient id="plate" gradientUnits="userSpaceOnUse" cx="${C}" cy="${C}" r="${R}"><stop offset="0" stop-color="#fffdf4"/><stop offset=".38" stop-color="#fffdf4"/><stop offset=".4" stop-color="#4f7fc8"/><stop offset=".55" stop-color="#7ea6e0"/><stop offset=".57" stop-color="#4f7fc8"/><stop offset=".68" stop-color="#4f7fc8"/><stop offset=".7" stop-color="#fffdf4"/><stop offset=".94" stop-color="#f0e8d4"/><stop offset="1" stop-color="#d8cdb0"/></radialGradient></defs><circle cx="${C}" cy="${C + 6}" r="${R + 8}" fill="rgba(0,0,0,.22)"/>${pieces}</svg><div class="gm-msg" id="msg">Your favorite plate broke. Tap a piece to mend it.</div><div class="gm-count" id="cnt">0 of 5 mended</div></div>
    <div class="g-row"><span class="g-stat">Tap each broken piece and answer the gentle question. Every step puts a piece back with a golden seam.</span></div>`;
  const svg = root.querySelector("#svg"), msg = root.querySelector("#msg"), cnt = root.querySelector("#cnt");
  const mend = i => {
    if (done.includes(i)) return; const st = STEPS[i]; Sfx.preset("softbell", 520);
    const m = G.modal(`<h3>🏺 ${i + 1}. ${st.name}</h3><p>${G.esc(st.q)}</p><input class="g-field" id="a" maxlength="100" placeholder="Your answer…"><div class="g-chips">${st.chips.concat([st.none]).map(c => `<button type="button" class="g-chip">${G.esc(c)}</button>`).join("")}</div><div class="g-row"><button class="btn primary" id="ok" type="button">Mend this piece</button><button class="btn" id="x" type="button">Not yet</button></div>`);
    const a = m.box.querySelector("#a"); a.focus(); m.box.querySelectorAll(".g-chip").forEach(c => c.onclick = () => { a.value = c.textContent; }); m.box.querySelector("#x").onclick = m.close;
    m.box.querySelector("#ok").onclick = () => { const text = a.value.trim(); if (!text) { a.focus(); return; } answers[i] = text; done.push(i); m.close();
      const g = svg.querySelector(`.gm-piece[data-i="${i}"]`); g.style.transform = "none"; g.classList.add("mended"); setTimeout(() => { g.querySelector(".seam").style.strokeDashoffset = 0; Sfx.preset("softbell", 600 + done.length * 80); }, G.reduced() ? 0 : 700);
      cnt.textContent = `${done.length} of 5 mended`; msg.textContent = ["Good. One piece is back.", "Two down. The plate is taking shape.", "Halfway mended.", "Just one more piece.", ""][done.length - 1] || "";
      if (done.length === 5) setTimeout(whole, 1700); }; };
  svg.querySelectorAll(".gm-piece").forEach(g => { g.onclick = () => mend(+g.dataset.i); g.onkeydown = e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); mend(+g.dataset.i); } }; });
  const whole = () => { S.mended.push({ at: Date.now(), answers: STEPS.map((s, i) => [s.name, answers[i]]) }); save(); refresh(); svg.classList.add("whole"); msg.textContent = "Whole again, and more beautiful."; Sfx.preset("twin", 784); setTimeout(() => Sfx.preset("softbell", 1175), 500);
    setTimeout(() => { const m = G.modal(`<div style="text-align:center"><h3>✨ Mended in gold</h3><p>In kintsugi, a broken bowl is mended with gold, and the cracks become the most beautiful part. Mistakes can be like that: you can repair, learn and forgive, and the mended thing is stronger and kinder than before.</p><div class="g-row" style="justify-content:center"><button class="btn primary" id="again" type="button">Mend another plate</button><button class="btn" id="x" type="button">Admire it</button></div></div>`); m.box.querySelector("#again").onclick = () => { m.close(); play(); }; m.box.querySelector("#x").onclick = m.close; }, 2000); };
  refresh();
}
document.getElementById("mine").onclick = () => {
  const m = G.modal(`<h3>🏺 My mended plates</h3><p class="g-stat">${S.mended.length} mended.</p>${[...S.mended].reverse().map((p, k) => `<h4 style="margin:10px 0 2px">Plate ${S.mended.length - k} · ${G.date(p.at)}</h4><ul class="g-list">${p.answers.map(([n, a]) => `<li><strong>${G.esc(n)}</strong><small>${G.esc(a)}</small></li>`).join("")}</ul>`).join("") || "<p>None yet.</p>"}<div class="g-row"><button class="btn" id="x" type="button">Close</button></div>`);
  m.box.querySelector("#x").onclick = m.close;
};
play();
