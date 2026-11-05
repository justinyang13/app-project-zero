// Sort the Bubbles: put everything on your mind into bubbles, then sort them: today (only 3!), later, or let it go.
const SB_KEY = "heartnote-sortbubbles";
const root = document.getElementById("game"), stat = document.getElementById("stat");
G.wireSound(document.getElementById("sound"));
const QUICK = ["Homework", "Chores", "Reply to a message", "Something I'm dreading", "Get some sleep", "Exercise", "A project", "Call someone"];
let S = G.load(SB_KEY, { plans: [], letGo: 0 });
const save = () => G.save(SB_KEY, S);
const COLORS = ["#ff9ab0", "#8fd0ff", "#ffe27a", "#a8e8b0", "#c9a8ff", "#ffc08a", "#8fe8e0", "#f0a8e0"];
function refresh() { stat.textContent = `Plans made: ${S.plans.length} · Things let go: ${S.letGo}`; }

function add() {
  const tasks = [];
  root.innerHTML = `<div class="sb-add"><label class="g-label" for="t">What's on your mind? Add things one at a time (up to 9).</label><div class="g-row"><input class="g-field sb-in" id="t" maxlength="40" placeholder="Something I need to do or worry about…"><button class="btn primary" id="plus" type="button">Add bubble</button></div>
    <div class="g-chips">${QUICK.map(q => `<button type="button" class="g-chip">${G.esc(q)}</button>`).join("")}</div><div class="sb-pool" id="pool"></div>
    <div class="g-row"><button class="btn primary" id="go" type="button" disabled>Sort my bubbles →</button></div></div>`;
  const t = root.querySelector("#t"), pool = root.querySelector("#pool"), go = root.querySelector("#go");
  const draw = () => { pool.innerHTML = tasks.map((x, i) => `<span class="sb-mini" style="background:${COLORS[i % 8]}">${G.esc(x)}</span>`).join(""); go.disabled = tasks.length < 3; go.textContent = tasks.length < 3 ? `Add at least ${3 - tasks.length} more` : "Sort my bubbles →"; };
  const put = v => { v = v.trim(); if (!v || tasks.length >= 9) return; tasks.push(v); t.value = ""; Sfx.preset("softbell", 500 + tasks.length * 40); draw(); t.focus(); };
  root.querySelector("#plus").onclick = () => put(t.value); t.addEventListener("keydown", e => { if (e.key === "Enter") put(t.value); });
  root.querySelectorAll(".g-chip").forEach(c => c.onclick = () => put(c.textContent)); go.onclick = () => sort(tasks); draw(); refresh();
}
function sort(tasks) {
  const bins = { today: [], later: [], go: [] }, LIMIT = 3; let left = tasks.length;
  root.innerHTML = `<div class="g-stage sb-stage" id="st"><div class="sb-field" id="field"></div><div class="sb-msg" id="msg">Tap a bubble to decide where it goes.</div>
    <div class="sb-bins"><div class="sb-bin today" id="bt"><strong>Today</strong><small>only ${LIMIT}!</small><div id="lt"></div></div><div class="sb-bin later" id="bl"><strong>Later</strong><small>it can wait</small><div id="ll"></div></div><div class="sb-bin go" id="bg"><strong>Let it go</strong><small>not mine to carry</small><div id="lg"></div></div></div></div>
    <div class="g-row"><span class="g-stat">Too many "today" things is what makes it feel heavy. Only ${LIMIT} fit in Today.</span></div>`;
  const field = root.querySelector("#field"), msg = root.querySelector("#msg"), say = t => { msg.textContent = t; };
  tasks.forEach((txt, i) => { const b = G.el("button", "sb-bubble", `<span>${G.esc(txt)}</span>`); b.type = "button"; b.style.background = `radial-gradient(circle at 30% 28%, #fff, ${COLORS[i % 8]} 62%)`; b.style.left = (6 + (i % 5) * 18 + Math.random() * 4) + "%"; b.style.top = (6 + Math.floor(i / 5) * 40 + Math.random() * 8) + "%"; b.style.animationDelay = (-Math.random() * 4) + "s"; b.onclick = () => choose(b, txt, i); field.appendChild(b); });
  const choose = (b, txt, i) => {
    Sfx.preset("softbell", 560);
    const m = G.modal(`<h3>🫧 “${G.esc(txt)}”</h3><p class="g-stat">Where does this bubble belong?</p><div class="sb-pick"><button class="btn primary" data-k="today" type="button">Today</button><button class="btn" data-k="later" type="button">Later</button><button class="btn" data-k="go" type="button">Let it go</button></div>`);
    m.box.querySelectorAll("button[data-k]").forEach(btn => btn.onclick = () => { const k = btn.dataset.k;
      if (k === "today" && bins.today.length >= LIMIT) { say("Today is full! What could wait until later?"); Sfx.preset("hum", 180); m.close(); return; }
      bins[k].push(txt); m.close(); b.classList.add(k === "go" ? "pop" : "sorted"); b.disabled = true; setTimeout(() => b.remove(), k === "go" ? 700 : 400);
      const li = root.querySelector(k === "today" ? "#lt" : k === "later" ? "#ll" : "#lg"); li.insertAdjacentHTML("beforeend", `<span class="sb-chip" style="background:${COLORS[i % 8]}">${G.esc(txt)}</span>`);
      if (k === "go") { S.letGo++; Sfx.preset("hush"); say("Let go. It floated away."); } else { Sfx.preset("softbell", k === "today" ? 660 : 440); say(k === "today" ? "That's one for today." : "It can wait. It will still be there."); }
      left--; if (left === 0) setTimeout(finish, 900); }); };
  const finish = () => {
    S.plans.push({ at: Date.now(), today: bins.today, later: bins.later, go: bins.go }); save(); refresh(); Sfx.preset("twin", 784);
    const first = bins.today[0];
    root.innerHTML = `<div class="sb-done"><h3>🫧 All sorted</h3><p>Look at that: <strong>${bins.today.length}</strong> thing${bins.today.length === 1 ? "" : "s"} for today, <strong>${bins.later.length}</strong> for later, and <strong>${bins.go.length}</strong> you let go. It feels lighter when it's sorted.</p>${first ? `<div class="sb-first">Start with just one thing:<strong>${G.esc(first)}</strong></div>` : "<p>Nothing is due today. Rest is a plan too.</p>"}<div class="g-row" style="justify-content:center"><button class="btn primary" id="again" type="button">Sort more bubbles</button></div></div>`;
    root.querySelector("#again").onclick = add;
  };
}
document.getElementById("mine").onclick = () => {
  const m = G.modal(`<h3>🫧 My plans</h3><p class="g-stat">${S.plans.length} plan${S.plans.length === 1 ? "" : "s"} · ${S.letGo} things let go</p>${[...S.plans].reverse().map(p => `<h4 style="margin:10px 0 2px">${G.date(p.at)}</h4><ul class="g-list"><li><strong>Today:</strong> ${p.today.map(G.esc).join(", ") || "nothing"}</li><li><strong>Later:</strong> ${p.later.map(G.esc).join(", ") || "nothing"}</li><li><strong>Let go:</strong> ${p.go.map(G.esc).join(", ") || "nothing"}</li></ul>`).join("") || "<p>No plans yet.</p>"}<div class="g-row"><button class="btn" id="x" type="button">Close</button></div>`);
  m.box.querySelector("#x").onclick = m.close;
};
add();
