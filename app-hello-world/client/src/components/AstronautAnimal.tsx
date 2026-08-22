import type { JSX } from "react";
import "./AstronautAnimal.css";

export type AnimalSpecies = "cat" | "dog" | "bunny" | "panda" | "fox";

export interface AstronautAnimalProps {
  id: string;
  species: AnimalSpecies;
  top: string;
  left: string;
  size: number;
  duration: number;
  delay: number;
  flip?: boolean;
}

// Light-to-dark radial gradient stops per species, lit from the upper-left
// so fur reads as rounded/furry instead of a flat, robotic disc.
const HEAD_TONES: Record<AnimalSpecies, [string, string]> = {
  cat: ["#c3c9d1", "#7d858e"],
  dog: ["#f0c98a", "#c98f4a"],
  bunny: ["#fbf8f3", "#e2d8c5"],
  panda: ["#ffffff", "#e5e5e5"],
  fox: ["#f0975a", "#c9642c"],
};

const EARS: Record<AnimalSpecies, (headUrl: string) => JSX.Element> = {
  cat: (headUrl) => (
    <>
      <path d="M40,45 L29,19 L52,38 Z" fill={headUrl} />
      <path d="M42,41 L36,26 L49,36 Z" fill="#f5b8c4" />
      <path d="M80,45 L91,19 L68,38 Z" fill={headUrl} />
      <path d="M78,41 L84,26 L71,36 Z" fill="#f5b8c4" />
    </>
  ),
  dog: (headUrl) => (
    <>
      <path d="M38,50 C20,54 16,78 30,92 C34,80 36,64 42,52 Z" fill={headUrl} />
      <path d="M82,50 C100,54 104,78 90,92 C86,80 84,64 78,52 Z" fill={headUrl} />
    </>
  ),
  bunny: (headUrl) => (
    <>
      <path d="M46,44 Q38,5 47,-12 Q56,5 50,44 Z" fill={headUrl} />
      <path d="M47,40 Q42,12 47,-4 Q51,12 49,40 Z" fill="#f5b8c4" />
      <path d="M74,44 Q82,5 73,-12 Q64,5 70,44 Z" fill={headUrl} />
      <path d="M73,40 Q78,12 73,-4 Q69,12 71,40 Z" fill="#f5b8c4" />
    </>
  ),
  panda: () => (
    <>
      <circle cx="38" cy="35" r="12" fill="#1f2937" />
      <circle cx="82" cy="35" r="12" fill="#1f2937" />
    </>
  ),
  fox: (headUrl) => (
    <>
      <path d="M40,45 L27,14 L54,37 Z" fill={headUrl} />
      <path d="M31,20 L27,14 L38,24 Z" fill="#1f2937" />
      <path d="M42,40 L37,28 L47,36 Z" fill="#fdf3e7" />
      <path d="M80,45 L93,14 L66,37 Z" fill={headUrl} />
      <path d="M89,20 L93,14 L82,24 Z" fill="#1f2937" />
      <path d="M78,40 L83,28 L73,36 Z" fill="#fdf3e7" />
    </>
  ),
};

const MARKINGS: Record<AnimalSpecies, () => JSX.Element | null> = {
  cat: () => (
    <>
      <path d="M45,48 Q60,41 75,48" stroke="#6d757e" strokeWidth="3" fill="none" strokeLinecap="round" />
      <path d="M43,56 Q60,51 77,56" stroke="#6d757e" strokeWidth="2.5" fill="none" strokeLinecap="round" />
    </>
  ),
  dog: () => <ellipse cx="60" cy="72" rx="14" ry="10" fill="#fbe7c6" />,
  bunny: () => (
    <>
      <ellipse cx="42" cy="70" rx="5" ry="3" fill="#fbcfe8" opacity="0.6" />
      <ellipse cx="78" cy="70" rx="5" ry="3" fill="#fbcfe8" opacity="0.6" />
    </>
  ),
  panda: () => (
    <>
      <ellipse cx="50" cy="62" rx="9" ry="11" fill="#1f2937" transform="rotate(-15 50 62)" />
      <ellipse cx="70" cy="62" rx="9" ry="11" fill="#1f2937" transform="rotate(15 70 62)" />
    </>
  ),
  fox: () => <ellipse cx="60" cy="68" rx="17" ry="14" fill="#fdf3e7" opacity="0.92" />,
};

