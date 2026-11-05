// Firework Show: tap the sky to launch fireworks. Launch while the meter is in the green for the biggest bursts, then settle your excitement with slow breaths.
const FW_KEY = "heartnote-fireworks", SHOTS = 12;
const root = document.getElementById("game"), stat = document.getElementById("stat");
G.wireSound(document.getElementById("sound"));
const STYLES = [["Peony", "A classic round burst"], ["Ring", "A perfect glowing circle"], ["Heart", "A heart in the sky"], ["Willow", "Golden streamers that drift down"], ["Spiral", "A swirling spiral"]];
const COLORS = ["#ff5d73", "#ffd23f", "#4fb0ff", "#7be07b", "#b07bff", "#ff9a3d", "#5fe0d0", "#ff8ad0"];
let S = G.load(FW_KEY, { shows: 0, best: 0, fired: 0 });
const save = () => G.save(FW_KEY, S);
const unlocked = () => Math.min(STYLES.length, 1 + S.shows);
function refresh() { stat.textContent = `Shows lit: ${S.shows} · Fireworks fired: ${S.fired} · Best score: ${S.best} · Styles unlocked: ${unlocked()} of ${STYLES.length}`; }

function show() {
  root.innerHTML = `<div class="g-stage fw-stage" id="st"><canvas id="cv"></canvas><div class="fw-hud"><span>Left <b id="left">${SHOTS}</b></span><span>Score <b id="score">0</b></span><span id="combo"></span></div><div class="fw-say" id="say"></div></div>
    <div class="fw-meter" id="meterwrap" aria-hidden="true"><div class="fw-zone"></div><i id="needle"></i></div>
    <div class="g-row"><span class="g-stat">Tap anywhere in the sky to launch a firework. Tap while the needle is in the <strong style="color:#2fa05a">green</strong> for the biggest, brightest burst.</span><span class="g-grow"></span><button class="btn primary" id="launch" type="button">Launch!</button></div>`;
  const st = root.querySelector("#st"), cv = root.querySelector("#cv"), ctx = cv.getContext("2d"), needle = root.querySelector("#needle"), say = root.querySelector("#say"), leftEl = root.querySelector("#left"), scoreEl = root.querySelector("#score"), comboEl = root.querySelector("#combo");
  const W = cv.width = st.clientWidth || 600, H = cv.height = st.clientHeight || 400;
  const parts = [], rockets = []; let left = SHOTS, score = 0, perfectRun = 0, over = false, last = performance.now(), t0 = performance.now(), mt = 0, best = 0;
  const stars = Array.from({ length: 70 }, () => [Math.random() * W, Math.random() * H * 0.7, Math.random() * 1.4 + 0.3]);
  const skyline = Array.from({ length: 18 }, (_, i) => [i * (W / 17) - 10, 24 + Math.random() * 64, W / 17 + 4]);
  const flash = t => { say.textContent = t; say.classList.remove("show"); void say.offsetWidth; say.classList.add("show"); };
  const meter = () => (Math.sin(mt * (Math.PI * 2) / 1.7) + 1) / 2;
  const burst = (x, y, power) => {
    const style = Math.floor(Math.random() * unlocked()), col = G.pick(COLORS), col2 = G.pick(COLORS), n = Math.round(46 + power * 40), sp = 1.6 + power * 2.1;
    const add = (vx, vy, c, life = 1, g = 0.035, tr = 0) => parts.push({ x, y, vx, vy, c, life, g, tr, s: 1.6 + power });
    for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2;
      if (style === 0) add(Math.cos(a) * sp * (0.4 + Math.random() * 0.6), Math.sin(a) * sp * (0.4 + Math.random() * 0.6), i % 3 ? col : col2);
      else if (style === 1) add(Math.cos(a) * sp, Math.sin(a) * sp, col);
      else if (style === 2) { const k = sp * 0.17; add(16 * Math.sin(a) ** 3 * k, -(13 * Math.cos(a) - 5 * Math.cos(2 * a) - 2 * Math.cos(3 * a) - Math.cos(4 * a)) * k, "#ff7aa8"); }
      else if (style === 3) add(Math.cos(a) * sp * (0.5 + Math.random() * 0.6), Math.sin(a) * sp * (0.5 + Math.random() * 0.6) - 0.4, "#ffd98a", 1.6, 0.02, 1);
      else add(Math.cos(a * 3) * sp * (i / n + 0.2), Math.sin(a * 3) * sp * (i / n + 0.2), i % 2 ? col : col2); }
    Sfx.preset("softbell", 400 + (1 - y / H) * 700); if (power > 0.8) setTimeout(() => Sfx.preset("softbell", 900 + (1 - y / H) * 500), 120);
  };
  const launch = (tx, ty) => {
    if (over || left <= 0) return; const m = meter(), acc = 1 - Math.min(1, Math.abs(m - 0.5) / 0.5), q = acc > 0.82 ? "perfect" : acc > 0.5 ? "good" : "ok";
    left--; S.fired++; leftEl.textContent = left; const pts = q === "perfect" ? 100 : q === "good" ? 60 : 30; score += pts + (q === "perfect" ? perfectRun * 20 : 0); scoreEl.textContent = score;
    perfectRun = q === "perfect" ? perfectRun + 1 : 0; comboEl.textContent = perfectRun > 1 ? `Perfect x${perfectRun}` : ""; Sfx.preset("hush");
    flash(q === "perfect" ? "Perfect! ✨" : q === "good" ? "Nice!" : "Pretty!");
    rockets.push({ x: tx, y: H - 30, ty, t: 0, power: 0.35 + acc * 0.65, q });
    if (perfectRun === 3) { flash("Finale! ✨✨✨"); for (let i = 0; i < 3; i++) setTimeout(() => rockets.push({ x: W * (0.25 + i * 0.25), y: H - 30, ty: H * (0.2 + Math.random() * 0.15), t: 0, power: 1, q: "perfect" }), 250 + i * 250); score += 150; scoreEl.textContent = score; }
    if (left === 0) setTimeout(() => finish(), 3200);
  };
  const loop = now => {
    if (!st.isConnected) return; const dt = Math.min(0.05, (now - last) / 1000); last = now; mt = (now - t0) / 1000; needle.style.left = (meter() * 100) + "%";
    ctx.globalCompositeOperation = "source-over"; const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, "#04051a"); g.addColorStop(1, "#1a1f4a"); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "#fff"; stars.forEach(([x, y, r]) => { ctx.globalAlpha = 0.5 + Math.sin(now / 700 + x) * 0.3; ctx.beginPath(); ctx.arc(x, y, r, 0, 6.3); ctx.fill(); }); ctx.globalAlpha = 1;
    ctx.fillStyle = "#07081c"; skyline.forEach(([x, h, w]) => ctx.fillRect(x, H - h, w, h)); ctx.fillStyle = "#ffd86a"; skyline.forEach(([x, h], i) => { if (i % 2) ctx.fillRect(x + 6, H - h + 10, 3, 4); });
    ctx.globalCompositeOperation = "lighter";
    for (let i = rockets.length - 1; i >= 0; i--) { const r = rockets[i]; r.t += dt / 0.75; const e = 1 - (1 - Math.min(1, r.t)) ** 2, y = r.y + (r.ty - r.y) * e; ctx.fillStyle = "#ffe9a8"; ctx.beginPath(); ctx.arc(r.x, y, 2.6, 0, 6.3); ctx.fill(); ctx.fillStyle = "rgba(255,200,120,.35)"; ctx.fillRect(r.x - 1, y, 2, 18); if (r.t >= 1) { burst(r.x, r.ty, r.power); rockets.splice(i, 1); } }
    for (let i = parts.length - 1; i >= 0; i--) { const p = parts[i]; p.x += p.vx; p.y += p.vy; p.vy += p.g; p.vx *= 0.985; p.life -= dt * (p.tr ? 0.45 : 0.7); if (p.life <= 0) { parts.splice(i, 1); continue; } ctx.globalAlpha = Math.max(0, Math.min(1, p.life)); ctx.fillStyle = p.c; ctx.beginPath(); ctx.arc(p.x, p.y, p.s * (p.tr ? 0.8 : Math.max(0.4, p.life)), 0, 6.3); ctx.fill(); }
    ctx.globalAlpha = 1; requestAnimationFrame(loop);
  };
  cv.addEventListener("pointerdown", e => { const r = cv.getBoundingClientRect(); launch(Math.max(20, Math.min(W - 20, (e.clientX - r.left) * W / r.width)), Math.max(40, Math.min(H * 0.75, (e.clientY - r.top) * H / r.height))); });
  root.querySelector("#launch").onclick = () => launch(W * (0.15 + Math.random() * 0.7), H * (0.15 + Math.random() * 0.4));
  addEventListener("keydown", function k(e) { if (!st.isConnected) return removeEventListener("keydown", k); if (e.code === "Space" && !e.repeat) { e.preventDefault(); root.querySelector("#launch").click(); } });
  requestAnimationFrame(loop);
  const finish = () => {
    over = true; S.shows++; best = score; if (score > S.best) S.best = score; save(); refresh();
    const stars3 = score >= 1100 ? 3 : score >= 700 ? 2 : 1, newStyle = S.shows < STYLES.length ? STYLES[S.shows] : null;
    root.innerHTML = `<div class="fw-calm" style="text-align:center;padding:18px"><p class="g-label">Wow! Let your excitement settle. Breathe with the circle three times.</p><div class="wb-ring go fw-ring" id="ring" style="margin:12px auto">In</div><p class="g-stat" id="bt">Breath 1 of 3</p><div class="g-row" style="justify-content:center"><button class="btn" id="skip" type="button">Skip</button></div></div>`;
    let n = 0, stop = false; const ring = root.querySelector("#ring"), bt = root.querySelector("#bt");
    const breath = () => { if (stop || !ring.isConnected) return; if (n >= 3) return results(); n++; bt.textContent = `Breath ${n} of 3`; ring.textContent = "In…"; ring.style.animation = "none"; void ring.offsetWidth; ring.style.animation = "fw-breathe 10s ease-in-out forwards"; setTimeout(() => { if (ring.isConnected) ring.textContent = "Out…"; }, 4000); setTimeout(breath, 10000); };
    breath(); root.querySelector("#skip").onclick = () => { stop = true; results(); };
    const results = () => { Sfx.preset("twin", 784); root.innerHTML = `<div style="text-align:center;padding:16px"><p style="font-size:1.4rem;margin:4px 0"><strong>${stars3 === 3 ? "A spectacular show!" : stars3 === 2 ? "A wonderful show!" : "A lovely show!"}</strong></p><div class="wb-stars">${[1, 2, 3].map(i => `<span class="${i <= stars3 ? "on" : ""}" style="animation-delay:${i * .25}s">★</span>`).join("")}</div><p>Score: <strong>${best}</strong> · Best: ${S.best}</p>${newStyle ? `<p>🎆 New firework unlocked: <strong>${newStyle[0]}</strong> (${newStyle[1]})</p>` : `<p class="g-stat">You've unlocked every firework style.</p>`}<p class="g-stat">Excitement is wonderful energy. You gave it somewhere to go and then let it settle.</p><div class="g-row" style="justify-content:center"><button class="btn primary" id="again" type="button">Another show</button></div></div>`; root.querySelector("#again").onclick = show; };
  };
  refresh();
}
document.getElementById("mine").onclick = () => {
  const n = unlocked(); const m = G.modal(`<h3>🎆 My fireworks</h3><p class="g-stat">${S.shows} show${S.shows === 1 ? "" : "s"} lit · ${S.fired} fireworks fired · best score ${S.best}</p><ul class="g-list">${STYLES.map(([name, d], i) => `<li style="${i < n ? "" : "opacity:.5"}"><strong>${i < n ? name : "???"}</strong><small>${i < n ? d : "Light another show to unlock it."}</small></li>`).join("")}</ul><div class="g-row"><button class="btn" id="x" type="button">Close</button></div>`);
  m.box.querySelector("#x").onclick = m.close;
};
show();
