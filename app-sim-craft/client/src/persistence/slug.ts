// Local-world naming rules, shared conceptually with sync-server's
// validation (server/src/slug.ts mirrors SLUG_PATTERN — kept in sync by
// hand since client and server are separate npm packages).

const SLUG_ADJECTIVES = [
  "brave", "quiet", "lucky", "swift", "rusty", "amber", "cosmic", "dusty",
  "gentle", "hidden", "lively", "misty", "noble", "proud", "silent",
  "stormy", "sunny", "vivid", "wild", "zesty",
];

const SLUG_NOUNS = [
  "tiger", "forest", "canyon", "harbor", "meadow", "glacier", "ember",
  "falcon", "lagoon", "summit", "orchard", "comet", "valley", "otter",
  "prairie", "reef", "willow", "boulder", "cavern", "dune",
];

export const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/** Lowercases and strips anything but [a-z0-9-], collapsing separators — does not guarantee the result is non-empty. */
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function isValidSlug(slug: string): boolean {
  return SLUG_PATTERN.test(slug);
}

export function randomSlug(): string {
  const adjective = SLUG_ADJECTIVES[Math.floor(Math.random() * SLUG_ADJECTIVES.length)];
  const noun = SLUG_NOUNS[Math.floor(Math.random() * SLUG_NOUNS.length)];
  const number = Math.floor(Math.random() * 100);
  return `${adjective}-${noun}-${number}`;
}