const EYES: Record<AnimalSpecies, () => JSX.Element> = {
  cat: () => (
    <>
      <ellipse cx="50" cy="63" rx="6" ry="7" fill="#eab308" />
      <ellipse cx="70" cy="63" rx="6" ry="7" fill="#eab308" />
      <ellipse cx="50" cy="63" rx="1.6" ry="6" fill="#1f2937" />
      <ellipse cx="70" cy="63" rx="1.6" ry="6" fill="#1f2937" />
      <circle cx="48.5" cy="60.5" r="1" fill="#fff" opacity="0.9" />
      <circle cx="68.5" cy="60.5" r="1" fill="#fff" opacity="0.9" />
      <path d="M44,59 Q50,54 56,59" stroke="#5b6470" strokeWidth="1.2" fill="none" strokeLinecap="round" />
      <path d="M64,59 Q70,54 76,59" stroke="#5b6470" strokeWidth="1.2" fill="none" strokeLinecap="round" />
    </>
  ),
  dog: () => (
    <>
      <circle cx="50" cy="63" r="6.5" fill="#fff" />
      <circle cx="70" cy="63" r="6.5" fill="#fff" />
      <circle cx="51" cy="64.5" r="4.3" fill="#5b3a1e" />
      <circle cx="69" cy="64.5" r="4.3" fill="#5b3a1e" />
      <circle cx="49.7" cy="62.5" r="1.3" fill="#fff" />
      <circle cx="67.7" cy="62.5" r="1.3" fill="#fff" />
    </>
  ),
  bunny: () => (
    <>
      <circle cx="50" cy="63" r="6" fill="#fff" />
      <circle cx="70" cy="63" r="6" fill="#fff" />
      <circle cx="51" cy="64" r="4" fill="#7c2d12" />
      <circle cx="69" cy="64" r="4" fill="#7c2d12" />
      <circle cx="49.5" cy="61.5" r="1.2" fill="#fff" />
      <circle cx="67.5" cy="61.5" r="1.2" fill="#fff" />
    </>
  ),
  panda: () => (
    <>
      <circle cx="50" cy="63" r="4" fill="#fff" />
      <circle cx="70" cy="63" r="4" fill="#fff" />
      <circle cx="50.5" cy="64" r="2.3" fill="#1f2937" />
      <circle cx="70.5" cy="64" r="2.3" fill="#1f2937" />
      <circle cx="49.3" cy="62.3" r="0.8" fill="#fff" />
      <circle cx="69.3" cy="62.3" r="0.8" fill="#fff" />
    </>
  ),
  fox: () => (
    <>
      <path d="M46,64 Q44,70 47,74" stroke="#a0522d" strokeWidth="1" fill="none" opacity="0.5" strokeLinecap="round" />
      <path d="M74,64 Q76,70 73,74" stroke="#a0522d" strokeWidth="1" fill="none" opacity="0.5" strokeLinecap="round" />
      <ellipse cx="50" cy="63" rx="5.5" ry="6.5" fill="#fff" />
      <ellipse cx="70" cy="63" rx="5.5" ry="6.5" fill="#fff" />
      <circle cx="51" cy="64.5" r="4" fill="#7c3f0e" />
      <circle cx="69" cy="64.5" r="4" fill="#7c3f0e" />
      <circle cx="49.7" cy="62.3" r="1.1" fill="#fff" />
      <circle cx="67.7" cy="62.3" r="1.1" fill="#fff" />
    </>
  ),
};

