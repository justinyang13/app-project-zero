import "./Pagination.css";

interface PaginationProps {
  page: number;
  pageCount: number;
  onChange: (page: number) => void;
}

export function Pagination({ page, pageCount, onChange }: PaginationProps) {
  if (pageCount <= 1) return null;

  return (
    <div className="pagination">
      <button
        className="pagination__nav"
        onClick={() => onChange(page - 1)}
        disabled={page <= 1}
      >
        &larr; Prev
      </button>
      <div className="pagination__pages">
        {Array.from({ length: pageCount }, (_, i) => i + 1).map((n) => (
          <button
            key={n}
            className={`pagination__page ${n === page ? "pagination__page--active" : ""}`}
            onClick={() => onChange(n)}
          >
            {n}
          </button>
        ))}
      </div>
      <button
        className="pagination__nav"
        onClick={() => onChange(page + 1)}
        disabled={page >= pageCount}
      >
        Next &rarr;
      </button>
    </div>
  );
}
