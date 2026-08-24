import { beforeEach, describe, expect, it } from "vitest";
import { clearBookCache, readBookCache, writeBookCache } from "./bookCache";
import type { Book } from "./types";

const sampleBook: Book = {
  workKey: "/works/OL1W",
  title: "A Book",
  authorNames: "Some Author",
  firstPublishYear: 1990,
  genreBucket: "Fantasy",
  subjectsRaw: "Magic",
  description: "A description.",
  coverId: 12345,
  editionCount: 3,
  ratingsAverage: 4.5,
  ratingsCount: 20,
  wantToReadCount: 5,
  alreadyReadCount: 2,
  openLibraryUrl: "https://openlibrary.org/works/OL1W",
};

beforeEach(() => {
  window.localStorage.clear();
});

describe("bookCache", () => {
  it("returns null when nothing has been cached", () => {
    expect(readBookCache()).toBeNull();
  });

  it("round-trips a written dataset", () => {
    writeBookCache([sampleBook]);
    expect(readBookCache()).toEqual([sampleBook]);
  });

  it("returns null for corrupted cache data instead of throwing", () => {
    window.localStorage.setItem("storyden.books.v1", "{not valid json");
    expect(readBookCache()).toBeNull();
  });

  it("clears the cache", () => {
    writeBookCache([sampleBook]);
    clearBookCache();
    expect(readBookCache()).toBeNull();
  });
});
