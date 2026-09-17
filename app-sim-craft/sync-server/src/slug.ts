// Map-name validation — kept in sync by hand with the client's
// client/src/persistence/slug.ts (separate npm packages, no shared
// workspace here). The server never trusts client-side validation, so
// this is enforced again on every request that takes a :name param.
export const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export function isValidSlug(name: string): boolean {
  return typeof name === "string" && name.length > 0 && name.length <= 128 && SLUG_PATTERN.test(name);
}
