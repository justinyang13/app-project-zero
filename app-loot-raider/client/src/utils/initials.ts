// Catalog item names follow the "<character> x <monster>" pairing
// convention (see the app README's promotion-agnostic naming note), so a
// generic left/right initial pair works for any future promotion without
// hardcoding character names here.
export function getInitials(name: string): string {
  const parts = name.split(/\s+x\s+/i);
  if (parts.length >= 2 && parts[0].trim() && parts[1].trim()) {
    return (parts[0].trim()[0] + parts[1].trim()[0]).toUpperCase();
  }

  const words = name.trim().split(/\s+/).filter(Boolean);
  return words
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase();
}
