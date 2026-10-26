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
const TIPS = {
  sad: [{"t": "It's okay to hurt", "m": "Sadness is proof that something mattered to you. You don't have to fix it or hurry it. Let it be here, and be gentle with yourself while it is."}, {"t": "Say it out loud", "m": "Tell one person, \"I'm having a rough time.\" You don't need the right words. Feelings shrink a little when someone else carries them with you."}, {"t": "Tiny comforts count", "m": "Make something warm to drink, wrap up in a blanket, play a song that feels like home. Small comforts are not small when you're hurting."}, {"t": "This is a season", "m": "Feelings move like weather. Today feels heavy, but heavy days are not forever. You have gotten through hard days before, and you can again."}, {"t": "Three good things", "m": "Write down three things that are still okay right now: a person, a place, a small moment. Sadness is real, and so are these."}, {"t": "Be your own friend", "m": "If a friend told you what you're feeling, what would you say to them? Say that to yourself, slowly, as if you mean it."}],
  anxious: [{"t": "Come back to now", "m": "Name 5 things you can see, 4 you can touch, 3 you can hear, 2 you can smell, 1 you can taste. Your mind is racing ahead; this brings it home."}, {"t": "Slow the breath", "m": "Breathe in for 4, hold for 2, out for 6. A long exhale tells your body it is safe. Repeat five times and notice your shoulders drop."}, {"t": "Worry or plan?", "m": "Write the worry down, then ask: can I do something about this today? If yes, pick one step. If not, practice letting it sit on the page instead of in your head."}, {"t": "Feel your feet", "m": "Press your feet into the floor and feel the ground hold you. You are supported, even when your thoughts are spinning."}, {"t": "Anxious is not unsafe", "m": "Your body is sounding an alarm to protect you. You can thank it and tell it: \"I've got this. We're okay right now.\""}, {"t": "Do one small thing", "m": "Anxiety grows when we freeze. Walk around the block, wash a dish, stretch. One small action tells your mind you are moving."}],
  angry: [{"t": "Pause before you act", "m": "Anger is a signal, not an order. Step away for a few minutes, breathe out slowly, and decide what to do when your body has settled."}, {"t": "What's underneath?", "m": "Anger often guards something softer: hurt, fear, being unheard. Ask yourself what you really need right now: respect, rest, fairness, space?"}, {"t": "Move it out", "m": "Take a brisk walk, shake out your arms, or push against a wall. Anger is energy, and your body can spend it safely."}, {"t": "Write it, don't send it", "m": "Pour every furious thought onto paper without editing. Then wait before you decide if anything needs saying. Feelings first, words later."}, {"t": "Your feelings are valid", "m": "You are allowed to be angry. What matters is the next choice you make. You can be firm and still be kind."}, {"t": "Cool down", "m": "Splash cold water on your face or hold something cold. It helps your body reset so your thinking brain can come back online."}],
  lonely: [{"t": "You are not the only one", "m": "Loneliness feels private, but it is one of the most shared human feelings. Wanting connection means you are built for it."}, {"t": "Send a small spark", "m": "Text one person: \"Thinking of you.\" You don't need a big conversation. Small signals of care often open big doors."}, {"t": "Be near people", "m": "Sit in a cafe, library, or park. Being around others, even quietly, reminds your heart that the world has room for you."}, {"t": "Find your people", "m": "Think of one thing you love: books, games, cooking, music. Look for a group, class, or club around it. Shared interests make friendship easier."}, {"t": "Give a little kindness", "m": "Help someone with something small. Giving care to another person is one of the fastest ways to feel connected."}, {"t": "Keep yourself company", "m": "Treat yourself like someone worth spending time with: cook something nice, take a walk, play your favorite music. You matter."}],
  stressed: [{"t": "One thing at a time", "m": "Write everything on your mind onto a list, then circle just one thing. Do that, and let the rest wait. Progress beats perfection."}, {"t": "Take ten", "m": "Put the screens down for ten minutes. Look out a window, stretch, or breathe. A short pause often saves more time than it costs."}, {"t": "It's okay to say no", "m": "You can't carry everything. Which one thing can you hand off, delay, or turn down this week? Protecting your energy is not selfish."}, {"t": "Care for the basics", "m": "Drink water, eat something, and aim for an earlier night. Stress feels louder when the body is running on empty."}, {"t": "Shrink the problem", "m": "Ask: what is the very next small step? You don't have to see the whole staircase to take the first stair."}, {"t": "Ask for help", "m": "Reaching out is a strength. Tell someone exactly what would help, even if it's just listening."}],
  overwhelmed: [{"t": "Stop. Breathe.", "m": "Take five slow breaths. Nothing else needs you for the next minute. You can start again once your body has caught up."}, {"t": "Just one", "m": "When everything feels urgent, nothing gets done. Choose a single thing, the smallest one, and let the rest wait."}, {"t": "Feel the ground", "m": "Put your feet on the floor and notice your weight being held. Look around and name three things you see. You are here, and you are okay."}, {"t": "Say it out loud", "m": "Tell someone, \"I'm having a hard time.\" You don't have to explain it all. Saying it makes it lighter."}, {"t": "Make it smaller", "m": "Break the big thing into pieces so small they feel almost silly. Do the first one. Momentum will help with the rest."}, {"t": "Give yourself room", "m": "You are allowed to rest before you finish. Taking a break is part of getting through it, not a failure."}],
  tired: [{"t": "Rest is productive", "m": "Rest is not laziness. Your mind and body need it to heal. Give yourself permission to stop, without earning it first."}, {"t": "Gentle routine", "m": "Try light in the morning, water through the day, a little movement, and a steady bedtime. Small habits slowly rebuild energy."}, {"t": "Smallest step", "m": "Make your bed, take a shower, step outside for a minute. When everything feels heavy, tiny wins create momentum."}, {"t": "Listen to your body", "m": "Feeling numb or drained can be your body asking for care after a long stretch of stress or grief. It makes sense. It isn't your fault."}, {"t": "Ask for support", "m": "If tiredness or numbness has lasted for weeks, talk to a doctor or counselor. It is common, and it is treatable."}, {"t": "Be kind to today", "m": "You don't have to do everything today. Do what you can, and let that be enough."}],
  guilty: [{"t": "Guilt vs. shame", "m": "Guilt says, \"I did something wrong.\" Shame says, \"I am wrong.\" You are more than your worst moment, and you can grow from it."}, {"t": "Make it right", "m": "Is there something you can repair or apologize for? A sincere \"I'm sorry\" and a plan to do better can lighten the weight."}, {"t": "Forgive yourself", "m": "If there is nothing left to fix, practice forgiveness. You did the best you could with what you knew then."}, {"t": "Share the weight", "m": "Shame shrinks when it's spoken to someone safe. Tell a trusted person. You may be met with more kindness than you expect."}, {"t": "Speak like a friend", "m": "How would you speak to a friend who made the same mistake? Offer yourself that same gentle, honest voice."}, {"t": "Learn and let go", "m": "Write one thing you learned from this, then one thing you'll do differently. Then set the rest down. You are allowed to move forward."}],
  happy: [{"t": "Savor this", "m": "Pause for thirty seconds and notice where you feel the happiness in your body. Soaking it in helps it last."}, {"t": "Share the joy", "m": "Tell someone what's making you happy. Joy grows when it's shared, and it will brighten their day too."}, {"t": "Remember it", "m": "Write down what made today good, or take a photo. On harder days, you'll have proof that good days exist."}, {"t": "Pass it on", "m": "Do something kind for someone else today. Kindness keeps good feelings moving."}, {"t": "You deserve this", "m": "You don't have to earn happiness or fear it will disappear. Let yourself enjoy it fully."}, {"t": "Thank the moment", "m": "Quietly say thank you for this feeling. Gratitude turns a good moment into a lasting one."}],
  grateful: [{"t": "Count three", "m": "Write down three things you're thankful for today. They can be tiny: warm sunlight, a good song, a kind word."}, {"t": "Say thank you", "m": "Tell someone you appreciate them and why. It means more than you think, and it strengthens you both."}, {"t": "Plant a hope", "m": "Choose one small goal that moves toward what you're hopeful about, and take the first step today."}, {"t": "Thank your past self", "m": "Remember a hard time you got through. Thank the version of you who kept going. You carried yourself here."}, {"t": "Notice what's here", "m": "Look around the room and find one good thing you usually overlook. Gratitude is practice in noticing."}, {"t": "Hold onto hope", "m": "Hope isn't pretending things are easy. It's believing that good things are still possible, and you can help them grow."}]
};
const DEFAULT_TIPS = [{"t": "Be kind to yourself", "m": "Treat yourself as you would treat a friend. You are doing better than you think."}, {"t": "One small step", "m": "You don't have to fix everything today. Choose one small thing and let that be enough."}, {"t": "Breathe", "m": "Take three slow breaths. In through the nose, out through the mouth. You are safe in this moment."}, {"t": "Reach out", "m": "Text someone you trust. You don't have to carry this alone."}, {"t": "Drink some water", "m": "Your body and your mind work together. A glass of water and a stretch can shift your whole day."}, {"t": "You matter", "m": "Exactly as you are, right now, you matter. Don't forget it."}];

