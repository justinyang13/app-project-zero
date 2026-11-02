const COLS = 6, ROWS = 4, COUNT = COLS * ROWS; // bigger box, more compartments
const GIFTS = {
  sad: [["🧸", "A teddy bear hug"], ["☕", "A warm cup of tea"], ["💌", "A note: this feeling will pass"], ["🌧️", "Permission to cry — it helps"], ["🫂", "A hug from someone who cares"], ["🕯️", "A candle for a quiet moment"], "Write down three things that are still okay today.", "Wrap up in a blanket and put on something comforting."],
  anxious: [["🌬️", "Three slow, deep breaths"], ["🍃", "Name 5 things you can see"], ["🪨", "A grounding stone — feel your feet on the floor"], ["🫖", "Chamomile tea"], ["📝", "Write the worry down, then set it aside"], ["🎧", "A calming playlist"], "Put a hand on your chest and feel it rise and fall.", "Walk around the block and let your eyes rest on faraway things."],
  angry: [["🥊", "Punch a pillow, not a person"], ["🏃", "A fast walk to burn it off"], ["🧊", "Cold water on your hands"], ["🌬️", "A long, slow exhale"], ["🎵", "Loud music, alone"], ["✍️", "Write the angry letter — don't send it"], "Splash cold water on your face or hands.", "Write the angry thoughts on paper — then tear it up."],
  lonely: [["💬", "Text someone: \"Thinking of you\""], ["🐶", "A puppy cuddle"], ["📞", "A call to an old friend"], ["☕", "Coffee in a café full of people"], ["🤝", "A group that shares your interest"], ["🫂", "A virtual hug"], "Look for a small kindness you can do for someone else.", "Say hello to one person today, even a neighbor."],
  stressed: [["🛁", "A long, warm bath"], ["📋", "Just one small next step"], ["💧", "A glass of water"], ["🚶", "A 10-minute walk, no phone"], ["😴", "An early night"], ["🙋", "Ask for help with one thing"], "Do a 5-minute tidy of one tiny corner.", "Stretch your shoulders and unclench your jaw."],
  overwhelmed: [["⏸️", "Pause. Everything else can wait"], ["1️⃣", "Pick just one thing"], ["🦶", "Feel your feet on the ground"], ["🌊", "Five slow breaths"], ["🗣️", "Tell someone: \"I'm having a hard time\""], ["🧘", "Two quiet minutes"], "Write a short list, then circle just one item.", "Step outside for one minute of fresh air."],
  tired: [["🛌", "Rest without guilt"], ["💤", "A nap"], ["🍵", "Something warm to drink"], ["🌅", "A little morning light"], ["🛏️", "Make your bed — a tiny win"], ["🍎", "A healthy snack"], "Drink a glass of water and open a window.", "Put your phone away 30 minutes before bed."],
  guilty: [["🕊️", "Forgive yourself"], ["💬", "Talk to someone you trust"], ["🩹", "Repair what you can"], ["🌱", "A fresh start"], ["📖", "You are more than your worst moment"], ["🫶", "Speak to yourself like a friend"], "Mistakes are how we learn — you can start fresh now.", "Write down what you learned, then let the rest go."],
  happy: [["🎉", "Celebrate this moment!"], ["📸", "Capture the memory"], ["📞", "Share it with someone"], ["🌻", "A sunflower for your joy"], ["🍰", "A treat to savor"], ["💃", "A little happy dance"], "Take a photo or note so you can remember today.", "Let yourself smile — you don't have to earn it."],
  grateful: [["🙏", "Thank someone today"], ["📓", "Write down 3 good things"], ["⭐", "A gold star for hope"], ["🌈", "A rainbow ahead"], ["💐", "Give someone flowers"], ["🌅", "A new beginning"], "Notice one small good thing in your room right now.", "Thank your past self for getting you here.", "Send a thank-you note to someone who helped you."]
};
const DEFAULT_OLD = [["🎁", "A little surprise"], ["⭐", "A gold star: you're doing great"], ["💌", "A note: you matter"], ["🍪", "A warm cookie"], ["🌻", "A sunflower"], ["🎈", "A balloon"]];
const feeling = location.hash.slice(1);
const pool = GIFTS[feeling] || DEFAULT_OLD;
const captions = pool.map(g => g[1]);
const tips = TIPS[feeling] || DEFAULT_TIPS;
const feelWord = FEELING_WORDS[feeling] || "";
const note = document.getElementById("feelnote");
if (note) note.textContent = feelWord ? `You're feeling ${feelWord}. Every scroll in this box was written for that feeling.` : "";
const msg = document.getElementById("msg");
const quip = document.getElementById("quip");
const box = document.getElementById("box");
const SVG = "http://www.w3.org/2000/svg";

