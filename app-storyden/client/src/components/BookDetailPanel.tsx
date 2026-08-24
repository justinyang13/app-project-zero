import { CoverArt } from "./CoverArt";
import { GENRES } from "../lib/fetchTopBooks";
import type { Book } from "../lib/types";
import "./BookDetailPanel.css";

interface SelectedBook {
  book: Book;
  index: number;
}

interface BookDetailPanelProps {
  selected: SelectedBook | null;
  onClose: () => void;
}

function formatRating(book: Book): string | null {
  if (book.ratingsAverage == null) return null;
  const rounded = Math.round(book.ratingsAverage);
  const stars = "★".repeat(rounded) + "☆".repeat(5 - rounded);
  const countLabel = book.ratingsCount != null ? ` · ${book.ratingsCount} ratings` : "";
  return `${stars} ${book.ratingsAverage.toFixed(1)}${countLabel}`;
}

export function BookDetailPanel({ selected, onClose }: BookDetailPanelProps) {
  return (
    <>
      {selected && <div className="detail-panel__scrim" onClick={onClose} />}
      <aside className={`detail-panel ${!selected ? "detail-panel--empty" : ""}`}>
        <button className="detail-panel__close" onClick={onClose} aria-label="Close book detail">
          &times;
        </button>

        {!selected ? (
          <div className="detail-panel__placeholder">Select a book to see its details.</div>
        ) : (
          <DetailPanelContent selected={selected} />
        )}
      </aside>
    </>
  );
}

function DetailPanelContent({ selected }: { selected: SelectedBook }) {
  const { book, index } = selected;
  const rating = formatRating(book);
  const genreLabel = GENRES.find((g) => g.bucket === book.genreBucket)?.chipLabel ?? book.genreBucket;

  return (
    <>
      <div className="detail-panel__eyebrow">BOOK DETAIL</div>
      <div className="detail-panel__top">
        <CoverArt index={index} coverId={book.coverId} title={book.title} size="detail" />
        <div className="detail-panel__meta">
          <div className="detail-panel__title">{book.title}</div>
          {book.authorNames && <div className="detail-panel__author">{book.authorNames}</div>}
          {rating && <div className="detail-panel__rating">{rating}</div>}
          {book.editionCount != null && (
            <div className="detail-panel__editions">
              {book.editionCount} edition{book.editionCount === 1 ? "" : "s"}
            </div>
          )}
          <div className="detail-panel__genre">{genreLabel}</div>
        </div>
      </div>

      {book.description && <p className="detail-panel__description">{book.description}</p>}

      <div className="detail-panel__footer">
        {book.firstPublishYear != null ? (
          <span>First published {book.firstPublishYear}</span>
        ) : (
          <span />
        )}
        <a href={book.openLibraryUrl} target="_blank" rel="noreferrer">
          View on OpenLibrary &rarr;
        </a>
      </div>
    </>
  );
}