// Each keepsake carries a note that explains how that image relates to the feeling you picked.
const NOTE_FIELDS = {"sad": {"w": "sad", "a": ["do one small kind thing for yourself, like a warm drink or a short walk", "tell someone you trust, \"I'm having a rough day\"", "put on a song that feels like home", "drink some water and open a window for fresh air", "text a friend a simple \"hi\"", "write down one thing you're proud of, however small"], "t": ["sadness is a sign that something mattered to you", "feelings move like weather, and this one will shift", "you don't have to hurry yourself through this", "you don't have to be okay all the time", "sad days still count as part of a good life", "being gentle with yourself is not weakness"], "r": "Ask someone you trust for a hug or a kind word", "pos": false}, "anxious": {"w": "anxious", "a": ["name five things you can see around you", "breathe in for 4, hold for 2, and out for 6", "feel your feet on the floor and let the ground hold you", "list three things you can control right now", "unclench your jaw and drop your shoulders", "go outside and look at the sky for a minute"], "t": ["anxiety is your mind trying to protect you, not predicting the future", "a racing mind is not the same as real danger", "you have handled hard moments before, and you can handle this one", "worrying doesn't prevent bad things, it only spends today", "you are safe in this very moment", "your thoughts are not facts"], "r": "Ask someone you trust to sit with you for a minute", "pos": false}, "angry": {"w": "angry", "a": ["move your body for five minutes before deciding what to say", "take a few slow exhales before you speak", "write down everything you're feeling, then wait before sending anything", "go for a fast walk around the block", "squeeze your fists for five seconds, then let go", "ask yourself what you need right now"], "t": ["anger shows you where a boundary was crossed", "your feelings are valid, and what you do next is still your choice", "there is usually a need underneath anger, like respect, rest, or fairness", "you can disagree without losing your calm", "pausing is a strength, not a weakness", "anger passes, and you'll feel clearer when it does"], "r": "When you're ready, tell someone you trust what happened", "pos": false}, "lonely": {"w": "lonely", "a": ["send one low-pressure message, like \"thinking of you\"", "go somewhere with people around, like a cafe or park", "look for a group built around something you love", "write a note to someone you've been thinking about", "say yes to the next small invitation", "join something you enjoy, online or in person"], "t": ["wanting connection means you are built for it", "many people feel this way even when they hide it", "feeling alone doesn't mean you are alone", "one real conversation can change a whole day", "you are worth reaching toward", "friendships often start with a tiny hello"], "r": "Reach out to one person today, even with a short text", "pos": false}, "stressed": {"w": "stressed", "a": ["pick just one next step and let the rest wait", "step away from screens for ten minutes", "drink some water and eat something", "write everything down, then circle just one thing", "stretch your neck and shoulders slowly", "say no to one thing today"], "t": ["you are carrying a lot, and you don't have to carry it all at once", "you don't have to solve everything today", "small steps still count as progress", "rest makes you better at hard things, not worse", "you are allowed to ask for help", "not everything is urgent, even when it feels that way"], "r": "Ask someone to help with one thing", "pos": false}, "overwhelmed": {"w": "overwhelmed", "a": ["take five slow breaths and choose only one thing", "put your feet on the floor and name three things you can see", "write one tiny list and circle only the first item", "take five slow breaths with a long exhale", "tell one person you're having a hard time", "do the smallest possible next step and stop there"], "t": ["your mind needs a pause, not more pressure", "you can set things down and still be responsible", "you don't have to see the whole staircase to take the first step", "you've survived every hard day so far", "you can pause without falling behind forever", "the feeling is big, but it is not permanent"], "r": "Tell someone, \"I'm having a hard time\"", "pos": false}, "tired": {"w": "tired", "a": ["rest without guilt, even for ten minutes", "drink a glass of water and open a window", "make your bed as one tiny win", "take a short walk in daylight", "eat something nourishing", "put your phone away and dim the lights"], "t": ["exhaustion is a message to rest, not a flaw", "rest is part of getting better, not the opposite of it", "you are doing more than it seems", "your body is asking for care, not criticism", "it's okay to rest before you finish", "small amounts of rest add up"], "r": "Ask someone to take one task so you can rest", "pos": false}, "guilty": {"w": "guilty", "a": ["repair what you can, then forgive yourself for the rest", "write down what you learned, then let the rest go", "speak to yourself the way you'd speak to a friend", "say sorry if you owe someone one", "list what you'd do differently next time", "ask a friend how they'd see it"], "t": ["you are more than your worst moment", "you can make mistakes and still be a good person", "guilt is a sign that you care about doing right", "you can take responsibility without punishing yourself", "making amends matters more than staying ashamed", "everyone gets things wrong sometimes"], "r": "Share it with someone safe, because shame shrinks when it's spoken", "pos": false}, "happy": {"w": "happy", "a": ["pause for thirty seconds and savor this feeling", "take a photo or write down what made today good", "do one small kind thing for someone else", "tell someone what made your day", "do a little dance", "write down three details you want to remember"], "t": ["you're allowed to enjoy good things fully", "you don't have to earn happiness or fear it will disappear", "good moments are worth remembering", "you don't need to apologize for being happy", "good feelings are worth tending", "joy is allowed to be simple"], "r": "Share your good news with someone you love", "pos": true}, "grateful": {"w": "hopeful and grateful", "a": ["write down three things you're thankful for", "thank someone out loud today", "choose one small goal that moves you toward what you hope for", "text someone a thank-you", "look around and name three good things", "plan something small to look forward to"], "t": ["gratitude and hope are strong anchors", "hope is believing good things are still possible", "noticing the good is a skill you are building", "gratitude makes good things last longer", "you can hold hope and hard things together", "noticing the good is a skill you're growing"], "r": "Tell someone you appreciate them today", "pos": true}};
const NOTES_HARD = {"giftbox": {"t": "A gift just for you", "m": "Even while you're feeling {w}, you deserve something kind. Unwrap this thought: {t}. Then {a}."}, "heart": {"t": "A heart that keeps going", "m": "Your heart keeps beating through every hard day, including this {w} one. It's proof that {t}. When you can, {a}."}, "star": {"t": "You still shine", "m": "A star doesn't stop shining just because the sky is dark, and feeling {w} doesn't dim you either. Tonight, {a}, and know that {t}."}, "balloon": {"t": "Let it float", "m": "Picture feeling {w} as a balloon and loosen your grip on the string. As it floats up, remember that {t}. Try this: {a}."}, "flower": {"t": "Growth takes time", "m": "Flowers need rain as well as sunshine, and feeling {w} can be part of growing. Be patient and {a}. After all, {t}."}, "cookie": {"t": "A small comfort", "m": "A treat won't fix feeling {w}, but small comforts help. Savor something sweet slowly, then {a}. Remember that {t}."}, "cupcake": {"t": "Celebrate the small stuff", "m": "You made it through another day feeling {w}, and that deserves a cupcake. It shows that {t}. Next, {a}."}, "icecream": {"t": "Slow down", "m": "Ice cream melts if you rush, and so do good moments. When you feel {w}, slow down and {a}. Hurrying won't help, because {t}."}, "teddy": {"t": "A hug when you need one", "m": "When you're feeling {w}, it's okay to want a hug. {r}. Until then, hold this teddy and remember that {t}."}, "rainbow": {"t": "Colors come back", "m": "Rainbows come after the rain, so feeling {w} isn't the end of the story. Right now, {a}, because {t}."}, "sun": {"t": "Warmth returns", "m": "The sun always comes back, even after the longest night. Feeling {w} is not permanent. Step into some light and {a}, knowing that {t}."}, "moon": {"t": "Rest is allowed", "m": "The moon rests and returns, and you can too. Feeling {w} is tiring, so tonight, {a}. And keep in mind that {t}."}, "butterfly": {"t": "You are changing", "m": "A butterfly starts out small and unsure. Feeling {w} can be part of becoming. As you change, {a}, and remember that {t}."}, "duck": {"t": "Let it roll off", "m": "Ducks let water roll off their backs. You can't stop every wave of feeling {w}, but you can let some slide away. Try to {a}, since {t}."}, "mug": {"t": "Something warm", "m": "Hold a warm cup in both hands. When you feel {w}, warmth for your body helps your heart too. Then {a}. Remember: {t}."}, "gem": {"t": "You are valuable", "m": "A gem is just as precious on a cloudy day, and feeling {w} doesn't change your worth. Remember that {t}. Today, {a}."}, "lollipop": {"t": "A sweet break", "m": "Take a short, sweet break from feeling {w}. You're allowed to pause. When you're ready, {a}, because {t}."}, "cloud": {"t": "This will pass", "m": "Clouds drift by and the sky changes. Feeling {w} is a cloud, not the whole sky. Try to {a}, and remember that {t}."}};
const NOTES_HAPPY = {"giftbox": {"t": "A gift for you", "m": "You're feeling {w}, and that is a gift. Open it fully, and {a}. Remember that {t}."}, "heart": {"t": "A happy heart", "m": "A heart that feels {w} is worth celebrating. {T}. Try to {a}."}, "star": {"t": "You're shining", "m": "You're shining right now. Let it show, and {a}, because {t}."}, "balloon": {"t": "Float a little", "m": "Let feeling {w} lift you like a balloon. {r}. And remember that {t}."}, "flower": {"t": "Let it bloom", "m": "Good feelings bloom when you tend them. Right now, {a}, and remember that {t}."}, "cookie": {"t": "Savor it", "m": "Enjoy something sweet slowly while you feel {w}. Then {a}. After all, {t}."}, "cupcake": {"t": "Celebrate!", "m": "Feeling {w} deserves a cupcake. Go on and {a}. Remember that {t}."}, "icecream": {"t": "Enjoy it while it lasts", "m": "Slow down and enjoy this moment before it melts. Try to {a}, because {t}."}, "teddy": {"t": "Pass on the warmth", "m": "Warm feelings are meant to be shared. {r}. And keep in mind that {t}."}, "rainbow": {"t": "Look at those colors", "m": "This is a good moment to remember. Try to {a}, since {t}."}, "sun": {"t": "Soak it in", "m": "You're standing in the light, so let it fill you up. Then {a}, and share some warmth with someone else. {T}."}, "moon": {"t": "A peaceful night", "m": "A good day leads to a peaceful night. Rest easy, and tomorrow, {a}. Remember that {t}."}, "butterfly": {"t": "You're growing", "m": "Look how far you've come. Remember that {t}. Today, {a}."}, "duck": {"t": "Splash around", "m": "You're allowed to play and enjoy this. Try to {a}, because {t}."}, "mug": {"t": "Raise a cup", "m": "Raise a warm cup to this moment. Then {a}. After all, {t}."}, "gem": {"t": "A treasure", "m": "You are a treasure, and today it shows. {T}. Take a moment to {a}."}, "lollipop": {"t": "Sweet moments", "m": "Sweet moments deserve to be enjoyed. Try to {a}, since {t}."}, "cloud": {"t": "Light as air", "m": "Even the clouds look light today. Remember that {t}, and {a}."}};
// i = position among this box's generic keepsakes, so no two notes share the same advice + reassurance pair
const noteFor = (kind, i = 0) => {
  const f = NOTE_FIELDS[feeling];
  if (!f) return { t: "A little gift", m: "Be as kind to yourself as you would be to a friend. You matter." };
  const src = (f.pos ? NOTES_HAPPY : NOTES_HARD)[kind];
  const act = f.a[i % 6], truth = f.t[(i + Math.floor(i / 6)) % 6];
  const up = s => s.charAt(0).toUpperCase() + s.slice(1);
  const m = src.m.replace(/\{w\}/g, f.w).replace(/\{a\}/g, act).replace(/\{T\}/g, up(truth)).replace(/\{t\}/g, truth).replace(/\{r\}/g, f.r);
  return { t: src.t, m };
};
const shuffle = a => [...a].sort(() => Math.random() - 0.5);
const feeling = location.hash.slice(1);
const pool = GIFTS[feeling] || DEFAULT_OLD;
const captions = pool.map(g => g[1]);
const tips = TIPS[feeling] || DEFAULT_TIPS;
const FEELING_WORDS = { sad: "sad", anxious: "anxious", angry: "angry", lonely: "lonely", stressed: "stressed", overwhelmed: "overwhelmed", tired: "tired or numb", guilty: "guilty or ashamed", happy: "happy", grateful: "hopeful and grateful" };
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

