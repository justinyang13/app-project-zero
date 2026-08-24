/**
 * Client-side photo lookup keyed by collectible item id, checked before the
 * server-provided imageUrl and then the initials swatch (see
 * CollectibleIcon). Bundled as Vite ES-module imports — not `public/` — so
 * the GitHub Pages subpath `base` is respected (see CLAUDE.md). Empty until
 * real photos are sourced and added.
 */
export const TOY_PHOTOS: Partial<Record<string, string>> = {};