const CELL = 100; // sheet coordinates: one cell = 100 x 100
const opened = new Set();
let holes, sheetPath, rimPath, patPath;

// ---- remember exactly where you left off (per feeling), so coming back looks the same ----
const STATE_KEY = "heartnote-state-v1", stateId = feeling || "general";
let lastIdx = null, pendingPrize = null;
const readStates = () => { try { return JSON.parse(localStorage.getItem(STATE_KEY)) || {}; } catch { return {}; } };
function saveState() {
  try {
    const all = readStates();
    all[stateId] = { v: 1, design: design.name, gifts, holes, opened: [...opened], last: lastIdx, pending: pendingPrize };
    localStorage.setItem(STATE_KEY, JSON.stringify(all));
  } catch {}
}
let design = DESIGNS[0];

// Jagged, irregular hole around (cx, cy) — like a fist through tissue paper.
function tornShape(cx, cy) {
  const n = 18, pts = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + (Math.random() - 0.5) * 0.25;
    const r = (i % 2 ? 22 : 33) + Math.random() * 7;
    pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
  }
  return "M" + pts.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join("L") + "Z";
}

function svgEl(name, attrs, parent) {
  const el = document.createElementNS(SVG, name);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  if (parent) parent.appendChild(el);
  return el;
}

function buildSheet() {
  const sheet = document.createElement("button");
  sheet.className = "sheet";
  sheet.setAttribute("aria-label", "Paper sheet — click to punch through a compartment");
  const W = COLS * CELL, H = ROWS * CELL;
  const svg = svgEl("svg", { viewBox: `0 0 ${W} ${H}`, preserveAspectRatio: "none" }, sheet);
  const defs = svgEl("defs", {}, svg);
  // crinkled tissue: noise -> lighting gives creases and soft wrinkles
  const f = svgEl("filter", { id: "crinkle", x: "0", y: "0", width: "100%", height: "100%" }, defs);
  svgEl("feTurbulence", { type: "fractalNoise", baseFrequency: "0.018 0.03", numOctaves: "4", seed: String(Math.floor(Math.random() * 99)), result: "n" }, f);
  const l = svgEl("feDiffuseLighting", { in: "n", "lighting-color": "#ffffff", surfaceScale: "5", result: "lit" }, f);
  svgEl("feDistantLight", { azimuth: "225", elevation: "58" }, l);
  svgEl("feComposite", { in: "lit", in2: "SourceGraphic", operator: "in", result: "litIn" }, f);
  svgEl("feBlend", { in: "SourceGraphic", in2: "litIn", mode: "multiply" }, f);
  const grad = svgEl("linearGradient", { id: "tint", x1: "0", y1: "0", x2: "1", y2: "1" }, defs);
  svgEl("stop", { offset: "0", "stop-color": design.paper[0] }, grad);
  svgEl("stop", { offset: ".5", "stop-color": design.paper[1] }, grad);
  svgEl("stop", { offset: "1", "stop-color": design.paper[2] }, grad);
  // printed pattern on the paper (a different one for each box design)
  if (design.pattern !== "none") {
    const pat = svgEl("pattern", { id: "pat", width: design.pattern === "stripes" ? 24 : 30, height: design.pattern === "stripes" ? 24 : 30, patternUnits: "userSpaceOnUse", patternTransform: design.pattern === "stripes" ? "rotate(45)" : "" }, defs);
    if (design.pattern === "dots") { svgEl("circle", { cx: 8, cy: 8, r: 4, fill: "#fff", opacity: ".55" }, pat); svgEl("circle", { cx: 23, cy: 23, r: 4, fill: "#fff", opacity: ".55" }, pat); }
    if (design.pattern === "stripes") svgEl("rect", { x: 0, y: 0, width: 10, height: 24, fill: "#fff", opacity: ".4" }, pat);
    if (design.pattern === "stars") svgEl("path", { d: "M15 6l2.200 5.500 5.800.5-4.400 3.800 1.400 5.700L15 18.500l-5 3 1.400-5.700L7 12l5.800-.5z", fill: "#fff", opacity: ".6" }, pat);
  }
  const g = svgEl("g", { filter: "url(#crinkle)" }, svg);
  sheetPath = svgEl("path", { fill: "url(#tint)", "fill-rule": "evenodd" }, g);
  patPath = design.pattern !== "none" ? svgEl("path", { fill: "url(#pat)", "fill-rule": "evenodd" }, g) : null;
  // pale fibrous rim along the torn edges
  rimPath = svgEl("path", { fill: "none", stroke: design.rim, "stroke-width": "2.2", "stroke-linejoin": "round", opacity: ".9" }, svg);
  holes = [];
  drawSheet();
  sheet.addEventListener("click", e => {
    const r = sheet.getBoundingClientRect();
    const fx = (e.clientX - r.left) / r.width, fy = (e.clientY - r.top) / r.height;
    const col = Math.min(COLS - 1, Math.max(0, Math.floor(fx * COLS)));
    const row = Math.min(ROWS - 1, Math.max(0, Math.floor(fy * ROWS)));
    const idx = row * COLS + col;
    if (opened.has(idx)) return;
    opened.add(idx);
    const lo = 36, hi = CELL - 36; // keep the tear inside its compartment
    const cx = col * CELL + Math.min(hi, Math.max(lo, (fx * COLS - col) * CELL));
    const cy = row * CELL + Math.min(hi, Math.max(lo, (fy * ROWS - row) * CELL));
    holes.push(tornShape(cx, cy));
    drawSheet();
    const gift = gifts[idx];
    quip.textContent = "";
    Sfx.play("tear");
    setTimeout(() => Sfx.play("arrive"), 180);
    showMessage(gift);
    popOut(idx, col, row, gift);
    lastIdx = idx;
    saveState();
    Persist.ask();
    if (opened.size === COUNT) setTimeout(finishBox, 3200);
  });
  return sheet;
}

