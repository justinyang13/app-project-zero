import Papa from "papaparse";
import type { Book, GenreBucket } from "./types";

// Isomorphic on purpose: no DOM/localStorage here. This module runs both
// under Node (scripts/generate-starter-csv.ts, the one-time run that
// produced public/data/top-books.csv) and in the browser (the "Update
// Book List" button, UC-5) — one codebase, two call sites.

export interface GenreConfig {
  bucket: GenreBucket;
  chipLabel: string;
  query: string;
}

// Order matters: a book found in multiple buckets is kept only in the
// first one it matches, so buckets are processed in this fixed order.
export const GENRES: GenreConfig[] = [
  {
    bucket: "Fantasy",
    chipLabel: "Fantasy",
    query: 'subject:"fantasy" AND subject:"juvenile fiction"',
  },
  {
    bucket: "Adventure",
    chipLabel: "Adventure",
    query: 'subject:"adventure" AND subject:"juvenile fiction"',
  },
  {
    bucket: "Mystery",
    chipLabel: "Mystery",
    query: 'subject:"mystery and detective stories" AND subject:"juvenile fiction"',
  },
  {
    bucket: "Science Fiction",
    chipLabel: "Sci-Fi",
    query: 'subject:"science fiction" AND subject:"juvenile fiction"',
  },
  {
    bucket: "Historical Fiction",
    chipLabel: "Historical",
    query: 'subject:"historical fiction" AND subject:"juvenile fiction"',
  },
  {
    bucket: "Fairy Tales",
    chipLabel: "Fairy Tales",
    query: 'subject:"fairy tales" AND subject:"juvenile fiction"',
  },
  {
    bucket: "Humor",
    chipLabel: "Humor",
    query: 'subject:"humorous stories" AND subject:"juvenile fiction"',
  },
  {
    bucket: "Picture Books",
    chipLabel: "Picture Books",
    query: 'subject:"picture books"',
  },
];

const SEARCH_FIELDS = [
  "key",
  "title",
  "author_name",
  "cover_i",
  "first_publish_year",
  "subject",
  "edition_count",
  "ratings_average",
  "ratings_count",
  "want_to_read_count",
  "already_read_count",
  "description",
  "language",
].join(",");

const BUCKET_LIMIT = 20;
const MIN_RATINGS_COUNT = 3;
const MAX_PER_BUCKET = 13;
const MAX_TOTAL = 100;

interface OpenLibraryDoc {
  key: string;
  title?: string;
  author_name?: string[];
  first_publish_year?: number;
  subject?: string[];
  cover_i?: number;
  edition_count?: number;
  ratings_average?: number;
  ratings_count?: number;
  want_to_read_count?: number;
  already_read_count?: number;
  description?: string | { value: string };
}

interface OpenLibrarySearchResponse {
  docs: OpenLibraryDoc[];
}

export function buildSearchUrl(genre: GenreConfig): string {
  const params = new URLSearchParams({
    q: genre.query,
    fields: SEARCH_FIELDS,
    sort: "rating",
    limit: String(BUCKET_LIMIT),
  });
  return `https://openlibrary.org/search.json?${params.toString()}`;
}

export async function fetchGenreBucket(genre: GenreConfig): Promise<OpenLibraryDoc[]> {
  const response = await fetch(buildSearchUrl(genre));
  if (!response.ok) {
    throw new Error(`OpenLibrary request for "${genre.bucket}" failed: ${response.status}`);
  }
  const data = (await response.json()) as OpenLibrarySearchResponse;
  return data.docs ?? [];
}

export interface FetchAllGenresResult {
  succeeded: { genre: GenreConfig; docs: OpenLibraryDoc[] }[];
  failed: { genre: GenreConfig; error: unknown }[];
}

export async function fetchAllGenres(): Promise<FetchAllGenresResult> {
  const results = await Promise.allSettled(
    GENRES.map(async (genre) => ({ genre, docs: await fetchGenreBucket(genre) })),
  );

  const succeeded: FetchAllGenresResult["succeeded"] = [];
  const failed: FetchAllGenresResult["failed"] = [];

  results.forEach((result, i) => {
    if (result.status === "fulfilled") {
      succeeded.push(result.value);
    } else {
      failed.push({ genre: GENRES[i], error: result.reason });
    }
  });

  return { succeeded, failed };
}

