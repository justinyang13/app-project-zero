// Prizes for finishing a punch box, and the different looks each new box can have.
const pz = body => `<svg viewBox="0 0 56 56" width="100%" height="100%">${body}</svg>`;
const pzShadow = `<ellipse cx="28" cy="52" rx="16" ry="2.600" fill="#000" opacity=".25"/>`;

const PRIZES = [
  { id: "medal", name: "Golden Star Medal", blurb: "For opening every last compartment.", art: pz(`<defs><linearGradient id="pz1" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff3a0"/><stop offset=".5" stop-color="#ffc928"/><stop offset="1" stop-color="#c98a05"/></linearGradient></defs>${pzShadow}
    <path d="M16 3l8 20h8L24 3zM40 3l-8 20h-8l8-20z" fill="#e8445f" stroke="#a02838" stroke-width="1" transform="translate(0 0)"/><path d="M16 3h8l4 10-4 10z" fill="#4a7ee0" opacity=".0"/><circle cx="28" cy="34" r="16" fill="url(#pz1)" stroke="#a8740a" stroke-width="1.500"/><circle cx="28" cy="34" r="12" fill="none" stroke="#a8740a" stroke-opacity=".5" stroke-width="1"/>
    <path d="M28 24l3 7 7.500.8-5.600 5 1.700 7.400L28 40.500l-6.600 3.700 1.700-7.400-5.600-5 7.500-.8z" fill="#fff3a0" stroke="#a8740a" stroke-width="1" stroke-linejoin="round"/>`) },
  { id: "rosette", name: "Blue Ribbon Rosette", blurb: "First place for patience and curiosity.", art: pz(`<defs><radialGradient id="pz2" cx=".4" cy=".35" r=".8"><stop offset="0" stop-color="#9ac8ff"/><stop offset="1" stop-color="#2a62c4"/></radialGradient></defs>${pzShadow}
    <path d="M18 30l-6 22 8-5 4 6 4-20zM38 30l6 22-8-5-4 6-4-20z" fill="#2a62c4" stroke="#1b448f" stroke-width="1"/>
    <g fill="url(#pz2)" stroke="#1b448f" stroke-width="1"><circle cx="28" cy="10" r="6"/><circle cx="38" cy="16" r="6"/><circle cx="38" cy="28" r="6"/><circle cx="28" cy="33" r="6"/><circle cx="18" cy="28" r="6"/><circle cx="18" cy="16" r="6"/></g><circle cx="28" cy="22" r="11" fill="#fff" stroke="#1b448f" stroke-width="1.200"/><path d="M28 16l2.200 4.500 5 .7-3.600 3.500.9 5L28 27.300l-4.500 2.400.9-5-3.600-3.500 5-.7z" fill="#ffc928"/>`) },
  { id: "crown", name: "Tiny Crown", blurb: "Wear it while you feel proud.", art: pz(`<defs><linearGradient id="pz3" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff3a0"/><stop offset="1" stop-color="#d49a1a"/></linearGradient></defs>${pzShadow}
    <path d="M6 44L4 16l12 12 12-18 12 18 12-12-2 28z" fill="url(#pz3)" stroke="#a8740a" stroke-width="1.500" stroke-linejoin="round"/><rect x="6" y="42" width="44" height="7" rx="2" fill="#e0a82e" stroke="#a8740a" stroke-width="1.200"/>
    <circle cx="28" cy="34" r="3.500" fill="#e8445f" stroke="#a02838" stroke-width="1"/><circle cx="15" cy="38" r="2.500" fill="#4a7ee0"/><circle cx="41" cy="38" r="2.500" fill="#4fae48"/><circle cx="4" cy="15" r="2.500" fill="#fff3a0"/><circle cx="28" cy="9" r="2.500" fill="#fff3a0"/><circle cx="52" cy="15" r="2.500" fill="#fff3a0"/>`) },
  { id: "rainbow", name: "Rainbow Badge", blurb: "Colors always come back after the rain.", art: pz(`${pzShadow}<circle cx="28" cy="28" r="23" fill="#fff" stroke="#c9cfd8" stroke-width="1.500"/>
    <g fill="none" stroke-width="3.600"><path d="M9 38a19 19 0 0138 0" stroke="#e8404f"/><path d="M13 38a15 15 0 0130 0" stroke="#ff9a2e"/><path d="M17 38a11 11 0 0122 0" stroke="#ffd93a"/><path d="M21 38a7 7 0 0114 0" stroke="#4cc06a"/><path d="M25 38a3 3 0 016 0" stroke="#4aa3f0"/></g><g fill="#e8f0ff" stroke="#c9d6e8"><circle cx="11" cy="39" r="4.500"/><circle cx="45" cy="39" r="4.500"/></g>`) },
  { id: "heartpin", name: "Heart Pin", blurb: "A tiny reminder that you are loved.", art: pz(`<defs><radialGradient id="pz5" cx=".35" cy=".3" r=".85"><stop offset="0" stop-color="#ff8aa0"/><stop offset=".55" stop-color="#e5324f"/><stop offset="1" stop-color="#8f1428"/></radialGradient></defs>${pzShadow}
    <path d="M28 49C7 33 5 17 15 11c6-3.500 11 0 13 5 2-5 7-8.500 13-5 10 6 8 22-13 38z" fill="url(#pz5)" stroke="#7a1020" stroke-width="1"/><path d="M14 17c1.500-4 5-5.500 8-3.500" stroke="#fff" stroke-opacity=".75" stroke-width="3" fill="none" stroke-linecap="round"/><path d="M40 8l1.500 3.500 3.500 1.500-3.500 1.500L40 18l-1.500-3.500L35 13l3.500-1.500z" fill="#fff6b0"/>`) },
  { id: "clover", name: "Lucky Clover", blurb: "Luck finds people who keep trying.", art: pz(`<defs><radialGradient id="pz6" cx=".4" cy=".35" r=".8"><stop offset="0" stop-color="#9fe88a"/><stop offset="1" stop-color="#2f9a3a"/></radialGradient></defs>${pzShadow}
    <path d="M28 30c2 10 4 16 8 20" stroke="#2f7a2c" stroke-width="3" fill="none" stroke-linecap="round"/><g fill="url(#pz6)" stroke="#256a2c" stroke-width="1.200"><path d="M28 28C20 28 14 22 18 14c4-5 10-2 10 6z"/><path d="M28 28c8 0 14-6 10-14-4-5-10-2-10 6z"/><path d="M28 28C20 28 14 34 18 42c4 5 10 2 10-6z"/><path d="M28 28c8 0 14 6 10 14-4 5-10 2-10-6z"/></g><circle cx="28" cy="28" r="2.500" fill="#d8ffcf"/>`) },
  { id: "wand", name: "Sparkle Wand", blurb: "Wave it whenever you need a little courage.", art: pz(`<defs><linearGradient id="pz7" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff3a0"/><stop offset="1" stop-color="#e0a40a"/></linearGradient></defs>${pzShadow}
    <path d="M14 48L36 22" stroke="#7a5ad8" stroke-width="5" stroke-linecap="round"/><path d="M14 48L26 33" stroke="#fff" stroke-opacity=".5" stroke-width="2" stroke-linecap="round"/><path d="M38 6l4.500 9 10 1.400-7.200 7 1.700 10L38 28.500 29 33.400l1.700-10-7.200-7 10-1.400z" fill="url(#pz7)" stroke="#b97d04" stroke-width="1.200" stroke-linejoin="round"/>
    <path d="M10 14l1.500 3 3 1.500-3 1.500L10 23l-1.500-3L5.500 18.500l3-1.500z" fill="#ffe27a"/><circle cx="48" cy="40" r="2" fill="#ffe27a"/>`) },
  { id: "coin", name: "Gold Coin", blurb: "Small treasure for a finished job.", art: pz(`<defs><radialGradient id="pz8" cx=".35" cy=".3" r=".9"><stop offset="0" stop-color="#fff3a0"/><stop offset=".6" stop-color="#ffc928"/><stop offset="1" stop-color="#b97d04"/></radialGradient></defs>${pzShadow}
    <circle cx="28" cy="28" r="22" fill="url(#pz8)" stroke="#a8740a" stroke-width="1.500"/><circle cx="28" cy="28" r="17" fill="none" stroke="#a8740a" stroke-opacity=".6" stroke-width="1.500" stroke-dasharray="2 2.500"/>
    <path d="M28 16l3.500 8 8.500.9-6.400 5.800 1.900 8.500L28 34.500l-7.500 4.700 1.900-8.500-6.400-5.800 8.500-.9z" fill="#ffe27a" stroke="#a8740a" stroke-width="1" stroke-linejoin="round"/><path d="M14 18q4-6 11-8" stroke="#fff" stroke-opacity=".7" stroke-width="2.500" fill="none" stroke-linecap="round"/>`) },
  { id: "kindtrophy", name: "Kindness Trophy", blurb: "For being gentle with yourself today.", art: pz(`<defs><linearGradient id="pz9" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff3a0"/><stop offset=".5" stop-color="#ffc928"/><stop offset="1" stop-color="#cf8f05"/></linearGradient></defs>${pzShadow}
    <path d="M12 12H4c0 10 4 14 10 14M44 12h8c0 10-4 14-10 14" stroke="#cf8f05" stroke-width="3" fill="none" stroke-linecap="round"/><path d="M12 8h32v12c0 10-7 17-16 17S12 30 12 20z" fill="url(#pz9)" stroke="#b97d04" stroke-width="1.200"/><rect x="25" y="36" width="6" height="8" fill="#cf8f05"/><rect x="16" y="44" width="24" height="7" rx="2" fill="#7a4a1c" stroke="#4e2e10" stroke-width="1"/>
    <path d="M28 30C19 24 21 16 25 17c1.500.4 3 2 3 2s1.500-1.600 3-2c4-1 6 7-3 13z" fill="#e8445f" stroke="#a82840" stroke-width=".8"/>`) },
  { id: "sunsticker", name: "Sunshine Sticker", blurb: "Stick it on a cloudy day.", art: pz(`<defs><radialGradient id="pz10" cx=".4" cy=".35" r=".8"><stop offset="0" stop-color="#fff3a0"/><stop offset="1" stop-color="#ffa91f"/></radialGradient></defs>${pzShadow}
    <g fill="#ffb92e" stroke="#e08a0a" stroke-width="1"><path id="pzray" d="M28 3l4 8h-8z"/><use href="#pzray" transform="rotate(45 28 28)"/><use href="#pzray" transform="rotate(90 28 28)"/><use href="#pzray" transform="rotate(135 28 28)"/><use href="#pzray" transform="rotate(180 28 28)"/><use href="#pzray" transform="rotate(225 28 28)"/><use href="#pzray" transform="rotate(270 28 28)"/><use href="#pzray" transform="rotate(315 28 28)"/></g>
    <circle cx="28" cy="28" r="16" fill="url(#pz10)" stroke="#e08a0a" stroke-width="1.200"/><circle cx="22" cy="26" r="2" fill="#2b1b24"/><circle cx="34" cy="26" r="2" fill="#2b1b24"/><path d="M22 32q6 6 12 0" stroke="#2b1b24" stroke-width="1.600" fill="none" stroke-linecap="round"/><ellipse cx="19" cy="31" rx="2.500" ry="1.500" fill="#ff7d96" opacity=".6"/><ellipse cx="37" cy="31" rx="2.500" ry="1.500" fill="#ff7d96" opacity=".6"/>`) },
  { id: "rocket", name: "Rocket Patch", blurb: "Blast off toward something good.", art: pz(`<defs><linearGradient id="pz11" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#d0d8e8"/><stop offset=".5" stop-color="#ffffff"/><stop offset="1" stop-color="#9aa6bc"/></linearGradient></defs>${pzShadow}
    <path d="M28 4c8 6 10 16 9 28H19c-1-12 1-22 9-28z" fill="url(#pz11)" stroke="#6a7288" stroke-width="1.200"/><path d="M19 28l-8 10 8-1zM37 28l8 10-8-1z" fill="#e8445f" stroke="#a02838" stroke-width="1"/><circle cx="28" cy="18" r="5" fill="#8fd6ff" stroke="#3a78a8" stroke-width="1.200"/><path d="M22 32h12l-2 5H24z" fill="#6a7288"/>
    <path d="M24 38q4 12 4 14 0-2 4-14z" fill="#ffb02e" stroke="#e0680a" stroke-width="1"/><path d="M26 38q2 6 2 8 0-2 2-8z" fill="#fff3a0"/>`) },
  { id: "bracelet", name: "Friendship Bracelet", blurb: "Share your good news with someone.", art: pz(`${pzShadow}<g stroke-width="1" stroke="#0004">
    <circle cx="28" cy="8" r="5" fill="#ff7a9a"/><circle cx="40" cy="12" r="5" fill="#ffd45e"/><circle cx="47" cy="23" r="5" fill="#7be07b"/><circle cx="47" cy="36" r="5" fill="#6fb3ff"/><circle cx="40" cy="46" r="5" fill="#b07bff"/><circle cx="28" cy="49" r="5" fill="#ff7a9a"/><circle cx="16" cy="46" r="5" fill="#ffd45e"/><circle cx="9" cy="36" r="5" fill="#7be07b"/><circle cx="9" cy="23" r="5" fill="#6fb3ff"/><circle cx="16" cy="12" r="5" fill="#b07bff"/></g>
    <g fill="#fff" opacity=".7"><circle cx="26.500" cy="6.500" r="1.500"/><circle cx="38.500" cy="10.500" r="1.500"/><circle cx="45.500" cy="21.500" r="1.500"/><circle cx="14.500" cy="10.500" r="1.500"/></g><path d="M28 28l2.500 5 5.500.8-4 3.900 1 5.500L28 40.500l-5 2.700 1-5.500-4-3.900 5.500-.8z" fill="#ffe27a" stroke="#c99a1b" stroke-width="1"/>`) }
];