function drawSheet() {
  const W = COLS * CELL, H = ROWS * CELL;
  sheetPath.setAttribute("d", `M0 0H${W}V${H}H0Z` + holes.join(""));
  rimPath.setAttribute("d", holes.join(""));
  if (patPath) patPath.setAttribute("d", `M0 0H${W}V${H}H0Z` + holes.join(""));
}

const playCtx = { msg, quip, feelWord };
const showMessage = gift => showNote(msg, gift, feelWord);

// The gift springs up out of its compartment, through the torn paper, and hovers above the box.
function popOut(idx, col, row, gift, quiet = false) {
  const kind = gift.kind;
  box.children[idx].classList.add("emptied");
  const pop = document.createElement("div");
  pop.className = "popper";
  pop.style.left = `${((col + 0.5) / COLS) * 100}%`;
  pop.style.top = `${((row + 0.5) / ROWS) * 100}%`;
  pop.innerHTML = `<span class="popper-gift">${giftArt(gift)}</span>`;
  const art = pop.firstChild;
  art.title = "Click me!";
  art.addEventListener("click", e => { e.stopPropagation(); react(pop, gift, playCtx); });
  if (!quiet) burst(pop, "star", 10);
  else art.style.animationDelay = `${(idx % 8) * 60}ms, ${900 + (idx % 8) * 60}ms`;
  popLayer.appendChild(pop);
}