const NOSE_MOUTH: Record<AnimalSpecies, () => JSX.Element> = {
  cat: () => (
    <>
      <path d="M57,72 L63,72 L60,76 Z" fill="#f28ba0" />
      <path d="M60,76 Q56,80 52,77" stroke="#5b6470" strokeWidth="1" fill="none" strokeLinecap="round" />
      <path d="M60,76 Q64,80 68,77" stroke="#5b6470" strokeWidth="1" fill="none" strokeLinecap="round" />
      <path d="M54,74 L34,71" stroke="#e7eaee" strokeWidth="1" opacity="0.85" />
      <path d="M54,77 L33,80" stroke="#e7eaee" strokeWidth="1" opacity="0.85" />
      <path d="M66,74 L86,71" stroke="#e7eaee" strokeWidth="1" opacity="0.85" />
      <path d="M66,77 L87,80" stroke="#e7eaee" strokeWidth="1" opacity="0.85" />
    </>
  ),
  dog: () => (
    <>
      <ellipse cx="60" cy="71" rx="4.5" ry="3.5" fill="#2b2320" />
      <ellipse cx="58.7" cy="69.6" rx="1" ry="0.7" fill="#7a7069" opacity="0.6" />
      <path d="M60,77 Q56,81 52,78" stroke="#8a5a2b" strokeWidth="1.2" fill="none" strokeLinecap="round" />
      <path d="M60,77 Q64,81 68,78" stroke="#8a5a2b" strokeWidth="1.2" fill="none" strokeLinecap="round" />
      <path d="M57,79 Q60,85 63,79 Z" fill="#f28ba0" />
    </>
  ),
  bunny: () => (
    <>
      <path d="M57,72 L63,72 L60,75 Z" fill="#f28ba0" />
      <path d="M60,75 Q57,79 54,77" stroke="#8a6f5a" strokeWidth="1" fill="none" strokeLinecap="round" />
      <path d="M60,75 Q63,79 66,77" stroke="#8a6f5a" strokeWidth="1" fill="none" strokeLinecap="round" />
      <rect x="57.4" y="75" width="2.2" height="4" rx="0.6" fill="#fff" stroke="#e5e2da" strokeWidth="0.3" />
      <rect x="60.4" y="75" width="2.2" height="4" rx="0.6" fill="#fff" stroke="#e5e2da" strokeWidth="0.3" />
      <path d="M54,73 L36,71" stroke="#d8cfc0" strokeWidth="1" opacity="0.85" />
      <path d="M54,76 L35,79" stroke="#d8cfc0" strokeWidth="1" opacity="0.85" />
      <path d="M66,73 L84,71" stroke="#d8cfc0" strokeWidth="1" opacity="0.85" />
      <path d="M66,76 L85,79" stroke="#d8cfc0" strokeWidth="1" opacity="0.85" />
    </>
  ),
  panda: () => (
    <>
      <ellipse cx="60" cy="74" rx="4" ry="3" fill="#1f2937" />
      <path d="M60,77 Q56,81 52,78" stroke="#1f2937" strokeWidth="1" fill="none" strokeLinecap="round" />
      <path d="M60,77 Q64,81 68,78" stroke="#1f2937" strokeWidth="1" fill="none" strokeLinecap="round" />
    </>
  ),
  fox: () => (
    <>
      <path d="M57,72 L63,72 L60,76.5 Z" fill="#1f2937" />
      <path d="M60,76.5 Q56,80 52,77.5" stroke="#7c3f0e" strokeWidth="1" fill="none" strokeLinecap="round" />
      <path d="M60,76.5 Q64,80 68,77.5" stroke="#7c3f0e" strokeWidth="1" fill="none" strokeLinecap="round" />
    </>
  ),
};

const TAIL: Record<AnimalSpecies, (headUrl: string) => JSX.Element> = {
  cat: () => (
    <>
      <path d="M90,128 Q110,118 105,96 Q101,84 92,88" stroke="#9aa3ad" strokeWidth="8" strokeLinecap="round" fill="none" />
      <path d="M99,102 L106,99" stroke="#6d757e" strokeWidth="3" strokeLinecap="round" />
      <path d="M98,112 L106,110" stroke="#6d757e" strokeWidth="3" strokeLinecap="round" />
    </>
  ),
  dog: (headUrl) => (
    <path d="M90,128 Q114,118 110,98 Q106,84 96,88" stroke={headUrl} strokeWidth="9" strokeLinecap="round" fill="none" />
  ),
  bunny: () => <circle cx="94" cy="122" r="9" fill="#fbf8f3" stroke="#e2d8c5" strokeWidth="1.5" />,
  panda: () => <circle cx="94" cy="122" r="7" fill="#ffffff" stroke="#e5e5e5" strokeWidth="1.5" />,
  fox: (headUrl) => (
    <>
      <path d="M90,126 Q118,112 112,86 Q108,70 96,74" fill="none" stroke={headUrl} strokeWidth="14" strokeLinecap="round" />
      <circle cx="97" cy="75" r="7.5" fill="#fdf3e7" />
    </>
  ),
};

