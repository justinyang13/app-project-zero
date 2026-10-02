import { describe, it, expect } from 'vitest';
import { SECTIONS, TARGET_SCORE } from '../../config.js';

describe('config', () => {
  it('should have contiguous sections covering the full level', () => {
    expect(SECTIONS.length).toBe(7);
    
    // Check that sections are contiguous and cover the full level
    expect(SECTIONS[0].z0).toBe(0);
    expect(SECTIONS[SECTIONS.length - 1].z1).toBe(7800);
    
    for (let i = 0; i < SECTIONS.length - 1; i++) {
      expect(SECTIONS[i].z1).toBe(SECTIONS[i + 1].z0);
    }
  });

  it('should have positive speeds for all sections', () => {
    for (const section of SECTIONS) {
      expect(section.speed).toBeGreaterThan(0);
    }
  });

  it('should have correct target score', () => {
    expect(TARGET_SCORE).toBe(1500000);
  });
});