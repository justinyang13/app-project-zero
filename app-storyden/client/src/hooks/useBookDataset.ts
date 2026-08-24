import { useCallback, useEffect, useState } from "react";
import { fromCSV } from "../lib/fetchTopBooks";
import { readBookCache, writeBookCache } from "../lib/bookCache";
import type { Book, DatasetStatus } from "../lib/types";

export interface UseBookDatasetResult {
  books: Book[];
  status: DatasetStatus;
  applyUpdatedBooks: (books: Book[]) => void;
}

// Resolution order (no repeat OpenLibrary calls on normal page loads):
// 1. localStorage cache written by a prior "Update Book List" run.
// 2. The bundled starter CSV, generated once via `npm run generate-csv`.
// OpenLibrary itself is only ever called from the explicit UC-5 button.
export function useBookDataset(): UseBookDatasetResult {
  // The cache check is synchronous (localStorage), so it's resolved as a
  // lazy initial state rather than an effect — nothing to "synchronize
  // with an external system" here, just deriving the starting value once.
  const [cachedOnInit] = useState(() => readBookCache());
  const [books, setBooks] = useState<Book[]>(() => cachedOnInit ?? []);
  const [status, setStatus] = useState<DatasetStatus>(() =>
    cachedOnInit && cachedOnInit.length > 0 ? "ready" : "loading",
  );

  useEffect(() => {
    if (cachedOnInit && cachedOnInit.length > 0) return;

    let cancelled = false;

    async function loadBundledCsv() {
      try {
        const response = await fetch(`${import.meta.env.BASE_URL}data/top-books.csv`);
        if (!response.ok) throw new Error(`Failed to load starter CSV: ${response.status}`);
        const text = await response.text();
        const parsedBooks = fromCSV(text);
        if (!cancelled) {
          setBooks(parsedBooks);
          setStatus("ready");
        }
      } catch {
        if (!cancelled) setStatus("error");
      }
    }

    void loadBundledCsv();
    return () => {
      cancelled = true;
    };
  }, [cachedOnInit]);

  const applyUpdatedBooks = useCallback((updated: Book[]) => {
    setBooks(updated);
    setStatus("ready");
    writeBookCache(updated);
  }, []);

  return { books, status, applyUpdatedBooks };
}
