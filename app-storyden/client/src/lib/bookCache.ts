import type { Book } from "./types";

const CACHE_KEY = "storyden.books.v1";

interface CachePayload {
  books: Book[];
  fetchedAt: string;
}

export function readBookCache(): Book[] | null {
  try {
    const raw = window.localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const payload = JSON.parse(raw) as CachePayload;
    if (!Array.isArray(payload.books)) return null;
    return payload.books;
  } catch {
    return null;
  }
}

export function writeBookCache(books: Book[]): void {
  const payload: CachePayload = { books, fetchedAt: new Date().toISOString() };
  window.localStorage.setItem(CACHE_KEY, JSON.stringify(payload));
}

export function clearBookCache(): void {
  window.localStorage.removeItem(CACHE_KEY);
}
