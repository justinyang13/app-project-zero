// One-time (and re-runnable) generator for the bundled starter dataset.
// Run via `npm run generate-csv`. Shares fetchTopBooks.ts with the
// in-browser "Update Book List" button (UC-5) — one codebase, two call
// sites — so the logic that produced public/data/top-books.csv is exactly
// the logic a visitor triggers live.
import { writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildDataset,
  fetchAllGenres,
  GENRES,
  toCSV,
  validateGenreCoverage,
} from "../src/lib/fetchTopBooks.ts";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_PATH = path.join(__dirname, "..", "public", "data", "top-books.csv");

async function main() {
  console.log(`Fetching all ${GENRES.length} genre buckets from OpenLibrary...`);
  const { succeeded, failed } = await fetchAllGenres();

  if (failed.length > 0) {
    console.warn(
      `Warning: ${failed.length} genre bucket(s) failed: ${failed.map((f) => f.genre.bucket).join(", ")}`,
    );
  }

  if (succeeded.length === 0) {
    throw new Error("All genre buckets failed — aborting without overwriting the starter CSV.");
  }

  const books = buildDataset(succeeded);
  console.log(`Built dataset: ${books.length} books across ${succeeded.length} genre buckets.`);

  // This is the one-time/manual regeneration path — fail loudly here
  // rather than shipping a starter CSV that breaks the "at least N books
  // per genre" guarantee. Re-run later if a genre is just having a bad day.
  const shortGenres = validateGenreCoverage(books);
  if (shortGenres.length > 0) {
    throw new Error(
      `Aborting without writing the starter CSV — under the minimum books-per-genre floor for: ${shortGenres.join(", ")}.`,
    );
  }

  await writeFile(OUTPUT_PATH, toCSV(books), "utf-8");
  console.log(`Wrote ${OUTPUT_PATH}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
