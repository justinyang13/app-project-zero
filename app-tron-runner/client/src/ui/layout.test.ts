import { describe, it, expect } from 'vitest';
import { canvasStyle } from './layout';

describe('canvasStyle', () => {
  it('pins the canvas to the viewport (guards the off-screen canvas bug)', () => {
    const s = canvasStyle();
    expect(s.position).toBe('fixed');
    expect(s.inset).toBe('0');
    expect(s.width).toBe('100vw');
    expect(s.height).toBe('100vh');
    expect(s.display).toBe('block');
  });

  it('keeps the canvas below the HUD overlays', () => {
    expect(Number(canvasStyle().zIndex)).toBeLessThan(10);
  });
});