let gifts = [], popLayer;
function build(saved = null) {
  box.innerHTML = "";
  box.style.setProperty("--cols", COLS);
  box.style.setProperty("--rows", ROWS);
  design.box.forEach((c, i) => box.style.setProperty(`--b${i + 1}`, c));
  msg.textContent = "";
  msg.className = "gift-msg";
  quip.textContent = "";
  opened.clear();
  lastIdx = null;
  pendingPrize = null;
  // about 5 scrolls carrying a tip for this feeling, the rest are small keepsakes with a kind note
  const SCROLLS = RIBBONS.length, tipOrder = shuffle(tips);
  // this feeling's own images take the place of 6 generic ones, so the box always holds 18 different keepsakes
  // each feeling has 10 images of its own; every box draws 8 of them, so boxes differ
  const sets = shuffle(THEME_SETS[feeling] || []).slice(0, 8);
  const taken = sets.map(id => THEMED[id].replaces);
  const kindOrder = shuffle([...OBJECT_KINDS.filter(k => !taken.includes(k)), ...sets]);
  let gi = 0;
  gifts = saved ? saved.gifts : shuffle([
    ...Array.from({ length: SCROLLS }, (_, i) => ({ kind: "scroll", variant: i, text: tipOrder[i % tipOrder.length] })),
    ...kindOrder.map(kind => ({ kind, text: THEMED[kind] ? THEMED[kind].note : noteFor(kind, gi++) }))
  ]);
  gifts.forEach(g => {
    const cell = document.createElement("div");
    cell.className = "cell";
    cell.innerHTML = `<span class="gift">${giftArt(g)}</span>`;
    box.appendChild(cell);
  });
  box.appendChild(buildSheet());
  // raised cardboard dividers sit on top of the paper, which lies lower inside the compartments
  const walls = document.createElement("div");
  walls.className = "walls";
  for (let i = 0; i < COUNT; i++) walls.appendChild(document.createElement("div"));
  box.appendChild(walls);
  popLayer = document.createElement("div");
  popLayer.className = "pop-layer";
  box.appendChild(popLayer);
  if (saved) {
    // put the box back the way it was: torn paper, gifts hovering, and the last note you read
    holes = saved.holes.slice();
    saved.opened.forEach(idx => { opened.add(idx); popOut(idx, idx % COLS, Math.floor(idx / COLS), gifts[idx], true); });
    drawSheet();
    lastIdx = saved.last;
    pendingPrize = saved.pending || null;
    if (lastIdx != null && gifts[lastIdx]) showMessage(gifts[lastIdx]);
  }
  saveState();
}
const sizeCell = () => box.style.setProperty("--cell", `${(box.clientWidth - 20) / COLS}px`);
new ResizeObserver(sizeCell).observe(box);
const soundBtn = document.getElementById("sound");
const showSound = () => { soundBtn.textContent = Sfx.on ? "🔊 Sound on" : "🔇 Sound off"; soundBtn.setAttribute("aria-pressed", String(Sfx.on)); };
soundBtn.onclick = () => { Sfx.toggle(); showSound(); };
showSound();
document.getElementById("reset").onclick = () => build();



// ---- finishing a box: it slides aside, you win a prize, and a differently dressed box slides in ----
const scene = document.querySelector(".scene");
const prizeBtn = document.getElementById("prizebtn"), prizeCount = document.getElementById("prizecount");
const prizePanel = document.getElementById("prizepanel");
let finishing = false;

const refreshCount = () => { prizeCount.textContent = PrizeStore.all().length; };
const prizeById = id => PRIZES.find(p => p.id === id);

function finishBox() {
  if (finishing) return;
  finishing = true;
  Sfx.play("slide");
  const out = scene.animate([{ transform: "none", opacity: 1 }, { transform: "translateX(-115%) rotate(-6deg)", opacity: 0 }], { duration: 900, easing: "ease-in", fill: "forwards" });
  setTimeout(() => showPrize(out), 750);
}

function showPrize(out, resumeId = null) {
  let prize = resumeId && PRIZES.find(p => p.id === resumeId);
  if (!prize) {
    const have = new Set(PrizeStore.all().map(p => p.id));
    const fresh = PRIZES.filter(p => !have.has(p.id));
    prize = (fresh.length ? fresh : PRIZES)[Math.floor(Math.random() * (fresh.length || PRIZES.length))];
    PrizeStore.add({ id: prize.id, at: Date.now(), design: design.name, feeling: feelWord });
    // keep the finished box itself, filed under the feeling it was opened for
    BoxStore.add({ feeling: feeling || "general", at: Date.now(), design: design.name, prize: prize.id, gifts: gifts.map(g => ({ kind: g.kind, variant: g.variant, text: g.text })) });
    pendingPrize = prize.id; // if you close the page now, the prize popup comes back next time
    saveState();
  }
  const ov = document.createElement("div");
  ov.className = "prize-overlay";
  ov.innerHTML = `<div class="prize-card" role="dialog" aria-label="You earned a prize">
    <p class="prize-kicker">Box complete!</p>
    <div class="prize-art">${prize.art}</div>
    <h3>${prize.name}</h3>
    <p>${prize.blurb}</p>
    <button class="btn" id="collect">Add to my prize collection</button></div>`;
  document.body.appendChild(ov);
  const card = ov.querySelector(".prize-card"), art = ov.querySelector(".prize-art");
  card.animate([{ transform: "scale(.6) translateY(30px)", opacity: 0 }, { transform: "scale(1)", opacity: 1 }], { duration: 500, easing: "cubic-bezier(.2,1.3,.4,1)" });
  art.animate([{ transform: "scale(.2) rotate(-200deg)" }, { transform: "scale(1.25) rotate(12deg)", offset: .6 }, { transform: "scale(1) rotate(0)" }], { duration: 900, easing: "ease-out" });
  const pop = document.createElement("div"); pop.className = "popper"; pop.style.cssText = "left:50%;top:38%;position:absolute"; ov.appendChild(pop);
  burst(pop, "confetti", 28); burst(pop, "star", 12);
  Sfx.play("prize");
  ov.querySelector("#collect").onclick = () => {
    Sfx.play("arrive");
    const a = art.getBoundingClientRect(), b = prizeBtn.getBoundingClientRect();
    const dx = b.left + b.width / 2 - (a.left + a.width / 2), dy = b.top + b.height / 2 - (a.top + a.height / 2);
    ov.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 650, fill: "forwards" });
    art.style.zIndex = 1; art.style.position = "relative";
    art.animate([{ transform: "none", opacity: 1 }, { transform: `translate(${dx}px, ${dy}px) scale(.15)`, opacity: 1 }], { duration: 650, easing: "ease-in", fill: "forwards" });
    setTimeout(() => { ov.remove(); refreshCount(); prizeBtn.animate([{ transform: "scale(1)" }, { transform: "scale(1.25)" }, { transform: "scale(1)" }], { duration: 450 }); nextBox(out); }, 650);
  };
}

