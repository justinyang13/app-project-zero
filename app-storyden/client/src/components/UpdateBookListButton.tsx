import "./UpdateBookListButton.css";

export type UpdateBookListState =
  | { phase: "idle" }
  | { phase: "loading" }
  | { phase: "success"; downloadUrl: string }
  | { phase: "partial"; downloadUrl: string; failedGenres: string[] }
  | { phase: "error"; message: string };

interface UpdateBookListButtonProps {
  state: UpdateBookListState;
  onUpdate: () => void;
}

export function UpdateBookListButton({ state, onUpdate }: UpdateBookListButtonProps) {
  const isLoading = state.phase === "loading";

  return (
    <div className="update-btn">
      <button className="update-btn__button" onClick={onUpdate} disabled={isLoading}>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--sd-accent-text)" strokeWidth="2.2">
          <path d="M4 4 v6 h6 M20 20 v-6 h-6" />
          <path d="M4.6 15 A9 9 0 0 0 20 9.5 M19.4 9 A9 9 0 0 0 4 14.5" />
        </svg>
        {isLoading ? "Updating…" : "Update Book List"}
      </button>

      {state.phase === "success" && (
        <div className="update-btn__banner update-btn__banner--success">
          <span>Book list updated.</span>
          <a href={state.downloadUrl} download="top-books.csv">
            Download updated CSV
          </a>
        </div>
      )}

      {state.phase === "partial" && (
        <div className="update-btn__banner update-btn__banner--warning">
          <span>
            Fetched {8 - state.failedGenres.length} of 8 genres &mdash; {state.failedGenres.join(", ")} unavailable,
            try updating again later.
          </span>
          <a href={state.downloadUrl} download="top-books.csv">
            Download updated CSV
          </a>
        </div>
      )}

      {state.phase === "error" && (
        <div className="update-btn__banner update-btn__banner--error">
          <span>{state.message}</span>
        </div>
      )}
    </div>
  );
}
