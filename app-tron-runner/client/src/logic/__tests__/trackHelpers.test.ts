import { describe, it, expect } from 'vitest';
import { 
  getChunkIndex, 
  getChunkDistance, 
  interpolateColor, 
  isGapAt, 
  wallStripAt,
  getSectionFromDistance
} from '../trackHelpers';

describe('trackHelpers', () => {
  describe('getChunkIndex', () => {
    it('should calculate chunk index correctly', () => {
      expect(getChunkIndex(0)).toBe(0);
      expect(getChunkIndex(40)).toBe(1);
      expect(getChunkIndex(80)).toBe(2);
      expect(getChunkIndex(20)).toBe(0); // Less than chunk size
    });
  });

  describe('getChunkDistance', () => {
    it('should calculate distance from chunk index', () => {
      expect(getChunkDistance(0)).toBe(0);
      expect(getChunkDistance(1)).toBe(40);
      expect(getChunkDistance(2)).toBe(80);
    });
  });

  describe('interpolateColor', () => {
    it('should interpolate between two colors', () => {
      const color1 = 0xff0000; // Red
      const color2 = 0x0000ff; // Blue
      expect(interpolateColor(color1, color2, 0)).toBe(0xff0000);
      expect(interpolateColor(color1, color2, 1)).toBe(0x0000ff);
      // For red (255) to blue (0), halfway should be 128 for each component
      // Red: 255 -> 128, Green: 0 -> 0, Blue: 0 -> 128 = 0x800080
      expect(interpolateColor(color1, color2, 0.5)).toBe(0x800080); // Halfway
    });
  });

  describe('isGapAt', () => {
    const gaps = [
      { z0: 100, z1: 150 },
      { z0: 200, z1: 250 }
    ];

    it('should detect gaps correctly', () => {
      expect(isGapAt(gaps, 125)).toBe(true); // Within first gap
      expect(isGapAt(gaps, 225)).toBe(true); // Within second gap
      expect(isGapAt(gaps, 175)).toBe(false); // Between gaps
      expect(isGapAt(gaps, 50)).toBe(false); // Before first gap
    });
  });

  describe('wallStripAt', () => {
    const wallStrips = [
      { side: -1 as const, z0: 100, z1: 150 },
      { side: 1 as const, z0: 200, z1: 250 }
    ];

    it('should find wall strips correctly', () => {
      expect(wallStripAt(wallStrips, 125, -1)).toEqual({ side: -1, z0: 100, z1: 150 });
      expect(wallStripAt(wallStrips, 225, 1)).toEqual({ side: 1, z0: 200, z1: 250 });
      expect(wallStripAt(wallStrips, 125, 1)).toBeNull(); // Wrong side
      expect(wallStripAt(wallStrips, 50, -1)).toBeNull(); // Outside range
    });
  });

  describe('getSectionFromDistance', () => {
    it('should calculate section correctly', () => {
      expect(getSectionFromDistance(0)).toBe(0);
      expect(getSectionFromDistance(399)).toBe(0);
      expect(getSectionFromDistance(400)).toBe(1);
      expect(getSectionFromDistance(2399)).toBe(5);
      expect(getSectionFromDistance(2400)).toBe(6);
      expect(getSectionFromDistance(3000)).toBe(6); // Max section
    });
  });
});