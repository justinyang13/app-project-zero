// What happens when you click a popped gift (shared by the punch box and the punch box collection).
// Clicking a popped gift makes it do something — every gift has its own move, particles and sound.
const CONFETTI = ["#ff5d73", "#ffd23f", "#4fb0ff", "#7be07b", "#b07bff", "#ff9a3d"];
const anim = (el, kf, ms = 900, easing = "ease-in-out") => el.animate(kf, { duration: ms, easing });

// each entry: line shown under the box, the animation, a particle burst, and (by key) a sound from sfx.js
const REACTIONS = {
  scroll: { play: art => anim(art, [{ transform: "scaleX(1)" }, { transform: "scaleX(1.9) scaleY(.92)" }, { transform: "scaleX(1)" }], 800), fx: ["sparkle", 8] },
  giftbox: { text: "Ta-da! Surprise — you deserve something nice today.",
    play: art => anim(art, [{ transform: "translateY(0) scale(1,1)" }, { transform: "translateY(0) scale(1.2,.75)", offset: .15 }, { transform: "translateY(-55px) scale(.9,1.2)", offset: .45 }, { transform: "translateY(0) scale(1.15,.85)", offset: .7 }, { transform: "translateY(-14px) scale(1)", offset: .85 }, { transform: "translateY(0) scale(1)" }], 900, "ease-out"), fx: ["confetti", 20] },
  heart: { text: "Thump-thump! That's the sound of you being loved.",
    play: art => anim(art, [{ transform: "scale(1)" }, { transform: "scale(1.4)", offset: .15 }, { transform: "scale(1.05)", offset: .3 }, { transform: "scale(1.5)", offset: .45 }, { transform: "scale(1)" }], 800), fx: ["heart", 9, "rise"] },
  star: { text: "Whee! You're a star — even on cloudy days.",
    play: art => anim(art, [{ transform: "rotate(0) scale(1)" }, { transform: "rotate(360deg) scale(1.5)", offset: .5 }, { transform: "rotate(720deg) scale(1)" }], 1100, "cubic-bezier(.3,.7,.4,1)"), fx: ["star", 14] },
  balloon: { text: "Pop! Let that worry float away.",
    play: art => anim(art, [{ transform: "translateY(0) scale(1)", opacity: 1 }, { transform: "translateY(-35px) scale(1.25)", opacity: 1, offset: .45 }, { transform: "translateY(-38px) scale(1.5)", opacity: 1, offset: .5 }, { transform: "translateY(-38px) scale(0)", opacity: 0, offset: .52 }, { transform: "translateY(-38px) scale(0)", opacity: 0, offset: .8 }, { transform: "translateY(0) scale(1)", opacity: 1 }], 1500), fx: ["confetti", 18, "radial", 700] },
  flower: { text: "A little bloom, just for you. Take a slow breath in.",
    play: art => anim(art, [{ transform: "scale(.55) rotate(-25deg)" }, { transform: "scale(1.35) rotate(18deg)", offset: .55 }, { transform: "scale(1) rotate(0)" }], 1000, "cubic-bezier(.2,1.4,.4,1)"), fx: ["petal", 12, "fall"] },
  cookie: { text: "Nom nom nom! Treat yourself — you've earned it.",
    play: art => anim(art, [{ transform: "scale(1,1)" }, { transform: "scale(1.2,.75)", offset: .2 }, { transform: "scale(.85,1.2)", offset: .4 }, { transform: "scale(1.2,.75)", offset: .6 }, { transform: "scale(.8) rotate(-8deg)", offset: .85 }, { transform: "scale(1,1)" }], 900), fx: ["crumb", 14, "fall"] },
  cupcake: { text: "Sweet! Even small treats count as self-care.",
    play: art => anim(art, [{ transform: "translateY(-70px)" }, { transform: "translateY(0)", offset: .35 }, { transform: "translateY(-28px)", offset: .55 }, { transform: "translateY(0)", offset: .72 }, { transform: "translateY(-10px)", offset: .86 }, { transform: "translateY(0)" }], 1000, "ease-in"), fx: ["stick", 18, "radial"] },
  icecream: { text: "Brain freeze! Slow down and enjoy it.",
    play: art => anim(art, [{ transform: "scale(1,1)" }, { transform: "scale(1.18,.7) translateY(6px)", offset: .4 }, { transform: "scale(1.12,.78) translateY(5px)", offset: .65 }, { transform: "scale(1,1)" }], 1200), fx: ["drop", 8, "fall", 0, ["#ff8cbc", "#7fe3c2", "#fff"]] },
  teddy: { text: "*hug* Teddy says you are not alone.",
    play: art => anim(art, [{ transform: "scale(1) rotate(0)" }, { transform: "scale(.82,1.15) rotate(-8deg)", offset: .2 }, { transform: "scale(1.15,.88) rotate(8deg)", offset: .45 }, { transform: "scale(.82,1.15) rotate(-6deg)", offset: .7 }, { transform: "scale(1) rotate(0)" }], 1100), fx: ["heart", 8, "rise"] },
  rainbow: { text: "After every storm, a rainbow. Hang in there.",
    play: art => { art.style.transformOrigin = "50% 90%"; return anim(art, [{ transform: "scale(.3)", filter: "hue-rotate(0)" }, { transform: "scale(1.35)", filter: "hue-rotate(180deg)", offset: .6 }, { transform: "scale(1)", filter: "hue-rotate(360deg)" }], 1200, "cubic-bezier(.2,1.3,.4,1)"); }, fx: ["sparkle", 12] },
  sun: { text: "Here comes the sun. Warm light is on its way.",
    play: art => anim(art, [{ transform: "rotate(0) scale(1)", filter: "brightness(1)" }, { transform: "rotate(180deg) scale(1.3)", filter: "brightness(1.5)", offset: .5 }, { transform: "rotate(360deg) scale(1)", filter: "brightness(1)" }], 1500), fx: ["ray", 14] },
  moon: { text: "Rest well. Tomorrow is a fresh start.",
    play: art => anim(art, [{ transform: "rotate(0)", opacity: 1 }, { transform: "rotate(-28deg)", opacity: .55, offset: .3 }, { transform: "rotate(22deg)", opacity: .7, offset: .65 }, { transform: "rotate(0)", opacity: 1 }], 1500), fx: ["sparkle", 9, "rise"] },
  butterfly: { text: "Change can be beautiful. Flutter on.",
    play: art => anim(art, [{ transform: "translate(0,0) rotate(0)" }, { transform: "translate(22px,-24px) rotate(18deg) scaleX(.7)", offset: .2 }, { transform: "translate(0,-44px) rotate(0) scaleX(1)", offset: .4 }, { transform: "translate(-22px,-24px) rotate(-18deg) scaleX(.7)", offset: .6 }, { transform: "translate(0,0) rotate(0) scaleX(1)" }], 1500), fx: ["petal", 10, "rise", 0, ["#b44fe0", "#4f7be0", "#ffb3de"]] },
  duck: { text: "Quack! Let it roll off your back like water.",
    play: art => anim(art, [{ transform: "translateX(0) rotate(0)" }, { transform: "translateX(-12px) rotate(-14deg)", offset: .2 }, { transform: "translateX(12px) rotate(14deg)", offset: .45 }, { transform: "translateX(-10px) rotate(-12deg)", offset: .7 }, { transform: "translateX(0) rotate(0)" }], 1000), fx: ["bubble", 10, "rise"] },
  mug: { text: "Sip slowly. Something warm helps.",
    play: art => anim(art, [{ transform: "rotate(0) translateY(0)" }, { transform: "rotate(-32deg) translateY(-6px)", offset: .4 }, { transform: "rotate(-32deg) translateY(-6px)", offset: .65 }, { transform: "rotate(0) translateY(0)" }], 1200), fx: ["steam", 8, "rise"] },
  gem: { text: "You are rare and precious. Shine on.",
    play: art => anim(art, [{ transform: "scaleX(1)", filter: "brightness(1)" }, { transform: "scaleX(.05)", filter: "brightness(1.8)", offset: .25 }, { transform: "scaleX(-1)", filter: "brightness(1)", offset: .5 }, { transform: "scaleX(.05)", filter: "brightness(2)", offset: .75 }, { transform: "scaleX(1)", filter: "brightness(1)" }], 1000), fx: ["sparkle", 14] },
  lollipop: { text: "Round and round — take a sweet little break.",
    play: art => { art.style.transformOrigin = "50% 95%"; return anim(art, [{ transform: "rotate(0)" }, { transform: "rotate(720deg)" }], 1000, "cubic-bezier(.3,.7,.3,1)"); }, fx: ["dot", 14, "radial", 0, ["#ff5fa3", "#fff", "#ffd0e4"]] },
  cloud: { text: "Clouds drift by. This feeling will too.",
    play: art => anim(art, [{ transform: "translateX(0)" }, { transform: "translateX(-24px)", offset: .35 }, { transform: "translateX(24px)", offset: .7 }, { transform: "translateX(0)" }], 1400), fx: ["drop", 14, "fall"] }
};

