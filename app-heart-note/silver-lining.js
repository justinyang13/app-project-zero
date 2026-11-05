// Silver Lining: gray clouds drift across the sky. Open each one and find its silver lining, and the sun grows until it comes out.
const SL_KEY = "heartnote-silverlining";
const root = document.getElementById("game"), stat = document.getElementById("stat");
G.wireSound(document.getElementById("sound"));
const PROMPTS = [
  ["What did you learn from this?", ["That I care a lot", "That I can handle more than I thought", "What I want to do next time"]],
  ["What could you try next?", ["A smaller version of my plan", "Asking someone for help", "Trying again later"]],
  ["Who could help you feel better?", ["A friend", "Someone in my family", "A teacher or someone I trust"]],
  ["What is still good right now?", ["People who care about me", "Something I'm looking forward to", "A cozy place to rest"]],
  ["What did you do well, even though it didn't work out?", ["I tried hard", "I was brave", "I stayed kind"]],
  ["What would you tell a friend in your spot?", ["You're allowed to be sad", "It's not the end", "I'm proud of you"]],
  ["What could this make room for?", ["A new idea", "More rest", "A better surprise"]],
  ["What is one small thing that could make today better?", ["A walk", "A snack", "Music I love"]]
];
let S = G.load(SL_KEY, { linings: [], skies: 0 });
const save = () => G.save(SL_KEY, S);
const cloudArt = lit => `<svg viewBox="0 0 120 84"><path d="M26 74C8 74 2 52 20 46C16 28 38 18 50 28C58 10 88 12 92 32C112 32 116 58 100 66C98 72 92 74 86 74z" fill="${lit ? "#fbfcff" : "#6a7088"}" stroke="${lit ? "#c8d0e8" : "rgba(30,30,60,.55)"}" stroke-width="${lit ? 3.5 : 2.5}" stroke-linejoin="round" ${lit ? 'style="filter:drop-shadow(0 0 6px #fff)"' : ""}/>${lit
  ? `<path d="M36 44q7-8 14 0M70 44q7-8 14 0" stroke="#2b1b24" stroke-width="3.200" fill="none" stroke-linecap="round"/><ellipse cx="34" cy="55" rx="6" ry="3.400" fill="#ff8fa8" opacity=".7"/><ellipse cx="86" cy="55" rx="6" ry="3.400" fill="#ff8fa8" opacity=".7"/><path d="M48 54q12 14 24 0z" fill="#7a2a3a"/><path d="M22 70q40 8 76 0" stroke="#d6dcf0" stroke-width="2" fill="none" opacity=".9"/>`
  : `<path d="M34 38l14-5M86 38l-14-5" stroke="#2b1b24" stroke-width="2.800" stroke-linecap="round"/><circle cx="43" cy="45" r="4" fill="#2b1b24"/><circle cx="77" cy="45" r="4" fill="#2b1b24"/><path d="M50 62q4-5 8 0t8 0 8 0" stroke="#2b1b24" stroke-width="2.600" fill="none" stroke-linecap="round"/>`}</svg>`;
const sunArt = `<svg viewBox="0 0 120 120"><g stroke="#ffb92e" stroke-width="6" stroke-linecap="round"><path d="M60 6v14M60 100v14M6 60h14M100 60h14M22 22l10 10M88 88l10 10M98 22L88 32M32 88L22 98"/></g><circle cx="60" cy="60" r="32" fill="#ffd45e" stroke="#e8a010" stroke-width="3"/><circle cx="49" cy="55" r="4" fill="#2b1b24"/><circle cx="71" cy="55" r="4" fill="#2b1b24"/><path d="M47 68q13 12 26 0" stroke="#2b1b24" stroke-width="3.500" fill="none" stroke-linecap="round"/><ellipse cx="42" cy="66" rx="5" ry="3" fill="#ff8fa8" opacity=".7"/><ellipse cx="78" cy="66" rx="5" ry="3" fill="#ff8fa8" opacity=".7"/></svg>`;

function refresh() { stat.textContent = `Skies cleared: ${S.skies} · Silver linings found: ${S.linings.length}`; }