export function AstronautAnimal({ id, species, top, left, size, duration, delay, flip }: AstronautAnimalProps) {
  const style = {
    top,
    left,
    width: `${size}px`,
    height: `${size * 1.25}px`,
    "--astro-duration": `${duration}s`,
    "--astro-delay": `${delay}s`,
  } as React.CSSProperties;

  const headGradId = `${id}-head`;
  const headUrl = `url(#${headGradId})`;
  const [light, dark] = HEAD_TONES[species];

  return (
    <div className="astro-animal" style={style} aria-hidden="true">
      <div className="astro-animal__flip" style={{ transform: flip ? "scaleX(-1)" : undefined }}>
        <svg viewBox="0 0 120 150" width="100%" height="100%" overflow="visible">
          <defs>
            <radialGradient id={headGradId} cx="35%" cy="30%" r="75%">
              <stop offset="0%" stopColor={light} />
              <stop offset="100%" stopColor={dark} />
            </radialGradient>
            <radialGradient id={`${id}-glass`} cx="35%" cy="28%" r="70%">
              <stop offset="0%" stopColor="#eaf6ff" stopOpacity="0.7" />
              <stop offset="100%" stopColor="#eaf6ff" stopOpacity="0.04" />
            </radialGradient>
          </defs>

          {/* tail, drawn first so the suit overlaps its base */}
          {TAIL[species](headUrl)}

          {/* ears, peeking above the helmet */}
          {EARS[species](headUrl)}

          {/* head */}
          <circle cx="60" cy="60" r="27" fill={headUrl} />

          {/* species markings: stripes, muzzle patch, eye patches, blush */}
          {MARKINGS[species]()}

          {/* eyes */}
          {EYES[species]()}

          {/* nose + mouth */}
          {NOSE_MOUTH[species]()}

          {/* helmet: thin glass-blue rim + soft highlight, not a heavy metal band */}
          <circle cx="60" cy="60" r="34" fill="none" stroke="#dceaf5" strokeWidth="3.5" opacity="0.85" />
          <circle cx="60" cy="60" r="31" fill={`url(#${id}-glass)`} />
          <ellipse cx="48" cy="46" rx="9" ry="5" fill="#ffffff" opacity="0.35" transform="rotate(-25 48 46)" />

          {/* neck ring */}
          <rect x="48" y="84" width="24" height="10" rx="4" fill="#e9edf2" stroke="#d8d4c8" />

          {/* shoulders */}
          <circle cx="30" cy="98" r="9" fill="#f4f2ec" stroke="#d8d4c8" strokeWidth="2" />
          <circle cx="90" cy="98" r="9" fill="#f4f2ec" stroke="#d8d4c8" strokeWidth="2" />

          {/* torso */}
          <rect x="28" y="88" width="64" height="48" rx="22" fill="#f4f2ec" stroke="#d8d4c8" strokeWidth="2" />

          {/* chest control panel */}
          <rect x="48" y="100" width="24" height="16" rx="4" fill="#dfe7ee" stroke="#c7d0da" />
          <circle cx="53" cy="104.5" r="2.2" fill="#ef4444" />
          <circle cx="60" cy="104.5" r="2.2" fill="#facc15" />
          <circle cx="67" cy="104.5" r="2.2" fill="#38bdf8" />
          <rect x="51" y="109" width="18" height="3" rx="1.5" fill="#c7d0da" />

          {/* mittens */}
          <ellipse cx="24" cy="120" rx="10" ry="12" fill="#f4f2ec" stroke="#d8d4c8" strokeWidth="2" />
          <ellipse cx="96" cy="120" rx="10" ry="12" fill="#f4f2ec" stroke="#d8d4c8" strokeWidth="2" />

          {/* boots */}
          <ellipse cx="45" cy="140" rx="9" ry="8" fill="#f4f2ec" stroke="#d8d4c8" strokeWidth="2" />
          <ellipse cx="75" cy="140" rx="9" ry="8" fill="#f4f2ec" stroke="#d8d4c8" strokeWidth="2" />
        </svg>
      </div>
    </div>
  );
}
