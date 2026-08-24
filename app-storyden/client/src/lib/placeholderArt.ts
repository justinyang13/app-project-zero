export type CoverIcon = "c-star" | "c-leaf" | "c-wave" | "c-moon";

export interface PlaceholderArt {
  icon: CoverIcon;
  c1: string;
  c2: string;
}

// Exact warm gradient + icon pairs from the locked "Cozy Den" mockup —
// real cover art is never fetched (publisher copyright), so every book
// gets one of these cycling by position instead.
const PALETTE: PlaceholderArt[] = [
  { icon: "c-star", c1: "#c2703a", c2: "#8a4a2c" },
  { icon: "c-moon", c1: "#7a5a8c", c2: "#4f3a63" },
  { icon: "c-wave", c1: "#3f7d7a", c2: "#274e4c" },
  { icon: "c-leaf", c1: "#6a8c4e", c2: "#41552f" },
  { icon: "c-star", c1: "#b8863a", c2: "#7a5522" },
  { icon: "c-moon", c1: "#4a6b8c", c2: "#2c415a" },
  { icon: "c-wave", c1: "#a8562f", c2: "#6e371d" },
  { icon: "c-star", c1: "#c99a3a", c2: "#8a6820" },
  { icon: "c-leaf", c1: "#5a6b7d", c2: "#38414d" },
  { icon: "c-moon", c1: "#8c5a5a", c2: "#5a3838" },
];

export function getPlaceholderArt(index: number): PlaceholderArt {
  const i = ((index % PALETTE.length) + PALETTE.length) % PALETTE.length;
  return PALETTE[i];
}
