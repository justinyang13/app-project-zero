// Shared drawn gift art (used by the punch box and by the punch box collection page).
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
const OBJECT_KINDS = Object.keys(ART).filter(k => k !== "scroll");
