const EMOTIONS = {
  sad: { emoji: "😢", label: "Sad",
    validate: "Sadness is a natural response to loss, disappointment, or hurt. It's okay to feel it.",
    tips: ["Let yourself cry if you need to. It can release tension.", "Reach out to one person you trust, even with a short text.", "Do one small kind thing for yourself: tea, a shower, a short walk.", "Sadness moves like weather. It tends to shift, even if slowly."] },
  anxious: { emoji: "😰", label: "Anxious",
    validate: "Anxiety is your mind trying to protect you. The feelings are real, but they are not always a sign of danger.",
    tips: ["Try the breathing exercise below.", "Name 5 things you see, 4 you can touch, 3 you hear, 2 you smell, 1 you taste.", "Write down the worry, then ask: what is in my control right now?", "Limit caffeine and news for a while."] },
  angry: { emoji: "😠", label: "Angry",
    validate: "Anger often shows up when a boundary is crossed or something feels unfair. The feeling is okay; what you do with it is the choice.",
    tips: ["Pause before reacting. Step away for a few minutes if you can.", "Move your body: brisk walk, push-ups, or shake out your arms.", "Slow exhale breathing helps calm your body's alarm.", "Ask what need is underneath the anger: respect, rest, fairness?"] },
  lonely: { emoji: "🫂", label: "Lonely",
    validate: "Loneliness is a signal that you want connection, and that's deeply human. Many people feel it, even when they hide it.",
    tips: ["Send a low-pressure message to someone: \"Thinking of you.\"", "Go where people are, even quietly: a cafe, library, or park.", "Join a group around an interest. Shared activity makes connecting easier.", "Be as kind to yourself as you would be to a friend."] },
  stressed: { emoji: "😖", label: "Stressed",
    validate: "Feeling overwhelmed means you are carrying a lot. You don't have to solve everything at once.",
    tips: ["Write everything down, then pick just the next one small step.", "Take a 10-minute break away from screens.", "Say no or ask for help with one thing today.", "Drink water, eat something, and try to rest tonight."] },
  overwhelmed: { emoji: "🌊", label: "Overwhelmed",
    validate: "When everything feels like too much, your mind needs a pause, not more pressure.",
    tips: ["Stop and take 5 slow breaths with the exercise below.", "Pick only one thing. Everything else can wait for now.", "Put your feet on the floor and feel the ground beneath you.", "Tell someone: \"I'm having a hard time.\" You don't need to explain it all."] },
  tired: { emoji: "😴", label: "Tired / Numb",
    validate: "Exhaustion and numbness can come from burnout, grief, or long stress. Your body and mind may be asking for rest.",
    tips: ["Give yourself permission to rest without guilt.", "Aim for a gentle routine: light, water, a little movement, regular sleep.", "Do the smallest possible task, like making your bed, to build momentum.", "If it lasts for weeks, talk to a doctor or counselor. It's common and treatable."] },
  guilty: { emoji: "😔", label: "Guilty / Ashamed",
    validate: "Guilt says \"I did something wrong\"; shame says \"I am wrong.\" You are more than your worst moment.",
    tips: ["Ask: is there something I can repair or apologize for? If so, do it.", "If not, practice forgiving yourself. You did the best you could with what you knew.", "Talk to a trusted person. Shame shrinks when shared.", "Speak to yourself as you would to a friend in the same situation."] },
  happy: { emoji: "😊", label: "Happy",
    validate: "Wonderful! Good feelings deserve attention too.",
    tips: ["Pause and savor it for 30 seconds. Notice where you feel it.", "Share it with someone.", "Write down what made it happen so you can return to it later.", "Do something kind for someone else to carry the feeling further."] },
  grateful: { emoji: "🙏", label: "Hopeful / Grateful",
    validate: "Gratitude and hope are powerful anchors. Hold onto them.",
    tips: ["Write down three things you're thankful for today.", "Tell someone you appreciate them.", "Set one small goal that moves you toward what you're hopeful about."] }
};

const nav = document.getElementById("emotions");
const main = document.getElementById("main");
const welcome = main.innerHTML;
let timer = null;

for (const [key, e] of Object.entries(EMOTIONS)) {
  const b = document.createElement("button");
  b.setAttribute("aria-pressed", "false");
  b.dataset.key = key;
  b.innerHTML = `<span class="emoji">${e.emoji}</span><span>${e.label}</span>`;
  b.addEventListener("click", () => show(key));
  nav.appendChild(b);
}

function show(key) {
  const e = EMOTIONS[key];
  nav.querySelectorAll("button").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.key === key)));
  clearInterval(timer);
  main.innerHTML = `
    <div class="card">
      <h2>${e.emoji} Feeling ${e.label.toLowerCase()}</h2>
      <p>${e.validate}</p>
    </div>
    <div class="card">
      <h3>Things that may help</h3>
      <ul>${e.tips.map(t => `<li>${t}</li>`).join("")}</ul>
    </div>
    <div class="card">
      <h3>Breathe with me</h3>
      <div class="breathe-wrap">
        <div class="circle" id="circle">Ready</div>
        <div>
          <p>Breathe in for 4, hold for 2, out slowly for 6. Repeat a few times.</p>
          <button class="btn" id="go">Start</button>
        </div>
      </div>
    </div>
    <p><a class="btn" href="punch-box.html#${key}">Punch box activity</a></p>
    <div class="card crisis">
      <h3>Need to talk to someone now?</h3>
      <p>In the US, call or text <strong>988</strong>, or text HOME to <strong>741741</strong>. Emergency: <strong>911</strong>.</p>
    </div>
    <p><button class="btn" id="back">Back</button></p>`;
  main.querySelector("#back").onclick = () => {
    clearInterval(timer);
    main.innerHTML = welcome;
    nav.querySelectorAll("button").forEach(b => b.setAttribute("aria-pressed", "false"));
  };
  const circle = main.querySelector("#circle"), go = main.querySelector("#go");
  go.onclick = () => {
    if (circle.classList.contains("run")) {
      clearInterval(timer); circle.classList.remove("run"); circle.textContent = "Ready"; go.textContent = "Start"; return;
    }
    circle.classList.add("run"); go.textContent = "Stop";
    circle.textContent = "Breathe in";
    let elapsed = 0;
    timer = setInterval(() => {
      elapsed += 1000;
      const t = elapsed % 12000;
      circle.textContent = t < 4000 ? "Breathe in" : t < 6000 ? "Hold" : "Breathe out";
    }, 1000);
  };
}
