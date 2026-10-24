// Feeling-specific gifts: each feeling has 3 extra drawn keepsakes that fit it. In a box they take the
// place of 3 generic keepsakes (and borrow those slots' animations, so no two gifts ever move alike).
const tface = (x, y, s = 1) => `<g transform="translate(${x} ${y}) scale(${s})"><ellipse cx="-8" cy="3.600" rx="2.400" ry="1.400" fill="#ff6f8e" opacity=".55"/><ellipse cx="8" cy="3.600" rx="2.400" ry="1.400" fill="#ff6f8e" opacity=".55"/><circle cx="-5" cy="0" r="2" fill="#2b1b24"/><circle cx="5" cy="0" r="2" fill="#2b1b24"/><circle cx="-4.400" cy="-.7" r=".7" fill="#fff"/><circle cx="5.600" cy="-.7" r=".7" fill="#fff"/><path d="M-3 3.800q3 3.200 6 0" stroke="#2b1b24" stroke-width="1.300" fill="none" stroke-linecap="round"/></g>`;
const sh = (rx = 18) => `<ellipse cx="28" cy="52" rx="${rx}" ry="3" fill="#000" opacity=".26"/>`;
const svg = body => `<svg viewBox="0 0 56 56" width="100%" height="100%">${body}</svg>`;