// themed gifts borrow the movement of the generic slot they replace, with their own particles, line and sound
const reactionFor = kind => REACTIONS[kind] || { ...REACTIONS[THEMED[kind].replaces], text: THEMED[kind].quip, fx: THEMED[kind].fx };

function burst(pop, type, n, mode = "radial", _delay = 0, colors = null) {
  const pal = colors || (["confetti", "stick", "dot"].includes(type) ? CONFETTI : null);
  for (let i = 0; i < n; i++) {
    const p = document.createElement("i");
    p.className = `p p-${type}`;
    const a = Math.random() * Math.PI * 2, d = 40 + Math.random() * 55;
    let dx = Math.cos(a) * d, dy = Math.sin(a) * d * 0.8 - 22;
    if (mode === "rise") { dx = (Math.random() - 0.5) * 50; dy = -(45 + Math.random() * 60); }
    if (mode === "fall") { dx = (Math.random() - 0.5) * 80; dy = 30 + Math.random() * 60; }
    p.style.setProperty("--dx", `${dx}px`);
    p.style.setProperty("--dy", `${dy}px`);
    if (pal) p.style.setProperty("--c", pal[i % pal.length]);
    p.style.animationDelay = `${(_delay || 0) + Math.random() * 120}ms`;
    p.addEventListener("animationend", () => p.remove());
    pop.appendChild(p);
  }
}