function nextBox(out) {
  const others = DESIGNS.filter(d => d !== design);
  design = others[Math.floor(Math.random() * others.length)];
  build();
  out.cancel();
  Sfx.play("slide");
  scene.animate([{ transform: "translateX(115%) rotate(6deg)", opacity: 0 }, { transform: "none", opacity: 1 }], { duration: 900, easing: "cubic-bezier(.2,.9,.3,1.1)" });
  finishing = false;
}

// ---- prize collection panel ----
function openPrizes() {
  const list = PrizeStore.all();
  const got = new Map();
  list.forEach(p => got.set(p.id, (got.get(p.id) || 0) + 1));
  const fmt = t => new Date(t).toLocaleDateString(undefined, { month: "short", day: "numeric" });
  prizePanel.innerHTML = `<div class="prize-panel-card" role="dialog" aria-label="Prize collection">
    <button class="prize-close" aria-label="Close">×</button>
    <h2>Prize collection</h2>
    <p class="small">${list.length ? `You've earned ${list.length} prize${list.length > 1 ? "s" : ""} (${got.size} of ${PRIZES.length} different ones) by finishing punch boxes.` : "Finish a punch box to win your first prize!"}</p>
    <div class="prize-grid">${PRIZES.map(p => got.has(p.id) ? `<div class="prize-item"><div class="prize-thumb">${p.art}</div><strong>${p.name}</strong>${got.get(p.id) > 1 ? `<span class="prize-x">×${got.get(p.id)}</span>` : ""}<small>${p.blurb}</small><small class="prize-from">${list.filter(x => x.id === p.id).slice(-1).map(x => `From the ${x.design} box${x.feeling ? `, feeling ${x.feeling}` : ""} · ${fmt(x.at)}`)[0]}</small></div>` : `<div class="prize-item locked"><div class="prize-thumb">?</div><strong>Mystery prize</strong><small>Finish more boxes to find it.</small></div>`).join("")}</div></div>`;
  prizePanel.hidden = false;
  prizePanel.querySelector(".prize-close").focus();
}
const closePrizes = () => { prizePanel.hidden = true; };
prizeBtn.onclick = openPrizes;
prizePanel.addEventListener("click", e => { if (e.target === prizePanel || e.target.closest(".prize-close")) closePrizes(); });
addEventListener("keydown", e => { if (e.key === "Escape") closePrizes(); });
refreshCount();

// open the box exactly as you left it (or a fresh one the very first time)
function boot() {
  const st = readStates()[stateId];
  const ok = st && st.v === 1 && Array.isArray(st.gifts) && st.gifts.length === COUNT && st.gifts.every(g => g && g.kind && giftArt(g)) &&
    DESIGNS.some(d => d.name === st.design) && Array.isArray(st.holes) && Array.isArray(st.opened) && st.holes.length === st.opened.length &&
    st.opened.every(i => Number.isInteger(i) && i >= 0 && i < COUNT);
  if (!ok) { build(); return; }
  design = DESIGNS.find(d => d.name === st.design);
  build(st);
  if (opened.size === COUNT) {
    // you left right after finishing: carry on with the prize
    const out = scene.animate([{ opacity: 0 }, { opacity: 0 }], { duration: 1, fill: "forwards" });
    if (st.pending) { finishing = true; showPrize(out, st.pending); } else { finishBox(); }
  }
}
boot();
