import { useEffect, useMemo, useState } from "react";
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

interface ApodPhoto {
  url: string;
  title: string;
  copyright?: string;
}

interface ApodResponse {
  media_type: string;
  url: string;
  hdurl?: string;
  title: string;
  copyright?: string;
}

// The shared NASA demo key works instantly with no signup, just a low
// (shared) rate limit — good enough for a "hello world" background. Set
// VITE_NASA_API_KEY to a personal key (https://api.nasa.gov) to avoid it.
const NASA_API_KEY = import.meta.env.VITE_NASA_API_KEY || "DEMO_KEY";
const APOD_URL = `https://api.nasa.gov/planetary/apod?api_key=${NASA_API_KEY}`;

export function SpaceBackground() {
  const stars = useMemo(() => makeStars(160), []);
  const [photo, setPhoto] = useState<ApodPhoto | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    fetch(APOD_URL, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error(`NASA APOD request failed: ${response.status}`);
        return response.json() as Promise<ApodResponse>;
      })
      .then((data) => {
        // APOD is occasionally a video; fall back to the gradient sky then.
        if (data.media_type === "image") {
          setPhoto({ url: data.hdurl ?? data.url, title: data.title, copyright: data.copyright });
        }
      })
      .catch((error) => {
        if (error.name !== "AbortError") {
          console.error("Failed to load NASA APOD background:", error);
        }
      });

    return () => controller.abort();
  }, []);

  return (
    <div className="space-bg" aria-hidden="true">
      <div
        className={`space-bg__photo${photo ? " space-bg__photo--loaded" : ""}`}
        style={photo ? { backgroundImage: `url(${photo.url})` } : undefined}
      />
      <div className="space-bg__overlay" />
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
      {photo && (
        <p className="space-bg__credit">
          {photo.title}
          {photo.copyright ? ` — © ${photo.copyright.trim()}` : " — NASA"}
        </p>
      )}
    </div>
  );
}
