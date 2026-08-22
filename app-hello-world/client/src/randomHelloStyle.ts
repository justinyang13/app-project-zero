// A curated set of "cool" Google Fonts to pick from — deliberately not an
// arbitrary font name, since a random unloaded family would silently fall
// back to the browser default instead of rendering anything interesting.
export const FONTS = [
  '"Bungee", cursive',
  '"Monoton", cursive',
  '"Permanent Marker", cursive',
  '"Righteous", cursive',
  '"Audiowide", sans-serif',
  '"Bangers", cursive',
  '"Pacifico", cursive',
  '"Bubblegum Sans", cursive',
  '"Orbitron", sans-serif',
  '"Creepster", cursive',
] as const;

export interface HelloStyle {
  fontFamily: string;
  gradientAngle: number;
  colors: [string, string, string];
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function vividHsl(hue: number): string {
  const h = ((hue % 360) + 360) % 360;
  return `hsl(${h}, ${randomInt(75, 92)}%, ${randomInt(58, 72)}%)`;
}

// Picks a fresh font + a triadic-ish random color trio on every call, so
// calling this once per page load gives a different look each time.
export function pickRandomHelloStyle(): HelloStyle {
  const fontFamily = FONTS[randomInt(0, FONTS.length - 1)];

  const baseHue = randomInt(0, 359);
  const spacing = randomInt(70, 150);

  return {
    fontFamily,
    gradientAngle: randomInt(0, 359),
    colors: [vividHsl(baseHue), vividHsl(baseHue + spacing), vividHsl(baseHue + spacing * 2)],
  };
}
