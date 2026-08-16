import { useMemo } from "react";
import "./SpaceBackground.css";

interface Star {
  id: number;
  x: number;
  y: number;
  r: number;
  opacity: number;
  twinkle: boolean;
  delay: number;
  duration: number;
}

function makeStars(count: number): Star[] {
  return Array.from({ length: count }, (_, id) => ({
    id,
    x: Math.random() * 1000,
    y: Math.random() * 600,
    r: Math.random() * 1.6 + 0.4,
    opacity: Math.random() * 0.5 + 0.5,
    twinkle: Math.random() < 0.35,
    delay: Math.random() * 6,
    duration: Math.random() * 3 + 2,
  }));
}

export function SpaceBackground() {
  const stars = useMemo(() => makeStars(160), []);

  return (
    <div className="space-bg" aria-hidden="true">
      <svg
        className="space-bg__stars"
        viewBox="0 0 1000 600"
        preserveAspectRatio="xMidYMid slice"
      >
        {stars.map((star) => (
          <circle
            key={star.id}
            cx={star.x}
            cy={star.y}
            r={star.r}
            fill="#fff"
            opacity={star.opacity}
            className={star.twinkle ? "space-bg__star--twinkle" : undefined}
            style={
              star.twinkle
                ? { animationDelay: `${star.delay}s`, animationDuration: `${star.duration}s` }
                : undefined
            }
          />
        ))}
      </svg>
      <div className="space-bg__earth" />
    </div>
  );
}
