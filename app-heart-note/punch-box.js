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

// Hand-drawn gift art (no emoji): every gift is an SVG object.
const RIBBONS = [
  ["#8e1f33", "#e0475e", "#9c2339", "#c93a53"], ["#1f3f8e", "#4d7ee0", "#27479c", "#3a64c9"], ["#1f6a3a", "#4cc07a", "#26793f", "#37a862"],
  ["#5a2a8e", "#a068e0", "#612f9c", "#8650c9"], ["#a8520f", "#f0903a", "#b25a12", "#e0792a"], ["#0f6a70", "#35c0c8", "#147a82", "#27a3ab"]
];
const scrollArt = n => { const c = RIBBONS[n % RIBBONS.length]; return `<svg viewBox="0 0 72 56" width="100%" height="100%"><defs>
    <linearGradient id="pg" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#d9bd84"/><stop offset=".12" stop-color="#f8ecc8"/><stop offset=".88" stop-color="#f4e5bb"/><stop offset="1" stop-color="#d2b57a"/></linearGradient>
    <linearGradient id="rl" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#b8935a"/><stop offset=".35" stop-color="#f6e6b8"/><stop offset=".7" stop-color="#e0c88c"/><stop offset="1" stop-color="#a2804a"/></linearGradient>
    <linearGradient id="rb${n}" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${c[0]}"/><stop offset=".4" stop-color="${c[1]}"/><stop offset="1" stop-color="${c[2]}"/></linearGradient>
    <radialGradient id="rc" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#c7a468"/><stop offset="1" stop-color="#8e6c36"/></radialGradient></defs>
    <ellipse cx="36" cy="52" rx="30" ry="3" fill="#000" opacity=".25"/>
    <rect x="14" y="10" width="44" height="34" fill="url(#pg)"/>
    <path d="M18 19h36M18 25h36M18 31h36M18 37h22" stroke="#9c7f45" stroke-opacity=".55" stroke-width="1.3" stroke-linecap="round"/>
    <path d="M14 10h44v3H14z" fill="#000" opacity=".14"/><path d="M14 41h44v3H14z" fill="#000" opacity=".14"/>
    <rect x="6" y="6" width="12" height="42" rx="6" fill="url(#rl)"/><ellipse cx="12" cy="6.5" rx="6" ry="2.6" fill="url(#rc)"/><ellipse cx="12" cy="6.5" rx="3" ry="1.2" fill="#6f5127" opacity=".6"/>
    <rect x="54" y="6" width="12" height="42" rx="6" fill="url(#rl)"/><ellipse cx="60" cy="6.5" rx="6" ry="2.6" fill="url(#rc)"/><ellipse cx="60" cy="6.5" rx="3" ry="1.2" fill="#6f5127" opacity=".6"/>
    <rect x="8.5" y="12" width="2" height="30" rx="1" fill="#fff" opacity=".45"/>
    <rect x="31" y="4" width="10" height="46" fill="url(#rb${n})"/><rect x="33" y="4" width="2" height="46" fill="#fff" opacity=".3"/>
    <path d="M36 27c-10-9-14 1-6 3zM36 27c10-9 14 1 6 3z" fill="url(#rb${n})" stroke="${c[0]}" stroke-width=".8"/><circle cx="36" cy="28" r="3.2" fill="${c[3]}" stroke="${c[0]}" stroke-width=".8"/>
    <path d="M36 30l-4 9M36 30l4 9" stroke="${c[2]}" stroke-width="2.2" stroke-linecap="round"/></svg>`; };
