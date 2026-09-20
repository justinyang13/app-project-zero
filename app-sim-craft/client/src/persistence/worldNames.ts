// Naming rules for local worlds: a raw user-typed name becomes a slug that must
// be valid and not already taken.
import { isValidSlug, slugify } from "./slug";
import { listWorlds } from "./WorldRepository";

export async function worldNameAvailable(name: string, excludingId: string | null = null): Promise<boolean> {
  const worlds = await listWorlds();
  return !worlds.some((w) => w.id === name && w.id !== excludingId);
}

export interface NameValidationError {
  message: string;
}

/** Validates a raw user-typed name against slug rules and local uniqueness, returning the normalized slug or an error — never both. */
export async function validateWorldName(
  raw: string,
  excludingId: string | null = null,
): Promise<{ slug: string; error: null } | { slug: null; error: NameValidationError }> {
  const slug = slugify(raw);
  if (!slug || !isValidSlug(slug)) {
    return { slug: null, error: { message: "Name must contain at least one letter or number." } };
  }
  const available = await worldNameAvailable(slug, excludingId);
  if (!available) {
    return { slug: null, error: { message: `A local world named "${slug}" already exists.` } };
  }
  return { slug, error: null };
}
