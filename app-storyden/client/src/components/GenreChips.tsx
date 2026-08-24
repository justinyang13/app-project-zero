import { GENRES } from "../lib/fetchTopBooks";
import type { GenreBucket } from "../lib/types";
import "./GenreChips.css";

export const ALL_GENRES = "All" as const;
export type GenreFilter = GenreBucket | typeof ALL_GENRES;

interface GenreChipsProps {
  active: GenreFilter;
  onSelect: (genre: GenreFilter) => void;
}

export function GenreChips({ active, onSelect }: GenreChipsProps) {
  return (
    <div className="genre-chips">
      <button
        className={`chip ${active === ALL_GENRES ? "chip--active" : ""}`}
        onClick={() => onSelect(ALL_GENRES)}
      >
        {ALL_GENRES}
      </button>
      {GENRES.map((genre) => (
        <button
          key={genre.bucket}
          className={`chip ${active === genre.bucket ? "chip--active" : ""}`}
          onClick={() => onSelect(genre.bucket)}
        >
          {genre.chipLabel}
        </button>
      ))}
    </div>
  );
}
