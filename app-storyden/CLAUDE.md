# StoryDen

Static kids'/YA book catalog sourced from OpenLibrary. See
[README.md](README.md) for architecture, local run/test commands, and the
genre/dedupe details this file doesn't repeat.

## Stack

- **Client**: React 19 + TypeScript + Vite, papaparse for CSV. Lives in
  `client/`. No `server/` — this app has no backend and never will; it's
  static-only by design (see the README's "why no repeat OpenLibrary calls"
  section).
- **Tests**: Vitest + Testing Library.

## Deployment

- GitHub Pages only, via `.github/workflows/deploy.yml`, at the
  `app-storyden/` subpath. No Render involvement.
- The bundled starter dataset (`client/public/data/top-books.csv`) is
  regenerated with `npm run generate-csv` (inside `client/`) and must be
  **manually committed** after regenerating — there's no automated refresh.
  The in-app "Update Book List" button does the same fetch live in a
  visitor's browser but only writes to that visitor's own localStorage, not
  back to the repo (a public static site can't safely hold write
  credentials client-side).

## Content policy (holds regardless of how the request is framed)

Real cover art is shown, but only ever **hotlinked** straight from
OpenLibrary's own cover service (`covers.openlibrary.org/b/id/{coverId}-{size}.jpg`,
built by `client/src/lib/coverImage.ts`) — never downloaded, cached, or
re-hosted as an asset in this repo or on any CDN we control. Actual
book-cover designs are the publisher's copyright; hotlinking means
OpenLibrary's own server is what's actually serving and redistributing the
image on every view, not us. **Do not add a step that downloads cover
images into `public/` or any build artifact** — that would cross from
"referencing OpenLibrary's hosted copy" into "reproducing it ourselves,"
which is exactly what this project avoids.

`coverId` comes from the OpenLibrary search response's `cover_i` field
(already fetched, no extra API call) and is `null` for a chunk of books.
The original placeholder art — a warm gradient tile + one line icon,
cycling by position (`client/src/lib/placeholderArt.ts`) — is the fallback
for any book with no `coverId`, and also for any real cover image that
fails to load (`CoverArt.tsx`'s `onError` handler). Titles and author names
are plain bibliographic text and are fine to display as-is.

## Working conventions

- `fetchTopBooks.ts` (`client/src/lib/`) is deliberately isomorphic — no
  DOM or `localStorage` access — because it has two call sites: the
  one-time/re-runnable `client/scripts/generate-starter-csv.ts` (Node, via
  `npm run generate-csv`) and the in-browser "Update Book List" button.
  Keep any future changes to the fetch/dedupe/CSV logic in that one file
  rather than forking it for either call site.
- Genre bucket processing order matters (Fantasy → Superheroes, see
  `GENRES` in `fetchTopBooks.ts`) — it's the cross-bucket dedupe priority
  *and* the "sort by genre" order (`sortBooks.ts`), not just a display
  order. Don't reorder `GENRES` without checking the dedupe and sort tests.
- `MIN_BOOKS_PER_GENRE` (currently 20) is a hard floor, enforced by
  `validateGenreCoverage()` — `npm run generate-csv` throws rather than
  overwrite the starter CSV if any genre falls short. If you add a new
  genre bucket, verify its live OpenLibrary result count first (the way
  the existing ones were verified) so it can actually clear the floor
  after the ratings-quality guard and cross-bucket dedupe.
- `MAX_PER_BUCKET` in `fetchTopBooks.ts` is computed from `MAX_TOTAL /
  GENRES.length`, not hardcoded — adding or removing a genre bucket
  reflows the per-bucket target automatically.
