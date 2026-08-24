export type CoverImageSize = "M" | "L";

// Hotlinks OpenLibrary's own cover service at view time — we never
// download or store a copy of the image ourselves, just reference the
// copy OpenLibrary already hosts. `default=false` makes it 404 instead of
// returning OpenLibrary's generic "no cover" gray box, so callers can fall
// back to this app's own placeholder art on error instead.
export function getCoverImageUrl(coverId: number, size: CoverImageSize = "M"): string {
  return `https://covers.openlibrary.org/b/id/${coverId}-${size}.jpg?default=false`;
}