function react(pop, gift) {
  const art = pop.querySelector(".popper-gift svg");
  const r = reactionFor(gift.kind);
  art.getAnimations().forEach(a => a.cancel());
  art.style.transformOrigin = "";
  if (!matchMedia("(prefers-reduced-motion: reduce)").matches) r.play(art);
  burst(pop, ...r.fx);
  if (Sfx.has(gift.kind)) Sfx.play(gift.kind); else if (THEMED[gift.kind]) Sfx.preset(...THEMED[gift.kind].sfx);
  if (gift.kind === "scroll") showMessage(gift);
  else { quip.textContent = r.text; quip.classList.remove("show"); void quip.offsetWidth; quip.classList.add("show"); }
}

// The gift springs up out of its compartment, through the torn paper, and hovers above the box.
function showMessage({ kind, text }) {
  const scroll = kind === "scroll";
  msg.className = scroll ? "gift-msg scroll-card" : "gift-msg note-card";
  msg.textContent = "";
  const t = document.createElement("span");
  t.className = "scroll-title";
  t.textContent = text.t;
  const p = document.createElement("span");
  p.className = "note-body";
  p.textContent = text.m;
  msg.append(t, p);
  const f = document.createElement("span");
  f.className = "scroll-foot";
  f.textContent = scroll ? (feelWord ? `For when you're feeling ${feelWord}` : "") : "— tied to the gift";
  if (f.textContent) msg.append(f);
}

