import { useMemo, useState } from "react";
import type { JSX } from "react";
import { ANIMAL_PHOTOS } from "../animalPhotos";
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

// Flat fallback tone per species — used only if every real photo for that
// species fails to load (offline, blocked, renamed on Commons, etc.).
const FALLBACK_TONE: Record<AnimalSpecies, string> = {
  cat: "#9aa3ad",
  dog: "#dba85f",
  bunny: "#e7ddc9",
  panda: "#e5e5e5",
  fox: "#d97a3e",
};

const EARS: Record<AnimalSpecies, (fill: string) => JSX.Element> = {
  cat: (fill) => (
    <>
      <path d="M40,45 L29,19 L52,38 Z" fill={fill} />
      <path d="M42,41 L36,26 L49,36 Z" fill="#f5b8c4" />
      <path d="M80,45 L91,19 L68,38 Z" fill={fill} />
      <path d="M78,41 L84,26 L71,36 Z" fill="#f5b8c4" />
    </>
  ),
  dog: (fill) => (
    <>
      <path d="M38,50 C20,54 16,78 30,92 C34,80 36,64 42,52 Z" fill={fill} />
      <path d="M82,50 C100,54 104,78 90,92 C86,80 84,64 78,52 Z" fill={fill} />
    </>
  ),
  bunny: (fill) => (
    <>
      <path d="M46,44 Q38,5 47,-12 Q56,5 50,44 Z" fill={fill} />
      <path d="M47,40 Q42,12 47,-4 Q51,12 49,40 Z" fill="#f5b8c4" />
      <path d="M74,44 Q82,5 73,-12 Q64,5 70,44 Z" fill={fill} />
      <path d="M73,40 Q78,12 73,-4 Q69,12 71,40 Z" fill="#f5b8c4" />
    </>
  ),
  panda: () => (
    <>
      <circle cx="38" cy="35" r="12" fill="#1f2937" />
      <circle cx="82" cy="35" r="12" fill="#1f2937" />
    </>
  ),
  fox: (fill) => (
    <>
      <path d="M40,45 L27,14 L54,37 Z" fill={fill} />
      <path d="M31,20 L27,14 L38,24 Z" fill="#1f2937" />
      <path d="M42,40 L37,28 L47,36 Z" fill="#fdf3e7" />
      <path d="M80,45 L93,14 L66,37 Z" fill={fill} />
      <path d="M89,20 L93,14 L82,24 Z" fill="#1f2937" />
      <path d="M78,40 L83,28 L73,36 Z" fill="#fdf3e7" />
    </>
  ),
};

const TAIL: Record<AnimalSpecies, (fill: string) => JSX.Element> = {
  cat: () => (
    <>
      <path d="M90,128 Q110,118 105,96 Q101,84 92,88" stroke="#9aa3ad" strokeWidth="8" strokeLinecap="round" fill="none" />
      <path d="M99,102 L106,99" stroke="#6d757e" strokeWidth="3" strokeLinecap="round" />
      <path d="M98,112 L106,110" stroke="#6d757e" strokeWidth="3" strokeLinecap="round" />
    </>
  ),
  dog: (fill) => (
    <path d="M90,128 Q114,118 110,98 Q106,84 96,88" stroke={fill} strokeWidth="9" strokeLinecap="round" fill="none" />
  ),
  bunny: () => <circle cx="94" cy="122" r="9" fill="#fbf8f3" stroke="#e2d8c5" strokeWidth="1.5" />,
  panda: () => <circle cx="94" cy="122" r="7" fill="#ffffff" stroke="#e5e5e5" strokeWidth="1.5" />,
  fox: (fill) => (
    <>
      <path d="M90,126 Q118,112 112,86 Q108,70 96,74" fill="none" stroke={fill} strokeWidth="14" strokeLinecap="round" />
      <circle cx="97" cy="75" r="7.5" fill="#fdf3e7" />
    </>
  ),
};

export function AstronautAnimal({ id, species, top, left, size, duration, delay, flip }: AstronautAnimalProps) {
  const photos = ANIMAL_PHOTOS[species];
  // Shuffle once per mount so a failed photo falls through to a different
  // one (not the same one retried), and the last resort is the flat tone.
  const order = useMemo(() => {
    const indexes = photos.map((_, i) => i);
    for (let i = indexes.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [indexes[i], indexes[j]] = [indexes[j], indexes[i]];
    }
    return indexes;
  }, [photos]);
  const [attempt, setAttempt] = useState(0);

  const photo = attempt < order.length ? photos[order[attempt]] : null;
  const fallbackTone = FALLBACK_TONE[species];

  const style = {
    top,
    left,
    width: `${size}px`,
    height: `${size * 1.25}px`,
    "--astro-duration": `${duration}s`,
    "--astro-delay": `${delay}s`,
  } as React.CSSProperties;

  const clipId = `${id}-clip`;
  const glassId = `${id}-glass`;

  return (
    <div className="astro-animal" style={style} aria-hidden="true">
      <div className="astro-animal__flip" style={{ transform: flip ? "scaleX(-1)" : undefined }}>
        <svg viewBox="0 0 120 150" width="100%" height="100%" overflow="visible">
          <defs>
            <clipPath id={clipId}>
              <circle cx="60" cy="60" r="27" />
            </clipPath>
            <radialGradient id={glassId} cx="35%" cy="28%" r="70%">
              <stop offset="0%" stopColor="#eaf6ff" stopOpacity="0.55" />
              <stop offset="100%" stopColor="#eaf6ff" stopOpacity="0.03" />
            </radialGradient>
          </defs>

          {/* tail, drawn first so the suit overlaps its base */}
          {TAIL[species](fallbackTone)}

          {/* ears, peeking above the helmet */}
          {EARS[species](fallbackTone)}

          {/* real photo "portrait", cropped into the head circle */}
          {photo ? (
            <image
              href={photo.url}
              x="27"
              y="27"
              width="66"
              height="66"
              clipPath={`url(#${clipId})`}
              preserveAspectRatio={`${photo.align} slice`}
              onError={() => setAttempt((n) => n + 1)}
            >
              <title>
                {photo.title} — {photo.license}, via Wikimedia Commons
              </title>
            </image>
          ) : (
            <circle cx="60" cy="60" r="27" fill={fallbackTone} />
          )}

          {/* helmet: thin glass-blue rim + soft highlight over the photo */}
          <circle cx="60" cy="60" r="34" fill="none" stroke="#dceaf5" strokeWidth="3.5" opacity="0.85" />
          <circle cx="60" cy="60" r="31" fill={`url(#${glassId})`} />
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
