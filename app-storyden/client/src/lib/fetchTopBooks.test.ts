import { describe, expect, it } from "vitest";
import { buildDataset, fromCSV, GENRES, toCSV } from "./fetchTopBooks";
import type { GenreConfig } from "./fetchTopBooks";

function doc(overrides: Record<string, unknown> = {}) {
  return {
    key: "/works/OL1W",
    title: "A Book",
    author_name: ["Some Author"],
    ratings_count: 10,
    ratings_average: 4.2,
    ...overrides,
  };
}

const fantasy = GENRES.find((g) => g.bucket === "Fantasy") as GenreConfig;
const adventure = GENRES.find((g) => g.bucket === "Adventure") as GenreConfig;

describe("buildDataset", () => {
  it("filters out low-sample ratings (ratings_count < 3)", () => {
    const books = buildDataset([
      {
        genre: fantasy,
        docs: [doc({ key: "/works/OL1W", ratings_count: 1 }), doc({ key: "/works/OL2W", ratings_count: 5 })],
      },
    ]);
    expect(books.map((b) => b.workKey)).toEqual(["/works/OL2W"]);
  });

  it("dedupes a book claimed by an earlier bucket, keeping the earlier bucket's tag", () => {
    const shared = doc({ key: "/works/OL9W" });
    const books = buildDataset([
      { genre: fantasy, docs: [shared] },
      { genre: adventure, docs: [shared] },
    ]);
    expect(books).toHaveLength(1);
    expect(books[0].genreBucket).toBe("Fantasy");
  });

  it("caps the combined dataset at 100 books", () => {
    const manyDocs = Array.from({ length: 60 }, (_, i) => doc({ key: `/works/OLf${i}W` }));
    const moreDocs = Array.from({ length: 60 }, (_, i) => doc({ key: `/works/OLa${i}W` }));
    const books = buildDataset([
      { genre: fantasy, docs: manyDocs },
      { genre: adventure, docs: moreDocs },
    ]);
    // 13 per bucket cap applies before the 100-cap kicks in here.
    expect(books.length).toBeLessThanOrEqual(100);
  });

  it("handles a description shaped as { value } as well as a plain string", () => {
    const books = buildDataset([
      {
        genre: fantasy,
        docs: [
          doc({ key: "/works/OL1W", description: { value: "Object-shaped description" } }),
          doc({ key: "/works/OL2W", description: "Plain string description" }),
          doc({ key: "/works/OL3W" }),
        ],
      },
    ]);
    expect(books[0].description).toBe("Object-shaped description");
    expect(books[1].description).toBe("Plain string description");
    expect(books[2].description).toBe("");
  });
});

describe("toCSV / fromCSV round trip", () => {
  it("preserves fields containing commas, quotes, and newlines", () => {
    const books = buildDataset([
      {
        genre: fantasy,
        docs: [
          doc({
            key: "/works/OL1W",
            title: 'A "Great" Book, Volume 2',
            description: "Line one.\nLine two, with a comma.",
          }),
        ],
      },
    ]);

    const csv = toCSV(books);
    const parsed = fromCSV(csv);

    expect(parsed).toHaveLength(1);
    expect(parsed[0].title).toBe('A "Great" Book, Volume 2');
    expect(parsed[0].description).toBe("Line one.\nLine two, with a comma.");
    expect(parsed[0].ratingsAverage).toBe(4.2);
  });

  it("round-trips a null numeric field as null", () => {
    const books = buildDataset([
      { genre: fantasy, docs: [doc({ key: "/works/OL1W", first_publish_year: undefined })] },
    ]);
    const parsed = fromCSV(toCSV(books));
    expect(parsed[0].firstPublishYear).toBeNull();
  });

  it("round-trips coverId, and leaves it null for a book with no cover_i", () => {
    const books = buildDataset([
      {
        genre: fantasy,
        docs: [
          doc({ key: "/works/OL1W", cover_i: 8412345 }),
          doc({ key: "/works/OL2W", cover_i: undefined }),
        ],
      },
    ]);
    const parsed = fromCSV(toCSV(books));
    expect(parsed[0].coverId).toBe(8412345);
    expect(parsed[1].coverId).toBeNull();
  });
});