function extractDescription(description: OpenLibraryDoc["description"]): string {
  if (!description) return "";
  if (typeof description === "string") return description;
  return description.value ?? "";
}

function mapDocToBook(doc: OpenLibraryDoc, bucket: GenreBucket): Book {
  return {
    workKey: doc.key,
    title: doc.title ?? "",
    authorNames: (doc.author_name ?? []).join(", "),
    firstPublishYear: doc.first_publish_year ?? null,
    genreBucket: bucket,
    subjectsRaw: (doc.subject ?? []).join("; "),
    description: extractDescription(doc.description),
    coverId: doc.cover_i ?? null,
    editionCount: doc.edition_count ?? null,
    ratingsAverage: doc.ratings_average ?? null,
    ratingsCount: doc.ratings_count ?? null,
    wantToReadCount: doc.want_to_read_count ?? null,
    alreadyReadCount: doc.already_read_count ?? null,
    openLibraryUrl: `https://openlibrary.org${doc.key}`,
  };
}

// Applies the ratings-quality guard and cross-bucket dedupe, in bucket
// order, then caps the combined result at 100 rows so "top 100" holds
// exactly regardless of how many books each bucket actually yields.
export function buildDataset(
  genreResults: { genre: GenreConfig; docs: OpenLibraryDoc[] }[],
): Book[] {
  const claimed = new Set<string>();
  const books: Book[] = [];

  // Preserve GENRES order regardless of the order results were fetched in.
  const byBucket = new Map(genreResults.map((r) => [r.genre.bucket, r.docs]));

  for (const genre of GENRES) {
    const docs = byBucket.get(genre.bucket);
    if (!docs) continue;

    let takenForBucket = 0;
    for (const doc of docs) {
      if (takenForBucket >= MAX_PER_BUCKET) break;
      if ((doc.ratings_count ?? 0) < MIN_RATINGS_COUNT) continue;
      if (claimed.has(doc.key)) continue;

      claimed.add(doc.key);
      books.push(mapDocToBook(doc, genre.bucket));
      takenForBucket += 1;
    }
  }

  return books.slice(0, MAX_TOTAL);
}

const CSV_COLUMNS: (keyof Book)[] = [
  "workKey",
  "title",
  "authorNames",
  "firstPublishYear",
  "genreBucket",
  "subjectsRaw",
  "description",
  "coverId",
  "editionCount",
  "ratingsAverage",
  "ratingsCount",
  "wantToReadCount",
  "alreadyReadCount",
  "openLibraryUrl",
];

export function toCSV(books: Book[]): string {
  return Papa.unparse(books, { columns: CSV_COLUMNS });
}

function toNullableNumber(value: string | undefined): number | null {
  if (value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isNaN(n) ? null : n;
}

export function fromCSV(csvText: string): Book[] {
  const parsed = Papa.parse<Record<string, string>>(csvText, {
    header: true,
    skipEmptyLines: true,
  });

  return parsed.data.map((row) => ({
    workKey: row.workKey ?? "",
    title: row.title ?? "",
    authorNames: row.authorNames ?? "",
    firstPublishYear: toNullableNumber(row.firstPublishYear),
    genreBucket: (row.genreBucket ?? "") as GenreBucket,
    subjectsRaw: row.subjectsRaw ?? "",
    description: row.description ?? "",
    coverId: toNullableNumber(row.coverId),
    editionCount: toNullableNumber(row.editionCount),
    ratingsAverage: toNullableNumber(row.ratingsAverage),
    ratingsCount: toNullableNumber(row.ratingsCount),
    wantToReadCount: toNullableNumber(row.wantToReadCount),
    alreadyReadCount: toNullableNumber(row.alreadyReadCount),
    openLibraryUrl: row.openLibraryUrl ?? "",
  }));
}