function popOut(idx, col, row, gift) {
  const kind = gift.kind;
  box.children[idx].classList.add("emptied");
  const pop = document.createElement("div");
  pop.className = "popper";
  pop.style.left = `${((col + 0.5) / COLS) * 100}%`;
  pop.style.top = `${((row + 0.5) / ROWS) * 100}%`;
  pop.innerHTML = `<span class="popper-gift">${giftArt(gift)}</span>`;
  const art = pop.firstChild;
  art.title = "Click me!";
  art.addEventListener("click", e => { e.stopPropagation(); react(pop, gift); });
  burst(pop, "star", 10);
  popLayer.appendChild(pop);
}

let gifts = [], popLayer;
function build() {
  box.innerHTML = "";
  box.style.setProperty("--cols", COLS);
  box.style.setProperty("--rows", ROWS);
  design.box.forEach((c, i) => box.style.setProperty(`--b${i + 1}`, c));
  msg.textContent = "";
  msg.className = "gift-msg";
  quip.textContent = "";
  opened.clear();
  // about 5 scrolls carrying a tip for this feeling, the rest are small keepsakes with a kind note
  const SCROLLS = RIBBONS.length, tipOrder = shuffle(tips);
  // this feeling's own images take the place of 6 generic ones, so the box always holds 18 different keepsakes
  const sets = THEME_SETS[feeling] || [];
  const taken = sets.map(id => THEMED[id].replaces);
  const kindOrder = shuffle([...OBJECT_KINDS.filter(k => !taken.includes(k)), ...sets]);
  let gi = 0;
  gifts = shuffle([
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
}
const sizeCell = () => box.style.setProperty("--cell", `${(box.clientWidth - 20) / COLS}px`);
new ResizeObserver(sizeCell).observe(box);
const soundBtn = document.getElementById("sound");
const showSound = () => { soundBtn.textContent = Sfx.on ? "🔊 Sound on" : "🔇 Sound off"; soundBtn.setAttribute("aria-pressed", String(Sfx.on)); };
soundBtn.onclick = () => { Sfx.toggle(); showSound(); };
showSound();
document.getElementById("reset").onclick = build;
build();

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

function showPrize(out) {
  const have = new Set(PrizeStore.all().map(p => p.id));
  const fresh = PRIZES.filter(p => !have.has(p.id));
  const prize = (fresh.length ? fresh : PRIZES)[Math.floor(Math.random() * (fresh.length || PRIZES.length))];
  PrizeStore.add({ id: prize.id, at: Date.now(), design: design.name, feeling: feelWord });
  // keep the finished box itself, filed under the feeling it was opened for
  BoxStore.add({ feeling: feeling || "general", at: Date.now(), design: design.name, prize: prize.id, gifts: gifts.map(g => ({ kind: g.kind, variant: g.variant })) });
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