// A new look for every box: colours of the cardboard, the paper, and a pattern printed on the paper.
const DESIGNS = [
  { name: "Classic kraft", box: ["#c79a64", "#b58650", "#c4955d"], paper: ["#f2748d", "#e0526f", "#c93e5c"], rim: "#fbe3e8", pattern: "none" },
  { name: "Ocean blue", box: ["#7f9fc0", "#6786a8", "#7896b8"], paper: ["#7fe0f0", "#3fb0d8", "#2a85bd"], rim: "#e8fbff", pattern: "dots" },
  { name: "Sunny stripes", box: ["#9fcf9f", "#82b882", "#94c694"], paper: ["#fff0a0", "#ffd23f", "#ecaa10"], rim: "#fff8d8", pattern: "stripes" },
  { name: "Lavender night", box: ["#b4a6dc", "#9888c8", "#ac9cd4"], paper: ["#fff0b8", "#ffd96a", "#e8b030"], rim: "#fff8e0", pattern: "stars" },
  { name: "Rose garden", box: ["#ecb0c0", "#dc92a8", "#e6a4b8"], paper: ["#b8f4d8", "#6ad8aa", "#38b488"], rim: "#effff8", pattern: "dots" },
  { name: "Midnight", box: ["#56669a", "#44548a", "#505f94"], paper: ["#d8ccff", "#ac98f4", "#7c64d4"], rim: "#f0eaff", pattern: "stars" },
  { name: "Peppermint", box: ["#ffffff", "#e4e8ef", "#f4f6fa"], paper: ["#ff8a8a", "#e8445f", "#b8283f"], rim: "#fff0f0", pattern: "stripes" },
  { name: "Autumn", box: ["#d49a5a", "#bf7e3c", "#cc9050"], paper: ["#ffbf6a", "#f08a30", "#c85a12"], rim: "#fff0dc", pattern: "dots" }
];

// The collection is kept in this browser only.
const PrizeStore = (() => {
  const KEY = "heartnote-prizes";
  let mem = [];
  const read = () => { try { return JSON.parse(localStorage.getItem(KEY)) || mem; } catch { return mem; } };
  return {
    all: read,
    add(p) { const list = [...read(), p]; mem = list; try { localStorage.setItem(KEY, JSON.stringify(list)); } catch {} return list; },
    clear() { mem = []; try { localStorage.removeItem(KEY); } catch {} }
  };
})();

// Every finished punch box is remembered per feeling so each feeling gets its own punch box collection.
const BoxStore = (() => {
  const KEY = "heartnote-boxes";
  let mem = [];
  const read = () => { try { return JSON.parse(localStorage.getItem(KEY)) || mem; } catch { return mem; } };
  return {
    forFeeling: f => read().filter(b => b.feeling === f),
    add(b) { const list = [...read(), b]; mem = list; try { localStorage.setItem(KEY, JSON.stringify(list)); } catch {} return list; }
  };
})();
