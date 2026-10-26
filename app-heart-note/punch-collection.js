// The punch box collection: every punch box you finished for one feeling, one at a time.
const COLS = 6, ROWS = 4, CELL = 100;
const SVGNS = "http://www.w3.org/2000/svg";
const FEELING_WORDS = { sad: "sad", anxious: "anxious", angry: "angry", lonely: "lonely", stressed: "stressed", overwhelmed: "overwhelmed", tired: "tired or numb", guilty: "guilty or ashamed", happy: "happy", grateful: "hopeful and grateful" };
const feeling = location.hash.slice(1);
const word = FEELING_WORDS[feeling];
const stage = document.getElementById("stage"), caption = document.getElementById("caption"), dots = document.getElementById("dots");
const prev = document.getElementById("prev"), next = document.getElementById("next");
let boxes = [], at = 0, uid = 0;

const el = (name, attrs, parent) => { const e = document.createElementNS(SVGNS, name); for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v); if (parent) parent.appendChild(e); return e; };
const tornShape = (cx, cy) => {
  const n = 18, pts = [];
  for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2 + (Math.random() - 0.5) * 0.25, r = (i % 2 ? 22 : 33) + Math.random() * 7; pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]); }
  return "M" + pts.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join("L") + "Z";
};

// the finished box's paper, with a torn hole over every compartment
function finishedSheet(d) {
  const id = ++uid, W = COLS * CELL, H = ROWS * CELL;
  const sheet = document.createElement("div");
  sheet.className = "sheet static";
  const svg = el("svg", { viewBox: `0 0 ${W} ${H}`, preserveAspectRatio: "none" }, sheet);
  const defs = el("defs", {}, svg);
  const f = el("filter", { id: `cr${id}`, x: "0", y: "0", width: "100%", height: "100%" }, defs);
  el("feTurbulence", { type: "fractalNoise", baseFrequency: "0.018 0.03", numOctaves: "4", seed: String(id * 7), result: "n" }, f);
  const l = el("feDiffuseLighting", { in: "n", "lighting-color": "#ffffff", surfaceScale: "5", result: "lit" }, f);
  el("feDistantLight", { azimuth: "225", elevation: "58" }, l);
  el("feComposite", { in: "lit", in2: "SourceGraphic", operator: "in", result: "litIn" }, f);
  el("feBlend", { in: "SourceGraphic", in2: "litIn", mode: "multiply" }, f);
  const g = el("linearGradient", { id: `ti${id}`, x1: "0", y1: "0", x2: "1", y2: "1" }, defs);
  el("stop", { offset: "0", "stop-color": d.paper[0] }, g); el("stop", { offset: ".5", "stop-color": d.paper[1] }, g); el("stop", { offset: "1", "stop-color": d.paper[2] }, g);
  const holes = [];
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) holes.push(tornShape(c * CELL + 50 + (Math.random() - 0.5) * 16, r * CELL + 50 + (Math.random() - 0.5) * 16));
  const dAttr = `M0 0H${W}V${H}H0Z` + holes.join("");
  const grp = el("g", { filter: `url(#cr${id})` }, svg);
  el("path", { d: dAttr, fill: `url(#ti${id})`, "fill-rule": "evenodd" }, grp);
  if (d.pattern !== "none") {
    const pat = el("pattern", { id: `pa${id}`, width: d.pattern === "stripes" ? 24 : 30, height: d.pattern === "stripes" ? 24 : 30, patternUnits: "userSpaceOnUse", patternTransform: d.pattern === "stripes" ? "rotate(45)" : "" }, defs);
    if (d.pattern === "dots") { el("circle", { cx: 8, cy: 8, r: 4, fill: "#fff", opacity: ".55" }, pat); el("circle", { cx: 23, cy: 23, r: 4, fill: "#fff", opacity: ".55" }, pat); }
    if (d.pattern === "stripes") el("rect", { x: 0, y: 0, width: 10, height: 24, fill: "#fff", opacity: ".4" }, pat);
    if (d.pattern === "stars") el("path", { d: "M15 6l2.200 5.500 5.800.5-4.400 3.800 1.400 5.700L15 18.500l-5 3 1.400-5.700L7 12l5.800-.5z", fill: "#fff", opacity: ".6" }, pat);
    el("path", { d: dAttr, fill: `url(#pa${id})`, "fill-rule": "evenodd" }, grp);
  }
  el("path", { d: holes.join(""), fill: "none", stroke: d.rim, "stroke-width": "2.2", "stroke-linejoin": "round", opacity: ".9" }, svg);
  return sheet;
}

