// Zoom Out: put your embarrassing moment on screen, then zoom out, one step at a time, from the room to the planet to the galaxy.
// You find yourself at every level, and watch the moment shrink to its true size.
const ZO_KEY = "heartnote-zoomout";
const root = document.getElementById("game"), stat = document.getElementById("stat");
G.wireSound(document.getElementById("sound"));
const EXAMPLES = ["I tripped in front of everyone", "I called the teacher by the wrong name", "My voice cracked", "I forgot what I was going to say"];
const OOPS_CLUB = ["Someone waved back at a person who wasn't waving at them, and kept waving to make it look planned.", "Someone typed a message about a friend and sent it to that friend. They sent a heart emoji too, so it worked out.", "Someone walked confidently into a glass door, then pretended to inspect it.", "Someone said \"you too\" when the waiter said enjoy your meal.", "Someone tripped on nothing at all, in an empty hallway."];
let S = G.load(ZO_KEY, { oops: [] });
const save = () => G.save(ZO_KEY, S);
function refresh() { stat.textContent = `Moments zoomed out: ${S.oops.length}`; }
const dots = (n, f) => Array.from({ length: n }, (_, i) => f(i)).join("");
const rnd = (i, k) => ((Math.sin(i * 12.9898 + k * 78.233) * 43758.5453) % 1 + 1) % 1;
const person = (x, y, me, i) => `<g transform="translate(${x} ${y})"><circle cx="0" cy="-9" r="6.500" fill="${me ? "#ffd0b0" : ["#f4d4b8", "#e8c4a0", "#d4a880", "#fce0c8"][i % 4]}" stroke="${me ? "#e8445f" : "none"}" stroke-width="2"/><rect x="-6.500" y="-2" width="13" height="14" rx="5" fill="${me ? "#e8445f" : ["#6a8ac8", "#8ac86a", "#c88a6a", "#a86ac8", "#c8b86a"][i % 5]}"/></g>`;
const LEVELS = [
  { name: "Up close", cap: "Up close, it feels enormous. Everything is about this one moment.", you: [50, 60], svg: (t) => `<svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice"><rect width="400" height="300" fill="#ffe9d6"/><circle cx="200" cy="190" r="104" fill="#ffd7b0" stroke="#e8b890" stroke-width="3"/><ellipse cx="146" cy="214" rx="22" ry="12" fill="#ff7d96" opacity=".7"/><ellipse cx="254" cy="214" rx="22" ry="12" fill="#ff7d96" opacity=".7"/><circle cx="165" cy="172" r="12" fill="#2b1b24"/><circle cx="235" cy="172" r="12" fill="#2b1b24"/><circle cx="169" cy="168" r="4" fill="#fff"/><circle cx="239" cy="168" r="4" fill="#fff"/><path d="M170 232q30-16 60 0" stroke="#2b1b24" stroke-width="6" fill="none" stroke-linecap="round"/></svg>` },
  { name: "The room", cap: "Zoom out a little. Most people in the room are busy thinking about themselves.", you: [58, 62], svg: () => `<svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice"><rect width="400" height="300" fill="#efe4cc"/><rect x="14" y="14" width="372" height="272" rx="10" fill="#f8f0de" stroke="#cdbf94" stroke-width="3"/>${dots(15, i => person(48 + (i % 5) * 68 + (i * 7 % 13), 70 + Math.floor(i / 5) * 78, false, i))}${person(232, 190, true, 0)}<g font-size="9" fill="#5a4a3a" font-family="cursive"><text x="40" y="44">lunch?</text><text x="200" y="40">my turn soon…</text><text x="300" y="116">what's for dinner?</text><text x="108" y="210">nice weather</text></g></svg>` },
  { name: "The town", cap: "Zoom out again. Thousands of people, and nearly all of them will never know.", you: [47, 52], svg: () => `<svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice"><rect width="400" height="300" fill="#bfe0a8"/><path d="M0 220Q100 190 200 215T400 200V300H0z" fill="#8fc8f0" opacity=".8"/>${dots(40, i => { const x = 14 + (i % 8) * 48 + rnd(i, 1) * 10, y = 24 + Math.floor(i / 8) * 40 + rnd(i, 2) * 8; return `<g><rect x="${x}" y="${y + 6}" width="30" height="20" fill="${["#e8b890", "#d89a7a", "#e8d4a0"][i % 3]}"/><path d="M${x - 3} ${y + 6}L${x + 15} ${y - 6}L${x + 33} ${y + 6}z" fill="#a85a4a"/></g>`; })}<circle cx="188" cy="156" r="7" fill="#e8445f" stroke="#fff" stroke-width="2"/></svg>` },
  { name: "The planet", cap: "Now the whole planet. Eight billion people, and every one has had an \"oops\".", you: [55, 44], svg: () => `<svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice"><rect width="400" height="300" fill="#05081e"/>${dots(40, i => `<circle cx="${rnd(i, 3) * 400}" cy="${rnd(i, 4) * 300}" r="${rnd(i, 5) * 1.4 + .4}" fill="#fff" opacity=".8"/>`)}<circle cx="200" cy="150" r="104" fill="#3a82d0"/><path d="M130 110q30-30 60-10t10 40-50 10-30-20zM230 160q30-10 40 20t-20 40-30-20zM170 200q20-10 30 10t-20 20z" fill="#5aae4a"/><path d="M110 150q50 20 100-10t90 20" stroke="#fff" stroke-width="5" fill="none" opacity=".35"/><circle cx="220" cy="132" r="4" fill="#e8445f" stroke="#fff" stroke-width="1.500"/><circle cx="200" cy="150" r="104" fill="none" stroke="#9ad0ff" stroke-width="2" opacity=".5"/></svg>` },
  { name: "The galaxy", cap: "And the galaxy. Hundreds of billions of stars. Your moment is a tiny blink.", you: [62, 58], svg: () => `<svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice"><rect width="400" height="300" fill="#04040f"/>${dots(260, i => { const a = i * 0.21, r = 8 + i * 0.52; const arm = i % 2 ? 2.6 : 0; return `<circle cx="${200 + Math.cos(a + arm) * r * 0.95}" cy="${150 + Math.sin(a + arm) * r * 0.48}" r="${rnd(i, 7) * 1.3 + .4}" fill="${["#fff", "#cfd8ff", "#ffe9b0"][i % 3]}" opacity="${(0.4 + rnd(i, 8) * 0.6).toFixed(2)}"/>`; })}<circle cx="200" cy="150" r="14" fill="#ffe9b0" opacity=".8"/><circle cx="248" cy="174" r="3.200" fill="#e8445f" stroke="#fff" stroke-width="1"/></svg>` }
];

function write() {
  root.innerHTML = `<div class="zo-write"><label class="g-label" for="t">What happened? One sentence is plenty.</label><textarea class="g-field" id="t" rows="2" maxlength="120" placeholder="e.g. I tripped in front of the whole class"></textarea>
    <div class="g-chips">${EXAMPLES.map(e => `<button type="button" class="g-chip">${G.esc(e)}</button>`).join("")}</div><p class="g-stat">It stays on this device. Nobody else will see it.</p>
    <div class="g-row"><button class="btn primary" id="go" type="button">Zoom in on it →</button></div></div>`;
  const t = root.querySelector("#t"); root.querySelectorAll(".g-chip").forEach(c => c.onclick = () => { t.value = c.textContent; });
  root.querySelector("#go").onclick = () => { if (!t.value.trim()) { t.focus(); return; } zoom(t.value.trim()); };
  refresh();
}
function zoom(moment) {
  let lv = 0;
  root.innerHTML = `<div class="g-stage zo-stage" id="st"><div class="zo-scene" id="scene"></div><button class="zo-you" id="you" type="button" aria-label="That's you. Tap to zoom out."><i></i><span>That's you!</span></button><div class="zo-bubble" id="bub"></div><div class="zo-cap" id="cap"></div><div class="zo-level" id="lvl"></div></div>
    <div class="g-row"><span class="g-stat">Find yourself and tap the pulsing dot to zoom out.</span></div>`;
  const st = root.querySelector("#st"), scene = root.querySelector("#scene"), you = root.querySelector("#you"), bub = root.querySelector("#bub"), cap = root.querySelector("#cap"), lvl = root.querySelector("#lvl");
  const show = (i, from) => {
    const L = LEVELS[i]; scene.innerHTML = L.svg(); you.style.left = L.you[0] + "%"; you.style.top = L.you[1] + "%"; cap.textContent = L.cap; lvl.textContent = `${i + 1} of ${LEVELS.length} · ${L.name}`;
    bub.style.display = i === 0 ? "" : "none"; bub.textContent = `“${moment}”`; you.style.display = ""; you.querySelector("span").textContent = i === 0 ? "Tap to zoom out" : "That's you!";
    scene.style.transformOrigin = `${L.you[0]}% ${L.you[1]}%`;
    if (!G.reduced() && from) scene.animate([{ transform: "scale(7)", opacity: 0 }, { transform: "scale(1)", opacity: 1 }], { duration: 1100, easing: "cubic-bezier(.3,.7,.3,1)" });
  };
  show(0, false);
  you.onclick = () => {
    if (lv >= LEVELS.length - 1) return end();
    Sfx.preset("hush"); setTimeout(() => Sfx.preset("softbell", 880 - lv * 120), 400); you.style.display = "none"; bub.style.display = "none";
    let moved = false; const done = () => { if (moved) return; moved = true; lv++; show(lv, true); };
    if (G.reduced()) return done();
    scene.style.transformOrigin = `${LEVELS[lv].you[0]}% ${LEVELS[lv].you[1]}%`; scene.animate([{ transform: "scale(1)", opacity: 1 }, { transform: "scale(.12)", opacity: 0 }], { duration: 800, easing: "ease-in" }).onfinish = done;
    setTimeout(done, 1000); // backup, in case the animation never reports finishing
  };
  const end = () => {
    you.style.display = "none"; Sfx.preset("twin", 660); const club = G.pick(OOPS_CLUB);
    root.querySelector(".g-row").innerHTML = `<div style="width:100%;text-align:center"><p><strong>That's how big your moment really is: a tiny blink.</strong></p><p class="g-stat">Everyone has an "oops". For example: ${G.esc(club)}</p>
      <label class="g-label" for="k">What would you tell a friend who had this happen to them?</label><input class="g-field" id="k" maxlength="140" placeholder="You'd probably be so kind…">
      <div class="g-row" style="justify-content:center"><button class="btn primary" id="keep" type="button">Say it to myself too</button></div></div>`;
    root.querySelector("#keep").onclick = () => { const k = root.querySelector("#k").value.trim() || "It was just a moment. You are still you."; S.oops.push({ moment, kind: k, at: Date.now() }); save(); refresh(); Sfx.preset("softbell", 784);
      root.querySelector(".g-row").innerHTML = `<div style="width:100%;text-align:center"><p><strong>“${G.esc(k)}”</strong></p><p class="g-stat">That's worth telling yourself, too.</p><div class="g-row" style="justify-content:center"><button class="btn primary" id="again" type="button">Zoom out another moment</button></div></div>`; root.querySelector("#again").onclick = write; };
  };
}
document.getElementById("mine").onclick = () => {
  const m = G.modal(`<h3>🔭 My oops collection</h3><p class="g-stat">${S.oops.length} moment${S.oops.length === 1 ? "" : "s"} zoomed out. Each one came with a kind word.</p><ul class="g-list">${[...S.oops].reverse().map(o => `<li><strong>${G.esc(o.moment)}</strong><small>${G.date(o.at)}</small>“${G.esc(o.kind)}”</li>`).join("") || "<li>None yet.</li>"}</ul><div class="g-row"><button class="btn" id="x" type="button">Close</button></div>`);
  m.box.querySelector("#x").onclick = m.close;
};
write();
