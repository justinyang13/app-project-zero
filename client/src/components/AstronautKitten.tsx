import "./AstronautKitten.css";

export interface AstronautKittenProps {
  top: string;
  left: string;
  size: number;
  duration: number;
  delay: number;
  flip?: boolean;
}

export function AstronautKitten({ top, left, size, duration, delay, flip }: AstronautKittenProps) {
  const style = {
    top,
    left,
    width: `${size}px`,
    height: `${size * 1.25}px`,
    "--astro-duration": `${duration}s`,
    "--astro-delay": `${delay}s`,
  } as React.CSSProperties;

  return (
    <div className="astro-kitten" style={style} aria-hidden="true">
      <div className="astro-kitten__flip" style={{ transform: flip ? "scaleX(-1)" : undefined }}>
        <svg viewBox="0 0 120 150" width="100%" height="100%">
          <defs>
            <radialGradient id="astro-glass" cx="35%" cy="30%" r="70%">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.65" />
              <stop offset="100%" stopColor="#ffffff" stopOpacity="0.05" />
            </radialGradient>
          </defs>

          {/* tail, drawn first so the suit overlaps its base */}
          <path
            d="M90,128 Q110,118 105,96 Q101,84 92,88"
            stroke="#9aa3ad"
            strokeWidth="8"
            strokeLinecap="round"
            fill="none"
          />
          <path d="M99,102 L106,99" stroke="#6d757e" strokeWidth="3" strokeLinecap="round" />
          <path d="M98,112 L106,110" stroke="#6d757e" strokeWidth="3" strokeLinecap="round" />

          {/* ears, peeking above the helmet */}
          <path d="M40,45 L29,19 L52,38 Z" fill="#9aa3ad" />
          <path d="M42,41 L36,26 L49,36 Z" fill="#f5b8c4" />
          <path d="M80,45 L91,19 L68,38 Z" fill="#9aa3ad" />
          <path d="M78,41 L84,26 L71,36 Z" fill="#f5b8c4" />

          {/* head */}
          <circle cx="60" cy="60" r="27" fill="#9aa3ad" />

          {/* tabby stripes */}
          <path d="M45,48 Q60,40 75,48" stroke="#6d757e" strokeWidth="3" fill="none" strokeLinecap="round" />
          <path d="M43,56 Q60,50 77,56" stroke="#6d757e" strokeWidth="2.5" fill="none" strokeLinecap="round" />

          {/* eyes */}
          <circle cx="50" cy="63" r="6.5" fill="#fff" />
          <circle cx="70" cy="63" r="6.5" fill="#fff" />
          <circle cx="51.5" cy="64" r="4" fill="#1f2937" />
          <circle cx="68.5" cy="64" r="4" fill="#1f2937" />
          <circle cx="50" cy="62" r="1.2" fill="#fff" />
          <circle cx="67" cy="62" r="1.2" fill="#fff" />

          {/* nose + whiskers */}
          <path d="M57,72 L63,72 L60,76 Z" fill="#f28ba0" />
          <path d="M54,74 L34,71" stroke="#e7eaee" strokeWidth="1" opacity="0.8" />
          <path d="M54,77 L33,80" stroke="#e7eaee" strokeWidth="1" opacity="0.8" />
          <path d="M66,74 L86,71" stroke="#e7eaee" strokeWidth="1" opacity="0.8" />
          <path d="M66,77 L87,80" stroke="#e7eaee" strokeWidth="1" opacity="0.8" />

          {/* helmet rim + glass */}
          <circle cx="60" cy="60" r="34" fill="none" stroke="#e9edf2" strokeWidth="7" />
          <circle cx="60" cy="60" r="31" fill="url(#astro-glass)" />

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
