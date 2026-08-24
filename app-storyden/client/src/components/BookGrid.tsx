import { CoverArt } from "./CoverArt";
import type { Book } from "../lib/types";
import "./BookGrid.css";

interface BookGridProps {
  books: Book[];
  onSelect: (book: Book, index: number) => void;
}

export function BookGrid({ books, onSelect }: BookGridProps) {
  return (
    <div className="book-grid">
      {books.map((book, i) => (
        <button key={book.workKey} className="book-tile" onClick={() => onSelect(book, i)}>
          <CoverArt index={i} coverId={book.coverId} title={book.title}>
            <div className="book-tile__label">
              <div className="book-tile__title">{book.title}</div>
              {book.authorNames && <div className="book-tile__author">{book.authorNames}</div>}
            </div>
          </CoverArt>
        </button>
      ))}
    </div>
  );
}
