/**
 * Calculate chunk index from distance
 * @param dist Distance in meters
 * @param chunkSize Size of each chunk in meters
 * @returns Chunk index
 */
export function getChunkIndex(dist: number, chunkSize: number = 40): number {
  return Math.floor(dist / chunkSize);
}

/**
 * Calculate distance from chunk index
 * @param chunkIndex Index of the chunk
 * @param chunkSize Size of each chunk in meters
 * @returns Distance in meters
 */
export function getChunkDistance(chunkIndex: number, chunkSize: number = 40): number {
  return chunkIndex * chunkSize;
}

/**
 * Interpolate between two colors using RGB
 * @param color1 First color as hex
 * @param color2 Second color as hex
 * @param factor Interpolation factor (0-1)
 * @returns Interpolated color as hex
 */
export function interpolateColor(color1: number, color2: number, factor: number): number {
  if (factor <= 0) return color1;
  if (factor >= 1) return color2;

  const r1 = (color1 >> 16) & 0xff;
  const g1 = (color1 >> 8) & 0xff;
  const b1 = color1 & 0xff;

  const r2 = (color2 >> 16) & 0xff;
  const g2 = (color2 >> 8) & 0xff;
  const b2 = color2 & 0xff;

  const r = Math.round(r1 + (r2 - r1) * factor);
  const g = Math.round(g1 + (g2 - g1) * factor);
  const b = Math.round(b1 + (b2 - b1) * factor);

  return (r << 16) | (g << 8) | b;
}

/**
 * Check if there's a gap at a specific distance
 * @param gaps Array of gap definitions
 * @param dist Distance to check
 * @returns True if gap exists at that distance
 */
export function isGapAt(gaps: { z0: number; z1: number }[], dist: number): boolean {
  for (const gap of gaps) {
    if (dist >= gap.z0 && dist <= gap.z1) {
      return true;
    }
  }
  return false;
}

/**
 * Find wall strip at a specific distance and side
 * @param wallStrips Array of wall strip definitions
 * @param dist Distance to check
 * @param side Wall side (-1 or 1)
 * @returns Wall strip if found, null otherwise
 */
export function wallStripAt(
  wallStrips: { side: -1 | 1; z0: number; z1: number }[],
  dist: number,
  side: -1 | 1
): { side: -1 | 1; z0: number; z1: number } | null {
  for (const strip of wallStrips) {
    if (strip.side === side && dist >= strip.z0 && dist <= strip.z1) {
      return strip;
    }
  }
  return null;
}

/**
 * Get section index from distance
 * @param dist Distance in meters
 * @returns Section index (0-6)
 */
export function getSectionFromDistance(dist: number): number {
  const sectionLength = 400;
  const section = Math.min(Math.floor(dist / sectionLength), 6);
  return section;
}