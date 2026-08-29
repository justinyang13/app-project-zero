import { describe, expect, it } from "vitest";
import { getAuthorLastName, sortBooks } from "./sortBooks";
import type { Book } from "./types";

function book(overrides: Partial<Book> = {}): Book {
  return {
    workKey: "/works/OL1W",
    title: "A Book",
    authorNames: "Some Author",
    firstPublishYear: 2000,
    genreBucket: "Fantasy",
    subjectsRaw: "",
    description: "",
    coverId: null,
    editionCount: null,
    ratingsAverage: null,
    ratingsCount: null,
    wantToReadCount: null,
    alreadyReadCount: null,
    openLibraryUrl: "https://openlibrary.org/works/OL1W",
    ...overrides,
  };
}

describe("getAuthorLastName", () => {
  it("takes the last word of the first credited author", () => {
    expect(getAuthorLastName("Rick Riordan")).toBe("Riordan");
    expect(getAuthorLastName("Scott Cawthon, Kira Breed-Wrisley")).toBe("Cawthon");
  });

  it("returns an empty string for no author", () => {
    expect(getAuthorLastName("")).toBe("");
  });
});

describe("sortBooks", () => {
  it("sorts by title alphabetically", () => {
    const books = [book({ workKey: "1", title: "Zebra" }), book({ workKey: "2", title: "Apple" })];
    expect(sortBooks(books, "title").map((b) => b.workKey)).toEqual(["2", "1"]);
  });

  it("sorts by popularity (wantToReadCount desc), tiebreaking on ratingsCount", () => {
    const books = [
      book({ workKey: "low", wantToReadCount: 10 }),
      book({ workKey: "high", wantToReadCount: 500 }),
      book({ workKey: "tie-a", wantToReadCount: 100, ratingsCount: 5 }),
      book({ workKey: "tie-b", wantToReadCount: 100, ratingsCount: 50 }),
    ];
    const sorted = sortBooks(books, "popularity").map((b) => b.workKey);
    expect(sorted).toEqual(["high", "tie-b", "tie-a", "low"]);
  });

  it("sorts by author last name, sending authorless books to the end", () => {
    const books = [
      book({ workKey: "riordan", authorNames: "Rick Riordan" }),
      book({ workKey: "none", authorNames: "" }),
      book({ workKey: "lewis", authorNames: "C.S. Lewis" }),
    ];
    expect(sortBooks(books, "author").map((b) => b.workKey)).toEqual(["lewis", "riordan", "none"]);
  });

  it("sorts by genre using the canonical GENRES order, not alphabetically", () => {
    const books = [
      book({ workKey: "mystery", genreBucket: "Mystery" }),
      book({ workKey: "fantasy", genreBucket: "Fantasy" }),
      book({ workKey: "adventure", genreBucket: "Adventure" }),
    ];
    // Canonical order is Fantasy, Adventure, Mystery, ... — alphabetical
    // would put Adventure first, which this asserts against.
    expect(sortBooks(books, "genre").map((b) => b.workKey)).toEqual(["fantasy", "adventure", "mystery"]);
  });

  it("does not mutate the input array", () => {
    const books = [book({ workKey: "1", title: "Zebra" }), book({ workKey: "2", title: "Apple" })];
    sortBooks(books, "title");
    expect(books.map((b) => b.workKey)).toEqual(["1", "2"]);
  });
});