function newSky() {
  const picks = G.shuffle(PROMPTS).slice(0, 6); let lit = 0;
  root.innerHTML = `<div class="g-stage sl-sky" id="sky"><div class="sl-sun" id="sun">${sunArt}</div><svg class="sl-rainbow" id="rb" viewBox="0 0 300 150" preserveAspectRatio="none">${["#e8404f", "#ff9a2e", "#ffd93a", "#4cc06a", "#4aa3f0", "#8f6fe0"].map((c, i) => `<path d="M${20 + i * 9} 150A${130 - i * 9} ${130 - i * 9} 0 0 1 ${280 - i * 9} 150" fill="none" stroke="${c}" stroke-width="8" stroke-linecap="round" stroke-dasharray="500" stroke-dashoffset="500" class="rbp" style="transition-delay:${i * .25}s"/>`).join("")}</svg><div class="sl-hint" id="hint"></div></div>
    <div class="g-row"><span class="g-stat">Tap a gray cloud to look for its silver lining. Each one you find brightens the sky.</span><span class="g-grow"></span><span class="g-stat" id="prog"></span></div>`;
  const sky = root.querySelector("#sky"), sun = root.querySelector("#sun"), hint = root.querySelector("#hint"), prog = root.querySelector("#prog"), rb = root.querySelector("#rb");
  const paint = () => { sun.style.setProperty("--s", (0.55 + lit * 0.14).toFixed(2)); sky.style.setProperty("--b", (lit / 6).toFixed(2)); prog.textContent = `${lit} of 6 clouds brightened`; hint.textContent = lit === 0 ? "A gray sky. Let's find the silver linings." : lit < 6 ? "It's getting brighter…" : ""; };
  picks.forEach((p, i) => {
    const c = G.el("button", "sl-cloud", cloudArt(false)); c.type = "button"; c.setAttribute("aria-label", "A gray cloud. Tap to find its silver lining.");
    c.style.top = (8 + i * 12) + "%"; c.style.animationDuration = (46 + Math.random() * 30) + "s"; c.style.animationDelay = (-Math.random() * 40) + "s"; c.style.setProperty("--w", (84 + Math.random() * 36) + "px");
    c.onclick = () => ask(p, c);
    sky.appendChild(c);
  });
  const ask = ([q, chips], c) => {
    if (c.dataset.lit) return; Sfx.preset("softbell", 520);
    const m = G.modal(`<h3>☁️ ${G.esc(q)}</h3><p class="g-stat">There's no wrong answer. Pick one or write your own.</p><input class="g-field" id="a" maxlength="100" placeholder="Your silver lining…"><div class="g-chips">${chips.map(x => `<button type="button" class="g-chip">${G.esc(x)}</button>`).join("")}</div>
      <div class="g-row"><button class="btn primary" id="ok" type="button">Brighten the cloud</button><button class="btn" id="x" type="button">Not now</button></div>`);
    const a = m.box.querySelector("#a"); a.focus(); m.box.querySelectorAll(".g-chip").forEach(b => b.onclick = () => { a.value = b.textContent; });
    m.box.querySelector("#x").onclick = m.close;
    m.box.querySelector("#ok").onclick = () => {
      const text = a.value.trim(); if (!text) { a.focus(); return; }
      S.linings.push({ q, a: text, at: Date.now() }); save(); m.close(); c.dataset.lit = "1"; c.classList.add("lit"); c.innerHTML = cloudArt(true); lit++; paint(); refresh();
      Sfx.preset("softbell", 660 + lit * 70); if (!G.reduced()) sparkle(c);
      if (lit === 6) setTimeout(finish, 900);
    };
  };
  const sparkle = c => { const r = c.getBoundingClientRect(), s = sky.getBoundingClientRect(); for (let i = 0; i < 12; i++) { const d = G.el("i", "sl-spark"); d.style.left = (r.left - s.left + r.width / 2) + "px"; d.style.top = (r.top - s.top + r.height * 0.6) + "px"; d.style.setProperty("--dx", ((Math.random() - 0.5) * 70) + "px"); d.style.setProperty("--dy", (30 + Math.random() * 70) + "px"); sky.appendChild(d); setTimeout(() => d.remove(), 1500); } };
  const finish = () => {
    sky.classList.add("clear"); rb.querySelectorAll(".rbp").forEach(p => p.style.strokeDashoffset = 0); S.skies++; save(); refresh();
    Sfx.preset("twin", 784); setTimeout(() => Sfx.preset("softbell", 1047), 600); hint.textContent = "The sun is out! You found a silver lining in every cloud.";
    setTimeout(() => { const m = G.modal(`<div style="text-align:center"><h3>☀️ The sun came out!</h3><p>You found six silver linings. The disappointment is still real, but now it's not the only thing in the sky.</p><p class="g-stat">Skies cleared: ${S.skies}</p><div class="g-row" style="justify-content:center"><button class="btn primary" id="again" type="button">A new sky</button><button class="btn" id="x" type="button">Stay here a moment</button></div></div>`);
      m.box.querySelector("#again").onclick = () => { m.close(); newSky(); }; m.box.querySelector("#x").onclick = m.close; }, 2600);
  };
  paint();
}
document.getElementById("mine").onclick = () => {
  const m = G.modal(`<h3>☁️ My silver linings</h3><p class="g-stat">${S.linings.length} found. Read these on a day when the clouds are gray.</p><ul class="g-list">${[...S.linings].reverse().map(l => `<li><strong>${G.esc(l.a)}</strong><small>${G.esc(l.q)} · ${G.date(l.at)}</small></li>`).join("") || "<li>None yet. Open a cloud!</li>"}</ul><div class="g-row"><button class="btn" id="x" type="button">Close</button></div>`);
  m.box.querySelector("#x").onclick = m.close;
};
refresh(); newSky();
