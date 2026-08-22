import { useState, type FormEvent } from "react";
import type { Coordinates } from "../hooks/useGeolocation";
import "./SearchBar.css";

interface SearchBarProps {
  onLocationFound: (coords: Coordinates) => void;
}

interface NominatimResult {
  lat: string;
  lon: string;
}

/** UC-2: address/zip search via Nominatim. */
export function SearchBar({ onLocationFound }: SearchBarProps) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"idle" | "searching" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) {
      return;
    }

    setStatus("searching");
    setErrorMessage("");

    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(trimmed)}`,
      );

      if (!response.ok) {
        throw new Error("Nominatim request failed");
      }

      const results = (await response.json()) as NominatimResult[];
      const [first] = results;

      if (!first) {
        setStatus("error");
        setErrorMessage("No matches found — try a different address or zip.");
        return;
      }

      onLocationFound({ lat: parseFloat(first.lat), lng: parseFloat(first.lon) });
      setStatus("idle");
    } catch {
      setStatus("error");
      setErrorMessage("Search is unavailable right now — try using your current location instead.");
    }
  }

  return (
    <form className="search-bar" onSubmit={handleSubmit}>
      <input
        type="text"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search an address or zip…"
        aria-label="Search an address or zip"
      />
      <button type="submit" disabled={status === "searching"} aria-label={status === "searching" ? "Searching…" : "Search"}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
          <path d="M5 12 L19 12 M13 6 L19 12 L13 18" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {status === "error" && (
        <p role="alert" className="search-bar__error">
          {errorMessage}
        </p>
      )}
    </form>
  );
}