function renderBox(rec) {
  const d = DESIGNS.find(x => x.name === rec.design) || DESIGNS[0];
  const scene = document.createElement("div");
  scene.className = "scene";
  const box = document.createElement("div");
  box.className = "punchbox";
  box.style.setProperty("--cols", COLS); box.style.setProperty("--rows", ROWS);
  d.box.forEach((c, i) => box.style.setProperty(`--b${i + 1}`, c));
  rec.gifts.forEach(() => { const cell = document.createElement("div"); cell.className = "cell emptied"; box.appendChild(cell); });
  box.appendChild(finishedSheet(d));
  const walls = document.createElement("div"); walls.className = "walls";
  for (let i = 0; i < COLS * ROWS; i++) walls.appendChild(document.createElement("div"));
  box.appendChild(walls);
  const layer = document.createElement("div"); layer.className = "pop-layer";
  rec.gifts.forEach((g, i) => {
    const pop = document.createElement("div");
    pop.className = "popper";
    pop.style.left = `${(((i % COLS) + 0.5) / COLS) * 100}%`;
    pop.style.top = `${((Math.floor(i / COLS) + 0.5) / ROWS) * 100}%`;
    const span = document.createElement("span");
    span.className = "popper-gift";
    span.style.animationDelay = `${i * 45}ms, ${900 + i * 45}ms`;
    span.innerHTML = giftArt(g);
    pop.appendChild(span);
    layer.appendChild(pop);
  });
  box.appendChild(layer);
  scene.appendChild(box);
  new ResizeObserver(() => box.style.setProperty("--cell", `${(box.clientWidth - 20) / COLS}px`)).observe(box);
  return scene;
}

function show(i, dir = 0) {
  at = Math.max(0, Math.min(boxes.length - 1, i));
  const rec = boxes[at], prize = PRIZES.find(p => p.id === rec.prize);
  const old = stage.firstElementChild, scene = renderBox(rec);
  stage.appendChild(scene);
  if (old) {
    old.style.position = "absolute"; old.style.inset = "0 0 auto 0";
    old.animate([{ transform: "none", opacity: 1 }, { transform: `translateX(${-dir * 110}%) rotate(${-dir * 5}deg)`, opacity: 0 }], { duration: 600, easing: "ease-in" }).onfinish = () => old.remove();
    scene.animate([{ transform: `translateX(${dir * 110}%) rotate(${dir * 5}deg)`, opacity: 0 }, { transform: "none", opacity: 1 }], { duration: 650, easing: "cubic-bezier(.2,.9,.3,1.1)" });
  }
  const date = new Date(rec.at).toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" });
  caption.innerHTML = `<strong>Punch box ${at + 1} of ${boxes.length}</strong> · ${rec.design} · finished ${date}` +
    (prize ? `<span class="coll-prize"><span class="coll-prize-art">${prize.art}</span>Prize won: ${prize.name}</span>` : "");
  prev.disabled = at === 0; next.disabled = at === boxes.length - 1;
  dots.querySelectorAll("button").forEach((b, k) => b.setAttribute("aria-selected", String(k === at)));
}

function init() {
  const play = document.getElementById("play"), back = document.getElementById("back");
  if (word) { play.href = `punch-box.html#${feeling}`; document.getElementById("who").textContent = `Finished punch boxes for feeling ${word}.`; }
  else { play.hidden = true; document.getElementById("who").textContent = "Pick a feeling on the main page to see its punch box collection."; stage.innerHTML = ""; prev.hidden = next.hidden = true; return; }
  boxes = BoxStore.forFeeling(feeling);
  if (!boxes.length) {
    prev.hidden = next.hidden = true;
    stage.innerHTML = `<div class="coll-empty"><p>No finished punch boxes for feeling ${word} yet.</p><p class="small">Open every compartment in a punch box to finish it. It will appear here.</p></div>`;
    return;
  }
  boxes.forEach((_, k) => { const b = document.createElement("button"); b.setAttribute("role", "tab"); b.setAttribute("aria-label", `Punch box ${k + 1}`); b.onclick = () => show(k, k > at ? 1 : -1); dots.appendChild(b); });
  prev.onclick = () => show(at - 1, -1);
  next.onclick = () => show(at + 1, 1);
  addEventListener("keydown", e => { if (e.key === "ArrowLeft" && !prev.disabled) show(at - 1, -1); if (e.key === "ArrowRight" && !next.disabled) show(at + 1, 1); });
  show(0, 0);
}
init();