// Plays a popped gift: its own movement, particles and sound, plus its quip (or, for scrolls, the note again).
// ctx = { msg, quip, feelWord } — the elements/words this page uses to show notes.
function react(pop, gift, ctx) {
  const art = pop.querySelector(".popper-gift svg");
  const r = reactionFor(gift.kind);
  art.getAnimations().forEach(a => a.cancel());
  art.style.transformOrigin = "";
  if (!matchMedia("(prefers-reduced-motion: reduce)").matches) r.play(art);
  burst(pop, ...r.fx);
  if (Sfx.has(gift.kind)) Sfx.play(gift.kind); else if (THEMED[gift.kind]) Sfx.preset(...THEMED[gift.kind].sfx);
  showNote(ctx.msg, gift, ctx.feelWord); // every gift shows its own note again when you click it
  if (gift.kind === "scroll") ctx.quip.textContent = "";
  else { ctx.quip.textContent = r.text; ctx.quip.classList.remove("show"); void ctx.quip.offsetWidth; ctx.quip.classList.add("show"); }
}

// Writes a gift's note into `msg`: an unrolling parchment scroll for scrolls, a handwritten note card for keepsakes.
function showNote(msg, gift, feelWord) {
  const { kind, text } = gift;
  const scroll = kind === "scroll";
  msg.className = scroll ? "gift-msg scroll-card" : "gift-msg note-card";
  msg.textContent = "";
  const t = document.createElement("span");
  t.className = "scroll-title";
  t.textContent = text.t;
  const p = document.createElement("span");
  p.className = "note-body";
  p.textContent = text.m;
  const f = document.createElement("span");
  f.className = "scroll-foot";
  f.textContent = scroll ? (feelWord ? `For when you're feeling ${feelWord}` : "") : "— tied to the gift";
  if (!scroll) { msg.append(t, p); if (f.textContent) msg.append(f); return; }
  // the scroll: wooden rod, aged paper that unrolls, second rod, and a wax seal in the gift's colour
  msg.style.setProperty("--seal", (RIBBONS[(gift.variant || 0) % RIBBONS.length] || RIBBONS[0])[1]);
  msg.style.setProperty("--seal-dark", (RIBBONS[(gift.variant || 0) % RIBBONS.length] || RIBBONS[0])[0]);
  const top = document.createElement("span"); top.className = "rod rod-top";
  const wrap = document.createElement("div"); wrap.className = "sc-paper";
  const body = document.createElement("div"); body.className = "sc-body";
  body.append(t, p);
  if (f.textContent) body.append(f);
  wrap.append(body);
  const bottom = document.createElement("span"); bottom.className = "rod rod-bottom";
  const seal = document.createElement("button"); seal.className = "seal"; seal.type = "button"; seal.textContent = "\u2665";
  seal.title = "Press the seal!"; seal.setAttribute("aria-label", "Press the wax heart seal");
  seal.addEventListener("click", () => pressSeal(seal, msg));
  msg.append(top, wrap, bottom, seal);
}

// The wax heart seal is a button: press it and it squishes, giggles, floats hearts and says something sweet.
const SEAL_LINES = ["Mwah!", "You've got this!", "Sending a hug!", "Proud of you!", "Boop!", "You matter!", "Be kind to you!", "One step at a time!", "Hee hee!", "Love you lots!"];
let sealCount = 0;
function pressSeal(seal, msg) {
  sealCount++;
  Sfx.play("seal");
  if (!matchMedia("(prefers-reduced-motion: reduce)").matches) {
    seal.getAnimations().forEach(a => a.cancel());
    seal.animate([
      { transform: "rotate(-8deg) scale(1,1)" }, { transform: "rotate(-14deg) scale(1.3,.62)", offset: .2 },
      { transform: "rotate(-2deg) scale(.82,1.25) translateY(-6px)", offset: .45 }, { transform: "rotate(-12deg) scale(1.12,.92)", offset: .7 }, { transform: "rotate(-8deg) scale(1,1)" }
    ], { duration: 650, easing: "ease-out" });
  }
  seal.classList.remove("kissed"); void seal.offsetWidth; seal.classList.add("kissed");
  // hearts float up from the seal
  const pop = document.createElement("div");
  pop.className = "popper seal-hearts";
  msg.appendChild(pop);
  burst(pop, "heart", sealCount % 5 === 0 ? 16 : 8, "rise");
  setTimeout(() => pop.remove(), 1800);
  // a little speech bubble
  const bubble = document.createElement("span");
  bubble.className = "seal-bubble";
  bubble.textContent = SEAL_LINES[(sealCount - 1 + Math.floor(Math.random() * SEAL_LINES.length)) % SEAL_LINES.length];
  msg.appendChild(bubble);
  bubble.addEventListener("animationend", () => bubble.remove());
}
