import { GENRES } from "./fetchTopBooks";
import type { Book, GenreBucket } from "./types";

export type SortOption = "popularity" | "title" | "author" | "genre";

export const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: "popularity", label: "Popularity" },
  { value: "title", label: "Title" },
  { value: "author", label: "Author (last name)" },
  { value: "genre", label: "Genre" },
];

// Canonical genre display order (matches the chip row / GENRES config),
// used so "sort by genre" groups books in a stable, meaningful order
// rather than an arbitrary alphabetical shuffle.
const GENRE_ORDER: GenreBucket[] = GENRES.map((g) => g.bucket);

// "Rick Riordan" -> "Riordan"; only the first credited author is used for
// multi-author books ("Scott Cawthon, Kira Breed-Wrisley" -> "Cawthon").
// Books with no author sort to the end regardless of direction.
export function getAuthorLastName(authorNames: string): string {
  const firstAuthor = authorNames.split(",")[0]?.trim() ?? "";
  if (!firstAuthor) return "";
  const parts = firstAuthor.split(/\s+/);
  return parts[parts.length - 1];
}

function compareTitle(a: Book, b: Book): number {
  return a.title.localeCompare(b.title, undefined, { sensitivity: "base" });
}

function comparePopularity(a: Book, b: Book): number {
  const aScore = a.wantToReadCount ?? 0;
  const bScore = b.wantToReadCount ?? 0;
  if (bScore !== aScore) return bScore - aScore;
  const aRatings = a.ratingsCount ?? 0;
  const bRatings = b.ratingsCount ?? 0;
  if (bRatings !== aRatings) return bRatings - aRatings;
  return compareTitle(a, b);
}

function compareAuthor(a: Book, b: Book): number {
  const aName = getAuthorLastName(a.authorNames);
  const bName = getAuthorLastName(b.authorNames);
  if (!aName && !bName) return compareTitle(a, b);
  if (!aName) return 1;
  if (!bName) return -1;
  const cmp = aName.localeCompare(bName, undefined, { sensitivity: "base" });
  return cmp !== 0 ? cmp : compareTitle(a, b);
}

function compareGenre(a: Book, b: Book): number {
  const aIndex = GENRE_ORDER.indexOf(a.genreBucket);
  const bIndex = GENRE_ORDER.indexOf(b.genreBucket);
  return aIndex !== bIndex ? aIndex - bIndex : compareTitle(a, b);
}

const COMPARATORS: Record<SortOption, (a: Book, b: Book) => number> = {
  popularity: comparePopularity,
  title: compareTitle,
  author: compareAuthor,
  genre: compareGenre,
};

export function sortBooks(books: Book[], sort: SortOption): Book[] {
  return [...books].sort(COMPARATORS[sort]);
}
