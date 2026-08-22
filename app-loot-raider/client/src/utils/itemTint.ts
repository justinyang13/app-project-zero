// Deterministic per-item accent color, so every catalog item reads as a
// distinct swatch even without real character art (see the app README's
// note on why real art is out of scope).
const TINTS = ["#c2410c", "#0369a1", "#6d28d9", "#166534", "#a16207", "#9d174d", "#0f766e", "#b91c1c"];

export function itemTint(itemId: string): string {
  let hash = 0;
  for (let i = 0; i < itemId.length; i++) {
    hash = (hash * 31 + itemId.charCodeAt(i)) >>> 0;
  }
  return TINTS[hash % TINTS.length];
}