const THEMED_ART = {
  umbrella: svg(`<defs><linearGradient id="um" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#6fb3ff"/><stop offset="1" stop-color="#2d62c4"/></linearGradient></defs>${sh(14)}
    <path d="M28 8v-3" stroke="#555" stroke-width="2.200" stroke-linecap="round"/><path d="M28 46v-2c0 5-9 5-9 0" transform="translate(0 2)" stroke="#6b3f1d" stroke-width="3" fill="none" stroke-linecap="round"/>
    <path d="M28 27v17" stroke="#6b3f1d" stroke-width="3" stroke-linecap="round"/><path d="M5 30C5 16 15 8 28 8s23 8 23 22c-3-4-6-4-8.500 0-2.500-4-5.500-4-8 0-3-4-6-4-8 0-3-4-5.500-4-8 0-2.500-4-5.500-4-8.500 0z" fill="url(#um)" stroke="#1f4a9a" stroke-width="1.200"/>
    <path d="M28 8C22 14 20 22 20 30M28 8c6 6 8 14 8 22" stroke="#fff" stroke-opacity=".35" stroke-width="1.200" fill="none"/>${tface(28, 21, .55)}`),
  tissues: svg(`<defs><linearGradient id="ti" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#a8dcff"/><stop offset="1" stop-color="#4f9bd8"/></linearGradient></defs>${sh(19)}
    <path d="M18 22c-2-10 6-14 8-6 1-9 9-11 10-1 4-5 8 1 5 8z" fill="#fff" stroke="#c5d6ea" stroke-width="1"/><path d="M26 16c1 3 0 5-2 7M36 15c-1 3 0 5 2 7" stroke="#c5d6ea" fill="none" stroke-width=".8"/>
    <rect x="8" y="22" width="40" height="28" rx="4" fill="url(#ti)" stroke="#2f77b4" stroke-width="1.200"/><ellipse cx="28" cy="22" rx="15" ry="3" fill="#2a6a9e"/>
    <path d="M12 28h6M38 28h6" stroke="#fff" stroke-opacity=".5" stroke-width="1.500" stroke-linecap="round"/>${tface(28, 38, .8)}`),
  candle: svg(`<defs><linearGradient id="ca" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#f2e6c8"/><stop offset=".5" stop-color="#fffaf0"/><stop offset="1" stop-color="#d8c79c"/></linearGradient><radialGradient id="cf" cx=".5" cy=".7" r=".6"><stop offset="0" stop-color="#fff7b0"/><stop offset=".6" stop-color="#ffb02e"/><stop offset="1" stop-color="#ff6a1a"/></radialGradient></defs>${sh(15)}
    <circle cx="28" cy="13" r="12" fill="#ffd36b" opacity=".25"/><path d="M28 3c6 6 7 10 4 13a6 6 0 01-8 0c-3-3-1-7 4-13z" fill="url(#cf)"/><path d="M28 17v4" stroke="#333" stroke-width="1.500"/>
    <path d="M17 24h22v24c0 3-3 4-6 4H23c-3 0-6-1-6-4z" fill="url(#ca)" stroke="#c9b98a" stroke-width="1"/><path d="M17 24h22l-1 3c-3 3-5 0-8 3-3-3-5 0-8-3z" fill="#fffdf6"/>${tface(28, 38, .75)}`),
  feather: svg(`<defs><linearGradient id="fe" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#e8f4ff"/><stop offset="1" stop-color="#8bbbe8"/></linearGradient></defs><ellipse cx="30" cy="52" rx="12" ry="2.400" fill="#000" opacity=".2"/>
    <path d="M10 48C8 24 24 6 48 6c0 22-14 38-34 42z" fill="url(#fe)" stroke="#6a98c8" stroke-width="1.200"/><path d="M10 48L46 8" stroke="#6a98c8" stroke-width="1.600" stroke-linecap="round"/>
    <path d="M18 40l8-2M22 34l9-3M27 28l9-3M32 22l8-2M20 44l4-1" stroke="#fff" stroke-opacity=".8" stroke-width="1" stroke-linecap="round"/>`),
  lavender: svg(`<defs><linearGradient id="la" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#c9a8ff"/><stop offset="1" stop-color="#8a5ad8"/></linearGradient></defs>${sh(13)}
    <g stroke="#4d8c3a" stroke-width="2" stroke-linecap="round" fill="none"><path d="M28 50V20M22 50l-6-28M34 50l6-28"/></g>
    <g fill="url(#la)" stroke="#6a3fb5" stroke-width=".6"><ellipse cx="28" cy="8" rx="3" ry="4.500"/><ellipse cx="26" cy="14" rx="3" ry="4"/><ellipse cx="30" cy="14" rx="3" ry="4"/><ellipse cx="26" cy="20" rx="3" ry="4"/><ellipse cx="30" cy="20" rx="3" ry="4"/>
    <ellipse cx="16" cy="14" rx="2.600" ry="4"/><ellipse cx="14.500" cy="20" rx="2.600" ry="3.600"/><ellipse cx="17.500" cy="20" rx="2.600" ry="3.600"/><ellipse cx="40" cy="14" rx="2.600" ry="4"/><ellipse cx="38.500" cy="20" rx="2.600" ry="3.600"/><ellipse cx="41.500" cy="20" rx="2.600" ry="3.600"/></g>
    <path d="M20 44q8 6 16 0l-2 5q-6 3-12 0z" fill="#ff9ec1" stroke="#d0608a" stroke-width=".8"/>`),
  zenstones: svg(`<defs><radialGradient id="zs" cx=".35" cy=".3" r=".9"><stop offset="0" stop-color="#d7d9de"/><stop offset="1" stop-color="#6e7380"/></radialGradient></defs>${sh(20)}
    <ellipse cx="28" cy="42" rx="19" ry="9" fill="url(#zs)" stroke="#555a66" stroke-width="1"/><ellipse cx="28" cy="29" rx="13" ry="7" fill="url(#zs)" stroke="#555a66" stroke-width="1"/><ellipse cx="28" cy="18" rx="8" ry="5" fill="url(#zs)" stroke="#555a66" stroke-width="1"/>
    <path d="M18 38q4-3 8-2" stroke="#fff" stroke-opacity=".5" stroke-width="2" fill="none" stroke-linecap="round"/>${tface(28, 42, .65)}`),
  pillow: svg(`<defs><linearGradient id="pi" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#cfe4ff"/><stop offset="1" stop-color="#7aa6e0"/></linearGradient></defs>${sh(20)}
    <path d="M6 14q22-8 44 0 4 14 0 28-22 8-44 0-4-14 0-28z" fill="url(#pi)" stroke="#4f78b8" stroke-width="1.200"/><path d="M6 14l5 4M50 14l-5 4M6 42l5-4M50 42l-5-4" stroke="#4f78b8" stroke-opacity=".6" stroke-width="1"/>
    <path d="M12 22q16-5 32 0" stroke="#fff" stroke-opacity=".55" stroke-width="2.500" fill="none" stroke-linecap="round"/>${tface(28, 30, 1)}`),
  ice: svg(`<defs><linearGradient id="ic" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#eefcff"/><stop offset="1" stop-color="#8fd6f0"/></linearGradient></defs>${sh(17)}
    <path d="M10 18l18-9 18 9v22L28 49 10 40z" fill="url(#ic)" stroke="#4aa8cc" stroke-width="1.200" stroke-linejoin="round" opacity=".95"/><path d="M10 18l18 9 18-9M28 27v22" stroke="#4aa8cc" stroke-opacity=".6" stroke-width="1" fill="none"/>
    <path d="M14 22l6 3" stroke="#fff" stroke-width="2.500" stroke-linecap="round"/>${tface(28, 36, .7)}`),
  glove: svg(`<defs><radialGradient id="gl" cx=".35" cy=".3" r=".9"><stop offset="0" stop-color="#ff7a7a"/><stop offset="1" stop-color="#b3202a"/></radialGradient></defs>${sh(17)}
    <path d="M14 22c0-10 8-16 18-16 11 0 18 6 18 16v8c0 6-4 9-9 9H20c-4 0-6-3-6-7z" fill="url(#gl)" stroke="#7a1019" stroke-width="1.200"/><path d="M12 26c-4 2-4 10 2 11l4-3z" fill="url(#gl)" stroke="#7a1019" stroke-width="1.200"/>
    <rect x="17" y="38" width="26" height="12" rx="3" fill="#f6f0e4" stroke="#bdb39a" stroke-width="1"/><path d="M22 38v12M28 38v12M34 38v12" stroke="#d6cdb8" stroke-width="1"/>
    <path d="M22 12q8-4 16 0" stroke="#fff" stroke-opacity=".55" stroke-width="3" fill="none" stroke-linecap="round"/>${tface(32, 24, .7)}`),
  chat: svg(`<defs><linearGradient id="ch" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffd0e4"/><stop offset="1" stop-color="#ff7bb0"/></linearGradient></defs>${sh(18)}
    <path d="M8 12h40a4 4 0 014 4v20a4 4 0 01-4 4H26l-10 9v-9H8a4 4 0 01-4-4V16a4 4 0 014-4z" fill="url(#ch)" stroke="#d04a86" stroke-width="1.200"/>
    <path d="M28 33C16 25 19 17 24 18c2 1 4 3 4 3s2-2 4-3c5-1 8 7-4 15z" fill="#e8445f" stroke="#a82840" stroke-width=".8"/><path d="M10 16h8" stroke="#fff" stroke-opacity=".7" stroke-width="2" stroke-linecap="round"/>`),
  lantern: svg(`<defs><radialGradient id="lg" cx=".5" cy=".5" r=".6"><stop offset="0" stop-color="#fff6b8"/><stop offset="1" stop-color="#ffb02e"/></radialGradient></defs>${sh(14)}
    <path d="M20 10q8-9 16 0" stroke="#4a3a2a" stroke-width="2" fill="none"/><rect x="18" y="10" width="20" height="5" rx="2" fill="#4a3a2a"/><rect x="18" y="45" width="20" height="5" rx="2" fill="#4a3a2a"/>
    <path d="M18 15h20l3 15-3 15H18l-3-15z" fill="url(#lg)" stroke="#4a3a2a" stroke-width="1.500"/><path d="M28 15v30M22 15l-2 30M34 15l2 30" stroke="#4a3a2a" stroke-opacity=".5" stroke-width="1"/>${tface(28, 31, .7)}`),
  plane: svg(`<defs><linearGradient id="pl" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#bcd4f0"/></linearGradient></defs><ellipse cx="30" cy="52" rx="14" ry="2.400" fill="#000" opacity=".2"/>
    <path d="M4 26L52 6 40 46 28 32z" fill="url(#pl)" stroke="#6a8fc0" stroke-width="1.200" stroke-linejoin="round"/><path d="M4 26l24 6L52 6" fill="none" stroke="#6a8fc0" stroke-width="1" stroke-linejoin="round"/><path d="M28 32l-2 12 6-9z" fill="#9db8da" stroke="#6a8fc0" stroke-width="1"/>
    <path d="M2 40q6-2 10 0M0 46q8-2 12 0" stroke="#8fb0e0" stroke-width="1.500" fill="none" stroke-linecap="round"/><path d="M44 16l3-1" stroke="#e8445f" stroke-width="1.500"/>`),
  checklist: svg(`<defs><linearGradient id="cl" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fffef2"/><stop offset="1" stop-color="#ece6c8"/></linearGradient></defs>${sh(16)}
    <rect x="9" y="8" width="38" height="43" rx="3" fill="#a8743e" stroke="#7a5128" stroke-width="1.200"/><rect x="13" y="13" width="30" height="35" fill="url(#cl)"/><rect x="20" y="5" width="16" height="8" rx="2" fill="#9aa0aa" stroke="#6a7078" stroke-width="1"/>
    <path d="M16 22l3 3 5-6M16 32l3 3 5-6" stroke="#2fa05a" stroke-width="2.200" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="M28 23h12M28 33h12" stroke="#9a9680" stroke-width="1.600" stroke-linecap="round"/><rect x="16" y="40" width="5" height="5" fill="none" stroke="#9a9680" stroke-width="1.200"/><path d="M28 43h9" stroke="#9a9680" stroke-width="1.600" stroke-linecap="round"/>`),
  water: svg(`<defs><linearGradient id="wa" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#bfe9ff"/><stop offset="1" stop-color="#4aa6e0"/></linearGradient></defs>${sh(15)}
    <path d="M12 8h32l-4 40c0 3-3 4-6 4H22c-3 0-6-1-6-4z" fill="#e8f6ff" fill-opacity=".55" stroke="#8cc4e8" stroke-width="1.500"/><path d="M14 18h28l-3 30c0 3-3 3-5 3H22c-3 0-5 0-5-3z" fill="url(#wa)" opacity=".9"/>
    <path d="M14 18q7 3 14 0t14 0" stroke="#fff" stroke-opacity=".7" stroke-width="1.500" fill="none"/><circle cx="22" cy="30" r="1.800" fill="#fff" opacity=".7"/><circle cx="35" cy="38" r="1.400" fill="#fff" opacity=".7"/>${tface(28, 36, .7)}`),
  headphones: svg(`${sh(18)}<path d="M10 36V28C10 14 18 6 28 6s18 8 18 22v8" stroke="#3a3f55" stroke-width="5" fill="none" stroke-linecap="round"/>
    <rect x="6" y="30" width="12" height="20" rx="6" fill="#ff6f91" stroke="#b83a5c" stroke-width="1.200"/><rect x="38" y="30" width="12" height="20" rx="6" fill="#ff6f91" stroke="#b83a5c" stroke-width="1.200"/>
    <rect x="9" y="34" width="4" height="12" rx="2" fill="#ffd0dc"/><rect x="43" y="34" width="4" height="12" rx="2" fill="#ffd0dc"/>
    <g fill="#7a5ad8"><circle cx="24" cy="30" r="2.200"/><path d="M26 30V20l8-2v9" stroke="#7a5ad8" stroke-width="1.500" fill="none"/><circle cx="32" cy="27" r="2.200"/></g>`),
  anchor: svg(`<defs><linearGradient id="an" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#5a7fb8"/><stop offset="1" stop-color="#1e3a68"/></linearGradient></defs>${sh(17)}
    <circle cx="28" cy="10" r="5" fill="none" stroke="url(#an)" stroke-width="3.500"/><path d="M28 15v33M18 24h20" stroke="url(#an)" stroke-width="4" stroke-linecap="round"/>
    <path d="M8 34c2 10 9 15 20 15s18-5 20-15" stroke="url(#an)" stroke-width="4.500" fill="none" stroke-linecap="round"/><path d="M4 32l6-1 1 7zM52 32l-6-1-1 7z" fill="#1e3a68"/><path d="M24 20l-6-6" stroke="#c8a24a" stroke-width="1.500" fill="none"/>`),
  pause: svg(`<defs><radialGradient id="pa" cx=".35" cy=".3" r=".9"><stop offset="0" stop-color="#9ad0ff"/><stop offset="1" stop-color="#2a62c8"/></radialGradient></defs>${sh(18)}
    <circle cx="28" cy="27" r="22" fill="url(#pa)" stroke="#1b448f" stroke-width="1.500"/><rect x="19" y="16" width="6.500" height="22" rx="2" fill="#fff"/><rect x="30.500" y="16" width="6.500" height="22" rx="2" fill="#fff"/>
    <path d="M12 16q6-8 16-8" stroke="#fff" stroke-opacity=".5" stroke-width="3" fill="none" stroke-linecap="round"/>`),
  lighthouse: svg(`<defs><linearGradient id="lh" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#e8e8ee"/><stop offset="1" stop-color="#b5b8c8"/></linearGradient></defs>${sh(18)}
    <path d="M20 52l3-34h10l3 34z" fill="url(#lh)" stroke="#8a8da0" stroke-width="1.200"/><path d="M21.500 36h13l.8 8H20.700zM22.500 24h11l.5 6H22z" fill="#e8445f"/><rect x="21" y="12" width="14" height="7" rx="1" fill="#ffd45e" stroke="#c99a1b" stroke-width="1"/>
    <path d="M19 12h18l-9-8z" fill="#444a5e"/><path d="M36 15l16-5v10zM20 15L4 10v10z" fill="#ffe27a" opacity=".6"/>${tface(28, 31, .45)}`),
  sleepmask: svg(`<defs><linearGradient id="sm" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#9b8cf0"/><stop offset="1" stop-color="#4b3aa8"/></linearGradient></defs>${sh(20)}
    <path d="M4 26c0-8 8-12 14-10 4 1 6 3 10 3s6-2 10-3c6-2 14 2 14 10 0 10-8 16-14 16-4 0-7-4-10-4s-6 4-10 4C12 42 4 36 4 26z" fill="url(#sm)" stroke="#2e2078" stroke-width="1.200"/>
    <path d="M12 28q5 4 10 0M34 28q5 4 10 0" stroke="#fff" stroke-width="2" fill="none" stroke-linecap="round"/><path d="M14 31l-2 3M19 32l-1 3M37 32l1 3M42 31l2 3" stroke="#fff" stroke-width="1.200" stroke-linecap="round"/>
    <path d="M26 36q2 2 4 0" stroke="#fff" stroke-width="1.500" fill="none" stroke-linecap="round"/><path d="M46 10l1.500 3 3 1.500-3 1.500L46 19l-1.500-3-3-1.500 3-1.500z" fill="#ffe27a"/>`),
  clock: svg(`<defs><radialGradient id="ck" cx=".4" cy=".3" r=".9"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#e2e6f0"/></radialGradient></defs>${sh(17)}
    <circle cx="14" cy="12" r="7" fill="#ffb02e" stroke="#c9801a" stroke-width="1.200"/><circle cx="42" cy="12" r="7" fill="#ffb02e" stroke="#c9801a" stroke-width="1.200"/><path d="M12 48l-4 5M44 48l4 5" stroke="#555" stroke-width="3" stroke-linecap="round"/>
    <circle cx="28" cy="30" r="21" fill="#e8445f" stroke="#a02838" stroke-width="1.500"/><circle cx="28" cy="30" r="16.500" fill="url(#ck)"/><path d="M28 30V19M28 30l7 4" stroke="#2b2b3a" stroke-width="2.200" stroke-linecap="round"/><circle cx="28" cy="30" r="2" fill="#2b2b3a"/>
    <path d="M28 15v2M28 43v2M13 30h2M41 30h2" stroke="#555" stroke-width="1.500" stroke-linecap="round"/>`),
  battery: svg(`<defs><linearGradient id="ba" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#8fe08f"/><stop offset="1" stop-color="#2fa05a"/></linearGradient></defs>${sh(18)}
    <rect x="22" y="3" width="12" height="6" rx="2" fill="#6a7078"/><rect x="12" y="8" width="32" height="44" rx="6" fill="#2b3040" stroke="#161a24" stroke-width="1.200"/>
    <rect x="16" y="14" width="24" height="9" rx="2" fill="url(#ba)"/><rect x="16" y="26" width="24" height="9" rx="2" fill="url(#ba)"/><rect x="16" y="38" width="24" height="9" rx="2" fill="#4a5064"/>
    <path d="M30 20l-8 12h6l-2 12 10-14h-6z" fill="#ffe27a" stroke="#c99a1b" stroke-width=".8"/>`),
  bandage: svg(`<defs><linearGradient id="bd" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffe0bd"/><stop offset="1" stop-color="#e7b680"/></linearGradient></defs>${sh(18)}
    <g transform="rotate(-35 28 28)"><rect x="3" y="18" width="50" height="20" rx="10" fill="url(#bd)" stroke="#b98450" stroke-width="1.200"/><rect x="19" y="18" width="18" height="20" fill="#f6efe2" stroke="#d6c8ac" stroke-width="1"/>
    <g fill="#c9945c" opacity=".7"><circle cx="9" cy="24" r=".9"/><circle cx="9" cy="32" r=".9"/><circle cx="13" cy="28" r=".9"/><circle cx="47" cy="24" r=".9"/><circle cx="47" cy="32" r=".9"/><circle cx="43" cy="28" r=".9"/></g>
    <path d="M28 33C21 28 23 23 26 24c1 .5 2 1.500 2 1.500s1-1 2-1.500c3-1 5 4-2 8.500z" fill="#e8445f"/></g>`),
  eraser: svg(`<defs><linearGradient id="er" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffb3c7"/><stop offset="1" stop-color="#f2688f"/></linearGradient></defs>${sh(20)}
    <path d="M6 28l16-12h28v24H22z" fill="url(#er)" stroke="#c24272" stroke-width="1.200" stroke-linejoin="round"/><path d="M30 16h20v24H30z" fill="#4f8fd6" stroke="#2f69a8" stroke-width="1.200"/><path d="M30 16v24" stroke="#fff" stroke-opacity=".5" stroke-width="2"/>
    <g fill="#f2a0b8"><circle cx="8" cy="46" r="1.800"/><circle cx="14" cy="49" r="1.300"/><circle cx="20" cy="46" r="1.600"/></g>${tface(19, 29, .55)}`),
  dove: svg(`<defs><linearGradient id="dv" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#cfd9ea"/></linearGradient></defs><ellipse cx="28" cy="52" rx="14" ry="2.400" fill="#000" opacity=".2"/>
    <path d="M8 30c4-10 14-12 22-8 2-6 8-9 14-6-2 2-4 4-4 7 4 2 6 6 4 10-4 8-16 10-26 8-6-1-10-4-10-11z" fill="url(#dv)" stroke="#a9b8d2" stroke-width="1.200"/>
    <path d="M18 24c-6-12 4-18 12-14 4 2 3 8-2 10z" fill="url(#dv)" stroke="#a9b8d2" stroke-width="1.200"/><path d="M44 18l6 2-6 2z" fill="#ffb02e" stroke="#c9801a" stroke-width=".8"/><circle cx="40" cy="18" r="1.500" fill="#2b2b3a"/>
    <path d="M36 36c6 4 12 2 16-2M44 34l2-4M49 33l2-3" stroke="#4fae48" stroke-width="1.500" fill="none" stroke-linecap="round"/><ellipse cx="46" cy="30" rx="2.200" ry="1.200" fill="#4fae48" transform="rotate(-30 46 30)"/>`),
  partyhat: svg(`<defs><linearGradient id="ph" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ff9ad0"/><stop offset="1" stop-color="#8f5ae0"/></linearGradient></defs>${sh(17)}
    <path d="M28 6L8 50h40z" fill="url(#ph)" stroke="#5a2ab0" stroke-width="1.200" stroke-linejoin="round"/><path d="M20 30l22 8M16 40l26 9M24 18l16 6" stroke="#ffe27a" stroke-width="2.500" stroke-linecap="round"/>
    <circle cx="28" cy="6" r="5" fill="#ffe27a" stroke="#c99a1b" stroke-width="1"/><path d="M8 50q20 6 40 0" stroke="#5a2ab0" stroke-width="2" fill="none"/>${tface(28, 38, .65)}`),
  camera: svg(`<defs><linearGradient id="cm" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5a6070"/><stop offset="1" stop-color="#2a2e3a"/></linearGradient><radialGradient id="cn" cx=".35" cy=".3" r=".9"><stop offset="0" stop-color="#9ad0ff"/><stop offset=".5" stop-color="#2a4a88"/><stop offset="1" stop-color="#0e1a38"/></radialGradient></defs>${sh(20)}
    <path d="M10 18h8l3-5h14l3 5h8a5 5 0 015 5v22a5 5 0 01-5 5H10a5 5 0 01-5-5V23a5 5 0 015-5z" fill="url(#cm)" stroke="#161a24" stroke-width="1.200"/><rect x="5" y="26" width="46" height="8" fill="#e8445f" opacity=".85"/>
    <circle cx="28" cy="32" r="12" fill="#c8ccd6" stroke="#161a24" stroke-width="1.200"/><circle cx="28" cy="32" r="9" fill="url(#cn)"/><circle cx="24" cy="28" r="2.500" fill="#fff" opacity=".8"/><rect x="40" y="20" width="6" height="3" rx="1" fill="#ffe27a"/>`),
  trophy: svg(`<defs><linearGradient id="tr" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff3a0"/><stop offset=".5" stop-color="#ffc928"/><stop offset="1" stop-color="#cf8f05"/></linearGradient></defs>${sh(16)}
    <path d="M12 12H4c0 10 4 14 10 14M44 12h8c0 10-4 14-10 14" stroke="#cf8f05" stroke-width="3" fill="none" stroke-linecap="round"/><path d="M12 8h32v12c0 10-7 17-16 17S12 30 12 20z" fill="url(#tr)" stroke="#b97d04" stroke-width="1.200"/>
    <rect x="25" y="36" width="6" height="8" fill="#cf8f05"/><rect x="16" y="44" width="24" height="7" rx="2" fill="#7a4a1c" stroke="#4e2e10" stroke-width="1"/><path d="M18 12l-1 12" stroke="#fff" stroke-opacity=".7" stroke-width="2.500" stroke-linecap="round"/>${tface(28, 22, .75)}`),
  card: svg(`<defs><linearGradient id="cd" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff6f0"/><stop offset="1" stop-color="#f6d8c8"/></linearGradient></defs>${sh(20)}
    <rect x="6" y="12" width="44" height="34" rx="3" fill="url(#cd)" stroke="#c99a84" stroke-width="1.200"/><path d="M6 14l22 18 22-18" stroke="#c99a84" stroke-width="1.200" fill="none"/>
    <path d="M28 44C14 34 17 24 22 25c2 .5 4 3 6 3s4-2.500 6-3c5-1 8 9-6 19z" fill="#e8445f" stroke="#a82840" stroke-width=".8" transform="translate(0 -8) scale(1)"/><path d="M14 40h12M30 40h12" stroke="#c99a84" stroke-width="1.200" stroke-linecap="round" opacity=".7"/>`),
  seedling: svg(`<defs><linearGradient id="sd" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#e8955a"/><stop offset="1" stop-color="#a8552a"/></linearGradient><linearGradient id="sl" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#9ae07a"/><stop offset="1" stop-color="#3f9a3a"/></linearGradient></defs>${sh(16)}
    <path d="M28 30V18" stroke="#3f8a3a" stroke-width="2.500" stroke-linecap="round"/><path d="M28 20C20 20 14 14 14 6c8 0 14 6 14 14zM28 22c8 0 14-6 14-14-8 0-14 6-14 14z" fill="url(#sl)" stroke="#2f7a2c" stroke-width="1"/>
    <path d="M12 32h32l-4 18H16z" fill="url(#sd)" stroke="#7a3a16" stroke-width="1.200"/><rect x="10" y="29" width="36" height="6" rx="2" fill="#c06a36" stroke="#7a3a16" stroke-width="1.200"/>${tface(28, 42, .6)}`),
  journal: svg(`<defs><linearGradient id="jn" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#4fc0b8"/><stop offset="1" stop-color="#1f7a78"/></linearGradient></defs>${sh(18)}
    <rect x="10" y="6" width="34" height="44" rx="3" fill="url(#jn)" stroke="#145452" stroke-width="1.200"/><rect x="8" y="6" width="6" height="44" rx="2" fill="#145452"/><rect x="20" y="14" width="18" height="14" rx="2" fill="#fff6dc" stroke="#c9b98a" stroke-width="1"/>
    <path d="M23 19h12M23 23h8" stroke="#a89a70" stroke-width="1.200" stroke-linecap="round"/><path d="M40 6v26l-3-3-3 3V6" fill="#e8445f"/><g transform="rotate(35 46 40)"><rect x="42" y="14" width="5" height="32" rx="2" fill="#ffd45e" stroke="#c99a1b" stroke-width="1"/><path d="M42 46h5l-2.500 6z" fill="#f2d2a8"/></g>`)
};