const ART = {
  giftbox: `<svg viewBox="0 0 56 56" width="100%" height="100%"><defs>
    <linearGradient id="gb1" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#7fb4ee"/><stop offset="1" stop-color="#2c63a8"/></linearGradient>
    <linearGradient id="gb2" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#3f78bd"/><stop offset="1" stop-color="#1f4d8a"/></linearGradient>
    <linearGradient id="gr" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#e6b21f"/><stop offset=".45" stop-color="#ffe27a"/><stop offset="1" stop-color="#d49d10"/></linearGradient></defs>
    <ellipse cx="28" cy="52" rx="22" ry="3.2" fill="#000" opacity=".28"/>
    <path d="M8 24l20 7v21L8 45z" fill="url(#gb2)"/><path d="M48 24L28 31v21l20-7z" fill="url(#gb1)"/>
    <path d="M6 17l22 8 22-8-22-8z" fill="#8bbcf2"/><path d="M6 17l22 8v7L6 24z" fill="#4c86cc"/><path d="M50 17L28 25v7l22-8z" fill="#2f6bb0"/>
    <path d="M23 26.5l5 1.8v24l-5-1.8z" fill="url(#gr)"/><path d="M28 28.3l5-1.8v24l-5 1.8z" fill="#d49d10"/>
    <path d="M6 17l22 8" stroke="#fff" stroke-opacity=".5" stroke-width="1"/>
    <path d="M28 13c-9-12-19-4-9 0zM28 13c9-12 19-4 9 0z" fill="url(#gr)" stroke="#b9860b" stroke-width="1"/><circle cx="28" cy="14" r="3.4" fill="#ffd24a" stroke="#b9860b" stroke-width="1"/></svg>`,
  heart: `<svg viewBox="0 0 56 56" width="100%" height="100%"><defs>
    <radialGradient id="hg" cx=".35" cy=".3" r=".85"><stop offset="0" stop-color="#ff8aa0"/><stop offset=".5" stop-color="#e5324f"/><stop offset="1" stop-color="#8f1428"/></radialGradient></defs>
    <ellipse cx="28" cy="52" rx="18" ry="3" fill="#000" opacity=".28"/>
    <path d="M28 49C7 33 5 17 15 11c6-3.5 11 0 13 5 2-5 7-8.500 13-5 10 6 8 22-13 38z" fill="url(#hg)"/>
    <path d="M14 17c1.500-4 5-5.500 8-3.500" stroke="#fff" stroke-opacity=".75" stroke-width="3" fill="none" stroke-linecap="round"/><ellipse cx="19" cy="22" rx="2" ry="3.200" fill="#fff" opacity=".35" transform="rotate(25 19 22)"/></svg>`,
  star: `<svg viewBox="0 0 56 56" width="100%" height="100%"><defs>
    <linearGradient id="sg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff0a0"/><stop offset=".5" stop-color="#ffc928"/><stop offset="1" stop-color="#cf8f05"/></linearGradient></defs>
    <ellipse cx="28" cy="52" rx="18" ry="3" fill="#000" opacity=".28"/>
    <path d="M28 4l7.200 15 16.300 2.300-11.900 11.500 2.900 16.300L28 41.300 13.500 49.100l2.900-16.300L4.500 21.300 20.800 19z" fill="url(#sg)" stroke="#b97d04" stroke-width="1.200" stroke-linejoin="round"/>
    <path d="M28 4v37.300M4.500 21.300l35.100 11M51.500 21.300l-35.100 11" stroke="#b97d04" stroke-opacity=".35" stroke-width="1"/>
    <path d="M28 8l-5.500 11.500" stroke="#fff" stroke-opacity=".8" stroke-width="2.500" stroke-linecap="round"/></svg>`,
  balloon: `<svg viewBox="0 0 56 56" width="100%" height="100%"><defs>
    <radialGradient id="bg1" cx=".35" cy=".3" r=".8"><stop offset="0" stop-color="#c3a8f5"/><stop offset=".55" stop-color="#7d57d3"/><stop offset="1" stop-color="#47288f"/></radialGradient></defs>
    <path d="M28 40c-3 5 4 7-1 14" stroke="#7a7688" stroke-width="1.400" fill="none" stroke-linecap="round"/>
    <path d="M28 4C16 4 10 14 11 23c1 9 9 16 17 16s16-7 17-16C46 14 40 4 28 4z" fill="url(#bg1)"/>
    <path d="M28 39l-3.500 5h7z" fill="#47288f"/><ellipse cx="20" cy="15" rx="4" ry="7" fill="#fff" opacity=".5" transform="rotate(22 20 15)"/></svg>`,
  flower: `<svg viewBox="0 0 56 56" width="100%" height="100%"><defs>
    <radialGradient id="fp" cx=".5" cy=".85" r=".9"><stop offset="0" stop-color="#e0558a"/><stop offset=".6" stop-color="#ff9cc2"/><stop offset="1" stop-color="#ffd4e4"/></radialGradient>
    <radialGradient id="fc" cx=".4" cy=".35" r=".8"><stop offset="0" stop-color="#ffe680"/><stop offset="1" stop-color="#d98e0c"/></radialGradient></defs>
    <ellipse cx="28" cy="52" rx="14" ry="2.600" fill="#000" opacity=".25"/>
    <path d="M28 30v22" stroke="#3e8c3a" stroke-width="3" stroke-linecap="round"/><path d="M28 44c-9-1-12-8-12-8s9-1 12 8zM28 40c8 0 11-7 11-7s-9-1-11 7z" fill="#4fae48" stroke="#2f7a2c" stroke-width=".8"/>
    <g fill="url(#fp)" stroke="#c9487c" stroke-width=".9"><ellipse cx="28" cy="12" rx="6.500" ry="9"/><ellipse cx="28" cy="12" rx="6.500" ry="9" transform="rotate(72 28 24)"/><ellipse cx="28" cy="12" rx="6.500" ry="9" transform="rotate(144 28 24)"/><ellipse cx="28" cy="12" rx="6.500" ry="9" transform="rotate(216 28 24)"/><ellipse cx="28" cy="12" rx="6.500" ry="9" transform="rotate(288 28 24)"/></g>
    <circle cx="28" cy="24" r="6.500" fill="url(#fc)" stroke="#b9780a" stroke-width=".9"/><g fill="#8a5206" opacity=".7"><circle cx="26" cy="22" r=".9"/><circle cx="30" cy="23" r=".9"/><circle cx="28" cy="27" r=".9"/><circle cx="25" cy="26" r=".7"/></g></svg>`,
  cookie: `<svg viewBox="0 0 56 56" width="100%" height="100%"><defs>
    <radialGradient id="cg" cx=".38" cy=".32" r=".85"><stop offset="0" stop-color="#f0c883"/><stop offset=".6" stop-color="#d49a4f"/><stop offset="1" stop-color="#9a6528"/></radialGradient></defs>
    <ellipse cx="28" cy="51" rx="21" ry="3.500" fill="#000" opacity=".28"/>
    <path d="M28 6c4 0 5 3 9 3 5 0 6 5 9 8 3 3 1 7 2 11 1 5-3 7-4 11-1 4-5 5-9 7-4 2-7-1-11-1s-8 3-11 0c-4-3-6-7-6-11 0-3-3-6-2-10 1-5 5-6 8-10 3-3 8-8 15-8z" fill="url(#cg)" stroke="#8a5a22" stroke-width="1.200"/>
    <g fill="#4a2a10"><ellipse cx="19" cy="19" rx="3.600" ry="3" transform="rotate(-20 19 19)"/><ellipse cx="34" cy="16" rx="3.200" ry="2.700"/><ellipse cx="38" cy="31" rx="3.800" ry="3.200" transform="rotate(25 38 31)"/><ellipse cx="22" cy="35" rx="3.400" ry="2.800"/><ellipse cx="29" cy="26" rx="2.600" ry="2.200"/></g>
    <g fill="#fff" opacity=".28"><ellipse cx="18" cy="18" rx="1.400" ry=".9"/><ellipse cx="33" cy="15" rx="1.200" ry=".8"/><ellipse cx="37" cy="30" rx="1.400" ry=".9"/></g>
    <path d="M14 14c4-5 9-7 14-7" stroke="#fff" stroke-opacity=".45" stroke-width="2" fill="none" stroke-linecap="round"/></svg>`
};
// Cute faces make the keepsakes friendlier.
const face = (x, y, s = 1) => `<g transform="translate(${x} ${y}) scale(${s})"><ellipse cx="-8" cy="3.600" rx="2.400" ry="1.400" fill="#ff6f8e" opacity=".55"/><ellipse cx="8" cy="3.600" rx="2.400" ry="1.400" fill="#ff6f8e" opacity=".55"/><circle cx="-5" cy="0" r="2" fill="#2b1b24"/><circle cx="5" cy="0" r="2" fill="#2b1b24"/><circle cx="-4.400" cy="-.7" r=".7" fill="#fff"/><circle cx="5.600" cy="-.7" r=".7" fill="#fff"/><path d="M-3 3.800q3 3.200 6 0" stroke="#2b1b24" stroke-width="1.300" fill="none" stroke-linecap="round"/></g>`;
for (const [k, f] of Object.entries({ heart: face(28, 27), star: face(28, 26, .95), balloon: face(28, 19), cookie: face(28, 29), giftbox: face(38.500, 41, .55), flower: face(28, 24, .55) })) {
  ART[k] = ART[k].replace("</svg>", f + "</svg>");
}
Object.assign(ART, {
  cupcake: `<svg viewBox="0 0 56 56" width="100%" height="100%"><defs><linearGradient id="cu1" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#c98a2c"/><stop offset=".5" stop-color="#f2c15a"/><stop offset="1" stop-color="#bb7d22"/></linearGradient><radialGradient id="cu2" cx=".4" cy=".3" r=".8"><stop offset="0" stop-color="#ffc2dc"/><stop offset="1" stop-color="#e86aa0"/></radialGradient></defs>
    <ellipse cx="28" cy="52" rx="17" ry="3" fill="#000" opacity=".28"/><path d="M12 28h32l-4 22H16z" fill="url(#cu1)"/><path d="M19 28l2 22M26 28l1 22M33 28l-1 22M40 28l-2 22" stroke="#9c6416" stroke-opacity=".4" stroke-width="1.200"/>
    <ellipse cx="28" cy="29" rx="18" ry="6" fill="url(#cu2)"/><ellipse cx="28" cy="21" rx="14" ry="7" fill="url(#cu2)"/><ellipse cx="28" cy="14" rx="9" ry="6" fill="url(#cu2)"/><circle cx="28" cy="7" r="3.600" fill="#e0233f"/><circle cx="27" cy="6" r="1" fill="#fff" opacity=".7"/></svg>`,
  icecream: `<svg viewBox="0 0 56 56" width="100%" height="100%"><defs><radialGradient id="ic1" cx=".4" cy=".3" r=".8"><stop offset="0" stop-color="#ffd0e4"/><stop offset="1" stop-color="#f27eae"/></radialGradient><radialGradient id="ic2" cx=".4" cy=".3" r=".8"><stop offset="0" stop-color="#d4fff0"/><stop offset="1" stop-color="#5ed3ae"/></radialGradient></defs>
    <path d="M14 28h28L28 54z" fill="#e0a85c" stroke="#a8742a" stroke-width="1"/><path d="M19 32l14 16M26 30l12 14M33 30L22 46M24 40l-6-8" stroke="#a8742a" stroke-opacity=".5" stroke-width="1"/>
    <circle cx="28" cy="25" r="14" fill="url(#ic2)"/><circle cx="28" cy="15" r="12" fill="url(#ic1)"/><circle cx="30" cy="4.500" r="3.200" fill="#e0233f"/><path d="M16 26q12 8 24 0" stroke="#fff" stroke-opacity=".5" stroke-width="2" fill="none"/></svg>`,
  teddy: `<svg viewBox="0 0 56 56" width="100%" height="100%"><defs><radialGradient id="te1" cx=".4" cy=".3" r=".85"><stop offset="0" stop-color="#d9a066"/><stop offset="1" stop-color="#8f5a2b"/></radialGradient></defs>
    <ellipse cx="28" cy="52" rx="17" ry="3" fill="#000" opacity=".28"/><circle cx="12" cy="14" r="8" fill="url(#te1)"/><circle cx="44" cy="14" r="8" fill="url(#te1)"/><circle cx="12" cy="14" r="4" fill="#f2c9a0"/><circle cx="44" cy="14" r="4" fill="#f2c9a0"/>
    <circle cx="28" cy="29" r="21" fill="url(#te1)"/><ellipse cx="28" cy="36" rx="9.500" ry="7.500" fill="#f2d3ae"/><ellipse cx="28" cy="33" rx="3.200" ry="2.300" fill="#3a2314"/>
    <circle cx="19" cy="24" r="2.200" fill="#2b1b24"/><circle cx="37" cy="24" r="2.200" fill="#2b1b24"/><circle cx="19.600" cy="23.200" r=".8" fill="#fff"/><circle cx="37.600" cy="23.200" r=".8" fill="#fff"/><path d="M24 39q4 3.500 8 0" stroke="#3a2314" stroke-width="1.400" fill="none" stroke-linecap="round"/><path d="M28 35v2" stroke="#3a2314" stroke-width="1.200"/></svg>`,
  rainbow: `<svg viewBox="0 0 56 56" width="100%" height="100%"><ellipse cx="28" cy="50" rx="22" ry="3" fill="#000" opacity=".25"/>
    <g fill="none" stroke-width="4.200"><path d="M6 44a22 22 0 0144 0" stroke="#e8404f"/><path d="M10.500 44a17.500 17.500 0 0135 0" stroke="#ff9a2e"/><path d="M15 44a13 13 0 0126 0" stroke="#ffd93a"/><path d="M19.500 44a8.500 8.500 0 0117 0" stroke="#4cc06a"/></g>
    <path d="M24 44a4 4 0 018 0" fill="none" stroke="#4aa3f0" stroke-width="4.200"/>
    <g fill="#fff" stroke="#c9d6e8" stroke-width="1"><circle cx="8" cy="44" r="5.500"/><circle cx="14" cy="45" r="5"/><circle cx="48" cy="44" r="5.500"/><circle cx="42" cy="45" r="5"/></g></svg>`,
  sun: `<svg viewBox="0 0 56 56" width="100%" height="100%"><defs><radialGradient id="su1" cx=".4" cy=".35" r=".8"><stop offset="0" stop-color="#fff3a0"/><stop offset="1" stop-color="#ffa91f"/></radialGradient></defs>
    <g fill="#ffb92e" stroke="#e08a0a" stroke-width="1"><path id="ray" d="M28 2l4 8h-8z"/><use href="#ray" transform="rotate(45 28 28)"/><use href="#ray" transform="rotate(90 28 28)"/><use href="#ray" transform="rotate(135 28 28)"/><use href="#ray" transform="rotate(180 28 28)"/><use href="#ray" transform="rotate(225 28 28)"/><use href="#ray" transform="rotate(270 28 28)"/><use href="#ray" transform="rotate(315 28 28)"/></g>
    <circle cx="28" cy="28" r="16" fill="url(#su1)" stroke="#e08a0a" stroke-width="1.200"/><path d="M18 20q4-6 10-6" stroke="#fff" stroke-opacity=".7" stroke-width="2.500" fill="none" stroke-linecap="round"/></svg>`,
  moon: `<svg viewBox="0 0 56 56" width="100%" height="100%"><defs><linearGradient id="mo1" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff7c8"/><stop offset="1" stop-color="#e8c64a"/></linearGradient></defs>
    <ellipse cx="28" cy="52" rx="16" ry="2.800" fill="#000" opacity=".25"/><path d="M36 6a22 22 0 100 44 30 30 0 010-44z" fill="url(#mo1)" stroke="#c9a52a" stroke-width="1.200"/><path d="M44 12l1.500 3.500 3.500 1.500-3.500 1.500L44 22l-1.500-3.500L39 17l3.500-1.500z" fill="#ffe27a"/><path d="M12 14q3-6 9-8" stroke="#fff" stroke-opacity=".7" stroke-width="2.500" fill="none" stroke-linecap="round"/></svg>`,
  butterfly: `<svg viewBox="0 0 56 56" width="100%" height="100%"><defs><radialGradient id="bf1" cx=".7" cy=".5" r=".9"><stop offset="0" stop-color="#ffb3de"/><stop offset="1" stop-color="#b44fe0"/></radialGradient><radialGradient id="bf2" cx=".7" cy=".5" r=".9"><stop offset="0" stop-color="#9fe0ff"/><stop offset="1" stop-color="#4f7be0"/></radialGradient></defs>
    <g stroke="#5a2a8e" stroke-width="1"><path d="M28 28C20 6 4 8 6 22c1 8 12 8 22 6z" fill="url(#bf1)"/><path d="M28 28C36 6 52 8 50 22c-1 8-12 8-22 6z" fill="url(#bf1)"/><path d="M28 30C18 32 10 42 18 48c8 4 10-10 10-18z" fill="url(#bf2)"/><path d="M28 30c10 2 18 12 10 18-8 4-10-10-10-18z" fill="url(#bf2)"/></g>
    <g fill="#fff" opacity=".7"><circle cx="14" cy="18" r="3"/><circle cx="42" cy="18" r="3"/><circle cx="20" cy="42" r="2"/><circle cx="36" cy="42" r="2"/></g>
    <rect x="26" y="16" width="4" height="26" rx="2" fill="#3a2060"/><path d="M27 17q-4-8-7-9M29 17q4-8 7-9" stroke="#3a2060" stroke-width="1.200" fill="none"/><circle cx="27.200" cy="22" r=".9" fill="#fff"/><circle cx="28.800" cy="22" r=".9" fill="#fff"/></svg>`,
  duck: `<svg viewBox="0 0 56 56" width="100%" height="100%"><defs><radialGradient id="du1" cx=".4" cy=".3" r=".85"><stop offset="0" stop-color="#fff08a"/><stop offset="1" stop-color="#f2b705"/></radialGradient></defs>
    <ellipse cx="28" cy="52" rx="20" ry="3" fill="#000" opacity=".28"/><path d="M8 36c0-10 8-12 14-12h14c10 0 14 8 12 16-1 7-8 11-20 11S8 46 8 36z" fill="url(#du1)" stroke="#d29a04" stroke-width="1"/>
    <path d="M34 36c4-6 12-4 12 2-2 4-8 6-12-2z" fill="#f7c92e" stroke="#d29a04" stroke-width="1"/><circle cx="24" cy="18" r="13" fill="url(#du1)" stroke="#d29a04" stroke-width="1"/>
    <path d="M32 20c6-1 10 2 9 4s-7 3-11 0z" fill="#ff8a1f" stroke="#c9600a" stroke-width="1"/><circle cx="25" cy="15" r="2.200" fill="#2b1b24"/><circle cx="25.700" cy="14.200" r=".8" fill="#fff"/><ellipse cx="19" cy="22" rx="2.600" ry="1.500" fill="#ff7d96" opacity=".55"/></svg>`,
  mug: `<svg viewBox="0 0 56 56" width="100%" height="100%"><defs><linearGradient id="mu1" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#e86a5a"/><stop offset=".4" stop-color="#ff9484"/><stop offset="1" stop-color="#c24a3c"/></linearGradient></defs>
    <ellipse cx="26" cy="52" rx="18" ry="3" fill="#000" opacity=".28"/><path d="M10 20h32v22c0 6-4 9-10 9H20c-6 0-10-3-10-9z" fill="url(#mu1)"/><path d="M42 24h4c6 0 6 14 0 14h-4" stroke="#c24a3c" stroke-width="4" fill="none"/>
    <ellipse cx="26" cy="20" rx="16" ry="4.500" fill="#7a4524"/><ellipse cx="26" cy="19.500" rx="13" ry="3" fill="#a8683a"/><path d="M18 14q-3-4 0-8M26 13q-3-4 0-8M34 14q-3-4 0-8" stroke="#fff" stroke-opacity=".7" stroke-width="2" fill="none" stroke-linecap="round"/></svg>`,
  gem: `<svg viewBox="0 0 56 56" width="100%" height="100%"><defs><linearGradient id="ge1" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#d9fbff"/><stop offset="1" stop-color="#2fb4e6"/></linearGradient></defs>
    <ellipse cx="28" cy="52" rx="17" ry="3" fill="#000" opacity=".28"/><path d="M14 8h28l10 12-24 31L4 20z" fill="url(#ge1)" stroke="#1c88b4" stroke-width="1.200" stroke-linejoin="round"/>
    <path d="M4 20h48M14 8l8 12 6 31 6-31 8-12M22 20l6-12 6 12" stroke="#1c88b4" stroke-opacity=".55" stroke-width="1" fill="none"/><path d="M16 11l5 7" stroke="#fff" stroke-width="2.500" stroke-linecap="round"/>
    <path d="M46 4l1.500 3.500L51 9l-3.500 1.500L46 14l-1.500-3.500L41 9l3.500-1.500z" fill="#fff"/></svg>`,
  lollipop: `<svg viewBox="0 0 56 56" width="100%" height="100%"><defs><radialGradient id="lo1" cx=".4" cy=".3" r=".9"><stop offset="0" stop-color="#ffe0ef"/><stop offset="1" stop-color="#ff5fa3"/></radialGradient></defs>
    <rect x="26" y="30" width="4" height="24" rx="2" fill="#f2f2f2" stroke="#c9c9c9" stroke-width=".8"/><circle cx="28" cy="20" r="17" fill="url(#lo1)" stroke="#d83a82" stroke-width="1.200"/>
    <path d="M28 20m0 0a3 3 0 106 0 6 6 0 10-12 0 9 9 0 1018 0 12 12 0 10-24 0" fill="none" stroke="#fff" stroke-width="2.600" stroke-linecap="round" opacity=".9"/><path d="M16 10q4-5 10-6" stroke="#fff" stroke-opacity=".8" stroke-width="2.500" fill="none" stroke-linecap="round"/></svg>`,
  cloud: `<svg viewBox="0 0 56 56" width="100%" height="100%"><defs><linearGradient id="cl1" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#c9defa"/></linearGradient></defs>
    <ellipse cx="28" cy="52" rx="18" ry="2.800" fill="#000" opacity=".22"/><path d="M14 44c-8 0-11-12-3-15 0-10 12-14 18-8 7-6 18 0 16 10 8 2 7 13-2 13z" fill="url(#cl1)" stroke="#9db8e0" stroke-width="1.200"/></svg>`,
});
for (const [k, f] of Object.entries({ cupcake: face(28, 21, .5), icecream: face(28, 16, .5), sun: face(28, 29, .8), moon: face(21, 29, .55), mug: face(26, 37, .65), cloud: face(28, 35, .8) })) {
  ART[k] = ART[k].replace("</svg>", f + "</svg>");
}
const giftArt = g => (g.kind === "scroll" ? scrollArt(g.variant) : THEMED_ART[g.kind] || ART[g.kind]);
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
const OBJECT_KINDS = Object.keys(ART).filter(k => k !== "scroll");
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
let holes, sheetPath, rimPath;

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
  svgEl("stop", { offset: "0", "stop-color": "#f2748d" }, grad);
  svgEl("stop", { offset: ".5", "stop-color": "#e0526f" }, grad);
  svgEl("stop", { offset: "1", "stop-color": "#c93e5c" }, grad);
  const g = svgEl("g", { filter: "url(#crinkle)" }, svg);
  sheetPath = svgEl("path", { fill: "url(#tint)", "fill-rule": "evenodd" }, g);
  // pale fibrous rim along the torn edges
  rimPath = svgEl("path", { fill: "none", stroke: "#fbe3e8", "stroke-width": "2.2", "stroke-linejoin": "round", opacity: ".9" }, svg);
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
  });
  return sheet;
}

function drawSheet() {
  const W = COLS * CELL, H = ROWS * CELL;
  sheetPath.setAttribute("d", `M0 0H${W}V${H}H0Z` + holes.join(""));
  rimPath.setAttribute("d", holes.join(""));
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
  if (THEMED[gift.kind]) Sfx.preset(...THEMED[gift.kind].sfx); else Sfx.play(gift.kind);
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
