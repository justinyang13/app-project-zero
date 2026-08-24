import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { BookDetailPanel } from "./BookDetailPanel";
import type { Book } from "../lib/types";

const fullBook: Book = {
  workKey: "/works/OL1W",
  title: "Charlotte's Web",
  authorNames: "E.B. White",
  firstPublishYear: 1952,
  genreBucket: "Adventure",
  subjectsRaw: "Pigs; Friendship",
  description: "Some Pig.",
  coverId: null,
  editionCount: 42,
  ratingsAverage: 4.6,
  ratingsCount: 1892,
  wantToReadCount: 100,
  alreadyReadCount: 50,
  openLibraryUrl: "https://openlibrary.org/works/OL1W",
};

describe("BookDetailPanel", () => {
  it("shows a placeholder when nothing is selected", () => {
    render(<BookDetailPanel selected={null} onClose={vi.fn()} />);
    expect(screen.getByText(/select a book/i)).toBeInTheDocument();
  });

  it("renders full detail fields for a book with complete data", () => {
    render(<BookDetailPanel selected={{ book: fullBook, index: 0 }} onClose={vi.fn()} />);
    expect(screen.getByText("Charlotte's Web")).toBeInTheDocument();
    expect(screen.getByText("E.B. White")).toBeInTheDocument();
    expect(screen.getByText("Some Pig.")).toBeInTheDocument();
    expect(screen.getByText("First published 1952")).toBeInTheDocument();
    expect(screen.getByText("42 editions")).toBeInTheDocument();
  });

  it("hides description and rating gracefully when missing (UC-4 edge case)", () => {
    const sparse: Book = {
      ...fullBook,
      description: "",
      ratingsAverage: null,
      ratingsCount: null,
      editionCount: null,
      firstPublishYear: null,
    };
    render(<BookDetailPanel selected={{ book: sparse, index: 0 }} onClose={vi.fn()} />);
    expect(screen.queryByText("Some Pig.")).not.toBeInTheDocument();
    expect(screen.queryByText(/★/)).not.toBeInTheDocument();
    expect(screen.queryByText(/editions/)).not.toBeInTheDocument();
    expect(screen.queryByText(/First published/)).not.toBeInTheDocument();
    expect(screen.queryByText("undefined")).not.toBeInTheDocument();
  });
});
