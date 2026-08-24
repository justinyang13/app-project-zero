import { useState } from "react";
import type { ReactNode } from "react";
import { getPlaceholderArt } from "../lib/placeholderArt";
import { getCoverImageUrl } from "../lib/coverImage";
import "./CoverArt.css";

interface CoverArtProps {
  index: number;
  coverId?: number | null;
  title: string;
  size?: "grid" | "detail";
  children?: ReactNode;
}

// Real cover, hotlinked straight from OpenLibrary's own cover service —
// we never download or store a copy ourselves. Falls back to this app's
// original placeholder art (a warm gradient tile + one line icon) when a
// book has no cover_i, or if the image fails to load.
export function CoverArt({ index, coverId, title, size = "grid", children }: CoverArtProps) {
  const [imageFailed, setImageFailed] = useState(false);
  const showImage = coverId != null && !imageFailed;

  if (showImage) {
    return (
      <div className={`cover-art cover-art--${size}`}>
        <img
          className="cover-art__image"
          src={getCoverImageUrl(coverId, size === "detail" ? "L" : "M")}
          alt={`Cover of ${title}`}
          loading="lazy"
          onError={() => setImageFailed(true)}
        />
        {children}
      </div>
    );
  }

  const art = getPlaceholderArt(index);
  return (
    <div
      className={`cover-art cover-art--${size}`}
      style={{ background: `linear-gradient(160deg, ${art.c1}, ${art.c2})` }}
    >
      <div className="cover-art__icon">
        <svg width={size === "detail" ? 40 : 56} height={size === "detail" ? 40 : 56}>
          <use href={`#${art.icon}`} />
        </svg>
      </div>
      {children}
    </div>
  );
}