// THEMED[id] = { replaces (generic slot it takes over), note {t,m}, quip, fx }
const THEMED = {
  // sad
  umbrella: { replaces: "lollipop", note: { t: "Your umbrella", m: "Rain isn't fun, but an umbrella lets you keep walking through it. Sad days are like that. You don't have to pretend the rain isn't falling. Just keep something over your head, like a kind friend or a warm cup of tea, and keep walking." }, quip: "Twirl, twirl. You can walk through the rain.", fx: ["drop", 14, "fall"] },
  tissues: { replaces: "giftbox", note: { t: "It's okay to cry", m: "Crying isn't weakness. It's your body letting go of something heavy. Take a tissue, let it out, and notice how your shoulders feel afterward. You're allowed to feel this fully." }, quip: "Pop! A tissue, whenever you need one.", fx: ["puff", 10] },
  candle: { replaces: "balloon", note: { t: "A little light", m: "When everything feels dark, you only need a small light. Light a candle, sit with it for a minute, and breathe. One small flame is enough to change a dark room, and one small kindness is enough to change a dark day." }, quip: "Flicker. Even a tiny light matters.", fx: ["sparkle", 10, "rise"] },
  // anxious
  feather: { replaces: "butterfly", note: { t: "Light as a feather", m: "Imagine your breath is a feather you're trying to keep in the air. Breathe out slowly and gently so it floats. Do it five times and feel your body get lighter." }, quip: "Float, float. Breathe out slowly.", fx: ["steam", 8, "rise"] },
  lavender: { replaces: "flower", note: { t: "Smell the lavender", m: "Lavender is known for helping people feel calm. Close your eyes, imagine its soft scent, and breathe in for 4, hold for 2, and out for 6. Your body knows how to slow down." }, quip: "Sway gently. In for 4, out for 6.", fx: ["petal", 10, "fall", 0, ["#c9a8ff", "#8a5ad8"]] },
  zenstones: { replaces: "cupcake", note: { t: "Stack and steady", m: "Balanced stones don't rush. They settle one at a time. Place your worries down the same way, one at a time. Right now, you only need to balance this one moment." }, quip: "Steady. One stone at a time.", fx: ["dot", 10, "radial", 0, ["#c9ccd4", "#8a8e9a"]] },
  // angry
  pillow: { replaces: "cookie", note: { t: "Punch the pillow", m: "Anger is energy, and it needs somewhere safe to go. Squeeze or punch a pillow, shout into it if you need to, and let it out. A pillow can take it. When your arms are tired, take three slow breaths." }, quip: "Thump! Get it out safely.", fx: ["puff", 12] },
  ice: { replaces: "icecream", note: { t: "Cool down", m: "Hold something cold, or splash cold water on your hands and face. It helps your body cool down so your thinking brain can come back. You don't have to decide anything while you're this hot." }, quip: "Brrr. Let it cool.", fx: ["drop", 10, "fall", 0, ["#bfeaff", "#8fd6f0", "#fff"]] },
  glove: { replaces: "giftbox", note: { t: "Box it out", m: "If you need to hit something, make it a pillow or a pair of gloves in a game, not a person or a wall. Throw ten slow punches into the air, breathing out with each one. Then ask: what do I really need?" }, quip: "Jab! Out with it, safely.", fx: ["star", 12] },
  // lonely
  chat: { replaces: "cloud", note: { t: "Say hi", m: "Send someone a message right now: \"Thinking of you. How are you doing?\" It doesn't need to be clever. People are often happier to hear from you than you'd guess." }, quip: "Ping! A message is on its way.", fx: ["heart", 9, "rise"] },
  lantern: { replaces: "moon", note: { t: "Someone's window is lit", m: "Behind many lit windows are people who also feel lonely and would love a visit or a text. Be the person who reaches out first. A small light can call someone else home." }, quip: "Glow. You light the way for others too.", fx: ["sparkle", 10, "rise"] },
  plane: { replaces: "butterfly", note: { t: "Send it", m: "Write a short note to someone you miss, even if you don't send it today. Fold it into a paper airplane and let it fly. Connection starts with a small gesture." }, quip: "Whoosh! Off it goes.", fx: ["star", 10, "radial"] },
  // stressed
  checklist: { replaces: "gem", note: { t: "Just one thing", m: "Write down everything that's stressing you, then circle only one item. Do that one thing, tick it off, and notice the small relief. The rest can wait its turn." }, quip: "Tick! One thing done.", fx: ["dot", 10, "radial", 0, ["#2fa05a", "#7be07b"]] },
  water: { replaces: "mug", note: { t: "Drink some water", m: "When we're stressed, we forget the basics. Drink a glass of water, slowly. Then eat something and stretch your neck and shoulders. Caring for your body is caring for your mind." }, quip: "Glug glug. Hydrate!", fx: ["bubble", 10, "rise"] },
  headphones: { replaces: "duck", note: { t: "Put on your song", m: "Choose one song that makes you feel calm or brave and play it all the way through. For three minutes, let it be the only thing you do. Then come back to your list." }, quip: "Bop! Turn it up.", fx: ["note", 10, "rise"] },
  // overwhelmed
  anchor: { replaces: "cupcake", note: { t: "Hold steady", m: "A ship in a storm drops an anchor so it won't drift. Drop yours by pressing your feet into the floor and naming three things you can see. You're here, and you're safe to stay for this one minute." }, quip: "Thud. Held steady.", fx: ["bubble", 10, "rise"] },
  pause: { replaces: "gem", note: { t: "Press pause", m: "Everything doesn't need you at once. Give yourself a short pause: five slow breaths with your hand on your belly. The world can wait sixty seconds." }, quip: "Click. Paused.", fx: ["ring", 4] },
  lighthouse: { replaces: "sun", note: { t: "One steady light", m: "A lighthouse doesn't chase every ship. It shines steadily on one spot. Choose a single steady focus, the smallest thing in front of you, and let that guide you through the fog." }, quip: "Sweep. One beam, one thing.", fx: ["ray", 14] },
  // tired
  sleepmask: { replaces: "moon", note: { t: "Rest your eyes", m: "Put your phone down, dim the lights, and close your eyes for ten minutes. You don't have to sleep. Rest counts. Your body has been working hard." }, quip: "Zzz… sweet dreams.", fx: ["letter", 8, "rise"] },
  clock: { replaces: "duck", note: { t: "Snooze is allowed", m: "You don't have to win the day before it starts. Choose one tiny must-do and give yourself permission to let the rest slide. Tomorrow's alarm will still ring." }, quip: "Brrring! Five more minutes.", fx: ["ring", 4] },
  battery: { replaces: "rainbow", note: { t: "Recharging", m: "Phones need charging, and so do people. Water, a snack, a little daylight, and an early night all fill you back up. You can't pour from an empty battery." }, quip: "Bzzt! Charging up.", fx: ["bolt", 10] },
  // guilty
  bandage: { replaces: "teddy", note: { t: "Mend what you can", m: "Mistakes are like scrapes. They sting, and they heal when you care for them. Apologize if you can, fix what you can, and be gentle with the rest." }, quip: "There. All patched up.", fx: ["heart", 8, "rise"] },
  eraser: { replaces: "duck", note: { t: "A fresh start", m: "You can't rub out what happened, but you can learn from it and begin a clean line today. What's one thing you'd do differently next time?" }, quip: "Rub-rub. A clean page.", fx: ["crumb", 12, "fall", 0, ["#f2a0b8", "#ffd0dc"]] },
  dove: { replaces: "butterfly", note: { t: "Make peace", m: "The dove carries an olive branch. Make peace with yourself, and with whoever you hurt if you can. Forgiveness isn't forgetting. It's choosing to move forward lighter." }, quip: "Coo. Peace be with you.", fx: ["petal", 10, "rise", 0, ["#ffffff", "#e8f0ff"]] },
  // happy
  partyhat: { replaces: "giftbox", note: { t: "Celebrate!", m: "You don't need a reason, but you have one. Put on a party hat in your mind, play your favorite song, and dance for thirty seconds. Joy is meant to be enjoyed." }, quip: "Hooray! Party time!", fx: ["confetti", 22] },
  camera: { replaces: "gem", note: { t: "Click! Save the moment", m: "Take a photo, or write down three details of today you want to remember: who was there, what you laughed at, how it felt. You can look at it on a harder day." }, quip: "Click! Flash! Memory saved.", fx: ["flash", 6] },
  trophy: { replaces: "star", note: { t: "You did something good", m: "Take a moment to be proud, without adding \"but.\" Whatever got you here, you showed up and did it. Tell someone about it." }, quip: "Ding! Winner!", fx: ["star", 14] },
  // grateful
  card: { replaces: "giftbox", note: { t: "Say thank you", m: "Write a short note to someone who helped you, even if it was long ago. Tell them what they did and how it mattered. Gratitude is stronger when you share it." }, quip: "Mail call! Thank you.", fx: ["heart", 10, "rise"] },
  seedling: { replaces: "flower", note: { t: "Hope grows", m: "Hope is like a seedling. It needs a little sun and some patience. Choose one small thing to plant today, a message, a plan, or a habit, and watch it grow." }, quip: "Sprout! Look at it grow.", fx: ["petal", 10, "rise", 0, ["#9ae07a", "#4fae48"]] },
  journal: { replaces: "cloud", note: { t: "Write it down", m: "Write three good things from today, even tiny ones: a warm drink, a kind word, a clear sky. Noticing the good is a muscle, and writing makes it stronger." }, quip: "Scribble! Another good thing.", fx: ["letter", 8, "rise"] }
};

const THEME_SETS = {
  sad: ["umbrella", "tissues", "candle"], anxious: ["feather", "lavender", "zenstones"], angry: ["pillow", "ice", "glove"],
  lonely: ["chat", "lantern", "plane"], stressed: ["checklist", "water", "headphones"], overwhelmed: ["anchor", "pause", "lighthouse"],
  tired: ["sleepmask", "clock", "battery"], guilty: ["bandage", "eraser", "dove"], happy: ["partyhat", "camera", "trophy"], grateful: ["card", "seedling", "journal"]
};
