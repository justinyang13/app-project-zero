import { useMemo, useState } from "react";
import { Backdrop } from "./components/Backdrop";
import { IconDefs } from "./components/IconDefs";
import { Header } from "./components/Header";
import { GenreChips, ALL_GENRES } from "./components/GenreChips";
import type { GenreFilter } from "./components/GenreChips";
import { SortControl } from "./components/SortControl";
import { BookGrid } from "./components/BookGrid";
import { Pagination } from "./components/Pagination";
import { BookDetailPanel } from "./components/BookDetailPanel";
import type { UpdateBookListState } from "./components/UpdateBookListButton";
import { EmptyState } from "./components/EmptyState";
import { Footer } from "./components/Footer";
import { useBookDataset } from "./hooks/useBookDataset";
import { buildDataset, fetchAllGenres, toCSV } from "./lib/fetchTopBooks";
import { sortBooks } from "./lib/sortBooks";
import type { SortOption } from "./lib/sortBooks";
import type { Book } from "./lib/types";
import "./App.css";

const PAGE_SIZE = 100;

function App() {
  const { books, status, applyUpdatedBooks } = useBookDataset();
  const [activeGenre, setActiveGenre] = useState<GenreFilter>(ALL_GENRES);
  const [sortOption, setSortOption] = useState<SortOption>("popularity");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<{ book: Book; index: number } | null>(null);
  const [updateState, setUpdateState] = useState<UpdateBookListState>({ phase: "idle" });

  const filteredBooks = useMemo(() => {
    const scoped = activeGenre === ALL_GENRES ? books : books.filter((b) => b.genreBucket === activeGenre);
    return sortBooks(scoped, sortOption);
  }, [books, activeGenre, sortOption]);

  const pageCount = Math.max(1, Math.ceil(filteredBooks.length / PAGE_SIZE));
  const pageBooks = filteredBooks.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function handleSelectGenre(genre: GenreFilter) {
    setActiveGenre(genre);
    setPage(1);
    setSelected(null);
  }

  function handleSelectSort(sort: SortOption) {
    setSortOption(sort);
    setPage(1);
  }

  function handleSelectBook(book: Book, index: number) {
    setSelected({ book, index });
  }

  async function handleUpdate() {
    setUpdateState({ phase: "loading" });
    try {
      const { succeeded, failed } = await fetchAllGenres();
      if (succeeded.length === 0) {
        setUpdateState({
          phase: "error",
          message: "OpenLibrary is unreachable right now — the existing book list is unchanged. Try again later.",
        });
        return;
      }

      const updatedBooks = buildDataset(succeeded);
      applyUpdatedBooks(updatedBooks);
      setActiveGenre(ALL_GENRES);
      setPage(1);
      setSelected(null);

      const csvBlob = new Blob([toCSV(updatedBooks)], { type: "text/csv" });
      const downloadUrl = URL.createObjectURL(csvBlob);

      if (failed.length > 0) {
        setUpdateState({
          phase: "partial",
          downloadUrl,
          failedGenres: failed.map((f) => f.genre.bucket),
        });
      } else {
        setUpdateState({ phase: "success", downloadUrl });
      }
    } catch {
      setUpdateState({
        phase: "error",
        message: "OpenLibrary is unreachable right now — the existing book list is unchanged. Try again later.",
      });
    }
  }

  return (
    <div className="app">
      <Backdrop />
      <IconDefs />
      <Header updateState={updateState} onUpdate={handleUpdate} />
      <div className="app__controls">
        <GenreChips active={activeGenre} onSelect={handleSelectGenre} />
        <SortControl value={sortOption} onChange={handleSelectSort} />
      </div>

      <main className="app__main">
        <div className="app__grid-column">
          {status === "error" && (
            <EmptyState
              title="Couldn't load the book list"
              message="The starter book data failed to load. Try refreshing the page."
            />
          )}
          {status === "ready" && pageBooks.length === 0 && (
            <EmptyState
              title="No books here yet"
              message={
                activeGenre === ALL_GENRES
                  ? "Try updating the book list."
                  : `No books found for ${activeGenre} yet — try another genre or update the book list.`
              }
            />
          )}
          {status === "ready" && pageBooks.length > 0 && (
            <>
              <BookGrid books={pageBooks} onSelect={handleSelectBook} />
              <Pagination page={page} pageCount={pageCount} onChange={setPage} />
            </>
          )}
        </div>

        <BookDetailPanel selected={selected} onClose={() => setSelected(null)} />
      </main>

      <Footer />
    </div>
  );
}

export default App;
